import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer style={{ background: 'var(--dark-navy)', color: 'white', padding: '4rem 0' }}>
            <div className="container">
                <div className="grid-3">
                    <div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>SplitPlan</div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                            {t('footer.tagline', 'Rendiamo i viaggi di gruppo facili, divertenti e senza stress.')}
                        </p>
                    </div>
                    <div>
                        <h4 style={{ color: 'white' }}>{t('footer.usefulLinks', 'Link Utili')}</h4>
                        <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <li style={{ marginBottom: '0.5rem' }}>{t('footer.about', 'Chi Siamo')}</li>
                            <li style={{ marginBottom: '0.5rem' }}>{t('footer.careers', 'Lavora con Noi')}</li>
                            <li style={{ marginBottom: '0.5rem' }}>{t('footer.privacy', 'Privacy Policy')}</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: 'white' }}>{t('footer.contact', 'Contatti')}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>splitplan.ai@gmail.com</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        </div>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '3rem', paddingTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    {t('footer.rights', '© 2025 SplitPlan AI. Tutti i diritti riservati.')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
