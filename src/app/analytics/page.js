"use client";

import { useMemo } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Globe2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const HISTORY_SEED = [
  { supermarket: 118, restaurant: 54, hotel: 38 },
  { supermarket: 132, restaurant: 61, hotel: 42 },
  { supermarket: 109, restaurant: 58, hotel: 35 },
  { supermarket: 145, restaurant: 66, hotel: 51 },
  { supermarket: 160, restaurant: 80, hotel: 74 },
  { supermarket: 171, restaurant: 92, hotel: 88 }
];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function getRecentWeekdayLabels(count) {
  const today = new Date().getDay();
  const labels = [];
  for (let i = count; i >= 1; i--) labels.push(WEEKDAY_LABELS[(today - i + 7) % 7]);
  return labels;
}

export default function AnalyticsPage() {
  const { records, isLoaded } = useAppStore();

  const chartData = useMemo(() => {
    const todayTotals = { supermarket: 0, restaurant: 0, hotel: 0 };
    records.forEach(r => { if (todayTotals[r.sourceType] !== undefined) todayTotals[r.sourceType] += r.weightKg; });
    const dayLabels = getRecentWeekdayLabels(HISTORY_SEED.length);
    const data = HISTORY_SEED.map((v, i) => ({ day: dayLabels[i], ...v }));
    data.push({ day: 'Today', supermarket: Math.round(todayTotals.supermarket), restaurant: Math.round(todayTotals.restaurant), hotel: Math.round(todayTotals.hotel) });
    const weatherFactor = 1.1; 
    const last3 = data.slice(-3);
    const avg = (key) => last3.reduce((sum, d) => sum + d[key], 0) / 3;
    data.push({ day: 'Tomorrow', supermarket: Math.round(avg('supermarket') * weatherFactor), restaurant: Math.round(avg('restaurant') * weatherFactor), hotel: Math.round(avg('hotel') * weatherFactor) });
    return data;
  }, [records]);

  if (!isLoaded) return null;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column' }}>
      <header className="top-nav" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Globe2 size={20} color="var(--primary)" />
          <div style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '16px', color: 'var(--text-main)' }}>FOODBRIDGE</div>
          <Link href="/" style={{ marginLeft: 24, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: '500' }}><ArrowLeft size={16}/> Back to Map</Link>
        </div>
      </header>

      <div style={{ padding: '32px', flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: '20px', fontWeight: '600' }}><TrendingUp size={24} color="var(--primary)" /> AI SURPLUS FORECAST</h2>
        <div className="panel" style={{ height: '600px', padding: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{fontSize: 13}} />
              <YAxis stroke="var(--text-muted)" tick={{fontSize: 13}} />
              <RechartsTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)' }} itemStyle={{ fontSize: '14px' }} />
              <Legend iconType="rect" wrapperStyle={{ fontSize: '13px', paddingTop: 20 }} />
              <Bar dataKey="supermarket" stackId="a" fill="#3B82F6" name="Supermarket" />
              <Bar dataKey="restaurant" stackId="a" fill="#8B5CF6" name="Restaurant" />
              <Bar dataKey="hotel" stackId="a" fill="#F59E0B" name="Hotel (Pred)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
