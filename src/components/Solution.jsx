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
        <section id="how-it-works" className="section bg-black">
            <div className="container h-full">
                <div className="viewport-split items-center">

                    {/* Left: Steps */}
                    <div className="space-y-12 py-12">
                        <div className="space-y-4">
                            <div className="inline-block px-3 py-1 rounded-sm border border-white/10 bg-white/5 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400">
                                {t('solution.badge', 'IL METODO')}
                            </div>
                            <h2 className="text-white text-4xl font-semibold">{t('solution.title', '4 Fasi per il Viaggio Perfetto')}</h2>
                        </div>

                        <div className="space-y-8">
                            {steps.map((step, idx) => (
                                <div key={idx} className="group flex gap-6">
                                    <div className="text-gray-700 text-lg font-bold font-mono pt-1 transition-colors group-hover:text-white">
                                        {step.num}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-white text-lg font-semibold">{step.title}</h4>
                                        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Abstract Visual / Floating Mockup */}
                    <div className="relative flex items-center justify-center py-12">
                        <div className="relative w-full max-w-[440px] aspect-[4/5] border border-white/5 rounded-lg bg-[#050505] flex items-center justify-center overflow-hidden">
                            {/* Abstract connection lines or a minimal UI element */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent" />
                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white to-transparent" />
                            </div>

                            <div className="z-10 text-center space-y-6">
                                <div className="w-20 h-20 mx-auto rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-3xl">
                                    ✈️
                                </div>
                                <div className="px-6 py-2 rounded-sm border border-white/10 bg-black text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                    PLATFORM ECOSYSTEM
                                </div>
                            </div>

                            {/* Subtle scanline effect */}
                            <div className="absolute inset-0 bg-scanline opacity-5 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Solution;
