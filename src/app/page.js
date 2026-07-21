"use client";

import { useState, useEffect } from 'react';
import { Globe2, Crosshair, AlertTriangle, Battery, Target, Menu, Settings, Maximize, Search, PlusCircle, Trash2, Video, Radio, Activity, CheckSquare, Square, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../hooks/useAppStore';
import { classify, computeNutritionStatic, routeEdible, routeInedible, getNeighborhoods, uid } from '../utils/triageEngine';

const DeckGLTracker = dynamic(() => import('../components/DeckGLTracker'), { ssr: false });

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

  // Convert records to DeckGL data format
  const deckData = { movements: [], homeless: [], stations: [] };
  if (isLoaded) {
    records.forEach(r => {
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

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    const r = {
      id: uid(), sourceType: formData.sourceType, sourceName: formData.sourceName || 'Unknown', neighborhood: formData.neighborhood,
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
    setShowIntake(false);

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
    <div className="dashboard-layout">
      {/* Top Navbar */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={16} color="#10B981" />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1,2,3,4].map(i => <div key={i} style={{width: 8, height: 8, background: i===1?'#10B981':'#333'}} />)}
          </div>
          <div style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>MONITOR</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>v3.10.0  @care_monitor</span>
          
          <div style={{ display: 'flex', alignItems: 'center', background: '#111', border: '1px solid #333', borderRadius: '4px', padding: '2px', marginLeft: '1rem' }}>
            <span style={{ fontSize: '10px', padding: '0 8px' }}>AMSTERDAM</span>
            <div style={{ background: '#222', padding: '2px 8px', fontSize: '10px' }}>▼</div>
          </div>
          
          <button style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid #10B981', padding: '2px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Target size={12}/> MISSION
          </button>
          
          <button style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold' }}>
            CRISIS LEVEL 5
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '10px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={14} /> 搜索
          </div>
          <div style={{ borderLeft: '1px solid #333', height: '24px' }}></div>
          <button className="btn">Embed</button>
          <button className="btn"><Maximize size={12} /></button>
          <button className="btn"><Settings size={12} /></button>
          <button className="btn-primary" style={{ padding: '4px 12px' }}>登錄</button>
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
        </div>

        {/* Global Coordinates Overlay */}
        <div style={{ position: 'absolute', top: '1rem', left: '0', right: '0', textAlign: 'center', pointerEvents: 'none', zIndex: 20 }}>
          <span style={{ background: 'rgba(0,0,0,0.6)', padding: '4px 12px', fontSize: '12px', letterSpacing: '1px', border: '1px solid #333' }}>
            TUE, 21 JUL 2026 06:26:16 UTC
          </span>
        </div>

        {/* Left Layer Panel */}
        <div className="panel" style={{ position: 'absolute', top: '1rem', left: '1rem', width: '260px', bottom: '1rem', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <span>圖層 (LAYERS)</span>
            <span>▼</span>
          </div>
          <div style={{ padding: '8px' }}>
            <input type="text" placeholder="搜索圖層..." style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '6px', fontSize: '11px' }} />
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LayerToggle active={layers.hotspots} onClick={() => toggleLayer('hotspots')} icon={<AlertTriangle size={14} color="#EF4444"/>} label="情報熱點 (High Need)" />
            <LayerToggle active={layers.cctv} onClick={() => toggleLayer('cctv')} icon={<Video size={14} color="#3B82F6"/>} label="網路攝影機 (CCTVs)" />
            <LayerToggle active={layers.stations} onClick={() => toggleLayer('stations')} icon={<Globe2 size={14} color="#10B981"/>} label="合作站點 (Stations)" />
            <LayerToggle active={layers.destinations} onClick={() => toggleLayer('destinations')} icon={<Target size={14} color="#10B981"/>} label="分配中心 (Shelters)" />
            <LayerToggle active={layers.routes} onClick={() => toggleLayer('routes')} icon={<Activity size={14} color="#F59E0B"/>} label="調度路線 (Routes)" />
            <LayerToggle active={layers.military} onClick={() => toggleLayer('military')} icon={<Crosshair size={14} color="#EAB308"/>} label="軍事基地 (Mock Logistics)" />
            <LayerToggle active={layers.pipelines} onClick={() => toggleLayer('pipelines')} icon={<Activity size={14} color="#666"/>} label="海底電纜 (Mock Pipes)" />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
            <button className="btn-primary" style={{ width: '100%', padding: '8px' }} onClick={() => setShowIntake(!showIntake)}>
              <PlusCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
              部署調度任務 (NEW INTAKE)
            </button>
          </div>
        </div>

        {/* Floating Intake Modal (If active) */}
        {showIntake && (
          <div className="panel" style={{ position: 'absolute', top: '1rem', left: '290px', width: '320px', zIndex: 30 }}>
            <div className="panel-header" style={{ background: '#10B981', color: '#000' }}>
              <span>部署任務 (INTAKE)</span>
              <button onClick={() => setShowIntake(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>
            <form onSubmit={handleIntakeSubmit} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <select value={formData.sourceType} onChange={e => setFormData({...formData, sourceType: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="supermarket">超市 (Supermarket)</option>
                <option value="restaurant">餐廳 (Restaurant)</option>
              </select>
              <input type="text" placeholder="來源名稱" value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }} />
              <select value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                {getNeighborhoods().map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="bakery">麵包 (Bakery)</option>
                <option value="produce">生鮮 (Produce)</option>
                <option value="meat">肉類 (Meat)</option>
              </select>
              <input type="number" placeholder="重量 (kg)" value={formData.weightKg} onChange={e => setFormData({...formData, weightKg: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }} />
              <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', padding: '6px' }}>
                <option value="fresh">新鮮 (Fresh)</option>
                <option value="near_expiry">即期 (Near Expiry)</option>
                <option value="spoiled">壞掉 (Spoiled)</option>
              </select>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '8px' }}>執行分配</button>
            </form>
          </div>
        )}

      </div>

      {/* Bottom Grid Panels */}
      <div className="bottom-grid">
        
        {/* Col 1: News */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff' }}>實時新聞 <span style={{ color: '#EF4444' }}>● 93</span></span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Maximize size={12}/> <Settings size={12}/>
            </div>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span className="badge badge-red">BLOOMBERG</span>
            <span className="badge" style={{ background: '#222' }}>SKYNEWS</span>
            <span className="badge" style={{ background: '#222' }}>EURONEWS</span>
            <span className="badge" style={{ background: '#222' }}>CNN</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', marginBottom: '8px', boxShadow: '0 0 8px #EF4444' }}></div>
            <span style={{ fontSize: '10px', color: '#888' }}>準備就緒，隨時可播</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>Bloomberg</span>
            <button style={{ border: '1px solid #EF4444', color: '#EF4444', background: 'transparent', padding: '4px 12px', fontSize: '10px', marginTop: '12px' }}>播放直播源</button>
          </div>
        </div>

        {/* Col 2: Webcams */}
        <div className="panel" style={{ borderLeft: '1px solid #333', borderRight: '1px solid #333' }}>
          <div className="panel-header">
            <span style={{ color: '#fff' }}>實時網路攝像頭 <span style={{ color: '#EF4444' }}>● 23</span></span>
            <Maximize size={12}/>
          </div>
          <div style={{ padding: '8px', display: 'flex', gap: '12px', borderBottom: '1px solid #222', fontSize: '10px' }}>
            <span style={{ background: '#EF4444', padding: '2px 8px', borderRadius: '2px' }}>全部</span>
            <span style={{ color: '#888' }}>中東</span>
            <span style={{ color: '#888' }}>歐洲</span>
            <span style={{ color: '#888' }}>太空</span>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: '#000' }}>
             <div style={{ background: '#111', position: 'relative' }}><span style={{position:'absolute', bottom: 4, left: 4, fontSize: '9px', color: '#666'}}>CAM 01 - CENTRUM</span></div>
             <div style={{ background: '#111', position: 'relative' }}><span style={{position:'absolute', bottom: 4, left: 4, fontSize: '9px', color: '#666'}}>CAM 02 - ZUID</span></div>
          </div>
        </div>

        {/* Col 3: AI & Records */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: '#fff' }}>AI洞察 & 調度歷史</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{width:6,height:6,borderRadius:'50%',background:'#10B981'}}></div>實時</span>
              <Settings size={12}/>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {records.map(r => (
              <div key={r.id} style={{ background: '#1A1A1A', border: '1px solid #333', padding: '8px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#888' }}><Globe2 size={10} style={{display:'inline'}}/> 系統匯報</span>
                  <span className={r.classification === 'edible' ? "badge badge-green" : "badge badge-red"}>{r.classification.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  {r.sourceName} 調度了 {r.weightKg}kg {r.category} ({r.condition}).
                  <br/>
                  <span style={{ color: '#10B981', marginTop: '4px', display: 'block' }}>
                    ▶ {r.routing.kind === 'shelter' ? r.routing.allocations.map(a => `${a.districtName}`).join(', ') : r.routing.facilityName}
                  </span>
                </div>
                {r.aiReason && (
                  <div style={{ marginTop: '8px', borderTop: '1px dashed #333', paddingTop: '8px', fontSize: '11px', color: '#aaa' }}>
                    <strong>🤖 Claude:</strong> {r.aiReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function LayerToggle({ active, onClick, icon, label }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} onClick={onClick}>
      <div style={{ marginRight: '8px' }}>
        {active ? <CheckSquare size={14} color="#10B981" /> : <Square size={14} color="#555" />}
      </div>
      <div style={{ marginRight: '8px' }}>{icon}</div>
      <div style={{ flex: 1 }}>{label}</div>
      <Info size={12} color="#555" />
    </div>
  );
}
