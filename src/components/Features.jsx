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
                <section key={feature.id} id={idx === 0 ? "features" : `feature-${feature.id}`} className="section bg-base transition-colors duration-500 py-32">
                    <div className="container h-full flex flex-col items-center justify-center text-center">
                        <div className="space-y-8 max-w-3xl animate-fade-in">
                            {/* Icon or Label */}
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-5xl">{feature.icon}</span>
                                <div className="inline-block px-3 py-1 rounded-sm border border-border-medium bg-card text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                                    Feature 0{idx + 1}
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-primary text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
                                {feature.title}
                            </h2>

                            {/* Description */}
                            <p className="text-muted text-lg md:text-xl lg:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
                                {feature.desc}
                            </p>
                        </div>
                    </div>
                </section>
            ))}

            {/* Comparison Section - Minimalist */}
            <section className="section bg-base transition-colors duration-500">
                <div className="container h-full flex flex-col justify-center">
                    <div className="max-w-4xl mx-auto w-full">
                        <h3 className="text-4xl md:text-5xl font-black text-primary mb-24 text-center uppercase tracking-tighter">{t('features.comparison_title')}</h3>
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
