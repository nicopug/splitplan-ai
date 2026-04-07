import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessOverview, approveTrip, rejectTrip, getInviteToken, exportCompanyExpensesCSV, bulkInviteMembers } from '../api';
import { useToast } from '../context/ToastContext';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Briefcase, Users, MapPin, Calendar, TrendingUp, ExternalLink, Link2, Copy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const STATUS_CONFIG = {
    PLANNING: { label: 'In Pianificazione', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    BOOKED: { label: 'Pianificato', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    PENDING_APPROVAL: { label: 'In Attesa', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
    APPROVED: { label: 'Approvato', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    REJECTED: { label: 'Rifiutato', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
    VOTING: { label: 'Votazione', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
    COMPLETED: { label: 'Completato', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CompanyDashboard = () => {
    const [trips, setTrips] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [processingId, setProcessingId] = useState(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [rejectModal, setRejectModal] = useState(null); // { tripId, tripName }
    const [rejectReason, setRejectReason] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [bulkModal, setBulkModal] = useState(false);
    const [bulkEmails, setBulkEmails] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); }
        catch { return null; }
    })();

    const fetchData = async () => {
        try {
            const data = await getBusinessOverview();
            if (Array.isArray(data)) {
                setTrips(data);
            } else {
                setTrips(data.trips || []);
                setAnalytics(data.analytics || null);
            }
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

    const handleCopyInviteLink = async () => {
        setInviteLoading(true);
        try {
            const data = await getInviteToken();
            const inviteUrl = `${window.location.origin}/join?token=${data.invite_token}`;
            await navigator.clipboard.writeText(inviteUrl);
            setInviteCopied(true);
            showToast('Link di invito copiato negli appunti!', 'success');
            setTimeout(() => setInviteCopied(false), 2000);
        } catch (err) {
            showToast('Errore nella generazione del link: ' + err.message, 'error');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleReject = (tripId, tripName) => {
        setRejectReason('');
        setRejectModal({ tripId, tripName });
    };

    const handleConfirmReject = async () => {
        if (!rejectModal) return;
        setProcessingId(rejectModal.tripId);
        setRejectModal(null);
        try {
            await rejectTrip(rejectModal.tripId, rejectReason || null);
            showToast('Trasferta rifiutata', 'success');
            await fetchData();
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleBulkInvite = async () => {
        const emails = bulkEmails.split('\n').map(e => e.trim()).filter(Boolean);
        if (!emails.length) return;
        setBulkLoading(true);
        try {
            const res = await bulkInviteMembers(user?.company_id, emails);
            showToast(`Inviti inviati: ${res.sent}${res.failed?.length ? `, falliti: ${res.failed.length}` : ''}`, 'success');
            setBulkModal(false);
            setBulkEmails('');
        } catch (err) {
            showToast('Errore invio inviti: ' + err.message, 'error');
        } finally {
            setBulkLoading(false);
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
        <>
        <div className="min-h-screen bg-[var(--bg-base)] pt-[var(--header-height)]">
            <div className="container py-12 max-w-6xl mx-auto px-4">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1">
                        <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--text-subtle)] block mb-2">SplitPlan Pro · Manager</span>
                        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Dashboard Aziendale</h1>
                        <p className="text-[var(--text-muted)] text-sm">Gestisci e approva le trasferte del tuo team</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (!user?.company_id) return;
                            setExportLoading(true);
                            try {
                                await exportCompanyExpensesCSV(user.company_id);
                                showToast('CSV esportato', 'success');
                            } catch {
                                showToast('Errore export CSV', 'error');
                            } finally {
                                setExportLoading(false);
                            }
                        }}
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all shrink-0 disabled:opacity-50"
                    >
                        {exportLoading
                            ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        }
                        Esporta Spese CSV
                    </button>
                    <button
                        onClick={() => setBulkModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all shrink-0"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Invita Team
                    </button>
                    <button
                        onClick={handleCopyInviteLink}
                        disabled={inviteLoading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all shrink-0",
                            inviteCopied
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
                            inviteLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {inviteCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : inviteLoading ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                        {inviteCopied ? 'Link Copiato!' : 'Genera Link Invito'}
                    </button>
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

                {/* Analytics Charts */}
                {analytics && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10"
                    >
                        {/* Monthly Spend Bar Chart */}
                        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Spesa Mensile (EUR)</h3>
                            {(() => {
                                const months = analytics.monthly_spend || [];
                                const maxVal = Math.max(...months.map(m => m.total), 1);
                                return (
                                    <div className="flex items-end gap-2 h-24">
                                        {months.map(m => {
                                            const pct = (m.total / maxVal) * 100;
                                            const label = m.month.slice(5); // "MM"
                                            return (
                                                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-[8px] text-[var(--text-muted)] font-bold">
                                                        {m.total > 0 ? `€${Math.round(m.total)}` : ''}
                                                    </span>
                                                    <div className="w-full flex flex-col justify-end" style={{ height: '56px' }}>
                                                        <div
                                                            className="w-full bg-[var(--accent-primary)] rounded-t-sm transition-all"
                                                            style={{ height: `${Math.max(pct, m.total > 0 ? 4 : 0)}%`, minHeight: m.total > 0 ? '3px' : '0' }}
                                                        />
                                                    </div>
                                                    <span className="text-[8px] text-[var(--text-muted)]">{label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Right column: status breakdown + top destinations */}
                        <div className="flex flex-col gap-4">
                            {/* Status Breakdown */}
                            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Stato Trasferte</h3>
                                {Object.entries(analytics.trips_by_status || {}).map(([status, count]) => {
                                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNING;
                                    const total = Object.values(analytics.trips_by_status).reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return (
                                        <div key={status} className="mb-2">
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <span className={cn("font-bold uppercase tracking-wide", cfg.color)}>{cfg.label}</span>
                                                <span className="text-[var(--text-muted)]">{count}</span>
                                            </div>
                                            <div className="h-1.5 bg-[var(--bg-surface)] rounded-full">
                                                <div className={cn("h-full rounded-full", cfg.color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Top Destinations */}
                            {analytics.top_destinations?.length > 0 && (
                                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Top Destinazioni</h3>
                                    {analytics.top_destinations.map((d, i) => (
                                        <div key={d.destination} className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-[var(--text-muted)]">#{i + 1}</span>
                                                <span className="text-[11px] font-semibold truncate max-w-[100px]">{d.destination}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-[var(--accent-primary)]">{d.count}x</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Onboarding Checklist — shown only for new admins with no trips */}
                {trips.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-10 p-6 bg-[var(--bg-card)] border border-[var(--accent-primary)]/30 rounded-sm"
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] mb-4">Inizia con SplitPlan</p>
                        <div className="space-y-3">
                            {[
                                { done: true, text: 'Account aziendale creato' },
                                { done: false, text: 'Invita il tuo team', action: () => setBulkModal(true), actionLabel: 'Invita ora' },
                                { done: false, text: 'Crea la prima trasferta aziendale', action: () => window.location.href = '/', actionLabel: 'Crea trasferta' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'border-2 border-[var(--border-medium)]'}`}>
                                            {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-sm ${item.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{item.text}</span>
                                    </div>
                                    {!item.done && item.action && (
                                        <button onClick={item.action} className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] hover:underline shrink-0">
                                            {item.actionLabel}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

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
                                                    onClick={() => handleReject(trip.id, trip.name)}
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

        {/* Modale bulk invite */}
        {bulkModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-sm shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-2">Invita Team</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                        Incolla le email dei tuoi colleghi (una per riga, max 50). Riceveranno un link per unirsi all'azienda.
                    </p>
                    <textarea
                        value={bulkEmails}
                        onChange={e => setBulkEmails(e.target.value)}
                        placeholder={"mario@azienda.it\nluca@azienda.it\ngiulia@azienda.it"}
                        rows={6}
                        className="w-full text-sm p-3 rounded border border-[var(--border-medium)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-primary)] font-mono"
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {bulkEmails.split('\n').filter(e => e.trim()).length} email inserite
                    </p>
                    <div className="flex gap-3 mt-4 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setBulkModal(false)} className="text-[10px] uppercase tracking-widest">
                            Annulla
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleBulkInvite}
                            disabled={bulkLoading || !bulkEmails.trim()}
                            className="bg-[var(--accent-primary)] hover:opacity-90 text-[10px] uppercase tracking-widest"
                        >
                            {bulkLoading
                                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : 'Invia Inviti'
                            }
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modale rifiuto con campo motivazione */}
        {rejectModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-sm shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-2">Rifiuta trasferta</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                        Stai rifiutando <span className="font-semibold text-[var(--text-primary)]">"{rejectModal.tripName}"</span>.
                        Puoi aggiungere una motivazione (opzionale).
                    </p>
                    <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Es: Il budget supera la policy aziendale..."
                        rows={3}
                        className="w-full text-sm p-3 rounded border border-[var(--border-medium)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <div className="flex gap-3 mt-4 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setRejectModal(null)} className="text-[10px] uppercase tracking-widest">
                            Annulla
                        </Button>
                        <Button size="sm" onClick={handleConfirmReject} className="bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase tracking-widest">
                            Conferma rifiuto
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CompanyDashboard;
