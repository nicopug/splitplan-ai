import React, { useState, useEffect } from 'react';
import { createTrip } from '../api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

const Hero = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showPrompt } = useModal();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [showTypeSelection, setShowTypeSelection] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const handleIniziaOra = () => {
        if (user) setShowTypeSelection(true);
        else navigate('/auth');
    };

    const handleCreateTrip = async (type) => {
        setShowTypeSelection(false);
        const title = type === 'SOLO' ? t('hero.createSoloTitle') : t('hero.createGroupTitle');
        const message = type === 'SOLO' ? t('hero.createSoloMessage') : t('hero.createGroupMessage');
        const placeholder = type === 'SOLO' ? t('hero.createSoloPlaceholder') : t('hero.createGroupPlaceholder');

        const tripName = await showPrompt(title, message, placeholder);
        if (!tripName) return;
        setLoading(true);
        try {
            const data = await createTrip({ name: tripName, trip_type: type });
            showToast(t('hero.successMessage'), 'success');
            navigate(`/trip/${data.trip_id}`);
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="section bg-base overflow-hidden relative min-h-screen flex items-center">
            {/* Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-blue top-[-10%] left-[-10%] animate-orb" />
                <div className="orb orb-violet top-[20%] right-[-5%] animate-orb" style={{ animationDelay: '-3s' }} />
                <div className="orb orb-cyan bottom-[10%] left-[20%] animate-orb" style={{ animationDelay: '-6s' }} />
            </div>

            <div className="container relative z-10 py-20">
                <div className="flex flex-col lg:flex-row w-full items-center gap-12 lg:gap-20">
                    {/* Left: Content */}
                    <div className="w-full lg:w-1/2 space-y-8 py-12 lg:pr-12 text-left">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-block px-3 py-1 rounded-full border border-border-medium bg-card/50 backdrop-blur-sm text-[11px] font-bold tracking-[0.15em] uppercase text-blue-500"
                        >
                            {t('hero.badge')}
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-primary text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]"
                        >
                            {t('hero.titlePrefix')}<br />
                            <span className="text-muted block mt-2">{t('hero.titleHighlight')}</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-muted text-xl max-w-lg leading-relaxed font-medium"
                        >
                            {t('hero.description')}
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center gap-8 pt-4"
                        >
                            <Button
                                variant="ai"
                                size="lg"
                                className="px-10 py-4 h-auto text-lg rounded-full"
                                onClick={handleIniziaOra}
                                disabled={loading}
                            >
                                {loading ? t('common.loading') : t('hero.cta')}
                            </Button>
                            
                            <button
                                className="text-primary font-bold hover:text-blue-500 transition-colors flex items-center gap-3 group text-lg"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                {t('hero.learnMore', 'Explore features')}
                                <svg className="w-5 h-5 transform group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </motion.div>
                    </div>

                    {/* Right: Technical Visual */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="w-full lg:w-1/2 relative flex items-center justify-center lg:justify-end"
                    >
                        <div className="relative w-full max-w-[640px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border border-white/10 rounded-2xl overflow-hidden bg-card z-10 transform hover:scale-[1.01] transition-transform duration-700">
                            <img
                                src="/dashboard-preview.png"
                                alt="SplitPlan Dashboard"
                                className="w-full h-auto block opacity-90 hover:opacity-100 transition-opacity duration-500"
                                loading="lazy"
                            />

                            {/* AI Overlay Badge */}
                            <div className="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-glow-pulse" />
                                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: '800', letterSpacing: '0.1em' }}>AI ENGINE ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Trip Type Selection Modal */}
            {showTypeSelection && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface w-full max-w-md border border-white/10 rounded-3xl p-10 shadow-2xl"
                    >
                        <h2 className="text-3xl font-black text-center mb-8 tracking-tighter">{t('hero.selectionTitle')}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                className="flex flex-col items-center gap-6 p-8 border border-white/5 bg-card hover:bg-elevated hover:border-blue-500/30 transition-all rounded-2xl group"
                            >
                                <span className="text-5xl group-hover:scale-110 transition-transform">👥</span>
                                <span className="font-bold text-sm uppercase tracking-widest">{t('hero.groupTitle')}</span>
                            </button>
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                className="flex flex-col items-center gap-6 p-8 border border-white/5 bg-card hover:bg-elevated hover:border-blue-500/30 transition-all rounded-2xl group"
                            >
                                <span className="text-5xl group-hover:scale-110 transition-transform">✈️</span>
                                <span className="font-bold text-sm uppercase tracking-widest">{t('hero.soloTitle')}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowTypeSelection(false)}
                            className="w-full mt-10 text-muted hover:text-primary transition-colors text-xs font-black tracking-[0.2em] uppercase"
                        >
                            {t('common.cancel')}
                        </button>
                    </motion.div>
                </div>
            )}
        </header>
    );
};

export default Hero;