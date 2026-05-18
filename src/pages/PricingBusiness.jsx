import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CheckCircle2, XCircle, ArrowRight, Building2, Users, Zap,
    ShieldCheck, BarChart3, FileText, Headphones, Star
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const PLANS = [
    {
        id: 'starter',
        name: 'Corporate Starter',
        price: 349,
        annual: 2990,
        description: 'Perfetto per team fino a 30 persone con esigenze di base.',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        highlight: false,
        limits: {
            users: '30 utenti',
            trips: '50 trasferte/mese',
            ai: '800 chiamate AI/mese',
            support: 'Email',
        },
        features: [
            { text: 'Workflow approvazione trasferte', included: true },
            { text: 'Export CSV spese', included: true },
            { text: 'Nota spese PDF', included: true },
            { text: 'Notifiche in-app + email', included: true },
            { text: 'Dashboard manager', included: true },
            { text: 'Invito bulk team', included: true },
            { text: 'Analytics avanzate', included: false },
            { text: 'API access', included: false },
            { text: 'SLA dedicato', included: false },
        ],
    },
    {
        id: 'growth',
        name: 'Business Growth',
        price: 890,
        annual: 7990,
        description: 'Per aziende in crescita con team fino a 120 persone.',
        color: 'text-[var(--accent-primary)]',
        bg: 'bg-[var(--accent-primary)]/10',
        border: 'border-[var(--accent-primary)]/30',
        highlight: true,
        limits: {
            users: '120 utenti',
            trips: 'Illimitate',
            ai: '5.000 chiamate AI/mese',
            support: 'Priorità',
        },
        features: [
            { text: 'Workflow approvazione trasferte', included: true },
            { text: 'Export CSV spese', included: true },
            { text: 'Nota spese PDF', included: true },
            { text: 'Notifiche in-app + email', included: true },
            { text: 'Dashboard manager', included: true },
            { text: 'Invito bulk team', included: true },
            { text: 'Analytics avanzate', included: true },
            { text: 'API access', included: true },
            { text: 'SLA dedicato', included: false },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        annual: null,
        description: 'Soluzione personalizzata per grandi organizzazioni.',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        highlight: false,
        limits: {
            users: 'Illimitati',
            trips: 'Illimitate',
            ai: 'Illimitate',
            support: 'Account manager dedicato',
        },
        features: [
            { text: 'Workflow approvazione trasferte', included: true },
            { text: 'Export CSV spese', included: true },
            { text: 'Nota spese PDF', included: true },
            { text: 'Notifiche in-app + email', included: true },
            { text: 'Dashboard manager', included: true },
            { text: 'Invito bulk team', included: true },
            { text: 'Analytics avanzate', included: true },
            { text: 'API access', included: true },
            { text: 'SLA dedicato', included: true },
        ],
    },
];

const FAQ = [
    {
        q: 'Posso cambiare piano in qualsiasi momento?',
        a: 'Sì, puoi fare upgrade o downgrade del piano in qualsiasi momento. Le modifiche si applicano dal ciclo di fatturazione successivo.',
    },
    {
        q: 'È disponibile un periodo di prova gratuito?',
        a: 'Offriamo un pilot gratuito di 60 giorni per aziende selezionate. Contattaci per sapere se la tua azienda è idonea.',
    },
    {
        q: 'Come funziona la fatturazione?',
        a: 'Fatturazione mensile o annuale (con sconto). Emettiamo fattura elettronica con P.IVA per clienti B2B italiani.',
    },
    {
        q: 'I dati aziendali sono al sicuro?',
        a: 'Sì. I dati sono ospitati su Supabase (PostgreSQL) con crittografia at-rest e in-transit. Siamo conformi GDPR.',
    },
];

const PricingBusiness = () => {
    const navigate = useNavigate();
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => {
        document.title = 'Piani B2B — SplitPlan AI | Software Gestione Trasferte Aziendali';
        return () => { document.title = 'SplitPlan AI'; };
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-base)] pt-[var(--header-height)]">
            <div className="max-w-6xl mx-auto px-4 py-16">

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--accent-primary)] block mb-3">
                        SplitPlan · Piani Aziendali
                    </span>
                    <h1 className="text-5xl font-black uppercase tracking-tight mb-4">
                        Prezzi Trasparenti.<br />ROI Immediato.
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto mb-8">
                        Sostituisci 5 strumenti con 1 piattaforma. Zero complessità, zero costi nascosti.
                    </p>

                    {/* Billing toggle */}
                    <div className="inline-flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm px-4 py-2">
                        <button
                            onClick={() => setAnnual(false)}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm transition-all",
                                !annual
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                                    : "text-[var(--text-muted)]"
                            )}
                        >
                            Mensile
                        </button>
                        <button
                            onClick={() => setAnnual(true)}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm transition-all flex items-center gap-2",
                                annual
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                                    : "text-[var(--text-muted)]"
                            )}
                        >
                            Annuale
                            <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded-sm">
                                -30%
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Plans grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
                    {PLANS.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={cn(
                                "relative bg-[var(--bg-card)] border rounded-sm p-8 flex flex-col",
                                plan.highlight
                                    ? "border-[var(--accent-primary)]/40 shadow-[0_0_0_1px_rgba(var(--accent-primary-rgb),0.15),0_8px_32px_rgba(0,0,0,0.12)]"
                                    : "border-[var(--border-subtle)]"
                            )}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-[var(--accent-primary)] text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-sm flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5" /> Più Popolare
                                    </span>
                                </div>
                            )}

                            {/* Plan header */}
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-5", plan.bg, plan.color)}>
                                <Building2 className="w-5 h-5" />
                            </div>

                            <h2 className="text-lg font-black uppercase tracking-tight mb-1">{plan.name}</h2>
                            <p className="text-[11px] text-[var(--text-muted)] mb-6 leading-relaxed">{plan.description}</p>

                            {/* Price */}
                            <div className="mb-6">
                                {plan.price ? (
                                    <>
                                        <span className="text-4xl font-black tracking-tight">
                                            €{annual ? Math.round(plan.annual / 12) : plan.price}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-sm font-medium"> /mese</span>
                                        {annual && (
                                            <div className="text-[10px] text-emerald-500 font-bold mt-1">
                                                Fatturato annualmente — €{plan.annual.toLocaleString('it-IT')}/anno
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-3xl font-black tracking-tight">Su richiesta</span>
                                )}
                            </div>

                            {/* Limits */}
                            <div className={cn("rounded-sm p-4 mb-6 border", plan.bg, plan.border)}>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                    {[
                                        { label: 'Utenti', value: plan.limits.users },
                                        { label: 'Trasferte', value: plan.limits.trips },
                                        { label: 'AI/mese', value: plan.limits.ai },
                                        { label: 'Supporto', value: plan.limits.support },
                                    ].map(l => (
                                        <div key={l.label}>
                                            <div className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">{l.label}</div>
                                            <div className={cn("text-[11px] font-bold mt-0.5", plan.color)}>{l.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2.5 mb-8 flex-1">
                                {plan.features.map(f => (
                                    <li key={f.text} className="flex items-center gap-2.5">
                                        {f.included
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            : <XCircle className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                                        }
                                        <span className={cn(
                                            "text-[11px] font-medium",
                                            f.included ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"
                                        )}>
                                            {f.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                onClick={() => navigate('/demo')}
                                className={cn(
                                    "w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2",
                                    plan.highlight
                                        ? "bg-[var(--accent-primary)] text-white hover:opacity-90"
                                        : "border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                                )}
                            >
                                {plan.id === 'enterprise' ? 'Contattaci' : 'Richiedi Demo'}
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Feature highlights */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-20"
                >
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-10">
                        Incluso in tutti i piani
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: Zap, title: 'AI Planning', desc: 'Proposta itinerari e budget con Gemini 2.5 Flash' },
                            { icon: ShieldCheck, title: 'GDPR Compliant', desc: 'Dati ospitati in Europa, consensi tracciati' },
                            { icon: BarChart3, title: 'Analytics', desc: 'Spesa mensile, destinazioni top, breakdown stati' },
                            { icon: FileText, title: 'Nota Spese PDF', desc: 'Esporta nota spese per la contabilità con 1 click' },
                        ].map((item, i) => (
                            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-5">
                                <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4">
                                    <item.icon className="w-4.5 h-4.5 text-[var(--accent-primary)]" />
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-wide mb-1">{item.title}</div>
                                <div className="text-[10px] text-[var(--text-muted)] leading-relaxed">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* FAQ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-20 max-w-2xl mx-auto"
                >
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center mb-8">
                        Domande Frequenti
                    </h2>
                    <div className="space-y-2">
                        {FAQ.map((item, i) => (
                            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                                >
                                    <span className="text-[11px] font-bold">{item.q}</span>
                                    <span className={cn(
                                        "text-[var(--text-muted)] transition-transform duration-200 text-lg leading-none shrink-0 ml-4",
                                        openFaq === i && "rotate-45"
                                    )}>+</span>
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-4 text-[11px] text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-subtle)] pt-3">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center bg-[var(--bg-card)] border border-[var(--accent-primary)]/20 rounded-sm p-12"
                >
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--accent-primary)] block mb-3">
                        Pilot Gratuito
                    </span>
                    <h2 className="text-3xl font-black uppercase tracking-tight mb-4">
                        60 giorni gratis.<br />Senza carta di credito.
                    </h2>
                    <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-8">
                        Offriamo un pilot per aziende selezionate. Porta SplitPlan al tuo team,
                        misura il risparmio di tempo, poi decidi.
                    </p>
                    <button
                        onClick={() => navigate('/demo')}
                        className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-8 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-sm hover:opacity-90 transition-opacity"
                    >
                        Inizia il Pilot Gratuito
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </motion.div>

            </div>
        </div>
    );
};

export default PricingBusiness;
