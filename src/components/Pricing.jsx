import React from 'react';
import { useTranslation } from 'react-i18next';

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const PlanBadge = () => (
        <div style={{
            background: 'var(--primary-blue)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            display: 'inline-block'
        }}>
            {t('pricing.badge')}
        </div>
    );
    return (
        <section id="pricing" className="section">
            <div className="container">
                <div className="text-center" style={{ marginBottom: '4rem' }}>
                    <h2>{t('pricing.title')}</h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem',
                    width: '100%',
                    marginTop: '2rem'
                }}>
                    {/* Free Plan */}
                    <div style={{
                        background: 'var(--bg-white)',
                        padding: '3rem 2rem',
                        borderRadius: '24px',
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>{t('pricing.free_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--primary-blue)' }}>{t('pricing.free_price')}</div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('pricing.free_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left', color: 'var(--text-main)', padding: 0 }}>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.free_feat1')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.free_feat2')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.free_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && !isPremium && <PlanBadge />}
                        </div>
                    </div>

                    {/* Monthly Plan */}
                    <div style={{
                        background: '#f8faff',
                        padding: '3rem 2rem',
                        borderRadius: '24px',
                        border: '2px solid var(--primary-blue)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>{t('pricing.pro_monthly_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--primary-blue)' }}>{t('pricing.pro_monthly_price')}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{t('pricing.per_month')}</span></div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('pricing.pro_monthly_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left', color: 'var(--text-main)', padding: 0 }}>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_monthly_feat1')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_monthly_feat2')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_monthly_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && isPremium && user.subscription_plan === 'MONTHLY' && <PlanBadge />}
                            {isLoggedIn && user.subscription_plan !== 'MONTHLY' && (
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.location.href = '/market'}>{t('pricing.subscribe')}</button>
                            )}
                        </div>
                    </div>

                    {/* Annual Plan */}
                    <div style={{
                        background: 'var(--dark-navy)',
                        padding: '3rem 2rem',
                        borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--accent-orange)',
                            color: 'white',
                            padding: '0.25rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}>
                            {t('pricing.save_50')}
                        </div>
                        <h3 style={{ color: 'white', fontSize: '1.5rem' }}>{t('pricing.pro_annual_name')}</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--secondary-blue)' }}>{t('pricing.pro_annual_price')}<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>{t('pricing.per_year')}</span></div>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{t('pricing.pro_annual_desc')}</p>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left', padding: 0 }}>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_annual_feat1')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_annual_feat2')}</li>
                            <li style={{ marginBottom: '1rem' }}>✓ {t('pricing.pro_annual_feat3')}</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            {isLoggedIn && isPremium && user.subscription_plan === 'ANNUAL' && <PlanBadge />}
                            {isLoggedIn && user.subscription_plan !== 'ANNUAL' && (
                                <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => window.location.href = '/market'}>{t('pricing.subscribe')}</button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Pricing;
