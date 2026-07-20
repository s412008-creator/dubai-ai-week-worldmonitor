"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Create custom icons for the map
const createIcon = (color, size = 12) => {
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; box-shadow: 0 0 10px ${color}, 0 0 20px ${color}; border: 1px solid rgba(255,255,255,0.8);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const stationIcon = createIcon("#10B981", 16);
const homelessIcon = createIcon("#F59E0B", 12);
const homelessIdleIcon = createIcon("#94A3B8", 12);

export default function MapTracker({ homeless, stations, movements }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ width: "100%", height: "100%", zIndex: 1 }}>
      <MapContainer 
        center={[52.3676, 4.9041]} 
        zoom={14} 
        style={{ width: "100%", height: "100%", background: "#050505" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {stations.map(station => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]}
            icon={stationIcon}
          >
            <Popup>
              <div style={{ color: '#000', fontWeight: 'bold' }}>{station.name}</div>
              <div style={{ color: '#666' }}>Surplus: {station.surplus}</div>
            </Popup>
          </Marker>
        ))}

        {homeless.map(person => (
          <Marker 
            key={person.id} 
            position={[person.lat, person.lng]}
            icon={person.status === 'Recently Claimed Food' ? homelessIcon : homelessIdleIcon}
          >
            <Popup>
              <div style={{ color: '#000', fontWeight: 'bold' }}>{person.name}</div>
              <div style={{ color: '#666' }}>Status: {person.status}</div>
            </Popup>
          </Marker>
        ))}

        {movements.map(m => (
          <Polyline 
            key={m.id}
            positions={[ [m.startLat, m.startLng], [m.endLat, m.endLng] ]}
            color={m.color}
            weight={3}
            opacity={0.6}
            dashArray="5, 10"
          />
        ))}
      </MapContainer>
    </div>
  );
}
