"use client";

import { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Carto Dark Matter style for MapLibre
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 4.9041,
  latitude: 52.3676,
  zoom: 13,
  pitch: 45,
  bearing: 0
};

export default function DeckGLTracker({ homeless, stations, movements, showHeatmap, showStations, showMovements }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const layers = useMemo(() => {
    const layerArray = [];

    // 1. Heatmap Layer for Homeless concentration
    if (showHeatmap && homeless.length > 0) {
      layerArray.push(
        new HeatmapLayer({
          id: 'homeless-heatmap',
          data: homeless,
          getPosition: d => [d.lng, d.lat],
          getWeight: d => 1,
          radiusPixels: 40,
          intensity: 1.5,
          threshold: 0.1,
          colorRange: [
            [25, 22, 22, 100],     // almost invisible
            [74, 222, 128, 150],   // Green
            [250, 204, 21, 200],   // Yellow
            [239, 68, 68, 255]     // Red
          ]
        })
      );
    }

    // 2. Scatterplot Layer for exact Homeless Nodes (CCTV)
    if (showHeatmap && homeless.length > 0) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'homeless-nodes',
          data: homeless,
          getPosition: d => [d.lng, d.lat],
          getFillColor: d => d.status === 'Recently Claimed Food' ? [59, 130, 246] : [245, 158, 11],
          getRadius: 15,
          opacity: 0.8,
          stroked: true,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 1,
        })
      );
    }

    // 3. Scatterplot Layer for Food Stations
    if (showStations && stations.length > 0) {
      layerArray.push(
        new ScatterplotLayer({
          id: 'food-stations',
          data: stations,
          getPosition: d => [d.lng, d.lat],
          getFillColor: [16, 185, 129],
          getRadius: 40,
          opacity: 0.9,
          stroked: true,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
        })
      );
    }

    // 4. Path Layer for routing/movements
    if (showMovements && movements.length > 0) {
      layerArray.push(
        new PathLayer({
          id: 'movement-paths',
          data: movements,
          getPath: d => [[d.startLng, d.startLat], [d.endLng, d.endLat]],
          getColor: d => [59, 130, 246, 200], // Blue-ish
          getWidth: 3,
          widthMinPixels: 2,
          opacity: 0.8,
        })
      );
    }

    return layerArray;
  }, [homeless, stations, movements, showHeatmap, showStations, showMovements]);

  if (!mounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
