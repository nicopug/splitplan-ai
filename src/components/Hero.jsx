import React, { useState, useEffect, useRef } from 'react';
import { createTrip } from '../api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useSpotlight } from '../hooks/useSpotlight';

const AIDemo = () => {
    const { t } = useTranslation();
    const { ref, onMouseMove } = useSpotlight();
    const [messages, setMessages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    const demoScript = [
        { role: 'user', text: "Organizzami 3 giorni a Parigi per 4 persone, budget 500€ a testa. Musei sì, trappole per turisti no." },
        { role: 'ai', text: "Parigi in arrivo! ✨ Voli a 120€. Hotel a Montmartre trovato. Ho inserito il Louvre giovedì (meno folla). Genero itinerario e spese..." },
        { role: 'user', text: "Perfetto! Aggiungi un ristorante di pesce per sabato sera." },
        { role: 'ai', text: "Certo! Ho prenotato 'Le Comptoir du Relais'. Tavolo per 4 alle 20:30. 🍷" }
    ];

    useEffect(() => {
        if (currentIndex >= demoScript.length) {
            const timeout = setTimeout(() => {
                setMessages([]);
                setCurrentIndex(0);
            }, 5000);
            return () => clearTimeout(timeout);
        }

        setIsTyping(true);
        const timeout = setTimeout(() => {
            setMessages(prev => [...prev, demoScript[currentIndex]]);
            setIsTyping(false);
            setCurrentIndex(prev => prev + 1);
        }, currentIndex % 2 === 0 ? 1000 : 2500);

        return () => clearTimeout(timeout);
    }, [currentIndex]);

    return (
        <div 
            ref={ref}
            onMouseMove={onMouseMove}
            className="premium-card w-full max-w-[540px] aspect-[4/3] bg-black/40 backdrop-blur-xl border-white/5 shadow-2xl flex flex-col p-0 overflow-hidden group"
        >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                </div>
                <div className="text-[10px] font-black tracking-widest text-muted uppercase">SplitPlan AI Engine</div>
                <div className="w-6" />
            </div>
            
            <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-white/10 text-white rounded-tr-none border border-white/10' 
                                : 'bg-primary-blue/20 text-blue-100 rounded-tl-none border border-primary-blue/20'
                            }`}>
                                {msg.role === 'ai' && <Sparkles className="w-3 h-3 inline-block mr-2 text-blue-400 mb-1" />}
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-primary-blue/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-blue-400/50 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div id="demo-end" />
            </div>
            
            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3">
                <div className="flex-1 h-10 bg-white/5 rounded-full border border-white/10 flex items-center px-4 text-xs text-muted font-medium">
                    Scrivi un messaggio...
                </div>
                <div className="w-10 h-10 bg-primary-blue rounded-full flex items-center justify-center text-white">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
};



const Hero = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { showPrompt } = useModal();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [showTypeSelection, setShowTypeSelection] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const handleIniziaOra = () => {
        if (user) setShowTypeSelection(true);
        else navigate('/auth');
    };

    const handleCreateTrip = async (type) => {
        setShowTypeSelection(false);
        const title = type === 'SOLO' ? t('hero.createSoloTitle') : t('hero.createGroupTitle');
        const message = type === 'SOLO' ? t('hero.createSoloMessage') : t('hero.createGroupMessage');
        const placeholder = type === 'SOLO' ? t('hero.createSoloPlaceholder') : t('hero.createGroupPlaceholder');

        const tripName = await showPrompt(title, message, placeholder);
        if (!tripName) return;
        setLoading(true);
        try {
            const data = await createTrip({ name: tripName, trip_type: type });
            showToast(t('hero.successMessage'), 'success');
            navigate(`/trip/${data.trip_id}`);
        } catch (error) {
            showToast('Errore: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="section bg-base overflow-hidden relative min-h-screen flex items-center">
            {/* Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-blue top-[-10%] left-[-10%] animate-orb" />
                <div className="orb orb-violet top-[20%] right-[-5%] animate-orb" style={{ animationDelay: '-3s' }} />
                <div className="orb orb-cyan bottom-[10%] left-[20%] animate-orb" style={{ animationDelay: '-6s' }} />
            </div>

            <div className="container relative z-10 py-20">
                <div className="flex flex-col lg:flex-row w-full items-center gap-12 lg:gap-20">
                    {/* Left: Content */}
                    <div className="w-full lg:w-1/2 space-y-8 py-12 lg:pr-12 text-left flex flex-col">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-block px-3 py-1 rounded-full border border-border-medium bg-card/50 backdrop-blur-sm text-[11px] font-bold tracking-[0.15em] uppercase text-[#114DD0] dark:text-blue-400 self-start"
                        >
                            {t('hero.badge')}
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-primary text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9]"
                        >
                            {t('hero.titlePrefix')}<br />
                            <span className="text-muted block mt-2">{t('hero.titleHighlight')}</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-muted text-xl max-w-lg leading-relaxed font-medium"
                        >
                            {t('hero.description')}
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center gap-8 pt-4"
                        >
                            <Button
                                variant="ai"
                                size="lg"
                                className="px-10 py-4 h-auto text-lg rounded-full"
                                onClick={handleIniziaOra}
                                disabled={loading}
                            >
                                {loading ? t('common.loading') : t('hero.cta')}
                            </Button>
                            
                            <button
                                className="text-primary font-bold hover:text-blue-500 transition-colors flex items-center gap-3 group text-lg"
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                {t('hero.learnMore', 'Explore features')}
                                <svg className="w-5 h-5 transform group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </motion.div>


                    </div>

                    {/* Right: Technical Visual (AI Demo) */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="w-full lg:w-1/2 relative flex items-center justify-center lg:justify-end"
                    >
                        <AIDemo />
                    </motion.div>
                </div>
            </div>

            {/* Trip Type Selection Modal */}
            {showTypeSelection && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface w-full max-w-md border border-white/10 rounded-3xl p-10 shadow-2xl"
                    >
                        <h2 className="text-3xl font-black text-center mb-8 tracking-tighter">{t('hero.selectionTitle')}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => handleCreateTrip('GROUP')}
                                className="flex flex-col items-center gap-6 p-8 border border-white/5 bg-card hover:bg-elevated hover:border-blue-500/30 transition-all rounded-2xl group"
                            >
                                <span className="text-5xl group-hover:scale-110 transition-transform">👥</span>
                                <span className="font-bold text-sm uppercase tracking-widest">{t('hero.groupTitle')}</span>
                            </button>
                            <button
                                onClick={() => handleCreateTrip('SOLO')}
                                className="flex flex-col items-center gap-6 p-8 border border-white/5 bg-card hover:bg-elevated hover:border-blue-500/30 transition-all rounded-2xl group"
                            >
                                <span className="text-5xl group-hover:scale-110 transition-transform">✈️</span>
                                <span className="font-bold text-sm uppercase tracking-widest">{t('hero.soloTitle')}</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowTypeSelection(false)}
                            className="w-full mt-10 text-muted hover:text-primary transition-colors text-xs font-black tracking-[0.2em] uppercase"
                        >
                            {t('common.cancel')}
                        </button>
                    </motion.div>
                </div>
            )}
        </header>
    );
};

export default Hero;
 Hero;