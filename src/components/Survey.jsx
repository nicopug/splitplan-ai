import React, { useState, useEffect } from 'react';
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
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Qual è lo scopo del viaggio?
                        </h2>
                        <p className="text-lg text-text-muted">
                            Questo ci aiuterà a personalizzare l'itinerario perfetto per te.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Button
                            variant={formData.trip_intent === 'LEISURE' ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col items-center justify-center h-48 rounded-3xl gap-4 transition-all hover:scale-105",
                                formData.trip_intent === 'LEISURE' ? "shadow-2xl shadow-blue-200" : "hover:border-primary-blue hover:bg-blue-50/50"
                            )}
                            onClick={() => handleIntentSelect('LEISURE')}
                        >
                            <TreePalm className={cn("w-12 h-12", formData.trip_intent === 'LEISURE' ? "text-white" : "text-primary-blue")} />
                            <div className="text-center">
                                <p className="text-xl font-bold">Vacanza</p>
                                <p className={cn("text-xs font-normal", formData.trip_intent === 'LEISURE' ? "text-blue-100" : "text-gray-500")}>Relax, divertimento e scoperta.</p>
                            </div>
                        </Button>

                        <Button
                            variant={formData.trip_intent === 'BUSINESS' ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col items-center justify-center h-48 rounded-3xl gap-4 transition-all hover:scale-105",
                                formData.trip_intent === 'BUSINESS' ? "shadow-2xl shadow-blue-200" : "hover:border-primary-blue hover:bg-blue-50/50"
                            )}
                            onClick={() => handleIntentSelect('BUSINESS')}
                        >
                            <Briefcase className={cn("w-12 h-12", formData.trip_intent === 'BUSINESS' ? "text-white" : "text-primary-blue")} />
                            <div className="text-center">
                                <p className="text-xl font-bold">Lavoro</p>
                                <p className={cn("text-xs font-normal", formData.trip_intent === 'BUSINESS' ? "text-blue-100" : "text-gray-500")}>Efficienza e produttività.</p>
                            </div>
                        </Button>
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
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Qual è il tuo mezzo di trasporto?
                        </h2>
                        <p className="text-lg text-text-muted">
                            Scegli come vuoi raggiungere la tua destinazione.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Button
                            variant={formData.transport_mode === 'CAR' ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col items-center justify-center h-40 rounded-3xl gap-3 transition-all hover:scale-105",
                                formData.transport_mode === 'CAR' ? "shadow-2xl shadow-blue-200" : "hover:border-primary-blue hover:bg-blue-50/50"
                            )}
                            onClick={() => handleTransportSelect('CAR')}
                        >
                            <Car className={cn("w-10 h-10", formData.transport_mode === 'CAR' ? "text-white" : "text-primary-blue")} />
                            <div className="text-center">
                                <p className="text-lg font-bold">Macchina</p>
                                <p className={cn("text-[10px] font-normal", formData.transport_mode === 'CAR' ? "text-blue-100" : "text-gray-500")}>Pedaggi e carburante inclusi.</p>
                            </div>
                        </Button>

                        <Button
                            variant={formData.transport_mode === 'TRAIN' ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col items-center justify-center h-40 rounded-3xl gap-3 transition-all hover:scale-105",
                                formData.transport_mode === 'TRAIN' ? "shadow-2xl shadow-blue-200" : "hover:border-primary-blue hover:bg-blue-50/50"
                            )}
                            onClick={() => handleTransportSelect('TRAIN')}
                        >
                            <Train className={cn("w-10 h-10", formData.transport_mode === 'TRAIN' ? "text-white" : "text-primary-blue")} />
                            <div className="text-center">
                                <p className="text-lg font-bold">Treno</p>
                                <p className={cn("text-[10px] font-normal", formData.transport_mode === 'TRAIN' ? "text-blue-100" : "text-gray-500")}>Link diretti Trainline.</p>
                            </div>
                        </Button>

                        <Button
                            variant={formData.transport_mode === 'FLIGHT' ? 'default' : 'outline'}
                            className={cn(
                                "flex flex-col items-center justify-center h-40 rounded-3xl gap-3 transition-all hover:scale-105",
                                formData.transport_mode === 'FLIGHT' ? "shadow-2xl shadow-blue-200" : "hover:border-primary-blue hover:bg-blue-50/50"
                            )}
                            onClick={() => handleTransportSelect('FLIGHT')}
                        >
                            <Plane className={cn("w-10 h-10", formData.transport_mode === 'FLIGHT' ? "text-white" : "text-primary-blue")} />
                            <div className="text-center">
                                <p className="text-lg font-bold">Volo</p>
                                <p className={cn("text-[10px] font-normal", formData.transport_mode === 'FLIGHT' ? "text-blue-100" : "text-gray-500")}>Migliori offerte Skyscanner.</p>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="section py-8 md:py-12 animate-fade-in">
            <div className="container max-w-4xl">

                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <div className="flex justify-center gap-2 mb-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setStep(0)}
                            className="h-8 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-3"
                        >
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            {formData.trip_intent === 'BUSINESS' ? 'Lavoro' : 'Vacanza'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setStep(1)}
                            className="h-8 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-3"
                        >
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            {formData.transport_mode === 'CAR' ? 'Auto' : formData.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'}
                        </Button>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Definiamo i dettagli
                    </h2>
                    <p className="text-base md:text-lg text-text-muted">
                        Aiutaci a costruire il viaggio perfetto per {isGroup ? 'il gruppo' : 'te'}.
                    </p>
                </div>

                {/* Form Container */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Destination & Airport */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destinazione</Label>
                                <Input
                                    id="destination"
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    placeholder="es. Europa, Giappone..."
                                    required
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="departure_airport">
                                    {formData.transport_mode === 'FLIGHT' ? 'Aeroporto Partenza' : 'Città di Partenza'}
                                </Label>
                                <Input
                                    id="departure_airport"
                                    name="departure_airport"
                                    value={formData.departure_airport}
                                    onChange={handleChange}
                                    placeholder={formData.transport_mode === 'FLIGHT' ? "es. MXP, FCO" : "es. Milano, Roma"}
                                    required
                                    className="h-12"
                                />
                            </div>
                        </div>

                        {/* Group Details */}
                        {isGroup && (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6 rounded-xl space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="group-budget">Budget Totale (€)</Label>
                                        <Input
                                            id="group-budget"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder="es. 3000"
                                            required
                                            className="h-12 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="num_people">Numero Persone</Label>
                                        <Input
                                            id="num_people"
                                            name="num_people"
                                            value={formData.num_people}
                                            onChange={handleChange}
                                            type="number"
                                            min="2"
                                            max="10"
                                            required
                                            className="h-12 bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Names Inputs */}
                                {formData.participant_names.length > 0 && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-bold mb-3 text-primary-blue flex items-center gap-2">
                                            Chi viene con te?
                                            <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px' }}>INFO</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                            {formData.participant_names.map((name, idx) => (
                                                <Input
                                                    key={idx}
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={`Nome Amico ${idx + 2}`}
                                                    required
                                                    className="h-10 bg-white"
                                                />
                                            ))}
                                        </div>

                                        {/* AVVISO NOMI */}
                                        <div style={{
                                            padding: '1rem',
                                            background: '#fff7ed',
                                            borderRadius: '12px',
                                            border: '1px solid #ffedd5',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start'
                                        }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#9a3412' }}>!</span>
                                            <div>
                                                <strong style={{ fontSize: '0.85rem', color: '#9a3412', display: 'block', marginBottom: '2px' }}>ATTENZIONE AI NOMI</strong>
                                                <p style={{ fontSize: '0.8rem', color: '#c2410c', lineHeight: '1.4', margin: 0 }}>
                                                    Inserisci i <b>NOMI</b> con cui i tuoi amici si sono registrati (o si registreranno) su SplitPlan.
                                                    Questo permetterà loro di votare la destinazione dal loro account!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Solo Details */}
                        {!isGroup && (
                            <div className="space-y-2">
                                <Label htmlFor="solo-budget">Budget Totale (€)</Label>
                                <Input
                                    id="solo-budget"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    type="number"
                                    placeholder="es. 1500"
                                    required
                                    className="h-12"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label>Data Partenza</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-12 rounded-xl",
                                                !formData.start_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.start_date ? (
                                                format(new Date(formData.start_date), "PPP", { locale: it })
                                            ) : (
                                                <span>Seleziona data</span>
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
                                            locale={it}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Data Ritorno</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-12 rounded-xl",
                                                !formData.end_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.end_date ? (
                                                format(new Date(formData.end_date), "PPP", { locale: it })
                                            ) : (
                                                <span>Seleziona data</span>
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
                                            locale={it}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Work Hours & Days (Business Only) */}
                        {formData.trip_intent === 'BUSINESS' && (
                            <div className="bg-blue-50 p-6 rounded-xl space-y-6 animate-fade-in border border-blue-100">
                                <label className="block text-sm font-bold text-primary-blue flex items-center gap-2">
                                    Orario e Giorni di Lavoro
                                    <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px' }}>INFO</span>
                                </label>

                                <div className="space-y-3">
                                    <p className="text-xs text-blue-600 font-medium">In quali giorni lavorerai?</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'Monday', label: 'Lun' },
                                            { id: 'Tuesday', label: 'Mar' },
                                            { id: 'Wednesday', label: 'Mer' },
                                            { id: 'Thursday', label: 'Gio' },
                                            { id: 'Friday', label: 'Ven' },
                                            { id: 'Saturday', label: 'Sab' },
                                            { id: 'Sunday', label: 'Dom' }
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
                                                    "rounded-full h-8 px-4",
                                                    (formData.work_days || '').includes(day.id) && "shadow-md bg-primary-blue"
                                                )}
                                            >
                                                {day.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-gray-500">Inizio Lavoro</Label>
                                        <Input
                                            name="work_start_time"
                                            value={formData.work_start_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="h-12 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-gray-500">Fine Lavoro</Label>
                                        <Input
                                            name="work_end_time"
                                            value={formData.work_end_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="h-12 bg-white"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-500 italic">L'AI organizzerà le attività extra solo nei giorni non lavorativi o fuori dagli orari indicati.</p>
                            </div>
                        )}

                        {/* Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-2">
                                <Label>Cosa non può mancare?</Label>
                                <textarea
                                    name="must_have"
                                    value={formData.must_have}
                                    onChange={handleChange}
                                    placeholder="es. Musei, Spiagge, Shopping..."
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none resize-none bg-white text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cosa vorresti evitare?</Label>
                                <textarea
                                    name="must_avoid"
                                    value={formData.must_avoid}
                                    onChange={handleChange}
                                    placeholder="es. Club, Trekking faticosi..."
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none resize-none bg-white text-sm"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-blue-100 mt-4"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Generazione in corso...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    {isGroup ? 'Crea il Piano e Invita' : 'Genera Opzioni'}
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Survey;