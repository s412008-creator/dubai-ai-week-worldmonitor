"use client";

import { useState, useEffect } from 'react';
import { MapPin, Users, Activity, Layers, PlaySquare, AlertTriangle, Battery, Navigation, Crosshair } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../hooks/useAppStore';

// Dynamically import Globe to avoid SSR issues with canvas/window
const GlobeTracker = dynamic(() => import('../components/GlobeTracker'), { ssr: false });

export default function DashboardPage() {
  const { data, isLoaded } = useAppStore();
  const [aiInsight, setAiInsight] = useState("Analyzing movement patterns...");
  
  // Floating panel toggles
  const [showHomeless, setShowHomeless] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showMovements, setShowMovements] = useState(true);

  // Simulate AI analysis whenever data changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const movingCount = data.homeless.filter(h => h.status !== 'Idle').length;
    const claimedCount = data.homeless.filter(h => h.status === 'Recently Claimed Food').length;
    
    setTimeout(() => {
      if (claimedCount > 0) {
        setAiInsight(`AI Insight: Detected ${claimedCount} successful food claims recently. Significant movement towards Center stations. Recommend increasing supply at Albert Heijn.`);
      } else if (movingCount > 0) {
        setAiInsight(`AI Insight: ${movingCount} individuals are currently mobile. Expected demand at Museumplein station in 30 mins.`);
      } else {
        setAiInsight("AI Insight: Population is currently stable. Surplus food levels are adequate across all stations.");
      }
    }, 1000);

  }, [data, isLoaded]);

  if (!isLoaded) return <div style={{ padding: '2rem', color: '#fff' }}>INITIALIZING WORLDMONITOR KERNEL...</div>;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
            <span style={{ color: 'var(--primary)' }}>WORLD</span>MONITOR
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v2.10.0 • AMSTERDAM</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary)' }}></div>
            LIVE SYNC
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            UTC {new Date().toISOString().substring(11, 19)}
          </div>
        </div>
      </header>

      {/* Main Content Area (Map + Left Panel) */}
      <div className="main-content">
        {/* Map Area */}
        <div className="map-area">
          <GlobeTracker 
            homeless={showHomeless ? data.homeless : []}
            stations={showStations ? data.foodStations : []}
            movements={showMovements ? (data.movements || []) : []}
          />
        </div>

        {/* Left Floating Controls */}
        <div className="floating-controls">
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>LAYERS</span>
            <Layers size={14} />
          </div>
          
          <label className="control-item">
            <input type="checkbox" checked={showHomeless} onChange={e => setShowHomeless(e.target.checked)} style={{ accentColor: 'var(--accent-blue)' }} />
            <span style={{ color: showHomeless ? '#fff' : 'var(--text-muted)' }}>Homeless Targets</span>
          </label>
          <label className="control-item">
            <input type="checkbox" checked={showStations} onChange={e => setShowStations(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
            <span style={{ color: showStations ? '#fff' : 'var(--text-muted)' }}>Food Stations</span>
          </label>
          <label className="control-item">
            <input type="checkbox" checked={showMovements} onChange={e => setShowMovements(e.target.checked)} style={{ accentColor: 'var(--accent-orange)' }} />
            <span style={{ color: showMovements ? '#fff' : 'var(--text-muted)' }}>Movement Vectors</span>
          </label>
        </div>
      </div>

      {/* Bottom Dashboard Panels */}
      <div className="bottom-dashboard">
        {/* Panel 1: Activity Feed */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <PlaySquare size={16} /> REAL-TIME ACTIVITY <span style={{ color: 'var(--accent-red)' }}>• 93</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.homeless.map(person => (
              <div key={person.id} style={{ padding: '0.75rem', background: 'var(--surface)', borderLeft: `2px solid ${person.status === 'Recently Claimed Food' ? 'var(--primary)' : 'var(--border)'}`, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{person.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{person.lastUpdate}</span>
                </div>
                <div style={{ color: person.status === 'Recently Claimed Food' ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {person.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: AI Insights */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} /> AI DISPATCH INSIGHTS
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem' }}>● 穩定</div>
          </div>
          
          <div className="ai-insight-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'linear-gradient(45deg, #3B82F6, #10B981)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crosshair size={12} color="#fff" />
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Gemini Dispatch AI</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#E2E8F0' }}>
              {aiInsight}
            </p>
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ▶ 生成於 13m 前 • 最新預測 1h 前
            </div>
          </div>
        </div>

        {/* Panel 3: Station Status */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <MapPin size={16} /> STATION STATUS RANKING
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.foodStations.map(station => (
              <div key={station.id} style={{ padding: '0.75rem', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Battery size={16} color={station.surplus.includes('30') ? 'var(--primary)' : 'var(--accent-orange)'} />
                  <span>{station.name}</span>
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                  {station.surplus}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
