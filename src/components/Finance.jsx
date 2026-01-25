import React, { useState, useEffect, useMemo } from 'react';
import { addExpense, getExpenses, getBalances, getParticipants, deleteExpense, migrateExpenses } from '../api';
import { useToast } from '../context/ToastContext';

const Finance = ({ trip, readOnly = false, sharedExpenses = [], sharedParticipants = [] }) => {
    const { showToast } = useToast();
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
        { code: 'EUR', symbol: '€', label: 'Euro' },
        { code: 'USD', symbol: '$', label: 'Dollaro USA' },
        { code: 'JPY', symbol: '¥', label: 'Yen Giapponese' },
        { code: 'GBP', symbol: '£', label: 'Sterlina' },
        { code: 'CHF', symbol: 'CHF', label: 'Franco Svizzero' },
        { code: 'AED', symbol: 'د.إ', label: 'Dirham' }
    ];

    const categories = [
        { id: 'Food', label: 'Cibo & Drink', icon: '🍕' },
        { id: 'Transport', label: 'Trasporti', icon: '🚗' },
        { id: 'Lodging', label: 'Alloggio', icon: '🏨' },
        { id: 'Activity', label: 'Attività', icon: '🎡' },
        { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
        { id: 'Other', label: 'Altro', icon: '📦' }
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
            showToast("Errore nel caricamento: " + e.message, "error");
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
            showToast("Seleziona chi ha pagato!", "info");
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
            showToast("Spesa aggiunta! 💸", "success");
            fetchData();
        } catch (error) {
            showToast("Errore: " + error.message, "error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questa spesa?")) return;
        try {
            await deleteExpense(id);
            showToast("Spesa eliminata", "success");
            fetchData();
        } catch (error) {
            showToast("Errore durante l'eliminazione", "error");
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
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem', fontWeight: '800', fontSize: '2rem', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gestione Spese
            </h2>

            {/* Global Stats Dashboard */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '2rem',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                padding: '1.5rem',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
            }}>
                <div style={{ textAlign: 'center', borderRight: '1px solid #eee' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Totale Speso</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-blue)' }}>€{stats.total.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>A persona</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-orange)' }}>€{stats.perPerson.toFixed(2)}</div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="spinner-large" style={{ margin: '0 auto 1.5rem' }}></div>
                    <p className="text-muted">Analisi finanziaria in corso...</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '14px', width: 'fit-content', margin: '0 auto 2rem' }}>
                        <button
                            onClick={() => setTab('summary')}
                            className="nav-tab-minimal"
                            style={{
                                background: tab === 'summary' ? 'white' : 'transparent',
                                boxShadow: tab === 'summary' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                color: tab === 'summary' ? '#2562eb' : '#64748b'
                            }}
                        >
                            Bilanci ⚖️
                        </button>
                        <button
                            onClick={() => setTab('list')}
                            className="nav-tab-minimal"
                            style={{
                                background: tab === 'list' ? 'white' : 'transparent',
                                boxShadow: tab === 'list' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                color: tab === 'list' ? '#2562eb' : '#64748b'
                            }}
                        >
                            Lista 🧾
                        </button>
                    </div>

                    {!readOnly && (
                        <div className="text-center" style={{ marginBottom: '2rem' }}>
                            <button onClick={() => setShowForm(!showForm)} className="btn-modern-primary">
                                {showForm ? 'Annulla' : '+ Nuova Spesa'}
                            </button>
                        </div>
                    )}

                    {showForm && (
                        <div className="glass-card" style={{ maxWidth: '450px', margin: '0 auto 2.5rem', padding: '2rem' }}>
                            <form onSubmit={handleAddExpense}>
                                <div style={{ marginBottom: '1.2rem' }}>
                                    <label className="form-label-modern">Cosa?</label>
                                    <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="es. Cena Sushi" className="form-input-modern" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                                    <div>
                                        <label className="form-label-modern">Importo</label>
                                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="form-input-modern" />
                                    </div>
                                    <div>
                                        <label className="form-label-modern">Valuta</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-input-modern">
                                            {currencies.map(c => (
                                                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1.2rem' }}>
                                    <label className="form-label-modern">Categoria</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                        {categories.map(cat => (
                                            <div
                                                key={cat.id}
                                                onClick={() => setCategory(cat.id)}
                                                style={{
                                                    padding: '0.6rem',
                                                    border: '1px solid',
                                                    borderColor: category === cat.id ? 'var(--primary-blue)' : '#eee',
                                                    background: category === cat.id ? '#eff6ff' : 'white',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem', display: 'block' }}>{cat.icon}</span>
                                                {cat.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label-modern">Chi ha pagato?</label>
                                    <select value={payerId} onChange={e => setPayerId(e.target.value)} className="form-input-modern">
                                        {participants.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="btn-modern-primary" style={{ width: '100%' }}>Aggiungi Spesa 💸</button>
                            </form>
                        </div>
                    )}

                    {tab === 'list' && (
                        <div className="animate-in">
                            {expenses.length === 0 ? (
                                <div className="text-center py-8">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                                    <p className="text-muted">Ancora nessuna spesa registrata.</p>
                                </div>
                            ) : (
                                [...expenses].reverse().map(exp => (
                                    <div key={exp.id} className="expense-card-premium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                background: '#f8fafc',
                                                borderRadius: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.5rem',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                            }}>
                                                {getCategoryIcon(exp.category)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1e293b' }}>{exp.description}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    Pagato da <span style={{ color: '#0f172a', fontWeight: '600' }}>{getUserName(exp.payer_id)}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#2563eb' }}>€{exp.amount.toFixed(2)}</div>
                                                    {exp.currency && exp.currency !== 'EUR' && (
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                                                            {exp.original_amount.toLocaleString()} {exp.currency}
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
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>Bilancio Debiti/Crediti</h3>
                            {balances.length === 0 ? (
                                <div className="text-center py-12 glass-card">
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                                    <p style={{ fontWeight: '600', color: '#0f172a' }}>Tutti in pari!</p>
                                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nessuno deve soldi a nessuno.</p>
                                </div>
                            ) : (
                                balances.map((b, idx) => (
                                    <div key={idx} className="balance-card-premium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="user-avatar-mini" style={{ background: '#3b82f6' }}>
                                                {getUserName(b.debtor_id).substring(0, 1).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.95rem' }}>
                                                    <strong>{getUserName(b.debtor_id)}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    deve dare a <strong>{getUserName(b.creditor_id)}</strong>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ef4444' }}>
                                                €{b.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {!readOnly && (
                                <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '16px', border: '1px dashed #3b82f6' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1d4ed8', fontWeight: '700' }}>Tip di SplitPlan AI</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: '1.4' }}>
                                        I bilanci vengono calcolati automaticamente dividendo ogni spesa equamente tra tutti i partecipanti del viaggio.
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
                    background: white;
                    padding: 1.2rem;
                    border-radius: 20px;
                    margin-bottom: 1rem;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s;
                }
                .expense-card-premium:hover {
                    transform: translateX(4px);
                    border-color: #e2e8f0;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                }
                .balance-card-premium {
                    background: #fff;
                    padding: 1.2rem;
                    border-radius: 20px;
                    margin-bottom: 0.8rem;
                    border-left: 5px solid #ef4444;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
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