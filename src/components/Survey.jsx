import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AlertCircle, Calendar as CalendarIcon, MapPin, Plane, Train, Car, Briefcase, Palmtree } from 'lucide-react';

const Survey = ({ trip, onComplete, isGenerating }) => {
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
            <div className="section py-8 md:py-12 animate-fade-in">
                <div className="container max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                            Qual è lo scopo del viaggio?
                        </h2>
                        <p className="text-lg text-white/60">
                            Questo ci aiuterà a personalizzare l'itinerario perfetto per te.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Leisure */}
                        <Card
                            onClick={() => handleIntentSelect('LEISURE')}
                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group rounded-3xl overflow-hidden"
                        >
                            <CardHeader className="text-center pb-2">
                                <div className="text-6xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500">🏖️</div>
                                <CardTitle className="text-2xl text-white">Vacanza</CardTitle>
                                <CardDescription className="text-white/50">
                                    Relax, divertimento e scoperta. L'AI creerà un itinerario bilanciato tra svago e cultura.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* Business */}
                        <Card
                            onClick={() => handleIntentSelect('BUSINESS')}
                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group rounded-3xl overflow-hidden"
                        >
                            <CardHeader className="text-center pb-2">
                                <div className="text-6xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500">💼</div>
                                <CardTitle className="text-2xl text-white">Lavoro</CardTitle>
                                <CardDescription className="text-white/50">
                                    Efficienza e produttività. L'AI ottimizzerà per coworking, Wi-Fi e pasti veloci.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="section py-8 md:py-12 animate-fade-in">
                <div className="container max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
                            Qual è il tuo mezzo di trasporto?
                        </h2>
                        <p className="text-lg text-white/60">
                            Scegli come vuoi raggiungere la tua destinazione.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* CAR */}
                        <Card
                            onClick={() => handleTransportSelect('CAR')}
                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group rounded-3xl overflow-hidden"
                        >
                            <CardHeader className="text-center pb-4">
                                <div className="text-5xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500">🚗</div>
                                <CardTitle className="text-xl text-white font-bold">Macchina</CardTitle>
                                <CardDescription className="text-white/50">
                                    Usa la tua auto (stimiamo noi pedaggi e carburante).
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* TRAIN */}
                        <Card
                            onClick={() => handleTransportSelect('TRAIN')}
                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group rounded-3xl overflow-hidden"
                        >
                            <CardHeader className="text-center pb-4">
                                <div className="text-5xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500">🚄</div>
                                <CardTitle className="text-xl text-white font-bold">Treno</CardTitle>
                                <CardDescription className="text-white/50">
                                    Viaggia sui binari con i link pronti di Trainline.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* FLIGHT */}
                        <Card
                            onClick={() => handleTransportSelect('FLIGHT')}
                            className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group rounded-3xl overflow-hidden"
                        >
                            <CardHeader className="text-center pb-4">
                                <div className="text-5xl mb-3 grayscale group-hover:grayscale-0 transition-all duration-500">✈️</div>
                                <CardTitle className="text-xl text-white font-bold">Volo</CardTitle>
                                <CardDescription className="text-white/50">
                                    Decolla verso la meta con le migliori offerte Skyscanner.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="section py-8 md:py-12 animate-fade-in relative z-10">
            <div className="container max-w-4xl">
                <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-3xl rounded-[32px] overflow-hidden border-t-blue-500/20">
                    <CardHeader className="border-b border-white/5 pb-8 p-8 md:p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <CardTitle className="text-3xl font-bold text-white mb-2">Dettagli del Viaggio</CardTitle>
                                <CardDescription className="text-white/60">
                                    Aiutaci a costruire il viaggio perfetto per {isGroup ? 'il gruppo' : 'te'}.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStep(0)}
                                    className="text-white/40 hover:text-white hover:bg-white/5 rounded-full border border-white/5 h-10 px-4"
                                >
                                    {formData.trip_intent === 'BUSINESS' ? <Briefcase className="w-3.5 h-3.5 mr-2" /> : <Palmtree className="w-3.5 h-3.5 mr-2" />}
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{formData.trip_intent === 'BUSINESS' ? 'Lavoro' : 'Vacanza'}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStep(1)}
                                    className="text-white/40 hover:text-white hover:bg-white/5 rounded-full border border-white/5 h-10 px-4"
                                >
                                    {formData.transport_mode === 'CAR' ? <Car className="w-3.5 h-3.5 mr-2" /> : formData.transport_mode === 'TRAIN' ? <Train className="w-3.5 h-3.5 mr-2" /> : <Plane className="w-3.5 h-3.5 mr-2" />}
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{formData.transport_mode === 'CAR' ? 'Auto' : formData.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'}</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 md:p-12">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Destination & Airport */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2.5">
                                    <Label htmlFor="destination" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                        Destinazione
                                    </Label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-500 transition-all duration-300" />
                                        <Input
                                            id="destination"
                                            name="destination"
                                            value={formData.destination}
                                            onChange={handleChange}
                                            placeholder="es. Tokyo, Giappone"
                                            required
                                            className="bg-white/[0.03] border-white/10 text-white h-14 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-white/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="departure_airport" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                        {formData.transport_mode === 'FLIGHT' ? 'Aeroporto di Partenza' : 'Città di Partenza'}
                                    </Label>
                                    <div className="relative group">
                                        <Plane className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-focus-within:text-blue-500 transition-all duration-300" />
                                        <Input
                                            id="departure_airport"
                                            name="departure_airport"
                                            value={formData.departure_airport}
                                            onChange={handleChange}
                                            placeholder={formData.transport_mode === 'FLIGHT' ? "es. MXP" : "es. Milano"}
                                            required
                                            className="bg-white/[0.03] border-white/10 text-white h-14 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-white/20 uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group Details */}
                            {isGroup && (
                                <div className="bg-white/[0.02] p-8 rounded-[32px] border border-white/5 space-y-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="budget" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                                Budget a Persona (€)
                                            </Label>
                                            <Input
                                                id="budget"
                                                name="budget"
                                                value={formData.budget}
                                                onChange={handleChange}
                                                type="number"
                                                placeholder="es. 1500"
                                                required
                                                className="bg-white/[0.03] border-white/10 text-white h-13 rounded-xl focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label htmlFor="num_people" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                                Numero Partecipanti
                                            </Label>
                                            <Input
                                                id="num_people"
                                                name="num_people"
                                                value={formData.num_people}
                                                onChange={handleChange}
                                                type="number"
                                                min="2"
                                                max="10"
                                                required
                                                className="bg-white/[0.03] border-white/10 text-white h-13 rounded-xl focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>

                                    {formData.participant_names.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 bg-blue-500/[0.08] border border-blue-500/20 p-4 rounded-2xl">
                                                <AlertCircle className="w-5 h-5 text-blue-400" />
                                                <div className="text-xs">
                                                    <span className="font-bold text-white block mb-0.5 uppercase tracking-wider">Identità Gruppo</span>
                                                    <span className="text-white/40 font-medium">Usa i nomi reali per la sincronizzazione dell'itinerario.</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {formData.participant_names.map((name, index) => (
                                                    <div key={index} className="space-y-2">
                                                        <Label className="text-[9px] font-bold text-white/25 uppercase tracking-widest ml-1">Amico {index + 2}</Label>
                                                        <Input
                                                            value={name}
                                                            onChange={(e) => handleNameChange(index, e.target.value)}
                                                            placeholder={`Nome ${index + 2}`}
                                                            required
                                                            className="bg-white/[0.03] border-white/10 text-white h-11 rounded-xl text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isGroup && (
                                <div className="space-y-2.5 max-w-sm">
                                    <Label htmlFor="budget-solo" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                        Budget Totale (€)
                                    </Label>
                                    <Input
                                        id="budget-solo"
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleChange}
                                        type="number"
                                        placeholder="es. 1500"
                                        required
                                        className="bg-white/[0.03] border-white/10 text-white h-13 rounded-xl"
                                    />
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                <div className="space-y-2.5">
                                    <Label htmlFor="start_date" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                        Inizio Viaggio
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-14 pl-12 justify-start text-left font-normal bg-white/[0.03] border-white/10 text-white rounded-2xl hover:bg-white/5 hover:text-white transition-all relative group",
                                                    !formData.start_date && "text-white/20"
                                                )}
                                            >
                                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-hover:text-blue-400 transition-colors pointer-events-none" />
                                                {formData.start_date ? (
                                                    format(new Date(formData.start_date), "PPP", { locale: it })
                                                ) : (
                                                    <span className="text-white/20">Seleziona data</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 backdrop-blur-xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                                onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                                                initialFocus
                                                locale={it}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="end_date" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">
                                        Fine Viaggio
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-14 pl-12 justify-start text-left font-normal bg-white/[0.03] border-white/10 text-white rounded-2xl hover:bg-white/5 hover:text-white transition-all relative group",
                                                    !formData.end_date && "text-white/20"
                                                )}
                                            >
                                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 group-hover:text-blue-400 transition-colors pointer-events-none" />
                                                {formData.end_date ? (
                                                    format(new Date(formData.end_date), "PPP", { locale: it })
                                                ) : (
                                                    <span className="text-white/20">Seleziona data</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 backdrop-blur-xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.end_date ? new Date(formData.end_date) : undefined}
                                                onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date ? format(date, "yyyy-MM-dd") : "" }))}
                                                initialFocus
                                                locale={it}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Business logic (conditional) */}
                            {formData.trip_intent === 'BUSINESS' && (
                                <div className="bg-slate-900/40 p-10 rounded-[32px] border border-blue-500/10 space-y-10">
                                    <Label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                        Settaggio Orari Lavoro
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    </Label>

                                    <div className="space-y-5">
                                        <p className="text-xs font-bold text-white/60 px-1 uppercase tracking-widest">Seleziona Giorni Operativi</p>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'Monday', label: 'Lun' },
                                                { id: 'Tuesday', label: 'Mar' },
                                                { id: 'Wednesday', label: 'Mer' },
                                                { id: 'Thursday', label: 'Gio' },
                                                { id: 'Friday', label: 'Ven' },
                                                { id: 'Saturday', label: 'Sab' },
                                                { id: 'Sunday', label: 'Dom' }
                                            ].map(day => (
                                                <button
                                                    key={day.id}
                                                    type="button"
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
                                                    className={`w-14 h-14 rounded-2xl text-xs font-black transition-all border flex items-center justify-center uppercase ${(formData.work_days || '').includes(day.id)
                                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                                        : 'bg-white/[0.03] text-white/30 border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Breakdown Inizio</Label>
                                            <Input
                                                id="work_start_time"
                                                name="work_start_time"
                                                value={formData.work_start_time}
                                                onChange={handleChange}
                                                type="time"
                                                className="bg-white/[0.03] border-white/10 text-white h-13 rounded-xl [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Fine Sessione</Label>
                                            <Input
                                                id="work_end_time"
                                                name="work_end_time"
                                                value={formData.work_end_time}
                                                onChange={handleChange}
                                                type="time"
                                                className="bg-white/[0.03] border-white/10 text-white h-13 rounded-xl [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preferences Split */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Must-Have (Essenze)
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-white/5 border border-white/5 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10">
                                                    <AlertCircle className="h-3 w-3" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-white/80 p-4 rounded-2xl shadow-2xl">
                                                <p className="text-xs leading-relaxed">
                                                    <b className="text-emerald-400">Consiglio:</b> Inserisci attività specifiche che l'AI deve assolutamente includere, come "Cerca ramen shop a Shinjuku" o "Pomeriggio di surf".
                                                </p>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Textarea
                                        id="must_have"
                                        name="must_have"
                                        value={formData.must_have}
                                        onChange={handleChange}
                                        placeholder="Cosa non può mancare?"
                                        className="bg-white/[0.03] border-white/10 text-white min-h-[140px] rounded-3xl p-6 focus:ring-blue-500/20 resize-none placeholder:text-white/10"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            Must-Avoid (Limitazioni)
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-white/5 border border-white/5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10">
                                                    <AlertCircle className="h-3 w-3" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-white/80 p-4 rounded-2xl shadow-2xl">
                                                <p className="text-xs leading-relaxed">
                                                    <b className="text-rose-400">Consiglio:</b> Indica preferenze alimentari o attività che odi, come "No musei di storia" o "Evita zone con troppa folla".
                                                </p>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Textarea
                                        id="must_avoid"
                                        name="must_avoid"
                                        value={formData.must_avoid}
                                        onChange={handleChange}
                                        placeholder="Cosa vorresti evitare?"
                                        className="bg-white/[0.03] border-white/10 text-white min-h-[140px] rounded-3xl p-6 focus:ring-blue-500/20 resize-none placeholder:text-white/10"
                                    />
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    variant="premium"
                                    disabled={isGenerating}
                                    className="w-full h-18 text-xl font-black uppercase tracking-[0.15em] rounded-[24px] shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:shadow-[0_25px_50px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all"
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            <span>Sincronizzazione AI...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span>{isGroup ? 'Lancia Proposta di Gruppo' : 'Genera Itinerario Magico'}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Survey;
