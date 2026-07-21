"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Globe2, Crosshair, AlertTriangle, Target, Settings, Maximize, Search, PlusCircle, Trash2, Video, Activity, CheckSquare, Square, Info, Plug, TrendingUp, CloudRain, LogOut } from 'lucide-react';
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

// Helper: Randomizer Hook (Matrix effect for numbers)
function useRandomizer(value, isNumber = true) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      setDisplay(isNumber ? (Math.random() * 1000).toFixed(1) : Math.random().toString(36).substring(7));
      if (ticks > 10) {
        clearInterval(interval);
        setDisplay(value);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [value, isNumber]);
  return display;
}

export default function DashboardPage() {
  const { records, isLoaded, addRecord, clearRecords } = useAppStore();
  const [layers, setLayers] = useState({ 
    routes: true, destinations: true, stations: true, 
    cctv: true, hotspots: true, military: true, pipelines: true 
  });
  const [showIntake, setShowIntake] = useState(false);
  const [formData, setFormData] = useState({ sourceType: 'supermarket', sourceName: '', neighborhood: 'centrum', category: 'bakery', weightKg: 10, condition: 'fresh' });
  const [apiKey, setApiKey] = useState('');
  
  // Clocks and Tickers
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const int = setInterval(() => {
      const d = new Date();
      setTimeStr(`${d.toUTCString().replace('GMT', 'UTC')} :: ${d.getMilliseconds().toString().padStart(3, '0')}ms`);
    }, 47);
    return () => clearInterval(int);
  }, []);
  
  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

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

  const chartData = useMemo(() => {
    const todayTotals = { supermarket: 0, restaurant: 0, hotel: 0 };
    records.forEach(r => { if (todayTotals[r.sourceType] !== undefined) todayTotals[r.sourceType] += r.weightKg; });
    const data = [...HISTORY_SEED];
    data.push({ day: 'Today', supermarket: Math.round(todayTotals.supermarket), restaurant: Math.round(todayTotals.restaurant), hotel: Math.round(todayTotals.hotel) });
    const weatherFactor = 1.1; 
    const last3 = data.slice(-3);
    const avg = (key) => last3.reduce((sum, d) => sum + d[key], 0) / 3;
    data.push({ day: 'Tomorrow', supermarket: Math.round(avg('supermarket') * weatherFactor), restaurant: Math.round(avg('restaurant') * weatherFactor), hotel: Math.round(avg('hotel') * weatherFactor) });
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
      fetchAIRationale(r);
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
      fetchAIRationale(r);
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
    fetchAIRationale(r);
  };

  const [aiOutputs, setAiOutputs] = useState({});
  const fetchAIRationale = async (record) => {
    if (!apiKey) return;
    try {
      const res = await fetch('/api/ai-reasoning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record, apiKey }) });
      const data = await res.json();
      if (data.rationale) setAiOutputs(prev => ({...prev, [record.id]: data.rationale}));
    } catch(e) { console.error("AI Error:", e); }
  };

  if (!isLoaded) return null;

  return (
    <div className="dashboard-layout">
      {/* 4. Boot Sequence Overlay */}
      <div className="boot-screen">
        <div>&gt; INITIALIZING MAINFRAME...</div>
        <div>&gt; DECRYPTING SPATIAL DATA...</div>
        <div>&gt; LOAD MODULE 'FOODBRIDGE_TRIAGE'... OK.</div>
        <div style={{ color: '#fff' }}>&gt; ACCESS GRANTED.</div>
      </div>

      <div className="bg-grid"></div>

      {/* 10. Live Data Ticker */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {Array.from({length: 20}).map((_, i) => (
            <span key={i} style={{marginRight: '30px'}}>
              <span className="led led-green" style={{marginRight: 6, animationDelay: `${Math.random()}s`}}></span>
              [STREAM_ID_{Math.random().toString(36).substring(2,6).toUpperCase()}] INTERCEPT: {Math.random()*90}N, {Math.random()*180}E - PKT_SIZE: {Math.floor(Math.random()*1024)}MB
            </span>
          ))}
        </div>
      </div>

      {/* Top Navbar */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={16} color="#10B981" />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1,2,3,4].map(i => <div key={i} className={i===1 ? "led led-green" : "led led-red"} style={{animationDelay: `${i*0.2}s`}} />)}
          </div>
          <div className="glitch-text" data-text="MONITOR" style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>MONITOR</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>FoodBridge Engine Active</span>
          
          <button className="btn">
            <Target size={12} style={{display:'inline', marginRight:4}}/> AMSTERDAM TRIAGE
          </button>
          <button className="animate-pulse-red" style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold', borderRadius: 2 }}>
            CRISIS LEVEL 5
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '10px', color: '#0ea5e9', fontFamily: 'monospace' }}>
          {timeStr}
          <input type="password" placeholder="Claude API Key (Option)" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: '#fff', padding: '4px', width: '120px' }} />
          <button className="btn" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>
            <LogOut size={12} style={{ display: 'inline', marginRight: 4 }} /> LOGOUT
          </button>
        </div>
      </header>

      {/* Main Workspace (Map + Overlays) */}
      <div className="main-workspace" style={{ marginTop: '20px' }}>
        <div className="map-container">
          <DeckGLTracker 
            homeless={deckData.homeless}
            stations={deckData.stations}
            movements={deckData.movements}
            layersActive={layers}
          />
        </div>

        {/* Floating KPI Stats (Top Right) */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
          <KpiBox label="RECORDS PROCESSED" value={kpiStats.records} color="#10B981" />
          <KpiBox label="KG SURPLUS TRACKED" value={kpiStats.weightKg.toFixed(1)} color="#3B82F6" />
          <KpiBox label="MEALS REDISTRIBUTABLE" value={kpiStats.meals.toFixed(1)} color="#10B981" />
          <KpiBox label="KWH ENERGY (EST.)" value={kpiStats.energy.toFixed(0)} color="#F59E0B" />
        </div>

        {/* Left Layer Panel */}
        <div className="panel" style={{ position: 'absolute', top: '1rem', left: '1rem', width: '260px', bottom: '270px', zIndex: 20 }}>
          <Target className="spin-slow" size={16} color="rgba(255,255,255,0.1)" style={{position: 'absolute', top: 4, right: 4}} />
          <div className="panel-header"><span>LAYERS</span><span>▼</span></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LayerToggle active={layers.hotspots} onClick={() => toggleLayer('hotspots')} icon={<AlertTriangle size={14} color="#EF4444"/>} label="High Need Hotspots" />
            <LayerToggle active={layers.cctv} onClick={() => toggleLayer('cctv')} icon={<Video size={14} color="#3B82F6"/>} label="Active Traffic Streams" />
            <LayerToggle active={layers.stations} onClick={() => toggleLayer('stations')} icon={<Globe2 size={14} color="#10B981"/>} label="Food Sources" />
            <LayerToggle active={layers.destinations} onClick={() => toggleLayer('destinations')} icon={<Target size={14} color="#10B981"/>} label="Shelters" />
            <LayerToggle active={layers.routes} onClick={() => toggleLayer('routes')} icon={<Activity size={14} color="#F59E0B"/>} label="Active Routes" />
            <LayerToggle active={layers.pipelines} onClick={() => toggleLayer('pipelines')} icon={<Activity size={14} color="#666"/>} label="Global Arc Connectors" />
            <LayerToggle active={layers.military} onClick={() => toggleLayer('military')} icon={<Crosshair size={14} color="#EAB308"/>} label="Radar Nodes (Pulse)" />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
            <button className="btn-primary" style={{ width: '100%', padding: '8px', display: 'flex', justifyContent: 'center' }} onClick={() => setShowIntake(!showIntake)}>
              <PlusCircle size={14} style={{ marginRight: '4px' }} /> NEW INTAKE
            </button>
          </div>
        </div>

        {/* Floating Intake Modal */}
        {showIntake && (
          <div className="panel" style={{ position: 'absolute', top: '1rem', left: '290px', width: '320px', zIndex: 30 }}>
            <div className="panel-header" style={{ background: '#10B981', color: '#000' }}>
              <span>NEW INTAKE TASK</span>
              <button className="btn" onClick={() => setShowIntake(false)} style={{ border: 'none', color: '#000', padding: 0 }}>X</button>
            </div>
            
            <div style={{ padding: '12px', borderBottom: '1px dashed #333' }}>
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>HOTEL PMS PREDICTION (Auto-fill)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button className="btn" onClick={() => handlePmsConnect('waterfront')}><Plug size={10}/> Waterfront</button>
                <button className="btn" onClick={() => handlePmsConnect('business')}><Plug size={10}/> Business</button>
                <button className="btn" onClick={() => handlePmsConnect('view')}><Plug size={10}/> Canal View</button>
              </div>
            </div>

            <form onSubmit={handleIntakeSubmit} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ fontSize: '10px', color: '#888' }}>MANUAL ENTRY</div>
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
              <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '8px', display: 'flex', justifyContent: 'center' }}>CLASSIFY & ROUTE</button>
            </form>
          </div>
        )}
      </div>

      <div className="bottom-grid" style={{ gridTemplateColumns: '1.2fr 2fr' }}>
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12}/> AI SURPLUS FORECAST</span>
            <span style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><CloudRain size={10}/> Tomorrow: 20°C / +10%</span>
          </div>
          <div style={{ flex: 1, padding: '12px', fontSize: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="day" stroke="#888" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                <YAxis stroke="#888" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #333', backdropFilter: 'blur(4px)' }} itemStyle={{ fontSize: '11px' }} />
                <Legend iconType="rect" wrapperStyle={{ fontSize: '9px' }} />
                <Bar dataKey="supermarket" stackId="a" fill="#3B82F6" name="Supermarket" />
                <Bar dataKey="restaurant" stackId="a" fill="#8B5CF6" name="Restaurant" />
                <Bar dataKey="hotel" stackId="a" fill="#D97706" name="Hotel (Pred)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff' }}>PROCESSED RECORDS</span>
            <button onClick={clearRecords} className="btn" style={{ padding: '2px 4px', color: 'var(--accent-red)' }}><Trash2 size={12}/></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.5)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 12px', fontWeight: 'normal' }}>TIME</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>SOURCE</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>FOOD / WT</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>AI CLASS</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>NUTRITION</th>
                  <th style={{ padding: '8px', fontWeight: 'normal' }}>ROUTING</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.2s' }}>
                    <td style={{ padding: '8px 12px', color: '#666', fontFamily: 'monospace' }}>{new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge badge-${r.sourceType==='supermarket'?'blue':r.sourceType==='restaurant'?'purple':'orange'}`} style={{background: r.sourceType==='supermarket'?'rgba(30,58,138,0.3)':r.sourceType==='restaurant'?'rgba(76,29,149,0.3)':'rgba(120,53,15,0.3)', border: '1px solid currentColor', padding:'2px 4px', marginRight:'4px', color: r.sourceType==='supermarket'?'#60A5FA':r.sourceType==='restaurant'?'#A78BFA':'#FBBF24'}}>
                        {r.sourceType}{r.isPredicted ? ' (pred)' : ''}
                      </span>
                      <br/><span style={{color: '#ccc', fontSize: '9px'}}>{r.sourceName}</span>
                    </td>
                    <td style={{ padding: '8px' }}>{r.category}<br/><span style={{color: '#888'}}>{r.weightKg}kg [{r.condition}]</span></td>
                    <td style={{ padding: '8px' }}>
                      <span className={r.classification === 'edible' ? "badge badge-green" : "badge badge-red"}>{r.classification.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '8px', color: '#aaa' }}>
                      {r.classification === 'edible' ? `${r.nutrition.totalKcal} kcal -> ~${r.nutrition.meals} meals` : `~${r.routing.energyEstimate} ${r.routing.energyUnit}`}
                    </td>
                    <td style={{ padding: '8px', color: '#aaa', maxWidth: 200 }}>
                      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {r.routing.kind === 'shelter' ? r.routing.allocations.map(a => `${a.districtName}`).join(', ') : `${r.routing.facilityName}`}
                      </div>
                      <Typewriter text={aiOutputs[r.id]} />
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
  const animatedVal = useRandomizer(value, true);
  return (
    <div style={{ background: 'rgba(10,10,10,0.5)', border: `1px solid #333`, borderTop: `2px solid ${color}`, padding: '8px 12px', minWidth: '120px', backdropFilter: 'blur(16px)' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: color, fontFamily: 'monospace' }}>{animatedVal}</div>
      <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '1px' }}>{label}</div>
    </div>
  );
}

function LayerToggle({ active, onClick, icon, label }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} onClick={onClick}>
      <div style={{ marginRight: '8px' }}>{active ? <span className="led led-green"/> : <span className="led led-red"/>}</div>
      <div style={{ marginRight: '8px' }}>{icon}</div>
      <div style={{ flex: 1, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}

function Typewriter({ text }) {
  const typed = useTypewriter(text, 20);
  if (!text) return null;
  return <div style={{ fontSize: '8px', color: '#10B981', marginTop: 4, fontFamily: 'monospace' }}>{'>'} {typed}{typed.length < text.length ? '_' : ''}</div>;
}
