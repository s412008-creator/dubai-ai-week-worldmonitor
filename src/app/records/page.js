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
  return <div style={{ fontSize: '10px', color: '#10B981', marginTop: 4, fontFamily: 'monospace' }}>{'>'} {typed}{typed.length < text.length ? '_' : ''}</div>;
}

export default function RecordsPage() {
  const { records, isLoaded, clearRecords } = useAppStore();

  if (!isLoaded) return null;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="top-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={16} color="#10B981" />
          <div className="glitch-text" data-text="FOODBRIDGE MONITOR" style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>FOODBRIDGE MONITOR</div>
          <Link href="/" style={{ marginLeft: 20, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}><ArrowLeft size={14}/> Back to Map</Link>
        </div>
      </header>

      <div style={{ padding: '2rem', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: '#fff' }}>PROCESSED RECORDS</h2>
          <button onClick={clearRecords} className="btn-primary" style={{ background: '#EF4444', color: '#fff', padding: '8px 16px', display: 'flex', gap: 8 }}><Trash2 size={16}/> CLEAR ALL</button>
        </div>
        
        <div className="panel" style={{ height: '700px', overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.5)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>TIME</th>
                <th style={{ padding: '12px', fontWeight: 'normal' }}>SOURCE</th>
                <th style={{ padding: '12px', fontWeight: 'normal' }}>FOOD / WT</th>
                <th style={{ padding: '12px', fontWeight: 'normal' }}>AI CLASS</th>
                <th style={{ padding: '12px', fontWeight: 'normal' }}>NUTRITION</th>
                <th style={{ padding: '12px', fontWeight: 'normal' }}>ROUTING</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 16px', color: '#666', fontFamily: 'monospace' }}>{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${r.sourceType==='supermarket'?'blue':r.sourceType==='restaurant'?'purple':'orange'}`} style={{background: r.sourceType==='supermarket'?'rgba(30,58,138,0.3)':r.sourceType==='restaurant'?'rgba(76,29,149,0.3)':'rgba(120,53,15,0.3)', border: '1px solid currentColor', padding:'4px 8px', marginRight:'4px', color: r.sourceType==='supermarket'?'#60A5FA':r.sourceType==='restaurant'?'#A78BFA':'#FBBF24'}}>
                      {r.sourceType}{r.isPredicted ? ' (pred)' : ''}
                    </span>
                    <br/><span style={{color: '#ccc', fontSize: '11px', display: 'inline-block', marginTop: 4}}>{r.sourceName}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{r.category}<br/><span style={{color: '#888'}}>{r.weightKg}kg [{r.condition}]</span></td>
                  <td style={{ padding: '12px' }}>
                    <span className={r.classification === 'edible' ? "badge badge-green" : "badge badge-red"} style={{ padding: '4px 8px' }}>{r.classification.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#aaa' }}>
                    {r.classification === 'edible' ? `${r.nutrition.totalKcal} kcal -> ~${r.nutrition.meals} meals` : `~${r.routing.energyEstimate} ${r.routing.energyUnit}`}
                  </td>
                  <td style={{ padding: '12px', color: '#aaa', maxWidth: 300 }}>
                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {r.routing.kind === 'shelter' ? r.routing.allocations.map(a => `${a.districtName}`).join(', ') : `${r.routing.facilityName}`}
                    </div>
                    {/* Simplified for Records page, real AI rationale needs full DB, we use the fallback reason for now */}
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
