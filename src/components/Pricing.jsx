import React from 'react';
import { useTranslation } from 'react-i18next';

const Pricing = ({ user }) => {
    const { t } = useTranslation();
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const PlanBadge = () => (
        <div style={{
            background: 'var(--accent-digital-blue)',
            color: 'white', padding: '0.6rem 1.5rem',
            borderRadius: '999px', fontSize: '0.85rem', fontWeight: '800',
            display: 'inline-block', boxShadow: 'var(--glow-blue-sm)',
            letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
            {t('pricing.your_plan', 'Il tuo piano')}
        </div>
    );

    const featureStyle = { marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem' };
    const checkStyle = { color: 'var(--accent-digital-blue-light)', fontWeight: '800', flexShrink: 0 };

    return (
        <section id="pricing" className="section bg-black">
            <div className="container h-full">
                <div className="viewport-split items-center">

                    {/* Left: Pricing Intro */}
                    <div className="space-y-6">
                        <div className="inline-block px-3 py-1 rounded-sm border border-white/10 bg-white/5 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
                            PRICING
                        </div>
                        <h2 className="text-white text-4xl lg:text-5xl font-semibold leading-tight max-w-sm">
                            {isLoggedIn ? t('pricing.your_plan', 'Il tuo piano') : t('pricing.title')}
                        </h2>
                        <p className="text-gray-600 text-lg max-w-sm">
                            {t('pricing.free_desc')}
                        </p>
                    </div>

                    {/* Right: Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full py-12">
                        {[
                            { name: t('pricing.free_name'), price: t('pricing.free_price'), desc: t('pricing.free_feat1'), type: 'FREE' },
                            { name: t('pricing.pro_monthly_name'), price: t('pricing.pro_monthly_price'), desc: t('pricing.pro_monthly_feat1'), type: 'MONTHLY', featured: true },
                            { name: t('pricing.pro_annual_name'), price: t('pricing.pro_annual_price'), desc: t('pricing.pro_annual_feat1'), type: 'ANNUAL' }
                        ].map((plan, i) => (
                            <div key={i} className={`p-6 rounded-sm border ${plan.featured ? 'border-white/20 bg-white/5 shadow-2xl' : 'border-white/5 bg-transparent'} space-y-4 flex flex-col`}>
                                <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">{plan.name}</div>
                                <div className="text-2xl font-semibold text-white">{plan.price}</div>
                                <p className="text-gray-500 text-xs leading-relaxed flex-grow">
                                    {plan.desc}
                                </p>
                                <button
                                    onClick={() => window.location.href = '/market'}
                                    className={`w-full py-2 text-[10px] font-bold tracking-widest uppercase transition-colors ${plan.featured ? 'bg-white text-black hover:bg-gray-200' : 'border border-white/10 text-white hover:bg-white/5'}`}
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
