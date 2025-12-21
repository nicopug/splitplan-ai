import React from 'react';

const Timeline = ({ items }) => {
    // Safety Check for Null/Undefined items
    if (!items || !Array.isArray(items) || items.length === 0) {
        return (
            <div className="container section text-center">
                <p>Nessun itinerario disponibile al momento.</p>
            </div>
        );
    }

    // Group by Day (Safely)
    const grouped = items.reduce((acc, item) => {
        try {
            let date = "Data Sconosciuta";
            if (item.start_time) {
                // Handle "YYYY-MM-DDTHH:mm:ss" vs just "YYYY-MM-DD"
                if (item.start_time.includes('T')) {
                    date = item.start_time.split('T')[0];
                } else {
                    // Try parsing
                    const d = new Date(item.start_time);
                    if (!isNaN(d.getTime())) {
                        date = d.toISOString().split('T')[0];
                    }
                }
            }

            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
        } catch (e) {
            console.warn("Timeline grouping error", e);
        }
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();

    return (
        <div className="container section">
            <h2 className="text-center" style={{ marginBottom: '2rem' }}>Il Tuo Itinerario 🗺️</h2>

            <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
                {/* Vertical Line */}
                <div style={{ position: 'absolute', left: '20px', top: 0, bottom: 0, width: '4px', background: '#ddd', borderRadius: '2px' }}></div>

                {sortedDates.map((date, idx) => (
                    <div key={date} style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ width: '44px', height: '44px', background: 'var(--primary-blue)', borderRadius: '50%', border: '4px solid white', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                {idx + 1}
                            </div>
                            <h3 style={{ marginLeft: '1rem', margin: 0, background: '#fff', padding: '0.5rem 1rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                Giorno {idx + 1} <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>({date})</span>
                            </h3>
                        </div>

                        <div style={{ marginLeft: '50px' }}>
                            {grouped[date].map((item, i) => (
                                <div key={item.id || i} style={{
                                    background: 'white',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    marginBottom: '1rem',
                                    boxShadow: 'var(--shadow-sm)',
                                    borderLeft: `4px solid ${item.type === 'CHECKIN' ? 'orange' : item.type === 'FOOD' ? 'red' : 'green'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '1.1rem' }}>{item.title}</strong>
                                        <span style={{ fontSize: '0.8rem', background: '#eee', padding: '2px 8px', borderRadius: '4px' }}>
                                            {(() => {
                                                try {
                                                    if (!item.start_time) return "N/A";
                                                    const d = new Date(item.start_time);
                                                    return isNaN(d.getTime()) ? "N/A" : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                } catch { return "N/A"; }
                                            })()}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0', color: '#555', fontSize: '0.9rem' }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timeline;
