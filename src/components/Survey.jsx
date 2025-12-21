import React, { useState, useEffect } from 'react';

const Survey = ({ trip, onComplete }) => {
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
        // We need names for everyone EXCEPT the organizer (who is typically User 1 or 'Tu')
        // So we need (count - 1) inputs.
        const needed = Math.max(0, count - 1);

        setFormData(prev => {
            const currentNames = [...prev.participant_names];
            if (currentNames.length < needed) {
                // Add empty slots
                while (currentNames.length < needed) currentNames.push("");
            } else if (currentNames.length > needed) {
                // Trim
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
        <div className="container section">
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h2>Definiamo i dettagli 🎯</h2>
                <p>Aiutaci a costruire il viaggio perfetto per {isGroup ? 'il gruppo' : 'te'}.</p>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
                <form onSubmit={handleSubmit}>

                    {/* Destination & Airport */}
                    <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Destinazione 🌍</label>
                            <input
                                name="destination"
                                value={formData.destination}
                                onChange={handleChange}
                                type="text"
                                placeholder="es. Europa, Giappone..."
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Aeroporto Partenza 🛫</label>
                            <input
                                name="departure_airport"
                                value={formData.departure_airport}
                                onChange={handleChange}
                                type="text"
                                placeholder="es. MXP, FCO"
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                    </div>

                    {/* Group Details */}
                    {isGroup && (
                        <div style={{ marginBottom: '1.5rem', background: '#f9f9f9', padding: '1rem', borderRadius: '12px' }}>
                            <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Budget Totale (€)</label>
                                    <input
                                        name="budget"
                                        value={formData.budget}
                                        onChange={handleChange}
                                        type="number"
                                        placeholder="es. 3000"
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Numero Persone 👥</label>
                                    <input
                                        name="num_people"
                                        value={formData.num_people}
                                        onChange={handleChange}
                                        type="number"
                                        min="2"
                                        max="10"
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                                    />
                                </div>
                            </div>

                            {/* Dynamic Names Inputs */}
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>Chi viene con te?</label>
                            {formData.participant_names.map((name, idx) => (
                                <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => handleNameChange(idx, e.target.value)}
                                        placeholder={`Nome Partecipante ${idx + 2}`}
                                        required
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Solo Details */}
                    {!isGroup && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Budget Totale (€)</label>
                            <input
                                name="budget"
                                value={formData.budget}
                                onChange={handleChange}
                                type="number"
                                placeholder="es. 1500"
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                    )}

                    {/* Dates & Vibe */}
                    <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dal 📅</label>
                            <input
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                type="date"
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Al 📅</label>
                            <input
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                type="date"
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>
                    </div>

                    <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cosa non può mancare? 🏛️</label>
                            <textarea
                                name="must_have"
                                value={formData.must_have}
                                onChange={handleChange}
                                placeholder="es. Musei, Spiagge, Shopping..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cosa vorresti evitare? �</label>
                            <textarea
                                name="must_avoid"
                                value={formData.must_avoid}
                                onChange={handleChange}
                                placeholder="es. Club, Trekking faticosi..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem' }}>
                        {isGroup ? 'Crea il Piano e Invita 🚀' : 'Genera Opzioni ✨'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Survey;
