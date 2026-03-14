import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../api';

// Mappa tipo evento → emoji
const EVENT_ICONS = {
    festival: '🎉',
    concert: '🎵',
    sport: '⚽',
    political: '🏛️',
    religious: '⛪',
    market: '🛍️',
    exhibition: '🎨',
    disruption: '⚠️',
    holiday: '📅',
    other: '📌',
};

const IMPACT_COLORS = {
    high: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444', label: 'Alto impatto' },
    medium: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', text: '#eab308', label: 'Impatto medio' },
    low: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', label: 'Basso impatto' },
};

const EventCard = ({ event }) => {
    const impact = IMPACT_COLORS[event.impact] || IMPACT_COLORS.low;
    const icon = EVENT_ICONS[event.type] || EVENT_ICONS.other;

    return (
        <div style={{
            background: impact.bg,
            border: `1px solid ${impact.border}`,
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
        }}>
            {/* Icon */}
            <div style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{icon}</div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                        {event.title}
                    </h3>
                    <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: impact.text,
                        background: impact.bg,
                        border: `1px solid ${impact.border}`,
                        borderRadius: '6px',
                        padding: '2px 8px',
                    }}>
                        {impact.label}
                    </span>
                </div>

                {event.dates && (
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, margin: '0 0 8px 0' }}>
                        📅 {event.dates}
                    </p>
                )}

                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                    {event.description}
                </p>

                {event.affected_places && event.affected_places.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {event.affected_places.map((place, i) => (
                            <span key={i} style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                padding: '3px 10px',
                            }}>
                                📍 {place}
                            </span>
                        ))}
                    </div>
                )}

                {event.travel_tip && (
                    <div style={{
                        marginTop: '12px',
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '0.8rem',
                        color: '#93c5fd',
                        lineHeight: 1.5,
                    }}>
                        💡 <strong>Consiglio:</strong> {event.travel_tip}
                    </div>
                )}
            </div>
        </div>
    );
};

const Events = ({ trip }) => {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const data = await getEvents(trip.id);
                setEvents(data.events || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [trip.id]);

    // --- LOADING ---
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔍</div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Ricerca eventi in corso...
                </p>
                <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '8px' }}>
                    Gemini sta analizzando {trip.real_destination || trip.destination} nel periodo del tuo viaggio
                </p>
            </div>
        );
    }

    // --- ERROR ---
    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
                <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>
            </div>
        );
    }

    // --- EMPTY ---
    if (events.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🌿</div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                    Nessun evento rilevante trovato per questo periodo.
                </p>
                <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '8px' }}>
                    Sembra un periodo tranquillo — ottimo per visitare senza folle!
                </p>
            </div>
        );
    }

    // --- CONTENT ---
    const highImpact = events.filter(e => e.impact === 'high');
    const mediumImpact = events.filter(e => e.impact === 'medium');
    const lowImpact = events.filter(e => e.impact === 'low');

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748b' }}>
                    AI • Aggiornato in tempo reale
                </span>
                <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.5rem', marginTop: '6px', marginBottom: '6px' }}>
                    Eventi a {trip.real_destination || trip.destination}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {trip.start_date} → {trip.end_date} · {events.length} eventi trovati
                </p>
            </div>

            {/* Sezioni per impatto */}
            {[
                { label: '🔴 Alto impatto sul viaggio', items: highImpact },
                { label: '🟡 Impatto medio', items: mediumImpact },
                { label: '🟢 Info utili', items: lowImpact },
            ].map(({ label, items }) =>
                items.length > 0 && (
                    <div key={label} style={{ marginBottom: '2.5rem' }}>
                        <h3 style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: '#475569',
                            marginBottom: '1rem',
                        }}>
                            {label}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {items.map((event, i) => <EventCard key={i} event={event} />)}
                        </div>
                    </div>
                )
            )}

            {/* Footer disclaimer */}
            <p style={{ color: '#334155', fontSize: '0.7rem', textAlign: 'center', marginTop: '2rem', fontStyle: 'italic' }}>
                Le informazioni sugli eventi sono generate da AI e potrebbero non essere complete. Verifica sempre le fonti ufficiali prima di partire.
            </p>
        </div>
    );
};

export default Events;