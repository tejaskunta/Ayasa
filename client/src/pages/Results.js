import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Results() {
  const [checkIn, setCheckIn] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('lastCheckIn'));
    setCheckIn(data);
  }, []);

  if (!checkIn) {
    return (
      <div className="results-page">
        <header className="navbar">
          <div className="navbar-brand">
            <span className="material-symbols-outlined">spa</span> AYASA
          </div>
          <div className="navbar-right">
            <div className="navbar-avatar">U</div>
          </div>
        </header>
        <div className="results-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <h2>No results yet</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Complete a stress check-in to see your analysis.</p>
          <Link to="/checkin" className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>self_improvement</span>
            Start Check-in
          </Link>
        </div>
      </div>
    );
  }

  const stressLevels = ['Low', 'Medium', 'High'];
  const stressBadgeClass = ['low', 'moderate', 'high'];
  const stressDescriptions = [
    'Your indicators suggest a low level of stress. Keep up the great work maintaining your well-being!',
    'Your indicators suggest a moderate level of stress. This is often a sign of high engagement but requires balance to prevent burnout.',
    'Your indicators suggest a high level of stress. It\'s important to take steps to manage your stress levels.'
  ];
  const aiFeedback = [
    'You seem to be in a good place right now. Keep nurturing your mental well-being with regular breaks and mindfulness practices.',
    'It looks like you\'re carrying a moderate amount of tension today. It\'s completely normal to feel this way during busy periods. Let\'s focus on grounding yourself with some simple exercises before you continue your day.',
    'It sounds like you are carrying a heavy load right now. Recognizing that you are overwhelmed is a brave first step. Remember that it is perfectly okay to take breaks and ask for help.'
  ];

  const currentLevel = stressLevels[checkIn.stressLevel];
  const badgeClass = stressBadgeClass[checkIn.stressLevel];
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // SVG circle math
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const confidenceValue = parseInt(checkIn.confidence);
  const dashOffset = circumference - (confidenceValue / 100) * circumference;

  const resources = [
    { icon: 'self_improvement', title: 'Box Breathing', desc: 'Simple technique to regain control and calm your nerves instantly.', link: 'Start Exercise →', duration: '5 min', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { icon: 'menu_book', title: 'Understanding Anxiety', desc: 'Learn why your body reacts this way and how to mitigate it.', link: 'Read Article →', bg: 'linear-gradient(135deg, #f093fb, #f5576c)' },
    { icon: 'fitness_center', title: 'Desk Stretches', desc: '3-minute routine to release physical tension from work.', link: 'Watch Video →', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)' }
  ];

  return (
    <div className="results-page">
      <header className="navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined">spa</span> AYASA
        </div>
        <div className="navbar-links">
          <Link to="/home">Dashboard</Link>
          <Link to="/history">History</Link>
        </div>
        <div className="navbar-right">
          <button className="navbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>notifications</span>
          </button>
          <div className="navbar-avatar">
            {(user.fullName || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.fullName || 'User'}</span>
        </div>
      </header>

      <div className="results-content">
        <div className="results-header">
          <div className="results-badge">
            <span className="material-symbols-outlined">check_circle</span>
            ANALYSIS COMPLETE
          </div>
          <h1>Your Stress Analysis Report</h1>
          <p>Based on your recent check-in and text analysis.</p>
        </div>

        <div className="results-grid">
          <div className="results-main">
            <div className="stress-result-card">
              <div className="stress-result-info">
                <div className="stress-label">Predicted Stress Level</div>
                <div className="stress-level-text">
                  {currentLevel}
                  <span className={`stress-level-badge ${badgeClass}`}>
                    {badgeClass.toUpperCase()}
                  </span>
                </div>
                <p className="stress-desc">{stressDescriptions[checkIn.stressLevel]}</p>
              </div>
              <div className="confidence-circle">
                <svg viewBox="0 0 110 110">
                  <circle className="circle-bg" cx="55" cy="55" r={radius} />
                  <circle
                    className={`circle-fill ${badgeClass}`}
                    cx="55" cy="55" r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <span className="value">{checkIn.confidence}%</span>
                <span className="label">Confidence</span>
              </div>
            </div>

            <div className="ai-assistant-card">
              <div className="ai-assistant-header">
                <div className="ai-avatar">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <span className="ai-name">AYASA AI Assistant</span>
                <span className="ai-live-badge">LIVE</span>
              </div>
              <p>{aiFeedback[checkIn.stressLevel]}</p>
            </div>
          </div>

          <div className="results-sidebar">
            <div className="recommended-section">
              <h3>
                Recommended for You
                <a href="#viewall">View all</a>
              </h3>
              {resources.map((res, i) => (
                <div className="resource-card" key={i}>
                  <div className="resource-thumb" style={{ background: res.bg }}>
                    <span className="material-symbols-outlined">{res.icon}</span>
                    {res.duration && <span className="duration">{res.duration}</span>}
                  </div>
                  <div className="resource-info">
                    <h4>{res.title}</h4>
                    <p>{res.desc}</p>
                    <span className="resource-link">{res.link}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="results-actions">
              <Link to="/home" className="btn-primary" style={{ textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>dashboard</span>
                Go to Dashboard
              </Link>
              <Link to="/checkin" className="btn-secondary" style={{ textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
                Check Again
              </Link>
            </div>
          </div>
        </div>

        <div className="login-footer" style={{ marginTop: '2rem' }}>
          © 2024 AYASA Wellness. All rights reserved.
        </div>
      </div>
    </div>
  );
}
