import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateBudget, updateTrip, getExpenses } from '../api';
import { useToast } from '../context/ToastContext';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

import { useModal } from '../context/ModalContext';

const Budget = ({ trip, onUpdate }) => {
    if (!trip) return null;
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimation, setEstimation] = useState(null);
    const [showSimulation, setShowSimulation] = useState(false);
    const [realExpenses, setRealExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);

    // AI Forecast inclusion
    const [appliedEstimation, setAppliedEstimation] = useState(null);

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
        const totalAmount = Number(estimation.total_estimated_per_person) * (trip.num_people || 1);
        const confirmed = await showConfirm(
            t('budget.confirmApply', "Conferma Spesa Prevista"),
            t('budget.confirmApplyDesc', { amount: totalAmount.toFixed(2) })
        );
        if (confirmed) {
            setAppliedEstimation(estimation);
            setEstimation(null);
            setShowSimulation(false);
            showToast(t('budget.toast.applied', "Proiezione aggiornata!"), "success");
        }
    };

    const handleRemoveAI = useCallback(() => {
        setAppliedEstimation(null);
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

        // Calculate days for AI mapping
        let tripDays = 1;
        if (trip.start_date && trip.end_date) {
            const start = new Date(trip.start_date);
            const end = new Date(trip.end_date);
            const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            tripDays = Math.max(diff, 1);
        }

        // Group by category for chart
        const categoryMap = realExpenses.reduce((acc, exp) => {
            const cat = exp.category || 'Other';
            acc[cat] = (acc[cat] || 0) + exp.amount;
            return acc;
        }, {});

        // Add fixed categories if they have costs
        if (flightCost > 0) categoryMap['Flight'] = (categoryMap['Flight'] || 0) + flightCost;
        if (hotelCost > 0) categoryMap['Lodging'] = (categoryMap['Lodging'] || 0) + hotelCost;

        const appliedTotal = appliedEstimation ? (Number(appliedEstimation.total_estimated_per_person) * numPeople) : 0;
        const currentSpent = flightCost + hotelCost + appliedTotal + realTotal;
        
        const estPerPerson = (estimation && estimation.total_estimated_per_person) ? Number(estimation.total_estimated_per_person) : 0;
        const simulatedCosts = (showSimulation && estimation) ? (estPerPerson * numPeople) : 0;
        
        const totalSpentWithSim = currentSpent + simulatedCosts;

        const remaining = totalBudget - (showSimulation ? totalSpentWithSim : currentSpent);
        const percentUsed = totalBudget > 0 ? Math.min(((showSimulation ? totalSpentWithSim : currentSpent) / totalBudget) * 100, 100) : 0;

        // --- Add AI costs to categoryMap (Applied or Simulation) ---
        // Prioritize Simulation if active, otherwise use Applied
        const activeEst = showSimulation ? estimation : appliedEstimation;
        if (activeEst) {
            const days = activeEst.days_count || tripDays;

            // Map meals
            if (activeEst.daily_meal_mid > 0) {
                categoryMap['Food'] = (categoryMap['Food'] || 0) + (activeEst.daily_meal_mid * days * numPeople);
            }

            // Map local transport
            if (activeEst.daily_transport > 0) {
                categoryMap['Transport'] = (categoryMap['Transport'] || 0) + (activeEst.daily_transport * days * numPeople);
            }

            // Map road costs
            const roadCosts = Number(activeEst.road_costs_total_per_person) || 0;
            if (roadCosts > 0) {
                categoryMap['Travel_Road'] = (categoryMap['Travel_Road'] || 0) + (roadCosts * numPeople);
            }
        }

        // --- Category Mapping Helper ---
        const getCategoryInfo = (id) => {
            const map = {
                'Food': { label: t('budget.categories.Food', 'Cibo'), color: 'var(--accent-digital-blue-light)' },
                'Transport': { label: t('budget.categories.Transport', 'Trasporti locali'), color: '#f59e0b' },
                'Travel_Road': { label: t('budget.categories.Travel_Road', 'Carburante/Pedaggi'), color: '#ff6400' },
                'Lodging': { label: t('budget.categories.Lodging', 'Alloggio (Hotel)'), color: 'var(--accent-green)' },
                'Activity': { label: t('budget.categories.Activity', 'Attività'), color: 'var(--accent-digital-blue)' },
                'Shopping': { label: t('budget.categories.Shopping', 'Shopping'), color: '#ec4899' },
                'Flight': { label: t('budget.categories.Flight', 'Volo'), color: 'var(--accent-digital-blue)' },
                'Train': { label: t('budget.categories.Train', 'Treno'), color: 'var(--accent-digital-blue)' },
                'Road': { label: t('budget.categories.Road', 'Viaggio'), color: 'var(--accent-digital-blue)' },
                'Other': { label: t('budget.categories.Other', 'Altro'), color: 'var(--text-muted)' }
            };

            if (id === 'Flight') {
                if (trip.transport_mode === 'TRAIN') map[id].label = t('budget.categories.Train', 'Treno');
                else if (trip.transport_mode === 'CAR') map[id].label = t('budget.categories.Road', 'Viaggio');
            }

            return map[id] || map['Other'];
        };

        const finalCategories = Object.entries(categoryMap).map(([id, amount]) => {
            const info = getCategoryInfo(id);
            return {
                id,
                amount: Number(amount),
                label: info.label,
                color: info.color
            };
        });

        if (remaining > 0 && totalBudget > 0) {
            finalCategories.push({
                id: 'Remaining',
                amount: remaining,
                label: t('budget.categories.Available', 'Disponibile'),
                color: 'var(--border-subtle)',
                isRemaining: true
            });
        }

        // Find local currency info
        const foreignExpense = realExpenses.find(e => e.currency && e.currency !== 'EUR');
        const localCurrency = foreignExpense ? foreignExpense.currency : null;
        const localRate = foreignExpense ? foreignExpense.exchange_rate : null;

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
            appliedEstimation,
            localCurrency,
            localRate
        };
    }, [trip, realExpenses, appliedEstimation, showSimulation, estimation, t]);


    // Custom Donut Chart Component
    const DonutChart = ({ data }) => {
        if (!data || !Array.isArray(data)) return null;
        const total = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        if (total === 0) return null;

        const radius = 70;
        const strokeWidth = 20;
        const center = 100;
        const circumference = 2 * Math.PI * radius;

        return (
            <div className="relative w-48 h-48 mx-auto">
                <svg viewBox="0 0 200 200" className="rotate-[-90deg]">
                    {data.map((item, i) => {
                        const itemAmount = item.amount || 0;
                        const percentage = (itemAmount / total) * 100;
                        const dashArray = (percentage * circumference) / 100;
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
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="subtle-heading !mb-0 text-[8px]">{t('budget.categories.Budget', 'Budget')}</span>
                    <span className="text-xl font-black text-primary">€{stats.totalBudget.toFixed(0)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="container py-12 space-y-12">
            <div className="space-y-4">
                <span className="subtle-heading">{t('budget.analytics', 'Analytics')}</span>
                <h2 className="text-primary text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                    {t('budget.title', 'Analisi Budget')}
                </h2>
            </div>

            {/* Top Cards: Spent vs Remaining */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card !p-10 flex flex-col items-center justify-center space-y-2 border-b-2 border-primary-blue/30 bg-surface">
                    <span className="subtle-heading !mb-0">{t('budget.totalSpent', 'Speso Totale')}</span>
                    <div className="text-5xl font-black text-primary">€{stats.currentSpent.toFixed(2)}</div>
                    <div className="text-muted text-xs font-medium uppercase tracking-widest">
                        {t('budget.initialBudget', { total: stats.totalBudget.toFixed(0) })}
                    </div>
                </div>

                <div className={cn(
                    "premium-card !p-10 flex flex-col items-center justify-center space-y-2 border-b-2 bg-surface",
                    stats.isOverBudget ? "border-red-500/30" : "border-green-500/30"
                )}>
                    <span className="subtle-heading !mb-0">
                        {stats.isOverBudget ? t('budget.overBudget', 'Sforamento') : t('budget.remaining', 'Disponibilità')}
                    </span>
                    <div className={cn(
                        "text-5xl font-black",
                        stats.isOverBudget ? "text-red-500" : "text-green-500"
                    )}>
                        €{Math.abs(stats.remaining).toFixed(2)}
                    </div>
                    <div className="text-muted text-xs font-medium uppercase tracking-widest">
                        {stats.isOverBudget ? t('budget.spentOver', 'Sei andato oltre il budget') : t('budget.spentStill', 'Ancora spendibili')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Chart & Categories */}
                <div className="lg:col-span-5 premium-card space-y-8 bg-card">
                    <div className="space-y-2">
                        <span className="subtle-heading !mb-0 text-[8px] opacity-50">{t('budget.distribution', 'Distribuzione')}</span>
                        <h3 className="text-primary text-xl font-semibold uppercase tracking-tight">
                            {t('budget.categoriesTitle', 'Suddivisione Spese')}
                        </h3>
                    </div>

                    {stats.categories.length > 0 ? (
                        <div className="space-y-10">
                            <DonutChart data={stats.categories} />
                            <div className="space-y-4">
                                {stats.categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2.5 h-2.5 rounded-sm"
                                                style={{
                                                    background: cat.color,
                                                    border: cat.isRemaining ? '1px dashed rgba(255,255,255,0.2)' : 'none'
                                                }}
                                            />
                                            <span className={cn(
                                                "text-xs font-bold uppercase tracking-wider transition-colors",
                                                cat.isRemaining ? "text-gray-600" : "text-gray-400 group-hover:text-white"
                                            )}>
                                                {cat.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-sm font-black transition-colors",
                                                cat.isRemaining ? "text-muted" : "text-primary"
                                            )}>
                                                €{cat.amount.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] font-bold text-subtle w-8 text-right">
                                                {(stats.totalBudget > 0 ? (cat.amount / stats.totalBudget) * 100 : 0).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 space-y-4 opacity-30">
                            <div className="text-4xl">🤔</div>
                            <p className="text-xs uppercase tracking-widest font-bold">
                                {t('budget.noExpenses', 'Nessuna spesa registrata.')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Column: AI Projections & Tips */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Progress Bar */}
                    <div className="premium-card !p-8 space-y-6 bg-card">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="subtle-heading !mb-0">{t('budget.usage', 'Utilizzo Budget')}</span>
                                <h4 className="text-primary text-lg font-semibold uppercase tracking-tight">Status</h4>
                            </div>
                            <span className="text-3xl font-black text-primary-blue">{stats.percentUsed.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden border border-border-subtle">
                            <div
                                className="h-full bg-primary-blue transition-all duration-1000 ease-out"
                                style={{ width: `${stats.percentUsed}%` }}
                            />
                        </div>
                        <p className="text-muted text-xs font-medium leading-relaxed italic">
                            {stats.percentUsed > 80 ? t('budget.usageHigh', 'Attenzione! Hai quasi esaurito il budget.') :
                                stats.percentUsed > 50 ? t('budget.usageMid', 'Sei a metà del budget. Gestisci bene le prossime spese!') :
                                    t('budget.usageLow', 'Ottimo lavoro, il budget è ancora sotto controllo.')}
                        </p>
                    </div>

                    {/* AI Estimation Section */}
                    <div className="premium-card !p-8 space-y-6 border border-primary-blue/20 bg-primary-blue/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent-primary text-base flex items-center justify-center font-bold rounded-sm">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <span className="subtle-heading !mb-0 !text-primary-blue/60">{t('budget.aiSimulation', 'Simulazione AI')}</span>
                                <h4 className="text-primary text-lg font-semibold uppercase tracking-tight">SplitPlan Forecast</h4>
                            </div>
                        </div>

                        {!estimation ? (
                            <div className="space-y-6">
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t('budget.aiSimulationDesc', { destination: trip.destination })}
                                </p>
                                <button
                                    onClick={handleEstimate}
                                    disabled={isEstimating}
                                    className="w-full h-14 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isEstimating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                            {t('budget.calculatingBtn', 'Analizzando...')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            {t('budget.calculateBtn', 'Calcola Proiezione')}
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="p-6 bg-muted/30 border border-border-subtle rounded-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs uppercase tracking-widest text-muted font-bold">{t('budget.localEst', 'Stima locale / pers:')}</span>
                                        <span className="text-xl font-black text-primary-blue">€{estimation.total_estimated_per_person}</span>
                                    </div>
                                    <p className="text-muted text-xs leading-relaxed italic border-t border-border-subtle pt-4">
                                        "{estimation.advice}"
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleApplyAsExpense}
                                        className="flex-1 h-12 bg-primary-blue text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-blue-light transition-colors"
                                    >
                                        {t('budget.applyBtn', 'Applica')}
                                    </button>
                                    <button
                                        onClick={() => { setEstimation(null); setShowSimulation(false); }}
                                        className="px-6 h-12 bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors"
                                    >
                                        {t('budget.closeBtn', 'Chiudi')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Currency Info Section */}
                    {stats.localCurrency && stats.localCurrency !== 'EUR' && (
                        <div className="premium-card !p-8 animate-fade-in space-y-6 bg-card">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="subtle-heading !mb-0">{t('budget.currencyFocus', { currency: stats.localCurrency })}</span>
                                    <h4 className="text-primary text-lg font-semibold uppercase tracking-tight">Forex Info</h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{t('budget.avgRate', 'Tasso medio')}</div>
                                    <div className="text-lg font-black text-primary">1 EUR = {stats.localRate?.toFixed(2)} {stats.localCurrency}</div>
                                </div>
                            </div>

                            <div className="p-6 bg-surface border border-border-subtle rounded-sm flex justify-between items-center">
                                <span className="text-xs uppercase tracking-widest text-muted font-bold">
                                    {stats.isOverBudget ? t('budget.overBudget', 'Sforamento') : t('budget.remaining', 'Disponibilità')}
                                </span>
                                <div className={cn(
                                    "text-2xl font-black",
                                    stats.isOverBudget ? "text-red-500" : "text-green-500"
                                )}>
                                    {(Math.abs(stats.remaining) * stats.localRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} {stats.localCurrency}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Budget;
