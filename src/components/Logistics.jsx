import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTrainlineUrn } from '../api';

const Logistics = ({ trip }) => {
    const { t } = useTranslation();
    const [trainUrl, setTrainUrl] = useState("https://www.thetrainline.com/it");
    const [isLoadingTrain, setIsLoadingTrain] = useState(false);
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
        const fetchTrainUrl = async () => {
            if (trip.transport_mode === 'TRAIN') {
                setIsLoadingTrain(true);
                try {
                    const departure = trip.departure_city || trip.departure_airport || "Milano";
                    const destination = trip.real_destination || trip.destination || "Roma";

                    const originData = await getTrainlineUrn(departure);
                    const destData = await getTrainlineUrn(destination);

                    const outward = trip.start_date ? trip.start_date.split('T')[0] : "";
                    const inward = trip.end_date ? trip.end_date.split('T')[0] : "";
                    const passengers = trip.num_people || 1;

                    if (originData?.urn && destData?.urn && outward && inward) {
                        const originUrn = encodeURIComponent(originData.urn);
                        const destUrn = encodeURIComponent(destData.urn);
                        const link = `https://www.thetrainline.com/book/results?journeySearchType=return&origin=${originUrn}&destination=${destUrn}&outwardDate=${outward}T08:00:00&outwardDateType=departAfter&inwardDate=${inward}T10:00:00&inwardDateType=departAfter&selectedTab=train&adults=${passengers}`;
                        setTrainUrl(link);
                    } else {
                        setTrainUrl('https://www.thetrainline.com/it');
                    }
                } catch (e) {
                    console.error("Error building Trainline link", e);
                    setTrainUrl('https://www.thetrainline.com/it');
                } finally {
                    setIsLoadingTrain(false);
                }
            }
        };
        fetchTrainUrl();
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
        <div className="section container">
            <div className="text-center" style={{ marginBottom: '2rem' }}>
                <h2>{t('logistics.title', 'Logistica & Prenotazioni')}</h2>
                <p>{t('logistics.subtitle', 'I link pronti per prenotare subito, senza impazzire.')}</p>
            </div>

            <div className="grid-2" style={{ gap: '2rem' }}>
                {/* TRANSPORT (Flight, Train, or Car) */}
                <div className="card" style={{
                    padding: '2rem',
                    textAlign: 'center',
                    borderTop: `4px solid ${trip.transport_mode === 'TRAIN' ? '#ff6400' : trip.transport_mode === 'CAR' ? '#003580' : '#00a698'}`
                }}>
                    {trip.transport_mode === 'TRAIN' ? (
                        <>
                            <h3 style={{ color: '#ff6400' }}>{t('logistics.trainsTitle', 'Treni (Trainline)')}</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                {t('logistics.trainsDesc', { origin: trip.departure_city || origin, destination: destName, defaultValue: 'Prenota il tuo biglietto del treno da {{origin}} a {{destination}}.' })}
                            </p>
                            <a
                                href={trainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ background: '#ff6400', color: 'white', display: 'inline-block', textDecoration: 'none', opacity: isLoadingTrain ? 0.7 : 1, pointerEvents: isLoadingTrain ? 'none' : 'auto' }}
                            >
                                {isLoadingTrain ? t('logistics.loadingTrains', 'Caricamento...') : t('logistics.searchTrains', 'Cerca Treni')}
                            </a>
                        </>
                    ) : trip.transport_mode === 'CAR' ? (
                        <>
                            <h3 style={{ color: '#003580' }}>{t('logistics.carTitle', 'Viaggio in Auto')}</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                {t('logistics.carDesc', { destination: destName, defaultValue: 'Pensiamo che userai la tua auto per questo viaggio verso {{destination}}.' })}
                            </p>
                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', color: '#475569' }}>
                                {t('logistics.carBudget', 'Abbiamo incluso una stima di carburante e pedaggi nel tuo Budget.')}
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 style={{ color: '#00a698' }}>{t('logistics.flightsTitle', 'Voli (Skyscanner)')}</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                {t('logistics.flightsDesc', { origin: trip.departure_city || origin, destination: destName, count: numPeople, defaultValue: 'Cerca voli diretti da {{origin}} a {{destination}} per {{count}} persone.' })}
                            </p>
                            <a
                                href={flightLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ background: '#00a698', color: 'white', display: 'inline-block', textDecoration: 'none' }}
                            >
                                {t('logistics.searchFlights', 'Cerca Voli')}
                            </a>
                        </>
                    )}
                </div>

                {/* HOTELS */}
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid #003580' }}>
                    <h3 style={{ color: '#003580' }}>{t('logistics.hotelsTitle', 'Hotel (Booking.com)')}</h3>
                    <p style={{ margin: '1rem 0', color: '#666' }}>
                        {t('logistics.hotelsDesc', { destination: destName, defaultValue: 'Le migliori offerte a {{destination}}.' })}
                    </p>
                    <a
                        href={hotelLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ background: '#003580', color: 'white', display: 'inline-block', textDecoration: 'none' }}
                    >
                        {t('logistics.searchHotels', 'Cerca Hotel')}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Logistics;
