import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../api';
import { cn } from '../lib/utils';

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
        <div 
            className="premium-card !p-6 flex gap-6 items-start bg-surface border-border-subtle hover:border-border-medium transition-all"
            style={{ borderLeft: `4px solid ${impact.text}` }}
        >
            {/* Icon */}
            <div className="text-4xl shrink-0">{icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="text-primary font-bold text-[15px] m-0">
                        {event.title}
                    </h3>
                    <span 
                        className="text-[10px] font-black tracking-widest uppercase rounded-sm px-2 py-0.5 border"
                        style={{ 
                            color: impact.text, 
                            borderColor: impact.border,
                            backgroundColor: `${impact.text}15` 
                        }}
                    >
                        {impact.label}
                    </span>
                </div>

                {event.dates && (
                    <p className="text-subtle text-[11px] font-bold m-0 mb-2">
                        📅 {event.dates}
                    </p>
                )}

                <p className="text-muted text-sm leading-relaxed m-0">
                    {event.description}
                </p>

                {event.affected_places && event.affected_places.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {event.affected_places.map((place, i) => (
                            <span key={i} className="text-[10px] font-bold text-muted bg-muted/20 border border-border-subtle rounded-sm px-2 py-0.5">
                                📍 {place}
                            </span>
                        ))}
                    </div>
                )}

                {event.travel_tip && (
                    <div className="mt-3 bg-primary-blue/5 border border-primary-blue/10 rounded-sm p-3 text-xs text-primary-blue leading-relaxed">
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
            <div className="text-center py-20 px-5 space-y-4">
                <div className="text-5xl animate-bounce">🔍</div>
                <p className="text-muted text-sm font-black tracking-widest uppercase">
                    Ricerca eventi in corso...
                </p>
                <p className="text-subtle text-xs">
                    Gemini sta analizzando {trip.real_destination || trip.destination} nel periodo del tuo viaggio
                </p>
            </div>
        );
    }

    // --- ERROR ---
    if (error) {
        return (
            <div className="text-center py-20 px-5 space-y-4">
                <div className="text-5xl">⚠️</div>
                <p className="text-red-500 text-sm font-bold">{error}</p>
            </div>
        );
    }

    // --- EMPTY ---
    if (events.length === 0) {
        return (
            <div className="text-center py-20 px-5 space-y-4">
                <div className="text-5xl opacity-40">🌿</div>
                <p className="text-muted text-sm font-bold uppercase tracking-widest">
                    Nessun evento rilevante trovato per questo periodo.
                </p>
                <p className="text-subtle text-xs italic">
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
        <div className="container py-12 space-y-12">

            {/* Header */}
            <div className="space-y-4">
                <span className="subtle-heading">
                    AI • Aggiornato in tempo reale
                </span>
                <h2 className="text-primary font-bold text-3xl md:text-4xl tracking-tight uppercase">
                    Eventi a {trip.real_destination || trip.destination}
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-widest">
                    {trip.start_date} → {trip.end_date} · {events.length} eventi trovati
                </p>
            </div>

            {/* Sezioni per impatto */}
            {[
                { label: 'Alto impatto sul viaggio', items: highImpact, color: 'text-red-500' },
                { label: 'Impatto medio', items: mediumImpact, color: 'text-amber-500' },
                { label: 'Info utili', items: lowImpact, color: 'text-green-500' },
            ].map(({ label, items, color }) =>
                items.length > 0 && (
                    <div key={label} className="space-y-6">
                        <h3 className={cn("subtle-heading !mb-0 text-[10px]", color)}>
                            {label}
                        </h3>
                        <div className="flex flex-col gap-4">
                            {items.map((event, i) => <EventCard key={i} event={event} />)}
                        </div>
                    </div>
                )
            )}

            {/* Footer disclaimer */}
            <p className="text-subtle text-[10px] text-center italic mt-12 py-8 border-t border-border-subtle">
                Le informazioni sugli eventi sono generate da AI e potrebbero non essere complete. Verifica sempre le fonti ufficiali prima di partire.
            </p>
        </div>
    );
};

export default Events;