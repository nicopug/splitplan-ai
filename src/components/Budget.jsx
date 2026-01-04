import React, { useState } from 'react';
import { estimateBudget, updateTrip } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Budget = ({ trip, onUpdate }) => {
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimation, setEstimation] = useState(null);
    const [showSimulation, setShowSimulation] = useState(false);

    // Calculate budget breakdown
    const numPeople = trip.num_people || 1;
    const totalBudget = (trip.budget_per_person || 0) * numPeople;

    // Costs
    const flightCost = trip.flight_cost || 0;
    const hotelCost = trip.hotel_cost || 0;

    // AI Forecast inclusion (now treated as a dedicated expense simulated or semi-permanent)
    const [appliedAIExpense, setAppliedAIExpense] = useState(0);

    const simulatedCosts = (showSimulation && estimation) ? (estimation.total_estimated_per_person * numPeople) : 0;

    // Total spent includes flight, hotel and any APPLIED AI expense
    const currentSpent = flightCost + hotelCost + appliedAIExpense;
    const totalSpentWithSim = currentSpent + (showSimulation ? simulatedCosts : 0);

    const remaining = totalBudget - (showSimulation ? totalSpentWithSim : currentSpent);
    const isOverBudget = remaining < 0;
    const percentUsed = totalBudget > 0 ? Math.min(((showSimulation ? totalSpentWithSim : currentSpent) / totalBudget) * 100, 100) : 0;

    const handleEstimate = async () => {
        setIsEstimating(true);
        try {
            const data = await estimateBudget(trip.id);
            setEstimation(data);
            setShowSimulation(true); // Auto-simulate impact
            showToast("✅ Stima AI completata!", "success");
        } catch (e) {
            showToast("Errore stima: " + e.message, "error");
        } finally {
            setIsEstimating(false);
        }
    };

    const handleApplyAsExpense = async () => {
        if (!estimation) return;

        const confirmed = await showConfirm(
            "Conferma Spesa Prevista 🤖",
            `Vuoi aggiungere la stima AI di €${estimation.total_estimated_per_person * numPeople} come spesa prevista? Verrà sottratta dal tuo budget rimanente.`
        );

        if (confirmed) {
            setAppliedAIExpense(estimation.total_estimated_per_person * numPeople);
            setEstimation(null);
            setShowSimulation(false);
            showToast("✨ Spesa aggiunta alla proiezione!", "success");
        }
    };

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem' }}>Gestione Budget 💰</h2>

            <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center' }}>
                <button
                    onClick={handleEstimate}
                    disabled={isEstimating}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {isEstimating ? '🤖 Analizzando costi...' : '🤖 Calcola Costi Locali (Cibo, Trasporti...)'}
                </button>
            </div>

            {estimation && (
                <div style={{
                    background: 'rgba(35, 89, 158, 0.05)',
                    border: '2px dashed var(--primary-blue)',
                    borderRadius: '24px',
                    padding: '2rem',
                    maxWidth: '600px',
                    margin: '0 auto 2rem'
                }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-blue)', marginBottom: '1rem' }}>Suggerimento AI per {trip.destination}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pasto (Medio)</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>€{estimation.daily_meal_mid}</div>
                        </div>
                        <div className="stat-card">
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Trasporti / giorno</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>€{estimation.daily_transport}</div>
                        </div>
                        <div className="stat-card">
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Caffè & Drink</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>€{estimation.coffee_drinks}</div>
                        </div>
                        <div className="stat-card" style={{ border: '1px solid var(--primary-blue)' }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Stima Totale Vivibilità</span>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>€{estimation.total_estimated_per_person} / pers.</div>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-blue)', paddingLeft: '1rem' }}>
                        "{estimation.advice}"
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <button
                            onClick={handleApplyAsExpense}
                            className="btn btn-primary"
                            style={{ flex: 1.5, background: 'var(--primary-blue)' }}
                        >
                            ➕ Applica come Spesa
                        </button>
                        <button onClick={() => { setEstimation(null); setShowSimulation(false); }} className="btn btn-secondary" style={{ flex: 0.5 }}>Chiudi</button>
                    </div>
                </div>
            )}

            {/* Budget Overview Card */}
            <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: 'var(--shadow-lg)',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Progress Bar */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        fontSize: '0.9rem',
                        color: '#666'
                    }}>
                        <span>{showSimulation ? 'Spesa Totale Stimata' : 'Speso Attualmente'}</span>
                        <span>{percentUsed.toFixed(0)}%</span>
                    </div>
                    <div style={{
                        background: '#e9ecef',
                        borderRadius: '10px',
                        height: '24px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {/* Fixed Costs (Flight + Hotel) */}
                        <div style={{
                            background: 'var(--primary-blue)',
                            height: '100%',
                            width: `${Math.min((flightCost + hotelCost / totalBudget) * 100, 100)}%`,
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            transition: 'width 0.5s ease',
                            zIndex: 3
                        }} />
                        {/* Applied AI Expenses */}
                        {appliedAIExpense > 0 && (
                            <div style={{
                                background: '#37b24d',
                                height: '100%',
                                width: `${Math.min((appliedAIExpense / totalBudget) * 100, 100)}%`,
                                position: 'absolute',
                                left: `${Math.min(((flightCost + hotelCost) / totalBudget) * 100, 100)}%`,
                                top: 0,
                                transition: 'width 0.5s ease',
                                zIndex: 2
                            }} />
                        )}
                        {/* Simulated Costs (AI) */}
                        {showSimulation && (
                            <div style={{
                                background: '#ffd43b',
                                height: '100%',
                                width: `${Math.min((simulatedCosts / totalBudget) * 100, 100)}%`,
                                position: 'absolute',
                                left: `${Math.min(((flightCost + hotelCost + appliedAIExpense) / totalBudget) * 100, 100)}%`,
                                top: 0,
                                transition: 'width 0.5s ease',
                                zIndex: 1
                            }} />
                        )}
                    </div>
                    {(showSimulation || appliedAIExpense > 0) && (
                        <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: 'var(--primary-blue)', borderRadius: '2px' }} /> Prenotato</span>
                            {appliedAIExpense > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#37b24d', borderRadius: '2px' }} /> Spesa Prevista</span>}
                            {showSimulation && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#ffd43b', borderRadius: '2px' }} /> Simulazione AI</span>}
                        </div>
                    )}
                </div>

                {/* Budget Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: '#f8f9fa',
                        borderRadius: '12px',
                        border: '1px solid #eee'
                    }}>
                        <span style={{ fontWeight: 600 }}>📊 IL TUO BUDGET</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}>€{totalBudget.toFixed(2)}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: '#fff3cd',
                        borderRadius: '12px'
                    }}>
                        <span>✈️ Volo</span>
                        <span style={{ fontWeight: 'bold', color: '#856404' }}>- €{flightCost.toFixed(2)}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: '#d4edda',
                        borderRadius: '12px'
                    }}>
                        <span>🏨 Hotel</span>
                        <span style={{ fontWeight: 'bold', color: '#155724' }}>- €{hotelCost.toFixed(2)}</span>
                    </div>

                    {appliedAIExpense > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'rgba(55, 178, 77, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid #37b24d'
                        }}>
                            <span>🤖 Spesa Prevista AI</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#2b8a3e' }}>- €{appliedAIExpense.toFixed(2)}</span>
                                <button onClick={() => setAppliedAIExpense(0)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>✕</button>
                            </div>
                        </div>
                    )}

                    {showSimulation && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'rgba(255, 212, 59, 0.2)',
                            borderRadius: '12px',
                            border: '1px dashed #fab005'
                        }}>
                            <span>🔍 Simulazione AI</span>
                            <span style={{ fontWeight: 'bold', color: '#856404' }}>- €{simulatedCosts.toFixed(2)}</span>
                        </div>
                    )}

                    <hr style={{ border: 'none', borderTop: '2px dashed #ddd', margin: '0.5rem 0' }} />

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1.5rem',
                        background: isOverBudget ? '#f8d7da' : '#d1ecf1',
                        borderRadius: '16px',
                        border: isOverBudget ? '2px solid #dc3545' : '2px solid #0c5460'
                    }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {isOverBudget ? '⚠️ Scoperto Stimato' : '💵 Disponibilità Rimanente'}
                        </span>
                        <span style={{
                            fontWeight: 'bold',
                            fontSize: '1.3rem',
                            color: isOverBudget ? '#dc3545' : '#0c5460'
                        }}>
                            €{remaining.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Over Budget Warning */}
                {isOverBudget && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #dc3545, #c82333)',
                        color: 'white',
                        borderRadius: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚨</div>
                        <h4 style={{ margin: '0 0 0.5rem', color: 'white' }}>Attenzione: Budget Superato!</h4>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                            I costi stimati superano il budget massimo di <strong>€{Math.abs(remaining).toFixed(2)}</strong>.<br />
                            Considera di rivedere la stima o aumentare il budget.
                        </p>
                    </div>
                )}

                {/* Budget Tips */}
                {!isOverBudget && remaining > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #28a745, #20c997)',
                        color: 'white',
                        borderRadius: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                        <h4 style={{ margin: '0 0 0.5rem', color: 'white' }}>Budget in Regola!</h4>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                            Hai <strong>€{remaining.toFixed(2)}</strong> disponibili per attività extra e souvenir.<br />
                            Questo equivale a circa <strong>€{(remaining / numPeople).toFixed(2)}</strong> a persona.
                        </p>
                    </div>
                )}
            </div>

            {/* Info Footer */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.6, fontSize: '0.85rem' }}>
                <p>💡 Il budget rimanente è calcolato sottraendo i costi fissi {showSimulation ? 'e la stima AI' : ''} dal budget totale.</p>
            </div>
        </div>
    );
};

export default Budget;
