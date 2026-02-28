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

            {/* Animated Background Orbs */}
            <div className="orb orb-violet" style={{ width: '600px', height: '600px', top: '-200px', left: '-200px', opacity: 0.6 }} />
            <div className="orb orb-cyan" style={{ width: '500px', height: '500px', top: '100px', right: '-200px', opacity: 0.5 }} />
            <div className="orb orb-violet" style={{ width: '400px', height: '400px', bottom: '-150px', left: '30%', opacity: 0.3, animationDelay: '-2s' }} />

            {/* Subtle grid overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
                backgroundSize: '80px 80px'
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
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            fontWeight: '900', lineHeight: '1.08',
                            color: '#f0f0ff'
                        }}>
                            {t('hero.titlePrefix')}{' '}
                            <br className="hidden sm:block" />
                            <span className="gradient-text">{t('hero.titleHighlight')}</span>
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
                                {['🧑‍💻', '👩‍🎨', '🧑‍🚀', '👨‍💼'].map((emoji, i) => (
                                    <span key={i} style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        border: '2px solid #000', background: '#131325',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', marginLeft: i > 0 ? '-8px' : '0'
                                    }}>{emoji}</span>
                                ))}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#7b7b9a' }}>
                                Già usato da <span style={{ color: '#a78bfa', fontWeight: 700 }}>+200</span> viaggiatori
                            </span>
                        </div>
                    </div>

                    {/* Visual */}
                    <div className="relative order-1 lg:order-2 animate-slide-left delay-200">
                        <div style={{
                            borderRadius: '24px', padding: '2px',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(34,211,238,0.4))',
                            boxShadow: '0 0 60px rgba(139,92,246,0.3), 0 0 120px rgba(34,211,238,0.15)'
                        }}>
                            <div style={{
                                borderRadius: '22px', overflow: 'hidden',
                                background: '#0d0d18', padding: '3px'
                            }}>
                                <img
                                    src="/dashboard-preview.png"
                                    alt="SplitPlan Dashboard Preview"
                                    style={{ width: '100%', borderRadius: '20px', display: 'block' }}
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        {/* Floating badge */}
                        <div style={{
                            position: 'absolute', bottom: '-20px', left: '-20px',
                            background: '#0d0d18', border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: '16px', padding: '12px 18px',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#7b7b9a', marginBottom: '2px' }}>AI Planning</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#a78bfa' }}>✨ Pronto in 30s</div>
                        </div>
                        <div style={{
                            position: 'absolute', top: '-16px', right: '-16px',
                            background: '#0d0d18', border: '1px solid rgba(34,211,238,0.3)',
                            borderRadius: '16px', padding: '12px 18px',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#7b7b9a', marginBottom: '2px' }}>Proposta condivisa</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#22d3ee' }}>💫 100% Consenso</div>
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