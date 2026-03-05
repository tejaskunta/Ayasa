import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Results() {
  const [checkIn, setCheckIn] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastCheckIn');
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
        <header className="navbar"><h2>Ayasa</h2></header>
        <div className="results-content" style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <p style={{ fontSize: '1.1rem', color: '#666' }}>No check-in data found.</p>
          <a href="/checkin" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Start a Check-in</a>
        </div>
      </div>
    );
  }

  if (!checkIn) {
    return (
      <div className="results-container">
        <header className="navbar"><h2>Ayasa</h2></header>
        <div className="results-content" style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <p>Analyzing your responses...</p>
        </div>
      </div>
    );
  }

  const stressColors = { Low: '#26d07c', Moderate: '#f5b041', High: '#e74c3c' };
  const currentLevel = checkIn.stressLevel || 'Moderate';
  const currentColor = stressColors[currentLevel] || '#f5b041';

  return (
    <div className="results-container">
      <header className="navbar">
        <h2>Ayasa</h2>
      </header>

      <div className="results-content">
        <h1>Results</h1>
        
        <div className="stress-card" style={{ borderLeft: `4px solid ${currentColor}` }}>
          <div className="stress-level-badge" style={{ backgroundColor: currentColor }}>
            {currentLevel}
          </div>
          <h2>Predicted Stress Level</h2>
          {checkIn.emotion && checkIn.emotion !== 'unknown' && (
            <p>Detected Emotion: <strong style={{ textTransform: 'capitalize' }}>{checkIn.emotion}</strong></p>
          )}
          <p>Confidence Score: {checkIn.confidence}%</p>
        </div>

        <div className="assistant-card">
          <h3>AYASA says</h3>
          <p>
            {checkIn.ayasaResponse
              ? checkIn.ayasaResponse
              : "It sounds like you're carrying a heavy load right now. Try breaking things into smaller steps, take a short break, and remember you don't have to face this alone."}
          </p>
        </div>

        <div className="suggested-resources">
          <h3>Suggested Resources</h3>
          <div className="resource-buttons">
            <button className="resource-btn">Breathing Exercise</button>
            <button className="resource-btn">Calming Playlist</button>
          </div>
        </div>

        <div className="nav-buttons-row">
          <Link to="/history" className="btn-secondary">
            View History
          </Link>
          <Link to="/home" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
