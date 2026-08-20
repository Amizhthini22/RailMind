import React, { useState } from 'react';
import { TrainFront, Lock, User, AlertCircle } from 'lucide-react';

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid username or password');
      }
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.12), transparent 60%)'
    }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{
        width: '380px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
            <TrainFront size={24} color="white" />
          </div>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '22px' }}>RailMind</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Command Center Sign In</p>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: 'var(--error)', fontSize: '13px' }}>
            <AlertCircle size={16} /> {error}
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
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px', lineHeight: '1.6' }}>
          Demo accounts: controller / controller123<br />
          station_master / sm123 &nbsp;•&nbsp; viewer / viewer123
        </div>
      </form>
    </div>
  );
}
