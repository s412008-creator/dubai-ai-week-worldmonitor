"use client";

import { useState, useEffect } from 'react';
import initialMockData from '../data/mock.json';

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
