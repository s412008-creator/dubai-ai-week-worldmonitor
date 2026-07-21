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

// Simplified DeckGL Tracker (Real Data Only)

export default function DeckGLTracker({ homeless, stations, movements, layersActive }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const layers = useMemo(() => {
    const layerArray = [];

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
          getWidth: 2, getHeight: 0.15
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
