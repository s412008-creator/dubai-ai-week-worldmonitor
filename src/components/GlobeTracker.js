"use client";

import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";

export default function GlobeTracker({ homeless, stations, movements }) {
  const globeEl = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: 600 });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Focus on Amsterdam initially
    setTimeout(() => {
      if (globeEl.current && typeof globeEl.current.pointOfView === 'function') {
        try {
          globeEl.current.pointOfView({ lat: 52.3676, lng: 4.9041, altitude: 0.8 }, 2000);
        } catch (e) {
          console.error("Globe focus error:", e);
        }
      }
    }, 500);
  }, []);

  // Format data for globe
  const markers = [
    ...homeless.map(h => ({
      lat: h.lat,
      lng: h.lng,
      size: 0.05, // scaled down for city view
      color: h.status === 'Recently Claimed Food' ? '#F59E0B' : '#94A3B8',
      label: h.name
    })),
    ...stations.map(s => ({
      lat: s.lat,
      lng: s.lng,
      size: 0.1, // scaled down for city view
      color: '#10B981',
      label: s.name
    }))
  ];

  const ringsData = stations.map(s => ({
    lat: s.lat,
    lng: s.lng,
    maxR: 0.1, // scaled down to 0.1 degrees
    propagationSpeed: 0.05,
    repeatPeriod: 1500
  }));

  return (
    <div ref={containerRef} style={{ width: '100%', height: '600px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
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
