import React, { useState, useEffect } from 'react';

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
        trip_intent: 'LEISURE' // Default: LEISURE or BUSINESS
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
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Destinazione
                                </label>
                                <input
                                    name="destination"
                                    value={formData.destination}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="es. Europa, Giappone..."
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    {formData.transport_mode === 'FLIGHT' ? 'Aeroporto Partenza' : 'Città di Partenza'}
                                </label>
                                <input
                                    name="departure_airport"
                                    value={formData.departure_airport}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder={formData.transport_mode === 'FLIGHT' ? "es. MXP, FCO" : "es. Milano, Roma"}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Group Details */}
                        {isGroup && (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6 rounded-xl space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-text-main">
                                            Budget Totale (€)
                                        </label>
                                        <input
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder="es. 3000"
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                                     focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                                     transition-all outline-none bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-text-main">
                                            Numero Persone
                                        </label>
                                        <input
                                            name="num_people"
                                            value={formData.num_people}
                                            onChange={handleChange}
                                            type="number"
                                            min="2"
                                            max="10"
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                                     focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                                     transition-all outline-none bg-white"
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
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={`Nome Amico ${idx + 2}`}
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 
                                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                                             transition-all outline-none bg-white text-sm"
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
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Budget Totale (€)
                                </label>
                                <input
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleChange}
                                    type="number"
                                    placeholder="es. 1500"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Dal
                                </label>
                                <input
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Al
                                </label>
                                <input
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Cosa non può mancare?
                                </label>
                                <textarea
                                    name="must_have"
                                    value={formData.must_have}
                                    onChange={handleChange}
                                    placeholder="es. Musei, Spiagge, Shopping..."
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-text-main">
                                    Cosa vorresti evitare?
                                </label>
                                <textarea
                                    name="must_avoid"
                                    value={formData.must_avoid}
                                    onChange={handleChange}
                                    placeholder="es. Club, Trekking faticosi..."
                                    rows="4"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 
                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                             transition-all outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary w-full py-4 text-lg font-bold
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transform active:scale-95 transition-all"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center">
                                    <span className="spinner"></span>
                                    Generazione in corso...
                                </span>
                            ) : (
                                isGroup ? 'Crea il Piano e Invita' : 'Genera Opzioni'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Survey;