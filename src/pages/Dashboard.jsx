import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary } from '../api';
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
            if (data.status === 'BOOKED') {
                const items = await getItinerary(id);
                setItinerary(items);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrip();
    }, [id]);

    const handleSurveyComplete = async (surveyData) => {
        setIsGenerating(true);
        try {
            const props = await generateProposals(id, surveyData);
            setProposals(props);
            setTrip(prev => ({ ...prev, status: 'VOTING', num_people: surveyData.num_people }));
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


    if (loading) return <div className="section text-center">Caricamento in corso... ⏳</div>;
    if (!trip) return <div className="section text-center">Viaggio non trovato 😕</div>;

    return (
        <div style={{ paddingTop: 'var(--header-height)' }}>
            <div style={{ background: 'var(--primary-blue)', color: 'white', padding: '3rem 0', textAlign: 'center', position: 'relative' }}>
                <div className="container">
                    <span style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Dashboard Viaggio</span>
                    <h1 style={{ color: 'white', marginBottom: 0 }}>{trip.name}</h1>

                    {user && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <span style={{
                                background: user.is_subscribed ? 'linear-gradient(45deg, #ffd700, #ffa500)' : '#ddd',
                                color: user.is_subscribed ? 'black' : '#666',
                                padding: '2px 10px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                {user.is_subscribed ? 'PREMIUM ABBONATO 💎' : 'UTENTE FREE'}
                            </span>
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <button
                            onClick={() => setView('TRIP')}
                            style={{ background: view === 'TRIP' ? 'white' : 'transparent', color: view === 'TRIP' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', marginRight: '0.5rem', cursor: 'pointer' }}
                        >
                            Viaggio 🗺️
                        </button>
                        {trip.status === 'BOOKED' && (
                            <button
                                onClick={() => setView('CHAT')}
                                style={{ background: view === 'CHAT' ? 'white' : 'transparent', color: view === 'CHAT' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', marginRight: '0.5rem', cursor: 'pointer' }}
                            >
                                Chat AI 🤖
                            </button>
                        )}
                        {trip.status === 'BOOKED' && (
                            <button
                                onClick={() => setView('BUDGET')}
                                style={{ background: view === 'BUDGET' ? 'white' : 'transparent', color: view === 'BUDGET' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', marginRight: '0.5rem', cursor: 'pointer' }}
                            >
                                Budget 💰
                            </button>
                        )}
                        {trip.trip_type !== 'SOLO' && (
                            <button
                                onClick={() => setView('FINANCE')}
                                style={{ background: view === 'FINANCE' ? 'white' : 'transparent', color: view === 'FINANCE' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', marginRight: '0.5rem', cursor: 'pointer' }}
                            >
                                CFO & Spese 💸
                            </button>
                        )}
                        <button
                            onClick={() => setView('PHOTOS')}
                            style={{ background: view === 'PHOTOS' ? 'white' : 'transparent', color: view === 'PHOTOS' ? 'var(--primary-blue)' : 'white', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid white', cursor: 'pointer' }}
                        >
                            Foto del viaggio 📸
                        </button>
                    </div>
                </div>
            </div>

            {view === 'TRIP' && (
                <>
                    {trip.status === 'PLANNING' && (
                        <Survey trip={trip} onComplete={handleSurveyComplete} isGenerating={isGenerating} />
                    )}

                    {trip.status === 'VOTING' && (
                        <Voting proposals={proposals} trip={trip} onVoteComplete={handleVotingComplete} />
                    )}

                    {trip.status === 'BOOKED' && (
                        <>
                            {/* Premium Section: Links */}
                            {user?.is_subscribed && (
                                <>
                                    <Logistics trip={trip} />
                                    {!trip.accommodation && (
                                        <HotelConfirmation trip={trip} onConfirm={fetchTrip} />
                                    )}
                                </>
                            )}

                            {/* Itinerary Section: Full for everyone */}
                            <div className="container" style={{ marginTop: '2rem' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h2 style={{ marginBottom: 0 }}>Il tuo Itinerario</h2>
                                </div>

                                <Map items={itinerary} hotelLocation={trip.accommodation_location} />

                                <Timeline items={itinerary} />

                                {!user?.is_subscribed && (
                                    <div className="premium-teaser-inline" style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        backdropFilter: 'blur(10px)',
                                        padding: '2.5rem',
                                        borderRadius: '24px',
                                        textAlign: 'center',
                                        border: '1px solid rgba(35, 89, 158, 0.2)',
                                        marginTop: '2rem',
                                        marginBottom: '4rem'
                                    }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💎</div>
                                        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Sblocca il Potenziale Completo</h3>
                                        <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
                                            Ora puoi vedere l'intero itinerario! Passa a <b>Premium</b> per sbloccare i link di prenotazione diretti (Skyscanner/Booking) e caricare foto illimitate.
                                        </p>
                                        <button
                                            onClick={() => navigate('/auth')}
                                            className="btn btn-primary"
                                        >
                                            Attiva Premium ora
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {view === 'CHAT' && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    {user?.is_subscribed ? (
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
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '2px dashed var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Chatbot AI Personale</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    Vuoi modificare il tuo itinerario semplicemente parlando? I nostri utenti <b>Premium</b>
                                    possono usare l'AI per aggiungere, spostare o rimuovere attività istantaneamente.
                                </p>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="btn btn-primary"
                                >
                                    Sblocca Chatbot AI
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'BUDGET' && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    {user?.is_subscribed ? (
                        <Budget trip={trip} onUpdate={fetchTrip} />
                    ) : (
                        <div className="container" style={{ marginTop: '2rem' }}>
                            <div className="premium-teaser" style={{
                                background: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(10px)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                border: '2px dashed var(--primary-blue)',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
                                <h2 style={{ color: 'var(--primary-blue)' }}>Gestione Budget Avanzata</h2>
                                <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    Tieni traccia del tuo budget di viaggio! Gli utenti <b>Premium</b>
                                    possono vedere quanto hanno speso per volo e hotel, e quanto rimane per attività e pasti.
                                </p>
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="btn btn-primary"
                                >
                                    Sblocca Gestione Budget
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
