"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invalid email or password.');
        setLoading(false);
        return;
      }
      window.location.href = next;
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="bg-grid" />
      <div className="panel" style={{ width: 340, zIndex: 1 }}>
        <div className="panel-header" style={{ justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={12} color="var(--primary)" />
          <span style={{ color: 'var(--primary)', letterSpacing: '2px' }}>RESTRICTED ACCESS</span>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4, letterSpacing: '0.5px' }}>
            AUTHORIZATION REQUIRED TO ACCESS MONITOR
          </div>
          <input
            type="email"
            placeholder="Email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '8px', fontSize: 12 }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '8px', fontSize: 12 }}
          />
          {error && <div style={{ color: 'var(--accent-red)', fontSize: 11 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '8px', marginTop: 4, justifyContent: 'center', display: 'flex' }}>
            {loading ? 'AUTHENTICATING...' : 'LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
