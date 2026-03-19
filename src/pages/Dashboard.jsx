import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary, generateShareLink, getProposals, getParticipants, resetHotel, unlockTrip, exportTripPDF, completeTrip } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { Sparkles, Lock, CreditCard, CheckCircle2, FileDown, Map as MapIcon, Wallet, Coins, Camera, MessageSquare, Share2, X, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

// Lazy load heavy components
const Survey = lazy(() => import('../components/Survey'));
const Voting = lazy(() => import('../components/Voting'));
const Timeline = lazy(() => import('../components/Timeline'));
const Finance = lazy(() => import('../components/Finance'));
const Logistics = lazy(() => import('../components/Logistics'));
const HotelConfirmation = lazy(() => import('../components/HotelConfirmation'));
const Photos = lazy(() => import('../components/Photos'));
const Chatbot = lazy(() => import('../components/Chatbot'));
const Budget = lazy(() => import('../components/Budget'));
const Map = lazy(() => import('../components/Map'));
const Events = lazy(() => import('../components/Events'));

// Component Loader Fallback
const ComponentLoader = () => (
    <div className="flex items-center justify-center p-12 w-full h-full">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
    </div>
);

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
    const [itineraryProgress, setItineraryProgress] = useState(0);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

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
                    const apiUrl = window.location.origin.includes('localhost') ? 'http://localhost:8000' : '/api';
                    const response = await fetch(`${apiUrl}/calendar/status`, {
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
            const apiUrl = window.location.origin.includes('localhost') ? 'http://localhost:8000' : '/api';

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
        <div className="flex h-screen bg-[var(--bg-base)] transition-colors duration-500 overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-68 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col pt-8 hidden lg:flex">
                <div className="px-8 mb-10">
                    <span className="subtle-heading text-[var(--text-subtle)] font-bold tracking-[0.2em] uppercase text-[9px] mb-1 block">SplitPlan Pro</span>
                    <h2 className="text-[var(--text-primary)] text-xl font-black uppercase tracking-tight truncate">
                        {trip.name}
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {[
                        { id: 'TRIP', label: t('dashboard.tabs.trip', 'Viaggio'), icon: <MapIcon className="w-4 h-4" />, condition: isOrganizer || trip.status === 'PLANNING' || trip.status === 'VOTING' || trip.status === 'BOOKED' },
                        { id: 'BUDGET', label: t('dashboard.tabs.budget', 'Budget'), icon: <Wallet className="w-4 h-4" />, condition: trip.status === 'BOOKED' },
                        { id: 'FINANCE', label: t('dashboard.tabs.finance', 'Spese'), icon: <Coins className="w-4 h-4" />, condition: user && trip.trip_type !== 'SOLO' },
                        { id: 'PHOTOS', label: t('dashboard.tabs.photos', 'Foto'), icon: <Camera className="w-4 h-4" /> },
                        { id: 'EVENTS', label: t('dashboard.tabs.events', 'Eventi'), icon: <CalendarDays className="w-4 h-4" />, condition: trip.status === 'BOOKED' }
                    ].map(btn => (
                        (!btn.hasOwnProperty('condition') || btn.condition) && (
                            <button
                                key={btn.id}
                                onClick={() => setView(btn.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${
                                    view === btn.id 
                                        ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-md' 
                                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {btn.icon}
                                <span>{btn.label}</span>
                            </button>
                        )
                    ))}
                </nav>

                <div className="p-6 border-t border-[var(--border-subtle)]">
                    <button
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-sm text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-base)] transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{t('dashboard.shareBtn', 'Condividi')}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
                {/* Mobile Header (Only on small screens) */}
                <div className="lg:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/80 backdrop-blur-xl p-4 flex justify-between items-center">
                    <h2 className="text-[var(--text-primary)] text-lg font-black uppercase tracking-tight truncate max-w-[200px]">
                        {trip.name}
                    </h2>
                    <div className="flex gap-2 h-10 overflow-x-auto no-scrollbar items-center">
                         {/* We can potentially add an icon-only nav here for mobile if needed, but keeping it simple for now */}
                    </div>
                </div>

                {/* Main View Container */}
                <div className="flex-1">
                    {/* Guest Read-Only Banner */}
                    {!user && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 sticky top-0 z-[100] backdrop-blur-md">
                            <div className="container text-center">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest uppercase">
                                    {t('dashboard.readOnly', 'Sei in modalità Sola Lettura.')}
                                </p>
                            </div>
                        </div>
                    )}

            {/* Premium Soft Paywall Banner */}
            {user && !user.is_subscribed && trip && !trip.is_premium && (
                <div className="container mt-8">
                    <div className="premium-card bg-[var(--bg-card)] border-[var(--border-medium)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative shadow-[var(--shadow-lg)]">
                        <div className="relative flex items-center gap-6">
                            <div className="w-14 h-14 bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-sm flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-[var(--accent-primary)]" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-[var(--text-primary)] text-xl font-semibold mb-2 uppercase tracking-tight">
                                    {t('dashboard.unlockTitle', "Premium Features")}
                                </h3>
                                <p className="text-[var(--text-muted)] text-sm max-w-lg leading-relaxed">
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
                            className="px-8 py-4 bg-[var(--text-primary)] text-[var(--bg-base)] text-[10px] font-black tracking-widest uppercase rounded-sm hover:opacity-90 transition-all shrink-0 shadow-[var(--shadow-md)]"
                        >
                            {t('dashboard.unlockBtn', 'Sblocca ora (1 🪙)')}
                        </button>
                    </div>
                </div>
            )}

                {/* Header (Secondary actions) */}
                <div className={`border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/30 backdrop-blur-md py-4 hidden lg:block`}>
                    <div className="container flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            {user && (
                                <span className={`px-2 py-1 rounded-sm text-[8px] font-bold tracking-[0.2em] uppercase border transition-all ${user.is_subscribed
                                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-subtle)] border-[var(--border-subtle)]'
                                    }`}>
                                    {user.is_subscribed ? t('dashboard.premiumSubscriber', 'PREMIUM') : t('dashboard.freeUser', 'FREE')}
                                </span>
                            )}
                            {trip.status !== 'PLANNING' && (
                                <span className="px-2 py-1 rounded-sm text-[8px] font-bold tracking-[0.2em] uppercase border bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]">
                                    {trip.transport_mode === 'TRAIN' ? t('dashboard.train', 'TRENO') :
                                        trip.transport_mode === 'CAR' ? t('dashboard.car', 'AUTO') : t('dashboard.flight', 'AEREO')}
                                </span>
                            )}
                        </div>

                        {user && isOrganizer && trip.status === 'BOOKED' && (
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
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('dashboard.completeTrip', 'Concludi Viaggio')}</span>
                            </button>
                        )}
                    </div>
                </div>

            {view === 'TRIP' && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* GUEST WAITING SCREEN (Plan B override) */}
                    {!isOrganizer && (trip.status === 'PLANNING' || (hasVoted && trip.status === 'VOTING')) ? (
                    <div className="container py-12">
                        <div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] text-center max-w-2xl mx-auto py-16 shadow-[var(--shadow-lg)]">
                            <div className="text-5xl mb-8">🗳️</div>
                            <h2 className="text-[var(--text-primary)] text-2xl font-semibold mb-4 uppercase tracking-tight">
                                {t('dashboard.votoRegistrato', 'Voto Registrato!') || 'Voto Registrato!'}
                            </h2>
                            <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10">
                                {t('dashboard.votoRegistratoDesc', 'Grazie per aver espresso la tua preferenza. L\'organizzatore sta pianificando il viaggio. Una volta completato, chiedi il link di sola lettura per l\'itinerario finale.')}
                            </p>
                            <div className="inline-block px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm text-[10px] font-bold text-[var(--text-subtle)] tracking-widest uppercase">
                                {t('dashboard.closePage', 'Puoi chiudere questa pagina.')}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <Suspense fallback={<ComponentLoader />}>
                            {trip.status === 'PLANNING' && (
                                <Survey trip={trip} onComplete={handleSurveyComplete} isGenerating={isGenerating} />
                            )}

                            {trip.status === 'VOTING' && (
                                <Voting proposals={proposals} trip={trip} onVoteComplete={handleVotingComplete} isOrganizer={isOrganizer} />
                            )}
                        </Suspense>

                        {trip.status === 'BOOKED' && (
                            <>
                                {/* 1. Logistics (Premium only) */}
                                {(user?.is_subscribed || trip.is_premium) && !trip.accommodation && (
                                    <Suspense fallback={<ComponentLoader />}>
                                        <Logistics trip={trip} />
                                    </Suspense>
                                )}

                                {/* Guest CTA Section */}
                                {!user && (
                                    <div className="container py-12">
                                        <div className="premium-card text-center max-w-2xl mx-auto py-12 border-[var(--accent-digital-blue-dim)] bg-[var(--accent-digital-blue-dim)]/20 shadow-[var(--shadow-lg)]">
                                            <h3 className="text-[var(--text-primary)] text-xl font-semibold mb-4 uppercase tracking-tight">
                                                {t('dashboard.guestCta.title', 'Pianifica il tuo prossimo viaggio')}
                                            </h3>
                                            <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">
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
                                        <Suspense fallback={<ComponentLoader />}>
                                            <HotelConfirmation
                                                trip={trip}
                                                onConfirm={fetchTrip}
                                                setIsGenerating={setIsGenerating}
                                                setProgress={setItineraryProgress}
                                                isPremium={user?.is_subscribed || trip.is_premium}
                                            />
                                        </Suspense>
                                    ) : (
                                        <div className="container py-12">
                                            <div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] text-center max-w-2xl mx-auto py-16 shadow-[var(--shadow-lg)]">
                                                <div className="text-4xl mb-8">✨</div>
                                                <h2 className="text-[var(--text-primary)] text-2xl font-semibold mb-4 uppercase tracking-tight">
                                                    {t('dashboard.consensusReached', 'Consenso Raggiunto!')}
                                                </h2>
                                                <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10 mx-auto">
                                                    {t('dashboard.consensusDesc', {
                                                        defaultValue: "Ottime notizie! Il gruppo ha scelto {{destination}} come meta ufficiale. L'organizzatore sta ora ultimando i dettagli della logistica e dell'hotel per generare l'itinerario finale.",
                                                        destination: trip.destination
                                                    })}
                                                </p>
                                                <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                                                    {t('dashboard.waitingConfirmation', 'In attesa della conferma finale...')}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* 4. Itinerary Section: Visible only when hotel is confirmed and itinerary exists */}
                                {trip.accommodation && itinerary && itinerary.length > 0 && (
                                    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-112px)] overflow-hidden">
                                        {/* Left Side: Timeline (Scrollable) */}
                                        <div className="w-full lg:w-1/2 overflow-y-auto custom-scrollbar p-6 lg:p-12 border-r border-[var(--border-subtle)]">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                                                <h2 className="text-[var(--text-primary)] text-3xl font-semibold tracking-tight uppercase">
                                                    {t('dashboard.itineraryTitle', 'Il tuo Itinerario')}
                                                </h2>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2 px-4">
                                                        <FileDown className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">{t('dashboard.exportPdf', 'PDF')}</span>
                                                    </Button>

                                                    {(user?.is_subscribed || trip.is_premium) && (
                                                        <Button
                                                            variant={isCalendarConnected ? "secondary" : "outline"}
                                                            size="sm"
                                                            onClick={handleConnectCalendar}
                                                            className="h-9 gap-2 px-4"
                                                        >
                                                            <CalendarDays className={`w-3.5 h-3.5 ${isCalendarConnected ? 'text-emerald-500' : ''}`} />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                                {isCalendarConnected ? t('dashboard.calendarConnected', 'Calendar') : t('dashboard.connectCalendar', 'Collega')}
                                                            </span>
                                                        </Button>
                                                    )}

                                                    {isOrganizer && (
                                                        <Button variant="outline" size="sm" onClick={handleResetHotel} className="h-9 px-4">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">{t('dashboard.editLogistics', 'Logistica')}</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <Suspense fallback={<ComponentLoader />}>
                                                <Timeline items={itinerary} />
                                            </Suspense>
                                        </div>

                                        {/* Right Side: Map (Sticky/Fixed) */}
                                        <div className="w-full lg:w-1/2 h-[400px] lg:h-full bg-[var(--bg-surface)]">
                                            {trip.trip_intent !== 'BUSINESS' ? (
                                                <Suspense fallback={<ComponentLoader />}>
                                                    <Map
                                                        items={itinerary}
                                                        hotelLat={trip.hotel_latitude}
                                                        hotelLon={trip.hotel_longitude}
                                                        startDate={trip.start_date}
                                                        isPremium={user?.is_subscribed || trip.is_premium}
                                                    />
                                                </Suspense>
                                            ) : (
                                                <div className="h-full flex items-center justify-center p-12 text-center">
                                                    <div className="max-w-xs">
                                                        <MapIcon className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-4 opacity-20" />
                                                        <p className="text-[var(--text-subtle)] text-xs font-bold uppercase tracking-widest">Mappa non disponibile per viaggi Business</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        </>
                    )}
                </motion.div>
            )}

            {/* AI Floating Action Button */}
            {user && user.is_subscribed && trip.status === 'BOOKED' && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-base rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Sparkles className="w-6 h-6 relative z-10" />
                </button>
            )}

            {/* AI Side Drawer */}
            <AnimatePresence>
                {isChatOpen && (
                    <div className="fixed inset-0 z-[1000] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsChatOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full sm:max-w-md h-full bg-card border-l border-border-subtle relative z-10 shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-border-subtle flex justify-between items-center bg-primary text-base">
                                <div>
                                    <h3 className="m-0 text-2xl font-black uppercase tracking-tight">AI Assistant</h3>
                                    <p className="m-0 text-[10px] uppercase font-black tracking-widest opacity-80">Premium Intelligence</p>
                                </div>
                                <button
                                    onClick={() => setIsChatOpen(false)}
                                    className="bg-white/10 border border-white/20 text-white w-10 h-10 rounded-sm flex items-center justify-center hover:bg-white/20 transition-all font-black"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Suspense fallback={<ComponentLoader />}>
                                    <Chatbot
                                        tripId={id}
                                        onItineraryUpdate={(newItinerary) => setItinerary(newItinerary)}
                                        messages={chatMessages}
                                        setMessages={setChatMessages}
                                    />
                                </Suspense>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {view === 'BUDGET' && (
                <div className="flex justify-center w-full">
                    {!user ? (
                        <div className="container mt-8">
                            <div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] p-12 text-center shadow-[var(--shadow-lg)]">
                                <div className="text-5xl mb-6">💰</div>
                                <h2 className="text-[var(--text-primary)] text-2xl font-semibold mb-3 uppercase tracking-tight">Gestione Budget Avanzata</h2>
                                <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                                    Tieni traccia del tuo budget di viaggio in tempo reale. Accedi o Registrati per gestire le tue spese in modo professionale.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <Button onClick={() => navigate('/auth')}>Registrati Gratis</Button>
                                    <Button variant="outline" onClick={() => navigate('/auth')}>Accedi</Button>
                                </div>
                            </div>
                        </div>
                    ) : user?.is_subscribed ? (
                                <Suspense fallback={<ComponentLoader />}>
                                    <Budget trip={trip} onUpdate={fetchTrip} />
                                </Suspense>
                    ) : (
                        <div className="container mt-8">
                            <div className="premium-card bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-medium)] p-12 text-center shadow-[var(--shadow-md)]">
                                <div className="text-5xl mb-6">✨</div>
                                <h2 className="text-[var(--text-primary)] text-2xl font-semibold mb-3 uppercase tracking-tight">Gestione Budget Avanzata</h2>
                                <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto mb-10 leading-relaxed">
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
                <Suspense fallback={<ComponentLoader />}>
                    <Finance trip={trip} />
                </Suspense>
            )}

            {view === 'PHOTOS' && (
                <Suspense fallback={<ComponentLoader />}>
                    <Photos trip={trip} />
                </Suspense>
            )}

            {view === 'EVENTS' && (
                <Suspense fallback={<ComponentLoader />}>
                    <Events trip={trip} />
                </Suspense>
            )}

            {isGenerating && <GeneratingOverlay progress={itineraryProgress} />}
                </div> {/* Close Main View Container */}
            </div> {/* Close Main Content Area */}
        </div> /* Close Layout Wrapper */
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
        <div className="fixed inset-0 bg-base z-[9999] flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Background Orbs for atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-blue top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] animate-glow-pulse opacity-20" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center space-y-12 relative z-10"
            >
                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="subtle-heading text-blue-500"
                    >
                        AI ENGINE ACTIVE
                    </motion.div>
                    <h2 className="text-primary text-4xl md:text-5xl font-black tracking-tighter uppercase leading-tight">
                        {t('dashboard.generatingTitle', 'Crafting your <br/> perfect journey...').split('<br/>').map((line, i) => (
                            <React.Fragment key={i}>{line}<br/></React.Fragment>
                        ))}
                    </h2>
                    <div className="h-8 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.p 
                                key={messages[msgIndex]}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-muted text-lg font-medium tracking-tight"
                            >
                                {messages[msgIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="relative">
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl font-black text-primary font-mono tabular-nums">
                            {progress}%
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-muted font-black uppercase tracking-[0.25em] max-w-xs mx-auto leading-relaxed opacity-60">
                    {t('dashboard.generatingDesc', "Our AI is optimizing rhythms and stops for your group's unique preferences.")}
                </p>
            </motion.div>
        </div>
    );
};

export default Dashboard;