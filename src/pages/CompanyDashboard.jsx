import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessOverview, approveTrip, rejectTrip } from '../api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Briefcase, Users, MapPin, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const STATUS_CONFIG = {
    PLANNING: { label: 'In Pianificazione', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    BOOKED: { label: 'Pianificato', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    PENDING_APPROVAL: { label: 'In Attesa', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
    APPROVED: { label: 'Approvato', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    VOTING: { label: 'Votazione', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
    COMPLETED: { label: 'Completato', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CompanyDashboard = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [processingId, setProcessingId] = useState(null);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); }
        catch { return null; }
    })();

    const fetchData = async () => {
        try {
            const data = await getBusinessOverview();
            setTrips(data);
        } catch (err) {
            showToast('Errore caricamento trasferte: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.is_manager) {
            navigate('/my-trips');
            return;
        }
        fetchData();
    }, []);

    const handleApprove = async (tripId) => {
        setProcessingId(tripId);
        try {
            await approveTrip(tripId);
            showToast('Trasferta approvata', 'success');
            await fetchData();
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (tripId) => {
        setProcessingId(tripId);
        try {
            await rejectTrip(tripId);
            showToast('Trasferta rifiutata', 'success');
            await fetchData();
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const pending = trips.filter(t => t.status === 'PENDING_APPROVAL');
    const approved = trips.filter(t => t.status === 'APPROVED');
    const totalCost = trips.reduce((s, t) => s + (t.estimated_cost || 0), 0);

    const displayed = filter === 'ALL' ? trips
        : filter === 'PENDING' ? pending
        : filter === 'APPROVED' ? approved
        : trips.filter(t => t.status === 'COMPLETED');

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] pt-[var(--header-height)]">
            <div className="container py-12 max-w-6xl mx-auto px-4">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--text-subtle)] block mb-2">SplitPlan Pro · Manager</span>
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Dashboard Aziendale</h1>
                    <p className="text-[var(--text-muted)] text-sm">Gestisci e approva le trasferte del tuo team</p>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
                >
                    {[
                        { icon: <Briefcase className="w-5 h-5" />, label: 'Totale Trasferte', value: trips.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { icon: <Clock className="w-5 h-5" />, label: 'In Attesa', value: pending.length, color: 'text-amber-500', bg: 'bg-amber-500/10', highlight: pending.length > 0 },
                        { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Approvate', value: approved.length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { icon: <TrendingUp className="w-5 h-5" />, label: 'Costo Stimato', value: totalCost > 0 ? `€${totalCost.toLocaleString('it-IT', { maximumFractionDigits: 0 })}` : '—', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className={cn(
                                "bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5 flex flex-col gap-3",
                                stat.highlight && "border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                            )}
                        >
                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", stat.bg, stat.color)}>
                                {stat.icon}
                            </div>
                            <div>
                                <div className="text-2xl font-black tracking-tight">{stat.value}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Pending approvals alert */}
                {pending.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="mb-8 p-4 bg-amber-500/5 border border-amber-500/30 rounded-sm flex items-center gap-3"
                    >
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {pending.length} {pending.length === 1 ? 'trasferta in attesa' : 'trasferte in attesa'} di approvazione
                        </p>
                    </motion.div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {[
                        { key: 'ALL', label: 'Tutte' },
                        { key: 'PENDING', label: `In Attesa${pending.length > 0 ? ` (${pending.length})` : ''}` },
                        { key: 'APPROVED', label: 'Approvate' },
                        { key: 'COMPLETED', label: 'Completate' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={cn(
                                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all border",
                                filter === tab.key
                                    ? "bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)]"
                                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Trips list */}
                {displayed.length === 0 ? (
                    <div className="text-center py-20 text-[var(--text-muted)]">
                        <Briefcase className="w-10 h-10 mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nessuna trasferta trovata</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayed.map((trip, i) => {
                            const cfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.PLANNING;
                            const isProcessing = processingId === trip.id;
                            return (
                                <motion.div
                                    key={trip.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[var(--border-medium)] transition-all"
                                >
                                    {/* Left info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-sm font-black uppercase tracking-tight truncate">{trip.name}</h3>
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {trip.organizer_name}
                                            </span>
                                            {trip.destination && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {trip.destination}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
                                            </span>
                                            {trip.estimated_cost && (
                                                <span className="font-bold text-[var(--text-primary)]">
                                                    €{trip.estimated_cost.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => navigate(`/trip/${trip.id}`)}
                                            className="p-2 rounded-sm border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
                                            title="Apri viaggio"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                        {trip.status === 'PENDING_APPROVAL' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleReject(trip.id)}
                                                    variant="outline"
                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-1.5 text-red-500 border-red-500/30 hover:bg-red-500/10"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Rifiuta
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleApprove(trip.id)}
                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Approva
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyDashboard;
