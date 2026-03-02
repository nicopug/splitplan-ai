import React from 'react';
import { useTranslation } from 'react-i18next';

const PainPoints = () => {
    const { t } = useTranslation();
    return (
        <section className="section bg-black">
            <div className="container h-full">
                <div className="viewport-split items-center">

                    {/* Left: Strong Statement */}
                    <div className="space-y-6">
                        <div className="inline-block px-3 py-1 rounded-sm border border-white/10 bg-white/5 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
                            THE PROBLEM
                        </div>
                        <h2 className="text-white text-4xl lg:text-5xl font-semibold leading-tight max-w-sm">
                            {t('painPoints.title', 'Basta con il Caos Organizzativo')}
                        </h2>
                        <p className="text-gray-600 text-lg max-w-sm">
                            {t('painPoints.subtitle', 'Organizzare un viaggio non dovrebbe essere un secondo lavoro.')}
                        </p>
                    </div>

                    {/* Right: Pain Points List */}
                    <div className="space-y-10 py-12">
                        {[
                            { title: t('painPoints.chaosTitle'), desc: t('painPoints.chaosDesc'), emoji: '💬' },
                            { title: t('painPoints.fragmentationTitle'), desc: t('painPoints.fragmentationDesc'), emoji: '🧩' },
                            { title: t('painPoints.financeTitle'), desc: t('painPoints.financeDesc'), emoji: '💸' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-6 group">
                                <div className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity pt-1">
                                    {item.emoji}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-white text-lg font-semibold">{item.title}</h4>
                                    <p className="text-gray-500 text-sm leading-relaxed max-w-md">
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
