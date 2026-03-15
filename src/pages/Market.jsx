import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckout, toggleSubscription, cancelSubscription } from '../api';
import { useToast } from '../context/ToastContext';
import { Sparkles, Zap, CheckCircle2, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const Market = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleCheckout = async (productType) => {
        setLoading(true);
        try {
            await createCheckout(productType);
        } catch (e) {
            showToast(e.message || "Errore nel checkout", "error");
            setLoading(false);
        }
    };

    const handleCancelRenew = async () => {
        setLoading(true);
        try {
            const res = await cancelSubscription();
            showToast(res.message, "success");
            const updatedUser = {
                ...user,
                is_subscribed: false,
                subscription_plan: null,
                subscription_expiry: null,
                auto_renew: false
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20
            }
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 bg-base transition-colors duration-500">
            <div className="container max-w-6xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full text-blue-500 font-bold text-sm mb-6">
                        <ShoppingBag className="w-4 h-4" />
                        SplitPlan Market
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-primary mb-6 tracking-tighter uppercase leading-[0.9]">
                        Potenzia i tuoi <br />
                        <span className="text-muted">Viaggi</span>
                    </h1>
                    <p className="text-muted max-w-2xl mx-auto font-medium text-lg leading-relaxed">
                        Scegli come vivere la tua prossima avventura: sblocca singoli viaggi o abbonati per funzioni illimitate.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                >
                    {/* Pack 1 Credito */}
                    <motion.div variants={itemVariants} className="premium-card flex flex-col items-center text-center group">
                        <div className="w-20 h-20 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform duration-500">🪙</div>
                        <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">1 Credito</h3>
                        <p className="text-sm text-muted mb-8 font-medium leading-relaxed">Ideale per sbloccare <br /> un singolo viaggio Premium</p>
                        <div className="mt-auto w-full">
                            <div className="text-4xl font-black text-primary mb-8 tracking-tighter">3,99€</div>
                            <button
                                onClick={() => handleCheckout('credit_1')}
                                disabled={loading}
                                className="w-full py-4 bg-surface hover:bg-yellow-400 hover:text-black text-primary rounded-xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-[10px] tracking-widest border border-white/10"
                            >
                                Acquista
                            </button>
                        </div>
                    </motion.div>

                    {/* Pack 3 Crediti */}
                    <motion.div variants={itemVariants} className="premium-card !border-blue-500/30 flex flex-col items-center text-center relative overflow-hidden group shadow-2xl shadow-blue-500/10">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black px-6 py-2 rounded-bl-2xl uppercase tracking-tighter">I Più Scelti</div>
                        <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform duration-500">🪙🪙🪙</div>
                        <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">3 Crediti</h3>
                        <p className="text-sm text-muted mb-8 font-medium leading-relaxed">Risparmia il 25% <br /> su tre avventure</p>
                        <div className="mt-auto w-full">
                            <div className="text-4xl font-black text-primary mb-8 tracking-tighter">8,99€</div>
                            <button
                                onClick={() => handleCheckout('credit_3')}
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20"
                            >
                                Acquista
                            </button>
                        </div>
                    </motion.div>

                    {/* Abbonamento Mensile */}
                    <motion.div variants={itemVariants} className="premium-card flex flex-col items-center text-center group">
                        <div className="w-20 h-20 bg-violet-600/10 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform duration-500">💎</div>
                        <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">SplitPlan Pro</h3>
                        <p className="text-sm text-muted mb-8 font-medium leading-relaxed">Accesso illimitato <br /> per un intero mese</p>
                        <div className="mt-auto w-full">
                            {user.is_subscribed && user.subscription_plan === 'MONTHLY' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="text-violet-500 font-black flex items-center gap-2 tracking-widest uppercase text-sm">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <div className="flex flex-col gap-2 items-center">
                                        {user.subscription_expiry && (
                                            <p className="text-[10px] text-muted font-bold">Scade: {new Date(user.subscription_expiry).toLocaleDateString()}</p>
                                        )}
                                        {user.auto_renew && (
                                            <button
                                                onClick={handleCancelRenew}
                                                className="text-[10px] text-red-500 font-black hover:underline uppercase tracking-widest"
                                            >
                                                Annulla
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl font-black text-primary mb-8 tracking-tighter">7,99€<span className="text-xs text-muted font-medium ml-1">/mese</span></div>
                                    <button
                                        onClick={() => handleCheckout('sub_monthly')}
                                        disabled={loading || user.subscription_plan === 'ANNUAL'}
                                        className="w-full py-4 bg-violet-600 text-white hover:bg-violet-500 rounded-xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-xl shadow-violet-600/20"
                                    >
                                        {user.subscription_plan === 'ANNUAL' ? 'Piano Annuale Attivo' : 'Abbonati'}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Piano Annuale */}
                    <motion.div variants={itemVariants} className="premium-card !border-yellow-500/30 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none"></div>
                        <div className="w-20 h-20 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform duration-500 relative z-10">👑</div>
                        <h3 className="text-2xl font-black text-primary mb-3 tracking-tight relative z-10">Piano Annuale</h3>
                        <p className="text-sm text-muted mb-8 font-medium leading-relaxed relative z-10">Il miglior valore <br /> per i grandi viaggiatori</p>
                        <div className="mt-auto w-full relative z-10">
                            {user.is_subscribed && user.subscription_plan === 'ANNUAL' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="text-yellow-500 font-black flex items-center gap-2 tracking-widest uppercase text-sm">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <div className="flex flex-col gap-2 items-center">
                                        {user.subscription_expiry && (
                                            <p className="text-[10px] text-muted font-bold">Scade: {new Date(user.subscription_expiry).toLocaleDateString()}</p>
                                        )}
                                        {user.auto_renew && (
                                            <button
                                                onClick={handleCancelRenew}
                                                className="text-[10px] text-red-500 font-black hover:underline uppercase tracking-widest"
                                            >
                                                Annulla
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl font-black text-primary mb-8 tracking-tighter">€<span className="text-xs text-muted font-medium ml-1">/anno</span></div>
                                    <button
                                        onClick={() => handleCheckout('sub_annual')}
                                        disabled={loading}
                                        className="w-full py-4 bg-primary text-base hover:opacity-90 rounded-xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-xl"
                                    >
                                        Vai Pro Annuale
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="premium-card overflow-hidden relative"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex-1 space-y-8">
                            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter uppercase leading-[0.9]">Perché scegliere <br /><span className="text-muted">SplitPlan Pro?</span></h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    "Itinerari AI Illimitati",
                                    "Logistica & PDF Automation",
                                    "Chat Butler AI 24/7",
                                    "Dashboard Budget Integrata",
                                    "Mappe Offline & Export",
                                    "Supporto Prioritario"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm font-bold text-muted">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Zap className="w-3 h-3 text-blue-500" />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-surface p-10 rounded-[2.5rem] text-center border border-white/5 shadow-2xl min-w-[240px]">
                            <p className="text-[10px] text-muted uppercase font-black mb-4 tracking-[0.2em]">Il tuo saldo attuale</p>
                            <div className="text-6xl font-black text-primary mb-2 tracking-tighter">🪙 {user.credits || 0}</div>
                            <p className="text-xs font-black text-blue-500 uppercase tracking-widest">Crediti Disponibili</p>
                        </div>
                    </div>
                </motion.div>

                <p className="mt-16 text-center text-[10px] text-muted uppercase tracking-[0.25em] font-black opacity-30">
                    Transazioni sicure gestite da Stripe & SSL Encryption. I crediti non scadono mai.
                </p>
            </div>
        </div>
    );
};

export default Market;
