import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buyCredits, toggleSubscription } from '../api';
import { useToast } from '../context/ToastContext';
import { Sparkles, CreditCard, Zap, Crown, CheckCircle2, ShoppingBag } from 'lucide-react';

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

    const handleBuyCredits = async (amount) => {
        setLoading(true);
        try {
            const data = await buyCredits(amount);
            showToast(`Hai acquistato ${amount} crediti!`, "success");
            setUser(JSON.parse(localStorage.getItem('user')));
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (user?.is_subscribed) return;
        setLoading(true);
        try {
            const res = await toggleSubscription(user.email, plan);
            showToast("Benvenuto in SplitPlan Pro! 💎", "success");
            // Aggiorna local user
            const updatedUser = {
                ...user,
                is_subscribed: res.is_subscribed,
                subscription_plan: res.subscription_plan
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

    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-[#0a0a0a]">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-blue/10 rounded-full text-primary-blue font-bold text-sm mb-4">
                        <ShoppingBag className="w-4 h-4" />
                        SplitPlan Market
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-text-main dark:text-white mb-4 italic tracking-tight">
                        Potenzia i tuoi <span className="text-primary-blue">Viaggi</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                        Scegli come vivere la tua prossima avventura: sblocca singoli viaggi o abbonati per funzioni illimitate.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Pack 1 Credito */}
                    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl hover:shadow-primary-blue/5">
                        <div className="w-20 h-20 bg-yellow-400/10 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🪙</div>
                        <h3 className="text-xl font-black text-text-main dark:text-white mb-2">1 Credito</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Ideale per sbloccare <br /> un singolo viaggio Premium</p>
                        <div className="mt-auto w-full">
                            <div className="text-3xl font-black text-text-main dark:text-white mb-6">3,99€</div>
                            <button
                                onClick={() => handleBuyCredits(1)}
                                disabled={loading}
                                className="w-full py-4 bg-gray-100 dark:bg-white/5 hover:bg-yellow-400 hover:text-black rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest"
                            >
                                Acquista
                            </button>
                        </div>
                    </div>

                    {/* Pack 3 Crediti */}
                    <div className="bg-white dark:bg-[#111111] border-2 border-primary-blue/40 rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-primary-blue/10">
                        <div className="absolute top-0 right-0 bg-primary-blue text-white text-[10px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-tighter">I Più Scelti</div>
                        <div className="w-20 h-20 bg-primary-blue/10 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">🪙🪙🪙</div>
                        <h3 className="text-xl font-black text-text-main dark:text-white mb-2">3 Crediti</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Risparmia il 25% <br /> su tre avventure</p>
                        <div className="mt-auto w-full">
                            <div className="text-3xl font-black text-text-main dark:text-white mb-6">8,99€</div>
                            <button
                                onClick={() => handleBuyCredits(3)}
                                disabled={loading}
                                className="w-full py-4 bg-primary-blue text-white hover:bg-blue-600 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-lg shadow-primary-blue/20"
                            >
                                Acquista
                            </button>
                        </div>
                    </div>

                    {/* Abbonamento Mensile */}
                    <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-500">
                        <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">💎</div>
                        <h3 className="text-xl font-black text-text-main dark:text-white mb-2">SplitPlan Pro</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Accesso illimitato <br /> per un intero mese</p>
                        <div className="mt-auto w-full">
                            {user.is_subscribed && user.subscription_plan === 'MONTHLY' ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-primary-blue font-black flex items-center gap-1">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black">Piano Mensile</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-black text-text-main dark:text-white mb-6">4,99€<span className="text-xs text-gray-400 font-medium">/mese</span></div>
                                    <button
                                        onClick={() => handleSubscribe('MONTHLY')}
                                        disabled={loading || user.subscription_plan === 'ANNUAL'}
                                        className="w-full py-4 bg-purple-600 text-white hover:bg-purple-700 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-lg shadow-purple-500/20"
                                    >
                                        {user.subscription_plan === 'ANNUAL' ? 'Piano Annuale Attivo' : 'Abbonati'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Piano Annuale */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-blue/5 to-transparent pointer-events-none"></div>
                        <div className="w-20 h-20 bg-yellow-400/20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner relative z-10">👑</div>
                        <h3 className="text-xl font-black text-white mb-2 relative z-10">Piano Annuale</h3>
                        <p className="text-sm text-gray-400 mb-6 font-medium relative z-10">Il miglior valore <br /> per i grandi viaggiatori</p>
                        <div className="mt-auto w-full relative z-10">
                            {user.is_subscribed && user.subscription_plan === 'ANNUAL' ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-yellow-400 font-black flex items-center gap-1">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">Massima Trasparenza</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-black text-white mb-6">29,99€<span className="text-xs text-gray-500 font-medium">/anno</span></div>
                                    <button
                                        onClick={() => handleSubscribe('ANNUAL')}
                                        disabled={loading}
                                        className="w-full py-4 bg-white text-black hover:bg-yellow-400 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-xl"
                                    >
                                        Vai Pro Annuale
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-16 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary-blue/5 blur-3xl rounded-full"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-text-main dark:text-white mb-4">Perché scegliere <span className="text-primary-blue">SplitPlan Pro?</span></h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    "Itinerari AI Illimitati",
                                    "Logistica & PDF Automation",
                                    "Chat Butler AI 24/7",
                                    "Dashboard Budget Integrata",
                                    "Mappe Offline & Export",
                                    "Supporto Prioritario"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400">
                                        <Zap className="w-4 h-4 text-primary-blue" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[2rem] text-center border border-gray-100 dark:border-white/5">
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 tracking-widest leading-relaxed">Il tuo saldo attuale</p>
                            <div className="text-5xl font-black text-primary-blue mb-1">🪙 {user.credits || 0}</div>
                            <p className="text-xs font-bold text-gray-500">Crediti Disponibili</p>
                        </div>
                    </div>
                </div>

                <p className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-widest font-black opacity-50">
                    Transazioni sicure gestite da Stripe & SSL Encryption. I crediti non scadono mai.
                </p>
            </div>
        </div>
    );
};

export default Market;
