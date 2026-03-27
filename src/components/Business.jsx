import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Building2, LayoutDashboard, FileBarChart, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';

const BusinessFeature = ({ icon: Icon, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        className="flex gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group"
    >
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-primary-blue" />
        </div>
        <div className="space-y-1">
            <h4 className="text-lg font-bold text-primary tracking-tight">{title}</h4>
            <p className="text-sm text-subtle leading-relaxed">{desc}</p>
        </div>
    </motion.div>
);

const Business = () => {
    const { t } = useTranslation();

    const features = [
        {
            icon: ShieldCheck,
            title: t('business.bullet1_title'),
            desc: t('business.bullet1_desc')
        },
        {
            icon: LayoutDashboard,
            title: t('business.bullet2_title'),
            desc: t('business.bullet2_desc')
        },
        {
            icon: FileBarChart,
            title: t('business.bullet3_title'),
            desc: t('business.bullet3_desc')
        }
    ];

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-primary-blue/20 blur-[120px] rounded-full pointer-events-none opacity-20" />
            
            <div className="container relative z-10">
                <div className="premium-card p-8 md:p-16 bg-card/40 backdrop-blur-md border-white/10 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left Side: Content */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="subtle-heading text-primary-blue"
                                >
                                    {t('business.title')}
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 }}
                                    className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-[0.9]"
                                >
                                    {t('business.headline')}
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.2 }}
                                    className="text-xl md:text-2xl text-muted font-medium tracking-tight max-w-lg"
                                >
                                    {t('business.subheadline')}
                                </motion.p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap gap-4"
                            >
                                <Button className="h-14 px-8 text-xs font-black tracking-[0.2em] uppercase group">
                                    {t('business.cta')}
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                        </div>

                        {/* Right Side: Features */}
                        <div className="grid grid-cols-1 gap-4">
                            {features.map((f, i) => (
                                <BusinessFeature 
                                    key={i} 
                                    {...f} 
                                    delay={0.4 + (i * 0.1)} 
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Visual decoration */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Building2 size={300} strokeWidth={1} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Business;
