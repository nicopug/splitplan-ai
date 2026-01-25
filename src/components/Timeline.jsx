import React from 'react';

const Timeline = ({ items }) => {
    // Safety Check for Null/Undefined items
    if (!items || !Array.isArray(items) || items.length === 0) {
        return null;
    }

    // Group by Day (Safely)
    const grouped = (items || []).reduce((acc, item) => {
        if (!item) return acc;
        try {
            let date = "Data Sconosciuta";
            if (item.start_time) {
                // Handle "YYYY-MM-DDTHH:mm:ss" vs just "YYYY-MM-DD"
                if (typeof item.start_time === 'string' && item.start_time.includes('T')) {
                    date = item.start_time.split('T')[0];
                } else {
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
        <div style={{ maxWidth: '850px', margin: '0 auto', position: 'relative', padding: '1rem' }}>

            <div style={{ position: 'relative' }}>
                {/* Vertical Line with Gradient */}
                <div style={{
                    position: 'absolute',
                    left: '25px',
                    top: '20px',
                    bottom: '20px',
                    width: '4px',
                    background: 'linear-gradient(to bottom, var(--primary-blue), var(--primary-blue-light))',
                    borderRadius: '4px',
                    opacity: 0.3
                }}></div>

                {sortedDates.map((date, idx) => (
                    <div key={date} style={{ marginBottom: '3rem', position: 'relative' }} className="animate-fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '54px',
                                height: '54px',
                                background: 'var(--bg-white)',
                                borderRadius: '18px',
                                border: '2px solid var(--primary-blue)',
                                zIndex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary-blue)',
                                fontWeight: '800',
                                fontSize: '1.2rem',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                                fontFamily: "'Outfit', sans-serif"
                            }}>
                                {idx + 1}
                            </div>
                            <h3 style={{
                                marginLeft: '1.5rem',
                                margin: 0,
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.4)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                                fontFamily: "'Outfit', sans-serif",
                                fontWeight: '700'
                            }}>
                                Giorno {idx + 1} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500', marginLeft: '8px' }}>• {new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            </h3>
                        </div>

                        <div style={{ marginLeft: '65px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {grouped[date].map((item, i) => (
                                <div key={item.id || i} className="hover-lift hover-scale" style={{
                                    background: 'var(--bg-white)',
                                    padding: '1.2rem',
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                                    border: '1px solid #f1f5f9',
                                    borderLeft: `6px solid ${item.type === 'CHECKIN' ? '#f59e0b' : item.type === 'FOOD' ? '#ef4444' : '#10b981'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>

                                                <strong style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>{item.title}</strong>
                                            </div>
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.description}</p>
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            background: '#f8fafc',
                                            color: '#64748b',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            border: '1px solid #e2e8f0',
                                            whiteSpace: 'nowrap',
                                            marginLeft: '1rem'
                                        }}>
                                            {(() => {
                                                try {
                                                    if (!item.start_time) return "N/A";
                                                    const d = new Date(item.start_time);
                                                    return isNaN(d.getTime()) ? "N/A" : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                                                } catch { return "N/A"; }
                                            })()}
                                        </div>
                                    </div>
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