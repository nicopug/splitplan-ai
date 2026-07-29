import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchStation, generateTrainlineURL } from '../utils/trainline';
import { Button } from './ui/button';
import { Plane, Train, Car, Home, ExternalLink } from 'lucide-react';

const Logistics = ({ trip }) => {
    const { t } = useTranslation();
    const [trainUrl, setTrainUrl] = useState("https://www.thetrainline.com/it");

    const origin = trip.departure_airport || trip.departure_city || "Partenza";
    const destinazioneReale = trip.real_destination || trip.destination || '';
    const haDestinazione = Boolean(destinazioneReale);
    const destName = destinazioneReale || t('logistics.destinationFallback', 'Destinazione');
    const numPeople = trip.num_people || 1;

    // Booking e Google Flights vogliono date in formato YYYY-MM-DD. Passando
    // trip.start_date intero (che e' un ISO con orario, "2026-08-02T00:00:00")
    // la data veniva ignorata e i siti proponevano un periodo a caso: chi
    // cercava il 2-7 agosto si ritrovava con il 22-29.
    const soloData = (valore) => (valore ? String(valore).split('T')[0] : '');
    const checkin = soloData(trip.start_date);
    const checkout = soloData(trip.end_date);

    const fallbackHotelLink = (() => {
        if (!haDestinazione) return '#';
        const p = new URLSearchParams({ ss: destinazioneReale, group_adults: String(numPeople) });
        if (checkin) p.set('checkin', checkin);
        if (checkout) p.set('checkout', checkout);
        return `https://www.booking.com/searchresults.html?${p.toString()}`;
    })();

    const linkVoli = (() => {
        if (!haDestinazione) return '#';
        const partenza = trip.departure_city || trip.departure_airport || '';
        const query = [
            'Voli',
            partenza ? `da ${partenza}` : '',
            `a ${destinazioneReale}`,
            checkin ? `il ${checkin}` : '',
            checkout ? `ritorno ${checkout}` : '',
        ].filter(Boolean).join(' ');
        return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
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
                            // La ricerca voli via Duffel e' stata rimossa: richiede un
                            // account commerciale attivo, e senza codici IATA validi sul
                            // viaggio rispondeva comunque con un errore. Come per gli
                            // hotel, si rimanda a un motore di ricerca esterno finche'
                            // l'integrazione non sara' attivabile davvero.
                            <>
                                <h3 className="text-primary text-2xl font-black uppercase tracking-tight">Voli</h3>
                                <p className="text-muted text-base leading-relaxed font-medium">
                                    Cerca il volo da <strong className="text-primary">{origin}</strong> a <strong className="text-primary">{destName}</strong>, poi inserisci i dati qui sotto.
                                </p>
                                <Button
                                    onClick={() => window.open(linkVoli, '_blank')}
                                    disabled={!haDestinazione}
                                    fullWidth
                                    className="btn-magic disabled:opacity-50"
                                >
                                    Cerca su Google Flights →
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
                            {haDestinazione
                                ? <>Cerca dove dormire a <strong className="text-primary">{destName}</strong>, poi inserisci i dati qui sotto.</>
                                : <>Indica prima la destinazione del viaggio: senza, la ricerca partirebbe a vuoto.</>}
                        </p>
                        {/* La ricerca "con l'IA" e' stata rimossa: restituiva strutture e
                            prezzi inventati dal modello, non disponibilita' reali. Le
                            prenotazioni passeranno da Duffel Stays, come per i voli. */}
                        <Button onClick={() => window.open(fallbackHotelLink, '_blank')} disabled={!haDestinazione} fullWidth className="btn-magic disabled:opacity-50">
                            Cerca su Booking.com →
                        </Button>
                    </div>
                </div>

                {/* ── RISULTATI VOLI DUFFEL (inline, full-width) ── */}
            </div>

            {/* ── HOTEL MODAL (IA) ── */}
        </div>
    );
};

export default Logistics;
