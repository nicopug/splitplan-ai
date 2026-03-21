import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addExpense, getExpenses, getBalances, getParticipants, deleteExpense, migrateExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import Skeleton from './ui/Skeleton';
import Drawer from './ui/Drawer';

const Finance = ({ trip, readOnly = false, sharedExpenses = [], sharedParticipants = [] }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { theme } = useTheme();
    const [tab, setTab] = useState('summary');
    const [expenses, setExpenses] = useState((readOnly && sharedExpenses) ? sharedExpenses : []);
    const [balances, setBalances] = useState([]);
    const [participants, setParticipants] = useState((readOnly && sharedParticipants) ? sharedParticipants : []);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(!readOnly);

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch (e) {
            return null;
        }
    }, []);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [payerId, setPayerId] = useState('');
    const [category, setCategory] = useState('Food');

    const currencies = [
        { code: 'EUR', symbol: '€', label: t('finance.currencies.EUR', 'Euro') },
        { code: 'USD', symbol: '$', label: t('finance.currencies.USD', 'Dollaro USA') },
        { code: 'JPY', symbol: '¥', label: t('finance.currencies.JPY', 'Yen Giapponese') },
        { code: 'GBP', symbol: '£', label: t('finance.currencies.GBP', 'Sterlina') },
        { code: 'CHF', symbol: 'CHF', label: t('finance.currencies.CHF', 'Franco Svizzero') },
        { code: 'AED', symbol: 'د.إ', label: t('finance.currencies.AED', 'Dirham') }
    ];

    const categories = [
        { id: 'Food', label: t('finance.categories.Food', 'Cibo & Drink'), icon: '🍕' },
        { id: 'Transport', label: t('finance.categories.Transport', 'Movimenti Locali'), icon: '🚌' },
        { id: 'Travel_Road', label: t('finance.categories.Travel_Road', 'Auto/Pedaggi'), icon: '🚗' },
        { id: 'Lodging', label: t('finance.categories.Lodging', 'Alloggio'), icon: '🏨' },
        { id: 'Activity', label: t('finance.categories.Activity', 'Attività'), icon: '🎡' },
        { id: 'Shopping', label: t('finance.categories.Shopping', 'Shopping'), icon: '🛍️' },
        { id: 'Other', label: t('finance.categories.Other', 'Altro'), icon: '📦' }
    ];

    const fetchData = async () => {
        if (readOnly) return;
        setLoading(true);
        try {

            const [exp, bal, parts] = await Promise.all([
                getExpenses(trip.id),
                getBalances(trip.id),
                getParticipants(trip.id)
            ]);
            setExpenses(exp);
            setBalances(bal);
            setParticipants(parts);

            if (parts && parts.length > 0 && !payerId) {
                setPayerId(parts[0].id);
            }
        } catch (e) {
            console.error(e);
            showToast(t('finance.toast.loadError', "Errore nel caricamento: ") + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (trip?.id && !readOnly) {
            fetchData();
        } else if (readOnly) {
            calculateBalancesLocally();
        }
    }, [trip?.id, readOnly]);

    const calculateBalancesLocally = () => {
        if (!expenses.length || !participants.length) return;

        const balancesMap = { ...participants.reduce((acc, p) => ({ ...acc, [p.id]: 0.0 }), {}) };

        expenses.forEach(exp => {
            if (balancesMap[exp.payer_id] !== undefined) {
                balancesMap[exp.payer_id] += exp.amount;
            }
            const splitAmount = exp.amount / participants.length;
            participants.forEach(p => {
                balancesMap[p.id] -= splitAmount;
            });
        });

        const debtors = [];
        const creditors = [];
        Object.entries(balancesMap).forEach(([uid, bal]) => {
            const rounded = Math.round(bal * 100) / 100;
            if (rounded < -0.01) debtors.push({ id: parseInt(uid), amount: -rounded });
            else if (rounded > 0.01) creditors.push({ id: parseInt(uid), amount: rounded });
        });

        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const settlements = [];
        let i = 0, j = 0;
        const d_copy = JSON.parse(JSON.stringify(debtors));
        const c_copy = JSON.parse(JSON.stringify(creditors));

        while (i < d_copy.length && j < c_copy.length) {
            const amount = Math.min(d_copy[i].amount, c_copy[j].amount);
            if (amount > 0) {
                settlements.push({
                    debtor_id: d_copy[i].id,
                    creditor_id: c_copy[j].id,
                    amount: Math.round(amount * 100) / 100
                });
            }
            d_copy[i].amount -= amount;
            c_copy[j].amount -= amount;
            if (d_copy[i].amount < 0.01) i++;
            if (c_copy[j].amount < 0.01) j++;
        }
        setBalances(settlements);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!payerId) {
            showToast(t('finance.toast.selectPayer', "Seleziona chi ha pagato!"), "info");
            return;
        }
        try {
            await addExpense({
                trip_id: trip.id,
                title,
                amount: parseFloat(amount),
                currency: currency,
                payer_id: parseInt(payerId),
                category
            });
            setShowForm(false);
            setTitle('');
            setAmount('');
            setCurrency('EUR');
            showToast(t('finance.toast.expenseAdded', "Spesa aggiunta! 💸"), "success");
            fetchData();
        } catch (error) {
            showToast("Errore: " + error.message, "error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('finance.confirmDelete', "Sei sicuro di voler eliminare questa spesa?"))) return;
        try {
            await deleteExpense(id);
            showToast(t('finance.toast.expenseDeleted', "Spesa eliminata"), "success");
            fetchData();
        } catch (error) {
            showToast(t('common.error', "Errore"), "error");
        }
    };

    const getUserName = (id) => {
        const u = participants.find(p => p.id === id);
        return (u && u.name) ? u.name : `User ${id}`;
    };

    const getCategoryIcon = (cat) => {
        const c = categories.find(it => it.id === cat);
        return c ? c.icon : '💸';
    };

    const stats = useMemo(() => {
        const total = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const perPerson = participants.length > 0 ? total / participants.length : 0;

        let userBalance = 0;
        const myParticipant = currentUser ? participants.find(p => p.account_id === currentUser.id) : null;
        if (myParticipant) {
            const myPaid = expenses
                .filter(e => e.payer_id === myParticipant.id)
                .reduce((acc, e) => acc + e.amount, 0);
            userBalance = myPaid - perPerson;
        }

        return { total, perPerson, userBalance };
    }, [expenses, participants, currentUser]);

    return (
        <div className="container py-12 space-y-12">
            <div className="space-y-4">
                <span className="subtle-heading">{t('finance.expenses', 'Finance')}</span>
                <h2 className="text-primary text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                    {t('finance.title', 'Gestione Spese')}
                </h2>
            </div>

            {/* Global Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card !p-10 flex flex-col items-center justify-center space-y-2 border-b-2 border-primary-blue/30 bg-surface">
                    <span className="subtle-heading !mb-0">{t('finance.totalSpent', 'Totale Speso')}</span>
                    <div className="text-5xl font-black text-primary">
                        €{stats.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className={cn(
                    "premium-card !p-10 flex flex-col items-center justify-center space-y-2 border-b-2 bg-surface",
                    stats.userBalance >= 0 ? "border-green-500/30" : "border-red-500/30"
                )}>
                    <span className="subtle-heading !mb-0">{t('finance.yourBalance', 'Tuo Bilancio')}</span>
                    <div className={cn(
                        "text-5xl font-black",
                        stats.userBalance >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                        {stats.userBalance > 0 ? '+' : ''}€{stats.userBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height="100px" borderRadius="4px" />
                        <Skeleton height="100px" borderRadius="4px" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton height="60px" borderRadius="4px" />
                        <Skeleton height="60px" borderRadius="4px" />
                        <Skeleton height="60px" borderRadius="4px" />
                    </div>
                </div>
            ) : (
                <div className="space-y-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex bg-muted/30 p-1 rounded-sm border border-border-subtle">
                            <button
                                onClick={() => setTab('summary')}
                                className={cn(
                                    "px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm",
                                    tab === 'summary' ? "bg-accent-primary text-base" : "text-muted hover:text-primary"
                                )}
                            >
                                {t('finance.tabs.balances', 'Bilanci')}
                            </button>
                            <button
                                onClick={() => setTab('list')}
                                className={cn(
                                    "px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm",
                                    tab === 'list' ? "bg-accent-primary text-base" : "text-muted hover:text-primary"
                                )}
                            >
                                {t('finance.tabs.list', 'Lista')}
                            </button>
                        </div>

                        {!readOnly && (
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="h-12 px-8 bg-primary-blue text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-blue-light transition-all shadow-lg shadow-primary-blue/20"
                            >
                                {showForm ? t('finance.cancel', 'Annulla') : t('finance.addExpense', '+ Nuova Spesa')}
                            </button>
                        )}
                    </div>

                    <Drawer
                        isOpen={showForm}
                        onClose={() => setShowForm(false)}
                        title={t('finance.addExpense', '+ Nuova Spesa')}
                    >
                        <form onSubmit={handleAddExpense} className="space-y-8 pt-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('finance.form.title', 'Cosa?')}</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    placeholder={t('finance.form.titlePlaceholder', "es. Cena Sushi")}
                                    className="w-full h-14 bg-surface border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all placeholder:text-subtle"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('finance.form.amount', 'Importo')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        required
                                        placeholder="0.00"
                                        className="w-full h-14 bg-surface border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all placeholder:text-subtle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('finance.form.currency', 'Valuta')}</label>
                                    <select
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value)}
                                        className="w-full h-14 bg-surface border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all appearance-none"
                                    >
                                        {currencies.map(c => (
                                            <option key={c.code} value={c.code} className="bg-card">{c.symbol} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted block">{t('finance.form.category', 'Categoria')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={cn(
                                                "p-4 rounded-sm border transition-all flex flex-col items-center gap-2",
                                            category === cat.id
                                                    ? "bg-accent-primary text-base border-accent-primary"
                                                    : "bg-surface border-border-subtle text-muted hover:border-border-strong hover:text-primary"
                                            )}
                                        >
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-[8px] font-black uppercase tracking-tighter text-center transition-colors">
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('finance.form.payer', 'Chi ha pagato?')}</label>
                                <select
                                    value={payerId}
                                    onChange={e => setPayerId(e.target.value)}
                                    className="w-full h-14 bg-surface border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all appearance-none"
                                >
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id} className="bg-card">{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full h-16 bg-primary-blue text-white font-black uppercase text-xs tracking-widest hover:bg-primary-blue-light transition-all pt-2"
                            >
                                {t('finance.form.submit', 'Aggiungi Spesa 💸')}
                            </button>
                        </form>
                    </Drawer>

                    {tab === 'list' && (
                        <div className="space-y-4 animate-fade-in">
                            {expenses.length === 0 ? (
                                <div className="text-center py-20 premium-card opacity-30 flex flex-col items-center gap-4">
                                    <div className="text-5xl">🧾</div>
                                    <p className="text-xs uppercase tracking-widest font-bold font-sans">{t('finance.emptyState', 'Nessuna spesa registrata.')}</p>
                                </div>
                            ) : (
                                [...expenses].reverse().map(exp => (
                                    <div key={exp.id} className="premium-card !p-6 flex items-center justify-between group hover:border-primary-blue/30 transition-all bg-card">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-surface border border-border-subtle rounded-sm flex items-center justify-center text-3xl transition-transform group-hover:scale-110">
                                                {getCategoryIcon(exp.category)}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-lg font-bold text-primary tracking-tight leading-none">{exp.title}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-widest text-muted">
                                                    {t('finance.paidBy', 'Pagato da')} <span className="text-primary-blue">{getUserName(exp.payer_id)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right space-y-0.5">
                                                <div className="text-2xl font-black text-primary">€{exp.amount.toFixed(2)}</div>
                                                {exp.currency && exp.currency !== 'EUR' && (
                                                    <div className="text-[10px] font-bold text-muted uppercase tracking-tighter">
                                                        {exp.original_amount?.toLocaleString()} {exp.currency}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => handleDelete(exp.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'summary' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-1">
                                <span className="subtle-heading !mb-0">{t('finance.balancesTitle', 'Settlements')}</span>
                                <h3 className="text-primary text-xl font-bold uppercase tracking-tight">Debiti e Crediti</h3>
                            </div>

                            {balances.length === 0 ? (
                                <div className="premium-card !p-12 text-center space-y-4 bg-card">
                                    <div className="text-5xl">🎉</div>
                                    <div className="space-y-1">
                                        <p className="text-primary font-bold uppercase tracking-widest">{t('finance.balancedTitle', 'Tutti in pari!')}</p>
                                        <p className="text-muted text-xs">{t('finance.balancedDesc', 'Ancora nessuna spesa da conguagliare.')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {balances.map((b, idx) => (
                                        <div key={idx} className="premium-card !p-6 border-l-4 border-l-red-500 flex items-center justify-between bg-card">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-black rounded-sm text-xs">
                                                    {getUserName(b.debtor_id).substring(0, 1).toUpperCase()}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-bold text-primary tracking-widest uppercase">
                                                        {getUserName(b.debtor_id)}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-muted uppercase tracking-tighter">
                                                        {t('finance.owesTo', 'Owes to')} <span className="text-primary">{getUserName(b.creditor_id)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-2xl font-black text-red-500">
                                                €{b.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!readOnly && (
                                <div className="p-8 bg-primary-blue/5 border border-primary-blue/10 rounded-sm space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-primary-blue text-white flex items-center justify-center font-bold rounded-sm text-[10px]">i</div>
                                        <h4 className="text-primary-blue text-xs font-bold uppercase tracking-widest">{t('finance.tipTitle', 'AI Insight')}</h4>
                                    </div>
                                    <p className="text-muted text-xs leading-relaxed max-w-2xl">
                                        {t('finance.tipDesc', 'I bilanci sono calcolati automaticamente dividendo ogni spesa equamente tra tutti i partecipanti del viaggio.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Finance;