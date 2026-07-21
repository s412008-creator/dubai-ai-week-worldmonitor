"use client";

import { useState, useEffect, useMemo } from 'react';
import { Globe2, Crosshair, AlertTriangle, Target, Settings, Maximize, Search, PlusCircle, Trash2, Video, Activity, CheckSquare, Square, Info, Plug, TrendingUp, CloudRain } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../hooks/useAppStore';
import { classify, computeNutritionStatic, routeEdible, routeInedible, predictHotelWaste, getNeighborhoods, uid } from '../utils/triageEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const DeckGLTracker = dynamic(() => import('../components/DeckGLTracker'), { ssr: false });

const HISTORY_SEED = [
  { day: 'Mon', supermarket: 118, restaurant: 54, hotel: 38 },
  { day: 'Tue', supermarket: 132, restaurant: 61, hotel: 42 },
  { day: 'Wed', supermarket: 109, restaurant: 58, hotel: 35 },
  { day: 'Thu', supermarket: 145, restaurant: 66, hotel: 51 },
  { day: 'Fri', supermarket: 160, restaurant: 80, hotel: 74 },
  { day: 'Sat', supermarket: 171, restaurant: 92, hotel: 88 }
];

export default function DashboardPage() {
  const { records, isLoaded, addRecord, clearRecords } = useAppStore();
  const [layers, setLayers] = useState({ 
    routes: true, destinations: true, stations: true, 
    cctv: true, hotspots: true, military: false, pipelines: false 
  });
  const [showIntake, setShowIntake] = useState(false);
  const [formData, setFormData] = useState({ sourceType: 'supermarket', sourceName: '', neighborhood: 'centrum', category: 'bakery', weightKg: 10, condition: 'fresh' });
  const [apiKey, setApiKey] = useState('');
  
  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  // DeckGL data preparation
  const deckData = { movements: [], homeless: [], stations: [] };
  let kpiStats = { records: 0, weightKg: 0, meals: 0, energy: 0 };
  
  if (isLoaded) {
    kpiStats.records = records.length;
    records.forEach(r => {
      kpiStats.weightKg += r.weightKg || 0;
      if (r.classification === 'edible' && r.nutrition) kpiStats.meals += r.nutrition.meals || 0;
      if (r.classification === 'inedible' && r.routing) kpiStats.energy += r.routing.energyEstimate || 0;

      const nbhd = getNeighborhoods().find(n => n.id === r.neighborhood);
      if (!nbhd) return;
      const startLat = nbhd.lat + (Math.random() - 0.5) * 0.005;
      const startLng = nbhd.lon + (Math.random() - 0.5) * 0.005;
      
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

  // Chart data preparation
  const chartData = useMemo(() => {
    const todayTotals = { supermarket: 0, restaurant: 0, hotel: 0 };
    records.forEach(r => {
      if (todayTotals[r.sourceType] !== undefined) {
        todayTotals[r.sourceType] += r.weightKg;
      }
    });

    const data = [...HISTORY_SEED];
    data.push({
      day: 'Today',
      supermarket: Math.round(todayTotals.supermarket),
      restaurant: Math.round(todayTotals.restaurant),
      hotel: Math.round(todayTotals.hotel)
    });

    // Forecast logic (avg of last 3 days * weather factor)
    const weatherFactor = 1.1; // Simulated warm weather (+10%)
    const last3 = data.slice(-3);
    const avg = (key) => last3.reduce((sum, d) => sum + d[key], 0) / 3;
    
    data.push({
      day: 'Tomorrow',
      supermarket: Math.round(avg('supermarket') * weatherFactor),
      restaurant: Math.round(avg('restaurant') * weatherFactor),
      hotel: Math.round(avg('hotel') * weatherFactor)
    });

    return data;
  }, [records]);

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    await processAndAddRecord(formData.sourceType, formData.sourceName || 'Unknown', formData.neighborhood, formData.category, Number(formData.weightKg), formData.condition);
    setShowIntake(false);
  };

  const handlePmsConnect = async (pmsType) => {
    const pmsData = {
      waterfront: { name: 'Hotel Amstel Waterfront', nbhd: 'centrum', rooms: 220, occ: 82, brk: true, rest: true, banq: true, guests: 60 },
      business: { name: 'Hotel Zuidplein Business', nbhd: 'zuid', rooms: 150, occ: 68, brk: true, rest: false, banq: false, guests: 0 },
      view: { name: 'Hotel Oost Canal View', nbhd: 'oost', rooms: 90, occ: 75, brk: true, rest: true, banq: false, guests: 0 }
    }[pmsType];

    const pred = predictHotelWaste(pmsData.rooms, pmsData.occ, pmsData.brk, pmsData.rest, pmsData.banq, pmsData.guests);
    const baseTs = new Date().toISOString();
    
    if (pred.edibleKg > 0) {
      const r = {
        id: uid(), sourceType: 'hotel', sourceName: pmsData.name, neighborhood: pmsData.nbhd,
        category: 'mixed_hotel_surplus', weightKg: pred.edibleKg, condition: 'predicted',
        timestamp: baseTs, isPredicted: true, classification: 'edible',
        classificationReason: `Predicted edible portion from occupancy model (${Math.round(pmsData.occ)}% occ).`
      };
      r.nutrition = computeNutritionStatic(r.weightKg, r.category);
      r.routing = { kind: 'shelter', allocations: routeEdible(r.neighborhood, r.nutrition.meals) };
      addRecord(r);
      await fetchAIRationale(r);
    }
    if (pred.inedibleKg > 0) {
      const r = {
        id: uid(), sourceType: 'hotel', sourceName: pmsData.name, neighborhood: pmsData.nbhd,
        category: 'mixed_hotel_surplus', weightKg: pred.inedibleKg, condition: 'predicted',
        timestamp: baseTs, isPredicted: true, classification: 'inedible',
        classificationReason: `Predicted inedible/prep-scrap from occupancy model.`
      };
      r.routing = { kind: 'facility', ...routeInedible(r.neighborhood, r.category, r.weightKg) };
      addRecord(r);
      await fetchAIRationale(r);
    }
    setShowIntake(false);
  };

  const processAndAddRecord = async (sourceType, sourceName, neighborhood, category, weightKg, condition) => {
    const r = { id: uid(), sourceType, sourceName, neighborhood, category, weightKg, condition, timestamp: new Date().toISOString(), isPredicted: false };
    const cls = classify(condition);
    r.classification = cls.classification;
    r.classificationReason = cls.reason;

    if (r.classification === 'edible') {
      r.nutrition = computeNutritionStatic(r.weightKg, r.category);
      r.routing = { kind: 'shelter', allocations: routeEdible(r.neighborhood, r.nutrition.meals) };
    } else {
      r.routing = { kind: 'facility', ...routeInedible(r.neighborhood, r.category, r.weightKg) };
    }
    addRecord(r);
    await fetchAIRationale(r);
  };

  const fetchAIRationale = async (record) => {
    if (!apiKey) return;
    try {
      const res = await fetch('/api/ai-reasoning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record, apiKey }) });
      const data = await res.json();
      if (data.rationale) alert(`Claude AI Reason for ${record.sourceName}:\n${data.rationale}`);
    } catch(e) { console.error("AI Error:", e); }
  };

  if (!isLoaded) return <div style={{ padding: '2rem', color: '#fff', background: '#000', height: '100vh' }}>INITIALIZING ENGINE...</div>;

  return (
    <div className="dashboard-layout">
      {/* Top Navbar */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={16} color="#10B981" />
          <div style={{ display: 'flex', gap: '4px' }}>{[1,2,3,4].map(i => <div key={i} style={{width: 8, height: 8, background: i===1?'#10B981':'#333'}} />)}</div>
          <div style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>MONITOR</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>FoodBridge Engine Active</span>
          
          <button style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid #10B981', padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '1rem' }}>
            <Target size={12}/> AMSTERDAM TRIAGE
          </button>
          
          <button className="animate-pulse-red" style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold' }}>
            CRISIS LEVEL 5
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '10px', color: 'var(--text-muted)' }}>
          <input type="password" placeholder="Claude API Key (Option)" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ background: '#111', border: '1px solid #333', color: '#fff', padding: '4px', width: '120px' }} />
        </div>
      </header>

      {/* Main Workspace (Map + Overlays) */}
      <div className="main-workspace">
        <div className="map-container">
          <DeckGLTracker 
            homeless={deckData.homeless}
            stations={deckData.stations}
            movements={deckData.movements}
            layersActive={layers}
          />
          <div className="scanline-overlay"></div>
        </div>

        {/* Floating KPI Stats (Top Right) */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
          <KpiBox label="RECORDS PROCESSED" value={kpiStats.records} color="#10B981" />
          <KpiBox label="KG SURPLUS TRACKED" value={kpiStats.weightKg.toFixed(1)} color="#3B82F6" />
          <KpiBox label="MEALS REDISTRIBUTABLE" value={kpiStats.meals.toFixed(1)} color="#10B981" />
          <KpiBox label="KWH ENERGY (EST.)" value={kpiStats.energy.toFixed(0)} color="#F59E0B" />
        </div>

        {/* Left Layer Panel - Fixed bottom position to avoid overlapping the bottom grid */}
        <div className="panel" style={{ position: 'absolute', top: '1rem', left: '1rem', width: '260px', bottom: '270px', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header"><span>LAYERS</span><span>▼</span></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LayerToggle active={layers.hotspots} onClick={() => toggleLayer('hotspots')} icon={<AlertTriangle size={14} color="#EF4444"/>} label="High Need Hotspots" />
            <LayerToggle active={layers.cctv} onClick={() => toggleLayer('cctv')} icon={<Video size={14} color="#3B82F6"/>} label="CCTV Network" />
            <LayerToggle active={layers.stations} onClick={() => toggleLayer('stations')} icon={<Globe2 size={14} color="#10B981"/>} label="Food Sources" />
            <LayerToggle active={layers.destinations} onClick={() => toggleLayer('destinations')} icon={<Target size={14} color="#10B981"/>} label="Shelters" />
            <LayerToggle active={layers.routes} onClick={() => toggleLayer('routes')} icon={<Activity size={14} color="#F59E0B"/>} label="Active Routes" />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
            <button className="btn-primary" style={{ width: '100%', padding: '8px' }} onClick={() => setShowIntake(!showIntake)}>
              <PlusCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
              + NEW INTAKE
            </button>
          </div>
        </div>

        {/* Floating Intake Modal */}
        {showIntake && (
          <div className="panel" style={{ position: 'absolute', top: '1rem', left: '290px', width: '320px', zIndex: 30 }}>
            <div className="panel-header" style={{ background: '#10B981', color: '#000' }}>
              <span>NEW INTAKE TASK</span>
              <button onClick={() => setShowIntake(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>
            
            {/* Hotel PMS Mock Area */}
            <div style={{ padding: '12px', borderBottom: '1px dashed #333' }}>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>HOTEL PMS PREDICTION (Auto-fill)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button className="btn" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handlePmsConnect('waterfront')}><Plug size={10}/> Waterfront</button>
                <button className="btn" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handlePmsConnect('business')}><Plug size={10}/> Business</button>
                <button className="btn" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handlePmsConnect('view')}><Plug size={10}/> Canal View</button>
              </div>
            </div>

            <form onSubmit={handleIntakeSubmit} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ fontSize: '10px', color: '#888' }}>MANUAL ENTRY (Supermarket/Restaurant)</div>
              <select value={formData.sourceType} onChange={e => setFormData({...formData, sourceType: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="supermarket">Supermarket</option>
                <option value="restaurant">Restaurant</option>
              </select>
              <input type="text" placeholder="Source Name" value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }} />
              <select value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="bakery">Bakery</option>
                <option value="produce">Produce</option>
                <option value="meat">Meat</option>
              </select>
              <input type="number" placeholder="Weight (kg)" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }} />
              <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="fresh">Fresh</option>
                <option value="near_expiry">Near Expiry</option>
                <option value="spoiled">Spoiled</option>
              </select>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '8px' }}>CLASSIFY & ROUTE</button>
            </form>
          </div>
        )}

      </div>

      {/* Bottom Grid Panels: Replaced fake UI with FoodBridge features */}
      <div className="bottom-grid" style={{ gridTemplateColumns: '1.2fr 2fr' }}>
        
        {/* Forecast Chart Panel */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12}/> AI SURPLUS FORECAST</span>
            <span style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><CloudRain size={10}/> Tomorrow: 20°C / +10% factor</span>
          </div>
          <div style={{ flex: 1, padding: '12px', fontSize: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="day" stroke="#888" tick={{fontSize: 10}} />
                <YAxis stroke="#888" tick={{fontSize: 10}} />
                <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333' }} itemStyle={{ fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="supermarket" stackId="a" fill="#3B82F6" name="Supermarket (kg)" />
                <Bar dataKey="restaurant" stackId="a" fill="#8B5CF6" name="Restaurant (kg)" />
                <Bar dataKey="hotel" stackId="a" fill="#D97706" name="Hotel Predicted (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Records Table Panel */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff' }}>PROCESSED RECORDS</span>
            <button onClick={clearRecords} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><Trash2 size={12}/></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', borderBottom: '1px solid #333', background: '#0F0F0F', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>Time</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>Source</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>Food / Weight</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>Classification</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>Nutrition / Energy</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>Routing / Facility</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '8px 12px', color: '#666' }}>{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge badge-${r.sourceType==='supermarket'?'blue':r.sourceType==='restaurant'?'purple':'orange'}`} style={{background: r.sourceType==='supermarket'?'#1E3A8A':r.sourceType==='restaurant'?'#4C1D95':'#78350F', padding:'2px 4px', marginRight:'4px', border:'none', color:'#fff'}}>
                        {r.sourceType}{r.isPredicted ? ' (pred)' : ''}
                      </span>
                      <br/><span style={{color: '#ccc', fontSize: '10px'}}>{r.sourceName}</span>
                    </td>
                    <td style={{ padding: '8px' }}>{r.category}<br/><span style={{color: '#888'}}>{r.weightKg} kg · {r.condition}</span></td>
                    <td style={{ padding: '8px' }}>
                      <span className={r.classification === 'edible' ? "badge badge-green" : "badge badge-red"}>{r.classification.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '8px', color: '#aaa', fontSize: '10px' }}>
                      {r.classification === 'edible' ? `${r.nutrition.totalKcal} kcal -> ~${r.nutrition.meals} meals` : `~${r.routing.energyEstimate} ${r.routing.energyUnit}`}
                    </td>
                    <td style={{ padding: '8px', color: '#aaa', fontSize: '10px' }}>
                      {r.routing.kind === 'shelter' ? 
                        r.routing.allocations.map(a => `${a.districtName} (${a.distanceKm}km) - ${a.mealsRouted} meals`).join(', ') : 
                        `${r.routing.facilityName} (${r.routing.distanceKm}km)`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(10,10,10,0.85)', border: `1px solid #333`, borderTop: `2px solid ${color}`, padding: '8px 12px', minWidth: '120px', backdropFilter: 'blur(4px)' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: color }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function LayerToggle({ active, onClick, icon, label }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} onClick={onClick}>
      <div style={{ marginRight: '8px' }}>{active ? <CheckSquare size={14} color="#10B981" /> : <Square size={14} color="#555" />}</div>
      <div style={{ marginRight: '8px' }}>{icon}</div>
      <div style={{ flex: 1, fontSize: '11px' }}>{label}</div>
      <Info size={12} color="#555" />
    </div>
  );
}
