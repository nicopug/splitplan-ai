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
            accent: 'var(--accent-digital-blue)'
        },
        {
            num: "02",
            emoji: "✈️",
            title: t('solution.steps.s2.title', "Logistica Proattiva"),
            desc: t('solution.steps.s2.desc', "Voli e hotel prenotati in sync con il budget approvato. Niente sorprese."),
            accent: 'var(--accent-digital-blue-light)'
        },
        {
            num: "03",
            emoji: "🗺️",
            title: t('solution.steps.s3.title', "Itinerario Dinamico"),
            desc: t('solution.steps.s3.desc', "Pianificazione intelligente, ottimizzata geograficamente per massimizzare il tempo. Modifica l'itinerario in un click grazie all'Assistente AI."),
            accent: 'var(--accent-digital-blue)'
        },
        {
            num: "04",
            emoji: "💸",
            title: t('solution.steps.s4.title', "CFO del Viaggio"),
            desc: t('solution.steps.s4.desc', "Tiene traccia delle spese in tempo reale e calcola i conguagli. Tu goditi il viaggio."),
            accent: 'var(--accent-digital-blue-light)'
        }
    ];

    return (
        <section id="how-it-works" className="section bg-base transition-colors duration-500">
            <div className="container h-full">
                <div className="viewport-split items-center">
                    {/* Left: Steps */}
                    <div className="space-y-12 py-12">
                        <div className="space-y-4">
                            <div className="inline-block px-3 py-1 rounded-sm border border-border-medium bg-card text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                                {t('solution.badge', 'IL METODO')}
                            </div>
                            <h2 className="text-primary text-4xl lg:text-5xl font-semibold leading-tight uppercase tracking-tight">{t('solution.title', '4 Fasi per il Viaggio Perfetto')}</h2>
                        </div>

                        <div className="space-y-10">
                            {steps.map((step, idx) => (
                                <div key={idx} className="group flex gap-8">
                                    <div className="text-subtle text-xl font-bold font-mono pt-1 transition-colors group-hover:text-primary-blue">
                                        {step.num}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-primary text-xl font-semibold uppercase tracking-tight group-hover:text-primary-blue transition-colors">{step.title}</h3>
                                        <p className="text-muted text-lg leading-relaxed max-w-sm">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Abstract Visual / Floating Mockup */}
                    <div className="relative flex items-center justify-center py-12">
                        <div className="relative w-full max-w-[440px] aspect-[4/5] border border-border-medium rounded-lg bg-surface flex items-center justify-center overflow-hidden shadow-lg transition-all hover:shadow-2xl">
                            {/* Abstract connection lines or a minimal UI element */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
                            </div>

                            <div className="z-10 text-center space-y-6">
                                <div className="w-24 h-24 mx-auto rounded-full border border-border-medium bg-card flex items-center justify-center text-4xl shadow-inner-white">
                                    ✈️
                                </div>
                                <div className="px-6 py-2 rounded-sm border border-border-medium bg-base text-[10px] font-black tracking-widest text-muted uppercase">
                                    PLATFORM ECOSYSTEM
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Solution;
