import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addExpense, getExpenses, getBalances, getParticipants, deleteExpense, migrateExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { Button } from './ui/button';
import { ArrowLeft, Wallet, Coins, Plus, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

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
            // First run migration silently just in case
            try { await migrateExpenses(); } catch (e) { }

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
        return u ? u.name : `User ${id}`;
    };

    const getCategoryIcon = (cat) => {
        const c = categories.find(it => it.id === cat);
        return c ? c.icon : '💸';
    };

    const stats = useMemo(() => {
        const total = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const perPerson = participants.length > 0 ? total / participants.length : 0;
        return { total, perPerson };
    }, [expenses, participants]);

    return (
        <div className="container section py-8 md:py-16 animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                    {t('finance.title', 'CFO & Spese')}
                </h2>
                <div className="h-1 w-20 bg-[#0070f3] mx-auto rounded-full" />
            </div>

            {/* High-Contrast Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-12">
                <div className="bg-[#0d0d18] border border-white/5 p-8 rounded-[32px] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#0070f3]/20" />
                    <div className="text-[10px] md:text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-3">{t('finance.totalSpent', 'Totale Speso')}</div>
                    <div className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                        <span className="text-[#0070f3] mr-1">€</span>{stats.total.toFixed(2)}
                    </div>
                </div>
                <div className="bg-[#0d0d18] border border-white/5 p-8 rounded-[32px] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20" />
                    <div className="text-[10px] md:text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-3">{t('finance.perPerson', 'A persona')}</div>
                    <div className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                        <span className="text-emerald-500 mr-1">€</span>{stats.perPerson.toFixed(2)}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="spinner-large" style={{ margin: '0 auto 1.5rem' }}></div>
                    <p className="text-muted">{t('finance.loading', 'Analisi finanziaria in corso...')}</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-center mb-12">
                        <div className="bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10 flex gap-1">
                            <button
                                onClick={() => setTab('summary')}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300",
                                    tab === 'summary' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
                                )}
                            >
                                {t('finance.tabs.balances', 'Bilanci')}
                            </button>
                            <button
                                onClick={() => setTab('list')}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300",
                                    tab === 'list' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
                                )}
                            >
                                {t('finance.tabs.list', 'Lista')}
                            </button>
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex justify-center mb-12">
                            <Button
                                onClick={() => setShowForm(true)}
                                className="btn-primary h-14 px-8 rounded-2xl flex items-center gap-3 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-black text-lg">{t('finance.addExpense', 'Nuova Spesa')}</span>
                            </Button>
                        </div>
                    )}

                    {showForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowForm(false)} />
                            <div className="bg-[#080810] border border-white/10 w-full max-w-lg rounded-[40px] p-8 md:p-12 shadow-2xl relative animate-scale-in">
                                <h3 className="text-3xl font-black text-white mb-8 tracking-tighter">{t('finance.addExpense', 'Aggiungi Spesa')}</h3>
                                <form onSubmit={handleAddExpense} className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{t('finance.form.title', 'Cosa?')}</label>
                                        <input
                                            value={title} onChange={e => setTitle(e.target.value)} required
                                            placeholder={t('finance.form.titlePlaceholder', "es. Cena Sushi")}
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white focus:border-[#0070f3] transition-all outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{t('finance.form.amount', 'Importo')}</label>
                                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white focus:border-[#0070f3] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{t('finance.form.currency', 'Valuta')}</label>
                                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white appearance-none outline-none focus:border-[#0070f3]">
                                                {currencies.map(c => (
                                                    <option key={c.code} value={c.code} className="bg-[#080810]">{c.symbol} {c.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{t('finance.form.category', 'Categoria')}</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id} type="button"
                                                    onClick={() => setCategory(cat.id)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300",
                                                        category === cat.id ? "bg-[#0070f3]/20 border-[#0070f3] text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="text-xl mb-1">{cat.icon}</span>
                                                    <span className="text-[10px] font-bold">{cat.label.split(' ')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">{t('finance.form.payer', 'Chi ha pagato?')}</label>
                                        <select value={payerId} onChange={e => setPayerId(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white appearance-none outline-none focus:border-[#0070f3]">
                                            {participants.map(p => (
                                                <option key={p.id} value={p.id} className="bg-[#080810]">{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <Button variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 text-white/60" onClick={() => setShowForm(false)}>
                                            {t('common.cancel', 'Annulla')}
                                        </Button>
                                        <Button type="submit" className="btn-primary flex-[2] h-14 rounded-2xl font-black text-lg">
                                            {t('finance.form.submit', 'Aggiungi Spesa')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {tab === 'list' && (
                        <div className="animate-in">
                            {expenses.length === 0 ? (
                                <div className="text-center py-16 bg-[#0d0d18] border border-white/5 rounded-[32px] animate-scale-in">
                                    <div className="text-4xl mb-4 opacity-50">🧾</div>
                                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">{t('finance.emptyState', 'Ancora nessuna spesa.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {[...expenses].reverse().map(exp => (
                                        <div key={exp.id} className="bg-[#0d0d18] border border-white/5 p-6 rounded-[32px] shadow-xl animate-scale-in hover:border-white/10 transition-all group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                                    {getCategoryIcon(exp.category)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-white font-black text-lg tracking-tight mb-1">{exp.title || exp.description}</div>
                                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                        {t('finance.paidBy', 'Pagato da')} <span className="text-[#0070f3]">{getUserName(exp.payer_id)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-6">
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                                            <span className="text-[#0070f3] mr-1">€</span>{exp.amount.toFixed(2)}
                                                        </div>
                                                        {exp.currency && exp.currency !== 'EUR' && (
                                                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                                                {exp.original_amount?.toLocaleString()} {exp.currency}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!readOnly && (
                                                        <button
                                                            onClick={() => handleDelete(exp.id)}
                                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            title={t('common.delete', 'Elimina')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'summary' && (
                        <div className="animate-in">
                            <h3
                                className="dark:text-white"
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '800',
                                    marginBottom: '1.5rem',
                                    paddingLeft: '0.5rem',
                                    color: theme === 'dark' ? '#ffffff' : '#000000'
                                }}
                            >
                                {t('finance.balancesTitle', 'Bilancio Debiti/Crediti')}
                            </h3>
                            {balances.length === 0 ? (
                                <div className="text-center py-12 glass-card dark:bg-white/10">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                                    <p style={{ fontWeight: '600', color: theme === 'dark' ? '#ffffff' : '#000000' }}>{t('finance.balancedTitle', 'Tutti in pari!')}</p>
                                    <p className="text-muted dark:text-gray-400" style={{ fontSize: '0.9rem' }}>{t('finance.balancedDesc', 'Nessuno deve soldi a nessuno.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {balances.map((b, idx) => (
                                        <div key={idx} className="bg-[#0d0d18] border border-white/5 p-6 rounded-[32px] shadow-xl animate-scale-in">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0070f3] to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-[#0070f3]/10">
                                                    {getUserName(b.debtor_id).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">{getUserName(b.debtor_id)}</div>
                                                    <div className="text-white font-medium">
                                                        {t('finance.owesTo', 'deve dare a')} <span className="font-black text-[#0070f3]">{getUserName(b.creditor_id)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-3xl font-black text-white tracking-tighter tabular-nums">
                                                    <span className="text-emerald-500 mr-1">€</span>{b.amount.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!readOnly && (
                                <div className="mt-8 p-6 bg-[#0070f3]/5 rounded-[32px] border border-[#0070f3]/20 relative overflow-hidden">
                                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#0070f3]/10 blur-3xl rounded-full" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#0070f3] mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        {t('finance.tipTitle', 'Tip di SplitPlan AI')}
                                    </h4>
                                    <p className="text-xs md:text-sm text-[#7b7b9a] leading-relaxed font-medium">
                                        {t('finance.tipDesc', 'I bilanci vengono calcolati automaticamente dividendo ogni spesa equamente tra tutti i partecipanti del viaggio.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </>
            )}
        </div>
    );
};

export default Finance;