import React, { useState, useEffect } from 'react';
import { createTrip } from '../api';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showTypeSelection, setShowTypeSelection] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleIniziaOra = () => {
        if (user) {
            setShowTypeSelection(true);
        } else {
            navigate('/auth');
        }
    };

    const handleCreateTrip = async (type) => {
        setShowTypeSelection(false);
        const tripName = prompt(type === 'SOLO' ? "Nome della tua avventura solitaria?" : "Nome del viaggio di gruppo?");
        if (!tripName) return;

        setLoading(true);
        try {
            const data = await createTrip({
                name: tripName,
                trip_type: type
            });
            navigate(`/trip/${data.trip_id}`);
        } catch (error) {
            alert("Errore: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="section" style={{ paddingTop: '2rem', paddingBottom: '6rem', position: 'relative', overflow: 'hidden' }}>
            <div className="container grid-2" style={{ alignItems: 'center' }}>
                <div className="content">
                    <span style={{
                        textTransform: 'uppercase',
                        fontSize: '0.9rem',
                        letterSpacing: '2px',
                        color: 'var(--accent-orange)',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        display: 'block'
                    }}>
                        Il Futuro dei Viaggi è Qui
                    </span>
                    <h1>
                        L'Agente di Viaggio AI <br />
                        <span style={{ color: 'var(--accent-green)' }}>All-in-One</span>
                    </h1>
                    <p style={{ fontSize: '1.25rem', maxWidth: '500px' }}>
                        Dimentica le chat infinite e i file Excel. SplitPlan è il tuo Agente, Mediatore e CFO personale. Organizza viaggi perfetti senza stress.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn btn-primary" onClick={handleIniziaOra} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} disabled={loading}>
                            {loading ? 'Caricamento...' : 'Inizia Ora'}
                        </button>
                    </div>
                </div>
                <div className="visual" style={{ position: 'relative' }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '0.75rem',
                        boxShadow: 'var(--shadow-lg)',
                        transform: 'rotate(-2deg)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}>
                        <img
                            src="/app-preview.png"
                            alt="SplitPlan Dashboard Preview"
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '16px',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Type Selection Modal */}
            {showTypeSelection && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '500px' }}>
                        <h2 className="text-center" style={{ marginBottom: '2rem' }}>Come viaggi oggi?</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={() => handleCreateTrip('GROUP')} style={{
                                padding: '2rem', borderRadius: '16px', border: '2px solid var(--primary-blue)',
                                background: 'white', cursor: 'pointer', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '3rem' }}>👯‍♀️</div>
                                <h3 style={{ fontSize: '1.2rem', marginTop: '1rem' }}>In Gruppo</h3>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>Risolvi i conflitti e dividi le spese.</p>
                            </button>
                            <button onClick={() => handleCreateTrip('SOLO')} style={{
                                padding: '2rem', borderRadius: '16px', border: '2px solid var(--accent-orange)',
                                background: 'white', cursor: 'pointer', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '3rem' }}>🎒</div>
                                <h3 style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Da Solo</h3>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>Ritmo tuo, zero compromessi.</p>
                            </button>
                        </div>
                        <button onClick={() => setShowTypeSelection(false)} style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: 'transparent', border: 'none', color: '#666' }}>
                            Annulla
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Hero;
