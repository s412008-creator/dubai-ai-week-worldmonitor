"use client";

import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";

export default function GlobeTracker({ homeless, stations, movements }) {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (globeEl.current) {
        const parent = globeEl.current.parentElement;
        if (parent) {
          setDimensions({ width: parent.clientWidth, height: 600 });
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Focus on Dubai initially
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 25.2048, lng: 55.2708, altitude: 0.5 }, 2000);
    }
  }, []);

  // Format data for globe
  const markers = [
    ...homeless.map(h => ({
      lat: h.lat,
      lng: h.lng,
      size: 0.5,
      color: h.status === 'Recently Claimed Food' ? '#F59E0B' : '#94A3B8',
      label: h.name
    })),
    ...stations.map(s => ({
      lat: s.lat,
      lng: s.lng,
      size: 1.5,
      color: '#10B981',
      label: s.name
    }))
  ];

  const ringsData = stations.map(s => ({
    lat: s.lat,
    lng: s.lng,
    maxR: 1,
    propagationSpeed: 1,
    repeatPeriod: 1000
  }));

  return (
    <div ref={globeEl} style={{ width: '100%', height: '600px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        
        // Markers for homeless & stations
        pointsData={markers}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.02}
        pointRadius="size"
        pointsMerge={false}
        pointLabel="label"

        // Rings for stations
        ringsData={ringsData}
        ringColor={() => '#10B981'}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"

        // Arcs for movements
        arcsData={movements}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={1}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={2000}
        arcAltitudeAutoScale={0.2}
      />
    </div>
  );
}
