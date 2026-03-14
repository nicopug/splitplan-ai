import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckout, toggleSubscription, cancelSubscription, createPortalSession } from '../api';
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

    const handleCheckout = async (productType) => {
        setLoading(true);
        try {
            await createCheckout(productType);
            // Il redirect avviene dentro createCheckout
        } catch (e) {
            showToast(e.message || "Errore nel checkout", "error");
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan) => {
        if (user?.is_subscribed && user.subscription_plan === plan) return;
        setLoading(true);
        try {
            const res = await toggleSubscription(plan);
            showToast("Benvenuto in SplitPlan Pro! 💎", "success");
            // Aggiorna local user
            const updatedUser = {
                ...user,
                is_subscribed: res.is_subscribed,
                subscription_plan: res.subscription_plan,
                subscription_expiry: res.subscription_expiry,
                auto_renew: res.auto_renew
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
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

    return (
        <div className="min-h-screen pt-24 pb-12 bg-[var(--bg-base)] transition-colors duration-500">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-digital-blue-dim)] rounded-full text-[var(--accent-digital-blue)] font-bold text-sm mb-4">
                        <ShoppingBag className="w-4 h-4" />
                        SplitPlan Market
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-4 italic tracking-tight">
                        Potenzia i tuoi <span className="text-[var(--accent-primary)]">Viaggi</span>
                    </h1>
                    <p className="text-[var(--text-muted)] max-w-2xl mx-auto font-medium">
                        Scegli come vivere la tua prossima avventura: sblocca singoli viaggi o abbonati per funzioni illimitate.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Pack 1 Credito */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-[2.5rem] p-8 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-500 hover:shadow-[var(--shadow-lg)]">
                        <div className="w-20 h-20 bg-yellow-400/10 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🪙</div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">1 Credito</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 font-medium">Ideale per sbloccare <br /> un singolo viaggio Premium</p>
                        <div className="mt-auto w-full">
                            <div className="text-3xl font-black text-[var(--text-primary)] mb-6">3,99€</div>
                            <button
                                onClick={() => handleCheckout('credit_1')}
                                disabled={loading}
                                className="w-full py-4 bg-[var(--bg-surface)] hover:bg-yellow-400 hover:text-black text-[var(--text-primary)] rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest border border-[var(--border-subtle)]"
                            >
                                Acquista
                            </button>
                        </div>
                    </div>

                    {/* Pack 3 Crediti */}
                    <div className="bg-[var(--bg-card)] border-2 border-[var(--accent-primary)] rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-[var(--shadow-lg)] shadow-[var(--accent-digital-blue-dim)]">
                        <div className="absolute top-0 right-0 bg-[var(--accent-primary)] text-white text-[10px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-tighter">I Più Scelti</div>
                        <div className="w-20 h-20 bg-[var(--accent-digital-blue-dim)] rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">🪙🪙🪙</div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">3 Crediti</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 font-medium">Risparmia il 25% <br /> su tre avventure</p>
                        <div className="mt-auto w-full">
                            <div className="text-3xl font-black text-[var(--text-primary)] mb-6">8,99€</div>
                            <button
                                onClick={() => handleCheckout('credit_3')}
                                disabled={loading}
                                className="w-full py-4 bg-[var(--accent-primary)] text-white hover:opacity-90 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-lg"
                            >
                                Acquista
                            </button>
                        </div>
                    </div>

                    {/* Abbonamento Mensile */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-[2.5rem] p-8 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-500 shadow-[var(--shadow-md)]">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">💎</div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2">SplitPlan Pro</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 font-medium">Accesso illimitato <br /> per un intero mese</p>
                        <div className="mt-auto w-full">
                            {user.is_subscribed && user.subscription_plan === 'MONTHLY' ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-[var(--accent-primary)] font-black flex items-center gap-1">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <div className="flex flex-col gap-1 items-center">
                                        <p className="text-[10px] text-[var(--text-subtle)] uppercase font-black">Piano Mensile</p>
                                        {user.subscription_expiry && (
                                            <p className="text-[9px] text-[var(--text-muted)] font-bold">Scade il: {new Date(user.subscription_expiry).toLocaleDateString('it-IT')}</p>
                                        )}
                                        {user.auto_renew ? (
                                            <button
                                                onClick={handleCancelRenew}
                                                className="text-[9px] text-red-500 font-black hover:underline mt-1 uppercase"
                                            >
                                                Annulla Abbonamento
                                            </button>
                                        ) : (
                                            <p className="text-[9px] text-orange-500 font-black mt-1 uppercase">Rinnovo Disattivato</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-black text-[var(--text-primary)] mb-6">4,99€<span className="text-xs text-[var(--text-subtle)] font-medium">/mese</span></div>
                                    <button
                                        onClick={() => handleCheckout('sub_monthly')}
                                        disabled={loading || user.subscription_plan === 'ANNUAL'}
                                        className="w-full py-4 bg-[var(--accent-primary)] text-white hover:opacity-90 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-lg"
                                    >
                                        {user.subscription_plan === 'ANNUAL' ? 'Piano Annuale Attivo' : 'Abbonati'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Piano Annuale */}
                    <div className="bg-[var(--bg-card)] border border-[var(--accent-primary)] rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden hover:scale-[1.02] transition-all duration-500 shadow-[var(--shadow-xl)]">
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-digital-blue-dim)] to-transparent pointer-events-none"></div>
                        <div className="w-20 h-20 bg-yellow-400/20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner relative z-10">👑</div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-2 relative z-10">Piano Annuale</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 font-medium relative z-10">Il miglior valore <br /> per i grandi viaggiatori</p>
                        <div className="mt-auto w-full relative z-10">
                            {user.is_subscribed && user.subscription_plan === 'ANNUAL' ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-yellow-500 font-black flex items-center gap-1">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ATTIVO
                                    </div>
                                    <div className="flex flex-col gap-1 items-center">
                                        <p className="text-[10px] text-[var(--text-subtle)] uppercase font-black">Massima Trasparenza</p>
                                        {user.subscription_expiry && (
                                            <p className="text-[9px] text-[var(--text-muted)] font-bold">Scade il: {new Date(user.subscription_expiry).toLocaleDateString('it-IT')}</p>
                                        )}
                                        {user.auto_renew ? (
                                            <button
                                                onClick={handleCancelRenew}
                                                className="text-[9px] text-red-500 font-black hover:underline mt-1 uppercase"
                                            >
                                                Annulla Abbonamento
                                            </button>
                                        ) : (
                                            <p className="text-[9px] text-orange-500 font-black mt-1 uppercase">Rinnovo Disattivato</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-black text-[var(--text-primary)] mb-6">29,99€<span className="text-xs text-[var(--text-subtle)] font-medium">/anno</span></div>
                                    <button
                                        onClick={() => handleCheckout('sub_annual')}
                                        disabled={loading}
                                        className="w-full py-4 bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 rounded-2xl font-black transition-all duration-300 disabled:opacity-50 uppercase text-xs tracking-widest shadow-xl"
                                    >
                                        Vai Pro Annuale
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-16 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative shadow-[var(--shadow-lg)]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[var(--accent-digital-blue-dim)] blur-3xl rounded-full opacity-50"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mb-4">Perché scegliere <span className="text-[var(--accent-primary)]">SplitPlan Pro?</span></h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    "Itinerari AI Illimitati",
                                    "Logistica & PDF Automation",
                                    "Chat Butler AI 24/7",
                                    "Dashboard Budget Integrata",
                                    "Mappe Offline & Export",
                                    "Supporto Prioritario"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-bold text-[var(--text-muted)]">
                                        <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-surface)] p-8 rounded-[2rem] text-center border border-[var(--border-subtle)] shadow-inner">
                            <p className="text-[10px] text-[var(--text-subtle)] uppercase font-black mb-2 tracking-widest leading-relaxed">Il tuo saldo attuale</p>
                            <div className="text-5xl font-black text-[var(--accent-primary)] mb-1">🪙 {user.credits || 0}</div>
                            <p className="text-xs font-bold text-[var(--text-muted)]">Crediti Disponibili</p>
                        </div>
                    </div>
                </div>

                <p className="mt-12 text-center text-[10px] text-[var(--text-subtle)] uppercase tracking-widest font-black opacity-50">
                    Transazioni sicure gestite da Stripe & SSL Encryption. I crediti non scadono mai.
                </p>
            </div>
        </div>
    );
};

export default Market;
