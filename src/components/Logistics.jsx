import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchStation, generateTrainlineURL } from '../utils/trainline';
import { searchRealFlights } from '../api';
import { Button } from './ui/button';
import { Plane, Train, Car, Home, Sparkles, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

const Logistics = ({ trip, onPrefill }) => {
    const { t } = useTranslation();
    const [trainUrl, setTrainUrl] = useState("https://www.thetrainline.com/it");

    // State per voli Duffel inline
    const [flightResults, setFlightResults] = useState([]);
    const [isLoadingFlights, setIsLoadingFlights] = useState(false);
    const [flightsSearched, setFlightsSearched] = useState(false);

    // State per hotel modal (IA)

    const origin = trip.departure_airport || trip.departure_city || "Partenza";
    const destName = trip.real_destination || trip.destination || t('logistics.destinationFallback', 'Destinazione');
    const dest = trip.destination_iata || destName;
    const numPeople = trip.num_people || 1;

    const fallbackHotelLink = (() => {
        try {
            return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destName)}&checkin=${trip.start_date}&checkout=${trip.end_date}&group_adults=${numPeople}`;
        } catch { return "#"; }
    })();

    useEffect(() => {
        if (trip.transport_mode === 'TRAIN') {
            try {
                const departure = trip.departure_city || trip.departure_airport || "Milano";
                const destination = trip.real_destination || trip.destination || "Roma";
                const depMatches = searchStation(departure);
                const destMatches = searchStation(destination);
                if (depMatches.length > 0 && destMatches.length > 0) {
                    const outward = trip.start_date ? trip.start_date.split('T')[0] : "";
                    const inward = trip.end_date ? trip.end_date.split('T')[0] : "";
                    const link = generateTrainlineURL({
                        origin: depMatches[0],
                        destination: destMatches[0],
                        outwardDate: `${outward}T08:00:00`,
                        inwardDate: inward ? `${inward}T10:00:00` : undefined,
                        warningsOff: true
                    });
                    setTrainUrl(link);
                }
            } catch (e) {
                console.error("Error building Trainline link", e);
            }
        }
    }, [trip]);

    // ── Ricerca voli Duffel ──────────────────────────
    const handleSearchFlights = async () => {
        setIsLoadingFlights(true);
        setFlightsSearched(true);
        setFlightResults([]);
        try {
            const data = await searchRealFlights(trip.id);
            if (data && data.options && data.options.length > 0) {
                setFlightResults(data.options);
            } else {
                toast.error("Nessun volo trovato per questa tratta/date.");
            }
        } catch (e) {
            toast.error(e.message || "Errore durante la ricerca voli.");
        } finally {
            setIsLoadingFlights(false);
        }
    };

    // ── Selezione volo: prefill transport cost ───────
    const handleSelectFlight = (option) => {
        if (typeof onPrefill === 'function') {
            onPrefill({
                type: 'flight',
                price: option.price,
                provider: option.provider,
                title: option.title,
                details: option.details,
                booking_url: option.booking_url
            });
            toast.success(`✅ Volo "${option.title}" copiato nel form!`);
            setTimeout(() => {
                const formSection = document.getElementById('hotel-confirmation-form');
                if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        } else {
            toast.info(`Volo selezionato: ${option.title} — ${option.price}€`);
        }
    };


    return (
        <div className="container py-12 relative">
            <div className="max-w-4xl mx-auto space-y-16">
                <div className="text-left space-y-4">
                    <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-1 block">{t('logistics.title', 'Logistica & Prenotazioni')}</span>
                    <h2 className="text-primary text-4xl md:text-5xl font-black tracking-tight uppercase">
                        {t('logistics.subtitle', 'I link pronti per prenotare subito, senza impazzire.')}
                    </h2>
                </div>

                {/* ── GRID CARD ── */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* TRANSPORT CARD */}
                    <div className="premium-card bg-card border border-border-medium p-10 flex flex-col items-center text-center space-y-6 group shadow-md transition-all duration-500 hover:shadow-xl">
                        <div className="w-20 h-20 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500">
                            {trip.transport_mode === 'TRAIN' ? <Train className="w-10 h-10" /> :
                                trip.transport_mode === 'CAR' ? <Car className="w-10 h-10" /> : <Plane className="w-10 h-10" />}
                        </div>

                        {trip.transport_mode === 'TRAIN' ? (
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">Treni (Trainline)</h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    Prenota il tuo treno da <strong className="text-primary">{trip.departure_city || origin}</strong> a <strong className="text-primary">{destName}</strong>.
                                </p>
                                <Button asChild fullWidth className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-none">
                                    <a href={trainUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4 mr-2" /> Cerca su Trainline
                                    </a>
                                </Button>
                            </>
                        ) : trip.transport_mode === 'CAR' ? (
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">Viaggio in Auto</h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    Il viaggio verso <strong className="text-primary">{destName}</strong> è in auto.
                                </p>
                                {/* La stima automatica di carburante e pedaggi e' stata rimossa:
                                    era una previsione del modello che finiva mescolata alle
                                    spese reali. I costi auto si registrano come spesa, con la
                                    ricevuta, dalla sezione Budget. */}
                                <div className="w-full p-5 bg-surface border border-border-subtle rounded-md text-[11px] font-medium text-muted leading-relaxed">
                                    Registra carburante e pedaggi come spesa dalla sezione Budget, allegando la ricevuta.
                                </div>
                            </>
                        ) : (
                            // ── VOLI ── box Duffel
                            <>
                                <div className="space-y-1">
                                    <h3 className="text-primary text-2xl font-black uppercase tracking-tight flex items-center gap-2 justify-center flex-wrap">
                                        Voli
                                        <span className="text-[11px] font-bold normal-case bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full tracking-normal">
                                            Powered by Duffel
                                        </span>
                                    </h3>
                                    <p className="text-muted text-sm leading-relaxed font-medium">
                                        <strong className="text-primary">{origin}</strong>
                                        <span className="mx-2 text-subtle">→</span>
                                        <strong className="text-primary">{dest}</strong>
                                        <span className="ml-2 inline-flex items-center gap-1 text-subtle">
                                            <Users className="w-3.5 h-3.5" />{numPeople}
                                        </span>
                                    </p>
                                </div>

                                <Button
                                    onClick={handleSearchFlights}
                                    disabled={isLoadingFlights}
                                    fullWidth
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none shadow-lg shadow-blue-500/20 disabled:opacity-60"
                                >
                                    {isLoadingFlights ? (
                                        <>
                                            <span className="w-4 h-4 mr-2 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                                            Ricerca in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Plane className="w-4 h-4 mr-2" />
                                            {flightsSearched && flightResults.length > 0 ? 'Aggiorna Ricerca' : 'Cerca Voli'}
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>

                    {/* HOTELS CARD */}
                    <div className="premium-card bg-card border border-border-medium p-10 flex flex-col items-center text-center space-y-6 group shadow-md transition-all duration-500 hover:shadow-xl">
                        <div className="w-20 h-20 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500">
                            <Home className="w-10 h-10" />
                        </div>
                        <h3 className="text-primary text-2xl font-black uppercase tracking-tight">Hotel & Alloggi</h3>
                        <p className="text-muted text-base leading-relaxed font-medium">
                            Cerca dove dormire a <strong className="text-primary">{destName}</strong>, poi inserisci i dati qui sotto.
                        </p>
                        {/* La ricerca "con l'IA" e' stata rimossa: restituiva strutture e
                            prezzi inventati dal modello, non disponibilita' reali. Le
                            prenotazioni passeranno da Duffel Stays, come per i voli. */}
                        <Button onClick={() => window.open(fallbackHotelLink, '_blank')} fullWidth className="btn-magic">
                            Cerca su Booking.com →
                        </Button>
                    </div>
                </div>

                {/* ── RISULTATI VOLI DUFFEL (inline, full-width) ── */}
                {flightsSearched && (
                    <div className="w-full animate-fade-in">
                        {/* Header risultati */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-primary text-xl font-black uppercase tracking-tight">
                                    Risultati Voli
                                    {!isLoadingFlights && flightResults.length > 0 && (
                                        <span className="ml-2 text-sm font-medium text-blue-400 normal-case tracking-normal">
                                            {flightResults.length} disponibili
                                        </span>
                                    )}
                                </h3>
                                <p className="text-muted text-sm mt-0.5">
                                    Tariffe reali in tempo reale via Duffel · {origin} → {dest} · {numPeople} pax
                                </p>
                            </div>
                            {!isLoadingFlights && flightResults.length > 0 && (
                                <button
                                    onClick={() => { setFlightsSearched(false); setFlightResults([]); }}
                                    className="text-[10px] text-subtle hover:text-primary transition-colors uppercase font-black tracking-widest"
                                >
                                    Chiudi ×
                                </button>
                            )}
                        </div>

                        {/* Loading skeleton */}
                        {isLoadingFlights && (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-surface border border-border-subtle rounded-lg animate-pulse" />
                                ))}
                            </div>
                        )}

                        {/* Nessun risultato */}
                        {!isLoadingFlights && flightResults.length === 0 && (
                            <div className="p-10 border border-border-subtle rounded-lg bg-surface text-center">
                                <p className="text-muted text-sm">Nessun volo trovato per questa tratta. Verifica che i codici IATA siano corretti.</p>
                            </div>
                        )}

                        {/* Lista voli */}
                        {!isLoadingFlights && flightResults.length > 0 && (
                            <div className="space-y-3">
                                {flightResults.map((opt, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-5 border border-border-medium rounded-xl bg-card hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all duration-200 group/row"
                                    >
                                        {/* Left: airline + details */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Airline icon placeholder */}
                                            <div className="w-12 h-12 shrink-0 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-blue-400 group-hover/row:border-blue-500/30 transition-colors">
                                                <Plane className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-primary font-bold text-base truncate">{opt.title}</p>
                                                <p className="text-muted text-xs mt-0.5 truncate">{opt.details}</p>
                                            </div>
                                        </div>

                                        {/* Center: badge */}
                                        <div className="hidden sm:flex items-center gap-2 mx-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full whitespace-nowrap">
                                                Duffel
                                            </span>
                                        </div>

                                        {/* Right: price + CTA */}
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 leading-none">
                                                    {Number(opt.price).toFixed(2)}€
                                                </p>
                                                <p className="text-[10px] text-subtle uppercase tracking-wide mt-0.5">totale</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelectFlight(opt)}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none shadow-md shadow-blue-500/20 shrink-0"
                                            >
                                                Seleziona
                                                <CheckCircle className="w-3.5 h-3.5 ml-1.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <p className="text-center text-[11px] text-subtle pt-2">
                                    I dati sono forniti in tempo reale da Duffel. Seleziona un volo per pre-compilare il form di conferma.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── HOTEL MODAL (IA) ── */}
        </div>
    );
};

export default Logistics;
