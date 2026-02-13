import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

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
                        {/* Leisure */}
                        <div
                            onClick={() => handleIntentSelect('LEISURE')}
                            className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-accent-green group text-center"
                        >
                            <div className="text-6xl mb-4">🏖️</div>
                            <h3 className="text-xl font-bold mb-2">Vacanza</h3>
                            <p className="text-sm text-gray-500">Relax, divertimento e scoperta. L'AI creerà un itinerario bilanciato tra svago e cultura.</p>
                        </div>

                        {/* Business */}
                        <div
                            onClick={() => handleIntentSelect('BUSINESS')}
                            className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-blue group text-center"
                        >
                            <div className="text-6xl mb-4">💼</div>
                            <h3 className="text-xl font-bold mb-2">Lavoro</h3>
                            <p className="text-sm text-gray-500">Efficienza e produttività. L'AI ottimizzerà per coworking, Wi-Fi e pasti veloci.</p>
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
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                            Qual è il tuo mezzo di trasporto?
                        </h2>
                        <p className="text-lg text-text-muted">
                            Scegli come vuoi raggiungere la tua destinazione.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* CAR */}
                        <div
                            onClick={() => handleTransportSelect('CAR')}
                            className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-blue group text-center"
                        >
                            <h3 className="text-xl font-bold mb-2">Macchina</h3>
                            <p className="text-sm text-gray-500">Usa la tua auto (stimiamo noi pedaggi e carburante).</p>
                        </div>

                        {/* TRAIN */}
                        <div
                            onClick={() => handleTransportSelect('TRAIN')}
                            className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-secondary-teal group text-center"
                        >
                            <h3 className="text-xl font-bold mb-2">Treno</h3>
                            <p className="text-sm text-gray-500">Viaggia sui binari con i link pronti di Trainline.</p>
                        </div>

                        {/* FLIGHT */}
                        <div
                            onClick={() => handleTransportSelect('FLIGHT')}
                            className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-accent-orange group text-center"
                        >
                            <h3 className="text-xl font-bold mb-2">Volo</h3>
                            <p className="text-sm text-gray-500">Decolla verso la meta con le migliori offerte Skyscanner.</p>
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
                <div className="text-center mb-8 md:mb-12">
                    <button
                        onClick={() => setStep(0)}
                        style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', cursor: 'pointer' }}
                    >
                        ← Cambia Scopo ({formData.trip_intent === 'BUSINESS' ? 'Lavoro' : 'Vacanza'})
                    </button>
                    <button
                        onClick={() => setStep(1)}
                        style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', cursor: 'pointer', marginLeft: '8px' }}
                    >
                        ← Cambia Mezzo ({formData.transport_mode === 'CAR' ? 'Auto' : formData.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'})
                    </button>
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
                            <div>
                                <Label htmlFor="destination" className="font-bold mb-2 block">
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
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="departure_airport" className="font-bold mb-2 block">
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
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        {/* Group Details */}
                        {isGroup && (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6 rounded-xl space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="budget" className="font-bold mb-2 block">
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
                                            className="bg-white"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="num_people" className="font-bold mb-2 block">
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
                                            className="bg-white"
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
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={`Nome Amico ${idx + 2}`}
                                                    required
                                                    className="bg-white text-sm"
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
                            <div>
                                <Label htmlFor="budget-solo" className="font-bold mb-2 block">
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
                                    className="bg-white"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <Label htmlFor="start_date" className="font-bold mb-2 block">
                                    Dal
                                </Label>
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date" className="font-bold mb-2 block">
                                    Al
                                </Label>
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="bg-white"
                                />
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
                                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${(formData.work_days || '').includes(day.id)
                                                    ? 'bg-primary-blue text-white shadow-md scale-105'
                                                    : 'bg-white text-gray-400 border border-gray-200 hover:border-primary-blue'
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="work_start_time" className="text-xs font-bold mb-1 text-gray-500 uppercase block">
                                            Inizio Lavoro
                                        </Label>
                                        <Input
                                            id="work_start_time"
                                            name="work_start_time"
                                            value={formData.work_start_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="work_end_time" className="text-xs font-bold mb-1 text-gray-500 uppercase block">
                                            Fine Lavoro
                                        </Label>
                                        <Input
                                            id="work_end_time"
                                            name="work_end_time"
                                            value={formData.work_end_time}
                                            onChange={handleChange}
                                            type="time"
                                            className="bg-white text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-500 italic">L'AI organizzerà le attività extra solo nei giorni non lavorativi o fuori dagli orari indicati.</p>
                            </div>
                        )}

                        {/* Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <Label htmlFor="must_have" className="font-bold mb-2 block">
                                    Cosa non può mancare?
                                </Label>
                                <Textarea
                                    id="must_have"
                                    name="must_have"
                                    value={formData.must_have}
                                    onChange={handleChange}
                                    placeholder="es. Musei, Spiagge, Shopping..."
                                    rows="4"
                                    className="bg-white resize-none"
                                />
                            </div>
                            <div>
                                <Label htmlFor="must_avoid" className="font-bold mb-2 block">
                                    Cosa vorresti evitare?
                                </Label>
                                <Textarea
                                    id="must_avoid"
                                    name="must_avoid"
                                    value={formData.must_avoid}
                                    onChange={handleChange}
                                    placeholder="es. Club, Trekking faticosi..."
                                    rows="4"
                                    className="bg-white resize-none"
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