import React from 'react';
import { useTranslation } from 'react-i18next';

const PainPoints = () => {
    const { t } = useTranslation();
    return (
        <section className="section bg-base transition-colors duration-500">
            <div className="container h-full">
                <div className="viewport-split items-center">
                    {/* Left: Strong Statement */}
                    <div className="space-y-8 py-12">
                        <div className="inline-block px-3 py-1 rounded-sm border border-border-medium bg-card text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                            THE PROBLEM
                        </div>
                        <h2 className="text-primary text-4xl lg:text-6xl font-semibold leading-tight max-w-sm uppercase tracking-tight">
                            {t('painPoints.title', 'Basta con il Caos Organizzativo')}
                        </h2>
                        <p className="text-muted text-xl max-w-sm leading-relaxed">
                            {t('painPoints.subtitle', 'Organizzare un viaggio non dovrebbe essere un secondo lavoro.')}
                        </p>
                    </div>

                    {/* Right: Pain Points List */}
                    <div className="space-y-12 py-12">
                        {[
                            { title: t('painPoints.chaosTitle'), desc: t('painPoints.chaosDesc'), emoji: '💬' },
                            { title: t('painPoints.fragmentationTitle'), desc: t('painPoints.fragmentationDesc'), emoji: '🧩' },
                            { title: t('painPoints.financeTitle'), desc: t('painPoints.financeDesc'), emoji: '💸' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-8 group">
                                <div className="text-3xl opacity-30 group-hover:opacity-100 transition-all duration-300 pt-1 scale-90 group-hover:scale-110">
                                    {item.emoji}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-primary text-xl font-semibold uppercase tracking-tight group-hover:text-primary-blue transition-colors">{item.title}</h4>
                                    <p className="text-muted text-lg leading-relaxed max-w-md">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PainPoints;
