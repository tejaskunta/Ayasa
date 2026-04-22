import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/home';
    } catch (err) {
      setError('Cannot reach the server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-brand-panel">
        <div className="brand-content">
          <div className="auth-brand-logo">
            <span className="material-symbols-rounded">diversity_1</span>
            AYASA
          </div>
          <p>Welcome back. We've been listening.</p>
          <div className="brand-features">
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#4aa3ff', fontSize: 18 }}>psychology</span>
              </div>
              <span>AI-Powered Stress Detection</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#cebdff', fontSize: 18 }}>chat_bubble</span>
              </div>
              <span>Conversational Check-ins</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#4aa3ff', fontSize: 18 }}>insights</span>
              </div>
              <span>Track Your Wellness Journey</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p>Sign in to continue your wellness journey</p>

          {error && (
            <div style={{
              background: 'rgba(255,180,171,0.1)', border: '1px solid rgba(255,180,171,0.25)',
              borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem',
              color: '#ffb4ab', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, flexShrink: 0 }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <span className="material-symbols-rounded" style={{ fontSize: 18 }}>progress_activity</span>
                : <span className="material-symbols-rounded" style={{ fontSize: 18 }}>login</span>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="auth-link" style={{ marginTop: '1.5rem' }}>
              Don't have an account? <Link to="/register">Create one</Link>
            </p>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: '1.5rem', fontSize: '0.68rem', color: 'rgba(74,163,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'rgba(74,163,255,0.35)' }}>lock</span>
            256-bit encrypted &amp; secure
          </div>
        </div>
      </div>
    </div>
  );
}

