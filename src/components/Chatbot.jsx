import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../api';

const Chatbot = ({ tripId, onItineraryUpdate, onClose, messages, setMessages }) => {
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
            setMessages(prev => [...prev, { role: 'ai', text: "Scusa, si è verificato un errore nel processare la tua richiesta." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: '4rem',
            width: '100%',
            position: 'relative'
        }}>
            <div className="chat-container auth-glass-card" style={{
                height: '650px',
                width: '100%',
                maxWidth: '800px',
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: 'var(--shadow-xl)',
                position: 'relative',
                zIndex: 2
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    background: 'var(--primary-blue)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Assistente AI 🤖</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Esclusivo per utenti Premium</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            &times;
                        </button>
                    )}
                </div>

                <div className="chat-messages" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    position: 'relative'
                }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '1rem',
                            borderRadius: '16px',
                            background: msg.role === 'user' ? 'var(--primary-blue)' : 'white',
                            color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                            boxShadow: 'var(--shadow-sm)',
                            border: msg.role === 'ai' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                            zIndex: 2
                        }}>
                            {msg.text}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', padding: '1rem', background: 'white', borderRadius: '16px', fontStyle: 'italic', fontSize: '0.9rem', opacity: 0.7 }}>
                            L'AI sta modificando l'itinerario... ⏳
                        </div>
                    )}

                    {/* HINT TEXT: Only show if there's only one message (the AI welcome) */}
                    {messages.length <= 1 && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '2rem',
                            opacity: 0.6,
                            fontSize: '0.9rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>💡</span>
                            <p style={{ margin: 0 }}>Puoi chiedere di aggiungere, modificare o eliminare attività nell'itinerario.</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{
                    padding: '1.5rem',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Es: 'Aggiungi una cena stasera alle 20'"
                        style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid #ddd',
                            outline: 'none'
                        }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
                        Invia
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
