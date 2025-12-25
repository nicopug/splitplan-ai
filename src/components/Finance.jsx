import React, { useState, useEffect } from 'react';
import { addExpense, getExpenses, getBalances, getParticipants } from '../api';
import { useToast } from '../context/ToastContext';

const Finance = ({ trip }) => {
    const { showToast } = useToast();
    const [tab, setTab] = useState('list');
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [payerId, setPayerId] = useState('');

    const fetchData = async () => {
        try {
            const [exp, bal, parts] = await Promise.all([
                getExpenses(trip.id),
                getBalances(trip.id),
                getParticipants(trip.id)
            ]);
            setExpenses(exp);
            setBalances(bal);
            setParticipants(parts);

            // Se ci sono partecipanti, seleziona il primo di default
            if (parts && parts.length > 0 && !payerId) {
                setPayerId(parts[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, [trip.id]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!payerId) {
            showToast("Devi selezionare chi ha pagato!", "info");
            return;
        }
        try {
            await addExpense({
                trip_id: trip.id,
                title,
                amount: parseFloat(amount),
                payer_id: parseInt(payerId),
                category: "General"
            });
            setShowForm(false);
            setTitle('');
            setAmount('');
            showToast("Spesa aggiunta correttamente! 💸", "success");
            fetchData();
        } catch (error) {
            showToast("Errore: " + error.message, "error");
        }
    };


    const getUserName = (id) => {
        const u = participants.find(p => p.id === id);
        return u ? u.name : `User ${id}`;
    };

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem' }}>Spese & Bilancio 💸</h2>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button onClick={() => setTab('list')} className={tab === 'list' ? 'btn btn-primary' : 'btn btn-secondary'}>
                    Lista Movimenti 🧾
                </button>
                <button onClick={() => setTab('balances')} className={tab === 'balances' ? 'btn btn-primary' : 'btn btn-secondary'}>
                    Chi deve a Chi? ⚖️
                </button>
            </div>

            {/* Add Expense Button */}
            <div className="text-center" style={{ marginBottom: '2rem' }}>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ background: 'var(--accent-orange)' }}>
                    + Aggiungi Spesa
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem', boxShadow: 'var(--shadow-md)' }}>

                    {/* CONTROLLO DI SICUREZZA: SE NON CI SONO PARTECIPANTI */}
                    {participants.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#dc3545', padding: '1rem' }}>
                            <strong>⚠️ Nessun partecipante trovato in questo viaggio.</strong>
                            <p style={{ fontSize: '0.9rem' }}>Impossibile aggiungere spese. Prova a creare un nuovo viaggio.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleAddExpense}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Cosa?</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="es. Cena Sushi" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Quanto (€)?</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="100" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Chi ha pagato?</label>
                                <select
                                    value={payerId}
                                    onChange={e => setPayerId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        background: 'white',
                                        color: '#333',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id} style={{ color: 'black' }}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Salva Spesa</button>
                        </form>
                    )}
                </div>
            )}

            {/* Content */}
            {tab === 'list' && (
                <div>
                    {expenses.length === 0 ? (
                        <p className="text-center text-muted">Nessuna spesa registrata.</p>
                    ) : (
                        expenses.map(exp => (
                            <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'white', borderRadius: '12px', marginBottom: '0.5rem', boxShadow: 'var(--shadow-sm)', alignItems: 'center' }}>
                                <div style={{ textAlign: 'left' }}>
                                    {/* QUI HO MODIFICATO PER USARE description INVECE DI title */}
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                        {exp.description}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                        Pagato da <span style={{ fontWeight: '600' }}>{getUserName(exp.payer_id)}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>
                                    €{exp.amount.toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === 'balances' && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {balances.length === 0 ? (
                        <p className="text-center">Tutti in pari! 🎉</p>
                    ) : (
                        balances.map((b, idx) => (
                            <div key={idx} style={{ padding: '1.5rem', background: '#fff3cd', borderRadius: '16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#ffc107', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                        {getUserName(b.debtor_id).substring(0, 2).toUpperCase()}
                                    </div>
                                    <span><strong>{getUserName(b.debtor_id)}</strong> deve a <strong>{getUserName(b.creditor_id)}</strong></span>
                                </div>
                                <strong style={{ fontSize: '1.5rem' }}>€{b.amount.toFixed(2)}</strong>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Finance;