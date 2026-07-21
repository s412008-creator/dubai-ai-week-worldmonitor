"use client";

import { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = { longitude: 4.8952, latitude: 52.3702, zoom: 12.5, pitch: 45, bearing: 0 };

// Generate mock data for the dense background map
const AMSTERDAM_CENTER = [4.8952, 52.3702];
const generatePoints = (count, radius = 0.05) => {
  return Array.from({ length: count }).map(() => ({
    lng: AMSTERDAM_CENTER[0] + (Math.random() - 0.5) * radius * 2,
    lat: AMSTERDAM_CENTER[1] + (Math.random() - 0.5) * radius
  }));
};

const mockCctvs = generatePoints(200, 0.08);
const mockHotspots = generatePoints(50, 0.04);
const mockMilitary = generatePoints(15, 0.1);
const mockPipelines = Array.from({length: 30}).map(() => ({
  startLng: AMSTERDAM_CENTER[0] + (Math.random() - 0.5) * 0.1,
  startLat: AMSTERDAM_CENTER[1] + (Math.random() - 0.5) * 0.05,
  endLng: AMSTERDAM_CENTER[0] + (Math.random() - 0.5) * 0.1,
  endLat: AMSTERDAM_CENTER[1] + (Math.random() - 0.5) * 0.05
}));

export default function DeckGLTracker({ 
  homeless, stations, movements, 
  layersActive 
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const layers = useMemo(() => {
    const layerArray = [];

    // Background Mock Layers (for density)
    if (layersActive.cctv) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'mock-cctv', data: mockCctvs, getPosition: d => [d.lng, d.lat],
          getFillColor: [100, 150, 255, 120], getRadius: 30, radiusMinPixels: 2
        })
      );
    }
    if (layersActive.hotspots) {
      layerArray.push(
        new HeatmapLayer({
          id: 'mock-hotspots', data: mockHotspots, getPosition: d => [d.lng, d.lat],
          getWeight: () => 1, radiusPixels: 60, intensity: 1,
          colorRange: [[25,22,22,50], [239,68,68,150], [239,68,68,200]]
        })
      );
    }
    if (layersActive.military) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'mock-military', data: mockMilitary, getPosition: d => [d.lng, d.lat],
          getFillColor: [234, 179, 8, 200], getRadius: 100, radiusMinPixels: 4, stroked: true, getLineColor: [255,255,255]
        })
      );
    }
    if (layersActive.pipelines) {
      layerArray.push(
        new ArcLayer({
          id: 'mock-pipelines', data: mockPipelines,
          getSourcePosition: d => [d.startLng, d.startLat], getTargetPosition: d => [d.endLng, d.endLat],
          getSourceColor: [100, 100, 100, 100], getTargetColor: [200, 200, 200, 100], getWidth: 2
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
  }, [homeless, stations, movements, layersActive]);

  if (!mounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers}>
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
