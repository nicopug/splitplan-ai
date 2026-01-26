import React from 'react';

const Logistics = ({ trip }) => {
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
    const destName = trip.real_destination || trip.destination || "Destinazione";

    const start = formatDate(trip.start_date);
    const end = formatDate(trip.end_date);
    const numPeople = trip.num_people || 1;

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
                <h2>Logistica & Prenotazioni</h2>
                <p>I link pronti per prenotare subito, senza impazzire.</p>
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
                            <h3 style={{ color: '#ff6400' }}>Treni (Trainline)</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                Prenota il tuo biglietto del treno da <strong>{trip.departure_city || origin}</strong> a <strong>{destName}</strong>.
                            </p>
                            <a
                                href={`https://www.thetrainline.com/it/cerca/${encodeURIComponent(trip.departure_city || origin)}/${encodeURIComponent(destName)}/${trip.start_date}/${trip.end_date}?adults=${numPeople}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ background: '#ff6400', color: 'white', display: 'inline-block', textDecoration: 'none' }}
                            >
                                Cerca Treni
                            </a>
                        </>
                    ) : trip.transport_mode === 'CAR' ? (
                        <>
                            <h3 style={{ color: '#003580' }}>Viaggio in Auto</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                Assumiamo che userai la tua auto per questo viaggio verso <strong>{destName}</strong>.
                            </p>
                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', color: '#475569' }}>
                                💡 Abbiamo incluso una stima di carburante e pedaggi nel tuo <b>Budget</b>.
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 style={{ color: '#00a698' }}>Voli (Skyscanner)</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>
                                Cerca voli diretti da <strong>{trip.departure_city || origin}</strong> a <strong>{destName}</strong> per {numPeople} persone.
                            </p>
                            <a
                                href={flightLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ background: '#00a698', color: 'white', display: 'inline-block', textDecoration: 'none' }}
                            >
                                Cerca Voli
                            </a>
                        </>
                    )}
                </div>

                {/* HOTELS */}
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderTop: '4px solid #003580' }}>
                    <h3 style={{ color: '#003580' }}>Hotel (Booking.com)</h3>
                    <p style={{ margin: '1rem 0', color: '#666' }}>
                        Le migliori offerte a <strong>{destName}</strong>.
                    </p>
                    <a
                        href={hotelLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ background: '#003580', color: 'white', display: 'inline-block', textDecoration: 'none' }}
                    >
                        Cerca Hotel
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Logistics;
