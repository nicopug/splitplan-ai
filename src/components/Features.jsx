import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const Features = () => {
    const { t } = useTranslation();

    const features = [
        {
            id: 0,
            title: t('features.mediator_title'),
            desc: t('features.mediator_desc'),
            icon: '✨',
            className: "md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-600/20 to-transparent"
        },
        {
            id: 1,
            title: t('features.endtoend_title'),
            desc: t('features.endtoend_desc'),
            icon: '🚆',
            className: "md:col-span-1 md:row-span-1 bg-gradient-to-br from-violet-600/20 to-transparent"
        },
        {
            id: 2,
            title: t('features.finance_title'),
            desc: t('features.finance_desc'),
            icon: '💳',
            className: "md:col-span-1 md:row-span-1 bg-gradient-to-br from-cyan-600/20 to-transparent"
        }
    ];

    return (
        <section id="features" className="section bg-base py-24">
            <div className="container">
                <div className="text-center mb-16 space-y-4">
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="subtle-heading"
                    >
                        Features
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tighter"
                    >
                        Everything you need <br />
                        <span className="text-muted">for the perfect group trip.</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={`premium-card group ${feature.className}`}
                        >
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="space-y-4">
                                    <span className="text-4xl block group-hover:scale-110 transition-transform duration-500 origin-left">
                                        {feature.icon}
                                    </span>
                                    <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-muted text-base md:text-lg leading-relaxed max-w-md">
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Decorative background circle */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
                        </motion.div>
                    ))}
                </div>

                {/* Comparison Section - Integrated into Features */}
                <div className="mt-32 max-w-4xl mx-auto w-full">
                    <motion.h3 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-2xl md:text-3xl font-black text-primary mb-12 text-center uppercase tracking-tighter"
                    >
                        {t('features.comparison_title')}
                    </motion.h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { name: 'Booking.com', val: t('features.hotels_only') },
                            { name: 'Splitwise', val: t('features.expenses_only') },
                            { name: 'ChatGPT', val: t('features.text_only') },
                            { name: 'SplitPlan', val: t('features.all_inclusive'), highlight: true }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="space-y-2 text-center"
                            >
                                <div className="text-[10px] font-black tracking-widest text-subtle uppercase">{item.name}</div>
                                <div className={`text-sm ${item.highlight ? 'text-blue-500 font-bold' : 'text-muted'}`}>{item.val}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;

