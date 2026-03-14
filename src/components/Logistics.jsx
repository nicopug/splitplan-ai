import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { searchStation, generateTrainlineURL } from '../utils/trainline';
import { Button } from './ui/button';
import { Plane, Train, Car, Home } from 'lucide-react';

const Logistics = ({ trip }) => {
    const { t } = useTranslation();
    const [trainUrl, setTrainUrl] = useState("https://www.thetrainline.com/it");
    // Defensive Format Dates
    const formatDate = (dateString) => {
        try {
            if (!dateString) return '';
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return ''; // Invalid date
            const y = d.getFullYear().toString().slice(-2);
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${y}${m}${day}`;
        } catch (e) {
            console.warn("Date parse error", e);
            return '';
        }
    };

    const origin = trip.departure_airport || "MXP";
    const dest = trip.destination_iata || "JFK";

    // Safety check for destination name
    // Usiamo real_destination (es. "Paris") per i link di ricerca, destination (titolo creativo) solo come fallback
    const destName = trip.real_destination || trip.destination || t('logistics.destinationFallback', 'Destinazione');

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
                    } else {
                        setTrainUrl('https://www.thetrainline.com/it');
                    }
                } catch (e) {
                    console.error("Error building Trainline link", e);
                    setTrainUrl('https://www.thetrainline.com/it');
                }
            }
        };
        buildTrainLocal();
    }, [trip]);

    // Deep Links
    let flightLink = "#";
    let hotelLink = "#";

    try {
        flightLink = `https://www.skyscanner.it/trasporti/voli/${origin}/${dest}/${start}/${end}/?adultsv2=${numPeople}&cabinclass=economy&ref=home&rtn=1`;
        const safeDestName = encodeURIComponent(destName);
        hotelLink = `https://www.booking.com/searchresults.html?ss=${safeDestName}&checkin=${trip.start_date}&checkout=${trip.end_date}&group_adults=${numPeople}`;
    } catch (e) {
        console.warn("Link generation error", e);
    }

    return (
        <div className="container py-12">
            <div className="max-w-4xl mx-auto space-y-16">
                <div className="text-left space-y-4">
                    <span className="text-subtle font-black tracking-[0.2em] uppercase text-[10px] mb-1 block">{t('logistics.title', 'Logistica & Prenotazioni')}</span>
                    <h2 className="text-primary text-4xl md:text-5xl font-black tracking-tight uppercase">
                        {t('logistics.subtitle', 'I link pronti per prenotare subito, senza impazzire.')}
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* TRANSPORT (Flight, Train, or Car) */}
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
                                <Button
                                    onClick={() => window.open(trainUrl, '_blank')}
                                    fullWidth
                                >
                                    {t('logistics.searchTrains', 'Cerca Treni')}
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
                                    {t('logistics.carBudget', 'Abbiamo incluso una stima di carburante e pedaggi nel tuo Budget.')}
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
                                <Button
                                    onClick={() => window.open(flightLink, '_blank')}
                                    fullWidth
                                >
                                    {t('logistics.searchFlights', 'Cerca Voli')}
                                </Button>
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
                        <Button
                            variant="outline"
                            onClick={() => window.open(hotelLink, '_blank')}
                            fullWidth
                        >
                            {t('logistics.searchHotels', 'Cerca Hotel')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Logistics;
