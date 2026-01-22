import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Component to auto-center map when items change
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            try {
                if (bounds.length === 1) {
                    map.setView(bounds[0], map.getZoom());
                } else {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } catch (e) {
                console.warn("Map view update failed", e);
            }
        }
    }, [bounds, map]);
    return null;
}

const Map = ({ items = [], hotelLat, hotelLon, startDate, isPremium = false }) => {
    // Fix for default marker icons inside the component
    useEffect(() => {
        if (typeof L !== 'undefined' && L.icon) {
            try {
                const DefaultIcon = L.icon({
                    iconUrl: icon,
                    shadowUrl: iconShadow,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                });
                L.Marker.prototype.options.icon = DefaultIcon;
            } catch (e) {
                console.warn("Leaflet icon setup failed", e);
            }
        }
    }, []);

    // Premium Marker Icon (Airbnb style)
    const getPremiumIcon = (emoji = '📍') => L.divIcon({
        className: 'premium-marker',
        html: `
            <div style="
                background: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 2px solid white;
            ">
                ${emoji}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

    // Red marker for the hotel
    const RedIcon = L.divIcon({
        className: 'custom-hotel-marker',
        html: `
            <div style="
                background-color: #e63946;
                width: ${isPremium ? '36px' : '24px'};
                height: ${isPremium ? '36px' : '24px'};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: rotate(45deg); font-size: ${isPremium ? '18px' : '12px'};">
                    ${isPremium ? '🏨' : ''}
                </div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    // Function to calculate Day X from startDate
    const getDayNumber = (itemDate) => {
        if (!startDate || !itemDate || typeof startDate !== 'string' || typeof itemDate !== 'string') return null;
        try {
            const startPart = startDate.split('T')[0];
            const currentPart = itemDate.split('T')[0];
            if (!startPart || !currentPart) return null;

            const start = new Date(startPart);
            const current = new Date(currentPart);
            if (isNaN(start.getTime()) || isNaN(current.getTime())) return null;

            const diffTime = Math.abs(current - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays + 1;
        } catch (e) {
            console.warn("getDayNumber error", e);
            return null;
        }
    };

    const mapItems = (items || []).filter(i => i && i.latitude && i.longitude);
    const polylinePositions = mapItems.map(i => [i.latitude, i.longitude]);

    // Grouping logic to avoid overlapping
    const groups = {}; // Key: "lat,lon"

    // Add itinerary items to groups
    mapItems.forEach(item => {
        const key = `${item.latitude.toFixed(6)},${item.longitude.toFixed(6)}`;
        if (!groups[key]) {
            groups[key] = {
                lat: item.latitude,
                lon: item.longitude,
                items: [],
                isHotel: false
            };
        }
        groups[key].items.push(item);
    });

    // Add hotel to groups (or mark existing group as hotel)
    if (hotelLat && hotelLon) {
        const hKey = `${hotelLat.toFixed(6)},${hotelLon.toFixed(6)}`;
        if (!groups[hKey]) {
            groups[hKey] = {
                lat: hotelLat,
                lon: hotelLon,
                items: [],
                isHotel: true
            };
        } else {
            groups[hKey].isHotel = true;
        }
    }

    const groupList = Object.values(groups);
    const allPoints = groupList.map(g => [g.lat, g.lon]);
    const bounds = allPoints.length > 0 ? allPoints : [[45, 9]];

    // Tile layers
    const premiumTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const standardTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    // Helper to get emoji for an item
    const getItemEmoji = (item) => {
        let emoji = '📍';
        const type = item.type?.toUpperCase();
        const title = item.title?.toLowerCase() || "";
        const desc = item.description?.toLowerCase() || "";
        const text = `${title} ${desc}`;

        // 1. Flights (Highest priority)
        if (type === 'FLIGHT' || text.includes('volo') || text.includes('aereo')) return '✈️';

        // 2. Food & Drink
        if (type === 'FOOD' || type === 'RESTAURANT' || type === 'BAR' || type === 'CAFE' || type === 'MEAL' ||
            text.includes('ristorante') || text.includes('cena') || text.includes('pranzo') ||
            text.includes('colazione') || text.includes('bistro') || text.includes('sushi') ||
            text.includes('pizza') || text.includes('drink') || text.includes('aperitivo') || text.includes('pub')) {
            return '🍕';
        }

        // 3. Water Activities (Beach, Sea, Boat, Waterpark)
        if (text.includes('crociera') || text.includes('cruise') || text.includes('traghetto') || text.includes('ferry') || text.includes('barca') || text.includes('boat') || text.includes('battello') || text.includes('fiume') || text.includes('river')) {
            return '🚢';
        }
        if (text.includes('spiaggia') || text.includes('beach') || text.includes('mare') || text.includes('lido') || text.includes('sabbia') || text.includes('waterpark') || text.includes('acquapark') || text.includes('aquaventure')) {
            return '🏖️';
        }

        // 4. Culture & Landmarks
        if (text.includes('museo') || text.includes('museum') || text.includes('galleria') || text.includes('mostra') || text.includes('esposizione')) {
            return '🏛️';
        }
        if (text.includes('piazza') || text.includes('monumento') || text.includes('monument') || text.includes('castello') || text.includes('castle') || text.includes('torre') || text.includes('tower') || text.includes('palazzo') || text.includes('duomo') || text.includes('chiesa')) {
            return '🗼';
        }

        // 5. Accommodation (Lower priority for keyword to avoid false positives in desc)
        if (type === 'ACCOMMODATION' || type === 'HOTEL' || type === 'STAY' || type === 'CHECKIN') {
            return '🏨';
        }
        // Only trigger hotel by keyword if it's in the title
        if (title.includes('hotel') || title.includes('alloggio') || title.includes('b&b') || title.includes('resort')) {
            return '🏨';
        }

        // 6. Nature & Parks (Avoid 'park' as it triggers on 'waterpark' which is handled above)
        if (text.includes('natura') || text.includes('bosco') || text.includes('montagna') || text.includes('nature') || title.includes('parco') || (text.includes('park') && !text.includes('water'))) {
            return '🌳';
        }

        // 7. Transport
        if (text.includes('stazione') || text.includes('station') || text.includes('bus') || text.includes('treno') || text.includes('metro') || text.includes('aeroporto')) {
            return '🚆';
        }

        // 8. Generic Activity
        if (type === 'ACTIVITY' || text.includes('tour') || text.includes('visita') || text.includes('escursione')) return '🎡';

        return emoji;
    };

    return (
        <div style={{
            height: '400px',
            width: '100%',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: isPremium ? '0 20px 40px rgba(0,0,0,0.1)' : 'var(--shadow-md)',
            marginBottom: '2rem',
            border: isPremium ? '1px solid #eee' : '1px solid #e0e0e0'
        }}>
            <MapContainer
                center={bounds[0]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    key={isPremium ? 'premium' : 'standard'}
                    url={isPremium ? premiumTileUrl : standardTileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <ChangeView bounds={bounds} />

                {groupList.map((group, gIdx) => {
                    const sortedItems = [...group.items].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

                    // Icon logic
                    let iconToUse;
                    if (group.isHotel) {
                        iconToUse = RedIcon;
                    } else if (isPremium) {
                        const firstEmoji = getItemEmoji(sortedItems[0]);
                        iconToUse = getPremiumIcon(firstEmoji);
                    }

                    return (
                        <Marker key={gIdx} position={[group.lat, group.lon]} icon={iconToUse}>
                            <Popup>
                                <div style={{
                                    maxWidth: '250px',
                                    maxHeight: '350px',
                                    overflowY: 'auto',
                                    paddingRight: '10px',
                                    scrollbarWidth: 'thin'
                                }}>
                                    {group.isHotel && (
                                        <div style={{ marginBottom: sortedItems.length > 0 ? '8px' : '0', borderBottom: sortedItems.length > 0 ? '1px solid #eee' : 'none', paddingBottom: sortedItems.length > 0 ? '8px' : '0' }}>
                                            <strong>🏨 Il Tuo Hotel</strong>
                                        </div>
                                    )}
                                    {sortedItems.map((item, iIdx) => {
                                        const dayNum = getDayNumber(item.start_time);
                                        const time = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={iIdx} style={{ marginBottom: iIdx === sortedItems.length - 1 ? 0 : '10px' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--primary-blue)', fontSize: '0.9rem' }}>
                                                    {dayNum ? `Giorno ${dayNum}` : ''} • {time}
                                                </div>
                                                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.title}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>{item.description}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {polylinePositions.length > 1 && (
                    <Polyline
                        positions={polylinePositions}
                        color={isPremium ? "#2563eb" : "var(--primary-blue)"}
                        weight={isPremium ? 2 : 3}
                        opacity={0.6}
                        dashArray={isPremium ? "5, 10" : "10, 10"}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default Map;
