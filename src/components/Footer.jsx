import React from 'react';

const Footer = () => {
    return (
        <footer style={{ background: 'var(--dark-navy)', color: 'white', padding: '4rem 0' }}>
            <div className="container">
                <div className="grid-3">
                    <div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>SplitPlan</div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                            Rendiamo i viaggi di gruppo facili, divertenti e senza stress.
                        </p>
                    </div>
                    <div>
                        <h4 style={{ color: 'white' }}>Link Utili</h4>
                        <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Chi Siamo</li>
                            <li style={{ marginBottom: '0.5rem' }}>Lavora con Noi</li>
                            <li style={{ marginBottom: '0.5rem' }}>Privacy Policy</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ color: 'white' }}>Contatti</h4>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>alessiopuglie09@gmail.com</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        </div>
                    </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '3rem', paddingTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    © 2025 SplitPlan AI. Tutti i diritti riservati.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
