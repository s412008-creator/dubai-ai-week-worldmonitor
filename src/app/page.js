"use client";

import Link from 'next/link';
import { Map, Smartphone, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';

export default function LandingPage() {
  const { resetData } = useAppStore();

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Oasis AI</h1>
        <p className="subtitle" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Sustainable Food Distribution & Homeless Tracking for Dubai AI Week.
          Bridging the gap between surplus food and those in need.
        </p>
      </header>

      <div className="grid-2" style={{ width: '100%', maxWidth: '800px' }}>
        {/* Dashboard Link */}
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer' }}>
            <Map size={48} className="text-primary" style={{ marginBottom: '1rem' }} />
            <h2>Web Dashboard</h2>
            <p className="text-muted">For government and social workers to track movements and food stations.</p>
          </div>
        </Link>

        {/* Mobile App Link */}
        <Link href="/mobile" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', borderColor: 'var(--accent-edible)' }}>
            <Smartphone size={48} style={{ color: 'var(--accent-edible)', marginBottom: '1rem' }} />
            <h2>Mobile App</h2>
            <p className="text-muted">For homeless individuals to find and claim nearby surplus food.</p>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <button 
          onClick={() => {
            resetData();
            alert("Data reset to initial state!");
          }}
          style={{ background: 'transparent', border: '1px solid var(--border)', width: 'auto' }}
        >
          <RefreshCw size={16} /> Reset Demo Data
        </button>
      </div>
    </div>
  );
}
