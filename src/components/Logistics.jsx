import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchStation, generateTrainlineURL } from '../utils/trainline';
import { searchTripOptions } from '../api';
import { Button } from './ui/button';
import { Plane, Train, Car, Home, X, Sparkles, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const Logistics = ({ trip, onPrefill }) => {
    const { t } = useTranslation();
    const [trainUrl, setTrainUrl] = useState("https://www.thetrainline.com/it");

    // Modal State for OTA options
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'flight' or 'hotel'
    const [options, setOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const formatDate = (dateString) => {
        try {
            if (!dateString) return '';
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear().toString().slice(-2);
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${y}${m}${day}`;
        } catch (e) {
            return '';
        }
    };

    const origin = trip.departure_airport || "MXP";
    const destName = trip.real_destination || trip.destination || t('logistics.destinationFallback', 'Destinazione');
    const dest = trip.destination_iata || "JFK";
    const start = formatDate(trip.start_date);
    const end = formatDate(trip.end_date);
    const numPeople = trip.num_people || 1;

    useEffect(() => {
        const buildTrainLocal = () => {
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
        };
        buildTrainLocal();
    }, [trip]);

    const openModal = async (type) => {
        setModalType(type);
        setIsModalOpen(true);
        setIsLoadingOptions(true);
        setOptions([]);
        try {
            const data = await searchTripOptions(trip.id, type);
            if (data && data.options) {
                setOptions(data.options);
            } else {
                toast.error("Nessuna opzione trovata dall'IA.");
            }
        } catch (e) {
            toast.error("Errore durante la ricerca delle opzioni.");
        } finally {
            setIsLoadingOptions(false);
        }
    };

    const handleSelectOption = (option) => {
        const prefillPayload = {
            type: modalType,
            price: option.price,
            provider: option.provider,
            title: option.title,
            details: option.details,
            booking_url: option.booking_url
        };

        setIsModalOpen(false);

        // Call back parent (Dashboard) to update prefillData state
        if (typeof onPrefill === 'function') {
            onPrefill(prefillPayload);
            toast.success(`✅ Dati di "${option.title || option.provider}" copiati nel form!`);
            setTimeout(() => {
                const formSection = document.getElementById('hotel-confirmation-form');
                if (formSection) {
                    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // Fall back: the hotel form may not be visible (itinerary already generated)
                    // In that case just open booking URL
                    window.open(option.booking_url, '_blank');
                }
            }, 300);
        } else {
            // No onPrefill callback available, just redirect to provider
            toast.info(`Apertura ${option.provider}...`);
            window.open(option.booking_url, '_blank');
        }
    };

    let fallbackFlightLink = "#";
    let fallbackHotelLink = "#";
    try {
        fallbackFlightLink = `https://www.skyscanner.it/trasporti/voli/${origin}/${dest}/${start}/${end}/?adultsv2=${numPeople}&cabinclass=economy&ref=home&rtn=1`;
        fallbackHotelLink = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destName)}&checkin=${trip.start_date}&checkout=${trip.end_date}&group_adults=${numPeople}`;
    } catch (e) {}

    return (
        <div className="container py-12 relative">
            <div className="max-w-4xl mx-auto space-y-16">
                <div className="text-left space-y-4">
                    <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-1 block">{t('logistics.title', 'Logistica & Prenotazioni')}</span>
                    <h2 className="text-primary text-4xl md:text-5xl font-black tracking-tight uppercase">
                        {t('logistics.subtitle', 'I link pronti per prenotare subito, senza impazzire.')}
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* TRANSPORT */}
                    <div className="premium-card bg-card border border-border-medium p-12 flex flex-col items-center text-center space-y-8 group shadow-md transition-all duration-500 hover:shadow-xl">
                        <div className="w-20 h-20 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500 shadow-inner-white">
                            {trip.transport_mode === 'TRAIN' ? <Train className="w-10 h-10" /> :
                                trip.transport_mode === 'CAR' ? <Car className="w-10 h-10" /> : <Plane className="w-10 h-10" />}
                        </div>

                        {trip.transport_mode === 'TRAIN' ? (
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">
                                    {t('logistics.trainsTitle', 'Treni (Trainline)')}
                                </h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    {t('logistics.trainsDesc', { origin: trip.departure_city || origin, destination: destName, defaultValue: 'Prenota il tuo biglietto del treno da {{origin}} a {{destination}}.' })}
                                </p>
                                <Button onClick={() => openModal('flight')} fullWidth className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border-none">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Trova Opzioni con l'IA
                                </Button>
                            </>
                        ) : trip.transport_mode === 'CAR' ? (
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">
                                    {t('logistics.carTitle', 'Viaggio in Auto')}
                                </h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    {t('logistics.carDesc', { destination: destName, defaultValue: 'Pensiamo che userai la tua auto per questo viaggio verso {{destination}}.' })}
                                </p>
                                <div className="w-full p-6 bg-surface border border-border-subtle rounded-sm text-[10px] font-black text-subtle tracking-widest uppercase">
                                    {t('logistics.carBudget', 'Stima di carburante inclusa nel budget.')}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">
                                    {t('logistics.flightsTitle', 'Voli (Skyscanner)')}
                                </h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    {t('logistics.flightsDesc', { origin: trip.departure_city || origin, destination: destName, count: numPeople, defaultValue: 'Cerca voli diretti da {{origin}} a {{destination}} per {{count}} persone.' })}
                                </p>
                                <Button onClick={() => openModal('flight')} fullWidth className="btn-magic">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Trova Opzioni con l'IA
                                </Button>
                                <button onClick={() => window.open(fallbackFlightLink, '_blank')} className="text-[10px] text-muted hover:text-primary transition-colors uppercase font-black tracking-widest mt-4">
                                    O vai su Skyscanner classico &rarr;
                                </button>
                            </>
                        )}
                    </div>

                    {/* HOTELS */}
                    <div className="premium-card bg-card border border-border-medium p-12 flex flex-col items-center text-center space-y-8 group shadow-md transition-all duration-500 hover:shadow-xl">
                        <div className="w-20 h-20 bg-surface border border-border-medium rounded-sm flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-base group-hover:border-primary transition-all duration-500 shadow-inner-white">
                            <Home className="w-10 h-10" />
                        </div>
                        <h3 className="text-primary text-2xl font-black uppercase tracking-tight">
                            {t('logistics.hotelsTitle', 'Hotel (Booking.com)')}
                        </h3>
                        <p className="text-muted text-base leading-relaxed font-medium">
                            {t('logistics.hotelsDesc', { destination: destName, defaultValue: 'Le migliori offerte a {{destination}}.' })}
                        </p>
                        <Button onClick={() => openModal('hotel')} fullWidth className="btn-magic">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Trova Opzioni con l'IA
                        </Button>
                        <button onClick={() => window.open(fallbackHotelLink, '_blank')} className="text-[10px] text-muted hover:text-primary transition-colors uppercase font-black tracking-widest mt-4">
                            O vai su Booking classico &rarr;
                        </button>
                    </div>
                </div>
            </div>

            {/* OTA Options Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-base border border-border-strong rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in relative">
                        <div className="p-6 border-b border-border-medium flex justify-between items-center bg-surface">
                            <div>
                                <h2 className="text-xl font-black uppercase text-primary tracking-tight">
                                    Scelta {modalType === 'hotel' ? 'Alloggio' : 'Trasporto'}
                                </h2>
                                <p className="text-sm text-muted font-medium mt-1">
                                    Le migliori 6 opzioni selezionate dall'IA per il tuo budget.
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-primary p-2 bg-base rounded-md border border-border-subtle hover:border-border-strong transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4">
                            {isLoadingOptions ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="animate-spin text-blue-500">
                                        <Sparkles className="w-10 h-10" />
                                    </div>
                                    <p className="text-muted font-medium animate-pulse">L'IA sta negoziando le migliori tariffe...</p>
                                </div>
                            ) : options.length > 0 ? (
                                options.map((opt, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-border-medium rounded-lg bg-surface hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                                        <div className="flex-1 space-y-1 mb-4 sm:mb-0 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-base px-2 py-0.5 rounded-sm">
                                                    {opt.provider}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-bold text-primary">{opt.title || opt.details}</h4>
                                            <p className="text-sm text-muted">{opt.details}</p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 pl-4 sm:border-l border-border-medium">
                                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
                                                {opt.price}€
                                            </span>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleSelectOption(opt)} 
                                                className="bg-primary text-base hover:bg-primary/80"
                                            >
                                                Seleziona
                                                <CheckCircle className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted">Huston, abbiamo un problema. Riprova più tardi.</div>
                            )}
                        </div>
                        <div className="p-4 bg-surface border-t border-border-medium text-xs text-muted text-center flex items-center justify-center flex-wrap gap-1">
                            <span>I dati selezionati verranno pre-compilati nel form sottostante.</span>
                            <span className="text-primary font-bold">Puoi modificarli e confermare quando sei pronto!</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logistics;
