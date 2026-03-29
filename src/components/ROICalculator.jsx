import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, Clock } from 'lucide-react';

const ROICalculator = () => {
    const { t } = useTranslation();

    const [trips, setTrips] = useState(50);
    const [cost, setCost] = useState(30);

    const hoursSaved = trips * 2;
    const moneySaved = hoursSaved * cost;

    return (
        <section className="section bg-base py-24 border-t border-border-subtle">
            <div className="container">
                <div className="max-w-4xl mx-auto">

                    {/* Intestazione */}
                    <div className="text-center space-y-4 mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="inline-block px-3 py-1 rounded-full border border-primary-blue/30 bg-primary-blue/10 text-[10px] font-black tracking-[0.2em] uppercase text-primary-blue"
                        >
                            <Calculator className="w-3 h-3 inline-block mr-2 mb-0.5" />
                            {t('roi.badge')}
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary"
                        >
                            {t('roi.title')}
                        </motion.h2>
                    </div>

                    {/* Calcolatore Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="premium-card p-8 md:p-12 bg-card border border-border-medium rounded-3xl shadow-xl relative overflow-hidden"
                    >
                        {/* Sfondo decorativo */}
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-blue/5 blur-[100px] rounded-full pointer-events-none" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">

                            {/* Sinistra: Sliders */}
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            {t('roi.trips_label')}
                                        </label>
                                        <span className="text-xl font-bold text-primary-blue">{trips}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="500"
                                        step="10"
                                        value={trips}
                                        onChange={(e) => setTrips(Number(e.target.value))}
                                        className="w-full h-2 bg-border-medium rounded-lg appearance-none cursor-pointer accent-primary-blue"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            {t('roi.cost_label')}
                                        </label>
                                        <span className="text-xl font-bold text-primary-blue">€{cost}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="15"
                                        max="150"
                                        step="5"
                                        value={cost}
                                        onChange={(e) => setCost(Number(e.target.value))}
                                        className="w-full h-2 bg-border-medium rounded-lg appearance-none cursor-pointer accent-primary-blue"
                                    />
                                </div>
                            </div>

                            {/* Destra: Risultati Dinamici */}
                            <div className="flex flex-col justify-center space-y-6 pl-0 md:pl-8 md:border-l border-border-subtle">

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-2">
                                        <Clock className="w-3 h-3 text-primary-blue" />
                                        {t('roi.hours_saved')}
                                    </p>
                                    <p className="text-4xl font-black text-primary">
                                        {hoursSaved} <span className="text-xl text-muted font-medium tracking-normal">h</span>
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-2">
                                        <TrendingDown className="w-3 h-3 text-emerald-500" />
                                        {t('roi.money_saved')}
                                    </p>
                                    <motion.p
                                        key={moneySaved}
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        className="text-5xl md:text-6xl font-black text-emerald-500 tracking-tighter"
                                    >
                                        €{moneySaved.toLocaleString('it-IT')}
                                    </motion.p>
                                </div>

                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="mt-10 pt-6 border-t border-border-subtle">
                            <p className="text-[9px] text-muted uppercase tracking-widest leading-relaxed text-center font-medium">
                                {t('roi.assumption')}
                            </p>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default ROICalculator;