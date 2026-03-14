import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Features = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    const features = [
        {
            id: 0,
            title: t('features.mediator_title'),
            desc: t('features.mediator_desc'),
            image: '/feature-ai.png',
            icon: '✨'
        },
        {
            id: 1,
            title: t('features.endtoend_title'),
            desc: t('features.endtoend_desc'),
            image: '/feature-logistics.png',
            icon: '🚆'
        },
        {
            id: 2,
            title: t('features.finance_title'),
            desc: t('features.finance_desc'),
            image: '/feature-cfo.png',
            icon: '💳'
        }
    ];

    return (
        <>
            {features.map((feature, idx) => (
                <section key={feature.id} id={idx === 0 ? "features" : `feature-${feature.id}`} className="section bg-base transition-colors duration-500">
                    <div className="container h-full">
                        <div className={`viewport-split items-center ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                            {/* Left/Right: Content */}
                            <div className="space-y-6 py-12">
                                <div className="inline-block px-3 py-1 rounded-sm border border-border-medium bg-card text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                                    0{idx + 1} // {feature.title.split(' ')[0]}
                                </div>
                                <h2 className="text-primary text-4xl lg:text-5xl font-semibold leading-tight">
                                    {feature.title}
                                </h2>
                                <p className="text-muted text-lg max-w-md leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>

                            {/* Right/Left: Visual */}
                            <div className="relative flex items-center justify-center py-12">
                                <div className="relative w-full max-w-[500px] shadow-md border border-border-medium rounded-lg overflow-hidden bg-card transition-all hover:shadow-xl">
                                    <img
                                        src={feature.image}
                                        alt={feature.title}
                                        className="w-full h-auto block opacity-80 hover:opacity-100 transition-opacity"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ))}

            {/* Comparison Section - Minimalist */}
            <section className="section bg-base transition-colors duration-500">
                <div className="container h-full flex flex-col justify-center">
                    <div className="max-w-4xl mx-auto w-full">
                        <h3 className="text-3xl font-semibold text-primary mb-16 text-center">{t('features.comparison_title')}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                            {[
                                { name: 'Booking.com', val: t('features.hotels_only') },
                                { name: 'Splitwise', val: t('features.expenses_only') },
                                { name: 'ChatGPT', val: t('features.text_only') },
                                { name: 'SplitPlan', val: t('features.all_inclusive'), highlight: true }
                            ].map((item, i) => (
                                <div key={i} className="space-y-4 text-center">
                                    <div className="text-[10px] font-black tracking-widest text-subtle uppercase">{item.name}</div>
                                    <div className={`text-sm ${item.highlight ? 'text-primary font-black uppercase tracking-tight' : 'text-muted'}`}>{item.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Features;
