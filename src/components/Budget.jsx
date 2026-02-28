import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateBudget, updateTrip, getExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const Budget = ({ trip, onUpdate }) => {
    const { t } = useTranslation();
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
            t('budget.confirmApply', "Conferma Spesa Prevista"),
            t('budget.confirmApplyDesc', { amount: (Number(estimation.total_estimated_per_person) * (trip.num_people || 1)).toFixed(2) })
        );
        if (confirmed) {
            setAppliedAIExpense(Number(estimation.total_estimated_per_person) * (trip.num_people || 1));
            setEstimation(null);
            setShowSimulation(false);
            showToast(t('budget.toast.applied', "Proiezione aggiornata!"), "success");
        }
    };

    const handleRemoveAI = useCallback(() => {
        setAppliedAIExpense(0);
        setEstimation(null);
        setShowSimulation(false);
        showToast(t('budget.toast.removed', "Proiezione rimossa"), "info");
    }, []);

    const handleEstimate = async () => {
        setIsEstimating(true);
        try {
            const data = await estimateBudget(trip.id);
            if (data && data.total_estimated_per_person) {
                setEstimation(data);
                setShowSimulation(true);
                showToast(t('budget.toast.estimated', "Stima AI completata!"), "success");
            } else {
                throw new Error("Dati AI incompleti");
            }
        } catch (e) {
            showToast(t('budget.toast.error', "Errore stima: ") + e.message, "error");
        } finally {
            setIsEstimating(false);
        }
    };

    // Calculate analytics
    const stats = useMemo(() => {
        const numPeople = trip.num_people || 1;
        const totalBudget = (trip.budget_per_person || 0) * numPeople;
        const flightCost = Number(trip.transport_cost) || 0;
        const hotelCost = Number(trip.hotel_cost) || 0;

        const realTotal = realExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Find local currency info
        const foreignExpense = realExpenses.find(e => e.currency && e.currency !== 'EUR');
        const localCurrency = foreignExpense ? foreignExpense.currency : null;
        const localRate = foreignExpense ? foreignExpense.exchange_rate : null;

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

        // Add Road Cost (real or simulated) to categoryMap
        const roadCosts_Raw = (estimation && estimation.road_costs_total_per_person) ? Number(estimation.road_costs_total_per_person) : 0;
        if (showSimulation && roadCosts_Raw > 0) {
            categoryMap['Travel_Road'] = (categoryMap['Travel_Road'] || 0) + (roadCosts_Raw * numPeople);
        }

        // Add other AI estimated costs to categories
        if (showSimulation && estimation) {
            const days = (estimation.days_count) ? estimation.days_count : 7; // Backend should ideally return this

            // Map meals
            if (estimation.daily_meal_mid > 0) {
                categoryMap['Food'] = (categoryMap['Food'] || 0) + (estimation.daily_meal_mid * days * numPeople);
            }

            // Map local transport (if not road costs)
            if (estimation.daily_transport > 0) {
                categoryMap['Transport'] = (categoryMap['Transport'] || 0) + (estimation.daily_transport * days * numPeople);
            }
        }

        // --- Category Mapping Helper ---
        const getCategoryInfo = (id) => {
            const map = {
                'Food': { label: t('budget.categories.Food', 'Cibo'), color: '#3b82f6' },
                'Transport': { label: t('budget.categories.Transport', 'Trasporti locali'), color: '#f59e0b' },
                'Travel_Road': { label: t('budget.categories.Travel_Road', 'Carburante/Pedaggi'), color: '#ff6400' },
                'Lodging': { label: t('budget.categories.Lodging', 'Alloggio (Hotel)'), color: '#10b981' },
                'Activity': { label: t('budget.categories.Activity', 'Attività'), color: '#8b5cf6' },
                'Shopping': { label: t('budget.categories.Shopping', 'Shopping'), color: '#ec4899' },
                'Flight': { label: t('budget.categories.Flight', 'Volo'), color: '#0ea5e9' },
                'Train': { label: t('budget.categories.Train', 'Treno'), color: '#0ea5e9' },
                'Road': { label: t('budget.categories.Road', 'Viaggio'), color: '#0ea5e9' },
                'Other': { label: t('budget.categories.Other', 'Altro'), color: '#94a3b8' }
            };

            // Fix label for 'Flight' based on transport_mode
            if (id === 'Flight') {
                if (trip.transport_mode === 'TRAIN') map[id].label = t('budget.categories.Train', 'Treno');
                else if (trip.transport_mode === 'CAR') map[id].label = t('budget.categories.Road', 'Viaggio');
            }

            return map[id] || map['Other'];
        };

        // Separate and calculate final categories
        const finalCategories = Object.entries(categoryMap).map(([id, amount]) => {
            const info = getCategoryInfo(id);
            return {
                id,
                amount: Number(amount),
                label: info.label,
                color: info.color
            };
        });

        // Add Remaining as a category if it's positive
        if (remaining > 0 && totalBudget > 0) {
            finalCategories.push({
                id: 'Remaining',
                amount: remaining,
                label: t('budget.categories.Available', 'Disponibile'),
                color: '#f1f5f9',
                isRemaining: true
            });
        }

        // Add AI simulation as a separate visual item if specifically requested and not in categoryMap already
        const aiCost = appliedAIExpense + simulatedCosts;
        // In reality, appliedAIExpense is already in total if it was saved, 
        // but here it's treated as a local simulation toggle.
        // For simplicity, we trust categoryMap.

        return {
            totalBudget,
            numPeople,
            transportCost: flightCost,
            hotelCost,
            realTotal,
            currentSpent,
            remaining,
            percentUsed,
            categories: finalCategories.sort((a, b) => b.amount - a.amount),
            isOverBudget: remaining < 0,
            simulatedCosts,
            localCurrency,
            localRate
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Budget</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-blue)' }}>€{stats.totalBudget.toFixed(0)}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem', fontWeight: '800', fontSize: '2rem', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('budget.title', 'Analisi Budget')}
            </h2>

            {/* Top Cards: Spent vs Remaining */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid var(--primary-blue)', background: 'var(--bg-card)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>{t('budget.totalSpent', 'Speso Totale')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-blue)' }}>€{stats.currentSpent.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t('budget.initialBudget', { total: stats.totalBudget.toFixed(0) })}</div>
                </div>
                <div className="glass-card" style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    borderBottom: stats.isOverBudget ? '4px solid #ef4444' : '4px solid #10b981',
                    background: 'var(--bg-card)'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {stats.isOverBudget ? t('budget.overBudget', 'Sforamento') : t('budget.remaining', 'Disponibilità')}
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: stats.isOverBudget ? '#ef4444' : '#10b981'
                    }}>
                        €{Math.abs(stats.remaining).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                        {stats.isOverBudget ? t('budget.spentOver', 'Sei andato oltre il budget') : t('budget.spentStill', 'Ancora spendibili')}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Chart & Categories */}
                <div className="glass-card" style={{ padding: '2rem', background: 'var(--bg-card)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>{t('budget.categoriesTitle', 'Suddivisione Spese')}</h3>

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
                            <p>{t('budget.noExpenses', 'Ancora nessuna spesa registrata per mostrare il grafico.')}</p>
                        </div>
                    )}
                </div>

                {/* Right Column: AI Projections & Tips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Progress Bar (Integrated) */}
                    <div className="glass-card" style={{ padding: '2rem', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: '700', fontSize: '1rem', marginRight: '8px' }}>{t('budget.usage', 'Utilizzo Budget')} </span>
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
                            {stats.percentUsed > 80 ? t('budget.usageHigh', 'Attenzione! Hai quasi esaurito il budget prefissato.') :
                                stats.percentUsed > 50 ? t('budget.usageMid', 'Sei a metà del budget. Gestisci bene le prossime spese!') :
                                    t('budget.usageLow', 'Ottimo lavoro, il budget è ancora ampiamente sotto controllo.')}
                        </p>
                    </div>

                    {/* Currency Info Section */}
                    {stats.localCurrency && stats.localCurrency !== 'EUR' && (
                        <div className="glass-card" style={{
                            padding: '2rem',
                            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                            border: '1px solid #dbeafe'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {t('budget.currencyFocus', { currency: stats.localCurrency })}
                            </h3>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('budget.avgRate', 'Tasso medio applicato')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e40af' }}>
                                    1 EUR = {stats.localRate?.toFixed(2)} {stats.localCurrency}
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                                    {stats.isOverBudget ? t('budget.overBudget', 'Sforamento') : t('budget.remaining', 'Disponibilità')} in valuta locale
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: stats.isOverBudget ? '#ef4444' : '#10b981' }}>
                                    {(Math.abs(stats.remaining) * stats.localRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} {stats.localCurrency}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Estimation Section */}
                    <div className="glass-card" style={{ padding: '2rem', border: '1px dashed var(--primary-blue)', background: 'var(--bg-card)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {t('budget.aiSimulation', 'Simulazione AI')}
                        </h3>
                        {!estimation ? (
                            <>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
                                    {t('budget.aiSimulationDesc', { destination: trip.destination })}
                                </p>
                                <button
                                    onClick={handleEstimate}
                                    disabled={isEstimating}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', padding: '0.8rem' }}
                                >
                                    {isEstimating ? t('budget.calculatingBtn', 'Analizzando...') : t('budget.calculateBtn', 'Calcola Proiezione')}
                                </button>
                            </>
                        ) : (
                            <div className="animate-in">
                                <div style={{ background: 'var(--bg-soft-gray)', padding: '1rem', borderRadius: '16px', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem' }}>{t('budget.localEst', 'Stima locale / pers:')}</span>
                                        <span style={{ fontWeight: '800', color: 'var(--primary-blue)' }}>€{estimation.total_estimated_per_person}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                        "{estimation.advice}"
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleApplyAsExpense} className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }}>{t('budget.applyBtn', 'Applica')}</button>
                                    <button onClick={() => { setEstimation(null); setShowSimulation(false); }} className="btn btn-secondary" style={{ flex: 0.5, fontSize: '0.8rem' }}>{t('budget.closeBtn', 'Chiudi')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .glass-card {
                    background: var(--bg-card);
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
