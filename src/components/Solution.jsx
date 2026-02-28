import React from 'react';
import { useTranslation } from 'react-i18next';

const Solution = () => {
    const { t } = useTranslation();
    const steps = [
        {
            num: "01",
            emoji: "🤖",
            title: t('solution.steps.s1.title', "Decisione & Consenso"),
            desc: t('solution.steps.s1.desc', "L'AI raccoglie i gusti di tutti e propone 3 opzioni perfette. Risolve i conflitti prima che nascano."),
            accent: '#8b5cf6'
        },
        {
            num: "02",
            emoji: "✈️",
            title: t('solution.steps.s2.title', "Logistica Proattiva"),
            desc: t('solution.steps.s2.desc', "Voli e hotel prenotati in sync con il budget approvato. Niente sorprese."),
            accent: '#22d3ee'
        },
        {
            num: "03",
            emoji: "🗺️",
            title: t('solution.steps.s3.title', "Itinerario Dinamico"),
            desc: t('solution.steps.s3.desc', "Pianificazione intelligente, ottimizzata geograficamente per massimizzare il tempo. Modifica l'itinerario in un click grazie all'Assistente AI."),
            accent: '#8b5cf6'
        },
        {
            num: "04",
            emoji: "💸",
            title: t('solution.steps.s4.title', "CFO del Viaggio"),
            desc: t('solution.steps.s4.desc', "Tiene traccia delle spese in tempo reale e calcola i conguagli. Tu goditi il viaggio."),
            accent: '#22d3ee'
        }
    ];

    return (
        <section id="how-it-works" className="section" style={{ background: '#050508', position: 'relative', overflow: 'hidden' }}>

            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <span style={{
                        display: 'inline-block', padding: '4px 14px', borderRadius: '999px',
                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
                        fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#a78bfa', marginBottom: '1rem'
                    }}>
                        {t('solution.badge', 'Il Nostro Metodo')}
                    </span>
                    <h2 style={{ color: '#f0f0ff' }}>{t('solution.title', '4 Fasi per il Viaggio Perfetto')}</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {steps.map((step, idx) => (
                        <div key={idx} style={{
                            position: 'relative',
                            padding: '2rem',
                            border: `1px solid rgba(${step.accent === '#8b5cf6' ? '139,92,246' : '34,211,238'}, 0.15)`,
                            borderRadius: '20px',
                            background: '#0d0d18',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                            onMouseOver={e => {
                                e.currentTarget.style.borderColor = step.accent + '55';
                                e.currentTarget.style.boxShadow = `0 0 24px ${step.accent}20`;
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.borderColor = `rgba(${step.accent === '#8b5cf6' ? '139,92,246' : '34,211,238'}, 0.15)`;
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            {/* Step number watermark */}
                            <div style={{
                                fontSize: '4rem', fontWeight: '900',
                                color: `rgba(${step.accent === '#8b5cf6' ? '139,92,246' : '34,211,238'}, 0.08)`,
                                position: 'absolute', top: '10px', right: '16px', lineHeight: 1,
                                userSelect: 'none'
                            }}>
                                {step.num}
                            </div>

                            {/* Icon */}
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: `rgba(${step.accent === '#8b5cf6' ? '139,92,246' : '34,211,238'}, 0.12)`,
                                border: `1px solid rgba(${step.accent === '#8b5cf6' ? '139,92,246' : '34,211,238'}, 0.25)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.4rem', marginBottom: '1.25rem'
                            }}>
                                {step.emoji}
                            </div>

                            <h3 style={{ color: step.accent, fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.75rem' }}>
                                {step.title}
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: '#7b7b9a', lineHeight: '1.65', margin: 0 }}>
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Solution;
