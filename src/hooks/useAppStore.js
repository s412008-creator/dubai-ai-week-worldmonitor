"use client";

import { useState, useEffect } from 'react';

const initialMockData = {
  "homeless": [
    { "id": "h1", "name": "John D.", "lat": 52.3731, "lng": 4.8922, "status": "Idle", "lastUpdate": "10 mins ago" },
    { "id": "h2", "name": "Anonymous 12", "lat": 52.3600, "lng": 4.8850, "status": "Moving", "lastUpdate": "2 mins ago" },
    { "id": "h3", "name": "Sarah M.", "lat": 52.3650, "lng": 4.9100, "status": "Recently Claimed Food", "lastUpdate": "Just now" }
  ],
  "foodStations": [
    { "id": "s1", "name": "Albert Heijn (Dam Square)", "lat": 52.3734, "lng": 4.8914, "surplus": "15kg", "type": "Supermarket" },
    { "id": "s2", "name": "Waldorf Astoria (Leftovers)", "lat": 52.3644, "lng": 4.8966, "surplus": "30kg", "type": "Hotel" },
    { "id": "s3", "name": "Jumbo (Museumplein)", "lat": 52.3565, "lng": 4.8771, "surplus": "20kg", "type": "Supermarket" }
  ],
  "movements": [
    { "id": "m1", "startLat": 52.3731, "startLng": 4.8922, "endLat": 52.3734, "endLng": 4.8914, "color": "#10B981" },
    { "id": "m2", "startLat": 52.3600, "startLng": 4.8850, "endLat": 52.3644, "endLng": 4.8966, "color": "#3B82F6" }
  ]
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
};

export function useAppStore() {
  const [data, setData] = useState({ homeless: [], foodStations: [], movements: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('amsterdamData');
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      const initData = { ...initialMockData, movements: [] };
      setData(initData);
      localStorage.setItem('amsterdamData', JSON.stringify(initData));
    }
    setIsLoaded(true);

    const handleStorage = (e) => {
      if (e.key === 'amsterdamData' && e.newValue) {
        setData(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const claimFood = (homelessId, stationId) => {
    const station = data.foodStations.find(s => s.id === stationId);
    if (!station) return;

    let newMovement = null;

    const updatedHomeless = data.homeless.map(h => {
      if (h.id === homelessId) {
        newMovement = {
          startLat: h.lat,
          startLng: h.lng,
          endLat: station.lat,
          endLng: station.lng,
          color: '#34D399', // primary color for movement
          name: h.name
        };
        return {
          ...h,
          lat: station.lat,
          lng: station.lng,
          status: 'Recently Claimed Food',
          lastUpdate: 'Just now'
        };
      }
      return h;
    });

    const newData = { 
      ...data, 
      homeless: updatedHomeless,
      movements: newMovement ? [...(data.movements || []), newMovement] : (data.movements || [])
    };
    setData(newData);
    localStorage.setItem('oasisData', JSON.stringify(newData));
  };

  const resetData = () => {
    const initData = { ...initialMockData, movements: [] };
    setData(initData);
    localStorage.setItem('oasisData', JSON.stringify(initData));
  };

  return { data, isLoaded, claimFood, resetData };
}
