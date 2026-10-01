import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Results() {
  const [checkIn, setCheckIn] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      let email = 'default';
      try { email = JSON.parse(localStorage.getItem('user'))?.email || 'default'; } catch {}
      const raw = localStorage.getItem(`lastCheckIn_${email}`);
      if (!raw) {
        setMissing(true);
        return;
      }
      const data = JSON.parse(raw);
      if (!data) { setMissing(true); return; }
      setCheckIn(data);
    } catch (e) {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <div className="results-container">
        <header className="navbar"><h2>AYASA</h2></header>
        <div className="results-content" style={{ textAlign: 'center', paddingTop: '6rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(74,163,255,0.06)', border: '2px solid rgba(74,163,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 36, color: '#85948e' }}>search_off</span>
          </div>
          <p style={{ fontSize: '1.1rem', color: '#85948e', marginBottom: '1.5rem' }}>No check-in data found.</p>
          <Link to="/home" className="btn-primary" style={{ maxWidth: 240, margin: '0 auto', display: 'block' }}>Open Main Chat</Link>
        </div>
      </div>
    );
  }

  if (!checkIn) {
    return (
      <div className="results-container">
        <header className="navbar"><h2>AYASA</h2></header>
        <div className="results-content" style={{ textAlign: 'center', paddingTop: '6rem' }}>
          <div className="typing-indicator" style={{ margin: '0 auto 1rem' }}>
            <span></span><span></span><span></span>
          </div>
          <p style={{ color: '#85948e' }}>Analyzing your responses...</p>
        </div>
      </div>
    );
  }

  const stressColors = { Low: '#4aa3ff', Moderate: '#cebdff', High: '#ffb4ab' };
  const stressBgs    = { Low: 'rgba(74,163,255,0.06)', Moderate: 'rgba(206,189,255,0.06)', High: 'rgba(255,180,171,0.06)' };
  const stressIcons  = { Low: 'check_circle', Moderate: 'trending_flat', High: 'warning' };
  const currentLevel = checkIn.stressLevel || 'Moderate';
  const currentColor = stressColors[currentLevel] || '#cebdff';
  const rawConfidence = Number(checkIn.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? (rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)
    : 80;
  const confidenceDisplay = Math.max(0, Math.min(100, Math.round(confidence)));

  const fallbackResources = [
    { title: 'Breathing Exercise', url: 'https://themindclan.com/exercises/box-breathing-exercise-online/' },
    { title: 'Calming Playlist', url: 'https://open.spotify.com/track/0Dy7FBIZbU5pgz6KFSixML' },
  ];
  const resources = Array.isArray(checkIn.resources) && checkIn.resources.length > 0
    ? checkIn.resources
    : fallbackResources;
  const isDirectScoreQuery = Boolean(checkIn.directScoreQuery);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="results-container">
      <header className="navbar">
        <h2>AYASA</h2>
        <Link to="/home" className="btn-exit">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Home
        </Link>
      </header>

      <div className="results-content">
        <h1>
          <span className="material-symbols-rounded" style={{ fontSize: 30, verticalAlign: 'middle', marginRight: 10, color: '#4aa3ff' }}>assessment</span>
          Your Results
        </h1>

        <div className="stress-card" style={{ borderLeft: `4px solid ${currentColor}`, background: stressBgs[currentLevel] || 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(27,31,44,0.12)" strokeWidth="8" />
                <circle
                  cx="65" cy="65" r={radius} fill="none"
                  stroke={currentColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 65 65)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 800, color: currentColor, display: 'block', transform: 'translateY(-3px)' }}>{confidenceDisplay}%</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div className="stress-level-badge" style={{ backgroundColor: currentColor }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 5 }}>
                  {stressIcons[currentLevel] || 'circle'}
                </span>
                {currentLevel} Stress
              </div>
              <h2 style={{ marginTop: '0.5rem' }}>Predicted Stress Level</h2>
              {checkIn.emotion && checkIn.emotion !== 'unknown' && (
                <p style={{ marginTop: '0.5rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6, color: currentColor }}>mood</span>
                  Emotion: <strong style={{ textTransform: 'capitalize', color: '#1b1f2c' }}>{checkIn.emotion}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="assistant-card">
          <h3>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>smart_toy</span>
            AYASA says
          </h3>
          <p>
            {checkIn.ayasaResponse
              ? checkIn.ayasaResponse
              : "It sounds like you're carrying a heavy load right now. Try breaking things into smaller steps, take a short break, and remember you don't have to face this alone."}
          </p>
          {isDirectScoreQuery && (
            <p style={{ marginTop: '0.8rem', color: '#4b5e7a', fontSize: '0.88rem' }}>
              This response was generated for a direct stress-score request.
            </p>
          )}
        </div>

        <div className="suggested-resources">
          <h3>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>lightbulb</span>
            Suggested Resources
          </h3>
          <div className="resource-buttons">
            {resources.map((item, idx) => (
              <a
                key={`${item.url || item.title}-${idx}`}
                className="resource-btn"
                href={item.url || '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  {idx % 2 === 0 ? 'air' : 'self_improvement'}
                </span>
                {item.title || 'Support Resource'}
              </a>
            ))}
          </div>
        </div>

        <div className="nav-buttons-row">
          <Link to="/home" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>forum</span>
            Open Main Chat
          </Link>
          <Link to="/home" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>timeline</span>
            Open Main Chat
          </Link>
          <Link to="/home" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>home</span>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

