import React from 'react';
import { useTranslation } from 'react-i18next';

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const PlanBadge = () => (
        <div className="bg-primary-blue text-white px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary-blue/20 inline-block animate-fade-in">
            {t('pricing.your_plan', 'Il tuo piano')}
        </div>
    );

    const featureStyle = { marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem' };
    const checkStyle = { color: 'var(--accent-digital-blue-light)', fontWeight: '800', flexShrink: 0 };

    return (
        <section id="pricing" className="section bg-base transition-colors duration-500">
            <div className="container h-full">
                <div className="viewport-split items-center">
                    {/* Left: Pricing Intro */}
                    <div className="space-y-8 py-12">
                        <div className="inline-block px-3 py-1 rounded-sm border border-border-medium bg-card text-[10px] font-black tracking-[0.2em] uppercase text-muted">
                            PRICING
                        </div>
                        <h2 className="text-primary text-4xl lg:text-6xl font-semibold leading-tight max-w-sm uppercase tracking-tight">
                            {isLoggedIn ? t('pricing.your_plan', 'Il tuo piano') : t('pricing.title')}
                        </h2>
                        <p className="text-muted text-xl max-w-sm leading-relaxed">
                            {t('pricing.free_desc')}
                        </p>
                    </div>

                    {/* Right: Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full py-12">
                        {[
                            { name: t('pricing.free_name'), price: t('pricing.free_price'), desc: t('pricing.free_feat1'), type: 'FREE' },
                            { name: t('pricing.pro_monthly_name'), price: t('pricing.pro_monthly_price'), desc: t('pricing.pro_monthly_feat1'), type: 'MONTHLY', featured: true },
                            { name: t('pricing.pro_annual_name'), price: t('pricing.pro_annual_price'), desc: t('pricing.pro_annual_feat1'), type: 'ANNUAL' }
                        ].map((plan, i) => (
                            <div key={i} className={`premium-card p-8 bg-card border transition-all duration-500 flex flex-col gap-6 ${plan.featured ? 'border-primary-blue/30 shadow-2xl scale-105 z-10' : 'border-border-subtle shadow-md hover:shadow-xl'}`}>
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black tracking-[0.2em] text-subtle uppercase">{plan.name}</div>
                                    <div className="text-4xl font-black text-primary tracking-tight">{plan.price}</div>
                                    <p className="text-muted text-sm leading-relaxed flex-grow italic">
                                        {plan.desc}
                                    </p>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/market'}
                                    className={`w-full h-14 text-[11px] font-black tracking-[0.2em] uppercase transition-all rounded-sm ${plan.featured ? 'bg-primary-blue text-white shadow-xl shadow-primary-blue/20 hover:bg-primary-blue-light' : 'border border-border-medium text-primary hover:bg-elevated'}`}
                                >
                                    {isLoggedIn && isPremium && user.subscription_plan === plan.type ? t('pricing.your_plan').toUpperCase() : t('pricing.subscribe').toUpperCase()}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
