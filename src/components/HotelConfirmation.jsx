import React, { useState, useRef } from 'react';
import { confirmHotel, extractReceiptData } from '../api';
import { useToast } from '../context/ToastContext';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

const HotelConfirmation = ({ trip, onConfirm, setIsGenerating, setProgress }) => {
    const { showToast } = useToast();
    const [hotelName, setHotelName] = useState('');
    const [hotelAddress, setHotelAddress] = useState('');
    const [flightCost, setFlightCost] = useState('');
    const [hotelCost, setHotelCost] = useState('');
    const [arrivalTime, setArrivalTime] = useState('');
    const [returnTime, setReturnTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(null); // 'hotel' o 'transport'

    const hotelInputRef = useRef(null);
    const transportInputRef = useRef(null);

    const handleExtract = async (file, type) => {
        if (!file) return;
        setExtracting(type);
        showToast(`Lettura ricevuta ${type === 'hotel' ? 'hotel' : 'trasporto'} in corso...`, "info");

        try {
            const data = await extractReceiptData(file, type);
            if (type === 'hotel') {
                if (data.hotel_name) setHotelName(data.hotel_name);
                if (data.hotel_address) setHotelAddress(data.hotel_address);
                if (data.hotel_cost) setHotelCost(data.hotel_cost.toString());
                if (data.arrival_time) setArrivalTime(data.arrival_time);
                if (data.return_time) setReturnTime(data.return_time);
            } else {
                if (data.transport_cost) setFlightCost(data.transport_cost.toString());
                if (data.arrival_time) setArrivalTime(data.arrival_time);
                if (data.return_time) setReturnTime(data.return_time);
            }
            showToast("Dati estratti con successo! Verifica i campi.", "success");
        } catch (error) {
            console.error("Extraction error:", error);
            showToast("Errore durante l'estrazione dei dati. Prova manualmente.", "error");
        } finally {
            setExtracting(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (setIsGenerating) setIsGenerating(true);
        if (setProgress) setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                if (setProgress) {
                    setProgress(prev => {
                        if (prev >= 92) {
                            clearInterval(progressInterval);
                            return 92;
                        }
                        return prev + 2;
                    });
                }
            }, 300);

            await confirmHotel(trip.id, {
                hotel_name: hotelName,
                hotel_address: hotelAddress,
                transport_cost: parseFloat(flightCost) || 0,
                hotel_cost: parseFloat(hotelCost) || 0,
                arrival_time: arrivalTime,
                return_time: returnTime,
                transport_mode: trip.transport_mode
            });

            clearInterval(progressInterval);
            if (setProgress) setProgress(100);

            await new Promise(r => setTimeout(r, 800));

            showToast("Logistica confermata! Itinerario generato.", "success");
            onConfirm();
        } catch (error) {
            console.error("Error confirming hotel:", error);
            showToast("Errore nella conferma dell'hotel.", "error");
        } finally {
            setLoading(false);
            if (setIsGenerating) setIsGenerating(false);
        }
    };


    return (
        <div className="section container" style={{ marginTop: '2rem' }}>
            <div className="card" style={{ padding: '2rem', borderTop: '4px solid #ff006e', borderRadius: '24px', background: 'white' }}>
                <h3 style={{ color: '#ff006e', textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 2: Conferma Logistica</h3>
                <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666', fontSize: '0.9rem' }}>
                    Prenota {trip.transport_mode === 'TRAIN' ? 'treni e hotel' : trip.transport_mode === 'CAR' ? 'l’hotel' : 'voli e hotel'} dai link sopra, poi inserisci i dettagli qui.<br />
                    L'AI creerà l'itinerario basandosi sul tuo orario di arrivo e posizione.
                </p>

                {/* Automation Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            ref={hotelInputRef}
                            onChange={(e) => handleExtract(e.target.files[0], 'hotel')}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => hotelInputRef.current.click()}
                            disabled={extracting === 'hotel'}
                            className="h-12 px-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-blue hover:bg-blue-50 transition-all flex items-center gap-2"
                        >
                            {extracting === 'hotel' ? <Loader2 className="w-4 h-4 animate-spin text-primary-blue" /> : <Upload className="w-4 h-4 text-primary-blue" />}
                            <span className="text-sm font-semibold">Carica prenotazione Hotel</span>
                        </Button>
                    </div>

                    {trip.transport_mode !== 'CAR' && (
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                style={{ display: 'none' }}
                                ref={transportInputRef}
                                onChange={(e) => handleExtract(e.target.files[0], 'transport')}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => transportInputRef.current.click()}
                                disabled={extracting === 'transport'}
                                className="h-12 px-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-blue hover:bg-blue-50 transition-all flex items-center gap-2"
                            >
                                {extracting === 'transport' ? <Loader2 className="w-4 h-4 animate-spin text-primary-blue" /> : <Upload className="w-4 h-4 text-primary-blue" />}
                                <span className="text-sm font-semibold">
                                    Carica prenotazione {trip.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'}
                                </span>
                            </Button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ maxWidth: '650px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>Nome Hotel / Airbnb</label>
                        <input
                            type="text"
                            value={hotelName}
                            onChange={(e) => setHotelName(e.target.value)}
                            placeholder="Es. Hotel Colosseo"
                            required
                            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#ff006e'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>Indirizzo / Zona</label>
                        <input
                            type="text"
                            value={hotelAddress}
                            onChange={(e) => setHotelAddress(e.target.value)}
                            placeholder="Es. Via dei Fori Imperiali, Roma"
                            required
                            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#ff006e'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {trip.transport_mode !== 'CAR' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
                                Costo {trip.transport_mode === 'TRAIN' ? 'Treno' : 'Volo'} Totale (€)
                            </label>
                            <input
                                type="number"
                                value={flightCost}
                                onChange={(e) => setFlightCost(e.target.value)}
                                placeholder="Es. 250"
                                required
                                style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>Costo Hotel Totale (€)</label>
                        <input
                            type="number"
                            value={hotelCost}
                            onChange={(e) => setHotelCost(e.target.value)}
                            placeholder="Es. 500"
                            required
                            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
                            {trip.transport_mode === 'FLIGHT' ? 'Arrivo Volo (Andata)' :
                                trip.transport_mode === 'TRAIN' ? 'Arrivo Treno (Andata)' : 'Arrivo a Destinazione'}
                        </label>
                        <input
                            type="time"
                            value={arrivalTime}
                            onChange={(e) => setArrivalTime(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
                            {trip.transport_mode === 'FLIGHT' ? 'Partenza Volo (Ritorno)' :
                                trip.transport_mode === 'TRAIN' ? 'Partenza Treno (Ritorno)' : 'Partenza per il Ritorno'}
                        </label>
                        <input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1.5rem' }}>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-white font-bold text-lg rounded-2xl shadow-lg transition-all"
                            style={{ background: '#ff006e' }}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generazione Itinerario...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 justify-center">
                                    <Sparkles className="w-5 h-5" />
                                    Salva e Genera Itinerario
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HotelConfirmation;
