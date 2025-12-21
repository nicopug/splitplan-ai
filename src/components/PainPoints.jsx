import React from 'react';

const PainPoints = () => {
    return (
        <section className="section" style={{ background: 'var(--bg-white)' }}>
            <div className="container">
                <div className="text-center" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Basta con il Caos Organizzativo 🤯</h2>
                    <p>Organizzare un viaggio non dovrebbe essere un secondo lavoro.</p>
                </div>
                <div className="grid-3">
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗣️</div>
                        <h3>Caos Decisionale</h3>
                        <p>Chat WhatsApp infinite, link persi, e nessuno che prende una decisione. Il 70% dei viaggi di gruppo muore qui.</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
                        <h3>Frammentazione</h3>
                        <p>5 app diverse aperte: Booking, Maps, Notes, Splitwise... Un incubo logistico da gestire.</p>
                    </div>
                    <div style={{ padding: '2rem', background: 'var(--bg-soft-gray)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
                        <h3>Imbarazzo Finanziario</h3>
                        <p>"Chi deve quanto a chi?". Rincorrere gli amici per i soldi è la parte peggiore del viaggio.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PainPoints;
