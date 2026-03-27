import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: ''
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/home');
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
          <div className="brand-logo-ring">
            <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 40 }}>spa</span>
          </div>
          <h1>AYASA</h1>
          <p>Begin your journey to emotional clarity.</p>
          <div className="brand-features">
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 18 }}>shield</span>
              </div>
              <span>Private &amp; Secure</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#cebdff', fontSize: 18 }}>auto_awesome</span>
              </div>
              <span>AI-Powered Empathy</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-icon">
                <span className="material-symbols-rounded" style={{ color: '#44e5c2', fontSize: 18 }}>favorite</span>
              </div>
              <span>Always Here For You</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Create Account</h1>
          <p>Start your wellness journey today</p>

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
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Jane Doe"
                required
                autoComplete="name"
              />
            </div>
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
            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 chars"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label>Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <span className="material-symbols-rounded" style={{ fontSize: 18 }}>progress_activity</span>
                : <span className="material-symbols-rounded" style={{ fontSize: 18 }}>person_add</span>}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="auth-link" style={{ marginTop: '1.5rem' }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
