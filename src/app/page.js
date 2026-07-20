"use client";

import { useState, useEffect } from 'react';
import { MapPin, Users, Navigation2, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../../hooks/useAppStore';

// Dynamically import Globe to avoid SSR issues with canvas/window
const GlobeTracker = dynamic(() => import('../../components/GlobeTracker'), { ssr: false });

export default function DashboardPage() {
  const { data, isLoaded } = useAppStore();
  const [aiInsight, setAiInsight] = useState("Analyzing movement patterns...");

  // Simulate AI analysis whenever data changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const movingCount = data.homeless.filter(h => h.status !== 'Idle').length;
    const claimedCount = data.homeless.filter(h => h.status === 'Recently Claimed Food').length;
    
    setTimeout(() => {
      if (claimedCount > 0) {
        setAiInsight(`AI Insight: Detected ${claimedCount} successful food claims recently. Significant movement towards Downtown stations. Recommend increasing supply at Spinneys.`);
      } else if (movingCount > 0) {
        setAiInsight(`AI Insight: ${movingCount} individuals are currently mobile. Expected demand at Jumeirah Beach Hotel station in 30 mins.`);
      } else {
        setAiInsight("AI Insight: Population is currently stable. Surplus food levels are adequate across all stations.");
      }
    }, 1000);

  }, [data, isLoaded]);

  if (!isLoaded) return <div className="container">Loading WorldMonitor...</div>;

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      <header style={{ textAlign: 'left', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>WorldMonitor: Dubai AI Week</h1>
          <p className="subtitle">Real-time 3D tracking of homeless movements and food stations</p>
        </div>
        <div style={{ background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary)' }}></div>
          Live Sync Active
        </div>
      </header>

      {/* AI Insight Bar */}
      <div className="glass-panel" style={{ marginBottom: '2rem', borderColor: 'rgba(59, 130, 246, 0.3)', background: 'linear-gradient(90deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60A5FA', marginBottom: '0.5rem' }}>
          <Activity size={18} /> Gemini AI Analysis
        </h3>
        <p>{aiInsight}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* 3D Globe View */}
        <section className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <GlobeTracker 
            homeless={data.homeless}
            stations={data.foodStations}
            movements={data.movements || []}
          />
        </section>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section className="glass-panel">
            <h2><MapPin className="inline-block mr-2" style={{ color: 'var(--accent-edible)' }} size={24} /> Food Stations</h2>
            <div className="result-list" style={{ marginTop: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {data.foodStations.map(station => (
                <div key={station.id} className="result-item" style={{ padding: '0.75rem' }}>
                  <div className="item-header">
                    <span className="item-title" style={{ fontSize: '0.9rem' }}>{station.name}</span>
                  </div>
                  <div className="item-details" style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--primary)' }}>Surplus: {station.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel" style={{ flexGrow: 1 }}>
            <h2><Users className="inline-block mr-2 text-primary" size={24} /> Activity Feed</h2>
            <div className="result-list" style={{ marginTop: '1.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {data.homeless.map(person => (
                <div key={person.id} className="result-item" style={{ padding: '0.75rem', borderLeft: `3px solid ${person.status === 'Recently Claimed Food' ? 'var(--primary)' : 'transparent'}` }}>
                  <div className="item-header">
                    <span className="item-title" style={{ fontSize: '0.9rem' }}>{person.name}</span>
                  </div>
                  <div className="item-details" style={{ fontSize: '0.8rem' }}>
                    <span>{person.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
