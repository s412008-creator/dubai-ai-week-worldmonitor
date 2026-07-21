"use client";

import { AlertTriangle } from 'lucide-react';

export default function MobileApp() {
  return (
    <div style={{ 
      maxWidth: '400px', margin: '0 auto', minHeight: '100vh', 
      background: 'var(--background)', color: '#fff', padding: '2rem', textAlign: 'center' 
    }}>
      <AlertTriangle size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
      <h2>Mobile Client Offline</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        The Care Monitor mobile client is currently being upgraded to support the new FoodBridge routing engine. 
        Please use the main command center dashboard.
      </p>
    </div>
  );
}
