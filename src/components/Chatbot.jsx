import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { chatWithAI } from '../api';
import Skeleton from './ui/Skeleton';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Send } from 'lucide-react';

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
        <div className="flex flex-col h-full w-full bg-surface/30">
            <div className="chat-messages flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative bg-transparent">
                {messages.map((msg, idx) => (
                    <div key={idx} className={cn(
                        "max-w-[85%] p-4 rounded-sm shadow-md border z-10 leading-relaxed text-[14px] transition-all animate-fade-in font-medium",
                        msg.role === 'user' 
                            ? "self-end bg-primary-blue text-white border-primary-blue/20 shadow-primary-blue/10" 
                            : "self-start bg-elevated text-primary border-border-subtle shadow-sm"
                    )}>
                        {msg.text}
                    </div>
                ))}
                {loading && (
                    <div className="self-start p-4 bg-card border border-border-subtle rounded-sm flex flex-col gap-3 shadow-md w-[180px]">
                        <Skeleton className="w-full h-2.5 bg-muted/20" />
                        <Skeleton className="w-2/3 h-2.5 bg-muted/20" />
                    </div>
                )}

                {/* HINT TEXT */}
                {messages.length <= 1 && (
                    <div className="text-center mt-8 opacity-60 flex flex-col items-center gap-3 px-4">
                        <div className="h-px w-16 bg-border-subtle mb-2"></div>
                        <p className="m-0 text-muted text-xs italic font-medium">
                            {t('chatbot.hint', "Puoi chiedere di aggiungere, modificare o eliminare attività nell'itinerario.")}
                        </p>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-6 border-t border-border-subtle bg-surface flex flex-col gap-3 shadow-inner-white">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chatbot.placeholder', "Es: 'Aggiungi una cena stasera'")}
                    className="w-full px-4 py-3 bg-card border border-border-medium rounded-sm outline-none text-primary text-sm placeholder:text-muted/50 focus:border-primary-blue shadow-sm transition-all font-medium"
                />
                <Button 
                    type="submit" 
                    variant="default"
                    disabled={loading}
                    className="w-full py-3 h-auto font-black uppercase text-[10px] tracking-widest"
                >
                    {t('chatbot.send', 'Invia Messaggio')}
                </Button>
            </form>
        </div>
    );
};


export default Chatbot;
