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
    // Mock login - navigate to home
    localStorage.setItem('user', JSON.stringify({ email: formData.email, fullName: 'Demo User' }));
    navigate('/home');
  };

  const quickNavigate = (path) => {
    localStorage.setItem('user', JSON.stringify({ email: formData.email, fullName: 'Demo User' }));
    // Seed demo data so Results page isn't empty
    if (path === '/results') {
      localStorage.setItem('lastCheckIn', JSON.stringify({
        feeling: 'overwhelmed',
        trigger: 'upcoming exams',
        physical: 'headache',
        timestamp: new Date().toLocaleString(),
        stressLevel: 'High',
        emotion: 'fear',
        confidence: 88,
        ayasaResponse: "It sounds like you're under a lot of pressure right now. Try breaking your tasks into smaller steps and remember to take short breaks — you're doing better than you think.",
      }));
    }
    navigate(path);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p>Enter your credentials to access your account</p>
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
            Login
          </button>
          <p className="auth-link" style={{ marginTop: '1rem' }}>
            Don't have an account? <Link to="/register">Sign up here</Link>
          </p>
        </form>

        <div className="demo-navigation">
          <p className="demo-label">Quick Demo Tour:</p>
          <div className="demo-buttons">
            <button onClick={() => quickNavigate('/home')} className="demo-btn">Home</button>
            <button onClick={() => quickNavigate('/checkin')} className="demo-btn">Check-in</button>
            <button onClick={() => quickNavigate('/results')} className="demo-btn">Results</button>
            <button onClick={() => quickNavigate('/history')} className="demo-btn">History</button>
          </div>
        </div>
      </div>
    </div>
  );
}
