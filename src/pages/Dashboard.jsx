import React, { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrip, generateProposals, getItinerary, optimizeItinerary, generateShareLink, getProposals, getParticipants, resetHotel, unlockTrip, exportTripPDF, completeTrip, getRouteGeometry } from '../api';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { Sparkles, Lock, CheckCircle2, FileDown, Map as MapIcon, Wallet, Camera, X, CalendarDays, Share2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

// Lazy load heavy components
const Survey = lazy(() => import('../components/Survey'));
const Voting = lazy(() => import('../components/Voting'));
const Timeline = lazy(() => import('../components/Timeline'));
const Logistics = lazy(() => import('../components/Logistics'));
const HotelConfirmation = lazy(() => import('../components/HotelConfirmation'));
const Photos = lazy(() => import('../components/Photos'));
const Chatbot = lazy(() => import('../components/Chatbot'));
const Budget = lazy(() => import('../components/Budget'));
const ItineraryMap = lazy(() => import('../components/ItineraryMap'));
const Events = lazy(() => import('../components/Events'));

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
    const [routePolyline, setRoutePolyline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [view, setView] = useState('TRIP');
    const [user, setUser] = useState(null);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', text: 'Ciao! Sono il tuo assistente AI. Come posso aiutarti con l\'itinerario oggi?' }
    ]);
    const [itineraryProgress, setItineraryProgress] = useState(0);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [prefillData, setPrefillData] = useState(null);

    const isBusiness = trip?.trip_intent === 'BUSINESS';

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser) setUser(parsedUser);
        }
    }, []);

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
            showToast('Errore connessione calendar: ' + e.message, "error");
        }
    };

    const fetchTrip = async () => {
        try {
            const data = await getTrip(id);
            setTrip(data);

            const storedUser = localStorage.getItem('user');
            if (storedUser && storedUser !== 'undefined') {
                const userObj = JSON.parse(storedUser);
                const parts = await getParticipants(id);
                const me = parts.find(p => p.account_id === userObj.id || (p.name && p.name.toLowerCase() === userObj.name.toLowerCase()));

                if (me) {
                    setIsOrganizer(!!me.is_organizer);
                    setHasVoted(!!me.has_voted);
                } else {
                    setIsOrganizer(false);
                    setHasVoted(false);
                }
            }

            if (data.status === 'VOTING') {
                const props = await getProposals(id);
                setProposals(props);
            }

            if (data.status === 'BOOKED' || data.status === 'APPROVED' || data.status === 'PENDING_APPROVAL') {
                const items = await getItinerary(id);
                setItinerary(items);
                // Fetch OSRM route geometry async — map renders immediately, polyline upgrades when ready
                if (items.length > 1) {
                    getRouteGeometry(id).then(r => setRoutePolyline(r?.polyline ?? null)).catch(() => {});
                }
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

    useEffect(() => {
        let interval;
        if (trip?.status === 'VOTING') {
            interval = setInterval(async () => {
                try {
                    const data = await getTrip(id);
                    if (data.status !== 'VOTING') fetchTrip();
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [trip?.status, id]);

    const handleRequestApproval = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const apiUrl = window.location.origin.includes('localhost') ? 'http://localhost:8000' : '/api';
            const res = await fetch(`${apiUrl}/trips/${id}/request-approval`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Richiesta inviata al manager", "success");
                await fetchTrip();
            }
        } catch (e) {
            showToast("Errore richiesta approvazione", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleManagerDecision = async (decision) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const apiUrl = window.location.origin.includes('localhost') ? 'http://localhost:8000' : '/api';
            const endpoint = decision === 'approve' ? 'approve' : 'reject';
            const res = await fetch(`${apiUrl}/trips/${id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast(`Viaggio ${decision === 'approve' ? 'approvato' : 'rifiutato'}`, "success");
                await fetchTrip();
            }
        } catch (e) {
            showToast("Errore nella decisione", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSurveyComplete = async (surveyData) => {
        setIsGenerating(true);
        setItineraryProgress(0);
        const progressInterval = setInterval(() => {
            setItineraryProgress(prev => (prev >= 90 ? 90 : prev + 5));
        }, 400);

        try {
            const props = await generateProposals(id, surveyData);
            clearInterval(progressInterval);
            setItineraryProgress(100);
            await new Promise(r => setTimeout(r, 500));
            setProposals(props);
            const isSoloOrBusiness = surveyData.trip_intent === 'BUSINESS' || trip.trip_type === 'SOLO';
            setTrip(prev => ({
                ...prev,
                status: isSoloOrBusiness ? 'BOOKED' : 'VOTING',
                num_people: surveyData.num_people,
                transport_mode: surveyData.transport_mode,
                destination: surveyData.destination,
                departure_airport: surveyData.departure_airport,
                trip_intent: surveyData.trip_intent
            }));
            setTimeout(() => fetchTrip(), 1000);
        } catch (e) {
            clearInterval(progressInterval);
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
            getRouteGeometry(id).then(r => setRoutePolyline(r?.polyline ?? null)).catch(() => {});
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
            showToast("🔗 Link di condivisione copiato!", "success");
        } catch (e) {
            showToast("Errore condivisione: " + e.message, "error");
        }
    };

    const handleResetHotel = async () => {
        const confirmed = await showConfirm("Modifica Logistica", "Vuoi davvero resettare la logistica? L'itinerario attuale verrà eliminato.");
        if (confirmed) {
            try {
                setLoading(true);
                await resetHotel(id);
                showToast("Logistica resettata", "success");
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
            showToast("✨ PDF generato!", "success");
        } catch (e) {
            showToast("Errore esportazione: " + e.message, "error");
        }
    };

    if (loading) return <div className="section text-center">Caricamento in corso...</div>;
    if (!trip) return <div className="section text-center">Viaggio non trovato</div>;

    return (
        <div className="flex h-screen bg-[var(--bg-base)] transition-colors duration-500 overflow-hidden text-[var(--text-primary)]">
            {/* Sidebar Navigation */}
            <div className="w-68 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col pt-8 hidden lg:flex">
                <div className="px-8 mb-10">
                    <span className="subtle-heading text-[var(--text-subtle)] font-bold tracking-[0.2em] uppercase text-[9px] mb-1 block">SplitPlan Pro</span>
                    <h2 className="text-xl font-black uppercase tracking-tight truncate">{trip.name}</h2>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {[
                        { id: 'TRIP', label: t('dashboard.tabs.trip'), icon: <MapIcon className="w-4 h-4" />, condition: isOrganizer || trip.status === 'PLANNING' || trip.status === 'VOTING' || trip.status === 'BOOKED' || trip.status === 'APPROVED' || trip.status === 'PENDING_APPROVAL' },
                        { id: 'BUDGET', label: t('dashboard.tabs.budget'), icon: <Wallet className="w-4 h-4" />, condition: trip.status === 'BOOKED' || trip.status === 'APPROVED' },
                        { id: 'PHOTOS', label: t('dashboard.tabs.photos'), icon: <Camera className="w-4 h-4" /> },
                        { id: 'EVENTS', label: t('dashboard.tabs.events'), icon: <CalendarDays className="w-4 h-4" />, condition: (trip.status === 'BOOKED' || trip.status === 'APPROVED') && trip.trip_intent !== 'BUSINESS' }
                    ].map(btn => (
                        (!btn.hasOwnProperty('condition') || btn.condition) && (
                            <button
                                key={btn.id}
                                onClick={() => setView(btn.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all",
                                    view === btn.id ? "bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                                )}
                            >
                                {btn.icon}
                                <span>{btn.label}</span>
                            </button>
                        )
                    ))}
                </nav>

                <div className="p-6 border-t border-[var(--border-subtle)]">
                    <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--text-primary)] hover:text-[var(--bg-base)] transition-all">
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{t('dashboard.shareBtn')}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="lg:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/80 backdrop-blur-xl p-4 flex justify-between items-center">
                    <h2 className="text-lg font-black uppercase tracking-tight truncate max-w-[200px]">{trip.name}</h2>
                </div>

                <div className="flex-1">
                    {!user && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 sticky top-0 z-[100] backdrop-blur-md">
                            <div className="container text-center">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest uppercase">Sei in modalità Sola Lettura.</p>
                            </div>
                        </div>
                    )}

                    {/* B2B APPROVAL WORKFLOW BANNER */}
                    {trip.trip_intent === 'BUSINESS' && (
                        <div className="container mt-6">
                            <div className={cn(
                                "p-6 rounded-sm border flex flex-col md:flex-row items-center justify-between gap-6 transition-all",
                                (trip.status === 'PLANNING' || trip.status === 'BOOKED') && "bg-blue-500/5 border-blue-500/20",
                                trip.status === 'PENDING_APPROVAL' && "bg-amber-500/5 border-amber-500/20",
                                trip.status === 'APPROVED' && "bg-emerald-500/5 border-emerald-500/20"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center font-bold",
                                        (trip.status === 'PLANNING' || trip.status === 'BOOKED') && "bg-blue-500/10 text-blue-500",
                                        trip.status === 'PENDING_APPROVAL' && "bg-amber-500/10 text-amber-500 animate-pulse",
                                        trip.status === 'APPROVED' && "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {trip.status === 'APPROVED' ? <CheckCircle2 size={24} /> : <Sparkles size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-widest">Stato Approvazione: {trip.status.replace('_', ' ')}</h4>
                                        <p className="text-xs text-muted font-medium">
                                            {(trip.status === 'PLANNING' || trip.status === 'BOOKED') && "L'itinerario è pronto. Invia i dettagli al tuo manager per l'approvazione del budget."}
                                            {trip.status === 'PENDING_APPROVAL' && "Richiesta inviata. Il responsabile sta verificando la conformità con la policy aziendale."}
                                            {trip.status === 'APPROVED' && "Il budget è stato confermato. Ora puoi procedere con la prenotazione di voli e hotel."}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {(trip.status === 'PLANNING' || trip.status === 'BOOKED') && isOrganizer && (
                                        <Button onClick={handleRequestApproval} className="h-12 px-8 uppercase font-black tracking-widest text-[10px]">Invia al Manager</Button>
                                    )}
                                    {trip.status === 'PENDING_APPROVAL' && isOrganizer && (
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleManagerDecision('approve')} className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-6 text-[10px] font-black uppercase tracking-widest">Approva (Simula Manager)</Button>
                                            <Button variant="outline" onClick={() => handleManagerDecision('reject')} className="h-12 px-6 text-[10px] font-black uppercase tracking-widest">Rifiuta</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'TRIP' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                            {!isOrganizer && (trip.status === 'PLANNING' || (hasVoted && trip.status === 'VOTING')) ? (
                                <div className="container py-12">
                                    <div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] text-center max-w-2xl mx-auto py-16 shadow-[var(--shadow-lg)]">
                                        <div className="text-5xl mb-8">🗳️</div>
                                        <h2 className="text-2xl font-semibold mb-4 uppercase tracking-tight">Voto Registrato!</h2>
                                        <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10">L'organizzatore sta pianificando il viaggio. Riceverai il link finale a breve.</p>
                                        <div className="inline-block px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm text-[10px] font-bold text-[var(--text-subtle)] tracking-widest uppercase">Puoi chiudere questa pagina.</div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Suspense fallback={<ComponentLoader />}>
                                        {trip.status === 'PLANNING' && <Survey trip={trip} onComplete={handleSurveyComplete} isGenerating={isGenerating} />}
                                        {trip.status === 'VOTING' && <Voting proposals={proposals} trip={trip} onVoteComplete={handleVotingComplete} isOrganizer={isOrganizer} />}
                                    </Suspense>

                                    {(trip.status === 'BOOKED' || trip.status === 'APPROVED' || trip.status === 'PENDING_APPROVAL') && (
                                        <>
                                            {(trip.trip_intent === 'BUSINESS' && trip.status !== 'APPROVED') ? (
                                                <div className="container py-24 text-center">
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="premium-card bg-card border-2 border-dashed border-border-medium p-16 max-w-2xl mx-auto shadow-xl">
                                                        <div className="relative inline-block mb-8">
                                                            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
                                                            <Lock className="w-16 h-16 text-amber-500 relative z-10" />
                                                        </div>
                                                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Logistica Bloccata</h3>
                                                        <p className="text-muted text-lg leading-relaxed mb-8 font-medium">
                                                            {trip.status === 'PENDING_APPROVAL' ? "In attesa che il tuo Manager approvi la trasferta." : "Invia i dettagli al tuo responsabile per sbloccare la logistica."}
                                                        </p>
                                                        <div className="inline-block px-6 py-2 bg-amber-500/10 border border-amber-500/20 rounded-sm text-[10px] font-black text-amber-600 tracking-[0.2em] uppercase">Approval Required</div>
                                                    </motion.div>
                                                </div>
                                            ) : (
                                                <>
                                                    {(user?.is_subscribed || trip.is_premium) && !trip.accommodation && (
                                                        <Suspense fallback={<ComponentLoader />}><Logistics trip={trip} onPrefill={setPrefillData} /></Suspense>
                                                    )}
                                                    {!trip.accommodation && (
                                                        isOrganizer ? (
                                                            <div id="hotel-confirmation-form">
                                                                <Suspense fallback={<ComponentLoader />}>
                                                                    <HotelConfirmation trip={trip} onConfirm={fetchTrip} setIsGenerating={setIsGenerating} setProgress={setItineraryProgress} isPremium={user?.is_subscribed || trip.is_premium} prefillData={prefillData} />
                                                                </Suspense>
                                                            </div>
                                                        ) : (
                                                            <div className="container py-12">
                                                                <div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] text-center max-w-2xl mx-auto py-16 shadow-[var(--shadow-lg)]">
                                                                    <div className="text-4xl mb-8">✨</div>
                                                                    <h2 className="text-2xl font-semibold mb-4 uppercase tracking-tight">Pianificazione in corso</h2>
                                                                    <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-10 mx-auto">L'organizzatore sta ultimando i dettagli della logistica.</p>
                                                                    <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-[10px] font-bold text-emerald-600 tracking-widest uppercase">In attesa della conferma</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                    {trip.accommodation && itinerary && itinerary.length > 0 && (
                                                        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-112px)] overflow-hidden">
                                                            <div className="w-full lg:w-1/2 overflow-y-auto custom-scrollbar p-6 lg:p-12 border-r border-[var(--border-subtle)]">
                                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                                                                    <h2 className="text-3xl font-semibold tracking-tight uppercase">Il tuo Itinerario</h2>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2 px-4"><FileDown className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">PDF</span></Button>
                                                                        {(user?.is_subscribed || trip.is_premium) && (
                                                                            <Button variant={isCalendarConnected ? "secondary" : "outline"} size="sm" onClick={handleConnectCalendar} className="h-9 gap-2 px-4"><CalendarDays className={cn("w-3.5 h-3.5", isCalendarConnected && "text-emerald-500")} /><span className="text-[10px] font-bold uppercase tracking-widest">{isCalendarConnected ? 'Calendar' : 'Collega'}</span></Button>
                                                                        )}
                                                                        {isOrganizer && <Button variant="outline" size="sm" onClick={handleResetHotel} className="h-9 px-4"><span className="text-[10px] font-bold uppercase tracking-widest">Logistica</span></Button>}
                                                                    </div>
                                                                </div>
                                                                <Suspense fallback={<ComponentLoader />}><Timeline items={itinerary} /></Suspense>
                                                            </div>
                                                            <div className="w-full lg:w-1/2 h-[400px] lg:h-full bg-[var(--bg-surface)]">
                                                                <Suspense fallback={<ComponentLoader />}><ItineraryMap items={itinerary} hotelLat={trip.hotel_latitude} hotelLon={trip.hotel_longitude} startDate={trip.start_date} isPremium={user?.is_subscribed || trip.is_premium} routePolyline={routePolyline} /></Suspense>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {user && user.is_subscribed && (trip.status === 'BOOKED' || trip.status === 'APPROVED') && (
                        <button onClick={() => setIsChatOpen(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-base rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[100] group overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" /><Sparkles className="w-6 h-6 relative z-10" /></button>
                    )}

                    <AnimatePresence>
                        {isChatOpen && (
                            <div className="fixed inset-0 z-[1000] flex justify-end">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChatOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full sm:max-w-md h-full bg-card border-l border-border-subtle relative z-10 shadow-2xl flex flex-col">
                                    <div className="p-8 border-b border-border-subtle flex justify-between items-center bg-primary text-base">
                                        <div><h3 className="m-0 text-2xl font-black uppercase tracking-tight">AI Assistant</h3><p className="m-0 text-[10px] uppercase font-black tracking-widest opacity-80">Premium Intelligence</p></div>
                                        <button onClick={() => setIsChatOpen(false)} className="bg-white/10 border border-white/20 text-white w-10 h-10 rounded-sm flex items-center justify-center hover:bg-white/20 transition-all font-black"><X className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex-1 overflow-hidden"><Suspense fallback={<ComponentLoader />}><Chatbot tripId={id} onItineraryUpdate={setItinerary} messages={chatMessages} setMessages={setChatMessages} /></Suspense></div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {view === 'BUDGET' && (
                        <div className="flex justify-center w-full">
                            {!user ? (
                                <div className="container mt-8"><div className="premium-card bg-[var(--bg-card)] border border-[var(--border-medium)] p-12 text-center shadow-[var(--shadow-lg)]"><div className="text-5xl mb-6">💰</div><h2 className="text-2xl font-semibold mb-3 uppercase tracking-tight">Budget</h2><p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto mb-10">Accedi per gestire le tue spese in modo professionale.</p><div className="flex justify-center gap-4"><Button onClick={() => navigate('/auth')}>Registrati Gratis</Button><Button variant="outline" onClick={() => navigate('/auth')}>Accedi</Button></div></div></div>
                            ) : user?.is_subscribed ? (
                                <Suspense fallback={<ComponentLoader />}><Budget trip={trip} onUpdate={fetchTrip} /></Suspense>
                            ) : (
                                <div className="container mt-8"><div className="premium-card bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-medium)] p-12 text-center shadow-[var(--shadow-md)]"><div className="text-5xl mb-6">✨</div><h2 className="text-2xl font-semibold mb-3 uppercase tracking-tight">Budget Premium</h2><p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto mb-10 leading-relaxed">Passa a Pro per monitorare budget e risparmi in tempo reale.</p><Button onClick={() => navigate('/auth')}>Scopri Premium</Button></div></div>
                            )}
                        </div>
                    )}

                    {view === 'PHOTOS' && <Suspense fallback={<ComponentLoader />}><Photos trip={trip} /></Suspense>}
                    {view === 'EVENTS' && trip.trip_intent !== 'BUSINESS' && (
                        <Suspense fallback={<ComponentLoader />}><Events trip={trip} /></Suspense>
                    )}
                    {isGenerating && <GeneratingOverlay progress={itineraryProgress} />}
                </div>
            </div>
        </div>
    );
};

const GeneratingOverlay = ({ progress }) => {
    const messages = ["Analizzando destinazione...", "Ottimizzando percorsi...", "Cercando punti d'interesse...", "Calcolando tempi...", "Quasi pronto!"];
    const msgIndex = Math.min(Math.floor(progress / 20), messages.length - 1);
    return (
        <div className="fixed inset-0 bg-base z-[9999] flex flex-col items-center justify-center p-8 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="orb orb-blue top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] animate-glow-pulse opacity-20" /></div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center space-y-12 relative z-10">
                <div className="space-y-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="subtle-heading text-blue-500 uppercase tracking-widest font-black">AI Engine Active</motion.div>
                    <h2 className="text-primary text-4xl md:text-5xl font-black tracking-tighter uppercase leading-tight">Creating your journey...</h2>
                    <div className="h-8 flex items-center justify-center"><AnimatePresence mode="wait"><motion.p key={messages[msgIndex]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-muted text-lg font-medium">{messages[msgIndex]}</motion.p></AnimatePresence></div>
                </div>
                <div className="space-y-8"><div className="relative"><div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full" transition={{ duration: 0.5 }} /></div><div className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl font-black font-mono">{progress}%</div></div></div>
            </motion.div>
        </div>
    );
};

export default Dashboard;