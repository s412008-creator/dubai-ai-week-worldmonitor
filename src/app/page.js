"use client";

import { useState, useEffect } from 'react';
import { Globe2, Target, BarChart2, List, RefreshCw, Plus, X } from 'lucide-react';
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
    <div className="dashboard-layout">
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={20} color="var(--primary)" />
          <div style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '16px', color: 'var(--text-main)' }}>FOODBRIDGE</div>
          
          <div style={{ display: 'flex', gap: '24px', marginLeft: '2rem' }}>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '600' }}><Target size={16}/> Map View</Link>
            <Link href="/analytics" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '500' }}><BarChart2 size={16}/> Analytics</Link>
            <Link href="/records" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '500' }}><List size={16}/> Records</Link>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '13px', color: 'var(--text-muted)' }}>
          {timeStr}
          <button className="btn" onClick={loadDemoData}><RefreshCw size={14} style={{marginRight: 6}}/> Reload Demo Data</button>
          <button className="btn-primary" onClick={() => setShowIntake(true)}><Plus size={14} style={{marginRight: 4}}/> New Intake</button>
        </div>
      </header>

      <div className="main-workspace">
        <div className="map-container">
          <DeckGLTracker homeless={deckData.homeless} stations={deckData.stations} movements={deckData.movements} layersActive={layers} />
        </div>

        {/* Floating Layer Toggles */}
        <div className="panel" style={{ position: 'absolute', bottom: '2rem', left: '2rem', width: '240px', zIndex: 20 }}>
          <div className="panel-header">MAP LAYERS</div>
          <div style={{ padding: '8px' }}>
            <LayerToggle active={layers.stations} onClick={() => toggleLayer('stations')} label="Food Sources" />
            <LayerToggle active={layers.destinations} onClick={() => toggleLayer('destinations')} label="Shelters & Facilities" />
            <LayerToggle active={layers.routes} onClick={() => toggleLayer('routes')} label="Active Routes" />
          </div>
        </div>

        {/* The Clean Intake Modal */}
        {showIntake && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="panel" style={{ width: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-light)' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>New Surplus Intake</h3>
                <button onClick={() => setShowIntake(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <button onClick={() => setIntakeTab('rule')} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', borderBottom: intakeTab === 'rule' ? '2px solid var(--primary)' : '2px solid transparent', color: intakeTab === 'rule' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: intakeTab === 'rule' ? '600' : '500', cursor: 'pointer' }}>Rule-Based</button>
                <button onClick={() => setIntakeTab('hotel')} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', borderBottom: intakeTab === 'hotel' ? '2px solid var(--primary)' : '2px solid transparent', color: intakeTab === 'hotel' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: intakeTab === 'hotel' ? '600' : '500', cursor: 'pointer' }}>Hotel Prediction</button>
                <button onClick={() => setIntakeTab('ai')} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', borderBottom: intakeTab === 'ai' ? '2px solid var(--primary)' : '2px solid transparent', color: intakeTab === 'ai' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: intakeTab === 'ai' ? '600' : '500', cursor: 'pointer' }}>Gemini AI</button>
              </div>

              {intakeTab === 'rule' && (
                <form onSubmit={handleRuleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Source Type</label>
                    <select value={ruleForm.sourceType} onChange={e => setRuleForm({...ruleForm, sourceType: e.target.value})} className="form-input">
                      <option value="supermarket">Supermarket</option>
                      <option value="restaurant">Restaurant</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Source Name</label>
                    <input type="text" placeholder="e.g. Albert Heijn" value={ruleForm.sourceName} onChange={e => setRuleForm({...ruleForm, sourceName: e.target.value})} className="form-input" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Neighborhood</label>
                    <select value={ruleForm.neighborhood} onChange={e => setRuleForm({...ruleForm, neighborhood: e.target.value})} className="form-input">
                      {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Category</label>
                      <select value={ruleForm.category} onChange={e => setRuleForm({...ruleForm, category: e.target.value})} className="form-input">
                        <option value="bakery">Bakery</option>
                        <option value="produce">Produce (fruit/veg)</option>
                        <option value="dairy">Dairy</option>
                        <option value="meat">Meat</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Weight (kg)</label>
                      <input type="number" value={ruleForm.weightKg} onChange={e => setRuleForm({...ruleForm, weightKg: e.target.value})} className="form-input" min="0.1" step="0.1" required />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Condition</label>
                    <select value={ruleForm.condition} onChange={e => setRuleForm({...ruleForm, condition: e.target.value})} className="form-input">
                      <option value="fresh">Fresh</option>
                      <option value="near_expiry">Near expiry</option>
                      <option value="spoiled">Spoiled</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '8px', fontSize: '14px', width: '100%' }}>Classify & Route</button>
                </form>
              )}

              {intakeTab === 'hotel' && (
                <form onSubmit={handleHotelSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Hotel Name</label>
                    <input type="text" placeholder="e.g. Hotel Amstel" value={hotelForm.sourceName} onChange={e => setHotelForm({...hotelForm, sourceName: e.target.value})} className="form-input" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Neighborhood</label>
                    <select value={hotelForm.neighborhood} onChange={e => setHotelForm({...hotelForm, neighborhood: e.target.value})} className="form-input">
                      {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Total Rooms</label>
                      <input type="number" value={hotelForm.rooms} onChange={e => setHotelForm({...hotelForm, rooms: e.target.value})} className="form-input" required/>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Occupancy (%)</label>
                      <input type="number" value={hotelForm.occupancy} onChange={e => setHotelForm({...hotelForm, occupancy: e.target.value})} className="form-input" required/>
                    </div>
                  </div>
                  
                  <div style={{ background: 'var(--surface-light)', padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hotelForm.breakfast} onChange={e => setHotelForm({...hotelForm, breakfast: e.target.checked})} style={{ width: '16px', height: '16px' }}/> Breakfast buffet served
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hotelForm.restaurant} onChange={e => setHotelForm({...hotelForm, restaurant: e.target.checked})} style={{ width: '16px', height: '16px' }}/> À la carte restaurant service
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hotelForm.banquet} onChange={e => setHotelForm({...hotelForm, banquet: e.target.checked})} style={{ width: '16px', height: '16px' }}/> Banquet/event today
                    </label>
                    {hotelForm.banquet && (
                      <div style={{ marginTop: '4px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Banquet Guests</label>
                        <input type="number" value={hotelForm.banquetGuests} onChange={e => setHotelForm({...hotelForm, banquetGuests: e.target.value})} className="form-input" />
                      </div>
                    )}
                  </div>
                  
                  <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '8px', fontSize: '14px', width: '100%' }}>Predict & Route</button>
                </form>
              )}

              {intakeTab === 'ai' && (
                <form onSubmit={handleAiSubmit} style={{ padding: '24px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '13px', lineHeight: '1.5' }}>
                    Describe the surplus food items. The Gemini AI will automatically classify them as edible or inedible, calculate macronutrients, and route them to the optimal shelter or waste-to-energy facility.
                  </p>
                  <textarea 
                    value={foodInput}
                    onChange={e => setFoodInput(e.target.value)}
                    placeholder="e.g. 50 boxes of near-expiry milk, 12 trays of leftover rice and chicken from the banquet..."
                    className="form-input"
                    style={{ height: '120px', resize: 'vertical', marginBottom: '16px' }}
                  />
                  <input
                    type="password"
                    placeholder="Gemini API Key (Required)"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="form-input"
                    style={{ marginBottom: '24px' }}
                  />
                  <button type="submit" disabled={isProcessing} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
                    {isProcessing ? 'Analyzing via Gemini...' : 'Analyze & Route'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LayerToggle({ active, onClick, label }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} onClick={onClick}>
      <div style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>
        {active ? 
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary-dim)' }}/> : 
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)' }}/>
        }
      </div>
      <div style={{ flex: 1 }}>{label}</div>
    </div>
  );
}
