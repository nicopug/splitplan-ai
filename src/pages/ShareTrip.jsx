import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSharedTrip, joinTrip } from '../api';
import Timeline from '../components/Timeline';
import Map from '../components/Map';
import Finance from '../components/Finance';
import Photos from '../components/Photos';

const ShareTrip = ({ isJoinMode = false }) => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('TRIP');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user from localStorage", e);
            }
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Recuperiamo i dati base del viaggio condiviso
                const res = await getSharedTrip(token);
                console.log("[DEBUG] Shared Trip Data:", res);

                // 2. SE SIAMO IN MODALITÀ JOIN
                if (isJoinMode) {
                    const storedUser = localStorage.getItem('token');

                    if (storedUser) {
                        // L'utente è loggato, proviamo a farlo unire formalmente
                        try {
                            const joinRes = await joinTrip(token);
                            if (joinRes.trip_id) {
                                navigate(`/trip/${joinRes.trip_id}`);
                                return;
                            }
                        } catch (joinErr) {
                            console.warn("Join failed, maybe names don't match:", joinErr);
                            // Se il join fallisce (es. nomi diversi), mostriamo comunque il viaggio 
                            // ma resterà in sola lettura nella dashboard.
                            navigate(`/trip/${res.trip.id}`);
                            return;
                        }
                    } else {
                        // L'utente NON è loggato, lo portiamo alla pagina Auth con un messaggio
                        navigate('/auth', { state: { message: "Accedi o Registrati per unirti al viaggio e votare!", redirectTo: `/trip/join/${token}` } });
                        return;
                    }
                }

                setData(res);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, isJoinMode, navigate]);

    const banner = (
        <div className="bg-accent-orange text-white py-3 text-center font-black text-[11px] tracking-[0.2em] uppercase shadow-lg shadow-accent-orange/20 fixed top-[var(--header-height,0)] left-0 right-0 z-[100] animate-fade-in">
            Sei in modalità Sola Lettura.
        </div>
    );

    if (loading) return (
        <div className="pt-[var(--header-height,60px)] min-h-screen bg-base flex flex-col items-center justify-center gap-6">
            {banner}
            <div className="w-12 h-12 border-4 border-muted/20 border-t-accent-primary rounded-full animate-spin"></div>
            <p className="text-muted tracking-widest uppercase text-[10px] font-black">Caricamento viaggio...</p>
        </div>
    );

    if (error || !data) return (
        <div className="pt-[var(--header-height,60px)] min-h-screen bg-base content-center">
            {banner}
            <div className="container max-w-lg mx-auto text-center space-y-8 animate-fade-in">
                <div className="space-y-4">
                    <h2 className="text-red-500 text-3xl font-black uppercase tracking-tight">Oops! Qualcosa è andato storto</h2>
                    <p className="text-muted text-lg">{error || "Il link potrebbe essere scaduto o non valido."}</p>
                </div>

                {error && (
                    <div className="p-6 bg-surface border border-border-subtle rounded-sm text-[11px] font-mono text-left overflow-x-auto whitespace-pre">
                        <strong className="text-primary block mb-2 uppercase tracking-widest">Dettaglio Tecnico:</strong>
                        <span className="text-muted">{error}</span>
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <button onClick={() => window.location.reload()} className="h-14 px-10 bg-surface border border-border-subtle text-primary font-black text-[10px] tracking-widest uppercase rounded-sm hover:bg-elevated transition-all">Riprova</button>
                    <Link to="/" className="h-14 px-10 bg-primary-blue text-white font-black text-[10px] tracking-widest uppercase rounded-sm hover:bg-primary-blue-light transition-all shadow-lg shadow-primary-blue/20">Home</Link>
                </div>
            </div>
        </div>
    );

    try {
        const { trip = {}, itinerary = [], expenses = [], photos = [], participants = [] } = data;
        const organizerName = (participants && participants.length > 0) ? participants[0].name : 'un utente';

        return (
            <div className="bg-base min-h-screen pb-20 pt-[calc(var(--header-height,60px)+3rem)]">
                {banner}

                <div className="border-b border-border-subtle py-16 text-center bg-surface relative overflow-hidden">
                     {/* Decorative background glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-30">
                        <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--accent-primary-20)_0%,transparent_70%)]"></div>
                    </div>

                    <div className="container relative space-y-6">
                        <span className="subtle-heading">Viaggio di {organizerName}</span>
                        <h1 className="text-primary text-4xl md:text-6xl font-black uppercase tracking-tight mb-8">
                            {trip?.name || 'Viaggio'}
                        </h1>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setView('TRIP')}
                                className={`px-10 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${view === 'TRIP'
                                    ? 'bg-primary-blue text-white border-primary-blue shadow-xl shadow-primary-blue/20'
                                    : 'bg-transparent text-muted border-border-subtle hover:border-border-medium hover:text-primary'
                                    }`}
                            >
                                Itinerario
                            </button>
                            <button
                                onClick={() => setView('PHOTOS')}
                                className={`px-10 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${view === 'PHOTOS'
                                    ? 'bg-primary-blue text-white border-primary-blue shadow-xl shadow-primary-blue/20'
                                    : 'bg-transparent text-muted border-border-subtle hover:border-border-medium hover:text-primary'
                                    }`}
                            >
                                Foto
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container py-8 min-h-[400px]">
                    {view === 'TRIP' && (
                        <div className="space-y-12 animate-fade-in">
                            <div className="premium-card bg-card border-border-subtle p-8 md:p-12 shadow-xl">
                                <span className="subtle-heading block mb-8">Informazioni</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-subtle">Destinazione</label>
                                        <div className="text-xl font-bold text-primary">{trip?.destination || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-subtle">Periodo</label>
                                        <div className="text-xl font-bold text-primary">
                                            {trip?.start_date ? new Date(trip.start_date).toLocaleDateString() : 'N/A'} - {trip?.end_date ? new Date(trip.end_date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-subtle">Partecipanti</label>
                                        <div className="text-xl font-bold text-primary">{trip?.num_people || '1'} {trip?.num_people === 1 ? 'persona' : 'persone'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-12">
                                {trip?.trip_intent !== 'BUSINESS' && (
                                    <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                        <Map
                                            items={itinerary}
                                            hotelLat={trip?.hotel_latitude}
                                            hotelLon={trip?.hotel_longitude}
                                            startDate={trip?.start_date}
                                            isPremium={user?.is_subscribed}
                                        />
                                    </div>
                                )}
                                <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                                    <Timeline items={itinerary} />
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'PHOTOS' && (
                        <div className="animate-fade-in">
                            <Photos trip={trip} readOnly={true} sharedPhotos={photos} />
                        </div>
                    )}
                </div>

                {!user && (
                    <div className="py-24 bg-surface border-t border-border-subtle rounded-t-[4rem] text-center mt-20 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-20">
                            <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--accent-primary-20)_0%,transparent_70%)]"></div>
                        </div>

                        <div className="container relative space-y-10 max-w-2xl mx-auto">
                            <div className="space-y-4">
                                <h3 className="text-primary text-3xl font-black uppercase tracking-tight">Vuoi organizzare il tuo prossimo viaggio così?</h3>
                                <p className="text-muted text-lg leading-relaxed">Crea itinerari AI, dividi le spese e condividi i ricordi con SplitPlan.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link to="/auth" className="h-16 px-12 flex items-center justify-center bg-primary-blue text-white rounded-sm font-black uppercase text-[11px] tracking-[0.2em] hover:bg-primary-blue-light transition-all shadow-xl shadow-primary-blue/20">Registrati Gratis</Link>
                                <Link to="/auth" className="h-16 px-12 flex items-center justify-center border border-border-subtle text-primary rounded-sm font-black uppercase text-[11px] tracking-[0.2em] hover:bg-elevated transition-all">Accedi</Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (renderError) {
        return (
            <div className="pt-[var(--header-height,60px)] min-h-screen bg-base content-center">
                {banner}
                <div className="container max-w-lg mx-auto text-center space-y-8 animate-fade-in">
                    <div className="space-y-4">
                        <h2 className="text-red-500 text-3xl font-black uppercase tracking-tight">Errore di Rendering</h2>
                        <p className="text-muted text-lg">C'è stato un errore nel mostrare i dati del viaggio.</p>
                    </div>
                    
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-sm text-[11px] font-mono text-left text-red-400 overflow-x-auto whitespace-pre">
                        <strong className="block mb-2 uppercase tracking-widest">Errore:</strong>
                        {renderError.message}
                    </div>

                    <div className="mt-8">
                        <Link to="/" className="h-14 px-10 bg-primary-blue text-white font-black text-[10px] tracking-widest uppercase rounded-sm hover:bg-primary-blue-light transition-all shadow-lg shadow-primary-blue/20 inline-flex items-center">Torna alla Home</Link>
                    </div>
                </div>
            </div>
        );
    }
};

export default ShareTrip;
