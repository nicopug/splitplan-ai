import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Calendar, MessageSquare, ArrowRight, CheckCircle2, ShieldCheck, Globe, Zap, Mail, Phone, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { submitDemoRequest } from '../api';
import { toast } from 'sonner';
import { JsonLd } from '../components/JsonLd';

const DemoRequest = () => {
    const { t } = useTranslation();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        document.title = 'Richiedi Demo — SplitPlan AI | Software Trasferte Aziendali';
        return () => { document.title = 'SplitPlan AI'; };
    }, []);

    const demoSchema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://splitplan-ai.vercel.app/' },
                    { '@type': 'ListItem', position: 2, name: 'Richiedi Demo', item: 'https://splitplan-ai.vercel.app/demo' },
                ],
            },
            {
                '@type': 'ContactPage',
                '@id': 'https://splitplan-ai.vercel.app/demo#contactpage',
                name: 'Richiedi una demo di SplitPlan AI',
                description: 'Form di contatto per ricevere una demo personalizzata del software di gestione trasferte aziendali SplitPlan AI. Pilot gratuito di 60 giorni per aziende selezionate.',
                inLanguage: 'it',
                isPartOf: { '@id': 'https://splitplan-ai.vercel.app/#website' },
                about: { '@id': 'https://splitplan-ai.vercel.app/#software' },
                mainEntity: {
                    '@type': 'Organization',
                    '@id': 'https://splitplan-ai.vercel.app/#organization',
                },
            },
        ],
    };

    const [formData, setFormData] = useState({
        full_name: '',
        company_name: '',
        work_email: '',
        phone_number: '',
        team_size: '1-10',
        travel_frequency: 'Monthly',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await submitDemoRequest(formData);
            setIsSubmitted(true);
            toast.success(t('demo.success_toast', 'Richiesta inviata! Ti contatteremo a breve.'));
        } catch (error) {
            console.error("Demo request error:", error);
            // toast handles the error via handleResponse in api.js
        } finally {
            setIsLoading(false);
        }
    };

    const BENEFITS_FALLBACK = [
        { title: "Automazione Totale", desc: "Dimentica fogli Excel e prenotazioni manuali." },
        { title: "Policy Compliance", desc: "Applica automaticamente le politiche di spesa aziendali." },
        { title: "Copertura Globale", desc: "Accesso a inventario esclusivo per voli e hotel in tutto il mondo." }
    ];
    const benefitsRaw = t('business.benefits', { returnObjects: true, defaultValue: BENEFITS_FALLBACK });
    const benefitsData = Array.isArray(benefitsRaw) && benefitsRaw.length > 0 ? benefitsRaw : BENEFITS_FALLBACK;
    const benefitsIcons = [Zap, ShieldCheck, Globe];
    const benefits = benefitsData.map((b, i) => ({ ...b, icon: benefitsIcons[i] || Zap }));

    // Fallback se le translation non sono ancora caricate al primo render
    const TEAM_SIZE_FALLBACK = [
        { value: "1-10", label: "1-10 dipendenti" },
        { value: "11-50", label: "11-50 dipendenti" },
        { value: "51-200", label: "51-200 dipendenti" },
        { value: "200+", label: "200+ dipendenti" },
    ];
    const FREQUENCY_FALLBACK = [
        { value: "Weekly", label: "Settimanale" },
        { value: "Monthly", label: "Mensile" },
        { value: "Quarterly", label: "Trimestrale" },
        { value: "Occasional", label: "Occasionale" },
    ];
    const teamSizeRaw = t('demoForm.team_size_options', { returnObjects: true, defaultValue: TEAM_SIZE_FALLBACK });
    const teamSizeOptions = Array.isArray(teamSizeRaw) && teamSizeRaw.length > 0 ? teamSizeRaw : TEAM_SIZE_FALLBACK;
    const frequencyRaw = t('demoForm.frequency_options', { returnObjects: true, defaultValue: FREQUENCY_FALLBACK });
    const frequencyOptions = Array.isArray(frequencyRaw) && frequencyRaw.length > 0 ? frequencyRaw : FREQUENCY_FALLBACK;

    if (isSubmitted) {
        return (
            <div className="min-h-screen pt-[var(--header-height,60px)] flex items-center justify-center bg-base overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-blue/10 blur-[120px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="premium-card max-w-lg w-full p-12 text-center space-y-8 relative z-10"
                >
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black uppercase tracking-tight">Richiesta Ricevuta!</h1>
                        <p className="text-muted text-lg leading-relaxed">
                            Grazie per l'interesse verso <strong>SplitPlan Business</strong>. Un nostro Account Executive ti contatterà all'indirizzo <span className="text-primary font-bold">{formData.work_email}</span> entro 24 ore lavorative.
                        </p>
                    </div>
                    <div className="pt-6">
                        <Button
                            variant="outline"
                            className="w-full h-14 uppercase font-black tracking-widest text-[10px]"
                            onClick={() => window.location.href = '/'}
                        >
                            Torna alla Home
                        </Button>
                    </div>
                    <p className="text-[10px] text-subtle uppercase tracking-[0.2em]">Nel frattempo, controlla la tua email per materiali esclusivi.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-[var(--header-height,60px)] bg-base">
            <div className="container py-12 lg:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                    {/* Left: Value Proposition */}
                    <div className="space-y-12 sticky top-32">
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="subtle-heading text-primary-blue"
                            >
                                SplitPlan for Business
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85] text-primary"
                            >
                                {t('business.headlinePart1')} <br />
                                <span className="text-primary-blue">
                                    {t('business.headlinePart2')}
                                </span> <br />
                                {t('business.headlinePart3')}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl text-muted font-medium tracking-tight max-w-md leading-relaxed"
                            >
                                {t('business.subheadline')}
                            </motion.p>
                        </div>

                        <div className="space-y-6">
                            {benefits.map((b, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="flex gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors group"
                                >
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-blue/10 flex items-center justify-center text-primary-blue group-hover:scale-110 transition-transform">
                                        <b.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-primary">{b.title}</h4>
                                        <p className="text-sm text-subtle">{b.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-border-subtle">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-base bg-elevated" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="premium-card p-8 lg:p-12 relative overflow-hidden"
                    >
                        {/* Decorative background grid */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <User size={12} className="text-primary-blue" />
                                        {t('demoForm.full_name_label', 'Nome Completo')}
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder={t('demoForm.full_name_placeholder', 'Mario Rossi')}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none transition-all placeholder:text-muted/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <Building2 size={12} className="text-primary-blue" />
                                        {t('demoForm.company_label', 'Azienda')}
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        placeholder={t('demoForm.company_placeholder', 'Esempio S.r.l.')}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none transition-all placeholder:text-muted/30"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <Mail size={12} className="text-primary-blue" />
                                        {t('demoForm.email_label', 'Email di Lavoro')}
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        name="work_email"
                                        value={formData.work_email}
                                        onChange={handleChange}
                                        placeholder={t('demoForm.email_placeholder', 'mario@azienda.com')}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none transition-all placeholder:text-muted/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <Phone size={12} className="text-primary-blue" />
                                        {t('demoForm.phone_label', 'Telefono (Opzionale)')}
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        placeholder={t('demoForm.phone_placeholder', '+39 012 3456789')}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none transition-all placeholder:text-muted/30"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <Users size={12} className="text-primary-blue" />
                                        {t('demoForm.team_size_label', 'Dimensione Team')}
                                    </label>
                                    <select
                                        name="team_size"
                                        value={formData.team_size}
                                        onChange={handleChange}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue outline-none appearance-none"
                                    >
                                        {teamSizeOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                        <Calendar size={12} className="text-primary-blue" />
                                        {t('demoForm.frequency_label', 'Frequenza Viaggi')}
                                    </label>
                                    <select
                                        name="travel_frequency"
                                        value={formData.travel_frequency}
                                        onChange={handleChange}
                                        className="w-full h-14 px-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue outline-none appearance-none"
                                    >
                                        {frequencyOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                                    <MessageSquare size={12} className="text-primary-blue" />
                                    {t('demoForm.message_label', 'Esigenze Specifiche')}
                                </label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder={t('demoForm.message_placeholder', 'Raccontaci brevemente di cosa avete bisogno...')}
                                    className="w-full p-5 bg-base border border-border-subtle rounded-sm focus:border-primary-blue outline-none transition-all placeholder:text-muted/30 resize-none"
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    disabled={isLoading}
                                    className="w-full h-16 bg-primary-blue hover:bg-primary-blue-light text-white font-black uppercase tracking-[0.2em] text-[11px] group shadow-xl shadow-primary-blue/20"
                                >
                                    {isLoading ? t('common.loading') : t('business.cta')}
                                    {!isLoading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                                <p className="mt-3 text-[10px] text-primary-blue font-bold uppercase tracking-widest text-center">
                                    {t('business.demo_note')}
                                </p>
                            </div>

                            <p className="text-[9px] text-subtle text-center uppercase tracking-widest leading-relaxed mt-6">
                                {t('business.privacy_disclaimer')}
                            </p>

                            <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                <p className="text-[10px] text-muted font-medium uppercase tracking-[0.1em]">
                                    {t('business.trust_note')}
                                </p>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
            <JsonLd id="demo-request-jsonld" schema={demoSchema} />
        </div>
    );
};

export default DemoRequest;
