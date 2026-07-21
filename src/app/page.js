"use client";

import { useState, useEffect } from 'react';
import { Globe2, Target, BarChart2, List, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAppStore } from '../hooks/useAppStore';
import { getNeighborhoods, uid, classify, computeNutritionStatic, routeEdible, routeInedible, predictHotelWaste } from '../utils/triageEngine';

const DeckGLTracker = dynamic(() => import('../components/DeckGLTracker'), { ssr: false });

export default function DashboardPage() {
  const { records, isLoaded, addRecord, loadDemoData } = useAppStore();
  const [layers, setLayers] = useState({ routes: true, destinations: true, stations: true });
  const [showIntake, setShowIntake] = useState(false);
  const [intakeTab, setIntakeTab] = useState('rule'); // 'rule', 'hotel', 'ai'
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // Rule-based Form State
  const [ruleForm, setRuleForm] = useState({ sourceType: 'supermarket', sourceName: '', neighborhood: 'centrum', category: 'bakery', weightKg: 10, condition: 'fresh' });
  // Hotel Form State
  const [hotelForm, setHotelForm] = useState({ sourceName: '', neighborhood: 'centrum', rooms: 150, occupancy: 75, breakfast: true, restaurant: false, banquet: false, banquetGuests: 0 });
  // AI Form State
  const [foodInput, setFoodInput] = useState('');

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

  const handleRuleSubmit = (e) => {
    e.preventDefault();
    const r = { id: uid(), sourceType: ruleForm.sourceType, sourceName: ruleForm.sourceName || 'Unknown', neighborhood: ruleForm.neighborhood, category: ruleForm.category, weightKg: Number(ruleForm.weightKg), condition: ruleForm.condition, timestamp: new Date().toISOString(), isPredicted: false };
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
    setShowIntake(false);
  };

  const handleHotelSubmit = (e) => {
    e.preventDefault();
    const pred = predictHotelWaste(Number(hotelForm.rooms), Number(hotelForm.occupancy), hotelForm.breakfast, hotelForm.restaurant, hotelForm.banquet, Number(hotelForm.banquetGuests));
    const baseTs = new Date().toISOString();
    
    if (pred.edibleKg > 0) {
      const r = { id: uid(), sourceType: 'hotel', sourceName: hotelForm.sourceName || 'Hotel', neighborhood: hotelForm.neighborhood, category: 'mixed_hotel_surplus', weightKg: pred.edibleKg, condition: 'predicted', timestamp: baseTs, isPredicted: true, classification: 'edible', classificationReason: `Predicted edible portion from occupancy model (${hotelForm.occupancy}% occ).` };
      r.nutrition = computeNutritionStatic(r.weightKg, r.category);
      r.routing = { kind: 'shelter', allocations: routeEdible(r.neighborhood, r.nutrition.meals) };
      addRecord(r);
    }
    if (pred.inedibleKg > 0) {
      const r = { id: uid(), sourceType: 'hotel', sourceName: hotelForm.sourceName || 'Hotel', neighborhood: hotelForm.neighborhood, category: 'mixed_hotel_surplus', weightKg: pred.inedibleKg, condition: 'predicted', timestamp: baseTs, isPredicted: true, classification: 'inedible', classificationReason: `Predicted inedible/prep-scrap from occupancy model.` };
      r.routing = { kind: 'facility', ...routeInedible(r.neighborhood, r.category, r.weightKg) };
      addRecord(r);
    }
    setShowIntake(false);
  };

  const handleAiSubmit = async (e) => {
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
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ foodInput, mockData: mockDataPayload, apiKey }) });
      const data = await res.json();
      
      if (data.edible) {
        data.edible.forEach(item => {
          addRecord({
            id: uid(), sourceType: 'manual', sourceName: 'AI Entry', neighborhood: 'centrum',
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
            id: uid(), sourceType: 'manual', sourceName: 'AI Entry', neighborhood: 'centrum',
            category: item.item, weightKg: 10, condition: 'spoiled', timestamp: new Date().toISOString(),
            isPredicted: false, classification: 'inedible', classificationReason: item.reason,
            routing: { kind: 'facility', facilityName: item.destination, lat: 52.39, lon: 4.85, energyEstimate: 50, energyUnit: 'kWh' }
          });
        });
      }
    } catch(e) { console.error(e); }
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
          <button className="btn" onClick={loadDemoData} style={{ color: '#0ea5e9', display: 'flex', gap: 4, alignItems: 'center' }}><RefreshCw size={12}/> RELOAD DEMO DATA</button>
          <button className="btn-primary" onClick={() => setShowIntake(true)} style={{ padding: '6px 16px' }}>+ NEW INTAKE</button>
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

        {/* The Ultimate Intake Modal */}
        {showIntake && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="panel-header" style={{ background: '#10B981', color: '#000' }}>
                <span>NEW INTAKE TASK</span>
                <button className="btn" onClick={() => setShowIntake(false)} style={{ color: '#000' }}>X</button>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#111' }}>
                <button onClick={() => setIntakeTab('rule')} style={{ flex: 1, padding: '12px', border: 'none', background: intakeTab === 'rule' ? '#222' : 'transparent', color: intakeTab === 'rule' ? '#10B981' : '#888', cursor: 'pointer' }}>Rule-Based</button>
                <button onClick={() => setIntakeTab('hotel')} style={{ flex: 1, padding: '12px', border: 'none', background: intakeTab === 'hotel' ? '#222' : 'transparent', color: intakeTab === 'hotel' ? '#10B981' : '#888', cursor: 'pointer' }}>Hotel Prediction</button>
                <button onClick={() => setIntakeTab('ai')} style={{ flex: 1, padding: '12px', border: 'none', background: intakeTab === 'ai' ? '#222' : 'transparent', color: intakeTab === 'ai' ? '#10B981' : '#888', cursor: 'pointer' }}>Gemini AI</button>
              </div>

              {intakeTab === 'rule' && (
                <form onSubmit={handleRuleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select value={ruleForm.sourceType} onChange={e => setRuleForm({...ruleForm, sourceType: e.target.value})} className="form-input">
                    <option value="supermarket">Supermarket</option>
                    <option value="restaurant">Restaurant</option>
                  </select>
                  <input type="text" placeholder="Source Name (e.g. Albert Heijn)" value={ruleForm.sourceName} onChange={e => setRuleForm({...ruleForm, sourceName: e.target.value})} className="form-input" required />
                  <select value={ruleForm.neighborhood} onChange={e => setRuleForm({...ruleForm, neighborhood: e.target.value})} className="form-input">
                    {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <select value={ruleForm.category} onChange={e => setRuleForm({...ruleForm, category: e.target.value})} className="form-input">
                    <option value="bakery">Bakery</option>
                    <option value="produce">Produce (fruit/veg)</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                  </select>
                  <input type="number" placeholder="Weight (kg)" value={ruleForm.weightKg} onChange={e => setRuleForm({...ruleForm, weightKg: e.target.value})} className="form-input" min="0.1" step="0.1" required />
                  <select value={ruleForm.condition} onChange={e => setRuleForm({...ruleForm, condition: e.target.value})} className="form-input">
                    <option value="fresh">Fresh</option>
                    <option value="near_expiry">Near expiry</option>
                    <option value="spoiled">Spoiled</option>
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>CLASSIFY & ROUTE</button>
                </form>
              )}

              {intakeTab === 'hotel' && (
                <form onSubmit={handleHotelSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Hotel Name" value={hotelForm.sourceName} onChange={e => setHotelForm({...hotelForm, sourceName: e.target.value})} className="form-input" required />
                  <select value={hotelForm.neighborhood} onChange={e => setHotelForm({...hotelForm, neighborhood: e.target.value})} className="form-input">
                    {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>Total Rooms<br/><input type="number" value={hotelForm.rooms} onChange={e => setHotelForm({...hotelForm, rooms: e.target.value})} className="form-input" style={{width:'100%', marginTop:4}}/></label>
                    <label style={{ fontSize: '12px', color: '#888' }}>Occupancy (%)<br/><input type="number" value={hotelForm.occupancy} onChange={e => setHotelForm({...hotelForm, occupancy: e.target.value})} className="form-input" style={{width:'100%', marginTop:4}}/></label>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#ccc' }}><input type="checkbox" checked={hotelForm.breakfast} onChange={e => setHotelForm({...hotelForm, breakfast: e.target.checked})}/> Breakfast buffet served</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#ccc' }}><input type="checkbox" checked={hotelForm.restaurant} onChange={e => setHotelForm({...hotelForm, restaurant: e.target.checked})}/> À la carte restaurant service</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#ccc' }}><input type="checkbox" checked={hotelForm.banquet} onChange={e => setHotelForm({...hotelForm, banquet: e.target.checked})}/> Banquet/event today</label>
                  {hotelForm.banquet && (
                    <label style={{ fontSize: '12px', color: '#888' }}>Banquet Guests<input type="number" value={hotelForm.banquetGuests} onChange={e => setHotelForm({...hotelForm, banquetGuests: e.target.value})} className="form-input" style={{width:'100%', marginTop:4}}/></label>
                  )}
                  <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>PREDICT & ROUTE</button>
                </form>
              )}

              {intakeTab === 'ai' && (
                <form onSubmit={handleAiSubmit} style={{ padding: '20px' }}>
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
                    placeholder="Gemini API Key (Required)"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="form-input"
                    style={{ marginBottom: '16px' }}
                  />
                  <button type="submit" disabled={isProcessing} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                    {isProcessing ? 'ANALYZING VIA GEMINI AI...' : 'ANALYZE & ROUTE'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Dynamic styles for inputs */}
      <style dangerouslySetInnerHTML={{__html: `
        .form-input {
          background: #111; color: #fff; border: 1px solid #333; padding: 10px; width: 100%; box-sizing: border-box;
        }
        .form-input:focus { outline: none; border-color: #10B981; }
      `}} />
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
