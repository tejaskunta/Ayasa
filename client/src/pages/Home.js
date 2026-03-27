import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [selectedMood, setSelectedMood] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const moods = [
    { icon: 'sentiment_satisfied', label: 'Good' },
    { icon: 'sentiment_neutral', label: 'Okay' },
    { icon: 'sentiment_stressed', label: 'Stressed' }
  ];

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>spa</span>
          AYASA
        </div>
        <div className="navbar-links">
          <Link to="/home" className="active">Dashboard</Link>
          <Link to="/checkin">Journal</Link>
          <Link to="/history">History</Link>
        </div>
        <div className="navbar-right">
          <button className="navbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>notifications</span>
          </button>
          <div className="navbar-avatar">
            {(user.fullName || 'U').charAt(0).toUpperCase()}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>logout</span>
            Logout
          </button>
        </div>
      </header>

      <div className="home-content">
        <div className="home-hero">
          <div className="home-hero-text">
            <h1>
              How are you <span className="highlight">feeling</span> today?
            </h1>
            <p>Let's check in on your mental wellness with a quick analysis.</p>
          </div>

          <div className="mood-selector">
            {moods.map((mood, i) => (
              <div
                key={i}
                className={`mood-item ${selectedMood === i ? 'selected' : ''}`}
                onClick={() => setSelectedMood(i)}
              >
                <div className="mood-icon">
                  <span className="material-symbols-outlined">{mood.icon}</span>
                </div>
                <span className="mood-label">{mood.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="home-cards">
          <div className="home-card stress-check">
            <div className="card-icon">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h2>Start Stress Check</h2>
            <p>
              Use our AI-based tool to analyze your stress levels
              through voice and text patterns.
            </p>
            <Link to="/checkin" className="btn-accent" style={{ textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_arrow</span>
              Start Check
            </Link>
          </div>

          <div className="home-card view-history">
            <div className="card-icon">
              <span className="material-symbols-outlined">history</span>
            </div>
            <h2>View History</h2>
            <p>
              Track your mood trends and review past analysis results
              over time.
            </p>
            <Link to="/history" className="btn-accent" style={{ textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bar_chart</span>
              View Trends
            </Link>
          </div>
        </div>

        <div className="home-bottom">
          <div className="quote-card">
            <span className="quote-mark open">"</span>
            <blockquote>
              "Quiet the mind, and the soul will speak."
            </blockquote>
            <span className="quote-mark close">"</span>
            <p className="quote-source">— Daily Inspiration</p>
          </div>

          <div className="recommendation-card">
            <div className="rec-icon">
              <span className="material-symbols-outlined">headphones</span>
            </div>
            <div className="rec-content">
              <h3>Nature Sounds</h3>
              <p>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>music_note</span>
                {' '}Recommended for you
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
