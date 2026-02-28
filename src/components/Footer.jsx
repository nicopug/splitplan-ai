import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    return (
        <footer style={{ background: '#000', position: 'relative', overflow: 'hidden' }}>

            {/* Top gradient divider */}
            <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(34,211,238,0.5), transparent)'
            }} />

            {/* Subtle background glow */}
            <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '600px', height: '200px', borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div className="container" style={{ padding: '4rem 1rem 3rem', position: 'relative', zIndex: 1 }}>
                <div className="grid-3">

                    {/* Brand */}
                    <div>
                        <div style={{
                            fontSize: '1.8rem', fontWeight: '900', marginBottom: '1rem',
                            background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            SplitPlan
                        </div>
                        <p style={{ color: '#4a4a6e', fontSize: '0.9rem', lineHeight: '1.7', margin: 0 }}>
                            {t('footer.tagline', 'Rendiamo i viaggi di gruppo facili, divertenti e senza stress.')}
                        </p>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                            {['Twitter', 'Instagram', 'LinkedIn'].map(social => (
                                <a key={social} href="#" style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', color: '#7b7b9a', transition: 'all 0.2s', textDecoration: 'none'
                                }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.background = 'rgba(139,92,246,0.2)';
                                        e.currentTarget.style.color = '#a78bfa';
                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                                        e.currentTarget.style.color = '#7b7b9a';
                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                                    }}
                                >
                                    {social === 'Twitter' ? '𝕏' : social === 'Instagram' ? '📸' : 'in'}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 style={{ color: '#f0f0ff', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('footer.usefulLinks', 'Link Utili')}
                        </h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                t('footer.about', 'Chi Siamo'),
                                t('footer.careers', 'Lavora con Noi'),
                                t('footer.privacy', 'Privacy Policy')
                            ].map(link => (
                                <li key={link}>
                                    <a href="#" style={{
                                        color: '#4a4a6e', fontSize: '0.9rem', textDecoration: 'none',
                                        transition: 'color 0.2s'
                                    }}
                                        onMouseOver={e => e.currentTarget.style.color = '#a78bfa'}
                                        onMouseOut={e => e.currentTarget.style.color = '#4a4a6e'}
                                    >
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 style={{ color: '#f0f0ff', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('footer.contact', 'Contatti')}
                        </h4>
                        <a href="mailto:splitplan.ai@gmail.com" style={{
                            color: '#4a4a6e', fontSize: '0.9rem', textDecoration: 'none',
                            transition: 'color 0.2s', display: 'block'
                        }}
                            onMouseOver={e => e.currentTarget.style.color = '#22d3ee'}
                            onMouseOut={e => e.currentTarget.style.color = '#4a4a6e'}
                        >
                            splitplan.ai@gmail.com
                        </a>

                        {/* Status badge */}
                        <div style={{
                            marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '6px 12px', borderRadius: '999px',
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                            fontSize: '0.8rem', color: '#10b981', fontWeight: '600'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                            Tutti i sistemi operativi
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    marginTop: '3rem', paddingTop: '2rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '1rem'
                }}>
                    <span style={{ color: '#4a4a6e', fontSize: '0.8rem' }}>
                        {t('footer.rights', '© 2025 SplitPlan AI. Tutti i diritti riservati.')}
                    </span>
                    <span style={{
                        fontSize: '0.75rem', color: '#4a4a6e',
                        background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        fontWeight: '600'
                    }}>
                        Made with ✨ AI
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
