import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTrips, hideTrip, getUserStats } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';

const MyTrips = () => {
    const [trips, setTrips] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showConfirm } = useModal();

    const fetchTripsAndStats = async () => {
        setLoading(true);
        try {
            const [tripsData, statsData] = await Promise.all([
                getUserTrips(),
                getUserStats()
            ]);
            setTrips(tripsData);
            setStats(statsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            showToast("Errore nel caricamento dei dati", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTripsAndStats();
    }, []);

    const handleHideTrip = async (e, tripId) => {
        e.stopPropagation();
        const confirmed = await showConfirm(
            "Nascondi Viaggio",
            "Sei sicuro di voler nascondere questo viaggio dalla tua cronologia? Potrai comunque accedervi se hai il link."
        );

        if (confirmed) {
            try {
                await hideTrip(tripId);
                showToast("Viaggio nascosto", "success");
                fetchTripsAndStats();
            } catch (error) {
                showToast("Errore: " + error.message, "error");
            }
        }
    };

    const activeTrips = trips.filter(t => t.status !== 'COMPLETED');
    const archivedTrips = trips.filter(t => t.status === 'COMPLETED');
    const currentTrips = activeTab === 'active' ? activeTrips : archivedTrips;

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
                        textShadow: '0 4px 12px rgba(0, 58, 133, 0.1)'
                    }}>I miei Viaggi</h1>
                    <p style={{ opacity: 1, fontSize: '1.1rem', color: 'white' }}>La tua cronologia avventure su SplitPlan</p>
                </div>
            </div>

            <div className="container py-12">
                {/* Stats Dashboard */}
                {stats && stats.total_trips > 0 && (
                    <div className="stats-dashboard animate-slide-up" style={{ marginBottom: '3rem' }}>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">🌍</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.total_trips}</span>
                                    <span className="stat-label">Viaggi Totali</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">💰</div>
                                <div className="stat-info">
                                    <span className="stat-value">€{stats.total_spent.toLocaleString()}</span>
                                    <span className="stat-label">Spesa Totale (EUR)</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📅</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.total_days}</span>
                                    <span className="stat-label">Giorni On the Road</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🏛️</div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.unique_cities}</span>
                                    <span className="stat-label">Città Esplorate</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                        {/* Tabs */}
                        <div className="tabs-container">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                            >
                                Viaggi Attivi ({activeTrips.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
                            >
                                Archivio ({archivedTrips.length})
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentTrips.length === 0 ? (
                                <div className="text-center py-12 text-muted">
                                    {activeTab === 'active' ? 'Nessun viaggio in corso.' : 'Ancora nessun viaggio archiviato.'}
                                </div>
                            ) : (
                                currentTrips.slice().reverse().map(trip => (
                                    <div
                                        key={trip.id}
                                        onClick={() => navigate(`/trip/${trip.id}`)}
                                        className="trip-row-card"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                background: trip.status === 'COMPLETED'
                                                    ? 'rgba(139,92,246,0.15)'
                                                    : 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
                                                borderRadius: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.8rem',
                                                boxShadow: trip.status === 'COMPLETED' ? 'none' : '0 0 20px rgba(139,92,246,0.4)'
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
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '800',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase',
                                                    background: trip.status === 'BOOKED'
                                                        ? 'rgba(16,185,129,0.15)'
                                                        : trip.status === 'COMPLETED'
                                                            ? 'rgba(139,92,246,0.12)'
                                                            : 'rgba(245,158,11,0.15)',
                                                    color: trip.status === 'BOOKED'
                                                        ? '#34d399'
                                                        : trip.status === 'COMPLETED'
                                                            ? '#a78bfa'
                                                            : '#fbbf24',
                                                    border: `1px solid ${trip.status === 'BOOKED'
                                                            ? 'rgba(16,185,129,0.3)'
                                                            : trip.status === 'COMPLETED'
                                                                ? 'rgba(139,92,246,0.25)'
                                                                : 'rgba(245,158,11,0.3)'
                                                        }`
                                                }}>
                                                    {trip.status === 'BOOKED' ? 'Confermato' :
                                                        trip.status === 'COMPLETED' ? 'Archiviato' : trip.status}
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
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .stat-card {
                    background: #0d0d18;
                    padding: 1.5rem;
                    border-radius: 20px;
                    border: 1px solid rgba(139,92,246,0.15);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: all 0.3s ease;
                }
                .stat-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(139,92,246,0.4);
                    box-shadow: 0 0 20px rgba(139,92,246,0.1);
                }
                .stat-icon {
                    font-size: 1.8rem;
                    background: rgba(139,92,246,0.1);
                    border: 1px solid rgba(139,92,246,0.2);
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                }
                .stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .stat-value {
                    font-size: 1.4rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #a78bfa, #22d3ee);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: #7b7b9a;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-top: 2px;
                }

                .tabs-container {
                    display: flex;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(139,92,246,0.12);
                    padding: 0.35rem;
                    border-radius: 14px;
                    margin-bottom: 2rem;
                    gap: 0.35rem;
                }
                .tab-btn {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    background: transparent;
                    border-radius: 10px;
                    font-weight: 700;
                    color: #7b7b9a;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                    font-size: 0.9rem;
                }
                .tab-btn.active {
                    background: rgba(139,92,246,0.18);
                    color: #a78bfa;
                    box-shadow: 0 0 12px rgba(139,92,246,0.15);
                }

                .trip-row-card {
                    background: #0d0d18;
                    padding: 1.2rem 1.5rem;
                    border-radius: 20px;
                    border: 1px solid rgba(139,92,246,0.12);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .trip-row-card:hover {
                    transform: translateX(6px);
                    border-color: rgba(139,92,246,0.4);
                    box-shadow: 0 0 20px rgba(139,92,246,0.1);
                }
                .trip-row-card::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 0;
                    background: linear-gradient(180deg, #8b5cf6, #22d3ee);
                    transition: width 0.3s ease;
                    border-radius: 0 2px 2px 0;
                }
                .trip-row-card:hover::before {
                    width: 3px;
                }
                .hide-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #4a4a6e;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                    font-weight: bold;
                }
                .hide-btn:hover {
                    background: rgba(239,68,68,0.15);
                    border-color: rgba(239,68,68,0.3);
                    color: #f87171;
                    transform: rotate(90deg);
                }
                .btn-modern-primary {
                    background: linear-gradient(135deg, #8b5cf6, #22d3ee);
                    color: white;
                    padding: 0.8rem 2rem;
                    border: none;
                    border-radius: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 0 20px rgba(139,92,246,0.3);
                }
                .btn-modern-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 35px rgba(139,92,246,0.5);
                }
                .glass-card {
                    background: rgba(13,13,24,0.85);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(139,92,246,0.2);
                    border-radius: 24px;
                    box-shadow: 0 0 40px rgba(139,92,246,0.08);
                }
            `}</style>
        </div>
    );
};

export default MyTrips;
