import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary, generateShareLink, getProposals, getParticipants } from '../api';
import Survey from '../components/Survey';
import Voting from '../components/Voting';
import Timeline from '../components/Timeline';
import Finance from '../components/Finance';
import Logistics from '../components/Logistics';
import HotelConfirmation from '../components/HotelConfirmation';
import Photos from '../components/Photos';
import Chatbot from '../components/Chatbot';
import Budget from '../components/Budget';
import Map from '../components/Map';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [trip, setTrip] = useState(null);
    const [proposals, setProposals] = useState([]);
    const [itinerary, setItinerary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [view, setView] = useState('TRIP'); // 'TRIP', 'CHAT', 'BUDGET', 'FINANCE', or 'PHOTOS'
    const [user, setUser] = useState(null);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', text: 'Ciao! Sono il tuo assistente AI. Come posso aiutarti con l\'itinerario oggi?' }
    ]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const fetchTrip = async () => {
        try {
            const data = await getTrip(id);
            setTrip(data);

            // Check local voting state
            if (localStorage.getItem(`splitplan_voted_${id}`)) {
                setHasVoted(true);
            }

            // Verifichiamo se l'utente corrente è l'organizzatore
            const storedUser = localStorage.getItem('user');
            if (storedUser && storedUser !== 'undefined') {
                const userObj = JSON.parse(storedUser);
                console.log('🔍 DEBUG isOrganizer - User from localStorage:', userObj);

                const parts = await getParticipants(id);
                console.log('🔍 DEBUG isOrganizer - Participants list:', parts);

                const me = parts.find(p => p.account_id === userObj.id || (p.name && p.name.toLowerCase() === userObj.name.toLowerCase()));
                console.log('🔍 DEBUG isOrganizer - Found participant match:', me);

                if (me && me.is_organizer) {
                    console.log('✅ User IS organizer');
                    setIsOrganizer(true);
                } else {
                    console.log('❌ User is NOT organizer');
                    setIsOrganizer(false);
                }
            } else {
                console.log('⚠️ No user in localStorage');
                setIsOrganizer(false);
            }

            // Caricamento proposte per tutti
            if (data.status === 'VOTING') {
                const props = await getProposals(id);
                setProposals(props);
            }

            if (data.status === 'BOOKED') {
                const items = await getItinerary(id);
                setItinerary(items);
            }
        } catch (error) {
            console.error("Fetch Trip Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchTrip();
    }, [id]);

    // Polling per aggiornamento automatico voti
    useEffect(() => {
        let interval;
        if (trip?.status === 'VOTING') {
            interval = setInterval(async () => {
                try {
                    const data = await getTrip(id);
                    if (data.status !== 'VOTING') {
                        fetchTrip();
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [trip?.status, id]);

    const handleSurveyComplete = async (surveyData) => {
        setIsGenerating(true);
        try {
            const props = await generateProposals(id, surveyData);
            setProposals(props);
            setTrip(prev => ({ ...prev, status: 'VOTING', num_people: surveyData.num_people }));
            fetchTrip(); // Rinfresca per impostare correttamente isOrganizer
        } catch (e) {
            showToast("Errore generazione: " + e.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleVotingComplete = async () => {
        setLoading(true);
        // Force re-check of everything including local voted state
        if (localStorage.getItem(`splitplan_voted_${id}`)) {
            setHasVoted(true);
        }
        await fetchTrip();
        setLoading(false);
        showToast("🎉 Viaggio Confermato!", "success");
    };

    const handleOptimize = async () => {
        try {
            await optimizeItinerary(id);
            const items = await getItinerary(id);
            setItinerary(items);
            showToast("✨ Itinerario ottimizzato!", "success");
        } catch (e) {
            showToast("Errore ottimizzazione: " + e.message, "error");
        }
    };


    const handleShare = async () => {
        try {
            const res = await generateShareLink(id);
            const shareUrl = `${window.location.origin}/share/${res.share_token}`;
            await navigator.clipboard.writeText(shareUrl);
            showToast("🔗 Link di condivisione copiato negli appunti!", "success");
        } catch (e) {
            showToast("Errore condivisione: " + e.message, "error");
        }
    };

    if (loading) return <div className="section text-center">Caricamento in corso...</div>;
    if (!trip) return <div className="section text-center">Viaggio non trovato</div>;

    return (
        <div style={{ paddingTop: 'var(--header-height)' }}>
            {!user && (
                <div style={{
                    background: 'var(--accent-orange)',
                    color: 'white',
                    padding: '0.7rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    position: 'fixed',
                    top: 'var(--header-height)',
                    left: 0,
                    right: 0,
                    zIndex: 100
                }}>
                    Sei in modalità Sola Lettura.
                </div>
            )}

            <div className="mesh-gradient" style={{
                color: 'white',
                padding: '4rem 0',
                textAlign: 'center',
                position: 'relative',
                marginTop: !user ? '2.5rem' : 0,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
                <div className="container animate-fade-in">
                    <span style={{
                        opacity: 0.9,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: 'rgba(255,255,255,0.8)'
                    }}>Dashboard Viaggio</span>
                    <h1 style={{
                        color: 'white',
                        marginBottom: '0.5rem',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '800',
                        fontSize: '3.5rem',
                        textShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>{trip.name}</h1>

                    {user && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <span className="glass-panel" style={{
                                background: user.is_subscribed ? 'linear-gradient(45deg, #ffd700, #ffa500)' : 'rgba(255,255,255,0.2)',
                                color: user.is_subscribed ? 'black' : 'white',
                                padding: '4px 14px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                letterSpacing: '0.5px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                {user.is_subscribed ? 'PREMIUM ABBONATO' : 'UTENTE FREE'}
                            </span>
                        </div>
                    )}

                    {user && isOrganizer && (
                        <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                            <button
                                onClick={handleShare}
                                className="hover-scale hover-glow"
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    backdropFilter: 'blur(10px)',
                                    color: 'white',
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                Condividi Viaggio (Sola Lettura)
                            </button>
                        </div>
                    )}

                    <div style={{
                        marginTop: '2rem',
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                    }}>
                        {[
                            { id: 'TRIP', label: 'Viaggio', condition: isOrganizer || trip.status === 'PLANNING' || trip.status === 'VOTING' || trip.status === 'BOOKED' },
                            { id: 'CHAT', label: 'Chat AI', condition: trip.status === 'BOOKED' },
                            { id: 'BUDGET', label: 'Budget', condition: trip.status === 'BOOKED' },
                            { id: 'FINANCE', label: 'CFO & Spese', condition: user && trip.trip_type !== 'SOLO' },
                            { id: 'PHOTOS', label: 'Foto' }
                        ].map(btn => (
                            (!btn.hasOwnProperty('condition') || btn.condition) && (
                                <button
                                    key={btn.id}
                                    onClick={() => setView(btn.id)}
                                    className="hover-lift"
                                    style={{
                                        background: view === btn.id ? 'white' : 'rgba(255,255,255,0.1)',
                                        backdropFilter: view === btn.id ? 'none' : 'blur(5px)',
                                        color: view === btn.id ? 'var(--primary-blue)' : 'white',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '14px',
                                        border: view === btn.id ? '1px solid white' : '1px solid rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: view === btn.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    {btn.label}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </div>

            {view === 'TRIP' && (
                // GUEST WAITING SCREEN (Plan B override)
                !isOrganizer && hasVoted && trip.status === 'VOTING' ? (
                    <div className="container" style={{ marginTop: '2rem' }}>
                        <div className="animate-fade-in" style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <div style={{
                                background: 'var(--bg-white)',
                                padding: '3rem',
                                borderRadius: '32px',
                                textAlign: 'center',
                                border: '1px solid var(--primary-blue)',
                                maxWidth: '600px',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🗳️</div>
                                <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontWeight: '800' }}>
                                    Voto Registrato!
                                </h2>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
                                    Grazie per aver espresso la tua preferenza.
                                    <br /><br />
                                    <strong>L'organizzatore sta pianificando il viaggio.</strong>
                                    <br />
                                    Una volta completato, chiedi di farti mandare il <b>link di sola lettura</b> per vedere l'itinerario finale.
                                </p>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '0.8rem 1.5rem',
                                    background: 'var(--bg-soft-gray)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontWeight: '700',
                                    fontSize: '0.9rem'
                                }}>
                                    Puoi chiudere questa pagina.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {trip.status === 'PLANNING' && (
                            <Survey trip={trip} onComplete={handleSurveyComplete} isGenerating={isGenerating} />
                        )}

                        {trip.status === 'VOTING' && (
                            <Voting proposals={proposals} trip={trip} onVoteComplete={handleVotingComplete} isOrganizer={isOrganizer} />
                        )}

                        {trip.status === 'BOOKED' && (
                            <>
                                {/* 1. Logistics (Premium only) */}
                                {user?.is_subscribed && (
                                    <Logistics trip={trip} />
                                )}

                                {/* Registration/Login CTA for Guests */}
                                {!user && (
                                    <div className="container" style={{ marginTop: '2rem' }}>
                                        <div style={{
                                            background: 'var(--glass-bg)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '2.5rem',
                                            borderRadius: '24px',
                                            textAlign: 'center',
                                            border: '1px solid var(--primary-blue)',
                                            marginBottom: '2rem',
                                            boxShadow: 'var(--shadow-md)'
                                        }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}></div>
                                            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Pianifica il tuo prossimo viaggio</h3>
                                            <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
                                                Accedi o Registrati per sbloccare l\'itinerario completo, la gestione budget e la chat AI.
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                                <button onClick={() => navigate('/auth')} className="btn btn-primary">Registrati Gratis</button>
                                                <button onClick={() => navigate('/auth')} className="btn btn-secondary">Accedi</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. Hotel Form or Wait Message */}
                                {!trip.accommodation && (
                                    isOrganizer ? (
                                        <HotelConfirmation trip={trip} onConfirm={fetchTrip} />
                                    ) : (
                                        <div className="container" style={{ marginTop: '2rem' }}>
                                            <div style={{
                                                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                                                padding: '3rem',
                                                borderRadius: '32px',
                                                textAlign: 'center',
                                                border: '1px solid #dbeafe',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
                                            }} className="animate-fade-in">
                                                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}></div>
                                                <h2 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', fontWeight: '800' }}>
                                                    Consenso Raggiunto!
                                                </h2>
                                                <p style={{ maxWidth: '500px', margin: '0 auto 2rem', fontSize: '1.1rem', color: '#475569', lineHeight: '1.6' }}>
                                                    Ottime notizie! Il gruppo ha scelto <b>{trip.destination}</b> come meta ufficiale.
                                                    <br /><br />
                                                    L'organizzatore sta ora ultimando i dettagli della logistica e dell'hotel per generare l'itinerario finale.
                                                </p>
                                                <div style={{ display: 'inline-block', padding: '0.8rem 1.5rem', background: 'white', borderRadius: '16px', color: 'var(--primary-blue)', fontWeight: '700', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                    In attesa della conferma finale...
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* 4. Itinerary Section: Visible only when hotel is confirmed and itinerary exists */}
                                {trip.accommodation && itinerary && itinerary.length > 0 && (
                                    <div className="container" style={{ marginTop: '2rem' }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h2 style={{ marginBottom: 0 }}>Il tuo Itinerario</h2>
                                        </div>

                                        <Map
                                            items={itinerary}
                                            hotelLat={trip.hotel_latitude}
                                            hotelLon={trip.hotel_longitude}
                                            startDate={trip.start_date}
                                            isPremium={user?.is_subscribed}
                                        />

                                        <Timeline items={itinerary} />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ))}

            {view === 'CHAT' && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    {!user ? (
                        <div className="container" style={{ marginTop: '2rem' }}>
                            <div style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '1px solid var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Chatbot AI Personale</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    Vuoi modificare il tuo itinerario semplicemente parlando? Accedi o Registrati per usare l\'AI per personalizzare il tuo viaggio istantaneamente.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <button onClick={() => navigate('/auth')} className="btn btn-primary">Registrati Gratis</button>
                                    <button onClick={() => navigate('/auth')} className="btn btn-secondary">Accedi</button>
                                </div>
                            </div>
                        </div>
                    ) : user?.is_subscribed ? (
                        <Chatbot
                            tripId={id}
                            onItineraryUpdate={(newItinerary) => setItinerary(newItinerary)}
                            onClose={() => setView('TRIP')}
                            messages={chatMessages}
                            setMessages={setChatMessages}
                        />
                    ) : (
                        <div className="container" style={{ marginTop: '2rem' }}>
                            <div className="premium-teaser" style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '2px dashed var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Chatbot AI Personale</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    I nostri utenti <b>Premium</b> possono usare l\'AI per aggiungere, spostare o rimuovere attività semplicemente parlando.
                                </p>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="btn btn-primary"
                                >
                                    Scopri Premium
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'BUDGET' && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    {!user ? (
                        <div className="container" style={{ marginTop: '2rem' }}>
                            <div style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '1px solid var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Gestione Budget Avanzata</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    Tieni traccia del tuo budget di viaggio in tempo reale. Accedi o Registrati per gestire le tue spese in modo professionale.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <button onClick={() => navigate('/auth')} className="btn btn-primary">Registrati Gratis</button>
                                    <button onClick={() => navigate('/auth')} className="btn btn-secondary">Accedi</button>
                                </div>
                            </div>
                        </div>
                    ) : user?.is_subscribed ? (
                        <Budget trip={trip} onUpdate={fetchTrip} />
                    ) : (
                        <div className="container" style={{ marginTop: '2rem' }}>
                            <div className="premium-teaser" style={{
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '2px dashed var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Gestione Budget Avanzata</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    Gli utenti <b>Premium</b> possono vedere quanto hanno speso per volo e hotel, e monitorare quanto rimane per attività e pasti.
                                </p>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="btn btn-primary"
                                >
                                    Scopri Premium
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'FINANCE' && (
                <Finance trip={trip} />
            )}

            {view === 'PHOTOS' && (
                <Photos trip={trip} />
            )}
        </div>
    );
};

export default Dashboard;