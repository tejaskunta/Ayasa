import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: 'user@example.com',
    password: '••••••••'
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('user', JSON.stringify({ email: formData.email, fullName: 'Demo User' }));
    navigate('/home');
  };

  return (
    <div className="auth-container">
      <div className="auth-brand-panel">
        <div className="brand-content">
          <div className="brand-logo-ring">
            <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 40 }}>spa</span>
          </div>
          <h1>AYASA</h1>
          <p>Welcome back. We've been listening.</p>
          <div className="brand-features">
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 18 }}>psychology</span>
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
                <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 18 }}>insights</span>
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
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>login</span>
              Sign In
            </button>
            <p className="auth-link" style={{ marginTop: '1.5rem' }}>
              Don't have an account? <Link to="/register">Create one</Link>
            </p>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: '1.5rem', fontSize: '0.68rem', color: 'rgba(68,229,194,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'rgba(68,229,194,0.35)' }}>lock</span>
            256-bit encrypted &amp; secure
          </div>
        </div>
      </div>
    </div>
  );
}
