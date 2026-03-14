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
        <header className="section bg-[var(--bg-base)] overflow-hidden relative transition-colors duration-500">
            <div className="container h-full min-h-[100vh] flex items-center py-20 relative z-10">
                <div className="flex flex-col lg:flex-row w-full items-center gap-12 lg:gap-20">

                    {/* Left: Content */}
                    <div className="w-full lg:w-1/2 space-y-8 py-12 lg:pr-12 text-left">
                        {/* Minimalist Badge */}
                        <div className="inline-block px-3 py-1 rounded-sm border border-[var(--border-medium)] bg-[var(--bg-card)] text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">
                            {t('hero.badge')}
                        </div>

                        {/* Heading */}
                        <h1 className="text-[var(--text-primary)] text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.95]">
                            {t('hero.titlePrefix')}<br />
                            <span className="text-[var(--text-muted)]">{t('hero.titleHighlight')}</span>
                        </h1>

                        {/* Description */}
                        <p className="text-[var(--text-muted)] text-lg max-w-md leading-relaxed">
                            {t('hero.description')}
                        </p>

                        {/* CTA Cluster */}
                        <div className="flex items-center gap-6 pt-4">
                            <button
                                className="px-8 py-3 bg-[var(--accent-primary)] text-[var(--bg-base)] font-semibold rounded-sm hover:opacity-90 transition-all shadow-lg"
                                onClick={handleIniziaOra}
                                disabled={loading}
                            >
                                {loading ? t('common.loading') : t('hero.cta')}
                            </button>
                            <button
                                className="text-[var(--text-primary)] font-medium hover:opacity-70 transition-all flex items-center gap-2 group"
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
                    <div className="w-full lg:w-1/2 relative flex items-center justify-center lg:justify-end">
                        {/* Void Background Effect - refined for both themes */}
                        <div className="absolute inset-0 bg-radial-gradient from-[var(--accent-digital-blue)]/10 to-transparent opacity-40 pointer-events-none blur-3xl" />

                        <div className="relative w-full max-w-[620px] shadow-[var(--shadow-lg)] border-[6px] border-black/10 rounded-lg overflow-hidden bg-[var(--bg-card)] z-10 transform lg:translate-x-4 hover:scale-[1.02] transition-transform duration-700">
                            <img
                                src="/dashboard-preview.png"
                                alt="SplitPlan Dashboard"
                                className="w-full h-auto block opacity-95 hover:opacity-100 transition-opacity"
                                loading="lazy"
                            />

                            {/* Discrete UI Overlays */}
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-digital-blue)] animate-pulse" />
                                    <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: '600', letterSpacing: '0.05em' }}>AI ENGINE ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Trip Type Selection Modal - Minimalist */}
            {showTypeSelection && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--glass-bg)] backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-surface)] w-full max-w-md border border-[var(--border-medium)] rounded-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-semibold text-center mb-8 text-[var(--text-primary)]">{t('hero.selectionTitle')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                className="flex flex-col items-center gap-4 p-8 border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-medium)] transition-all rounded-sm"
                            >
                                <span className="text-3xl opacity-80">👥</span>
                                <span className="font-semibold text-sm text-[var(--text-primary)]">{t('hero.groupTitle')}</span>
                            </button>
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                className="flex flex-col items-center gap-4 p-8 border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-medium)] transition-all rounded-sm"
                            >
                                <span className="text-3xl opacity-80">✈️</span>
                                <span className="font-semibold text-sm text-[var(--text-primary)]">{t('hero.soloTitle')}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowTypeSelection(false)}
                            className="w-full mt-8 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-semibold tracking-wider"
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