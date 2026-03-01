import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const isPremium = user?.is_subscribed;
    const currentPlan = user?.subscription_plan;
    const isLoggedIn = !!user;

    const PlanBadge = ({ label }) => (
        <div className="bg-[#0070f3] text-white py-2 px-6 rounded-xl text-sm font-black tracking-tight shadow-[0_0_20px_rgba(0,112,243,0.3)] inline-block">
            {label || t('pricing.your_plan', 'Il tuo piano')}
        </div>
    );

    return (
        <section id="pricing" className="section relative overflow-hidden py-24 bg-black">
            {/* SaaS Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            <div className="container relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#0070f3]/10 border border-[#0070f3]/20 text-[#0070f3] text-[10px] font-black uppercase tracking-[0.2em]">
                        {t('pricing.badge', 'Scegli il piano')}
                    </span>
                    <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                        {isLoggedIn ? t('pricing.your_plan', 'Il tuo piano') : t('pricing.title', 'Piani & Prezzi')}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Free Plan */}
                    <div className={cn(
                        "bg-[#0d0d18] border p-8 rounded-[40px] flex flex-col transition-all duration-500",
                        isLoggedIn && !isPremium ? "border-[#0070f3] ring-1 ring-[#0070f3]/30" : "border-white/5 hover:border-white/10"
                    )}>
                        <h3 className="text-xl font-black text-white/50 mb-6">{t('pricing.free_name')}</h3>
                        <div className="mb-6">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">{t('pricing.free_price')}</span>
                        </div>
                        <p className="text-sm text-[#7b7b9a] font-medium leading-relaxed mb-8">{t('pricing.free_desc')}</p>

                        <ul className="space-y-4 mb-10 overflow-hidden">
                            {[t('pricing.free_feat1'), t('pricing.free_feat2'), t('pricing.free_feat3')].map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm font-medium text-white/70">
                                    <Check className="w-4 h-4 text-[#0070f3] mt-0.5 shrink-0" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto pt-6 text-center">
                            {(isLoggedIn && !isPremium) ? (
                                <PlanBadge />
                            ) : !isLoggedIn ? (
                                <Button className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black text-lg" onClick={() => window.location.href = '/auth'}>
                                    {t('pricing.subscribe')}
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {/* Monthly Plan */}
                    <div className={cn(
                        "bg-[#0d0d18] border p-10 rounded-[40px] flex flex-col relative transition-all duration-500",
                        isLoggedIn && isPremium && currentPlan === 'MONTHLY' ? "border-[#0070f3] ring-1 ring-[#0070f3]/30" : "border-white/5 hover:border-white/10"
                    )}>
                        <div className="absolute -top-4 left-10 bg-[#0070f3] text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase shadow-xl shadow-[#0070f3]/30">
                            {t('pricing.mostSelected', 'Più Scelto')}
                        </div>
                        <h3 className="text-xl font-black text-white/50 mb-6">{t('pricing.pro_monthly_name')}</h3>
                        <div className="mb-6 flex items-baseline gap-2">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">{t('pricing.pro_monthly_price')}</span>
                            <span className="text-lg font-black text-white/30 tracking-tight">{t('pricing.per_month')}</span>
                        </div>
                        <p className="text-sm text-[#7b7b9a] font-medium leading-relaxed mb-8">{t('pricing.pro_monthly_desc')}</p>

                        <ul className="space-y-4 mb-10">
                            {[t('pricing.pro_monthly_feat1'), t('pricing.pro_monthly_feat2'), t('pricing.pro_monthly_feat3')].map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm font-medium text-white/70">
                                    <Check className="w-4 h-4 text-[#0070f3] mt-0.5 shrink-0" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto pt-6">
                            {(isLoggedIn && isPremium && currentPlan === 'MONTHLY') ? (
                                <div className="text-center"><PlanBadge /></div>
                            ) : (isLoggedIn && !isPremium) || !isLoggedIn ? (
                                <Button className="btn-primary w-full h-14 rounded-2xl font-black text-lg" onClick={() => window.location.href = (isLoggedIn ? '/market' : '/auth')}>
                                    {t('pricing.subscribe')}
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {/* Annual Plan */}
                    <div className={cn(
                        "bg-[#0d0d18] border p-8 rounded-[40px] flex flex-col relative transition-all duration-500 overflow-hidden",
                        isLoggedIn && isPremium && currentPlan === 'ANNUAL' ? "border-[#0070f3] ring-1 ring-[#0070f3]/30" : "border-white/5 hover:border-white/10"
                    )}>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles className="w-20 h-20 text-[#0070f3]" />
                        </div>
                        <div className="absolute -top-4 left-10 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase shadow-xl shadow-emerald-500/30">
                            {t('pricing.save_50', 'Salva 50%')}
                        </div>
                        <h3 className="text-xl font-black text-white/50 mb-6">{t('pricing.pro_annual_name')}</h3>
                        <div className="mb-6 flex items-baseline gap-2">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">{t('pricing.pro_annual_price')}</span>
                            <span className="text-lg font-black text-white/30 tracking-tight">{t('pricing.per_year')}</span>
                        </div>
                        <p className="text-sm text-[#7b7b9a] font-medium leading-relaxed mb-8">{t('pricing.pro_annual_desc')}</p>

                        <ul className="space-y-4 mb-10">
                            {[t('pricing.pro_annual_feat1'), t('pricing.pro_annual_feat2'), t('pricing.pro_annual_feat3')].map((feat, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm font-medium text-white/70">
                                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto pt-6 text-center">
                            {(isLoggedIn && isPremium && currentPlan === 'ANNUAL') ? (
                                <PlanBadge />
                            ) : (isLoggedIn && !isPremium) || !isLoggedIn ? (
                                <Button className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-black text-lg" onClick={() => window.location.href = (isLoggedIn ? '/market' : '/auth')}>
                                    {t('pricing.subscribe')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
