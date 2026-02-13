import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';

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
                        <div
                            onClick={() => handleIntentSelect('LEISURE')}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all cursor-pointer border border-white/10 hover:border-blue-500/50 hover:bg-white/10 group text-center"
                        >
                            <div className="text-6xl mb-4 grayscale group-hover:grayscale-0 transition-all">🏖️</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Vacanza</h3>
                            <p className="text-sm text-white/50">Relax, divertimento e scoperta. L'AI creerà un itinerario bilanciato tra svago e cultura.</p>
                        </div>

                        {/* Business */}
                        <div
                            onClick={() => handleIntentSelect('BUSINESS')}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all cursor-pointer border border-white/10 hover:border-blue-500/50 hover:bg-white/10 group text-center"
                        >
                            <div className="text-6xl mb-4 grayscale group-hover:grayscale-0 transition-all">💼</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Lavoro</h3>
                            <p className="text-sm text-white/50">Efficienza e produttività. L'AI ottimizzerà per coworking, Wi-Fi e pasti veloci.</p>
                        </div>
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
                        <div
                            onClick={() => handleTransportSelect('CAR')}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all cursor-pointer border border-white/10 hover:border-blue-500/50 hover:bg-white/10 group text-center"
                        >
                            <div className="text-4xl mb-3">🚗</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Macchina</h3>
                            <p className="text-sm text-white/50">Usa la tua auto (stimiamo noi pedaggi e carburante).</p>
                        </div>

                        {/* TRAIN */}
                        <div
                            onClick={() => handleTransportSelect('TRAIN')}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all cursor-pointer border border-white/10 hover:border-blue-500/50 hover:bg-white/10 group text-center"
                        >
                            <div className="text-4xl mb-3">🚄</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Treno</h3>
                            <p className="text-sm text-white/50">Viaggia sui binari con i link pronti di Trainline.</p>
                        </div>

                        {/* FLIGHT */}
                        <div
                            onClick={() => handleTransportSelect('FLIGHT')}
                            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl transition-all cursor-pointer border border-white/10 hover:border-blue-500/50 hover:bg-white/10 group text-center"
                        >
                            <div className="text-4xl mb-3">✈️</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Volo</h3>
                            <p className="text-sm text-white/50">Decolla verso la meta con le migliori offerte Skyscanner.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="section py-8 md:py-12 animate-fade-in">
            <div className="container max-w-4xl">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center gap-3 mb-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(0)}
                            className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full border border-white/10 text-[10px] h-8"
                        >
                            ← Cambia Scopo ({formData.trip_intent === 'BUSINESS' ? 'Lavoro' : 'Vacanza'})
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(1)}
                            className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full border border-white/10 text-[10px] h-8"
                        >
                            ← Cambia Mezzo ({formData.transport_mode === 'CAR' ? 'Auto' : formData.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'})
                        </Button>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-3 text-white tracking-tight">
                        Definiamo i dettagli
                    </h2>
                    <p className="text-lg text-white/60">
                        Aiutaci a costruire il viaggio perfetto per {isGroup ? 'il gruppo' : 'te'}.
                    </p>
                </div>

                {/* Form Container */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-[32px] p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50" />
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Destination & Airport */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label htmlFor="destination" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                    Destinazione
                                </Label>
                                <Input
                                    id="destination"
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="es. Europa, Giappone..."
                                    required
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="departure_airport" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                    {formData.transport_mode === 'FLIGHT' ? 'Aeroporto Partenza' : 'Città di Partenza'}
                                </Label>
                                <Input
                                    id="departure_airport"
                                    name="departure_airport"
                                    value={formData.departure_airport}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder={formData.transport_mode === 'FLIGHT' ? "es. MXP, FCO" : "es. Milano, Roma"}
                                    required
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        {/* Group Details */}
                        {isGroup && (
                            <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="budget" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                            Budget Totale (€)
                                        </Label>
                                        <Input
                                            id="budget"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder="es. 3000"
                                            required
                                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="num_people" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                            Numero Persone
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
                                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Names Inputs */}
                                {formData.participant_names.length > 0 && (
                                    <div className="animate-fade-in space-y-4">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 flex items-center gap-2">
                                            Chi viene con te?
                                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tighter border border-blue-500/20">INFO</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {formData.participant_names.map((name, idx) => (
                                                <Input
                                                    key={idx}
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={`Nome Amico ${idx + 2}`}
                                                    required
                                                    className="bg-white/5 border-white/10 text-white h-11 rounded-xl text-sm"
                                                />
                                            ))}
                                        </div>

                                        {/* AVVISO NOMI */}
                                        <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex gap-4 items-start">
                                            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                                            <div>
                                                <strong className="text-xs font-bold text-orange-300 uppercase tracking-wider block mb-1">Attenzione ai nomi</strong>
                                                <p className="text-xs text-orange-200/70 leading-relaxed">
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
                                <Label htmlFor="budget-solo" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
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
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label htmlFor="start_date" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                    Dal
                                </Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50 [color-scheme:dark]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                                    Al
                                </Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Work Hours & Days (Business Only) */}
                        {formData.trip_intent === 'BUSINESS' && (
                            <div className="bg-white/5 p-8 rounded-[24px] border border-white/5 space-y-8 animate-fade-in">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 flex items-center gap-2">
                                    Orario e Giorni di Lavoro
                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-tighter border border-blue-500/20">INFO</span>
                                </label>

                                <div className="space-y-4">
                                    <p className="text-xs text-white/60 font-medium px-1">In quali giorni lavorerai?</p>
                                    <div className="flex flex-wrap gap-2 px-1">
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
                                                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${(formData.work_days || '').includes(day.id)
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white'
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="work_start_time" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 block">
                                            Inizio Lavoro
                                        </Label>
                                        <Input
                                            id="work_start_time"
                                            name="work_start_time"
                                            value={formData.work_start_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="work_end_time" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 block">
                                            Fine Lavoro
                                        </Label>
                                        <Input
                                            id="work_end_time"
                                            name="work_end_time"
                                            value={formData.work_end_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-blue-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-400 font-medium italic bg-blue-500/10 p-4 rounded-xl border border-blue-500/10">L'AI organizzerà le attività extra solo nei giorni non lavorativi o fuori dagli orari indicati.</p>
                            </div>
                        )}

                        {/* Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label htmlFor="must_have" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 block">
                                    Cosa non può mancare?
                                </Label>
                                <Textarea
                                    id="must_have"
                                    name="must_have"
                                    value={formData.must_have}
                                    onChange={handleChange}
                                    placeholder="es. Musei, Spiagge, Shopping..."
                                    rows="4"
                                    className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-blue-500/50 resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="must_avoid" className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 block">
                                    Cosa vorresti evitare?
                                </Label>
                                <Textarea
                                    id="must_avoid"
                                    name="must_avoid"
                                    value={formData.must_avoid}
                                    onChange={handleChange}
                                    placeholder="es. Club, Trekking faticosi..."
                                    rows="4"
                                    className="bg-white/5 border-white/10 text-white rounded-xl focus:ring-blue-500/50 resize-none"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="premium"
                            size="xl"
                            className="w-full"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center">
                                    <span className="spinner mr-2"></span>
                                    Generazione in corso...
                                </span>
                            ) : (
                                isGroup ? 'Crea il Piano e Invita' : 'Genera Opzioni'
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Survey;