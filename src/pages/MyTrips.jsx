import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTrips, hideTrip, getUserStats } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { Button } from '../components/ui/button';

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
        <div className="pt-[var(--header-height)] min-h-screen bg-base">
            {/* Header Section */}
            <div className="relative py-24 overflow-hidden border-b border-border-subtle bg-surface">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-30">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--accent-primary-20)_0%,transparent_70%)]"></div>
                </div>

                <div className="container relative text-center space-y-4">
                    <span className="subtle-heading">YOUR JOURNEY</span>
                    <h1 className="text-primary text-5xl md:text-6xl font-semibold tracking-tight uppercase">I miei Viaggi</h1>
                    <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">La tua cronologia avventure su SplitPlan</p>
                </div>
            </div>

            <div className="container py-16">
                {/* Stats Dashboard */}
                {stats && stats.total_trips > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        <div className="premium-card !p-8 flex items-center gap-4 bg-card border-border-subtle hover:border-border-medium transition-all">
                            <div className="w-14 h-14 rounded-sm bg-muted/20 border border-border-subtle flex items-center justify-center text-2xl shadow-inner-white">🌍</div>
                            <div>
                                <div className="text-3xl font-black text-primary">{stats.total_trips}</div>
                                <div className="text-[10px] font-black text-subtle tracking-widest uppercase mb-1">Viaggi Totali</div>
                            </div>
                        </div>
                        <div className="premium-card !p-8 flex items-center gap-4 bg-card border-border-subtle hover:border-border-medium transition-all">
                            <div className="w-14 h-14 rounded-sm bg-muted/20 border border-border-subtle flex items-center justify-center text-2xl shadow-inner-white">💰</div>
                            <div>
                                <div className="text-3xl font-black text-primary">€{stats.total_spent.toLocaleString()}</div>
                                <div className="text-[10px] font-black text-subtle tracking-widest uppercase mb-1">Spesa Totale</div>
                            </div>
                        </div>
                        <div className="premium-card !p-8 flex items-center gap-4 bg-card border-border-subtle hover:border-border-medium transition-all">
                            <div className="w-14 h-14 rounded-sm bg-muted/20 border border-border-subtle flex items-center justify-center text-2xl shadow-inner-white">📅</div>
                            <div>
                                <div className="text-3xl font-black text-primary">{stats.total_days}</div>
                                <div className="text-[10px] font-black text-subtle tracking-widest uppercase mb-1">Giorni On the Road</div>
                            </div>
                        </div>
                        <div className="premium-card !p-8 flex items-center gap-4 bg-card border-border-subtle hover:border-border-medium transition-all">
                            <div className="w-14 h-14 rounded-sm bg-muted/20 border border-border-subtle flex items-center justify-center text-2xl shadow-inner-white">🏛️</div>
                            <div>
                                <div className="text-3xl font-black text-primary">{stats.unique_cities}</div>
                                <div className="text-[10px] font-black text-subtle tracking-widest uppercase mb-1">Città Esplorate</div>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-24 space-y-6">
                        <div className="w-12 h-12 border-4 border-muted/20 border-t-accent-primary rounded-full animate-spin mx-auto"></div>
                        <p className="text-muted tracking-widest uppercase text-[10px] font-black">Recuperando i tuoi ricordi...</p>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="premium-card !p-20 text-center max-w-lg mx-auto flex flex-col items-center gap-6 bg-card border-border-subtle shadow-2xl">
                        <div className="text-6xl">🌍</div>
                        <div className="space-y-4">
                            <h2 className="text-primary text-3xl font-semibold uppercase tracking-tight">Ancora nessun viaggio?</h2>
                            <p className="text-muted leading-relaxed">
                                Il mondo ti aspetta. Inizia a pianificare la tua prossima avventura ora!
                            </p>
                        </div>
                        <Button onClick={() => navigate('/')} size="lg" className="h-14 px-10 bg-primary-blue hover:bg-primary-blue-light transition-all shadow-lg shadow-primary-blue/20">Inizia Ora</Button>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Tabs */}
                        <div className="flex bg-muted/20 p-1 rounded-sm mb-16 border border-border-subtle max-w-md mx-auto shadow-inner-white">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase rounded-sm transition-all ${activeTab === 'active' ? 'bg-primary-blue text-white shadow-xl' : 'text-subtle hover:text-primary'}`}
                            >
                                Viaggi Attivi ({activeTrips.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase rounded-sm transition-all ${activeTab === 'archived' ? 'bg-primary-blue text-white shadow-xl' : 'text-subtle hover:text-primary'}`}
                            >
                                Archivio ({archivedTrips.length})
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentTrips.length === 0 ? (
                                <div className="text-center py-24 text-muted text-[10px] font-black tracking-widest uppercase italic bg-surface/30 border border-dashed border-border-subtle rounded-sm">
                                    {activeTab === 'active' ? 'Nessun viaggio in corso.' : 'Ancora nessun viaggio archiviato.'}
                                </div>
                            ) : (
                                currentTrips.slice().reverse().map(trip => (
                                    <div
                                        key={trip.id}
                                        onClick={() => navigate(`/trip/${trip.id}`)}
                                        className="premium-card !p-8 cursor-pointer group hover:translate-x-1 bg-card border-border-subtle hover:border-primary-blue/30 transition-all shadow-md hover:shadow-xl"
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className={`w-16 h-16 rounded-sm flex items-center justify-center text-3xl transition-all shadow-inner-white ${trip.status === 'COMPLETED' ? 'bg-muted/30 text-subtle grayscale' : 'bg-primary-blue text-white'}`}>
                                                {trip.transport_mode === 'CAR' ? '🚗' : trip.transport_mode === 'TRAIN' ? '🚄' : '✈️'}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h4 className="text-primary text-2xl font-semibold uppercase tracking-tight group-hover:text-primary-blue transition-colors">
                                                    {trip.destination || trip.name}
                                                </h4>
                                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                                    <span className="text-[11px] font-black text-muted tracking-widest uppercase flex items-center gap-1.5">
                                                        <span className="text-primary-blue opacity-70">📅</span> {new Date(trip.start_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[11px] font-black text-muted tracking-widest uppercase flex items-center gap-1.5">
                                                        <span className="text-primary-blue opacity-70">👥</span> {trip.num_people} {trip.num_people === 1 ? 'persona' : 'persone'}
                                                    </span>
                                                    <span className={`text-[11px] font-black tracking-widest uppercase flex items-center gap-1.5 ${trip.trip_intent === 'BUSINESS' ? 'text-blue-500' : 'text-amber-500'}`}>
                                                        {trip.trip_intent === 'BUSINESS' ? '💼 Lavoro' : '🏖️ Vacanza'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className={`px-4 py-1.5 rounded-sm text-[10px] font-black tracking-widest uppercase border transition-all ${trip.status === 'BOOKED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    trip.status === 'COMPLETED' ? 'bg-muted/20 text-subtle border-border-subtle' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}>
                                                    {trip.status === 'BOOKED' ? 'Confermato' : trip.status === 'COMPLETED' ? 'Archiviato' : trip.status}
                                                </div>
                                                <button
                                                    onClick={(e) => handleHideTrip(e, trip.id)}
                                                    className="w-10 h-10 rounded-sm bg-muted/10 border border-border-subtle flex items-center justify-center text-subtle hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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
        </div>
    );
};

export default MyTrips;
