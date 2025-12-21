import React from 'react';

const Features = () => {
    return (
        <section id="features" className="section" style={{ background: 'var(--primary-blue)', color: 'white' }}>
            <div className="container grid-2" style={{ alignItems: 'center' }}>
                <div>
                    <h2 style={{ color: 'white' }}>Perché SplitPlan è <br /> <span style={{ color: 'var(--secondary-blue)' }}>Unico?</span></h2>
                    <ul style={{ listStyle: 'none', marginTop: '2rem' }}>
                        <li style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>Mediatore Sociale AI</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                Non siamo solo un motore di ricerca (come Skyscanner). Siamo l'amico smart che mette tutti d'accordo.
                            </p>
                        </li>
                        <li style={{ marginBottom: '2rem' }}>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>Finanza Integrata</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                Splitwise fa solo i conti. Noi integriamo i pagamenti nelle prenotazioni e nel budget giornaliero.
                            </p>
                        </li>
                        <li>
                            <h4 style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem', fontSize: '1.3rem' }}>Esperienza End-to-End</h4>
                            <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                                Dal "Dove andiamo?" al "Che foto assurda!", tutto in un'unica app.
                            </p>
                        </li>
                    </ul>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '400px',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>Confronto Veloce</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Booking.com</span>
                            <span>❌ Solo Hotel</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Splitwise</span>
                            <span>❌ Solo Spese</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <span>Chat GPT</span>
                            <span>❌ Solo Testo</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-orange)', fontWeight: 'bold', paddingTop: '0.5rem' }}>
                            <span>SplitPlan</span>
                            <span>✅ Tutto Incluso</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
