import React, { useState, useEffect } from 'react';

const Survey = ({ trip, onComplete, isGenerating }) => {
    const isGroup = trip.trip_type === 'GROUP';

    const [formData, setFormData] = useState({
        destination: '',
        departure_airport: '',
        budget: '',
        num_people: isGroup ? 2 : 1,
        start_date: '',
        end_date: '',
        must_have: '',
        must_avoid: '',
        participant_names: []
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    return (
        <div className="section py-8 md:py-12">
            <div className="container max-w-4xl">

                {/* Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Definiamo i dettagli 🎯
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
                                    Destinazione 🌍
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
                                    Aeroporto Partenza 🛫
                                </label>
                                <input
                                    name="departure_airport"
                                    value={formData.departure_airport}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="es. MXP, FCO"
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
                                            Numero Persone 👥
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
                                    <div>
                                        <label className="block text-sm font-bold mb-3 text-primary-blue">
                                            Chi viene con te?
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {formData.participant_names.map((name, idx) => (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                                    placeholder={`Nome Partecipante ${idx + 2}`}
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 
                                                             focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-20
                                                             transition-all outline-none bg-white text-sm"
                                                />
                                            ))}
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
                                    Dal 📅
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
                                    Al 📅
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
                                    Cosa non può mancare? 🛍️
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
                                    Cosa vorresti evitare? 🚫
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
                                isGroup ? 'Crea il Piano e Invita 🚀' : 'Genera Opzioni ✨'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Survey;