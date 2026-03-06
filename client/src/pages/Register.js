import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { level: 0, label: '', class: '' };
    if (pwd.length < 4) return { level: 1, label: 'Weak', class: 'weak' };
    if (pwd.length < 6) return { level: 2, label: 'Fair', class: 'fair' };
    if (pwd.length < 8) return { level: 3, label: 'Good', class: 'good' };
    return { level: 4, label: 'Strong', class: 'strong' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    localStorage.setItem('user', JSON.stringify({
      fullName: formData.fullName,
      email: formData.email
    }));
    if (onLogin) onLogin();
    navigate('/home');
  };

  return (
    <div className="register-page">
      <div className="register-navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined">spa</span> AYASA
        </div>
        <span className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </span>
      </div>

      <div className="register-left">
        <div className="register-hero">
          <span className="tag">
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>target</span>
            AI STRESS DETECTION
          </span>
          <h2>Find your balance.</h2>
          <p>
            Join thousands using AYASA to monitor stress levels
            and improve mental well-being daily.
          </p>
          <div className="register-hero-stats">
            <div className="avatars">
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span>+2k</span>
            </div>
            <p>Trusted by <strong>2,000+ users</strong></p>
          </div>
        </div>
      </div>

      <div className="register-right">
        <div className="register-card">
          <h1>Create Account</h1>
          <p className="subtitle">Start your journey to better mental wellness today.</p>

          <div className="oauth-buttons">
            <button className="oauth-btn" type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#4285f4' }}>g_mobiledata</span>
              Google
            </button>
            <button className="oauth-btn" type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>phone_iphone</span>
              Apple
            </button>
          </div>

          <div className="divider">Or continue with email</div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <span className="material-symbols-outlined">person</span>
                </span>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
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
                  placeholder="••••••••"
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
              {formData.password && (
                <div className="password-strength">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`strength-bar ${i <= strength.level ? `active ${strength.class}` : ''}`}
                    />
                  ))}
                  <span className="strength-label" style={{ color: strength.level >= 3 ? '#4caf50' : strength.level >= 2 ? '#ff9800' : '#ef5350' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <span className="material-symbols-outlined">enhanced_encryption</span>
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <label className="terms-check">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
              />
              <span>
                I agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>
              </span>
            </label>

            <button type="submit" className="btn-primary" disabled={!agreedTerms}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>how_to_reg</span>
              Create Account
            </button>
          </form>
        </div>
      </div>

      <div className="login-footer" style={{ position: 'fixed', bottom: '1rem', left: 0, right: 0 }}>
        © 2024 AYASA Wellness. All rights reserved.
      </div>
    </div>
  );
}
