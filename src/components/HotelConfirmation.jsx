import React, { useState } from 'react';
import { confirmHotel } from '../api';
import { useToast } from '../context/ToastContext';

const HotelConfirmation = ({ trip, onConfirm }) => {
    const { showToast } = useToast();
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [flightCost, setFlightCost] = useState('');
    const [hotelCost, setHotelCost] = useState('');
    const [arrivalTime, setArrivalTime] = useState('');
    const [returnTime, setReturnTime] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await confirmHotel(trip.id, {
                hotel_name: hotelName,
                hotel_address: hotelAddress,
                flight_cost: parseFloat(flightCost) || 0,
                hotel_cost: parseFloat(hotelCost) || 0,
                arrival_time: arrivalTime,
                return_time: returnTime
            });
            showToast("Logistica confermata! Itinerario generato.", "success");
            onConfirm(); // Refresh trip
        } catch (error) {
            console.error("Error confirming hotel:", error);
            showToast("Errore nella conferma dell'hotel.", "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="section container" style={{ marginTop: '2rem' }}>
            <div className="card" style={{ padding: '2rem', borderTop: '4px solid #ff006e' }}>
                <h3 style={{ color: '#ff006e', textAlign: 'center' }}>Step 2: Conferma Logistica</h3>
                <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
                    Prenota {trip.transport_mode === 'TRAIN' ? 'treni e hotel' : trip.transport_mode === 'CAR' ? 'l’hotel' : 'voli e hotel'} dai link sopra, poi inserisci i dettagli qui.<br />
                    L'AI creerà l'itinerario basandosi sul tuo orario di arrivo e posizione.
                </p>

                <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nome Hotel / Airbnb</label>
                        <input
                            type="text"
                            value={hotelName}
                            onChange={(e) => setHotelName(e.target.value)}
                            placeholder="Es. Hotel Colosseo"
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Indirizzo / Zona</label>
                        <input
                            type="text"
                            value={hotelAddress}
                            onChange={(e) => setHotelAddress(e.target.value)}
                            placeholder="Es. Via dei Fori Imperiali, Roma"
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    {trip.transport_mode !== 'CAR' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Costo {trip.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'} Totale (€)
                            </label>
                            <input
                                type="number"
                                value={flightCost}
                                onChange={(e) => setFlightCost(e.target.value)}
                                placeholder="Es. 250"
                                required
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Costo Hotel Totale (€)</label>
                        <input
                            type="number"
                            value={hotelCost}
                            onChange={(e) => setHotelCost(e.target.value)}
                            placeholder="Es. 500"
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            {trip.transport_mode === 'FLIGHT' ? 'Arrivo Volo (Andata)' :
                                trip.transport_mode === 'TRAIN' ? 'Arrivo Treno (Andata)' : 'Arrivo a Destinazione'}
                        </label>
                        <input
                            type="time"
                            value={arrivalTime}
                            onChange={(e) => setArrivalTime(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                            {trip.transport_mode === 'FLIGHT' ? 'Partenza Volo (Ritorno)' :
                                trip.transport_mode === 'TRAIN' ? 'Partenza Treno (Ritorno)' : 'Partenza per il Ritorno'}
                        </label>
                        <input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn"
                            style={{ background: '#ff006e', color: 'white', border: 'none', padding: '1rem', width: '100%' }}
                        >
                            {loading ? 'Generazione Itinerario...' : 'Salva e Genera Itinerario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HotelConfirmation;
