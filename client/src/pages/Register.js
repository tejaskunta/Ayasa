import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: '••••••',
    confirmPassword: '••••••'
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password === formData.confirmPassword) {
      localStorage.setItem('user', JSON.stringify({
        fullName: formData.fullName,
        email: formData.email
      }));
      navigate('/home');
    } else {
      alert('Passwords do not match');
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
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
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
            <div className="form-row">
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
              <div className="form-group">
                <label>Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>person_add</span>
              Create Account
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
