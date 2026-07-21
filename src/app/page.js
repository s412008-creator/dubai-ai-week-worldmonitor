"use client";

import { useState, useEffect } from 'react';
import { Globe2, Target, BarChart2, List } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAppStore } from '../hooks/useAppStore';
import { getNeighborhoods, uid } from '../utils/triageEngine';

const DeckGLTracker = dynamic(() => import('../components/DeckGLTracker'), { ssr: false });

export default function DashboardPage() {
  const { records, isLoaded, addRecord } = useAppStore();
  const [layers, setLayers] = useState({ routes: true, destinations: true, stations: true });
  const [showIntake, setShowIntake] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const int = setInterval(() => {
      const d = new Date();
      setTimeStr(`${d.toUTCString().replace('GMT', 'UTC')}`);
    }, 1000);
    return () => clearInterval(int);
  }, []);
  
  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // DeckGL data preparation
  const deckData = { movements: [], homeless: [], stations: [] };
  
  if (isLoaded) {
    records.forEach(r => {
      const nbhd = getNeighborhoods().find(n => n.id === r.neighborhood) || getNeighborhoods()[0];
      const startLat = nbhd.lat + (Math.random() - 0.5) * 0.08;
      const startLng = nbhd.lon + (Math.random() - 0.5) * 0.08;
      
      deckData.stations.push({ lat: startLat, lng: startLng, name: r.sourceName });
      if (r.routing.kind === 'shelter') {
        r.routing.allocations.forEach(a => {
          deckData.movements.push({ startLat, startLng, endLat: a.lat, endLng: a.lon, color: [16, 185, 129, 200] });
          deckData.homeless.push({ lat: a.lat, lng: a.lon, name: a.districtName });
        });
      } else {
        deckData.movements.push({ startLat, startLng, endLat: r.routing.lat, endLng: r.routing.lon, color: [239, 68, 68, 200] });
      }
    });
  }

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!foodInput) return;
    setIsProcessing(true);
    
    try {
      const mockDataPayload = {
        shelters: [
          { name: "Centrum Shelter A", location: "Amsterdam Centrum", currentPopulation: 120, capacity: 150 },
          { name: "Zuid Relief Center", location: "Amsterdam-Zuid", currentPopulation: 85, capacity: 100 }
        ],
        powerPlants: [ { name: "AEB Amsterdam (Waste-to-Energy)" } ],
        farms: [ { name: "Orgaworld Greenmills (Anaerobic Digestion)" } ]
      };
      
      const res = await fetch('/api/analyze', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ foodInput, mockData: mockDataPayload, apiKey }) 
      });
      const data = await res.json();
      
      if (data.edible) {
        data.edible.forEach(item => {
          addRecord({
            id: uid(), sourceType: 'manual', sourceName: 'Manual Entry', neighborhood: 'centrum',
            category: item.item, weightKg: item.calories / 1000, condition: 'fresh', timestamp: new Date().toISOString(),
            isPredicted: false, classification: 'edible', classificationReason: item.reason,
            nutrition: { totalKcal: item.calories, meals: Math.round(item.calories / 700) },
            routing: { kind: 'shelter', allocations: [{ districtName: item.destination, lat: 52.37, lon: 4.89 }] }
          });
        });
      }
      
      if (data.inedible) {
        data.inedible.forEach(item => {
          addRecord({
            id: uid(), sourceType: 'manual', sourceName: 'Manual Entry', neighborhood: 'centrum',
            category: item.item, weightKg: 10, condition: 'spoiled', timestamp: new Date().toISOString(),
            isPredicted: false, classification: 'inedible', classificationReason: item.reason,
            routing: { kind: 'facility', facilityName: item.destination, lat: 52.39, lon: 4.85, energyEstimate: 50, energyUnit: 'kWh' }
          });
        });
      }
    } catch(e) {
      console.error(e);
    }
    
    setFoodInput('');
    setIsProcessing(false);
    setShowIntake(false);
  };

  if (!isLoaded) return null;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="top-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={16} color="#10B981" />
          <div className="glitch-text" data-text="FOODBRIDGE" style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>FOODBRIDGE</div>
          
          <div style={{ display: 'flex', gap: '20px', marginLeft: '2rem' }}>
            <Link href="/" style={{ color: '#10B981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}><Target size={14}/> LIVE MAP</Link>
            <Link href="/analytics" style={{ color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart2 size={14}/> ANALYTICS</Link>
            <Link href="/records" style={{ color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><List size={14}/> RECORDS</Link>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '12px', color: '#888' }}>
          {timeStr}
          <button className="btn-primary" onClick={() => setShowIntake(true)} style={{ padding: '6px 16px' }}>+ NEW INTAKE</button>
          <button className="btn" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>LOGOUT</button>
        </div>
      </header>

      <div className="main-workspace" style={{ flex: 1, position: 'relative' }}>
        <div className="map-container">
          <DeckGLTracker homeless={deckData.homeless} stations={deckData.stations} movements={deckData.movements} layersActive={layers} />
        </div>

        {/* Floating Layer Toggles */}
        <div className="panel" style={{ position: 'absolute', bottom: '2rem', left: '2rem', width: '220px', zIndex: 20 }}>
          <div className="panel-header"><span>MAP LAYERS</span></div>
          <div style={{ padding: '8px' }}>
            <LayerToggle active={layers.stations} onClick={() => toggleLayer('stations')} label="Food Sources" />
            <LayerToggle active={layers.destinations} onClick={() => toggleLayer('destinations')} label="Shelters & Facilities" />
            <LayerToggle active={layers.routes} onClick={() => toggleLayer('routes')} label="Active Routes" />
          </div>
        </div>

        {/* AI Intake Modal */}
        {showIntake && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="panel" style={{ width: '500px' }}>
              <div className="panel-header" style={{ background: '#10B981', color: '#000' }}>
                <span>AI INTAKE ANALYSIS</span>
                <button className="btn" onClick={() => setShowIntake(false)} style={{ color: '#000' }}>X</button>
              </div>
              <form onSubmit={handleIntakeSubmit} style={{ padding: '20px' }}>
                <p style={{ color: '#ccc', marginBottom: '16px', fontSize: '12px', lineHeight: '1.5' }}>
                  Describe the surplus food items. The Gemini AI will automatically classify them as edible or inedible, calculate macronutrients, and route them to the optimal shelter or waste-to-energy facility.
                </p>
                <textarea 
                  value={foodInput}
                  onChange={e => setFoodInput(e.target.value)}
                  placeholder="e.g. 50 boxes of near-expiry milk, 12 trays of leftover rice and chicken from the banquet..."
                  style={{ width: '100%', height: '120px', background: '#111', color: '#fff', border: '1px solid #333', padding: '12px', marginBottom: '16px', fontFamily: 'monospace' }}
                />
                <input
                  type="password"
                  placeholder="Gemini API Key (Required for AI Analysis)"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '10px', marginBottom: '16px' }}
                />
                <button type="submit" disabled={isProcessing} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                  {isProcessing ? 'ANALYZING VIA GEMINI AI...' : 'ANALYZE & ROUTE'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LayerToggle({ active, onClick, label }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} onClick={onClick} style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
      <div style={{ marginRight: '12px' }}>{active ? <span className="led led-green"/> : <span className="led led-red"/>}</div>
      <div style={{ flex: 1, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
