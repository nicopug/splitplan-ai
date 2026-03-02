import React, { useState, useEffect } from 'react';
import { createTrip } from '../api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';

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
        <header className="section bg-black">
            <div className="container h-full">
                <div className="viewport-split items-center">

                    {/* Left: Content */}
                    <div className="space-y-8 py-12 lg:pr-12">
                        {/* Minimalist Badge */}
                        <div className="inline-block px-3 py-1 rounded-sm border border-white/10 bg-white/5 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
                            {t('hero.badge')}
                        </div>

                        {/* Heading */}
                        <h1 className="text-white">
                            {t('hero.titlePrefix')}{' '}
                            <span className="text-gray-500">{t('hero.titleHighlight')}</span>
                        </h1>

                        {/* Description */}
                        <p className="text-gray-500 text-lg max-w-md leading-relaxed">
                            {t('hero.description')}
                        </p>

                        {/* CTA Cluster */}
                        <div className="flex items-center gap-6 pt-4">
                            <button
                                className="px-8 py-3 bg-white text-black font-semibold rounded-sm hover:bg-gray-200 transition-colors"
                                onClick={handleIniziaOra}
                                disabled={loading}
                            >
                                {loading ? t('common.loading') : t('hero.cta')}
                            </button>
                            <button
                                className="text-white font-medium hover:text-gray-300 transition-colors flex items-center gap-2 group"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                {t('hero.learnMore', 'Scopri di più')}
                                <svg className="w-4 h-4 transform group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right: Technical Visual (App Mockup) */}
                    <div className="relative flex items-center justify-center lg:justify-end py-12 h-full">
                        {/* Void Background Effect - very subtle */}
                        <div className="absolute inset-x-0 inset-y-0 bg-radial-gradient from-white/5 to-transparent opacity-30 pointer-events-none" />

                        <div className="relative w-full max-w-[540px] shadow-[0_0_100px_rgba(255,255,255,0.05)] border border-white/5 rounded-lg overflow-hidden bg-[#050505] z-10">
                            <img
                                src="/dashboard-preview.png"
                                alt="SplitPlan Dashboard"
                                className="w-full h-auto block opacity-90 hover:opacity-100 transition-opacity"
                                loading="lazy"
                            />

                            {/* Discrete UI Overlays */}
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span style={{ fontSize: '10px', color: '#fff', fontWeight: '600', letterSpacing: '0.05em' }}>AI ENGINE ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Trip Type Selection Modal - Minimalist */}
            {showTypeSelection && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#050505] w-full max-w-md border border-white/10 rounded-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-semibold text-center mb-8 text-white">{t('hero.selectionTitle')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                className="flex flex-col items-center gap-4 p-8 border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/20 transition-all rounded-sm"
                            >
                                <span className="text-3xl opacity-80">👥</span>
                                <span className="font-semibold text-sm">{t('hero.groupTitle')}</span>
                            </button>
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                className="flex flex-col items-center gap-4 p-8 border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/20 transition-all rounded-sm"
                            >
                                <span className="text-3xl opacity-80">✈️</span>
                                <span className="font-semibold text-sm">{t('hero.soloTitle')}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowTypeSelection(false)}
                            className="w-full mt-8 text-gray-500 hover:text-white transition-colors text-xs font-semibold tracking-wider"
                        >
                            {t('common.cancel').toUpperCase()}
                        </button>
                    </div>
                </div>
            ) || null}

        </header>
    );
};

export default Hero;