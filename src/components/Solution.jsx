import React from 'react';
import { useTranslation } from 'react-i18next';

const Solution = () => {
    const { t } = useTranslation();
    const steps = [
        {
            num: "01",
            title: t('solution.steps.s1.title', "Decisione & Consenso"),
            desc: t('solution.steps.s1.desc', "L'AI raccoglie i gusti di tutti e propone 3 opzioni perfette. Risolve i conflitti prima che nascano.")
        },
        {
            num: "02",
            title: t('solution.steps.s2.title', "Logistica Proattiva"),
            desc: t('solution.steps.s2.desc', "Voli e hotel prenotati in sync con il budget approvato. Niente sorprese.")
        },
        {
            num: "03",
            title: t('solution.steps.s3.title', "Itinerario Dinamico"),
            desc: t('solution.steps.s3.desc', "Pianificazione intelligente, ottimizzata geograficamente per massimizzare il tempo. Modifica l'itinerario in un click grazie all'Assistente AI.")
        },
        {
            num: "04",
            title: t('solution.steps.s4.title', "CFO del Viaggio"),
            desc: t('solution.steps.s4.desc', "Tiene traccia delle spese in tempo reale e calcola i conguagli. Tu goditi il viaggio.")
        }
    ];

    return (
        <section id="how-it-works" className="section" >
            <div className="container">
                <div className="text-center" style={{ marginBottom: '4rem' }}>
                    <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('solution.badge', 'Il Nostro Metodo')}</span>
                    <h2>{t('solution.title', '4 Fasi per il Viaggio Perfetto')}</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                    {steps.map((step, idx) => (
                        <div key={idx} style={{
                            position: 'relative',
                            padding: '2rem',
                            border: '1px solid #e0e0e0',
                            borderRadius: 'var(--radius-md)',
                            background: 'white',
                            transition: 'transform 0.3s ease',
                        }}>
                            <div style={{
                                fontSize: '4rem',
                                fontWeight: '900',
                                color: 'rgba(35, 89, 158, 0.1)',
                                position: 'absolute',
                                top: '10px',
                                right: '20px',
                                lineHeight: 1
                            }}>
                                {step.num}
                            </div>
                            <h3 style={{ marginTop: '1rem', color: 'var(--primary-blue)', fontSize: '1.4rem' }}>{step.title}</h3>
                            <p style={{ fontSize: '1rem', marginTop: '1rem' }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Solution;
