import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [selectedMood, setSelectedMood] = useState(null);
  const [geminiKey, setGeminiKey]       = useState(localStorage.getItem('geminiApiKey') || '');
  const [keySaved, setKeySaved]         = useState(!!localStorage.getItem('geminiApiKey'));
  const [showKey, setShowKey]           = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const saveGeminiKey = () => {
    const trimmed = geminiKey.trim();
    if (!trimmed) return;
    localStorage.setItem('geminiApiKey', trimmed);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
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
          {/* Gemini API Key */}
          <div className="quote-card" style={{ padding: '1.5rem 1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.9rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#cebdff', fontSize: 20 }}>key</span>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#dfe2f3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Gemini API Key
              </h3>
              {localStorage.getItem('geminiApiKey') && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700,
                  color: '#44e5c2', background: 'rgba(68,229,194,0.08)',
                  border: '1px solid rgba(68,229,194,0.2)', borderRadius: 20,
                  padding: '2px 10px', letterSpacing: '0.04em',
                  fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}>ACTIVE</span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#85948e', margin: '0 0 0.9rem', fontFamily: 'DM Sans, sans-serif' }}>
              Required for AI-powered responses. Get yours at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                style={{ color: '#cebdff', textDecoration: 'none' }}>aistudio.google.com</a>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => { setGeminiKey(e.target.value); setKeySaved(false); }}
                  placeholder="AIza..."
                  style={{
                    width: '100%', background: 'rgba(10,14,26,0.6)',
                    border: '1px solid rgba(68,229,194,0.15)', borderRadius: 10,
                    padding: '0.6rem 2.4rem 0.6rem 0.85rem', color: '#dfe2f3',
                    fontSize: '0.82rem', fontFamily: 'DM Sans, monospace', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={e => e.key === 'Enter' && saveGeminiKey()}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#85948e', display: 'flex', alignItems: 'center'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {showKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <button
                onClick={saveGeminiKey}
                disabled={!geminiKey.trim()}
                style={{
                  padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: keySaved
                    ? 'rgba(68,229,194,0.15)' : 'rgba(206,189,255,0.12)',
                  color: keySaved ? '#44e5c2' : '#cebdff',
                  fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  {keySaved ? 'check_circle' : 'save'}
                </span>
                {keySaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

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
