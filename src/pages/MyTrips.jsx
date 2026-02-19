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
                                                background: trip.status === 'COMPLETED' ? '#94a3b8' : 'var(--primary-blue)',
                                                borderRadius: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.8rem',
                                                boxShadow: trip.status === 'COMPLETED' ? 'none' : '0 8px 16px rgba(37, 99, 235, 0.2)'
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
                                                    background: trip.status === 'BOOKED' ? '#dcfce7' :
                                                        trip.status === 'COMPLETED' ? '#f1f5f9' : '#fef9c3',
                                                    color: trip.status === 'BOOKED' ? '#166534' :
                                                        trip.status === 'COMPLETED' ? '#475569' : '#854d0e',
                                                    textTransform: 'uppercase'
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
                    background: white;
                    padding: 1.5rem;
                    border-radius: 24px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.3s ease;
                }
                .stat-card:hover {
                    transform: translateY(-5px);
                }
                .stat-icon {
                    font-size: 2rem;
                    background: #f8fafc;
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
                    color: var(--text-main);
                }
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .tabs-container {
                    display: flex;
                    background: #f1f5f9;
                    padding: 0.4rem;
                    border-radius: 16px;
                    margin-bottom: 2rem;
                    gap: 0.4rem;
                }
                .tab-btn {
                    flex: 1;
                    padding: 0.8rem;
                    border: none;
                    background: transparent;
                    border-radius: 12px;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: white;
                    color: var(--primary-blue);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }

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
