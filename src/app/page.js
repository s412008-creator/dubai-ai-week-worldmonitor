"use client";

import { useState, useEffect } from 'react';
import { Shield, Crosshair, AlertTriangle, Battery, Navigation, Globe2, Target, Menu, Settings, Maximize, Search, PlusCircle, Trash2, Cpu } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../hooks/useAppStore';
import { classify, computeNutritionStatic, routeEdible, routeInedible, predictHotelWaste, uid, getNeighborhoods } from '../utils/triageEngine';

const DeckGLTracker = dynamic(() => import('../components/DeckGLTracker'), { ssr: false });

export default function DashboardPage() {
  const { records, isLoaded, addRecord, clearRecords } = useAppStore();
  const [layers, setLayers] = useState({ routes: true, heatmap: false, stations: true });
  const [formData, setFormData] = useState({ sourceType: 'supermarket', sourceName: '', neighborhood: 'centrum', category: 'bakery', weightKg: 10, condition: 'fresh' });
  const [apiKey, setApiKey] = useState('');
  
  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  // Convert records to DeckGL data format
  const deckData = { movements: [], homeless: [], stations: [] };
  if (isLoaded) {
    records.forEach(r => {
      const nbhd = getNeighborhoods().find(n => n.id === r.neighborhood);
      if (!nbhd) return;
      const startLat = nbhd.lat + (Math.random() - 0.5) * 0.005;
      const startLng = nbhd.lon + (Math.random() - 0.5) * 0.005;
      
      // Source node
      deckData.stations.push({ lat: startLat, lng: startLng, name: r.sourceName });

      if (r.routing.kind === 'shelter') {
        r.routing.allocations.forEach(a => {
          deckData.movements.push({ startLat, startLng, endLat: a.lat, endLng: a.lon, color: [42, 138, 82, 200] });
          deckData.homeless.push({ lat: a.lat, lng: a.lon, name: a.districtName, status: 'Idle' });
        });
      } else {
        deckData.movements.push({ startLat, startLng, endLat: r.routing.lat, endLng: r.routing.lon, color: [201, 75, 63, 200] });
      }
    });
  }

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    const r = {
      id: uid(), sourceType: formData.sourceType, sourceName: formData.sourceName || 'Unknown Source', neighborhood: formData.neighborhood,
      category: formData.category, weightKg: Number(formData.weightKg), condition: formData.condition,
      timestamp: new Date().toISOString(), isPredicted: false
    };
    const cls = classify(r.condition);
    r.classification = cls.classification;
    r.classificationReason = cls.reason;

    if (r.classification === 'edible') {
      r.nutrition = computeNutritionStatic(r.weightKg, r.category);
      r.routing = { kind: 'shelter', allocations: routeEdible(r.neighborhood, r.nutrition.meals) };
    } else {
      r.routing = { kind: 'facility', ...routeInedible(r.neighborhood, r.category, r.weightKg) };
    }

    addRecord(r);

    if (apiKey) {
      try {
        const res = await fetch('/api/ai-reasoning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: r, apiKey })
        });
        const data = await res.json();
        if (data.rationale) alert("Claude AI Reason: " + data.rationale);
      } catch(e) {
        console.error("AI Error:", e);
      }
    }
  };

  if (!isLoaded) return <div style={{ padding: '2rem', color: '#fff', background: '#000', height: '100vh' }}>INITIALIZING ENGINE...</div>;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe2 size={18} color="#10B981" />
            <div style={{ fontWeight: 'bold', letterSpacing: '3px', fontSize: '1.1rem' }}>CARE MONITOR</div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v3.0.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AMSTERDAM</div>
          <input type="password" placeholder="Claude API Key (Optional)" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }} />
        </div>
      </header>

      <div className="main-content">
        {/* Map Area */}
        <div className="map-area">
          <DeckGLTracker 
            homeless={deckData.homeless}
            stations={deckData.stations}
            movements={deckData.movements}
            showHeatmap={layers.heatmap}
            showStations={layers.stations}
            showMovements={layers.routes}
          />
        </div>

        {/* Left Floating Panel: Intake Form */}
        <div className="floating-controls" style={{ width: '320px', top: '1rem', left: '1rem', background: 'rgba(10,10,10,0.95)', border: '1px solid #333' }}>
          <div style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={16} color="var(--primary)" /> 新增調度紀錄 (Intake)
          </div>
          <form onSubmit={handleIntakeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888' }}>來源類型</label>
              <select value={formData.sourceType} onChange={e => setFormData({...formData, sourceType: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }}>
                <option value="supermarket">超市 (Supermarket)</option>
                <option value="restaurant">餐廳 (Restaurant)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888' }}>來源名稱</label>
              <input type="text" value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888' }}>行政區</label>
              <select value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }}>
                {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: '#888' }}>食物分類</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }}>
                  <option value="bakery">麵包 (Bakery)</option>
                  <option value="produce">生鮮 (Produce)</option>
                  <option value="meat">肉類 (Meat)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: '#888' }}>重量 (kg)</label>
                <input type="number" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#888' }}>狀態 (Condition)</label>
              <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '4px' }}>
                <option value="fresh">新鮮 (Fresh)</option>
                <option value="near_expiry">即期 (Near Expiry)</option>
                <option value="spoiled">壞掉 (Spoiled)</option>
              </select>
            </div>
            <button type="submit" style={{ background: 'var(--primary)', color: '#000', fontWeight: 'bold', padding: '6px', border: 'none', borderRadius: '4px', marginTop: '0.5rem', cursor: 'pointer' }}>新增調度與 AI 分配</button>
          </form>

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={layers.routes} onChange={() => toggleLayer('routes')} style={{ accentColor: 'var(--primary)' }} />
                <span>顯示決策路徑 (Routing)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <input type="checkbox" checked={layers.heatmap} onChange={() => toggleLayer('heatmap')} style={{ accentColor: 'var(--primary)' }} />
                <span>顯示需求熱點 (Heatmap)</span>
              </label>
          </div>
        </div>
      </div>

      {/* Bottom Dashboard Panels */}
      <div className="bottom-dashboard" style={{ gridTemplateColumns: '1fr' }}>
        <div className="dashboard-panel" style={{ height: '300px', overflowY: 'auto' }}>
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              即時調度歷史紀錄 ({records.length})
            </div>
            <button onClick={clearRecords} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><Trash2 size={14}/></button>
          </div>
          <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '8px' }}>來源</th>
                <th>區域</th>
                <th>分類</th>
                <th>AI 決策</th>
                <th>分配目標</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px' }}>{r.sourceName} <span style={{color:'#666'}}>[{r.sourceType}]</span></td>
                  <td>{getNeighborhoods().find(n=>n.id===r.neighborhood)?.name}</td>
                  <td>{r.weightKg}kg {r.category} ({r.condition})</td>
                  <td>
                    <span style={{ background: r.classification === 'edible' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: r.classification === 'edible' ? '#10B981' : '#EF4444', padding: '2px 6px', borderRadius: '4px' }}>
                      {r.classification.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {r.routing.kind === 'shelter' ? 
                      r.routing.allocations.map(a => `${a.districtName} (${a.mealsRouted} meals)`).join(', ') : 
                      `${r.routing.facilityName} (${r.routing.energyEstimate} ${r.routing.energyUnit})`
                    }
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
