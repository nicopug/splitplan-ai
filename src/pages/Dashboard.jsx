import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary, generateShareLink, getProposals, getParticipants, resetHotel } from '../api';
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
import { useModal } from '../context/ModalContext';

const Dashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showConfirm } = useModal();
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
    const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
    const [itineraryProgress, setItineraryProgress] = useState(0);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser) setUser(parsedUser);
        }
    }, []);

    // Check calendar connection status on load
    useEffect(() => {
        const checkCalendar = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${window.location.origin.includes('localhost') ? 'http://localhost:5678/api' : '/api'}/calendar/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setIsCalendarConnected(data.connected);
                    }
                }
            } catch (error) {
                console.error("Error checking calendar status:", error);
            }
        };
        checkCalendar();
    }, []);

    // Handle OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const scope = urlParams.get('scope');

        if (code && scope && scope.includes('calendar')) {
            const handleCallback = async () => {
                try {
                    setLoading(true);
                    const token = localStorage.getItem('token');
                    const redirectUri = window.location.origin + '/dashboard'; // Must match what was sent

                    // Nota: Google richiede che il redirect_uri sia IDENTICO. 
                    // Se siamo su dashboard con query params, potrebbe rompere.
                    // Idealmente dovremmo usare un endpoint /callback dedicato nel frontend o pulire l'URL.
                    // Per ora usiamo window.location.origin + window.location.pathname
                    // MA ATTENZIONE: Se l'utente naviga su /dashboard/123, questo cambia.
                    // Il backend calendar.py ha un default. Proviamo a passare quello corretto.
                    // Per semplicità nel backend mettiamo un default fisso, qui non lo passiamo se non serve.

                    // FIX: Usiamo l'endpoint di callback del backend configurato in Google Console
                    // Ma aspetta, il flow che abbiamo scelto è Authorization Code.
                    // Google reindirizza al backend? O al frontend?
                    // Se reindirizza al backend, il frontend non vede il codice.
                    // Se reindirizza al frontend, dobbiamo scambiarlo noi.
                    // IL PIANO ERA: Backend -> Google -> Frontend (con code) -> Backend (exchange).
                    // Quindi Google deve reindirizzare a http://localhost:3000/dashboard (o Vercel equiv).
                    // MA nella console abbiamo messo .../api/calendar/callback (Backend).

                    // ERRORE DI PIANIFICAZIONE:
                    // Se Google reindirizza al backend, il backend riceve il codice.
                    // E il backend deve poi reindirizzare al frontend.
                    // Nel mio `calendar.py`, `google_callback` fa redirect al frontend con `calendar_success=true`.
                    // QUINDI qui devo solo cercare `calendar_success=true`.
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            // handleCallback(); 
        }
    }, []);

    const handleConnectCalendar = async () => {
        try {
            const token = localStorage.getItem('token');
            // Costruiamo il redirect URL che il BACKEND deve usare per tornare QUI (o meglio, al suo callback che poi torna qui)
            // In realtà il backend ha già logica per gestire il redirect.
            // Chiamiamo /auth-url
            const apiUrl = window.location.origin.includes('localhost') ? 'http://localhost:5678/api' : '/api';

            // Il backend deve sapere dove redirigere POI l'utente finale? 
            // Nel mio codice backend attuale, il callback reindirizza fisso a localhost:3000/dashboard.
            // Questo è un problema per Vercel.
            // FIX: Passiamo al backend un parametro `frontend_redirect_url`?
            // No, semplifichiamo. Il backend farà redirect alla root dashboard.

            const res = await fetch(`${apiUrl}/calendar/auth-url?trip_id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.auth_url) {
                window.location.href = data.auth_url;
            }
        } catch (e) {
            showToast("Errore connessione calendar: " + e.message, "error");
        }
    };


    const fetchTrip = async () => {
        try {
            const data = await getTrip(id);
            setTrip(data);

            // Remote voting state check moved to participant data match below

            // Verifichiamo se l'utente corrente è l'organizzatore
            const storedUser = localStorage.getItem('user');
            if (storedUser && storedUser !== 'undefined') {
                const userObj = JSON.parse(storedUser);
                console.log('🔍 DEBUG isOrganizer - User from localStorage:', userObj);

                const parts = await getParticipants(id);
                console.log('🔍 DEBUG isOrganizer - Participants list:', parts);

                const me = parts.find(p => p.account_id === userObj.id || (p.name && p.name.toLowerCase() === userObj.name.toLowerCase()));
                console.log('🔍 DEBUG - Found participant match:', me);

                if (me) {
                    setIsOrganizer(!!me.is_organizer);
                    setHasVoted(!!me.has_voted);
                } else {
                    setIsOrganizer(false);
                    setHasVoted(false);
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
            setTrip(prev => ({
                ...prev,
                status: 'VOTING',
                num_people: surveyData.num_people,
                transport_mode: surveyData.transport_mode,
                destination: surveyData.destination,
                departure_airport: surveyData.departure_airport,
                trip_intent: surveyData.trip_intent
            }));
            fetchTrip(); // Rinfresca per impostare correttamente isOrganizer
        } catch (e) {
            showToast("Errore generazione: " + e.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleVotingComplete = async () => {
        setLoading(true);
        await fetchTrip();
        setLoading(false);
        showToast("Viaggio Confermato!", "success");
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

    const handleResetHotel = async () => {
        const confirmed = await showConfirm(
            "Modifica Logistica",
            "Vuoi davvero resettare la logistica? L'itinerario attuale verrà eliminato e dovrà essere rigenerato dopo aver inserito i nuovi dati dell'hotel."
        );
        if (confirmed) {
            try {
                setLoading(true);
                await resetHotel(id);
                showToast("Logistica resettata con successo", "success");
                await fetchTrip();
            } catch (e) {
                showToast("Errore: " + e.message, "error");
            } finally {
                setLoading(false);
            }
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
                            {trip.status !== 'PLANNING' && (
                                <span className="glass-panel" style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '4px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                }}>
                                    {trip.transport_mode === 'TRAIN' ? 'TRENO' :
                                        trip.transport_mode === 'CAR' ? 'AUTO' : 'AEREO'}
                                </span>
                            )}
                        </div>
                    )}

                    {user && isOrganizer && (
                        <div style={{ marginTop: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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

                            {trip.trip_intent === 'BUSINESS' && (
                                <button
                                    onClick={handleConnectCalendar}
                                    className="hover-scale hover-glow"
                                    disabled={isCalendarConnected}
                                    style={{
                                        background: isCalendarConnected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                        color: isCalendarConnected ? '#4caf50' : 'white',
                                        padding: '0.6rem 1.5rem',
                                        borderRadius: '16px',
                                        border: `1px solid ${isCalendarConnected ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.4)'}`,
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: isCalendarConnected ? 'default' : 'pointer',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {isCalendarConnected ? (
                                        <>✓ Calendar Connesso</>
                                    ) : (
                                        <>📅 Connetti Google Calendar</>
                                    )}
                                </button>
                            )}
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
                !isOrganizer && (trip.status === 'PLANNING' || (hasVoted && trip.status === 'VOTING')) ? (
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
                                {user?.is_subscribed && !trip.accommodation && (
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
                                        <HotelConfirmation
                                            trip={trip}
                                            onConfirm={fetchTrip}
                                            setIsGenerating={setIsGeneratingItinerary}
                                            setProgress={setItineraryProgress}
                                        />
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
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h2 style={{ marginBottom: 0 }}>Il tuo Itinerario</h2>
                                            {isOrganizer && (
                                                <button
                                                    onClick={handleResetHotel}
                                                    style={{
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        color: '#2563eb',
                                                        border: '1px solid rgba(37, 99, 235, 0.2)',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ⚙️ Modifica Logistica
                                                </button>
                                            )}
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
                )
            )}

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

            {isGeneratingItinerary && <GeneratingOverlay progress={itineraryProgress} />}
        </div>
    );
};

// Componente Overlay per la generazione AI
const GeneratingOverlay = ({ progress }) => {
    const messages = [
        "Analizzando la destinazione...",
        "Ottimizzando i percorsi...",
        "Cercando i migliori punti d'interesse...",
        "Calcolando i tempi di percorrenza...",
        "Quasi pronto! Ultimi ritocchi..."
    ];
    const msgIndex = Math.min(Math.floor(progress / 20), messages.length - 1);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(255, 255, 255, 0.98)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>🚀</div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-blue)', marginBottom: '1.5rem' }}>
                    Sto creando il tuo viaggio...
                </h2>
                <p style={{ color: '#475569', fontSize: '1.3rem', marginBottom: '3rem', fontWeight: '500' }}>
                    {messages[msgIndex]}
                </p>
                <div style={{
                    width: '100%',
                    height: '16px',
                    background: '#f1f5f9',
                    borderRadius: '30px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
                    }} />
                </div>
                <div style={{ fontWeight: '800', color: 'var(--primary-blue)', fontSize: '1.5rem' }}>
                    {progress}%
                </div>
            </div>
        </div>
    );
};

export default Dashboard;