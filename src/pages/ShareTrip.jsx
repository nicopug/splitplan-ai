import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedTrip } from '../api';
import Timeline from '../components/Timeline';
import Map from '../components/Map';
import Finance from '../components/Finance';
import Photos from '../components/Photos';

const ShareTrip = () => {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('TRIP');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getSharedTrip(token);
                setData(res);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    if (loading) return (
        <div className="section text-center" style={{ paddingTop: '10rem' }}>
            <div className="spinner-large" style={{ margin: '0 auto' }}></div>
            <p className="mt-4">Caricamento viaggio... 🌍</p>
        </div>
    );

    if (error || !data) return (
        <div className="section text-center" style={{ paddingTop: '10rem' }}>
            <h2 className="text-error">Oops! Qualcosa è andato storto 😕</h2>
            <p className="text-muted">{error || "Il link potrebbe essere scaduto o non valido."}</p>

            {error && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', display: 'inline-block', fontSize: '0.8rem', border: '1px solid #ddd' }}>
                    <strong>Dettaglio Tecnico:</strong> {error}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button onClick={() => window.location.reload()} className="btn btn-secondary">Riprova 🔄</button>
                <Link to="/" className="btn btn-primary">Torna alla Home</Link>
            </div>
            <p style={{ marginTop: '2rem', fontSize: '0.7rem', opacity: 0.5 }}>Build ID: sharing-v2-debug</p>
        </div>
    );

    const { trip, itinerary, expenses, photos, participants } = data;

    return (
        <div style={{ paddingTop: 'var(--header-height)' }}>
            {/* Banner Guest Mode */}
            <div style={{
                background: 'var(--accent-orange)',
                color: 'white',
                padding: '0.7rem',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                👋 Sei in modalità Sola Lettura. Questo è il viaggio di {participants[0]?.name || 'un utente'}.
            </div>

            <div style={{ background: 'var(--primary-blue)', color: 'white', padding: '3rem 0', textAlign: 'center' }}>
                <div className="container">
                    <span style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Viaggio Condiviso</span>
                    <h1 style={{ color: 'white', marginBottom: '1.5rem' }}>{trip.name}</h1>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setView('TRIP')}
                            style={{ background: view === 'TRIP' ? 'white' : 'transparent', color: view === 'TRIP' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', cursor: 'pointer' }}
                        >
                            Itinerario 🗺️
                        </button>
                        <button
                            onClick={() => setView('FINANCE')}
                            style={{ background: view === 'FINANCE' ? 'white' : 'transparent', color: view === 'FINANCE' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', cursor: 'pointer' }}
                        >
                            Spese 💸
                        </button>
                        <button
                            onClick={() => setView('PHOTOS')}
                            style={{ background: view === 'PHOTOS' ? 'white' : 'transparent', color: view === 'PHOTOS' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', cursor: 'pointer' }}
                        >
                            Foto 📸
                        </button>
                    </div>
                </div>
            </div>

            <div className="container py-8">
                {view === 'TRIP' && (
                    <>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
                                <h3 style={{ color: 'var(--primary-blue)' }}>Informazioni</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Destinazione</label>
                                        <strong>{trip.destination}</strong>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Periodo</label>
                                        <strong>{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</strong>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Partecipanti</label>
                                        <strong>{trip.num_people}</strong>
                                    </div>
                                </div>
                            </div>

                            <Map trip={trip} itinerary={itinerary} />
                        </div>
                        <Timeline items={itinerary} />
                    </>
                )}

                {view === 'FINANCE' && (
                    <Finance trip={trip} readOnly={true} sharedExpenses={expenses} sharedParticipants={participants} />
                )}

                {view === 'PHOTOS' && (
                    <Photos trip={trip} readOnly={true} sharedPhotos={photos} />
                )}
            </div>

            <div className="section text-center py-12" style={{ background: '#f8f9fa', marginTop: '4rem' }}>
                <h3>Vuoi organizzare il tuo prossimo viaggio così?</h3>
                <p className="mb-6">Crea viaggi, dividi le spese e genera itinerari AI con SplitPlan.</p>
                <Link to="/auth" className="btn btn-primary">Registrati Gratis</Link>
            </div>
        </div>
    );
};

export default ShareTrip;
