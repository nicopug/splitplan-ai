import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    Calendar as CalendarIcon,
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
import { cn } from '@/lib/utils';

const Survey = ({ trip, onComplete, isGenerating }) => {
    const { t, i18n } = useTranslation();
    const isGroup = trip.trip_type === 'GROUP';

    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        destination: '',
        departure_airport: '',
        budget: '',
        num_people: isGroup ? 2 : 1,
        start_date: '',
        end_date: '',
        must_have: '',
        must_avoid: '',
        participant_names: [],
        transport_mode: 'FLIGHT', // Default
        trip_intent: 'LEISURE', // Default: LEISURE or BUSINESS
        work_start_time: '09:00',
        work_end_time: '18:00',
        work_days: 'Monday,Tuesday,Wednesday,Thursday,Friday'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleIntentSelect = (intent) => {
        setFormData({ ...formData, trip_intent: intent });
        setStep(1);
    };

    const handleTransportSelect = (mode) => {
        setFormData({ ...formData, transport_mode: mode });
        setStep(2);
    };

    // Initialize from trip if editing
    useEffect(() => {
        if (trip) {
            setFormData(prev => ({
                ...prev,
                destination: trip.destination || prev.destination,
                departure_airport: trip.departure_airport || prev.departure_airport,
                budget: trip.budget_per_person * (trip.num_people || 1) || prev.budget,
                num_people: trip.num_people || prev.num_people,
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

    // Update participant names array when num_people changes
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

    const handleNameChange = (index, value) => {
        const newNames = [...formData.participant_names];
        newNames[index] = value;
        setFormData({ ...formData, participant_names: newNames });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete(formData);
    };

    if (step === 0) {
        return (
            <div className="section py-16 animate-fade-in min-h-[60vh] flex flex-col justify-center">
                <div className="container max-w-4xl text-left space-y-12">
                    <div className="space-y-4">
                        <span className="subtle-heading">{t('survey.step0Step', 'Passaggi: 1/3')}</span>
                        <h2 className="text-white text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                            {t('survey.step0Title', 'Qual è lo scopo del viaggio?')}
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                            {t('survey.step0Desc', "Questo ci aiuterà a personalizzare l'itinerario perfetto per te.")}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div
                            className={cn(
                                "premium-card p-10 cursor-pointer group transition-all duration-500",
                                formData.trip_intent === 'LEISURE' ? "ring-1 ring-white" : "hover:border-white/20"
                            )}
                            onClick={() => handleIntentSelect('LEISURE')}
                        >
                            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center text-white mb-8 group-hover:bg-white group-hover:text-black transition-all">
                                <TreePalm className="w-8 h-8" />
                            </div>
                            <h3 className="text-white text-2xl font-semibold uppercase tracking-tight mb-2">
                                {t('survey.leisureTitle', 'Vacanza')}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {t('survey.leisureDesc', 'Relax, divertimento e scoperta.')}
                            </p>
                        </div>

                        <div
                            className={cn(
                                "premium-card p-10 cursor-pointer group transition-all duration-500",
                                formData.trip_intent === 'BUSINESS' ? "ring-1 ring-white" : "hover:border-white/20"
                            )}
                            onClick={() => handleIntentSelect('BUSINESS')}
                        >
                            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center text-white mb-8 group-hover:bg-white group-hover:text-black transition-all">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <h3 className="text-white text-2xl font-semibold uppercase tracking-tight mb-2">
                                {t('survey.businessTitle', 'Lavoro')}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {t('survey.businessDesc', 'Efficienza e produttività.')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="section py-16 animate-fade-in min-h-[60vh] flex flex-col justify-center">
                <div className="container max-w-4xl text-left space-y-12">
                    <div className="space-y-4">
                        <span className="subtle-heading">{t('survey.step1Step', 'Passaggi: 2/3')}</span>
                        <h2 className="text-white text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                            {t('survey.step1Title', 'Qual è il tuo mezzo di trasporto?')}
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                            {t('survey.step1Desc', 'Scegli come vuoi raggiungere la tua destinazione.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { id: 'CAR', icon: Car, title: t('survey.carTitle', 'Macchina'), desc: t('survey.carDesc') },
                            { id: 'TRAIN', icon: Train, title: t('survey.trainTitle', 'Treno'), desc: t('survey.trainDesc') },
                            { id: 'FLIGHT', icon: Plane, title: t('survey.flightTitle', 'Volo'), desc: t('survey.flightDesc') }
                        ].map(mode => (
                            <div
                                key={mode.id}
                                className={cn(
                                    "premium-card p-8 cursor-pointer group transition-all duration-500 flex flex-col items-center text-center",
                                    formData.transport_mode === mode.id ? "ring-1 ring-white" : "hover:border-white/20"
                                )}
                                onClick={() => handleTransportSelect(mode.id)}
                            >
                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center text-white mb-4 group-hover:bg-white group-hover:text-black transition-all">
                                    <mode.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-white text-lg font-semibold uppercase tracking-tight mb-2">
                                    {mode.title}
                                </h3>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    {mode.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <Button variant="ghost" className="text-gray-500 hover:text-white" onClick={() => setStep(0)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.back', 'Indietro')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="section py-16 animate-fade-in">
            <div className="container max-w-4xl space-y-12">

                {/* Header */}
                <div className="text-left space-y-4">
                    <div className="flex flex-wrap gap-2 mb-8">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setStep(0)}
                            className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white hover:text-black rounded-sm px-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {formData.trip_intent === 'BUSINESS' ? t('survey.businessTitle', 'Business') : t('survey.leisureTitle', 'Leisure')}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setStep(1)}
                            className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white hover:text-black rounded-sm px-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {formData.transport_mode === 'CAR' ? t('survey.carTitle', 'Auto') : formData.transport_mode === 'TRAIN' ? t('survey.trainTitle', 'Treno') : t('survey.flightTitle', 'Volo')}
                        </Button>
                    </div>

                    <span className="subtle-heading">{t('survey.step2Step', 'Passaggi: 3/3')}</span>
                    <h2 className="text-white text-4xl md:text-5xl font-semibold tracking-tight uppercase">
                        {t('survey.step2Title', 'Definiamo i dettagli')}
                    </h2>
                    <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                        {t('survey.subtitle', {
                            target: isGroup ? t('survey.targetGroup', 'il gruppo') : t('survey.targetSolo', 'te'),
                            defaultValue: 'Aiutaci a costruire il viaggio perfetto per {{target}}.'
                        })}
                    </p>
                </div>

                {/* Form Container */}
                <div className="premium-card p-10">
                    <form onSubmit={handleSubmit} className="space-y-12">

                        {/* Destination & Airport */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="destination">{t('survey.destinationLabel', 'Destinazione')}</Label>
                                <Input
                                    id="destination"
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    placeholder={t('survey.destinationPlaceholder', 'es. Europa, Giappone...')}
                                    required
                                    className="h-14 bg-white/5 border-white/10 text-white focus:border-white focus:ring-0 rounded-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="departure_airport">
                                    {formData.transport_mode === 'FLIGHT' ? t('survey.departureAirportLabel', 'Aeroporto Partenza') : t('survey.departureCityLabel', 'Città di Partenza')}
                                </Label>
                                <Input
                                    id="departure_airport"
                                    name="departure_airport"
                                    value={formData.departure_airport}
                                    onChange={handleChange}
                                    placeholder={formData.transport_mode === 'FLIGHT' ? t('survey.departureAirportPlaceholder', "es. MXP, FCO") : t('survey.departureCityPlaceholder', "es. Milano, Roma")}
                                    required
                                    className="h-12 bg-white/5 border-violet-500/30 text-white focus:border-violet-500 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        {/* Group Details */}
                        {isGroup && (
                            <div className="space-y-8 py-8 border-y border-white/10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="group-budget" className="text-xs uppercase tracking-widest text-gray-500">{t('survey.budgetLabel', 'Budget Totale (€)')}</Label>
                                        <Input
                                            id="group-budget"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder={t('survey.budgetPlaceholder', 'es. 3000')}
                                            required
                                            className="h-14 bg-white/5 border-white/10 text-white focus:border-white focus:ring-0 rounded-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="num_people" className="text-xs uppercase tracking-widest text-gray-500">{t('survey.numPeopleLabel', 'Numero Persone')}</Label>
                                        <Input
                                            id="num_people"
                                            name="num_people"
                                            value={formData.num_people}
                                            onChange={handleChange}
                                            type="number"
                                            min="2"
                                            max="10"
                                            required
                                            className="h-14 bg-white/5 border-white/10 text-white focus:border-white focus:ring-0 rounded-sm"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Names Inputs */}
                                {formData.participant_names.length > 0 && (
                                    <div className="animate-fade-in space-y-6">
                                        <label className="text-xs uppercase tracking-widest text-white font-semibold flex items-center gap-4">
                                            {t('survey.participantNamesLabel', 'Chi viene con te?')}
                                            <div className="h-px flex-1 bg-white/10"></div>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {formData.participant_names.map((name, idx) => (
                                                <Input
                                                    key={idx}
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={t('survey.participantNamePlaceholder', { index: idx + 2, defaultValue: `Nome Amico ${idx + 2}` })}
                                                    required
                                                    className="h-12 bg-white/5 border-white/10 text-white rounded-sm"
                                                />
                                            ))}
                                        </div>

                                        {/* AVVISO NOMI */}
                                        <div className="p-6 bg-white/5 border border-white/10 rounded-sm">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold rounded-sm shrink-0">!</div>
                                                <div>
                                                    <h4 className="text-white text-sm font-semibold uppercase tracking-tight mb-1">{t('survey.namesWarningTitle', 'I nomi contano')}</h4>
                                                    <p className="text-gray-500 text-xs leading-relaxed">
                                                        {t('survey.namesWarningDesc', 'Inserisci i nomi reali dei tuoi amici. Potranno votare e gestire il budget solo se i nomi corrispondono ai loro account SplitPlan.')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Solo Details */}
                        {!isGroup && (
                            <div className="space-y-2">
                                <Label htmlFor="solo-budget">{t('survey.budgetLabel', 'Budget Totale (€)')}</Label>
                                <Input
                                    id="solo-budget"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    type="number"
                                    placeholder={t('survey.budgetPlaceholder', 'es. 1500')}
                                    required
                                    className="h-12 bg-white/5 border-violet-500/30 text-white focus:border-violet-500 focus:ring-violet-500"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label>{t('survey.startDateLabel', 'Data Partenza')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-14 rounded-sm bg-white/5 border-white/10 text-white hover:bg-white hover:text-black",
                                                !formData.start_date && "text-gray-500"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.start_date ? (
                                                format(new Date(formData.start_date), "PPP", { locale: i18n.language === 'en' ? undefined : it })
                                            ) : (
                                                <span>{t('survey.selectDate', 'Seleziona data')}</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const formatted = format(date, "yyyy-MM-dd");
                                                    setFormData({ ...formData, start_date: formatted });
                                                }
                                            }}
                                            initialFocus
                                            locale={i18n.language === 'en' ? undefined : it}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('survey.endDateLabel', 'Data Ritorno')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-12 rounded-xl bg-white/5 border-violet-500/30 text-white hover:bg-white/10 hover:text-white",
                                                !formData.end_date && "text-gray-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.end_date ? (
                                                format(new Date(formData.end_date), "PPP", { locale: i18n.language === 'en' ? undefined : it })
                                            ) : (
                                                <span>{t('survey.selectDate', 'Seleziona data')}</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.end_date ? new Date(formData.end_date) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const formatted = format(date, "yyyy-MM-dd");
                                                    setFormData({ ...formData, end_date: formatted });
                                                }
                                            }}
                                            initialFocus
                                            locale={i18n.language === 'en' ? undefined : it}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Work Hours & Days (Business Only) */}
                        {formData.trip_intent === 'BUSINESS' && (
                            <div className="premium-card p-10 space-y-10 animate-fade-in border-white/20">
                                <div className="space-y-2">
                                    <span className="subtle-heading">{t('survey.workConfig', 'Configurazione Lavoro')}</span>
                                    <h4 className="text-white text-xl font-semibold uppercase tracking-tight">
                                        {t('survey.workAiNoteTitle', 'Programma intelligente')}
                                    </h4>
                                    <p className="text-gray-500 text-sm">{t('survey.workAiNote', "L'AI organizzerà le attività extra solo nei giorni non lavorativi o fuori dagli orari indicati.")}</p>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-xs uppercase tracking-widest text-gray-500 font-bold">{t('survey.workDaysQuestion', 'Giorni di attività lavorativa')}</label>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { id: 'Monday', label: t('survey.days.Monday', 'Lun') },
                                            { id: 'Tuesday', label: t('survey.days.Tuesday', 'Mar') },
                                            { id: 'Wednesday', label: t('survey.days.Wednesday', 'Mer') },
                                            { id: 'Thursday', label: t('survey.days.Thursday', 'Gio') },
                                            { id: 'Friday', label: t('survey.days.Friday', 'Ven') },
                                            { id: 'Saturday', label: t('survey.days.Saturday', 'Sab') },
                                            { id: 'Sunday', label: t('survey.days.Sunday', 'Dom') }
                                        ].map(day => (
                                            <Button
                                                key={day.id}
                                                type="button"
                                                variant={(formData.work_days || '').includes(day.id) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    const currentDays = (formData.work_days || '').split(',').filter(d => d);
                                                    let newDays;
                                                    if (currentDays.includes(day.id)) {
                                                        newDays = currentDays.filter(d => d !== day.id);
                                                    } else {
                                                        newDays = [...currentDays, day.id];
                                                    }
                                                    setFormData({ ...formData, work_days: newDays.join(',') });
                                                }}
                                                className={cn(
                                                    "rounded-sm h-10 px-6",
                                                    (formData.work_days || '').includes(day.id) ? "bg-white text-black border-white" : "border-white/10 text-gray-500 hover:border-white/30"
                                                )}
                                            >
                                                {day.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-widest text-gray-500">{t('survey.workStartLabel', 'Orario Inizio')}</Label>
                                        <Input
                                            name="work_start_time"
                                            value={formData.work_start_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="h-14 bg-white/5 border-white/10 text-white focus:ring-0 rounded-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-widest text-gray-500">{t('survey.workEndLabel', 'Orario Fine')}</Label>
                                        <Input
                                            name="work_end_time"
                                            value={formData.work_end_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="h-14 bg-white/5 border-white/10 text-white focus:ring-0 rounded-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label>{t('survey.mustHaveLabel', 'Cosa non può mancare?')}</Label>
                                <textarea
                                    name="must_have"
                                    value={formData.must_have}
                                    onChange={handleChange}
                                    placeholder={t('survey.mustHavePlaceholder', 'es. Musei, Spiagge, Shopping...')}
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-sm border border-white/10 
                                             focus:border-white focus:ring-0
                                             transition-all outline-none resize-none bg-white/5 text-white text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('survey.mustAvoidLabel', 'Cosa vorresti evitare?')}</Label>
                                <textarea
                                    name="must_avoid"
                                    value={formData.must_avoid}
                                    onChange={handleChange}
                                    placeholder={t('survey.mustAvoidPlaceholder', 'es. Club, Trekking faticosi...')}
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-sm border border-white/10 
                                             focus:border-white focus:ring-0
                                             transition-all outline-none resize-none bg-white/5 text-white text-sm"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-12">
                            <Button
                                type="submit"
                                size="xl"
                                fullWidth
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <span className="flex items-center justify-center gap-4">
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        {t('survey.submitGenerating', 'Analisi dei dati in corso...')}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5" />
                                        {isGroup ? t('survey.submitCreateGroup', 'Crea Progetto di Gruppo') : t('survey.submitGenerateSolo', 'Genera Proposte AI')}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Survey;