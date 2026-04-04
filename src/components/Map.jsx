import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// ── Google encoded-polyline decoder (no external dependency) ──────────────────
// Implements the standard algorithm used by Google Maps and OSRM (geometries=polyline).
function decodePolyline(encoded) {
    if (!encoded) return [];
    const coords = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);
        shift = result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
}

// ── Activity type → marker color ──────────────────────────────────────────────
const TYPE_COLOR = {
    TRANSPORT: '#ef4444',   // red   — flights, trains (hard anchors)
    CHECKIN:   '#f97316',   // orange — hotel check-in (hard anchor)
    FOOD:      '#22c55e',   // green
    ACTIVITY:  '#3b82f6',   // blue  (default)
};

function getMarkerColor(item) {
    return TYPE_COLOR[item?.type?.toUpperCase()] ?? TYPE_COLOR.ACTIVITY;
}

// ── Numbered DivIcon factory ───────────────────────────────────────────────────
function makeNumberedIcon(stepNumber, color, size = 28) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:${size < 28 ? 10 : 11}px;font-weight:900;font-family:monospace;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            border:2px solid rgba(255,255,255,0.9);
            user-select:none;
        ">${stepNumber}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
    });
}

// Hotel pin (unchanged)
function makeHotelIcon(isPremium) {
    const s = isPremium ? 36 : 24;
    return L.divIcon({
        className: '',
        html: `<div style="
            background:#e63946;width:${s}px;height:${s}px;
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
        "><div style="transform:rotate(45deg);font-size:${isPremium ? 18 : 12}px;">${isPremium ? '🏨' : ''}</div></div>`,
        iconSize: [s, s],
        iconAnchor: [s / 2, s],
        popupAnchor: [0, -s],
    });
}

// ── ChangeView — fitBounds whenever items or polyline changes ─────────────────
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (!bounds || bounds.length === 0) return;
        try {
            if (bounds.length === 1) map.setView(bounds[0], map.getZoom());
            else map.fitBounds(bounds, { padding: [50, 50] });
        } catch (e) {
            console.warn('Map fitBounds failed', e);
        }
    }, [bounds, map]);
    return null;
}

// ── Main component ────────────────────────────────────────────────────────────
const Map = ({ items = [], hotelLat, hotelLon, startDate, isPremium = false, routePolyline = null }) => {
    useEffect(() => {
        if (typeof L !== 'undefined' && L.icon) {
            try {
                L.Marker.prototype.options.icon = L.icon({
                    iconUrl: icon, shadowUrl: iconShadow,
                    iconSize: [25, 41], iconAnchor: [12, 41],
                });
            } catch (e) { console.warn('Leaflet icon setup failed', e); }
        }
    }, []);

    // Decode OSRM polyline (memoised — only recomputes when routePolyline changes)
    const roadPath = useMemo(() => decodePolyline(routePolyline), [routePolyline]);

    const getDayNumber = (itemDate) => {
        if (!startDate || !itemDate) return null;
        try {
            const start = new Date(startDate.split('T')[0]);
            const current = new Date(itemDate.split('T')[0]);
            if (isNaN(start) || isNaN(current)) return null;
            return Math.ceil(Math.abs(current - start) / 86400000) + 1;
        } catch { return null; }
    };

    // Only items with valid coordinates
    const mapItems = (items || []).filter(i => i?.latitude && i?.longitude);

    // Step numbers: each item in chronological order gets a 1-based index
    const stepNumberMap = useMemo(() => {
        const m = new Map();
        mapItems.forEach((item, idx) => m.set(item.id ?? idx, idx + 1));
        return m;
    }, [mapItems]);

    // Group items at the same lat/lon to avoid stacked markers
    const groups = {};
    mapItems.forEach((item, idx) => {
        const key = `${item.latitude.toFixed(5)},${item.longitude.toFixed(5)}`;
        if (!groups[key]) groups[key] = { lat: item.latitude, lon: item.longitude, items: [], isHotel: false };
        groups[key].items.push({ ...item, _stepNum: stepNumberMap.get(item.id ?? idx) });
    });

    if (hotelLat && hotelLon) {
        const hKey = `${hotelLat.toFixed(5)},${hotelLon.toFixed(5)}`;
        if (!groups[hKey]) groups[hKey] = { lat: hotelLat, lon: hotelLon, items: [], isHotel: true };
        else groups[hKey].isHotel = true;
    }

    const groupList = Object.values(groups);
    const allPoints = groupList.map(g => [g.lat, g.lon]);
    // If we have a decoded road path, use it to compute tighter bounds
    const boundsSource = roadPath.length > 1 ? roadPath : allPoints;
    const bounds = boundsSource.length > 0 ? boundsSource : [[45, 9]];

    const tileUrl = isPremium
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Straight-line fallback path (dashed) — shown only when road polyline unavailable
    const straightPath = mapItems.map(i => [i.latitude, i.longitude]);

    return (
        <div className={cn(
            'h-[400px] w-full rounded-3xl overflow-hidden mb-8 border transition-all',
            isPremium ? 'shadow-xl border-border-subtle' : 'shadow-md border-border-subtle'
        )}>
            <MapContainer center={bounds[0]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    key={isPremium ? 'premium' : 'standard'}
                    url={tileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <ChangeView bounds={bounds} />

                {/* ── Road polyline (OSRM) or dashed fallback ── */}
                {roadPath.length > 1 ? (
                    <Polyline
                        positions={roadPath}
                        color="#2563eb"
                        weight={3}
                        opacity={0.65}
                    />
                ) : straightPath.length > 1 && (
                    <Polyline
                        positions={straightPath}
                        color={isPremium ? '#2563eb' : 'var(--primary-blue)'}
                        weight={2}
                        opacity={0.45}
                        dashArray="6, 10"
                    />
                )}

                {/* ── Markers ── */}
                {groupList.map((group, gIdx) => {
                    const sorted = [...group.items].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

                    if (group.isHotel && sorted.length === 0) {
                        return (
                            <Marker key={`hotel-${gIdx}`} position={[group.lat, group.lon]} icon={makeHotelIcon(isPremium)}>
                                <Popup><strong>🏨 Il Tuo Hotel</strong></Popup>
                            </Marker>
                        );
                    }

                    // For mixed groups (hotel + activities), hotel flag adds header in popup
                    const firstItem = sorted[0];
                    const stepNum = firstItem?._stepNum ?? (gIdx + 1);
                    const color = group.isHotel ? '#e63946' : getMarkerColor(firstItem);
                    const markerIcon = group.isHotel
                        ? makeHotelIcon(isPremium)
                        : makeNumberedIcon(stepNum, color);

                    return (
                        <Marker key={gIdx} position={[group.lat, group.lon]} icon={markerIcon}>
                            <Popup className="premium-popup">
                                <div style={{ maxWidth: 240, maxHeight: 320, overflowY: 'auto' }}>
                                    {group.isHotel && (
                                        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                                            <strong style={{ color: '#e63946' }}>🏨 Il Tuo Hotel</strong>
                                        </div>
                                    )}
                                    {sorted.map((item, iIdx) => {
                                        const dayNum = getDayNumber(item.start_time);
                                        const time = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const dotColor = getMarkerColor(item);
                                        return (
                                            <div key={iIdx} style={{ marginBottom: iIdx < sorted.length - 1 ? 12 : 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: dotColor, color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {item._stepNum}
                                                    </div>
                                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
                                                        {dayNum ? `G${dayNum}` : ''} · {time}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{item.title}</div>
                                                {item.description && (
                                                    <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>{item.description}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default Map;
