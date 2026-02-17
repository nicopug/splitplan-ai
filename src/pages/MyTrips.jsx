import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTrips, hideTrip } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const MyTrips = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showConfirm } = useModal();

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const data = await getUserTrips();
            setTrips(data);
        } catch (error) {
            console.error("Error fetching trips:", error);
            showToast("Errore nel caricamento dei viaggi", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    const handleHideTrip = async (e, tripId) => {
        e.stopPropagation(); // Evita di navigare al trip
        const confirmed = await showConfirm(
            "Nascondi Viaggio",
            "Sei sicuro di voler nascondere questo viaggio dalla tua cronologia? Potrai comunque accedervi se hai il link."
        );

        if (confirmed) {
            try {
                await hideTrip(tripId);
                showToast("Viaggio nascosto", "success");
                fetchTrips();
            } catch (error) {
                showToast("Errore: " + error.message, "error");
            }
        }
    };

    return (
        <div style={{ paddingTop: 'var(--header-height)' }}>
            <div className="mesh-gradient" style={{
                color: 'white',
                padding: '4rem 0',
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
                <div className="container animate-fade-in">
                    <h1 style={{
                        color: 'white',
                        marginBottom: '0.5rem',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '800',
                        fontSize: '3.5rem',
                        textShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>I miei Viaggi</h1>
                    <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>La tua cronologia avventure su SplitPlan</p>
                </div>
            </div>

            <div className="container py-12">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="spinner-large" style={{ margin: '0 auto 1.5rem' }}></div>
                        <p className="text-muted">Recuperando i tuoi ricordi...</p>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="glass-card text-center" style={{ padding: '4rem', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🌍</div>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--primary-blue)' }}>Ancora nessun viaggio?</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                            Il mondo ti aspetta. Inizia a pianificare la tua prossima avventura ora!
                        </p>
                        <button onClick={() => navigate('/')} className="btn-modern-primary">Inizia Ora</button>
                    </div>
                ) : (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            padding: '0 1rem'
                        }}>
                            <h3 style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--text-main)' }}>Cronologia Viaggi</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {trips.length} {trips.length === 1 ? 'viaggio trovato' : 'viaggi trovati'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {trips.slice().reverse().map(trip => (
                                <div
                                    key={trip.id}
                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                    className="trip-row-card"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            background: 'var(--primary-blue)',
                                            borderRadius: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.8rem',
                                            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                                        }}>
                                            {trip.transport_mode === 'CAR' ? '🚗' : trip.transport_mode === 'TRAIN' ? '🚄' : '✈️'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                {trip.destination || trip.name}
                                            </h4>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                <span>📅 {new Date(trip.start_date).toLocaleDateString()}</span>
                                                <span>👥 {trip.num_people} {trip.num_people === 1 ? 'persona' : 'persone'}</span>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    color: trip.trip_intent === 'BUSINESS' ? '#6366f1' : '#f59e0b',
                                                    fontWeight: '700'
                                                }}>
                                                    {trip.trip_intent === 'BUSINESS' ? '💼 Lavoro' : '🏖️ Vacanza'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                fontWeight: '800',
                                                letterSpacing: '0.5px',
                                                background: trip.status === 'BOOKED' ? '#dcfce7' : '#fef9c3',
                                                color: trip.status === 'BOOKED' ? '#166534' : '#854d0e',
                                                textTransform: 'uppercase'
                                            }}>
                                                {trip.status === 'BOOKED' ? 'Confermato' : trip.status}
                                            </div>
                                            <button
                                                onClick={(e) => handleHideTrip(e, trip.id)}
                                                className="hide-btn"
                                                title="Nascondi dalla cronologia"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .trip-row-card {
                    background: white;
                    padding: 1.2rem 1.5rem;
                    border-radius: 24px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .trip-row-card:hover {
                    transform: translateX(8px);
                    border-color: var(--primary-blue);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
                }
                .trip-row-card::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 0;
                    background: var(--primary-blue);
                    transition: width 0.3s ease;
                }
                .trip-row-card:hover::before {
                    width: 4px;
                }
                .hide-btn {
                    background: #f1f5f9;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: bold;
                }
                .hide-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    transform: rotate(90deg);
                }
                .btn-modern-primary {
                    background: var(--primary-blue);
                    color: white;
                    padding: 0.8rem 2rem;
                    border: none;
                    border-radius: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
                }
                .btn-modern-primary:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 32px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.06);
                }
            `}</style>
        </div>
    );
};

export default MyTrips;
