import React from 'react';

const Pricing = ({ user }) => {
    const isPremium = user?.is_subscribed;
    const isLoggedIn = !!user;

    const PlanBadge = () => (
        <div style={{
            background: 'var(--primary-blue)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            display: 'inline-block'
        }}>
            Il tuo Piano
        </div>
    );
    return (
        <section id="pricing" className="section">
            <div className="container">
                <div className="text-center" style={{ marginBottom: '4rem' }}>
                    <h2>Scegli il tuo piano</h2>
                </div>
                <div className="grid-2" style={{ justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
                    {/* Free Plan */}
                    <div style={{
                        background: 'white',
                        padding: '3rem 2rem',
                        borderRadius: '24px',
                        border: '1px solid #e0e0e0',
                        width: '100%',
                        maxWidth: '350px',
                        margin: '0 auto'
                    }}>
                        <h3 style={{ color: 'var(--text-main)', fontSize: '1.5rem' }}>Viaggiatore</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--primary-blue)' }}>Gratis</div>
                        <p style={{ fontSize: '0.9rem' }}>Tutto l'essenziale per organizzare.</p>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left' }}>
                            <li style={{ marginBottom: '1rem' }}>Pianificazione AI Base</li>
                            <li style={{ marginBottom: '1rem' }}>Itinerari Smart</li>
                            <li style={{ marginBottom: '1rem' }}>Prenotazioni Integrate</li>
                            <li style={{ marginBottom: '1rem' }}>Chat di Gruppo</li>
                        </ul>
                        <div style={{ textAlign: 'center' }}>
                            {isLoggedIn && !isPremium && <PlanBadge />}
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div className="premium-card-offset" style={{
                        background: 'var(--dark-navy)',
                        padding: '3rem 2rem',
                        borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        width: '100%',
                        maxWidth: '350px',
                        position: 'relative',
                        color: 'white',
                        margin: '0 auto'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--accent-orange)',
                            color: 'white',
                            padding: '0.25rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}>
                            CONSIGLIATO
                        </div>
                        <h3 style={{ color: 'white', fontSize: '1.5rem' }}>L'Organizzatore</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0', color: 'var(--secondary-blue)' }}>€4.99<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>/mese</span></div>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Per chi vuole il controllo totale.</p>
                        <ul style={{ listStyle: 'none', margin: '2rem 0', textAlign: 'left' }}>
                            <li style={{ marginBottom: '1rem' }}>CFO del Viaggio (Gestione Debiti)</li>
                            <li style={{ marginBottom: '1rem' }}>Budget Guard (Alert Spese)</li>
                            <li style={{ marginBottom: '1rem' }}>Assistenza AI Prioritaria</li>
                            <li style={{ marginBottom: '1rem' }}>Export Video Ricordi</li>
                        </ul>
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            {isLoggedIn && isPremium && <PlanBadge />}
                            {isLoggedIn && !isPremium && (
                                <button className="btn btn-accent" style={{ width: '100%' }}>Passa a Premium</button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Pricing;
