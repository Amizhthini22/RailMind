import React, { useState } from 'react';
import { TrainFront, Lock, User, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../config/api';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (u, p) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid username or password');
      }
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please ensure the backend is running (python -m uvicorn main:app --port 8001).');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(username, password);
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    doLogin(u, p);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15), transparent 70%)',
      padding: '20px'
    }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '12px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
            <TrainFront size={28} color="white" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', margin: 0 }}>RailMind</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>AI Railway Operations Command Center</p>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: 'var(--error)', fontSize: '12px', lineHeight: '1.4' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} /> Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="controller"
            autoFocus
            required
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '6px', padding: '12px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* 1-Click Quick Demo Sign In Buttons */}
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="var(--accent-secondary)" /> Instant 1-Click Demo Sign In:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('controller', 'controller123')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              👮 OCC Controller
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('station_master', 'sm123')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.35)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              🚉 Station Master
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              👑 Admin User
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('viewer', 'viewer123')}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              👁️ Auditor View
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
