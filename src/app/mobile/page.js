"use client";

import { useState, useEffect } from 'react';
import { MapPin, Navigation, User, Utensils, AlertTriangle } from 'lucide-react';
import { useAppStore, calculateDistance } from '../../../hooks/useAppStore';

export default function MobileApp() {
  const { data, isLoaded, claimFood } = useAppStore();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isLoaded && data.homeless.length > 0) {
      // For demo purposes, we auto-login as the first homeless person
      setCurrentUser(data.homeless[0]);
    }
  }, [isLoaded, data.homeless]);

  if (!isLoaded || !currentUser) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>Loading App...</div>;
  }

  // Calculate distance to all stations and sort them
  const stationsWithDistance = data.foodStations.map(station => {
    return {
      ...station,
      distance: calculateDistance(currentUser.lat, currentUser.lng, station.lat, station.lng)
    };
  }).sort((a, b) => a.distance - b.distance);

  const handleClaim = (stationId) => {
    claimFood(currentUser.id, stationId);
    alert("Food claimed! Your location has been updated.");
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '0 auto', 
      minHeight: '100vh', 
      background: 'var(--background)',
      borderLeft: '1px solid var(--border)',
      borderRight: '1px solid var(--border)',
      position: 'relative'
    }}>
      {/* App Header */}
      <header style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid var(--border)', 
        background: 'rgba(15, 23, 42, 0.9)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <User size={20} className="text-primary" />
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Hello, {currentUser.name}</h2>
        </div>
        <p className="text-muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Navigation size={14} /> 
          Current location: {currentUser.lat.toFixed(4)}, {currentUser.lng.toFixed(4)}
        </p>
      </header>

      {/* App Content */}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Utensils size={18} style={{ color: 'var(--accent-edible)' }} />
          Food Nearby
        </h3>

        <div className="result-list">
          {stationsWithDistance.map(station => (
            <div key={station.id} className="result-item" style={{ background: 'var(--surface)' }}>
              <div className="item-header">
                <span className="item-title" style={{ fontSize: '1rem' }}>{station.name}</span>
              </div>
              
              <div className="item-details" style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--primary)' }}>
                  <MapPin size={14} className="inline mr-1" />
                  {station.distance.toFixed(2)} km away
                </span>
                <span>Available: <strong style={{ color: 'var(--text-main)' }}>{station.quantity}</strong></span>
                <span>Items: {station.surplus.join(', ')}</span>
              </div>

              <button 
                onClick={() => handleClaim(station.id)}
                style={{ 
                  background: 'rgba(59, 130, 246, 0.2)', 
                  color: '#60A5FA',
                  padding: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                Claim & Update Location
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-inedible)', marginBottom: '0.5rem' }}>
            <AlertTriangle size={16} /> Notice
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Claiming food will share your current location with social workers to help provide better support in your area.
          </p>
        </div>
      </div>
    </div>
  );
}
