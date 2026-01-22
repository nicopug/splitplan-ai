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
                width: ${isPremium ? '30px' : '24px'};
                height: ${isPremium ? '30px' : '24px'};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="width: 10px; height: 10px; background: white; border-radius: 50%; transform: rotate(45deg); font-size: 12px; display: flex; align-items: center; justify-content: center;">
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
    let allPoints = [...polylinePositions];
    const hasHotelCoords = hotelLat && hotelLon;
    if (hasHotelCoords) allPoints.push([hotelLat, hotelLon]);
    const bounds = allPoints.length > 0 ? allPoints : [[45, 9]];

    // Airbnb/Premium Tile Layer: CartoDB Positron
    const premiumTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    const standardTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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
                    url={isPremium ? premiumTileUrl : standardTileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <ChangeView bounds={bounds} />

                {hasHotelCoords && (
                    <Marker position={[hotelLat, hotelLon]} icon={RedIcon}>
                        <Popup>
                            <strong>🏨 Il Tuo Hotel</strong><br />
                            Punto di riferimento per il viaggio
                        </Popup>
                    </Marker>
                )}

                {mapItems.map((item, idx) => {
                    const dayNum = getDayNumber(item.start_time);
                    // Determine emoji based on type
                    let emoji = '📍';
                    if (item.type === 'FLIGHT') emoji = '✈️';
                    if (item.type === 'ACTIVITY') emoji = '🎡';
                    if (item.type === 'FOOD') emoji = '🍕';

                    return (
                        <Marker
                            key={idx}
                            position={[item.latitude, item.longitude]}
                            icon={isPremium ? getPremiumIcon(emoji) : undefined}
                        >
                            <Popup>
                                <strong>{item.title} {dayNum ? `(Giorno ${dayNum})` : ''}</strong><br />
                                {item.description}
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
