import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { chatWithAI } from '../api';
import Skeleton from './ui/Skeleton';
import { cn } from '../lib/utils';

const Chatbot = ({ tripId, onItineraryUpdate, onClose, messages, setMessages }) => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const data = await chatWithAI(tripId, userMsg, messages);
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);

            if (data.itinerary) {
                onItineraryUpdate(data.itinerary);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: t('chatbot.error', "Scusa, si è verificato un errore nel processare la tua richiesta.") }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-12 flex justify-center pb-24 w-full relative">
            <div className="chat-container premium-card !p-0 w-full max-w-[850px] flex flex-col overflow-hidden bg-card border-border-medium shadow-2xl relative z-10 transition-all duration-500">
                <div className="p-8 border-b border-border-subtle bg-primary-blue text-white flex justify-between items-center shadow-lg">
                    <div>
                        <h3 className="m-0 text-2xl font-black text-white uppercase tracking-tight">{t('chatbot.aiAssistant', 'Assistente AI')}</h3>
                        <p className="m-0 text-[10px] uppercase font-black tracking-widest opacity-80">{t('chatbot.premiumOnly', 'Esclusivo per utenti Premium')}</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="bg-white/10 border border-white/20 text-white w-10 h-10 rounded-sm cursor-pointer flex items-center justify-center text-xl hover:bg-white/20 transition-all shadow-md font-black"
                        >
                            &times;
                        </button>
                    )}
                </div>

                <div className="chat-messages flex-1 overflow-y-auto p-8 flex flex-col gap-6 relative min-h-[450px] max-h-[650px] bg-surface/30 backdrop-blur-sm">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={cn(
                            "max-w-[80%] p-5 rounded-sm shadow-md border z-10 leading-relaxed text-[15px] transition-all animate-fade-in font-medium",
                            msg.role === 'user' 
                                ? "self-end bg-primary-blue text-white border-primary-blue/20 shadow-primary-blue/10" 
                                : "self-start bg-card text-primary border-border-subtle shadow-sm"
                        )}>
                            {msg.text}
                        </div>
                    ))}
                    {loading && (
                        <div className="self-start p-5 bg-card border border-border-subtle rounded-sm flex flex-col gap-3 shadow-md w-[200px]">
                            <Skeleton className="w-full h-3 bg-muted/20" />
                            <Skeleton className="w-2/3 h-3 bg-muted/20" />
                        </div>
                    )}

                    {/* HINT TEXT */}
                    {messages.length <= 1 && (
                        <div className="text-center mt-12 opacity-60 flex flex-col items-center gap-3">
                            <div className="h-px w-24 bg-border-subtle mb-4"></div>
                            <p className="m-0 text-muted italic font-medium max-w-sm">
                                {t('chatbot.hint', "Puoi chiedere di aggiungere, modificare o eliminare attività nell'itinerario.")}
                            </p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-8 border-t border-border-subtle bg-surface flex gap-4 shadow-inner-white">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chatbot.placeholder', "Es: 'Aggiungi una cena stasera alle 20'")}
                        className="flex-1 px-6 py-4 bg-card border border-border-medium rounded-sm outline-none text-primary placeholder:text-muted/50 focus:border-primary-blue shadow-sm transition-all font-medium"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-10 py-4 bg-primary-blue text-white font-black uppercase text-[10px] tracking-widest rounded-sm hover:bg-primary-blue-light transition-all shadow-xl shadow-primary-blue/20 disabled:opacity-50"
                    >
                        {t('chatbot.send', 'Invia')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
