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
        <div className="pt-[var(--header-height)] min-h-screen bg-black">
            {/* Header Section */}
            <div className="relative py-24 overflow-hidden border-b border-white/5 bg-zinc-950/20">
                {/* Decorative background glow */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]"></div>
                </div>

                <div className="container relative text-center">
                    <span className="subtle-heading">YOUR JOURNEY</span>
                    <h1 className="text-white text-5xl md:text-6xl font-semibold tracking-tight mb-4 uppercase">I miei Viaggi</h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">La tua cronologia avventure su SplitPlan</p>
                </div>
            </div>

            <div className="container py-16">
                {/* Stats Dashboard */}
                {stats && stats.total_trips > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                        <div className="premium-card !p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-xl">🌍</div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total_trips}</div>
                                <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Viaggi Totali</div>
                            </div>
                        </div>
                        <div className="premium-card !p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-xl">💰</div>
                            <div>
                                <div className="text-2xl font-bold text-white">€{stats.total_spent.toLocaleString()}</div>
                                <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Spesa Totale</div>
                            </div>
                        </div>
                        <div className="premium-card !p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-xl">📅</div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total_days}</div>
                                <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Giorni On the Road</div>
                            </div>
                        </div>
                        <div className="premium-card !p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-xl">🏛️</div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.unique_cities}</div>
                                <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Città Esplorate</div>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-24">
                        <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-gray-500 tracking-widest uppercase text-xs">Recuperando i tuoi ricordi...</p>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="premium-card text-center max-w-lg mx-auto py-16">
                        <div className="text-5xl mb-6">🌍</div>
                        <h2 className="text-white text-2xl font-semibold mb-3">Ancora nessun viaggio?</h2>
                        <p className="text-gray-500 mb-8">
                            Il mondo ti aspetta. Inizia a pianificare la tua prossima avventura ora!
                        </p>
                        <Button onClick={() => navigate('/')} size="lg">Inizia Ora</Button>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Tabs */}
                        <div className="flex bg-white/5 p-1 rounded-sm mb-12 border border-white/5 max-w-md mx-auto">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all ${activeTab === 'active' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                Viaggi Attivi ({activeTrips.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all ${activeTab === 'archived' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                Archivio ({archivedTrips.length})
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentTrips.length === 0 ? (
                                <div className="text-center py-24 text-gray-600 text-[10px] font-bold tracking-widest uppercase">
                                    {activeTab === 'active' ? 'Nessun viaggio in corso.' : 'Ancora nessun viaggio archiviato.'}
                                </div>
                            ) : (
                                currentTrips.slice().reverse().map(trip => (
                                    <div
                                        key={trip.id}
                                        onClick={() => navigate(`/trip/${trip.id}`)}
                                        className="premium-card !p-6 cursor-pointer group hover:translate-x-1 border-white/5"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-sm flex items-center justify-center text-2xl transition-all ${trip.status === 'COMPLETED' ? 'bg-white/5 text-gray-500 grayscale' : 'bg-blue-600 text-white'}`}>
                                                {trip.transport_mode === 'CAR' ? '🚗' : trip.transport_mode === 'TRAIN' ? '🚄' : '✈️'}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-white text-xl font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                                                    {trip.destination || trip.name}
                                                </h4>
                                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                                    <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase flex items-center gap-1.5">
                                                        <span className="opacity-50">📅</span> {new Date(trip.start_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase flex items-center gap-1.5">
                                                        <span className="opacity-50">👥</span> {trip.num_people} {trip.num_people === 1 ? 'persona' : 'persone'}
                                                    </span>
                                                    <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 ${trip.trip_intent === 'BUSINESS' ? 'text-blue-500' : 'text-amber-500'}`}>
                                                        {trip.trip_intent === 'BUSINESS' ? '💼 Lavoro' : '🏖️ Vacanza'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={`px-2.5 py-1 rounded-sm text-[9px] font-black tracking-widest uppercase border transition-colors ${trip.status === 'BOOKED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    trip.status === 'COMPLETED' ? 'bg-white/5 text-gray-500 border-white/5' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}>
                                                    {trip.status === 'BOOKED' ? 'Confermato' : trip.status === 'COMPLETED' ? 'Archiviato' : trip.status}
                                                </div>
                                                <button
                                                    onClick={(e) => handleHideTrip(e, trip.id)}
                                                    className="w-8 h-8 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all"
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
