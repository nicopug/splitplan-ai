import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addExpense, getExpenses, getBalances, getParticipants, deleteExpense, migrateExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
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

        let userBalance = 0;
        if (currentUser && participants.some(p => p.id === currentUser.id)) {
            const myPaid = expenses
                .filter(e => e.payer_id === currentUser.id)
                .reduce((acc, e) => acc + e.amount, 0);
            userBalance = myPaid - perPerson;
        }

        return { total, perPerson, userBalance };
    }, [expenses, participants, currentUser]);

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '3rem', fontWeight: '900', fontSize: '2.5rem', background: 'linear-gradient(135deg, var(--accent-digital-blue) 0%, var(--accent-digital-blue-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('finance.title', 'Gestione Spese')}
            </h2>

            {/* Global Stats Dashboard */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem',
                background: 'var(--bg-card)',
                padding: '2.5rem',
                borderRadius: '32px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>{t('finance.totalSpent', 'Totale Speso')}</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                        €{stats.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>{t('finance.yourBalance', 'Tuo Bilancio')}</div>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: '900',
                        color: stats.userBalance >= 0 ? 'var(--accent-green)' : '#f87171',
                        marginTop: '0.5rem',
                        textShadow: stats.userBalance >= 0 ? '0 0 20px rgba(16, 185, 129, 0.2)' : '0 0 20px rgba(248, 113, 113, 0.2)'
                    }}>
                        {stats.userBalance > 0 ? '+' : ''}€{stats.userBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Skeleton height="80px" borderRadius="24px" />
                        <Skeleton height="80px" borderRadius="24px" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton height="20px" width="150px" />
                        <Skeleton height="60px" borderRadius="20px" />
                        <Skeleton height="60px" borderRadius="20px" />
                        <Skeleton height="60px" borderRadius="20px" />
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.4rem', borderRadius: '14px', width: 'fit-content', margin: '0 auto 2rem', border: '1px solid var(--border-subtle)' }}>
                        <button
                            onClick={() => setTab('summary')}
                            className="nav-tab-minimal"
                            style={{
                                background: tab === 'summary' ? 'var(--accent-digital-blue)' : 'transparent',
                                boxShadow: tab === 'summary' ? 'var(--glow-blue-sm)' : 'none',
                                color: tab === 'summary' ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            {t('finance.tabs.balances', 'Bilanci ⚖️')}
                        </button>
                        <button
                            onClick={() => setTab('list')}
                            className="nav-tab-minimal"
                            style={{
                                background: tab === 'list' ? 'var(--accent-digital-blue)' : 'transparent',
                                boxShadow: tab === 'list' ? 'var(--glow-blue-sm)' : 'none',
                                color: tab === 'list' ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            {t('finance.tabs.list', 'Lista 🧾')}
                        </button>
                    </div>

                    {!readOnly && (
                        <div className="text-center" style={{ marginBottom: '2rem' }}>
                            <button onClick={() => setShowForm(!showForm)} className="btn-modern-primary">
                                {showForm ? t('finance.cancel', 'Annulla') : t('finance.addExpense', '+ Nuova Spesa')}
                            </button>
                        </div>
                    )}

                    <Drawer
                        isOpen={showForm}
                        onClose={() => setShowForm(false)}
                        title={t('finance.addExpense', '+ Nuova Spesa')}
                    >
                        <form onSubmit={handleAddExpense} className="space-y-6">
                            <div>
                                <label className="form-label-modern">{t('finance.form.title', 'Cosa?')}</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} required placeholder={t('finance.form.titlePlaceholder', "es. Cena Sushi")} className="form-input-modern" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="form-label-modern">{t('finance.form.amount', 'Importo')}</label>
                                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="form-input-modern" />
                                </div>
                                <div>
                                    <label className="form-label-modern">{t('finance.form.currency', 'Valuta')}</label>
                                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-input-modern">
                                        {currencies.map(c => (
                                            <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label-modern">{t('finance.form.category', 'Categoria')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id)}
                                            style={{
                                                padding: '0.8rem',
                                                border: '1px solid',
                                                borderColor: category === cat.id ? 'var(--accent-digital-blue)' : 'var(--border-subtle)',
                                                background: category === cat.id ? 'var(--accent-digital-blue-dim)' : 'var(--bg-card)',
                                                borderRadius: '16px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                color: category === cat.id ? 'var(--accent-digital-blue-light)' : 'var(--text-muted)',
                                                fontWeight: category === cat.id ? '800' : '500'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.2rem', display: 'block' }}>{cat.icon}</span>
                                            {cat.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label-modern">{t('finance.form.payer', 'Chi ha pagato?')}</label>
                                <select value={payerId} onChange={e => setPayerId(e.target.value)} className="form-input-modern">
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="btn-modern-primary" style={{ width: '100%', marginTop: 'auto' }}>
                                {t('finance.form.submit', 'Aggiungi Spesa 💸')}
                            </button>
                        </form>
                    </Drawer>

                    {tab === 'list' && (
                        <div className="animate-in">
                            {expenses.length === 0 ? (
                                <div className="text-center py-8">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                                    <p className="text-muted">{t('finance.emptyState', 'Ancora nessuna spesa registrata.')}</p>
                                </div>
                            ) : (
                                [...expenses].reverse().map(exp => (
                                    <div key={exp.id} className="expense-card-premium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.5rem',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {getCategoryIcon(exp.category)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{exp.title}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    {t('finance.paidBy', 'Pagato da')} <span style={{ color: 'var(--accent-digital-blue-light)', fontWeight: '700' }}>{getUserName(exp.payer_id)}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <div style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--accent-digital-blue-light)' }}>€{exp.amount.toFixed(2)}</div>
                                                    {exp.currency && exp.currency !== 'EUR' && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                            {exp.original_amount?.toLocaleString()} {exp.currency}
                                                        </div>
                                                    )}
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => handleDelete(exp.id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', padding: '5px', cursor: 'pointer', opacity: 0.6 }}
                                                        title="Elimina"
                                                    >
                                                        🗑️
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
                                balances.map((b, idx) => (
                                    <div key={idx} className="balance-card-premium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="user-avatar-mini" style={{ background: 'var(--accent-digital-blue)' }}>
                                                {getUserName(b.debtor_id).substring(0, 1).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                    <strong style={{ fontWeight: '800' }}>{getUserName(b.debtor_id)}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {t('finance.owesTo', 'deve dare a')} <strong style={{ fontWeight: '700', color: 'var(--accent-digital-blue-light)' }}>{getUserName(b.creditor_id)}</strong>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '950', color: '#f87171' }}>
                                                €{b.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {!readOnly && (
                                <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '16px', border: '1px dashed #3b82f6' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1d4ed8', fontWeight: '700' }}>{t('finance.tipTitle', 'Tip di SplitPlan AI')}</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.4' }}>
                                        {t('finance.tipDesc', 'I bilanci vengono calcolati automaticamente dividendo ogni spesa equamente tra tutti i partecipanti del viaggio.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <style>{`
                .nav-tab-minimal {
                    padding: 0.5rem 1.5rem;
                    border: none;
                    border-radius: 10px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-modern-primary {
                    background: #2563eb;
                    color: white;
                    padding: 0.8rem 2rem;
                    border: none;
                    border-radius: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
                }
                .btn-modern-primary:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 24px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.06);
                }
                .form-label-modern {
                    display: block;
                    font-weight: 700;
                    margin-bottom: 0.6rem;
                    font-size: 0.9rem;
                    color: #475569;
                }
                .form-input-modern {
                    width: 100%;
                    padding: 0.9rem 1.2rem;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                }
                .form-input-modern:focus {
                    border-color: #3b82f6;
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                .expense-card-premium {
                    background: var(--bg-card);
                    padding: 1.5rem;
                    border-radius: 24px;
                    margin-bottom: 1.25rem;
                    border: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-sm);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .expense-card-premium:hover {
                    transform: translateX(8px);
                    border-color: var(--accent-digital-blue);
                    box-shadow: var(--shadow-md);
                }
                .balance-card-premium {
                    background: var(--bg-card);
                    padding: 1.5rem;
                    border-radius: 24px;
                    margin-bottom: 1rem;
                    border-left: 6px solid #ef4444;
                    border-top: 1px solid var(--border-subtle);
                    border-right: 1px solid var(--border-subtle);
                    border-bottom: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-sm);
                }
                .user-avatar-mini {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: flex;
                    alignItems: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                }
                .animate-in {
                    animation: slideUp 0.4s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Finance;