import React, { useRef } from 'react';
import { useModal } from '../context/ModalContext';

const Modal = () => {
    const { modal, closeModal } = useModal();
    const inputRef = useRef(null);

    if (!modal.isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: '#0d0d18',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '24px',
                padding: '2.5rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 24px 64px rgba(0,0,0,0.7)',
                animation: 'slideUp 0.25s ease-out'
            }}>
                <h3 style={{
                    background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem'
                }}>
                    {modal.title}
                </h3>

                <p style={{ color: '#7b7b9a', marginBottom: '1.75rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {modal.message}
                </p>

                {modal.type === 'prompt' && (
                    <input
                        ref={inputRef}
                        autoFocus
                        type="text"
                        placeholder={modal.placeholder}
                        style={{
                            width: '100%', padding: '0.875rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(139,92,246,0.25)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#f0f0ff', fontSize: '1rem',
                            fontFamily: 'inherit',
                            outline: 'none', marginBottom: '1.5rem',
                            transition: 'all 0.2s'
                        }}
                        onFocus={e => {
                            e.target.style.borderColor = 'rgba(139,92,246,0.6)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)';
                        }}
                        onBlur={e => {
                            e.target.style.borderColor = 'rgba(139,92,246,0.25)';
                            e.target.style.boxShadow = 'none';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') closeModal(e.target.value);
                            if (e.key === 'Escape') closeModal(null);
                        }}
                    />
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => closeModal(null)}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: '999px',
                            fontWeight: '600', color: '#7b7b9a',
                            background: 'transparent', border: 'none',
                            cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = '#f0f0ff'}
                        onMouseOut={e => e.currentTarget.style.color = '#7b7b9a'}
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => {
                            if (modal.type === 'prompt') {
                                const input = document.querySelector('input[type="text"]');
                                closeModal(input ? input.value : '');
                            } else {
                                closeModal(true);
                            }
                        }}
                        style={{
                            padding: '0.6rem 1.75rem', borderRadius: '999px',
                            fontWeight: '700', color: '#fff',
                            background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 16px rgba(139,92,246,0.4)',
                            transition: 'all 0.2s', fontSize: '0.95rem'
                        }}
                        onMouseOver={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(139,92,246,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.boxShadow = '0 0 16px rgba(139,92,246,0.4)'; e.currentTarget.style.transform = 'none'; }}
                    >
                        {modal.type === 'prompt' ? 'Invia' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
