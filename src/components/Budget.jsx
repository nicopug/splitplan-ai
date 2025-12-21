import React from 'react';

const Budget = ({ trip }) => {
    // Calculate budget breakdown
    const totalBudget = (trip.budget_per_person || 0) * (trip.num_people || 1);
    const flightCost = trip.flight_cost || 0;
    const hotelCost = trip.hotel_cost || 0;
    const fixedCosts = flightCost + hotelCost;
    const remaining = totalBudget - fixedCosts;
    const isOverBudget = remaining < 0;
    const percentUsed = totalBudget > 0 ? Math.min((fixedCosts / totalBudget) * 100, 100) : 0;

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem' }}>Gestione Budget 💰</h2>

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
                        <span>Speso</span>
                        <span>{percentUsed.toFixed(0)}%</span>
                    </div>
                    <div style={{
                        background: '#e9ecef',
                        borderRadius: '10px',
                        height: '20px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: isOverBudget
                                ? 'linear-gradient(90deg, #dc3545, #ff6b6b)'
                                : 'linear-gradient(90deg, var(--primary-blue), #4dabf7)',
                            height: '100%',
                            width: `${percentUsed}%`,
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>

                {/* Budget Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        background: '#f8f9fa',
                        borderRadius: '12px'
                    }}>
                        <span style={{ fontWeight: 600 }}>📊 Budget Totale</span>
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
                            {isOverBudget ? '⚠️ Scoperto' : '💵 Rimasto per Attività'}
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
                            I costi di volo e hotel superano il budget iniziale di <strong>€{Math.abs(remaining).toFixed(2)}</strong>.<br />
                            Considera di rivedere le tue prenotazioni o aumentare il budget.
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
                            Hai <strong>€{remaining.toFixed(2)}</strong> disponibili per pasti, attività e biglietti.<br />
                            Questo equivale a circa <strong>€{(remaining / (trip.num_people || 1)).toFixed(2)}</strong> a persona.
                        </p>
                    </div>
                )}
            </div>

            {/* Info Footer */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.6, fontSize: '0.85rem' }}>
                <p>💡 Il budget rimanente è per pasti, biglietti, souvenir e imprevisti.</p>
            </div>
        </div>
    );
};

export default Budget;
