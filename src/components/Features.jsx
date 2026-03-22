import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X as Close, Sparkles } from 'lucide-react';
import { useSpotlight } from '../hooks/useSpotlight';

const FeatureCard = ({ feature, idx }) => {
    const { ref, onMouseMove } = useSpotlight();
    
    return (
        <motion.div
            ref={ref}
            onMouseMove={onMouseMove}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className={`premium-card group h-full ${feature.className}`}
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
    );
};

const ComparisonTable = () => {
    const { t } = useTranslation();
    
    const rows = [
        { label: t('features.row1'), booking: false, splitwise: false, chatgpt: true, splitplan: true },
        { label: t('features.row2'), booking: false, splitwise: true, chatgpt: false, splitplan: true },
        { label: t('features.row3'), booking: true, splitwise: false, chatgpt: false, splitplan: true },
        { label: t('features.row4'), booking: false, splitwise: false, chatgpt: false, splitplan: true },
        { label: t('features.row5'), booking: false, splitwise: false, chatgpt: false, splitplan: true },
    ];

    const competitors = [
        { name: "Booking.com", key: "booking" },
        { name: "Splitwise", key: "splitwise" },
        { name: "ChatGPT", key: "chatgpt" },
        { name: "SplitPlan ✨", key: "splitplan", highlight: true }
    ];

    return (
        <div className="mt-32 w-full overflow-x-auto no-scrollbar">
            <div className="min-w-[800px] border border-white/5 rounded-3xl overflow-hidden bg-card/20 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="p-8 text-[11px] font-black tracking-[0.2em] uppercase text-muted">{t('features.tableFeature')}</th>
                            {competitors.map(comp => (
                                <th key={comp.key} className={`p-8 text-center text-[11px] font-black tracking-[0.2em] uppercase ${comp.highlight ? 'text-primary-blue bg-primary-blue/5' : 'text-muted'}`}>
                                    {comp.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                                <td className="p-8 text-sm font-medium text-primary">
                                    {row.label}
                                </td>
                                {competitors.map(comp => (
                                    <td key={comp.key} className={`p-8 text-center ${comp.highlight ? 'bg-primary-blue/5' : ''}`}>
                                        <div className="flex justify-center">
                                            {row[comp.key] ? (
                                                <Check className={`w-5 h-5 ${comp.highlight ? 'text-blue-500 animate-pulse' : 'text-emerald-500/60'}`} />
                                            ) : (
                                                <Close className="w-5 h-5 text-red-500/20" />
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-8 text-center">
                <p className="text-[10px] font-black text-muted tracking-widest uppercase">
                    {t('features.tableFooter')}
                </p>
            </div>
        </div>
    );
};

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
        <section id="features" className="section bg-base py-32">
            <div className="container">
                <div className="text-center mb-16 space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="subtle-heading"
                    >
                        {t('features.sectionBadge')}
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]"
                    >
                        {t('features.sectionTitle')} <br />
                        <span className="text-muted">{t('features.sectionSubtitle')}</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {features.map((feature, idx) => (
                        <FeatureCard key={feature.id} feature={feature} idx={idx} />
                    ))}
                </div>

                <ComparisonTable />
            </div>
        </section>
    );
};

export default Features;

