import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to auto-center map when items change
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

const Map = ({ items, hotelLocation }) => {
    // Red icon for the hotel
    const RedIcon = L.icon({
        iconUrl: icon,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        className: 'marker-red' // We'll style this via CSS filter
    });

    // Filter items with valid coordinates
    const mapItems = items.filter(i => i.latitude && i.longitude);

    // Initial positions for polyline
    const polylinePositions = mapItems.map(i => [i.latitude, i.longitude]);

    // Bounds calculation including hotel if present
    let allPoints = [...polylinePositions];

    const hotelParsed = hotelLocation ? hotelLocation.split(',').map(Number) : null;
    const hasHotelCoords = hotelParsed && hotelParsed.length === 2 && !isNaN(hotelParsed[0]);

    if (hasHotelCoords) {
        allPoints.push(hotelParsed);
    }

    const bounds = allPoints.length > 0 ? allPoints : [[45, 9]]; // Default to Italy if empty

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', marginBottom: '2rem', border: '1px solid #e0e0e0' }}>
            <style>
                {`
                .marker-red {
                    filter: hue-rotate(120deg) saturate(3) brightness(0.8);
                }
                `}
            </style>
            <MapContainer
                center={bounds[0]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <ChangeView bounds={bounds} />

                {/* Hotel Marker (Red) */}
                {hasHotelCoords && (
                    <Marker position={hotelParsed} icon={RedIcon}>
                        <Popup>
                            <strong>🏨 Il Tuo Hotel</strong><br />
                            Punto di riferimento per il viaggio
                        </Popup>
                    </Marker>
                )}

                {/* Itinerary Markers (Blue) */}
                {mapItems.map((item, idx) => (
                    <Marker key={idx} position={[item.latitude, item.longitude]}>
                        <Popup>
                            <strong>{item.title}</strong><br />
                            {item.description}
                        </Popup>
                    </Marker>
                ))}

                {polylinePositions.length > 1 && (
                    <Polyline positions={polylinePositions} color="var(--primary-blue)" weight={3} opacity={0.6} dashArray="10, 10" />
                )}
            </MapContainer>
        </div>
    );
};

export default Map;
