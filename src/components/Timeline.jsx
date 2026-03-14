import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock } from 'lucide-react';

const Timeline = ({ items }) => {
    const { t, i18n } = useTranslation();
    // Safety Check for Null/Undefined items
    if (!items || !Array.isArray(items) || items.length === 0) {
        return null;
    }

    // Group by Day (Safely)
    const grouped = (items || []).reduce((acc, item) => {
        if (!item) return acc;
        try {
            let date = t('timeline.unknownDate', "Data Sconosciuta");
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
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="relative">
                {/* Vertical Progress Line */}
                <div className="absolute left-[24px] top-6 bottom-6 w-px bg-white/10"></div>

                {sortedDates.map((date, idx) => (
                    <div key={date} className="mb-16 relative">
                        {/* Day Header */}
                        <div className="flex items-center gap-6 mb-8 sticky top-[calc(var(--header-height)+80px)] z-20 bg-black/50 backdrop-blur-md py-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-white text-black text-sm font-black rounded-sm shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                {idx + 1}
                            </div>
                            <div className="flex flex-col">
                                <span className="subtle-heading !mb-0">{t('timeline.day', { index: idx + 1 })}</span>
                                <h3 className="text-white text-lg font-semibold uppercase tracking-tight">
                                    {new Date(date).toLocaleDateString(i18n.language === 'it' ? 'it-IT' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                            </div>
                        </div>

                        {/* Activities List */}
                        <div className="ml-16 space-y-4">
                            {grouped[date].map((item, i) => (
                                <div
                                    key={item.id || i}
                                    className="premium-card group hover:!border-white/20 transition-all duration-300 p-6"
                                >
                                    <div className="flex justify-between items-start gap-6">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'CHECKIN' ? 'bg-amber-500' :
                                                        item.type === 'FOOD' ? 'bg-rose-500' : 'bg-emerald-500'
                                                    }`}></div>
                                                <h4 className="text-white text-xl font-semibold tracking-tight uppercase">
                                                    {item.title}
                                                </h4>
                                            </div>
                                            <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                                                {item.description}
                                            </p>

                                            <div className="flex items-center gap-4 pt-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                    <Clock className="w-3 h-3" />
                                                    {(() => {
                                                        try {
                                                            if (!item.start_time) return "N/A";
                                                            const d = new Date(item.start_time);
                                                            return isNaN(d.getTime()) ? "N/A" : d.toLocaleTimeString(i18n.language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                                                        } catch { return "N/A"; }
                                                    })()}
                                                </div>
                                                {item.location && (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                                        <MapPin className="w-3 h-3" />
                                                        {item.location}
                                                    </div>
                                                )}
                                            </div>
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