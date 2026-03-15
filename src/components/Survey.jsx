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

const MadLibWord = ({ value, placeholder, children, className }) => (
    <Popover>
        <PopoverTrigger asChild>
            <span className={cn(
                "cursor-pointer border-b-2 border-dashed border-primary/30 hover:border-primary hover:text-primary transition-all px-1 mx-1 pb-1 font-black",
                !value && "text-muted border-muted/30",
                className
            )}>
                {value || placeholder}
            </span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-6 bg-card border-border-medium shadow-2xl z-[1000]">
            {children}
        </PopoverContent>
    </Popover>
);

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
        transport_mode: 'FLIGHT',
        trip_intent: 'LEISURE',
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
                        <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-1 block">Step 01</span>
                        <h2 className="text-primary text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">
                            Qual è lo scopo del <br/> tuo viaggio?
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div
                            className={cn(
                                "premium-card bg-card border p-12 cursor-pointer group transition-all duration-500 shadow-md",
                                formData.trip_intent === 'LEISURE' ? "border-primary shadow-xl scale-[1.02]" : "border-border-medium hover:border-primary/50"
                            )}
                            onClick={() => handleIntentSelect('LEISURE')}
                        >
                            <div className="w-16 h-16 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500">
                                <TreePalm className="w-8 h-8" />
                            </div>
                            <h3 className="text-primary text-2xl font-black uppercase tracking-tight mb-3">Vacanza</h3>
                            <p className="text-muted text-base leading-relaxed">Relax e scoperta.</p>
                        </div>

                        <div
                            className={cn(
                                "premium-card bg-card border p-12 cursor-pointer group transition-all duration-500 shadow-md",
                                formData.trip_intent === 'BUSINESS' ? "border-primary shadow-xl scale-[1.02]" : "border-border-medium hover:border-primary/50"
                            )}
                            onClick={() => handleIntentSelect('BUSINESS')}
                        >
                            <div className="w-16 h-16 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <h3 className="text-primary text-2xl font-black uppercase tracking-tight mb-3">Lavoro</h3>
                            <p className="text-muted text-base leading-relaxed">Efficienza e focus.</p>
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
                        <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-1 block">Step 02</span>
                        <h2 className="text-primary text-4xl md:text-6xl font-black tracking-tight uppercase leading-none">
                            Come ti sposti?
                        </h2>
                    </div>

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
                                onClick={() => handleTransportSelect(mode.id)}
                            >
                                <div className="w-12 h-12 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500">
                                    <mode.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-primary text-lg font-black uppercase tracking-tight">{mode.title}</h3>
                            </div>
                        ))}
                    </div>
                    <Button variant="ghost" className="text-muted hover:text-primary self-start font-black uppercase text-[10px] tracking-widest" onClick={() => setStep(0)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="section py-16 animate-fade-in flex flex-col justify-center min-h-[80vh]">
            <div className="container max-w-5xl">
                <div className="mb-12">
                    <Button variant="ghost" className="text-muted hover:text-primary font-black uppercase text-[10px] tracking-widest p-0 mb-4" onClick={() => setStep(1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Modifica trasporti
                    </Button>
                    <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-2 block">Final Generation</span>
                </div>

                <div className="text-[2.5rem] md:text-[4rem] font-bold text-primary leading-tight tracking-tight mb-16">
                    Voglio organizzare un viaggio di 
                    <MadLibWord value={formData.trip_intent === 'LEISURE' ? 'Vacanza' : 'Lavoro'} placeholder="Scopo">
                        <div className="grid grid-cols-2 gap-2">
                           <Button variant={formData.trip_intent === 'LEISURE' ? 'default' : 'outline'} onClick={() => setFormData({...formData, trip_intent: 'LEISURE'})} className="text-[10px] font-black uppercase tracking-widest">Vacanza</Button>
                           <Button variant={formData.trip_intent === 'BUSINESS' ? 'default' : 'outline'} onClick={() => setFormData({...formData, trip_intent: 'BUSINESS'})} className="text-[10px] font-black uppercase tracking-widest">Lavoro</Button>
                        </div>
                    </MadLibWord>
                    in 
                    <MadLibWord value={formData.transport_mode === 'FLIGHT' ? 'Volo' : formData.transport_mode === 'TRAIN' ? 'Treno' : 'Macchina'} placeholder="Mezzo">
                        <div className="grid grid-cols-3 gap-2">
                           <Button variant={formData.transport_mode === 'FLIGHT' ? 'default' : 'outline'} onClick={() => setFormData({...formData, transport_mode: 'FLIGHT'})} className="px-2 font-black"><Plane className="w-4 h-4"/></Button>
                           <Button variant={formData.transport_mode === 'TRAIN' ? 'default' : 'outline'} onClick={() => setFormData({...formData, transport_mode: 'TRAIN'})} className="px-2 font-black"><Train className="w-4 h-4"/></Button>
                           <Button variant={formData.transport_mode === 'CAR' ? 'default' : 'outline'} onClick={() => setFormData({...formData, transport_mode: 'CAR'})} className="px-2 font-black"><Car className="w-4 h-4"/></Button>
                        </div>
                    </MadLibWord>
                    per 
                    <MadLibWord value={formData.destination} placeholder="Destinazione">
                        <Input 
                            value={formData.destination} 
                            onChange={(e) => setFormData({...formData, destination: e.target.value})}
                            placeholder="es. Kyoto, New York..."
                            className="h-12 bg-surface font-bold text-primary"
                            autoFocus
                        />
                    </MadLibWord>
                    partendo da 
                    <MadLibWord value={formData.departure_airport} placeholder="Origine">
                        <Input 
                            value={formData.departure_airport} 
                            onChange={(e) => setFormData({...formData, departure_airport: e.target.value})}
                            placeholder="es. MXP, Roma..."
                            className="h-12 bg-surface font-bold text-primary"
                            autoFocus
                        />
                    </MadLibWord>
                    per 
                    <MadLibWord value={formData.num_people} placeholder="N° Persone">
                        <div className="flex gap-2 items-center">
                            <Button variant="outline" size="sm" onClick={() => setFormData({...formData, num_people: Math.max(1, formData.num_people - 1)})}>-</Button>
                            <span className="flex-1 text-center font-bold text-lg">{formData.num_people}</span>
                            <Button variant="outline" size="sm" onClick={() => setFormData({...formData, num_people: Math.min(10, formData.num_people + 1)})}>+</Button>
                        </div>
                    </MadLibWord>
                    {isGroup ? 'partecipanti' : 'persona'}. Abbiamo un budget di 
                    <MadLibWord value={formData.budget + '€'} placeholder="Budget">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Budget Totale (€)</Label>
                            <Input 
                                type="number" 
                                value={formData.budget} 
                                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                                placeholder="es. 2000"
                                className="h-12 bg-surface font-bold text-primary"
                                autoFocus
                            />
                        </div>
                    </MadLibWord>
                    e viaggeremo dal 
                    <MadLibWord value={formData.start_date ? format(new Date(formData.start_date), "dd/MM/yy") : null} placeholder="Inizio">
                        <Calendar
                            mode="single"
                            selected={formData.start_date ? new Date(formData.start_date) : undefined}
                            onSelect={(date) => date && setFormData({...formData, start_date: format(date, "yyyy-MM-dd")})}
                            locale={it}
                        />
                    </MadLibWord>
                    al 
                    <MadLibWord value={formData.end_date ? format(new Date(formData.end_date), "dd/MM/yy") : null} placeholder="Fine">
                        <Calendar
                            mode="single"
                            selected={formData.end_date ? new Date(formData.end_date) : undefined}
                            onSelect={(date) => date && setFormData({...formData, end_date: format(date, "yyyy-MM-dd")})}
                            locale={it}
                        />
                    </MadLibWord>.
                    Mi piacerebbe includere 
                    <MadLibWord value={formData.must_have} placeholder="Interessi" className="text-digital-blue border-digital-blue/30">
                        <textarea 
                            value={formData.must_have} 
                            onChange={(e) => setFormData({...formData, must_have: e.target.value})}
                            placeholder="es. Musei, Spiagge, Shopping..."
                            className="w-full h-32 p-4 bg-surface rounded-sm border border-border-medium outline-none text-primary font-medium"
                        />
                    </MadLibWord>
                    ed evitare 
                    <MadLibWord value={formData.must_avoid} placeholder="Cose da evitare" className="text-[crimson] border-[crimson]/30">
                        <textarea 
                            value={formData.must_avoid} 
                            onChange={(e) => setFormData({...formData, must_avoid: e.target.value})}
                            placeholder="es. Club, Trekking..."
                            className="w-full h-32 p-4 bg-surface rounded-sm border border-border-medium outline-none text-primary font-medium"
                        />
                    </MadLibWord>.
                </div>

                <div className="flex justify-center pt-8">
                    <Button
                        onClick={handleSubmit}
                        size="xl"
                        className="px-16 py-8 h-auto font-black uppercase tracking-[0.2em] text-sm group relative overflow-hidden active:scale-95 transition-all shadow-2xl"
                        disabled={isGenerating || !formData.destination || !formData.start_date || !formData.end_date}
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-4">
                            {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {isGenerating ? 'Generazione in corso...' : 'Scopri il tuo viaggio'}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Survey;