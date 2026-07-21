"use client";

import { useMemo, useState, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = { longitude: 4.8952, latitude: 52.3702, zoom: 12, pitch: 55, bearing: -15 };

const AMSTERDAM_CENTER = [4.8952, 52.3702];
const randomPoint = (radius) => [AMSTERDAM_CENTER[0] + (Math.random() - 0.5) * radius * 2, AMSTERDAM_CENTER[1] + (Math.random() - 0.5) * radius];

// Generate intense mock data for "God Mode"
const HUBS = Array.from({length: 6}).map(() => [
  AMSTERDAM_CENTER[0] + (Math.random()-0.5)*0.25, 
  AMSTERDAM_CENTER[1] + (Math.random()-0.5)*0.15
]);

const EDGES = Array.from({length: 80}).map(() => [
  AMSTERDAM_CENTER[0] + (Math.random()-0.5)*0.3, 
  AMSTERDAM_CENTER[1] + (Math.random()-0.5)*0.2
]);

const MOCK_ARCS = [];
EDGES.forEach(edge => {
  const hub = HUBS[Math.floor(Math.random() * HUBS.length)];
  MOCK_ARCS.push({ start: edge, end: hub, type: Math.random() > 0.5 ? 'critical' : 'logistics' });
});
HUBS.forEach((h1, i) => {
  HUBS.forEach((h2, j) => {
    if (i < j) MOCK_ARCS.push({ start: h1, end: h2, type: 'data' });
  });
});

const MOCK_TRIPS = Array.from({length: 150}).map(() => {
  const t0 = Math.random() * 1000;
  return {
    path: Array.from({length: 5}).map(() => randomPoint(0.12)),
    timestamps: [t0, t0 + 200, t0 + 400, t0 + 600, t0 + 800],
    color: Math.random() > 0.5 ? [16, 185, 129] : [59, 130, 246]
  };
});

const mockHotspots = Array.from({length: 50}).map(() => ({ pos: randomPoint(0.12) }));
const mockBases = Array.from({length: 12}).map(() => ({ pos: randomPoint(0.15) }));

const MOCK_CABLES = Array.from({length: 8}).map(() => ({
  path: [randomPoint(0.4), randomPoint(0.3), randomPoint(0.2), randomPoint(0.3)]
}));
const MOCK_SHIPPING = Array.from({length: 8}).map(() => ({
  path: [randomPoint(0.4), randomPoint(0.3), randomPoint(0.25)]
}));
const MOCK_FINANCE = Array.from({length: 40}).map(() => ({
  start: randomPoint(0.25), end: randomPoint(0.25)
}));
const MOCK_CYBER = Array.from({length: 60}).map(() => {
  const t0 = Math.random() * 1000;
  return {
    path: [randomPoint(0.3), randomPoint(0.15)],
    timestamps: [t0, t0 + 300],
    color: [239, 68, 68]
  };
});
const MOCK_POINTS = Array.from({length: 250}).map(() => ({
  pos: randomPoint(0.3), type: Math.floor(Math.random() * 5)
}));

export default function DeckGLTracker({ homeless, stations, movements, layersActive }) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const animate = () => {
      setTime(t => (t + 2) % 1800);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const layers = useMemo(() => {
    const layerArray = [];

    // 1. ArcLayer: Dense global connections (God Mode)
    if (layersActive.pipelines) { // Re-using this toggle for global arcs
      layerArray.push(
        new ArcLayer({
          id: 'mock-global-arcs', data: MOCK_ARCS,
          getSourcePosition: d => d.start, getTargetPosition: d => d.end,
          getSourceColor: d => d.type === 'critical' ? [239, 68, 68, 180] : d.type === 'logistics' ? [245, 158, 11, 150] : [59, 130, 246, 120],
          getTargetColor: d => d.type === 'critical' ? [239, 68, 68, 20] : d.type === 'logistics' ? [245, 158, 11, 20] : [59, 130, 246, 10],
          getWidth: d => d.type === 'critical' ? 3 : 1,
          getHeight: 0.3
        })
      );
    }

    // 2. TripsLayer: Flowing data/logistics (Premium Animation)
    if (layersActive.cctv) {
      layerArray.push(
        new TripsLayer({
          id: 'mock-trips', data: MOCK_TRIPS,
          getPath: d => d.path, getTimestamps: d => d.timestamps, getColor: d => d.color,
          opacity: 0.8, widthMinPixels: 3, rounded: true, trailLength: 200, currentTime: time
        })
      );
    }

    // 3. Pulsing Scatterplot (Radar Simulation)
    if (layersActive.military) {
      const pulseRadius = (time % 100) * 10;
      layerArray.push(
        new ScatterplotLayer({
          id: 'mock-military-bases', data: mockBases, getPosition: d => d.pos,
          getFillColor: [234, 179, 8, 200], getRadius: 100, radiusMinPixels: 4, stroked: true, getLineColor: [255,255,255]
        }),
        new ScatterplotLayer({
          id: 'mock-military-pulse', data: mockBases, getPosition: d => d.pos,
          getFillColor: [0, 0, 0, 0], getRadius: pulseRadius, radiusMinPixels: 4, stroked: true, getLineColor: [234, 179, 8, 255 - (pulseRadius/1000)*255], lineWidthMinPixels: 2
        })
      );
    }

    if (layersActive.hotspots) {
      layerArray.push(
        new HeatmapLayer({
          id: 'mock-hotspots', data: mockHotspots, getPosition: d => d.pos,
          getWeight: () => 1, radiusPixels: 40, intensity: 1.2,
          colorRange: [[25,22,22,50], [239,68,68,150], [239,68,68,200]]
        })
      );
    }

    // --- 10 NEW GOD-MODE LAYERS ---
    if (layersActive.cables) {
      layerArray.push(new PathLayer({ id: 'mock-cables', data: MOCK_CABLES, getPath: d => d.path, getColor: [14, 165, 233, 150], getWidth: 2, widthMinPixels: 2 }));
    }
    if (layersActive.shipping) {
      layerArray.push(new PathLayer({ id: 'mock-shipping', data: MOCK_SHIPPING, getPath: d => d.path, getColor: [99, 102, 241, 150], getWidth: 2, widthMinPixels: 2 }));
    }
    if (layersActive.finance) {
      layerArray.push(new ArcLayer({ id: 'mock-finance', data: MOCK_FINANCE, getSourcePosition: d => d.start, getTargetPosition: d => d.end, getSourceColor: [16, 185, 129, 150], getTargetColor: [16, 185, 129, 0], getWidth: 2, getHeight: 0.5 }));
    }
    if (layersActive.cyber) {
      layerArray.push(new TripsLayer({ id: 'mock-cyber', data: MOCK_CYBER, getPath: d => d.path, getTimestamps: d => d.timestamps, getColor: d => d.color, opacity: 0.9, widthMinPixels: 3, trailLength: 300, currentTime: time }));
    }
    if (layersActive.satellites) {
      const satData = MOCK_POINTS.filter(d => d.type === 0).map(d => ({ pos: [d.pos[0] + (time/1800)*0.2, d.pos[1] - (time/1800)*0.2] }));
      layerArray.push(new ScatterplotLayer({ id: 'mock-satellites', data: satData, getPosition: d => d.pos, getFillColor: [139, 92, 246, 255], getRadius: 80, radiusMinPixels: 3 }));
    }
    if (layersActive.energy) {
      layerArray.push(new ScatterplotLayer({ id: 'mock-energy', data: MOCK_POINTS.filter(d => d.type === 1), getPosition: d => d.pos, getFillColor: [245, 158, 11, 30], getRadius: 1000 }));
    }
    if (layersActive.weather) {
      layerArray.push(new ScatterplotLayer({ id: 'mock-weather', data: MOCK_POINTS.filter(d => d.type === 2), getPosition: d => d.pos, getFillColor: [59, 130, 246, 20], getRadius: 2000 }));
    }
    if (layersActive.social) {
      const socialPulse = (time % 80) * 8;
      layerArray.push(new ScatterplotLayer({ id: 'mock-social', data: MOCK_POINTS.filter(d => d.type === 3), getPosition: d => d.pos, getFillColor: [236, 72, 153, Math.max(0, 200 - socialPulse*2)], getRadius: socialPulse, radiusMinPixels: 2 }));
    }
    if (layersActive.drones) {
      const droneData = MOCK_POINTS.filter(d => d.type === 4).map(d => ({ pos: [d.pos[0] + Math.sin(time/20)*0.003, d.pos[1] + Math.cos(time/20)*0.003] }));
      layerArray.push(new ScatterplotLayer({ id: 'mock-drones', data: droneData, getPosition: d => d.pos, getFillColor: [139, 92, 246, 200], getRadius: 40, radiusMinPixels: 2 }));
    }
    if (layersActive.assets) {
      layerArray.push(new ScatterplotLayer({ id: 'mock-assets', data: HUBS, getPosition: d => d, getFillColor: [234, 179, 8, 255], getRadius: 150, radiusMinPixels: 6, stroked: true, getLineColor: [0,0,0], lineWidthMinPixels: 2 }));
    }

    // Real Data Layers
    if (layersActive.destinations && homeless.length > 0) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'real-destinations', data: homeless, getPosition: d => [d.lng, d.lat],
          getFillColor: [16, 185, 129, 200], getRadius: 80, stroked: true, getLineColor: [255,255,255], lineWidthMinPixels: 2
        })
      );
    }
    
    if (layersActive.stations && stations.length > 0) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'real-stations', data: stations, getPosition: d => [d.lng, d.lat],
          getFillColor: [59, 130, 246, 200], getRadius: 60, stroked: true, getLineColor: [255,255,255], lineWidthMinPixels: 2
        })
      );
    }

    if (layersActive.routes && movements.length > 0) {
      layerArray.push(
        new ArcLayer({
          id: 'real-movements', data: movements, 
          getSourcePosition: d => [d.startLng, d.startLat], 
          getTargetPosition: d => [d.endLng, d.endLat],
          getSourceColor: d => d.color, 
          getTargetColor: d => [d.color[0], d.color[1], d.color[2], 50],
          getWidth: 1, getHeight: 0.2
        })
      );
    }

    return layerArray;
  }, [homeless, stations, movements, layersActive, time]);

  if (!mounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers}>
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
