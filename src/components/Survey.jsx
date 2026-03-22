import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateSurveyBudget } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    MapPin,
    Plane,
    Users,
    Wallet,
    ArrowLeft,
    Sparkles,
    Briefcase,
    TreePalm,
    Train,
    Car
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
const ProgressIndicator = ({ step, totalSteps, t }) => (
    <div className="w-full max-w-4xl mx-auto mb-12 px-4">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                {t('survey.progress', { current: step + 1, total: totalSteps, defaultValue: `Step ${step + 1} di ${totalSteps}` })}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {Math.round(((step + 1) / totalSteps) * 100)}%
            </span>
        </div>
        <div className="h-1.5 w-full bg-surface border border-border-subtle rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
            />
        </div>
    </div>
);

const StepWrapper = ({ title, subtitle, children, onNext, onBack, showSkip, isLast, step, totalSteps, t, isGenerating }) => (
    <div className="section py-12 animate-fade-in min-h-[70vh] flex flex-col justify-center">
        <div className="container max-w-4xl text-left space-y-12">
            <div className="space-y-4">
                <ProgressIndicator step={step} totalSteps={totalSteps} t={t} />
                <h2 className="text-primary text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">
                    {title}
                </h2>
                {subtitle && <p className="text-muted text-lg font-medium">{subtitle}</p>}
            </div>

            <div className="space-y-10">
                {children}

                <div className="flex flex-wrap items-center gap-4 pt-8">
                    {onBack && (
                        <Button variant="ghost" onClick={onBack} className="text-muted hover:text-primary font-black uppercase text-[10px] tracking-widest px-0 mr-4">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Indietro')}
                        </Button>
                    )}

                    <Button
                        onClick={onNext}
                        disabled={isGenerating}
                        size="lg"
                        className="px-10 py-4 h-auto font-black uppercase tracking-widest text-xs group relative overflow-hidden active:scale-95 transition-all shadow-xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-2">
                            {isLast ? (isGenerating ? '...' : <Sparkles className="w-4 h-4" />) : null}
                            {isLast ? (isGenerating ? t('common.generating', 'Generazione...') : t('survey.generate', 'Scopri il tuo viaggio')) : t('common.next', 'Avanti')}
                        </span>
                    </Button>

                    {showSkip && (
                        <Button variant="outline" onClick={onNext} className="text-muted hover:text-primary font-black uppercase text-[10px] tracking-widest ml-4">
                            {t('common.skip', 'Salta')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const Survey = ({ trip, onComplete, isGenerating }) => {
    const { t, i18n } = useTranslation();
    const isGroup = trip.trip_type === 'GROUP';

    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        destination: '',
        departure_airport: '',
        budget: '',
        budget_max: '',
        num_people: isGroup ? 2 : 1,
        start_date: '',
        end_date: '',
        must_have: '',
        must_avoid: '',
        participant_names: [],
        transport_mode: 'FLIGHT',
        trip_intent: 'LEISURE',
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days: 'Monday,Tuesday,Wednesday,Thursday,Friday'
    });

    const [suggestedBudget, setSuggestedBudget] = useState(null);
    const [isEstimatingBudget, setIsEstimatingBudget] = useState(false);



    useEffect(() => {
        if (trip) {
            setFormData(prev => ({
                ...prev,
                destination: trip.destination || prev.destination,
                departure_airport: trip.departure_airport || prev.departure_airport,
                budget: trip.budget || (trip.budget_per_person * (trip.num_people || 1)) || prev.budget,
                budget_max: trip.budget_max || prev.budget_max,
                num_people: isGroup ? Math.max(2, trip.num_people || prev.num_people) : 1,
                start_date: trip.start_date || prev.start_date,
                end_date: trip.end_date || prev.end_date,
                must_have: trip.must_have || prev.must_have,
                must_avoid: trip.must_avoid || prev.must_avoid,
                trip_intent: trip.trip_intent || prev.trip_intent,
                work_start_time: trip.work_start_time || prev.work_start_time,
                work_end_time: trip.work_end_time || prev.work_end_time,
                work_days: trip.work_days || prev.work_days
            }));
        }
    }, [trip]);

    useEffect(() => {
        if (!isGroup) return;
        const count = parseInt(formData.num_people) || 1;
        const needed = Math.max(0, count - 1);
        setFormData(prev => {
            const currentNames = [...prev.participant_names];
            if (currentNames.length < needed) {
                while (currentNames.length < needed) currentNames.push("");
            } else if (currentNames.length > needed) {
                currentNames.splice(needed);
            }
            return { ...prev, participant_names: currentNames };
        });
    }, [formData.num_people, isGroup]);

    useEffect(() => {
        if (step === 5 && !suggestedBudget && !isEstimatingBudget && formData.destination) {
            setIsEstimatingBudget(true);
            estimateSurveyBudget(formData)
                .then(data => {
                    if (data && data.budget_max > 0) {
                        setSuggestedBudget(data);
                    } else {
                        setSuggestedBudget({ error: true });
                    }
                })
                .catch(err => {
                    console.error("Scusa, errore budget stima:", err);
                    setSuggestedBudget({ error: true });
                })
                .finally(() => {
                    setIsEstimatingBudget(false);
                });
        }
    }, [step, formData.destination, formData.start_date, suggestedBudget, isEstimatingBudget]);

    const handleNameChange = (index, value) => {
        const newNames = [...formData.participant_names];
        newNames[index] = value;
        setFormData({ ...formData, participant_names: newNames });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete(formData);
    };

    const totalSteps = 7;

    const nextStep = () => {
        if (step === 1 && !isGroup) {
            setStep(3);
        } else {
            setStep(prev => Math.min(prev + 1, totalSteps - 1));
        }
    };

    const prevStep = () => {
        if (step === 3 && !isGroup) {
            setStep(1);
        } else {
            setStep(prev => Math.max(prev - 1, 0));
        }
    };

    if (step === 0) {
        return (
            <StepWrapper
                title={t('survey.step0.title', 'Qual è lo scopo del tuo viaggio?')}
                onNext={() => formData.trip_intent && nextStep()}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                        { id: 'LEISURE', icon: TreePalm, title: 'Vacanza', desc: 'Relax e scoperta.' },
                        { id: 'BUSINESS', icon: Briefcase, title: 'Lavoro', desc: 'Efficienza e focus.' }
                    ].map(intent => (
                        <div
                            key={intent.id}
                            className={cn(
                                "premium-card bg-card border p-12 cursor-pointer group transition-all duration-500 shadow-md",
                                formData.trip_intent === intent.id ? "border-primary shadow-xl scale-[1.02]" : "border-border-medium hover:border-primary/50"
                            )}
                            onClick={() => setFormData({ ...formData, trip_intent: intent.id })}
                        >
                            <div className={cn(
                                "w-16 h-16 border rounded-sm flex items-center justify-center mb-10 transition-all duration-500",
                                formData.trip_intent === intent.id ? "bg-primary text-base border-primary" : "bg-surface border-border-medium text-primary group-hover:bg-primary/10"
                            )}>
                                <intent.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-primary text-2xl font-black uppercase tracking-tight mb-3">{intent.title}</h3>
                            <p className="text-muted text-base leading-relaxed">{intent.desc}</p>
                        </div>
                    ))}
                </div>
            </StepWrapper>
        );
    }

    if (step === 1) {
        return (
            <StepWrapper
                title={t('survey.step1.title', 'Come ti sposti?')}
                onBack={prevStep}
                onNext={() => formData.transport_mode && nextStep()}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { id: 'CAR', icon: Car, title: 'Macchina' },
                        { id: 'TRAIN', icon: Train, title: 'Treno' },
                        { id: 'FLIGHT', icon: Plane, title: 'Volo' }
                    ].map(mode => (
                        <div
                            key={mode.id}
                            className={cn(
                                "premium-card bg-card border p-8 cursor-pointer group transition-all duration-500 flex flex-col items-center text-center shadow-md",
                                formData.transport_mode === mode.id ? "border-primary shadow-xl scale-105" : "border-border-medium hover:border-primary/50"
                            )}
                            onClick={() => setFormData({ ...formData, transport_mode: mode.id })}
                        >
                            <div className={cn(
                                "w-12 h-12 border rounded-sm flex items-center justify-center mb-6 transition-all duration-500",
                                formData.transport_mode === mode.id ? "bg-primary text-base border-primary" : "bg-surface border-border-medium text-primary group-hover:bg-primary/10"
                            )}>
                                <mode.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-primary text-lg font-black uppercase tracking-tight">{mode.title}</h3>
                        </div>
                    ))}
                </div>
            </StepWrapper>
        );
    }

    if (step === 2) {
        return (
            <StepWrapper
                title={t('survey.step2.title', 'Con chi viaggi?')}
                onBack={prevStep}
                onNext={nextStep}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="max-w-md space-y-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                             <Users className="w-3 h-3"/> Numero di persone
                        </Label>
                        <div className="flex items-center gap-6 bg-surface p-4 rounded-sm border border-border-subtle">
                            <Button 
                                variant="outline" 
                                onClick={() => setFormData({ ...formData, num_people: Math.max(isGroup ? 2 : 1, Number(formData.num_people) - 1) })}
                                disabled={isGroup ? Number(formData.num_people) <= 2 : Number(formData.num_people) <= 1}
                            >
                                -
                            </Button>
                            <div className="flex-1 text-center">
                                <span className="text-4xl font-black text-primary">{formData.num_people}</span>
                                <span className="block text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                    {formData.num_people === 1 ? 'Persona' : 'Persone'}
                                </span>
                            </div>
                            <Button variant="outline" onClick={() => setFormData({ ...formData, num_people: Math.min(20, Number(formData.num_people) + 1) })}>+</Button>
                        </div>
                    </div>

                    {isGroup && formData.participant_names.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Nomi dei partecipanti</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {formData.participant_names.map((name, i) => (
                                    <Input
                                        key={i}
                                        value={name}
                                        onChange={(e) => handleNameChange(i, e.target.value)}
                                        placeholder={`Nome partecipante ${i + 2}`}
                                        className="bg-surface h-12 border-border-subtle focus:border-primary"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </StepWrapper>
        );
    }

    if (step === 3) {
        return (
            <StepWrapper
                title={t('survey.step3.title', 'Quando partiamo?')}
                onBack={prevStep}
                onNext={() => formData.start_date && formData.end_date && nextStep()}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">Andata</Label>
                        <div className="bg-card p-4 rounded-sm border border-border-medium inline-block shadow-lg">
                            <Calendar
                                mode="single"
                                selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                onSelect={(date) => date && setFormData({ ...formData, start_date: format(date, "yyyy-MM-dd") })}
                                locale={it}
                                className="rounded-md"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">Ritorno</Label>
                        <div className="bg-card p-4 rounded-sm border border-border-medium inline-block shadow-lg">
                            <Calendar
                                mode="single"
                                selected={formData.end_date ? new Date(formData.end_date) : undefined}
                                onSelect={(date) => date && setFormData({ ...formData, end_date: format(date, "yyyy-MM-dd") })}
                                locale={it}
                                className="rounded-md"
                            />
                        </div>
                    </div>
                </div>
            </StepWrapper>
        );
    }

    if (step === 4) {
        return (
            <StepWrapper
                title={t('survey.step4.title', 'Dove andiamo?')}
                onBack={prevStep}
                onNext={() => formData.destination && nextStep()}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="max-w-2xl space-y-10">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Destinazione
                        </Label>
                        <Input
                            value={formData.destination}
                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            placeholder="es. Tokyo, Islanda, Roma..."
                            className="h-20 text-3xl font-black bg-surface border-border-subtle focus:border-primary uppercase tracking-tight"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <Plane className="w-3 h-3" /> Punto di partenza
                        </Label>
                        <Input
                            value={formData.departure_airport}
                            onChange={(e) => setFormData({ ...formData, departure_airport: e.target.value })}
                            placeholder="es. Milano, MXP, New York..."
                            className="h-16 text-xl font-bold bg-surface border-border-subtle focus:border-primary"
                        />
                    </div>
                </div>
            </StepWrapper>
        );
    }

    if (step === 5) {
        return (
            <StepWrapper
                title={t('survey.step5.title', 'Qual è il tuo budget?')}
                onBack={prevStep}
                onNext={() => formData.budget && nextStep()}
                step={step}
                totalSteps={totalSteps}
                t={t}
                isGenerating={isGenerating}
            >
                <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">Budget Minimo</Label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary opacity-30">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <Input
                                type="number"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="es. 800"
                                className="h-20 pl-16 text-3xl font-black bg-surface border-border-subtle focus:border-primary"
                                autoFocus
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-muted">€</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">Budget Massimo</Label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary opacity-30">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <Input
                                type="number"
                                value={formData.budget_max}
                                onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                                placeholder="es. 1200"
                                className="h-20 pl-16 text-3xl font-black bg-surface border-border-subtle focus:border-primary"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-muted">€</div>
                        </div>
                    </div>
                    <div className="md:col-span-2 mt-4">
                        {isEstimatingBudget ? (
                            <div className="flex items-center gap-4 text-primary font-medium bg-surface p-5 rounded-lg border border-border-medium border-dashed animate-pulse">
                                <div className="bg-border-medium/20 text-muted p-3 rounded-full animate-spin">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Analisi in corso...</span>
                                    <span className="font-bold text-primary text-sm">L'IA sta calcolando il limite di spesa per {formData.destination}</span>
                                </div>
                            </div>
                        ) : suggestedBudget && !suggestedBudget.error ? (
                            <div 
                                className="relative overflow-hidden group flex flex-col gap-1 cursor-pointer p-6 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:border-blue-500/60 hover:from-blue-500/20 hover:to-cyan-500/20 transition-all duration-300 shadow-sm hover:shadow-[0_8px_30px_-5px_rgba(0,102,255,0.4)]"
                                onClick={() => setFormData(prev => ({ ...prev, budget: suggestedBudget.budget_min, budget_max: suggestedBudget.budget_max }))}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10 flex gap-5 items-center">
                                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 rounded-full border border-blue-500/30 text-blue-500 group-hover:scale-110 transition-transform duration-300">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-blue-500/80 text-[10px] uppercase font-black tracking-widest mb-1 group-hover:text-blue-500 transition-colors">💡 Suggerimento IA</span>
                                        <span className="font-bold text-primary text-lg">
                                            Tra <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">{suggestedBudget.budget_min}€</span> e <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">{suggestedBudget.budget_max}€</span> per {formData.num_people} {formData.num_people > 1 ? 'persone' : 'persona'}.
                                        </span>
                                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-2 flex items-center gap-1 group-hover:translate-x-2 transition-transform opacity-70 group-hover:opacity-100">
                                            Clicca per applicarlo automaticamente &rarr;
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface/50 p-4 rounded-lg flex items-start gap-4 inline-block border border-border-medium border-dashed">
                               <p className="text-muted text-sm font-medium">Inserisci un range di budget per permettere all'AI di strutturare hotel e trasporti nel bilancio.</p>
                            </div>
                        )}
                    </div>
                </div>
            </StepWrapper>
        );
    }

    return (
        <StepWrapper
            title={t('survey.step6.title', 'Ultime preferenze?')}
            subtitle={t('survey.step6.subtitle', 'Aggiungi dettagli per rendere il viaggio perfetto.')}
            onBack={prevStep}
            onNext={handleSubmit}
            showSkip={true}
            isLast={true}
            step={step}
            totalSteps={totalSteps}
            t={t}
            isGenerating={isGenerating}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-digital-blue flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Cose da includere
                    </Label>
                    <textarea
                        value={formData.must_have}
                        onChange={(e) => setFormData({ ...formData, must_have: e.target.value })}
                        placeholder="es. Musei d'arte, street food, zone pedonali..."
                        className="w-full h-48 p-6 bg-surface rounded-sm border border-border-subtle focus:border-primary outline-none text-primary font-medium resize-none transition-all"
                    />
                </div>
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[crimson] flex items-center gap-2">
                        Cose da evitare
                    </Label>
                    <textarea
                        value={formData.must_avoid}
                        onChange={(e) => setFormData({ ...formData, must_avoid: e.target.value })}
                        placeholder="es. Folle eccessive, trekking impegnativi, locali rumorosi..."
                        className="w-full h-48 p-6 bg-surface rounded-sm border border-border-subtle focus:border-border-medium outline-none text-primary font-medium resize-none transition-all"
                    />
                </div>
            </div>
        </StepWrapper>
    );
};

export default Survey;