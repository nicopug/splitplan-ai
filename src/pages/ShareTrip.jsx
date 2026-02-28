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
        <div style={{
            background: 'var(--accent-orange)',
            color: 'white',
            padding: '0.7rem',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            position: 'fixed',
            top: 'var(--header-height, 0)',
            left: 0,
            right: 0,
            zIndex: 100
        }}>
            Sei in modalità Sola Lettura.
        </div>
    );

    if (loading) return (
        <div style={{ paddingTop: 'var(--header-height, 60px)' }}>
            {banner}
            <div className="section text-center" style={{ paddingTop: '8rem' }}>
                <div className="spinner-large" style={{ margin: '0 auto' }}></div>
                <p className="mt-4">Caricamento viaggio...</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div style={{ paddingTop: 'var(--header-height, 60px)' }}>
            {banner}
            <div className="section text-center" style={{ paddingTop: '8rem' }}>
                <h2 className="text-error">Oops! Qualcosa è andato storto</h2>
                <p className="text-muted">{error || "Il link potrebbe essere scaduto o non valido."}</p>

                {error && (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'inline-block', fontSize: '0.8rem', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <strong>Dettaglio Tecnico:</strong> {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button onClick={() => window.location.reload()} className="btn btn-secondary">Riprova</button>
                    <Link to="/" className="btn btn-primary">Torna alla Home</Link>
                </div>
            </div>
        </div>
    );

    try {
        const { trip = {}, itinerary = [], expenses = [], photos = [], participants = [] } = data;
        const organizerName = (participants && participants.length > 0) ? participants[0].name : 'un utente';

        return (
            <div style={{ paddingTop: 'calc(var(--header-height, 60px) + 3rem)' }}>
                {banner}

                <div className="glass-card" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '3rem 0', textAlign: 'center', background: 'rgba(13, 13, 24, 0.8)' }}>
                    <div className="container">
                        <span style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Viaggio di {organizerName}</span>
                        <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400" style={{ marginBottom: '1.5rem', fontWeight: '900' }}>{trip?.name || 'Viaggio'}</h1>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setView('TRIP')}
                                style={{ background: view === 'TRIP' ? 'var(--accent-violet)' : 'transparent', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', border: '1px solid var(--accent-violet)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
                            >
                                Itinerario
                            </button>
                            <button
                                onClick={() => setView('PHOTOS')}
                                style={{ background: view === 'PHOTOS' ? 'var(--accent-violet)' : 'transparent', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', border: '1px solid var(--accent-violet)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
                            >
                                Foto
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container py-8">
                    {view === 'TRIP' && (
                        <>
                            <div style={{ marginBottom: '2rem' }}>
                                <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                                    <h3 style={{ color: 'var(--accent-cyan)' }}>Informazioni</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Destinazione</label>
                                            <strong style={{ color: 'var(--text-primary)' }}>{trip?.destination || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Periodo</label>
                                            <strong style={{ color: 'var(--text-primary)' }}>
                                                {trip?.start_date ? new Date(trip.start_date).toLocaleDateString() : 'N/A'} -
                                                {trip?.end_date ? new Date(trip.end_date).toLocaleDateString() : 'N/A'}
                                            </strong>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Partecipanti</label>
                                            <strong style={{ color: 'var(--text-primary)' }}>{trip?.num_people || '1'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {trip?.trip_intent !== 'BUSINESS' && (
                                    <Map
                                        items={itinerary}
                                        hotelLat={trip?.hotel_latitude}
                                        hotelLon={trip?.hotel_longitude}
                                        startDate={trip?.start_date}
                                        isPremium={user?.is_subscribed}
                                    />
                                )}
                            </div>
                            <Timeline items={itinerary} />
                        </>
                    )}

                    {view === 'PHOTOS' && (
                        <Photos trip={trip} readOnly={true} sharedPhotos={photos} />
                    )}
                </div>

                {!user && (
                    <div className="section text-center py-12" style={{ background: 'var(--bg-elevated)', marginTop: '4rem', borderTop: '1px solid var(--border-subtle)', borderRadius: '32px 32px 0 0' }}>
                        <h3 className="text-white">Vuoi organizzare il tuo prossimo viaggio così?</h3>
                        <p className="mb-6 text-muted">Crea itinerari AI, dividi le spese e condividi i ricordi con SplitPlan.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <Link to="/auth" className="btn btn-primary" style={{ padding: '0.8rem 2rem', background: 'var(--accent-violet)', border: 'none' }}>Registrati Gratis</Link>
                            <Link to="/auth" className="btn btn-secondary" style={{ padding: '0.8rem 2rem', border: '1px solid var(--accent-violet)' }}>Accedi</Link>
                        </div>
                    </div>
                )}
            </div>
        );
    } catch (renderError) {
        return (
            <div style={{ paddingTop: 'var(--header-height, 60px)' }}>
                {banner}
                <div className="section text-center" style={{ paddingTop: '8rem' }}>
                    <h2 className="text-error">Errore di Rendering</h2>
                    <p>C'è stato un errore nel mostrare i dati del viaggio.</p>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#fee', borderRadius: '8px', display: 'inline-block', fontSize: '0.8rem', border: '1px solid #fcc', color: '#c00' }}>
                        <strong>Errore:</strong> {renderError.message}
                    </div>
                    <div className="mt-8">
                        <Link to="/" className="btn btn-primary">Torna alla Home</Link>
                    </div>
                </div>
            </div>
        );
    }
};

export default ShareTrip;
