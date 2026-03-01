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
        <header className="section pt-8 pb-16 md:pt-16 md:pb-32 relative overflow-hidden" style={{ background: '#000' }}>

            {/* Clean grid overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                backgroundSize: '40px 40px'
            }} />

            <div className="container relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

                    {/* Content */}
                    <div className="space-y-6 md:space-y-8 text-center lg:text-left order-2 lg:order-1">

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 animate-fade-in">
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '6px 14px', borderRadius: '999px',
                                border: '1px solid rgba(139,92,246,0.4)',
                                background: 'rgba(139,92,246,0.1)',
                                fontSize: '0.75rem', fontWeight: '700',
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                color: '#a78bfa',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: '#a78bfa', boxShadow: '0 0 8px #a78bfa',
                                    animation: 'glow-pulse 2s ease-in-out infinite'
                                }} />
                                {t('hero.badge')}
                            </span>
                        </div>

                        {/* Heading */}
                        <h1 className="animate-slide-up delay-100" style={{
                            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                            fontWeight: '900', lineHeight: '0.95',
                            color: '#fff', letterSpacing: '-0.04em'
                        }}>
                            {t('hero.titlePrefix')}{' '}
                            <span style={{ color: '#0070f3' }}>{t('hero.titleHighlight')}</span>
                        </h1>

                        {/* Description */}
                        <p className="animate-slide-up delay-200" style={{
                            fontSize: '1.1rem', color: '#7b7b9a',
                            maxWidth: '480px', margin: '0 auto 0 0', lineHeight: '1.7'
                        }}>
                            {t('hero.description')}
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up delay-300">
                            <button
                                className="btn btn-primary"
                                onClick={handleIniziaOra}
                                disabled={loading}
                                style={{ position: 'relative', zIndex: 1, minWidth: '200px' }}
                            >
                                {loading ? (
                                    <><span className="spinner" />{t('common.loading')}</>
                                ) : t('hero.cta')}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                {t('hero.learnMore', 'Scopri di più')}
                            </button>
                        </div>

                        {/* Social proof mini */}
                        <div className="flex items-center gap-3 justify-center lg:justify-start animate-fade-in delay-400" style={{ paddingTop: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '-4px' }}>
                            </div>
                        </div>
                    </div>

                    {/* Product Perspective Visual */}
                    <div className="relative order-1 lg:order-2 animate-slide-left delay-200" style={{ perspective: '1200px' }}>
                        <div style={{
                            transform: 'rotateY(-15deg) rotateX(8deg) scale(1.1)',
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5), 0 30px 60px -30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                            background: '#0d0d18',
                            overflow: 'hidden'
                        }}
                            className="hover:scale-105 transition-all duration-700"
                        >
                            <img
                                src="/dashboard-preview.png"
                                alt="SplitPlan Dashboard Pro"
                                style={{ width: '100%', display: 'block', opacity: 0.9 }}
                                loading="priority"
                            />
                            {/* Overlay glow */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {/* Floating Micro-UI elements */}
                        <div style={{
                            position: 'absolute', top: '10%', right: '-30px', transform: 'translateZ(40px)',
                            background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px',
                            boxShadow: 'var(--shadow-lg)'
                        }} className="animate-float">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#0070f3]/20 flex items-center justify-center">
                                    <span style={{ fontSize: '1rem' }}>✨</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#7b7b9a' }}>AI Optimization</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>99.8% Efficiency</div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            position: 'absolute', bottom: '15%', left: '-40px', transform: 'translateZ(60px)',
                            background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px',
                            boxShadow: 'var(--shadow-lg)'
                        }} className="animate-float-delayed">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span style={{ fontSize: '1rem' }}>✅</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#7b7b9a' }}>Consensus</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>Fully Resolved</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trip Type Selection Modal */}
            {showTypeSelection && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(12px)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
                }}>
                    <div style={{
                        background: '#0d0d18', borderRadius: '24px', padding: '2.5rem',
                        width: '100%', maxWidth: '480px',
                        border: '1px solid rgba(139,92,246,0.3)',
                        boxShadow: '0 0 60px rgba(139,92,246,0.2)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', color: '#f0f0ff' }}>
                            {t('hero.selectionTitle')}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* Group */}
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                style={{
                                    padding: '2rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.3)',
                                    background: 'rgba(139,92,246,0.05)', cursor: 'pointer', transition: 'all 0.3s',
                                    textAlign: 'center', color: '#f0f0ff',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.7)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.3)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(139,92,246,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>👥</span>
                                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#a78bfa' }}>{t('hero.groupTitle')}</span>
                                <span style={{ fontSize: '0.8rem', color: '#7b7b9a' }}>{t('hero.groupDesc')}</span>
                            </button>
                            {/* Solo */}
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                style={{
                                    padding: '2rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(34,211,238,0.3)',
                                    background: 'rgba(34,211,238,0.05)', cursor: 'pointer', transition: 'all 0.3s',
                                    textAlign: 'center', color: '#f0f0ff',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(34,211,238,0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(34,211,238,0.7)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(34,211,238,0.25)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(34,211,238,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <span style={{ fontSize: '2.5rem' }}>✈️</span>
                                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#22d3ee' }}>{t('hero.soloTitle')}</span>
                                <span style={{ fontSize: '0.8rem', color: '#7b7b9a' }}>{t('hero.soloDesc')}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowTypeSelection(false)}
                            style={{
                                width: '100%', marginTop: '1.5rem', padding: '0.75rem',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#7b7b9a', fontSize: '0.9rem', transition: 'color 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#f0f0ff'}
                            onMouseOut={e => e.currentTarget.style.color = '#7b7b9a'}
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Hero;