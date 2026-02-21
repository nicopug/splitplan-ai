import React from 'react';
import { useTranslation } from 'react-i18next';

const Features = () => {
    const { t } = useTranslation();

    return (
        <section id="features" className="section" style={{ background: 'var(--primary-blue)', color: 'white' }}>
            <div className="container grid-2" style={{ alignItems: 'center' }}>
                <div>
                    <h2 style={{ color: 'white' }}>{t('features.title')} <br /> <span style={{ color: 'var(--secondary-blue)' }}>{t('features.highlight')}</span></h2>
                    <ul style={{ listStyle: 'none', marginTop: '2rem' }}>
                        <li style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>{t('features.mediator_title')}</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {t('features.mediator_desc')}
                            </p>
                        </li>
                        <li style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>{t('features.finance_title')}</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {t('features.finance_desc')}
                            </p>
                        </li>
                        <li>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>{t('features.endtoend_title')}</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {t('features.endtoend_desc')}
                            </p>
                        </li>
                    </ul>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '400px',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>{t('features.comparison_title')}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Booking.com</span>
                            <span>{t('features.hotels_only')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Splitwise</span>
                            <span>{t('features.expenses_only')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Chat GPT</span>
                            <span>{t('features.text_only')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-orange)', fontWeight: 'bold', paddingTop: '0.5rem' }}>
                            <span>SplitPlan</span>
                            <span>{t('features.all_inclusive')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
