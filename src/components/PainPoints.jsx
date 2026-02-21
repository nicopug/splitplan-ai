import React from 'react';
import { useTranslation } from 'react-i18next';

const PainPoints = () => {
    const { t } = useTranslation();
    return (
        <section className="section" style={{ background: 'var(--bg-white)' }}>
            <div className="container">
                <div className="text-center" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>{t('painPoints.title', 'Basta con il Caos Organizzativo')}</h2>
                    <p>{t('painPoints.subtitle', 'Organizzare un viaggio non dovrebbe essere un secondo lavoro.')}</p>
                </div>
                <div className="grid-3">
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}></div>
                        <h3>{t('painPoints.chaosTitle', 'Caos Decisionale')}</h3>
                        <p>{t('painPoints.chaosDesc', 'Chat WhatsApp infinite, link persi, e nessuno che prende una decisione. Il 70% dei viaggi di gruppo muore qui.')}</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}></div>
                        <h3>{t('painPoints.fragmentationTitle', 'Frammentazione')}</h3>
                        <p>{t('painPoints.fragmentationDesc', '5 app diverse aperte: Booking, Maps, Notes, Splitwise... Un incubo logistico da gestire.')}</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}></div>
                        <h3>{t('painPoints.financeTitle', 'Imbarazzo Finanziario')}</h3>
                        <p>{t('painPoints.financeDesc', '"Chi deve quanto a chi?". Rincorrere gli amici per i soldi è la parte peggiore del viaggio.')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PainPoints;
