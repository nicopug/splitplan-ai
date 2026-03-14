import React, { useEffect } from 'react';

const Drawer = ({ isOpen, onClose, title, children }) => {
    // Disable scrolling when the drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'var(--bg-card)',
                    width: '100%', maxWidth: '500px',
                    height: '100%', maxHeight: '100vh',
                    borderLeft: '1px solid var(--glass-border)',
                    padding: '2rem', display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white',
                            width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.5rem', transition: 'background 0.2s'
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>
            </div>

            {/* Mobile Animation adjustment would normally be here with media queries,
                but for simplicity in this artifact, we'll keep the slideInRight.
                In a real CSS file, we'd use slideInBottom for max-width 640px. */}
        </div>
    );
};

export default Drawer;
