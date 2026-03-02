import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary, generateShareLink, getProposals, getParticipants, resetHotel, unlockTrip, exportTripPDF, completeTrip } from '../api';
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
import { Sparkles, Lock, CreditCard, CheckCircle2, FileDown, Map as MapIcon, Wallet, Coins, Camera, MessageSquare, Share2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
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
        { role: 'ai', text: t('dashboard.chatWelcome', { defaultValue: 'Ciao! Sono il tuo assistente AI. Come posso aiutarti con l\'itinerario oggi?' }) }
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
            showToast(t('dashboard.calendarError', 'Errore connessione calendar: ') + e.message, "error");
        }
    };


    const fetchTrip = async () => {
        try {
            const data = await getTrip(id);
            setTrip(data);

            const isPremium = user?.is_subscribed || data.is_premium;

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
        showToast(t('dashboard.tripConfirmed', 'Viaggio Confermato!'), "success");
    };

    const handleOptimize = async () => {
        try {
            await optimizeItinerary(id);
            const items = await getItinerary(id);
            setItinerary(items);
            showToast(t('dashboard.itineraryOptimized', '✨ Itinerario ottimizzato!'), "success");
        } catch (e) {
            showToast(t('dashboard.optimizeError', 'Errore ottimizzazione: ') + e.message, "error");
        }
    };


    const handleShare = async () => {
        try {
            const res = await generateShareLink(id);
            const shareUrl = `${window.location.origin}/share/${res.share_token}`;
            await navigator.clipboard.writeText(shareUrl);
            showToast(t('dashboard.shareSuccess', '🔗 Link di condivisione copiato negli appunti!'), "success");
        } catch (e) {
            showToast(t('dashboard.shareError', 'Errore condivisione: ') + e.message, "error");
        }
    };

    const handleResetHotel = async () => {
        const confirmed = await showConfirm(
            t('dashboard.confirmResetLogistics', 'Modifica Logistica'),
            t('dashboard.confirmResetLogisticsDesc', "Vuoi davvero resettare la logistica? L'itinerario attuale verrà eliminato e dovrà essere rigenerato dopo aver inserito i nuovi dati dell'hotel.")
        );
        if (confirmed) {
            try {
                setLoading(true);
                await resetHotel(id);
                showToast(t('dashboard.logisticsResetSuccess', "Logistica resettata con successo"), "success");
                await fetchTrip();
            } catch (e) {
                showToast("Errore: " + e.message, "error");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleExportPDF = async () => {
        try {
            await exportTripPDF(id);
            showToast(t('dashboard.pdfSuccess', '✨ PDF generato con successo!'), "success");
        } catch (e) {
            showToast(t('dashboard.pdfError', 'Errore esportazione: ') + e.message, "error");
        }
    };

    if (loading) return <div className="section text-center">{t('dashboard.loading', 'Caricamento in corso...')}</div>;
    if (!trip) return <div className="section text-center">{t('dashboard.tripNotFound', 'Viaggio non trovato')}</div>;

    return (
        <div className="pt-[var(--header-height)] min-h-screen bg-black">
            {/* Guest Read-Only Banner */}
            {!user && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 fixed top-[var(--header-height)] left-0 right-0 z-[100]">
                    <div className="container text-center">
                        <p className="text-[10px] font-bold text-amber-500 tracking-widest uppercase">
                            {t('dashboard.readOnly', 'Sei in modalità Sola Lettura.')}
                        </p>
                    </div>
                </div>
            )}

            {/* Premium Soft Paywall Banner */}
            {user && !user.is_subscribed && trip && !trip.is_premium && (
                <div className="container mt-8">
                    <div className="premium-card !bg-white/[0.02] border-white/10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                        <div className="relative flex items-center gap-6">
                            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-blue-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white text-xl font-semibold mb-2 uppercase tracking-tight">
                                    {t('dashboard.unlockTitle', "Premium Features")}
                                </h3>
                                <p className="text-gray-500 text-sm max-w-lg leading-relaxed">
                                    {t('dashboard.unlockDesc', "Sblocca l'itinerario ottimizzato, la logistica automatica e l'assistente AI senza limiti.")}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    const res = await unlockTrip(trip.id);
                                    showToast(res.message, "success");
                                    fetchTrip();
                                    const updatedUser = { ...user, credits: res.credits };
                                    setUser(updatedUser);
                                    localStorage.setItem('user', JSON.stringify(updatedUser));
                                } catch (e) {
                                    showToast(e.message, "error");
                                }
                            }}
                            className="px-8 py-4 bg-white text-black text-[10px] font-black tracking-widest uppercase rounded-sm hover:bg-gray-200 transition-all shrink-0"
                        >
                            {t('dashboard.unlockBtn', 'Sblocca ora (1 🪙)')}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Header Area */}
            <div className={`relative border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-[var(--header-height)] z-30 ${!user ? 'mt-10' : ''}`}>
                <div className="container pt-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                        <div className="relative">
                            <span className="subtle-heading">{t('dashboard.title', 'Dashboard Viaggio')}</span>
                            <h1 className="text-white text-3xl md:text-5xl font-semibold tracking-tight uppercase mb-4">
                                {trip.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-3">
                                {user && (
                                    <span className={`px-2 py-1 rounded-sm text-[8px] font-bold tracking-[0.2em] uppercase border transition-all ${user.is_subscribed ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 text-gray-500 border-white/5'
                                        }`}>
                                        {user.is_subscribed ? t('dashboard.premiumSubscriber', 'PREMIUM') : t('dashboard.freeUser', 'FREE')}
                                    </span>
                                )}
                                {trip.status !== 'PLANNING' && (
                                    <span className="px-2 py-1 rounded-sm text-[8px] font-bold tracking-[0.2em] uppercase border bg-white/5 text-gray-400 border-white/5">
                                        {trip.transport_mode === 'TRAIN' ? t('dashboard.train', 'TRENO') :
                                            trip.transport_mode === 'CAR' ? t('dashboard.car', 'AUTO') : t('dashboard.flight', 'AEREO')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {user && isOrganizer && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleShare}
                                    title={t('dashboard.shareBtn', 'Condividi Viaggio')}
                                    className="w-10 h-10 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                </button>

                                {trip.status === 'BOOKED' && (
                                    <button
                                        onClick={async () => {
                                            const confirmed = await showConfirm(
                                                t('dashboard.confirmCompleteTitle', "Concludi Viaggio"),
                                                t('dashboard.confirmCompleteDesc', "Vuoi segnare questo viaggio come concluso?")
                                            );
                                            if (confirmed) {
                                                try {
                                                    await completeTrip(id);
                                                    showToast(t('dashboard.tripCompleted', "Viaggio concluso!"), "success");
                                                    fetchTrip();
                                                } catch (e) {
                                                    showToast(t('common.error', "Errore") + ": " + e.message, "error");
                                                }
                                            }
                                        }}
                                        title={t('dashboard.completeTrip', 'Concludi Viaggio')}
                                        className="w-10 h-10 flex items-center justify-center rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-10 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'TRIP', label: t('dashboard.tabs.trip', 'Viaggio'), icon: <MapIcon className="w-3.5 h-3.5" />, condition: isOrganizer || trip.status === 'PLANNING' || trip.status === 'VOTING' || trip.status === 'BOOKED' },
                            { id: 'CHAT', label: t('dashboard.tabs.chat', 'Chat AI'), icon: <Sparkles className="w-3.5 h-3.5" />, condition: trip.status === 'BOOKED' },
                            { id: 'BUDGET', label: t('dashboard.tabs.budget', 'Budget'), icon: <Wallet className="w-3.5 h-3.5" />, condition: trip.status === 'BOOKED' },
                            { id: 'FINANCE', label: t('dashboard.tabs.finance', 'Spese'), icon: <Coins className="w-3.5 h-3.5" />, condition: user && trip.trip_type !== 'SOLO' },
                            { id: 'PHOTOS', label: t('dashboard.tabs.photos', 'Foto'), icon: <Camera className="w-3.5 h-3.5" /> }
                        ].map(btn => (
                            (!btn.hasOwnProperty('condition') || btn.condition) && (
                                <button
                                    key={btn.id}
                                    onClick={() => setView(btn.id)}
                                    className={`flex items-center gap-2 pb-5 text-[9px] font-bold tracking-[0.25em] uppercase transition-all relative whitespace-nowrap ${view === btn.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {btn.icon}
                                    <span>{btn.label}</span>
                                    {view === btn.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white"></div>
                                    )}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </div>

            {view === 'TRIP' && (
                // GUEST WAITING SCREEN (Plan B override)
                !isOrganizer && (trip.status === 'PLANNING' || (hasVoted && trip.status === 'VOTING')) ? (
                    <div className="container py-12">
                        <div className="premium-card text-center max-w-2xl mx-auto py-16">
                            <div className="text-5xl mb-8">🗳️</div>
                            <h2 className="text-white text-2xl font-semibold mb-4 uppercase tracking-tight">
                                {t('dashboard.votoRegistrato', 'Voto Registrato!') || 'Voto Registrato!'}
                            </h2>
                            <p className="text-gray-500 text-lg leading-relaxed mb-10">
                                {t('dashboard.votoRegistratoDesc', 'Grazie per aver espresso la tua preferenza. L\'organizzatore sta pianificando il viaggio. Una volta completato, chiedi il link di sola lettura per l\'itinerario finale.')}
                            </p>
                            <div className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-sm text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                {t('dashboard.closePage', 'Puoi chiudere questa pagina.')}
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
                                {(user?.is_subscribed || trip.is_premium) && !trip.accommodation && (
                                    <Logistics trip={trip} />
                                )}

                                {/* Guest CTA Section */}
                                {!user && (
                                    <div className="container py-12">
                                        <div className="premium-card text-center max-w-2xl mx-auto py-12 border-blue-500/20 bg-blue-600/5">
                                            <h3 className="text-white text-xl font-semibold mb-4 uppercase tracking-tight">
                                                {t('dashboard.guestCta.title', 'Pianifica il tuo prossimo viaggio')}
                                            </h3>
                                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                                {t('dashboard.guestCta.desc', 'Accedi o Registrati per sbloccare l\'itinerario completo, la gestione budget e la chat AI.')}
                                            </p>
                                            <div className="flex justify-center gap-4">
                                                <Button onClick={() => navigate('/auth')}>
                                                    {t('dashboard.guestCta.register', 'Registrati Gratis')}
                                                </Button>
                                                <Button variant="outline" onClick={() => navigate('/auth')}>
                                                    {t('dashboard.guestCta.login', 'Accedi')}
                                                </Button>
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
                                            isPremium={user?.is_subscribed || trip.is_premium}
                                        />
                                    ) : (
                                        <div className="container py-12">
                                            <div className="premium-card text-center max-w-2xl mx-auto py-16 border-white/5">
                                                <div className="text-4xl mb-8">✨</div>
                                                <h2 className="text-white text-2xl font-semibold mb-4 uppercase tracking-tight">
                                                    {t('dashboard.consensusReached', 'Consenso Raggiunto!')}
                                                </h2>
                                                <p className="text-gray-500 text-lg leading-relaxed mb-10 mx-auto">
                                                    {t('dashboard.consensusDesc', {
                                                        defaultValue: "Ottime notizie! Il gruppo ha scelto {{destination}} come meta ufficiale. L'organizzatore sta ora ultimando i dettagli della logistica e dell'hotel per generare l'itinerario finale.",
                                                        destination: trip.destination
                                                    })}
                                                </p>
                                                <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-[10px] font-bold text-emerald-500 tracking-widest uppercase">
                                                    {t('dashboard.waitingConfirmation', 'In attesa della conferma finale...')}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* 4. Itinerary Section: Visible only when hotel is confirmed and itinerary exists */}
                                {trip.accommodation && itinerary && itinerary.length > 0 && (
                                    <div className="container py-12">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                            <h2 className="text-white text-3xl font-semibold tracking-tight uppercase">
                                                {t('dashboard.itineraryTitle', 'Il tuo Itinerario')}
                                            </h2>
                                            <div className="flex items-center gap-3">
                                                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                                                    <FileDown className="w-4 h-4" />
                                                    {t('dashboard.exportPdf', 'PDF')}
                                                </Button>
                                                {isOrganizer && (
                                                    <Button variant="outline" size="sm" onClick={handleResetHotel}>
                                                        {t('dashboard.editLogistics', 'Modifica Logistica')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {trip.trip_intent !== 'BUSINESS' && (
                                            <Map
                                                items={itinerary}
                                                hotelLat={trip.hotel_latitude}
                                                hotelLon={trip.hotel_longitude}
                                                startDate={trip.start_date}
                                                isPremium={user?.is_subscribed}
                                            />
                                        )}

                                        <Timeline items={itinerary} />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )
            )}

            {view === 'CHAT' && (
                <div className="flex justify-center w-full">
                    {!user ? (
                        <div className="container mt-8">
                            <div className="premium-card p-12 text-center border-white/5 bg-white/2">
                                <div className="text-5xl mb-6">🤖</div>
                                <h2 className="text-white text-2xl font-semibold mb-3 uppercase tracking-tight">Chatbot AI Personale</h2>
                                <p className="text-gray-500 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                                    Vuoi modificare il tuo itinerario semplicemente parlando? Accedi o Registrati per usare l'AI per personalizzare il tuo viaggio istantaneamente.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <Button onClick={() => navigate('/auth')}>Registrati Gratis</Button>
                                    <Button variant="outline" onClick={() => navigate('/auth')}>Accedi</Button>
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
                        <div className="container mt-8">
                            <div className="premium-card p-12 text-center border-white/10 bg-white/5 border-dashed">
                                <div className="text-5xl mb-6">✨</div>
                                <h2 className="text-white text-2xl font-semibold mb-3 uppercase tracking-tight">Chatbot AI Personale</h2>
                                <p className="text-gray-500 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                                    I nostri utenti <b>Premium</b> possono usare l'AI per aggiungere, spostare o rimuovere attività semplicemente parlando.
                                </p>
                                <Button
                                    onClick={() => navigate('/auth')}
                                >
                                    Scopri Premium
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'BUDGET' && (
                <div className="flex justify-center w-full">
                    {!user ? (
                        <div className="container mt-8">
                            <div className="premium-card p-12 text-center border-white/5 bg-white/2">
                                <div className="text-5xl mb-6">💰</div>
                                <h2 className="text-white text-2xl font-semibold mb-3 uppercase tracking-tight">Gestione Budget Avanzata</h2>
                                <p className="text-gray-500 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                                    Tieni traccia del tuo budget di viaggio in tempo reale. Accedi o Registrati per gestire le tue spese in modo professionale.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <Button onClick={() => navigate('/auth')}>Registrati Gratis</Button>
                                    <Button variant="outline" onClick={() => navigate('/auth')}>Accedi</Button>
                                </div>
                            </div>
                        </div>
                    ) : user?.is_subscribed ? (
                        <Budget trip={trip} onUpdate={fetchTrip} />
                    ) : (
                        <div className="container mt-8">
                            <div className="premium-card p-12 text-center border-white/10 bg-white/5 border-dashed">
                                <div className="text-5xl mb-6">✨</div>
                                <h2 className="text-white text-2xl font-semibold mb-3 uppercase tracking-tight">Gestione Budget Avanzata</h2>
                                <p className="text-gray-500 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                                    Gli utenti <b>Premium</b> possono vedere quanto hanno speso per volo e hotel, e monitorare quanto rimane per attività e pasti.
                                </p>
                                <Button
                                    onClick={() => navigate('/auth')}
                                >
                                    Scopri Premium
                                </Button>
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

const GeneratingOverlay = ({ progress }) => {
    const { t } = useTranslation();
    const messages = [
        "Analizzando la destinazione...",
        "Ottimizzando i percorsi...",
        "Cercando i migliori punti d'interesse...",
        "Calcolando i tempi di percorrenza...",
        "Quasi pronto! Ultimi ritocchi..."
    ];
    const msgIndex = Math.min(Math.floor(progress / 20), messages.length - 1);

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[9999] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="max-w-md w-11/12 text-center space-y-12">
                <div className="space-y-4">
                    <span className="subtle-heading">AI GENERATION</span>
                    <h2 className="text-white text-3xl md:text-4xl font-semibold tracking-tight uppercase">
                        {t('dashboard.generatingTitle', 'Progettando il tuo viaggio...')}
                    </h2>
                    <p className="text-gray-500 text-sm font-bold tracking-widest uppercase animate-pulse h-6">
                        {messages[msgIndex]}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="bg-white h-full transition-all duration-300 shadow-[0_0_20px_white]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-white text-2xl font-black tracking-widest font-mono">
                        {progress}%
                    </div>
                </div>

                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">
                    {t('dashboard.generatingDesc', "L'intelligenza artificiale sta ottimizzando ritmi e tappe per il tuo gruppo.")}
                </p>
            </div>
        </div>
    );
};

export default Dashboard;