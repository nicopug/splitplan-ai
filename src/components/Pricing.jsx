import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { useSpotlight } from '../hooks/useSpotlight';
import { useNavigate } from 'react-router-dom';

const PricingCard = ({ title, price, period, description, features, buttonText, highlighted = false }) => {
    const { ref, onMouseMove } = useSpotlight();

    return (
        <div
            ref={ref}
            onMouseMove={onMouseMove}
            className={`premium-card p-10 flex flex-col h-full gap-8 border transition-all duration-500 overflow-hidden ${highlighted
                ? 'border-primary-blue/30 bg-primary-blue/[0.03] shadow-2xl scale-105 z-10'
                : 'border-white/5 bg-card/40 shadow-xl'
                }`}
        >
            <div className="space-y-4">
                <div className={`text-[11px] font-black tracking-[0.2em] uppercase ${highlighted ? 'text-blue-400' : 'text-subtle'}`}>
                    {title}
                </div>
                <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={price}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-5xl font-black text-primary tracking-tighter"
                        >
                            {price}
                        </motion.span>
                    </AnimatePresence>
                    <span className="text-muted text-sm font-medium">{period}</span>
                </div>
                <p className="text-muted text-sm leading-relaxed italic">
                    {description}
                </p>
            </div>

            <div className="space-y-4 flex-1">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 group">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-muted'}`}>
                            <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-muted group-hover:text-primary transition-colors">{feature}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => window.location.href = '/market'}
                className={`w-full h-14 rounded-xl text-[11px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 ${highlighted
                    ? 'bg-primary-blue text-white shadow-xl shadow-primary-blue/20 hover:scale-[1.02]'
                    : 'border border-white/10 text-primary hover:bg-white/5'
                    }`}
            >
                {highlighted && <Zap className="w-4 h-4 fill-current" />}
                {buttonText.toUpperCase()}
            </button>
        </div>
    );
};

const FREE_FEATURES_FALLBACK = [
    "Pianificazione con AI base",
    "Itinerario visuale",
    "Chat di gruppo",
    "Mappa interattiva",
];
const PRO_FEATURES_FALLBACK = [
    "Tutto quello che c'è in Free",
    "AI Co-Pilot Avanzato ✨",
    "Gestione Budget & Spese",
    "Export PDF Premium",
    "Sync Calendario Google",
    "Precedenza su nuove feature",
];

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const freeFeaturesRaw = t('pricing.card_free_features', { returnObjects: true, defaultValue: FREE_FEATURES_FALLBACK });
    const freeFeatures = Array.isArray(freeFeaturesRaw) && freeFeaturesRaw.length > 0 ? freeFeaturesRaw : FREE_FEATURES_FALLBACK;
    const proFeaturesRaw = t('pricing.card_pro_features', { returnObjects: true, defaultValue: PRO_FEATURES_FALLBACK });
    const proFeatures = Array.isArray(proFeaturesRaw) && proFeaturesRaw.length > 0 ? proFeaturesRaw : PRO_FEATURES_FALLBACK;

    return (
        <section id="pricing" className="section bg-base py-32">
            <div className="container">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-20 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="inline-block px-3 py-1 rounded-full border border-white/5 bg-card/50 text-[10px] font-black tracking-[0.2em] uppercase text-blue-500"
                    >
                        {t('pricing.badge_label')}
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black text-primary tracking-tighter uppercase leading-[0.9]"
                    >
                        {t('pricing.section_title_part1')} <br />
                        <span className="text-muted">{t('pricing.section_title_part2')}</span>
                    </motion.h2>

                    {/* Billing Toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-4 p-1.5 bg-card border border-white/5 rounded-2xl relative"
                    >
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all z-10 ${billingCycle === 'monthly' ? 'text-black' : 'text-muted'}`}
                        >
                            {t('pricing.billing_monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`relative px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all z-10 ${billingCycle === 'annual' ? 'text-black' : 'text-muted'}`}
                        >
                            {t('pricing.billing_annual')}
                        </button>
                        <motion.div
                            animate={{ x: billingCycle === 'monthly' ? 0 : '100%', left: billingCycle === 'monthly' ? 0 : -8 }}
                            className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-primary-blue rounded-xl z-0"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />

                        <div className="absolute -right-4 -top-4 rotate-12 bg-emerald-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce">
                            {t('pricing.save_50')}
                        </div>
                    </motion.div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                    >
                        <PricingCard
                            title="Free"
                            price="€0"
                            period={t('pricing.card_free_period', '/sempre')}
                            description={t('pricing.card_free_description', 'Perfetto per esplorazioni occasionali.')}
                            features={freeFeatures}
                            buttonText={isLoggedIn && !isPremium
                                ? t('pricing.btn_current_plan', 'Tuo Piano')
                                : t('pricing.btn_start', 'Inizia Ora')}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                    >
                        <PricingCard
                            title="Pro"
                            price={billingCycle === 'monthly' ? "€7.99" : "€76.99"}
                            period={billingCycle === 'monthly'
                                ? t('pricing.card_pro_period_monthly', '/mese')
                                : t('pricing.card_pro_period_annual', '/anno')}
                            description={t('pricing.card_pro_description', 'Per i viaggiatori che non si fermano mai.')}
                            features={proFeatures}
                            highlighted={true}
                            buttonText={isLoggedIn && isPremium
                                ? t('pricing.btn_current_plan', 'Tuo Piano')
                                : t('pricing.btn_upgrade_pro', 'Passa a Pro')}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="mt-12 text-center space-y-4"
                    >
                        <p className="text-muted text-sm font-medium italic">
                            {t('pricing.business_ready')}
                        </p>
                        <button
                            onClick={() => navigate('/pricing-business')}
                            className="text-primary-blue font-black uppercase tracking-[0.2em] text-[10px] hover:text-blue-400 transition-colors"
                        >
                            {t('pricing.business_cta', 'Vedi piani aziendali →')}
                        </button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
