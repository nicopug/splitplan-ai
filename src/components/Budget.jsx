import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { estimateBudget, updateTrip, getExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Budget = ({ trip, onUpdate }) => {
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimation, setEstimation] = useState(null);
    const [showSimulation, setShowSimulation] = useState(false);
    const [realExpenses, setRealExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);

    // AI Forecast inclusion
    const [appliedAIExpense, setAppliedAIExpense] = useState(0);

    // Fetch real expenses from CFO tab
    useEffect(() => {
        const fetchExpenses = async () => {
            if (!trip?.id) return;
            try {
                const data = await getExpenses(trip.id);
                setRealExpenses(data || []);
            } catch (e) {
                console.error("Error fetching expenses for budget:", e);
            } finally {
                setLoadingExpenses(false);
            }
        };
        fetchExpenses();
    }, [trip?.id]);

    const handleApplyAsExpense = async () => {
        if (!estimation) return;
        const confirmed = await showConfirm(
            "Conferma Spesa Prevista",
            `Vuoi aggiungere la stima AI di €${(Number(estimation.total_estimated_per_person) * (trip.num_people || 1)).toFixed(2)} come spesa prevista?`
        );
        if (confirmed) {
            setAppliedAIExpense(Number(estimation.total_estimated_per_person) * (trip.num_people || 1));
            setEstimation(null);
            setShowSimulation(false);
            showToast("Proiezione aggiornata!", "success");
        }
    };

    const handleRemoveAI = useCallback(() => {
        setAppliedAIExpense(0);
        setEstimation(null);
        setShowSimulation(false);
        showToast("Proiezione rimossa", "info");
    }, []);

    const handleEstimate = async () => {
        setIsEstimating(true);
        try {
            const data = await estimateBudget(trip.id);
            if (data && data.total_estimated_per_person) {
                setEstimation(data);
                setShowSimulation(true);
                showToast("Stima AI completata!", "success");
            } else {
                throw new Error("Dati AI incompleti");
            }
        } catch (e) {
            showToast("Errore stima: " + e.message, "error");
        } finally {
            setIsEstimating(false);
        }
    };

    // Calculate analytics
    const stats = useMemo(() => {
        const numPeople = trip.num_people || 1;
        const totalBudget = (trip.budget_per_person || 0) * numPeople;
        const flightCost = trip.flight_cost || 0;
        const hotelCost = trip.hotel_cost || 0;

        const realTotal = realExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Group by category for chart
        const categoryMap = realExpenses.reduce((acc, exp) => {
            const cat = exp.category || 'Other';
            acc[cat] = (acc[cat] || 0) + exp.amount;
            return acc;
        }, {});

        // Add fixed categories if they have costs
        if (flightCost > 0) categoryMap['Flight'] = (categoryMap['Flight'] || 0) + flightCost;
        if (hotelCost > 0) categoryMap['Lodging'] = (categoryMap['Lodging'] || 0) + hotelCost;

        const currentSpent = flightCost + hotelCost + appliedAIExpense + realTotal;
        const estPerPerson = (estimation && estimation.total_estimated_per_person) ? Number(estimation.total_estimated_per_person) : 0;
        const simulatedCosts = (showSimulation && estimation) ? (estPerPerson * numPeople) : 0;
        const totalSpentWithSim = currentSpent + simulatedCosts;

        const remaining = totalBudget - (showSimulation ? totalSpentWithSim : currentSpent);
        const percentUsed = totalBudget > 0 ? Math.min(((showSimulation ? totalSpentWithSim : currentSpent) / totalBudget) * 100, 100) : 0;

        const categories = Object.entries(categoryMap).map(([id, amount]) => ({
            id,
            amount: Number(amount),
            label: id === 'Food' ? 'Cibo' :
                id === 'Transport' ? 'Trasporti' :
                    id === 'Lodging' ? 'Alloggio' :
                        id === 'Activity' ? 'Attività' :
                            id === 'Shopping' ? 'Shopping' :
                                id === 'Flight' ? 'Volo' : 'Altro',
            color: id === 'Food' ? '#3b82f6' :
                id === 'Transport' ? '#f59e0b' :
                    id === 'Lodging' ? '#10b981' :
                        id === 'Activity' ? '#8b5cf6' :
                            id === 'Shopping' ? '#ec4899' :
                                id === 'Flight' ? '#0ea5e9' : '#94a3b8'
        })).sort((a, b) => b.amount - a.amount);

        // Add AI projection if active - FORCE CHECK NUMBER
        const aiCost = appliedAIExpense + simulatedCosts;
        if (Number(aiCost) > 0.01) {
            categories.push({
                id: 'AI_Simulation',
                amount: Number(aiCost),
                label: 'Simulazione AI',
                color: '#f59e0b', // Accent Orange to be visible
                isSimulation: true,
                onRemove: handleRemoveAI // Callback ref
            });
        }

        // Add 'Remaining' as a category if it's positive and there is a total budget
        if (remaining > 0 && totalBudget > 0) {
            categories.push({
                id: 'Remaining',
                amount: remaining,
                label: 'Disponibile',
                color: '#f1f5f9',
                isRemaining: true
            });
        }

        return {
            totalBudget,
            numPeople,
            flightCost,
            hotelCost,
            realTotal,
            currentSpent,
            remaining,
            percentUsed,
            categories,
            isOverBudget: remaining < 0,
            simulatedCosts
        };
    }, [trip, realExpenses, appliedAIExpense, showSimulation, estimation, handleRemoveAI]);

    // Custom Donut Chart Component
    const DonutChart = ({ data }) => {
        // Ensure data is array
        if (!data || !Array.isArray(data)) return null;

        const total = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        if (total === 0) return null;

        let currentAngle = -90;
        const radius = 70;
        const strokeWidth = 25;
        const center = 100;
        const circumference = 2 * Math.PI * radius;

        return (
            <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                <svg viewBox="0 0 200 200" style={{ transform: 'rotate(0deg)' }}>
                    {data.map((item, i) => {
                        const itemAmount = item.amount || 0;
                        const percentage = (itemAmount / total) * 100;
                        const dashArray = (percentage * circumference) / 100;

                        // Calculate cumulative offset
                        const offset = data.slice(0, i).reduce((sum, prev) => sum + ((prev.amount || 0) / total) * circumference, 0);

                        return (
                            <circle
                                key={item.id}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${dashArray} ${circumference}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="butt"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                            />
                        );
                    })}
                </svg>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Budget</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>€{stats.totalBudget.toFixed(0)}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem', fontWeight: '800', fontSize: '2rem', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Analisi Budget
            </h2>

            {/* Top Cards: Spent vs Remaining */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid var(--primary-blue)' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>Speso Totale</div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-blue)' }}>€{stats.currentSpent.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>di €{stats.totalBudget.toFixed(0)} iniziali</div>
                </div>
                <div className="glass-card" style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    borderBottom: stats.isOverBudget ? '4px solid #ef4444' : '4px solid #10b981'
                }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {stats.isOverBudget ? 'Sforamento' : 'Disponibilità'}
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: stats.isOverBudget ? '#ef4444' : '#10b981'
                    }}>
                        €{Math.abs(stats.remaining).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                        {stats.isOverBudget ? 'Sei andato oltre il budget' : 'Ancora spendibili'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Chart & Categories */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Suddivisione Spese</h3>

                    {stats.categories.length > 0 ? (
                        <>
                            <DonutChart data={stats.categories} />
                            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {stats.categories.map(cat => (
                                    <div key={cat.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.9rem',
                                        opacity: cat.isRemaining ? 0.8 : 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '4px',
                                                background: cat.color,
                                                border: cat.isRemaining ? '1px dashed #cbd5e1' : 'none'
                                            }} />
                                            <span style={{ fontWeight: cat.isRemaining ? '500' : '600', color: cat.isRemaining ? '#64748b' : 'inherit' }}>
                                                {cat.label}
                                            </span>
                                            {cat.isSimulation && (
                                                <button
                                                    onClick={cat.onRemove}
                                                    style={{
                                                        border: 'none',
                                                        background: '#fee2e2',
                                                        color: '#ef4444',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        marginLeft: '8px',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title="Rimuovi proiezione"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: '700', color: cat.isRemaining ? '#64748b' : 'inherit' }}>
                                            €{cat.amount.toFixed(2)}
                                            <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '6px' }}>
                                                ({(stats.totalBudget > 0 ? (cat.amount / stats.totalBudget) * 100 : 0).toFixed(0)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                            <div style={{ fontSize: '3rem' }}>🤔</div>
                            <p>Ancora nessuna spesa registrata per mostrare il grafico.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: AI Projections & Tips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Progress Bar (Integrated) */}
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>Utilizzo Budget </span>
                            <span style={{ fontWeight: '800', color: 'var(--primary-blue)' }}>{stats.percentUsed.toFixed(0)}%</span>
                        </div>
                        <div style={{ background: '#f1f5f9', height: '28px', borderRadius: '14px', overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0' }}>
                            <div style={{
                                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                                height: '100%',
                                width: `${stats.percentUsed}%`,
                                transition: 'width 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                            }} />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '1rem', fontStyle: 'italic' }}>
                            {stats.percentUsed > 80 ? 'Attenzione! Hai quasi esaurito il budget prefissato.' :
                                stats.percentUsed > 50 ? 'Sei a metà del budget. Gestisci bene le prossime spese!' :
                                    'Ottimo lavoro, il budget è ancora ampiamente sotto controllo.'}
                        </p>
                    </div>

                    {/* AI Estimation Section */}
                    <div className="glass-card" style={{ padding: '2rem', border: '1px dashed var(--primary-blue)', background: 'rgba(37, 99, 235, 0.02)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Simulazione AI
                        </h3>
                        {!estimation ? (
                            <>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
                                    Vuoi sapere quanto spenderai indicativamente a {trip.destination}? La nostra AI calcola per te il costo della vita locale.
                                </p>
                                <button
                                    onClick={handleEstimate}
                                    disabled={isEstimating}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', padding: '0.8rem' }}
                                >
                                    {isEstimating ? 'Analizzando...' : 'Calcola Proiezione'}
                                </button>
                            </>
                        ) : (
                            <div className="animate-in">
                                <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem' }}>Stima locale / pers:</span>
                                        <span style={{ fontWeight: '800', color: 'var(--primary-blue)' }}>€{estimation.total_estimated_per_person}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                        "{estimation.advice}"
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleApplyAsExpense} className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }}>Applica</button>
                                    <button onClick={() => { setEstimation(null); setShowSimulation(false); }} className="btn btn-secondary" style={{ flex: 0.5, fontSize: '0.8rem' }}>Chiudi</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .glass-card {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.04);
                }
                .animate-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Budget;
