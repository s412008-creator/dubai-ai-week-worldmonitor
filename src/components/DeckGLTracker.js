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
const LOCAL_NODES = Array.from({length: 80}).map(() => [
  AMSTERDAM_CENTER[0] + (Math.random()-0.5)*0.25, 
  AMSTERDAM_CENTER[1] + (Math.random()-0.5)*0.15
]);

const MOCK_ARCS = Array.from({length: 120}).map(() => {
  const startIdx = Math.floor(Math.random() * LOCAL_NODES.length);
  let endIdx = Math.floor(Math.random() * LOCAL_NODES.length);
  while (endIdx === startIdx) endIdx = Math.floor(Math.random() * LOCAL_NODES.length);
  
  const rand = Math.random();
  let type = 'data';
  if (rand > 0.8) type = 'critical';
  else if (rand > 0.5) type = 'logistics';

  return {
    start: LOCAL_NODES[startIdx],
    end: LOCAL_NODES[endIdx],
    type
  };
});

const MOCK_TRIPS = Array.from({length: 100}).map(() => {
  const t0 = Math.random() * 1000;
  return {
    path: [randomPoint(0.1), randomPoint(0.05), AMSTERDAM_CENTER, randomPoint(0.05), randomPoint(0.1)],
    timestamps: [t0, t0 + 200, t0 + 400, t0 + 600, t0 + 800],
    color: Math.random() > 0.5 ? [16, 185, 129] : [59, 130, 246]
  };
});

const mockHotspots = Array.from({length: 50}).map(() => ({ pos: randomPoint(0.08) }));
const mockBases = Array.from({length: 8}).map(() => ({ pos: randomPoint(0.15) }));

export default function DeckGLTracker({ homeless, stations, movements, layersActive }) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const animate = () => {
      setTime(t => (t + 1) % 1000);
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
        new PathLayer({
          id: 'real-movements', data: movements, getPath: d => [[d.startLng, d.startLat], [d.endLng, d.endLat]],
          getColor: d => d.color, getWidth: 4, widthMinPixels: 2, opacity: 0.8
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
