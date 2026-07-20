"use client";

import { useState, useEffect } from 'react';
import { Shield, Crosshair, AlertTriangle, Battery, Navigation, Globe2, Radio, Target, Activity, Menu, Settings, Maximize, Search, Eye, Circle, PlaySquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '../hooks/useAppStore';

// Dynamically import Leaflet Map to avoid SSR issues
const MapTracker = dynamic(() => import('../components/MapTracker'), { ssr: false });

export default function DashboardPage() {
  const { data, isLoaded } = useAppStore();
  const [aiInsight, setAiInsight] = useState("Analyzing movement patterns...");
  
  // Rich panel toggles simulating worldmonitor.app
  const [layers, setLayers] = useState({
    stations: true,
    homeless: true,
    movements: true,
    conflictZones: true,
    militaryBases: true,
    cctvNodes: false,
    submarineCables: false,
  });

  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!isLoaded) return;
    
    const movingCount = data.homeless.filter(h => h.status !== 'Idle').length;
    const claimedCount = data.homeless.filter(h => h.status === 'Recently Claimed Food').length;
    
    setTimeout(() => {
      if (claimedCount > 0) {
        setAiInsight(`Global food prices dip below $87. Blockade on Centrum by supply chain bottlenecks keeps losses in check. Recommend dispatch to Albert Heijn.`);
      } else if (movingCount > 0) {
        setAiInsight(`Movement detected in Zuid district. Expected demand surge at Museumplein station in 30 mins. Re-routing surplus required.`);
      } else {
        setAiInsight("Population is currently stable. Surplus food levels are adequate across all monitored grid sections.");
      }
    }, 1000);
  }, [data, isLoaded]);

  if (!isLoaded) return <div style={{ padding: '2rem', color: '#fff', background: '#000', height: '100vh' }}>INITIALIZING MONITOR KERNEL...</div>;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe2 size={18} color="#10B981" />
            <div style={{ fontWeight: 'bold', letterSpacing: '3px', fontSize: '1.1rem' }}>
              MONITOR
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v2.10.0</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@zhuangzijin</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: '#111' }}>全球 ▼</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--primary)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)' }}>
            <Target size={12} color="var(--primary)" /> <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>MISSION</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--accent-orange)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>DEFCON 5</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            MON, 20 JUL 2026 {new Date().toISOString().substring(11, 19)} UTC
          </div>
          <button style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>登錄</button>
        </div>
      </header>

      {/* Main Content Area (Map + Controls) */}
      <div className="main-content">
        {/* Map Area */}
        <div className="map-area">
          <MapTracker 
            homeless={layers.homeless ? data.homeless : []}
            stations={layers.stations ? data.foodStations : []}
            movements={layers.movements ? (data.movements || []) : []}
          />
        </div>

        {/* Left Floating Panel (Rich Layers) */}
        <div className="floating-controls" style={{ width: '280px', top: '1rem', left: '1rem', background: 'rgba(10,10,10,0.95)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--primary)', color: '#000', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>7d</div>
            <div style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}>全部</div>
          </div>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem', display: 'flex', alignItems: 'center', marginBottom: '1rem', background: '#000' }}>
            <Search size={14} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
            <input type="text" placeholder="搜索圖層..." style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { id: 'stations', label: '情報熱點 (Food)', color: '#10B981', icon: <Target size={14} /> },
              { id: 'conflictZones', label: '衝突區 (Risk)', color: '#10B981', icon: <AlertTriangle size={14} /> },
              { id: 'militaryBases', label: '軍事基地 (Depot)', color: '#10B981', icon: <Shield size={14} /> },
              { id: 'homeless', label: '監視器節點 (Targets)', color: '#F59E0B', icon: <Radio size={14} /> },
              { id: 'movements', label: '移動軌跡 (Vectors)', color: '#3B82F6', icon: <Navigation size={14} /> },
              { id: 'submarineCables', label: '海底電纜 (Cables)', color: '#4B5563', icon: <Activity size={14} /> }
            ].map(layer => (
              <div key={layer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={layers[layer.id]} onChange={() => toggleLayer(layer.id)} style={{ accentColor: 'var(--primary)' }} />
                  <span style={{ color: layer.color }}>{layer.icon}</span>
                  <span style={{ color: layers[layer.id] ? '#fff' : 'var(--text-muted)' }}>{layer.label}</span>
                </label>
                <div style={{ width: '18px', height: '18px', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>i</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#3B82F6', fontWeight: 'bold' }}>
            © Zhuang Zijin - Oasis™
          </div>
        </div>

        {/* Legend Overlay at Bottom Center of Map */}
        <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 16px', display: 'flex', gap: '1rem', fontSize: '0.75rem', zIndex: 20 }}>
          <span style={{ color: 'var(--text-muted)' }}>圖例</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={8} fill="#EF4444" color="#EF4444"/> 高度警報</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={8} fill="#F59E0B" color="#F59E0B"/> 升高</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={8} fill="#10B981" color="#10B981"/> 監控中</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Circle size={8} fill="#3B82F6" color="#3B82F6"/> 基地</span>
        </div>

        {/* Map Right Controls */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 20 }}>
          <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <button style={{ padding: '4px 8px', background: 'var(--primary)', color: '#000', fontSize: '0.75rem', fontWeight: 'bold', border: 'none' }}>2D</button>
            <button style={{ padding: '4px 8px', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', border: 'none' }}>3D</button>
          </div>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <Maximize size={16} color="var(--text-muted)" />
          </div>
        </div>
      </div>

      {/* Bottom Dashboard Panels (4 Columns) */}
      <div className="bottom-dashboard" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        
        {/* Panel 1: Real-time News */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div>實時新聞 <span style={{ color: 'var(--accent-red)' }}>• 93</span></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <PlaySquare size={14} color="var(--text-muted)" />
              <Maximize size={14} color="var(--text-muted)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['BLOOMBERG', 'SKYNEWS', 'EURONEWS', 'CNN'].map(n => (
              <div key={n} style={{ fontSize: '0.65rem', padding: '2px 6px', background: n==='BLOOMBERG' ? 'var(--accent-red)' : '#222', color: n==='BLOOMBERG' ? '#fff' : 'var(--text-muted)', borderRadius: '2px' }}>{n}</div>
            ))}
          </div>
          <div style={{ background: '#111', flexGrow: 1, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              <Circle size={6} fill="var(--accent-red)" color="var(--accent-red)" /> 準備就緒，隨時可播
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Bloomberg</div>
            <button style={{ marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem' }}>播放直播源</button>
          </div>
        </div>

        {/* Panel 2: AI Insights */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              AI 洞察 <div style={{ width: '12px', height: '12px', border: '1px solid var(--text-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>?</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem' }}>● 實時</div>
          </div>
          
          <div className="ai-insight-card" style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Globe2 size={14} color="#3B82F6" />
              <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>世界簡報 (Gemini AI)</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#E2E8F0', marginBottom: '0.5rem' }}>
              {aiInsight}
            </p>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              生成於 13m 前 • 最新預測 1h 前
            </div>
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ▶ Sources (1) <span style={{ color: 'var(--text-muted)' }}>...</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Strategic Posture */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              AI 戰略態勢 <div style={{ width: '12px', height: '12px', border: '1px solid var(--text-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>?</div>
            </div>
            <div style={{ background: '#333', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>1 新</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>阿姆斯特丹核心區 (Centrum)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  調度 <Navigation size={12} color="#3B82F6"/> 7
                </div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                升高
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--primary)' }}>+</span> 穩定
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ZUID 區</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={12} color="#3B82F6"/> 3
              </div>
              <div style={{ color: 'var(--primary)', fontSize: '0.75rem', border: '1px solid var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>正常</div>
            </div>
          </div>
        </div>

        {/* Panel 4: Instability Ranking */}
        <div className="dashboard-panel">
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              站點不穩定性排行 <div style={{ width: '12px', height: '12px', border: '1px solid var(--text-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>?</div>
            </div>
            <div style={{ border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem' }}>已緩存</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Albert Heijn', score: 73, color: 'var(--accent-orange)' },
              { name: 'Jumbo', score: 72, color: 'var(--accent-orange)' },
              { name: 'Waldorf Astoria', score: 40, color: 'var(--primary)' }
            ].map(station => (
              <div key={station.name} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <Target size={14} color="var(--text-muted)" />
                    <Circle size={8} fill={station.color} color={station.color} />
                    {station.name}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{station.score} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</span></div>
                </div>
                <div style={{ height: '2px', background: '#333', width: '100%', borderRadius: '1px' }}>
                  <div style={{ height: '100%', background: station.color, width: `${station.score}%`, borderRadius: '1px' }}></div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  U:0 C:0 S:{Math.floor(station.score/2)} I:4
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
