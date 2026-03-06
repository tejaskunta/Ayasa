import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('user', JSON.stringify({ email: formData.email, fullName: formData.email.split('@')[0] }));
    if (onLogin) onLogin();
    navigate('/home');
  };

  return (
    <div className="login-page">
      <div>
        <div className="login-card">
          <div className="login-logo">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <h1>AYASA</h1>
          <p className="subtitle">Stress Detection Assistant</p>

           <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <span className="material-symbols-outlined">mail</span>
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <span className="material-symbols-outlined">lock</span>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="forgot-password">
                <a href="#forgot">Forgot password?</a>
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>login</span>
              Sign In
            </button>
          </form>

          <p className="auth-link" style={{ marginTop: '1.5rem' }}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>

        <div className="login-footer">
          © 2024 AYASA Wellness. All rights reserved.
        </div>
      </div>
    </div>
  );
}
