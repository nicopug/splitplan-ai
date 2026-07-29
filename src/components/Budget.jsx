import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateBudget, updateTrip, getExpenses, exportNotaSpese, addExpense, getParticipants } from '../api';
import { useToast } from '../context/ToastContext';
import { Sparkles, Download, Calculator, TrendingDown, Clock, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { useModal } from '../context/ModalContext';
import ReceiptScanner from './ReceiptScanner';

const CATEGORIE_SPESA = [
    { id: 'Food', label: 'Cibo & Drink', icon: '🍕' },
    { id: 'Transport', label: 'Movimenti Locali', icon: '🚌' },
    { id: 'Travel_Road', label: 'Auto/Pedaggi', icon: '🚗' },
    { id: 'Lodging', label: 'Alloggio', icon: '🏨' },
    { id: 'Activity', label: 'Attività', icon: '🎡' },
    { id: 'Shopping', label: 'Shopping', icon: '🛍️' },
    { id: 'Other', label: 'Altro', icon: '📦' },
];

const VALUTE = [
    { code: 'EUR', symbol: '€' },
    { code: 'USD', symbol: '$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'GBP', symbol: '£' },
    { code: 'CHF', symbol: 'CHF' },
    { code: 'AED', symbol: 'د.إ' },
];

// NB: nessun return anticipato prima degli hook. `if (!trip) return null` stava
// sopra le useState/useEffect/useMemo: al primo render con trip valorizzato
// React trovava piu' hook del render precedente e l'app andava in pagina bianca
// con "Rendered more hooks than during the previous render".
const Budget = ({ trip, onUpdate }) => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { showConfirm } = useModal();
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimation, setEstimation] = useState(null);
    const [showSimulation, setShowSimulation] = useState(false);
    const [realExpenses, setRealExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);
    const [isExporting, setIsExporting] = useState(false); // Stato per il download CSV

    // Inserimento manuale di una spesa. Prima esisteva solo lo scanner di
    // ricevute: quando l'OCR falliva, il messaggio d'errore diceva "inserisci la
    // spesa a mano" ma non c'era alcun modo di farlo. Il form viveva in
    // Finance.jsx, importato ma mai renderizzato da nessuna parte.
    const [mostraForm, setMostraForm] = useState(false);
    const [partecipanti, setPartecipanti] = useState([]);
    const [salvataggio, setSalvataggio] = useState(false);
    const [nuovaSpesa, setNuovaSpesa] = useState({
        title: '', amount: '', currency: 'EUR', category: 'Food', payer_id: '',
    });

    // AI Forecast inclusion
    const [appliedEstimation, setAppliedEstimation] = useState(null);

    const handleExportNotaSpese = async () => {
        setIsExporting(true);
        try {
            await exportNotaSpese(trip.id);
            showToast("Nota Spese PDF generata!", "success");
        } catch (error) {
            console.error(error);
            showToast("Impossibile generare il PDF: " + error.message, "error");
        } finally {
            setIsExporting(false);
        }
    };

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

    // I partecipanti servono a scegliere chi ha pagato
    useEffect(() => {
        if (!trip?.id) return;
        let annullato = false;
        getParticipants(trip.id)
            .then(elenco => {
                if (annullato) return;
                setPartecipanti(elenco || []);
                // Preseleziona il primo, cosi' il campo non parte vuoto
                setNuovaSpesa(prec => prec.payer_id || !elenco?.length
                    ? prec
                    : { ...prec, payer_id: String(elenco[0].id) });
            })
            .catch(() => { /* il form resta usabile, la select sara' vuota */ });
        return () => { annullato = true; };
    }, [trip?.id]);

    const handleAggiungiSpesa = async (e) => {
        e.preventDefault();
        if (salvataggio) return;   // niente doppio invio

        const importo = parseFloat(nuovaSpesa.amount);
        if (!Number.isFinite(importo) || importo <= 0) {
            showToast("Inserisci un importo valido maggiore di zero.", "error");
            return;
        }
        if (!nuovaSpesa.payer_id) {
            showToast("Seleziona chi ha pagato.", "error");
            return;
        }

        setSalvataggio(true);
        try {
            const creata = await addExpense({
                trip_id: trip.id,
                title: nuovaSpesa.title,
                amount: importo,
                currency: nuovaSpesa.currency,
                category: nuovaSpesa.category,
                payer_id: parseInt(nuovaSpesa.payer_id, 10),
            });
            setRealExpenses(prec => [...prec, creata]);
            setNuovaSpesa(prec => ({ ...prec, title: '', amount: '' }));
            setMostraForm(false);
            showToast("Spesa aggiunta.", "success");
            if (onUpdate) onUpdate();
        } catch (error) {
            showToast("Impossibile salvare la spesa: " + error.message, "error");
        } finally {
            setSalvataggio(false);
        }
    };

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
        if (!trip) return null;   // il render viene comunque interrotto piu' sotto
        const numPeople = trip.num_people || 1;
        const totalBudgetMin = Number(trip.budget) || 0;
        const totalBudgetMax = Number(trip.budget_max) || 0;
        const referenceBudget = totalBudgetMax || totalBudgetMin;
        const flightCost = Number(trip.transport_cost) || 0;
        const hotelCost = Number(trip.hotel_cost) || 0;

        // Number(...) || 0: un importo null dal backend faceva diventare NaN
        // l'intero totale, e da li' in poi ogni cifra a schermo era "NaN".
        const realTotal = realExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

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
            acc[cat] = (acc[cat] || 0) + (Number(exp.amount) || 0);
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

        const remaining = referenceBudget - (showSimulation ? totalSpentWithSim : currentSpent);
        const percentUsed = referenceBudget > 0 ? Math.min(((showSimulation ? totalSpentWithSim : currentSpent) / referenceBudget) * 100, 100) : 0;

        const targetZoneStart = totalBudgetMax > 0 ? (totalBudgetMin / totalBudgetMax) * 100 : 100;

        // --- Add AI costs to categoryMap (Applied or Simulation) ---
        const activeEst = showSimulation ? estimation : appliedEstimation;
        if (activeEst) {
            const days = activeEst.days_count || tripDays;
            if (activeEst.daily_meal_mid > 0) {
                categoryMap['Food'] = (categoryMap['Food'] || 0) + (activeEst.daily_meal_mid * days * numPeople);
            }
            if (activeEst.daily_transport > 0) {
                categoryMap['Transport'] = (categoryMap['Transport'] || 0) + (activeEst.daily_transport * days * numPeople);
            }
            const roadCosts = Number(activeEst.road_costs_total_per_person) || 0;
            if (roadCosts > 0) {
                categoryMap['Travel_Road'] = (categoryMap['Travel_Road'] || 0) + (roadCosts * numPeople);
            }
        }

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
            return { id, amount: Number(amount), label: info.label, color: info.color };
        });

        if (remaining > 0 && totalBudgetMin > 0) {
            finalCategories.push({
                id: 'Remaining',
                amount: remaining,
                label: t('budget.categories.Available', 'Disponibile'),
                color: 'var(--border-subtle)',
                isRemaining: true
            });
        }

        const foreignExpense = realExpenses.find(e => e.currency && e.currency !== 'EUR');
        return {
            totalBudget: totalBudgetMin,
            totalBudgetMax: totalBudgetMax,
            referenceBudget,
            numPeople,
            transportCost: flightCost,
            hotelCost,
            realTotal,
            currentSpent,
            remaining,
            percentUsed,
            targetZoneStart,
            categories: finalCategories.sort((a, b) => b.amount - a.amount),
            isOverBudget: remaining < 0,
            simulatedCosts,
            appliedEstimation,
            localCurrency: foreignExpense ? foreignExpense.currency : null,
            localRate: foreignExpense ? foreignExpense.exchange_rate : null
        };
    }, [trip, realExpenses, appliedEstimation, showSimulation, estimation, t]);


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
                    <span className="text-xl font-black text-primary">
                        €{stats.totalBudgetMax > 0 ? stats.totalBudgetMax.toFixed(0) : stats.totalBudget.toFixed(0)}
                    </span>
                </div>
            </div>
        );
    };

    if (!trip || !stats) return null;

    return (
        <div className="container py-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <span className="subtle-heading">{t('budget.analytics', 'Analytics')}</span>
                    <h2 className="text-primary text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                        {t('budget.title', 'Analisi Budget')}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMostraForm(v => !v)}
                        className="h-12 px-6 bg-[var(--accent-primary)] text-white font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus size={14} />
                        {mostraForm ? 'Annulla' : 'Aggiungi spesa'}
                    </button>
                    <ReceiptScanner
                        tripId={trip.id}
                        onSuccess={(newExpense) => setRealExpenses(prev => [...prev, newExpense])}
                    />
                    <button
                        onClick={handleExportNotaSpese}
                        disabled={isExporting || realExpenses.length === 0}
                        className="h-12 px-6 border border-border-strong text-primary font-black uppercase text-[10px] tracking-widest hover:bg-surface transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        <Download size={14} className={isExporting ? "animate-bounce" : ""} />
                        {isExporting ? "Generando PDF..." : "Esporta per Contabilità"}
                    </button>
                </div>
            </div>

            {mostraForm && (
                <form onSubmit={handleAggiungiSpesa} className="premium-card !p-8 space-y-6 bg-surface">
                    <div className="space-y-2">
                        <label htmlFor="spesa-titolo" className="text-[10px] font-bold uppercase tracking-widest text-muted">Cosa</label>
                        <input
                            id="spesa-titolo"
                            value={nuovaSpesa.title}
                            onChange={e => setNuovaSpesa(p => ({ ...p, title: e.target.value }))}
                            required
                            placeholder="es. Cena con il cliente"
                            className="w-full h-14 bg-[var(--bg-base)] border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="spesa-importo" className="text-[10px] font-bold uppercase tracking-widest text-muted">Importo</label>
                            <input
                                id="spesa-importo"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={nuovaSpesa.amount}
                                onChange={e => setNuovaSpesa(p => ({ ...p, amount: e.target.value }))}
                                required
                                placeholder="0.00"
                                className="w-full h-14 bg-[var(--bg-base)] border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="spesa-valuta" className="text-[10px] font-bold uppercase tracking-widest text-muted">Valuta</label>
                            <select
                                id="spesa-valuta"
                                value={nuovaSpesa.currency}
                                onChange={e => setNuovaSpesa(p => ({ ...p, currency: e.target.value }))}
                                className="w-full h-14 bg-[var(--bg-base)] border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all"
                            >
                                {VALUTE.map(v => (
                                    <option key={v.code} value={v.code}>{v.symbol} {v.code}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="spesa-pagante" className="text-[10px] font-bold uppercase tracking-widest text-muted">Chi ha pagato</label>
                            <select
                                id="spesa-pagante"
                                value={nuovaSpesa.payer_id}
                                onChange={e => setNuovaSpesa(p => ({ ...p, payer_id: e.target.value }))}
                                required
                                className="w-full h-14 bg-[var(--bg-base)] border border-border-subtle rounded-sm px-4 text-primary focus:border-primary outline-none transition-all"
                            >
                                <option value="" disabled>Seleziona…</option>
                                {partecipanti.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted block">Categoria</span>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {CATEGORIE_SPESA.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    aria-pressed={nuovaSpesa.category === cat.id}
                                    onClick={() => setNuovaSpesa(p => ({ ...p, category: cat.id }))}
                                    className={cn(
                                        "p-3 rounded-sm border transition-all flex flex-col items-center gap-1",
                                        nuovaSpesa.category === cat.id
                                            ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]"
                                            : "bg-[var(--bg-base)] border-border-subtle text-muted hover:border-border-strong hover:text-primary"
                                    )}
                                >
                                    <span className="text-lg">{cat.icon}</span>
                                    <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-tight">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={salvataggio}
                        className="w-full h-14 bg-[var(--accent-primary)] text-white font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {salvataggio ? 'Salvataggio…' : 'Salva spesa'}
                    </button>
                </form>
            )}

            {/* Top Cards: Spent vs Remaining */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card !p-10 flex flex-col items-center justify-center space-y-2 border-b-2 border-primary-blue/30 bg-surface">
                    <span className="subtle-heading !mb-0">{t('budget.totalSpent', 'Speso Totale')}</span>
                    <div className="text-5xl font-black text-primary">€{stats.currentSpent.toFixed(2)}</div>
                    <div className="text-muted text-xs font-medium uppercase tracking-widest text-center">
                        {stats.totalBudgetMax > 0 ? (
                            <span>{t('budget.rangeBudget', 'Budget')}: €{stats.totalBudget.toFixed(0)} - €{stats.totalBudgetMax.toFixed(0)}</span>
                        ) : (
                            <span>{t('budget.initialBudget', { total: stats.totalBudget.toFixed(0) })}</span>
                        )}
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
                        <div className="h-4 bg-muted/20 rounded-full overflow-hidden border border-border-subtle relative">
                            {/* Target Zone Background */}
                            {stats.totalBudgetMax > 0 && (
                                <div
                                    className="absolute h-full bg-green-500/10 border-x border-green-500/20"
                                    style={{
                                        left: `${stats.targetZoneStart}%`,
                                        width: `${100 - stats.targetZoneStart}%`
                                    }}
                                />
                            )}
                            {/* Progress Bar */}
                            <div
                                className={cn(
                                    "h-full transition-all duration-1000 ease-out relative z-10",
                                    stats.isOverBudget ? "bg-red-500" : (stats.percentUsed >= stats.targetZoneStart ? "bg-green-500" : "bg-primary-blue")
                                )}
                                style={{ width: `${stats.percentUsed}%` }}
                            />
                        </div>
                        {stats.totalBudgetMax > 0 && (
                            <div className="flex justify-between text-[10px] uppercase tracking-tighter font-black text-muted px-1">
                                <span>0</span>
                                <span style={{ marginRight: `${100 - stats.targetZoneStart}%` }}>Min: €{stats.totalBudget.toFixed(0)}</span>
                                <span>Max: €{stats.totalBudgetMax.toFixed(0)}</span>
                            </div>
                        )}
                        <p className="text-muted text-xs font-medium leading-relaxed italic">
                            {stats.percentUsed > 80 ? t('budget.usageHigh', 'Attenzione! Hai quasi esaurito il budget.') :
                                stats.percentUsed > 50 ? t('budget.usageMid', 'Sei a metà del budget. Gestisci bene le prossime spese!') :
                                    t('budget.usageLow', 'Ottimo lavoro, il budget è ancora sotto controllo.')}
                        </p>
                    </div>

                    {/* AI Forecast Section */}
                    {(() => {
                        const status = estimation?.budget_status ?? 'ON_TRACK';
                        const statusStyles = {
                            ON_TRACK: { border: 'border-green-500/30',  bg: 'bg-green-500/5',  badge: 'bg-green-500/10 text-green-400',  label: 'NEL BUDGET'  },
                            WARNING:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  badge: 'bg-amber-500/10 text-amber-400',  label: 'ATTENZIONE'  },
                            CRITICAL: { border: 'border-red-500/30',    bg: 'bg-red-500/5',    badge: 'bg-red-500/10 text-red-400',      label: 'CRITICO'     },
                        };
                        const s = statusStyles[status] ?? statusStyles.ON_TRACK;
                        return (
                            <div className={cn('premium-card !p-8 space-y-6 border transition-colors', estimation ? s.border : 'border-primary-blue/20', estimation ? s.bg : 'bg-primary-blue/5')}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-accent-primary text-base flex items-center justify-center font-bold rounded-sm">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="subtle-heading !mb-0 !text-primary-blue/60">{t('budget.aiSimulation', 'Simulazione AI')}</span>
                                            <h4 className="text-primary text-lg font-semibold uppercase tracking-tight">SplitPlan Forecast</h4>
                                        </div>
                                    </div>
                                    {estimation && (
                                        <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm', s.badge)}>
                                            {s.label}
                                        </span>
                                    )}
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
                                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                                    <div className="space-y-5 animate-fade-in">
                                        {/* KPI row */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-muted/20 border border-border-subtle rounded-sm space-y-1">
                                                <span className="text-[9px] uppercase tracking-widest text-muted font-bold block">Per persona</span>
                                                <span className="text-xl font-black text-primary-blue">€{estimation.total_estimated_per_person}</span>
                                            </div>
                                            <div className="p-4 bg-muted/20 border border-border-subtle rounded-sm space-y-1">
                                                <span className="text-[9px] uppercase tracking-widest text-muted font-bold block">Totale proiettato</span>
                                                <span className="text-xl font-black text-primary">€{estimation.projected_total?.toFixed(2) ?? '—'}</span>
                                            </div>
                                        </div>

                                        {/* Confidence bar */}
                                        {estimation.confidence_score != null && (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted">
                                                    <span>Affidabilità AI</span>
                                                    <span>{estimation.confidence_score}%</span>
                                                </div>
                                                <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-blue transition-all duration-700"
                                                        style={{ width: `${estimation.confidence_score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Savings advice */}
                                        {estimation.savings_advice?.length > 0 && (
                                            <div className="space-y-2 border-t border-border-subtle pt-4">
                                                <span className="text-[9px] uppercase tracking-widest text-muted font-black block">Consigli per risparmiare</span>
                                                <ul className="space-y-1.5">
                                                    {estimation.savings_advice.slice(0, 3).map((tip, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                                                            <span className="text-primary-blue font-black flex-shrink-0 mt-0.5">→</span>
                                                            {tip}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-1">
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
                        );
                    })()}

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

            {/* ── Ultime Spese ─────────────────────────────────────────────────── */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <span className="subtle-heading !mb-0 text-[8px] opacity-50">Registro</span>
                        <h3 className="text-primary text-xl font-semibold uppercase tracking-tight">
                            Ultime Spese
                        </h3>
                    </div>
                    {realExpenses.length > 0 && (
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                            {realExpenses.length} {realExpenses.length === 1 ? 'voce' : 'voci'} registrate
                        </span>
                    )}
                </div>

                {realExpenses.length === 0 ? (
                    <div className="premium-card !p-12 text-center space-y-4 opacity-30 bg-card">
                        <div className="text-4xl">🧾</div>
                        <p className="text-xs uppercase tracking-widest font-bold">
                            Nessuna spesa registrata. Scansiona una ricevuta per iniziare.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...realExpenses].reverse().map((exp, idx) => {
                            const emoji = {
                                FOOD: '🍕', Food: '🍕',
                                TRANSPORT: '🚌', Transport: '🚌', Travel_Road: '🚗',
                                ACCOMMODATION: '🏨', Lodging: '🏨',
                                Activity: '🎡', Shopping: '🛍️',
                                OTHER: '📦', Other: '📦',
                            }[exp.category] ?? '💸';

                            const dateStr = exp.date
                                ? new Date(exp.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                                : '—';

                            return (
                                <div
                                    key={exp.id ?? idx}
                                    className="premium-card !p-5 flex items-center justify-between group hover:border-primary-blue/30 transition-all bg-card animate-fade-in"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-11 h-11 bg-surface border border-border-subtle rounded-sm flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110">
                                            {emoji}
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-bold text-primary tracking-tight leading-none">
                                                {exp.description || exp.title || '—'}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold tracking-widest text-muted">
                                                {exp.category} · {dateStr}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-0.5 flex-shrink-0">
                                        <div className="text-xl font-black text-primary">
                                            €{exp.amount.toFixed(2)}
                                        </div>
                                        {exp.currency && exp.currency !== 'EUR' && (
                                            <div className="text-[10px] font-bold text-muted uppercase tracking-tighter">
                                                {exp.original_amount?.toLocaleString()} {exp.currency}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Budget;
