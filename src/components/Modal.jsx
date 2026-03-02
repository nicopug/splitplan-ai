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
                background: 'var(--bg-card)',
                border: '1px solid var(--accent-digital-blue)',
                borderRadius: '24px',
                padding: '2.5rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: 'var(--glow-blue), 0 24px 64px rgba(0,0,0,0.5)',
                animation: 'slideUp 0.25s ease-out'
            }}>
                <h3 style={{
                    color: 'var(--accent-digital-blue-light)',
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
                            e.target.style.borderColor = 'var(--accent-digital-blue)';
                            e.target.style.boxShadow = '0 0 0 3px var(--accent-digital-blue-dim)';
                        }}
                        onBlur={e => {
                            e.target.style.borderColor = 'var(--border-subtle)';
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
                            padding: '0.6rem 2rem', borderRadius: '999px',
                            fontWeight: '800', color: '#fff',
                            background: 'var(--accent-digital-blue)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: 'var(--glow-blue-sm)',
                            transition: 'all 0.2s', fontSize: '0.95rem'
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--glow-blue)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--glow-blue-sm)'; }}
                    >
                        {modal.type === 'prompt' ? 'Invia' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
