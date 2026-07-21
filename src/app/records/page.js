"use client";

import { useState, useEffect } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { Globe2, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Helper: Typewriter Hook
function useTypewriter(text, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    if (!text) return;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

function Typewriter({ text }) {
  const typed = useTypewriter(text, 20);
  if (!text) return null;
  return <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: 6, fontWeight: '500' }}>{typed}{typed.length < text.length ? '_' : ''}</div>;
}

export default function RecordsPage() {
  const { records, isLoaded, clearRecords } = useAppStore();

  if (!isLoaded) return null;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="top-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={20} color="var(--primary)" />
          <div style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '16px', color: 'var(--text-main)' }}>FOODBRIDGE</div>
          <Link href="/" style={{ marginLeft: 24, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '500' }}><ArrowLeft size={16}/> Back to Map</Link>
        </div>
      </header>

      <div style={{ padding: '32px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: '600', margin: 0 }}>PROCESSED RECORDS</h2>
          <button onClick={clearRecords} className="btn-primary" style={{ background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5', padding: '8px 16px', display: 'flex', gap: 8 }}><Trash2 size={16}/> Clear All</button>
        </div>
        
        <div className="panel" style={{ height: '700px', overflowY: 'auto', background: 'var(--surface)' }}>
          <table style={{ width: '100%', fontSize: '13px', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--surface-light)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Time</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Source</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Food & Weight</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Classification</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Nutrition / Energy</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Routing Decision</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: '500' }}>{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
                  <td style={{ padding: '16px' }}>
                    <span className="badge" style={{ background: 'var(--surface-light)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                      {r.sourceType}{r.isPredicted ? ' (pred)' : ''}
                    </span>
                    <br/><span style={{color: 'var(--text-main)', fontSize: '12px', display: 'inline-block', marginTop: 6, fontWeight: '500'}}>{r.sourceName}</span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-main)', fontWeight: '500' }}>{r.category}<br/><span style={{color: 'var(--text-muted)', fontWeight: '400'}}>{r.weightKg}kg [{r.condition}]</span></td>
                  <td style={{ padding: '16px' }}>
                    <span className={r.classification === 'edible' ? "badge badge-green" : "badge badge-red"}>{r.classification.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {r.classification === 'edible' ? `${r.nutrition.totalKcal} kcal → ~${r.nutrition.meals} meals` : `~${r.routing.energyEstimate} ${r.routing.energyUnit}`}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', maxWidth: 300 }}>
                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: '500', color: 'var(--text-main)' }}>
                      {r.routing.kind === 'shelter' ? r.routing.allocations.map(a => `${a.districtName}`).join(', ') : `${r.routing.facilityName}`}
                    </div>
                    <Typewriter text={r.classificationReason} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
