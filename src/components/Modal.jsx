import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../context/ModalContext';

const Modal = () => {
    const { t } = useTranslation();
    const { modal, closeModal } = useModal();
    const inputRef = useRef(null);

    if (!modal.isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.2s ease-out',
            transition: 'background 0.3s ease'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: '16px',
                padding: '2.5rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: 'var(--shadow-xl)',
                animation: 'slideUp 0.25s ease-out',
                transition: 'background 0.3s ease, border-color 0.3s ease'
            }}>
                <h3 style={{
                    color: 'var(--text-primary)',
                    fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem',
                    letterSpacing: '-0.02em'
                }}>
                    {modal.title}
                </h3>

                <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
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
                            borderRadius: '8px',
                            border: '1px solid var(--border-medium)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)', fontSize: '1rem',
                            fontFamily: 'inherit',
                            outline: 'none', marginBottom: '1.5rem',
                            transition: 'all 0.2s'
                        }}
                        onFocus={e => {
                            e.target.style.borderColor = 'var(--accent-digital-blue)';
                            e.target.style.boxShadow = '0 0 0 2px var(--accent-digital-blue-dim)';
                        }}
                        onBlur={e => {
                            e.target.style.borderColor = 'var(--border-medium)';
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
                            padding: '0.6rem 1.25rem', borderRadius: '8px',
                            fontWeight: '600', color: 'var(--text-muted)',
                            background: 'transparent', border: 'none',
                            cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.95rem'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        {t('common.cancel', 'Annulla')}
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
                            padding: '0.6rem 2rem', borderRadius: '8px',
                            fontWeight: '700', color: 'var(--bg-base)',
                            background: 'var(--accent-primary)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'all 0.2s', fontSize: '0.95rem'
                        }}
                        onMouseOver={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                    >
                        {modal.type === 'prompt' ? t('common.send', 'Invia') : t('common.confirm', 'Conferma')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
