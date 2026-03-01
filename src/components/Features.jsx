import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Features = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    const steps = [
        {
            id: 'ai',
            title: t('solution.steps.s1.title', 'AI Prediction & Proposal'),
            desc: t('solution.steps.s1.desc', 'L’AI analizza i desideri del gruppo e propone le 3 migliori alternative. Elimina ore di ricerca manuale.'),
            icon: '✨',
            color: '#0070f3'
        },
        {
            id: 'voting',
            title: t('solution.steps.s2.title', 'Smart Consensus'),
            desc: t('solution.steps.s2.desc', 'Sistema di voto integrato che riconosce i partecipanti. Niente più decisioni prese a metà o discussioni infinite.'),
            icon: '🗳️',
            color: '#10b981'
        },
        {
            id: 'cfo',
            title: t('solution.steps.s4.title', 'Automated CFO'),
            desc: t('solution.steps.s4.desc', 'Gestione automatica del budget e divisione delle spese. Massima trasparenza, zero calcoli manuali.'),
            icon: '💹',
            color: '#f59e0b'
        }
    ];

    return (
        <section id="features" className="section bg-black relative overflow-hidden">
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', color: '#fff', letterSpacing: '-0.04em' }}>
                        {t('features.title', 'Perché scegliere')} <span style={{ color: '#0070f3' }}>SplitPlan?</span>
                    </h2>
                    <p style={{ color: '#7b7b9a', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
                        Eliminiamo lo "Shadow Work" dell'organizzazione. Automatizziamo tutto quello che prima era un incubo su WhatsApp.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left: Tab Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => setActiveTab(index)}
                                className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${activeTab === index
                                        ? 'bg-white/5 border-white/10 shadow-lg'
                                        : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                style={{ display: 'block' }}
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <span style={{
                                        fontSize: '1.25rem',
                                        background: activeTab === index ? step.color : '#333',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        transition: 'all 0.3s'
                                    }}>
                                        {step.icon}
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                                        {step.title}
                                    </h3>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#7b7b9a', margin: 0, lineHeight: '1.5' }}>
                                    {step.desc}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Right: Dynamic Product Area */}
                    <div className="lg:col-span-8 bg-[#0d0d18] rounded-3xl border border-white/5 p-4 sm:p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden shadow-2xl">
                        {/* Animated background lines */}
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
                            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #0070f3, transparent)', position: 'absolute', top: '25%' }} />
                            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #0070f3, transparent)', position: 'absolute', top: '50%' }} />
                            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #0070f3, transparent)', position: 'absolute', top: '75%' }} />
                        </div>

                        {/* Content Mockups */}
                        <div className="animate-fade-in w-full max-w-[600px]" key={activeTab}>
                            {activeTab === 0 && (
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 animate-slide-up">
                                        <div className="w-1/3 h-2 bg-[#0070f3]/40 rounded mb-2" />
                                        <div className="w-2/3 h-3 bg-white/20 rounded" />
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 translate-x-4 animate-slide-up delay-100">
                                        <div className="w-1/4 h-2 bg-[#0070f3]/40 rounded mb-2" />
                                        <div className="w-3/4 h-3 bg-white/20 rounded" />
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 -translate-x-2 animate-slide-up delay-200">
                                        <div className="w-1/2 h-2 bg-[#0070f3]/40 rounded mb-2" />
                                        <div className="w-1/2 h-3 bg-white/20 rounded" />
                                    </div>
                                </div>
                            )}
                            {activeTab === 1 && (
                                <div className="grid grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center gap-2 animate-scale-in" style={{ animationDelay: `${i * 100}ms` }}>
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm">👤</div>
                                            <div className="w-12 h-2 bg-white/20 rounded" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 2 && (
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 animate-slide-up">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                        <div>
                                            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-widest">Total Spent</div>
                                            <div className="text-2xl font-black text-white">€2,450.00</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-widest">Efficiency</div>
                                            <div className="text-sm font-bold text-amber-500">+15.4%</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Lodging</span>
                                            <span>45%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: '45%' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
