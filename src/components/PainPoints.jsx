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
                            {t('painPoints.badge')}
                        </div>
                        <h2 className="text-primary text-5xl lg:text-7xl font-black leading-[0.9] max-w-sm uppercase tracking-tighter">
                            {t('painPoints.title', 'Basta con il Caos Organizzativo')}
                        </h2>
                        <p className="text-muted text-xl max-w-sm leading-relaxed font-medium">
                            {t('painPoints.subtitle', 'Organizzare un viaggio non dovrebbe essere un secondo lavoro.')}
                        </p>
                    </div>

                    {/* Right: Pain Points List */}
                    <div className="space-y-16 py-12">
                        {[
                            { title: t('painPoints.chaosTitle'), desc: t('painPoints.chaosDesc'), emoji: '💬' },
                            { title: t('painPoints.fragmentationTitle'), desc: t('painPoints.fragmentationDesc'), emoji: '🧩' },
                            { title: t('painPoints.financeTitle'), desc: t('painPoints.financeDesc'), emoji: '💸' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-10 group">
                                <div className="text-4xl opacity-30 group-hover:opacity-100 transition-all duration-500 pt-1 scale-90 group-hover:scale-110">
                                    {item.emoji}
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-primary text-2xl font-black uppercase tracking-tight group-hover:text-blue-500 transition-colors">{item.title}</h3>
                                    <p className="text-muted text-lg leading-relaxed max-w-md font-medium">
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
