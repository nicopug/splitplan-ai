import React from 'react';
import { useTranslation } from 'react-i18next';

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const PlanBadge = () => (
        <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
            color: 'white', padding: '0.5rem 1.25rem',
            borderRadius: '999px', fontSize: '0.85rem', fontWeight: '700',
            display: 'inline-block', boxShadow: '0 0 16px rgba(139,92,246,0.4)'
        }}>
            {t('pricing.badge')}
        </div>
    );

    const featureStyle = { marginBottom: '1rem', color: '#b0b0d0', display: 'flex', gap: '8px', alignItems: 'flex-start' };
    const checkStyle = { color: '#8b5cf6', fontWeight: '700', flexShrink: 0 };

    return (
        <section id="pricing" className="section" style={{ background: '#000', position: 'relative', overflow: 'hidden' }}>

            {/* Background orb */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: '700px', height: '400px', borderRadius: '50%', pointerEvents: 'none',
                background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)'
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <span style={{
                        display: 'inline-block', padding: '4px 14px', borderRadius: '999px',
                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                        fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#a78bfa', marginBottom: '1rem'
                    }}>
                        Piani & Prezzi
                    </span>
                    <h2 style={{ color: '#f0f0ff' }}>{t('pricing.title')}</h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem', width: '100%', maxWidth: '960px', margin: '0 auto'
                }}>

                    {/* Free Plan */}
                    <div style={{
                        background: '#0d0d18',
                        padding: '2.5rem 2rem', borderRadius: '20px',
                        border: '1px solid rgba(139,92,246,0.15)',
                        display: 'flex', flexDirection: 'column',
                        transition: 'border-color 0.3s, box-shadow 0.3s'
                    }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(139,92,246,0.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <h3 style={{ color: '#f0f0ff', fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('pricing.free_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', margin: '1rem 0', color: '#a78bfa' }}>{t('pricing.free_price')}</div>
                        <p style={{ fontSize: '0.9rem', color: '#7b7b9a', marginBottom: '1.5rem' }}>{t('pricing.free_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '0 0 2rem', padding: 0, color: '#b0b0d0' }}>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.free_feat1')}</li>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.free_feat2')}</li>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.free_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && !isPremium && <PlanBadge />}
                        </div>
                    </div>

                    {/* Monthly Plan */}
                    <div style={{
                        background: '#0d0d18',
                        padding: '2.5rem 2rem', borderRadius: '20px',
                        border: '2px solid rgba(139,92,246,0.5)',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 0 40px rgba(139,92,246,0.12)',
                        position: 'relative'
                    }}>
                        <div style={{
                            position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
                            color: '#fff', padding: '3px 16px', borderRadius: '999px',
                            fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap',
                            letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                            🔥 Più Scelto
                        </div>
                        <h3 style={{ color: '#f0f0ff', fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('pricing.pro_monthly_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', margin: '1rem 0' }}>
                            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                {t('pricing.pro_monthly_price')}
                            </span>
                            <span style={{ fontSize: '1rem', color: '#7b7b9a' }}>{t('pricing.per_month')}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#7b7b9a', marginBottom: '1.5rem' }}>{t('pricing.pro_monthly_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '0 0 2rem', padding: 0 }}>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.pro_monthly_feat1')}</li>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.pro_monthly_feat2')}</li>
                            <li style={featureStyle}><span style={checkStyle}>✓</span> {t('pricing.pro_monthly_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && isPremium && user.subscription_plan === 'MONTHLY' && <PlanBadge />}
                            {isLoggedIn && user.subscription_plan !== 'MONTHLY' && (
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.location.href = '/market'}>
                                    {t('pricing.subscribe')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Annual Plan */}
                    <div style={{
                        background: '#0d0d18',
                        padding: '2.5rem 2rem', borderRadius: '20px',
                        border: '1px solid rgba(34,211,238,0.2)',
                        display: 'flex', flexDirection: 'column', position: 'relative',
                        transition: 'border-color 0.3s, box-shadow 0.3s'
                    }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(34,211,238,0.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{
                            position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                            color: '#fff', padding: '3px 16px', borderRadius: '999px',
                            fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap',
                            letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                            {t('pricing.save_50')}
                        </div>
                        <h3 style={{ color: '#f0f0ff', fontSize: '1.3rem', marginBottom: '0.5rem' }}>{t('pricing.pro_annual_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', margin: '1rem 0' }}>
                            <span style={{ color: '#22d3ee' }}>{t('pricing.pro_annual_price')}</span>
                            <span style={{ fontSize: '1rem', color: '#7b7b9a' }}>{t('pricing.per_year')}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#7b7b9a', marginBottom: '1.5rem' }}>{t('pricing.pro_annual_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '0 0 2rem', padding: 0 }}>
                            <li style={{ ...featureStyle, color: '#b0b0d0' }}><span style={{ color: '#22d3ee', fontWeight: '700' }}>✓</span> {t('pricing.pro_annual_feat1')}</li>
                            <li style={{ ...featureStyle, color: '#b0b0d0' }}><span style={{ color: '#22d3ee', fontWeight: '700' }}>✓</span> {t('pricing.pro_annual_feat2')}</li>
                            <li style={{ ...featureStyle, color: '#b0b0d0' }}><span style={{ color: '#22d3ee', fontWeight: '700' }}>✓</span> {t('pricing.pro_annual_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && isPremium && user.subscription_plan === 'ANNUAL' && <PlanBadge />}
                            {isLoggedIn && user.subscription_plan !== 'ANNUAL' && (
                                <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => window.location.href = '/market'}>
                                    {t('pricing.subscribe')}
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Pricing;
