import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

const stressColors = { Low: '#44e5c2', Moderate: '#cebdff', High: '#ffb4ab' };
const stressIcons  = { Low: 'check_circle', Moderate: 'trending_flat', High: 'warning' };

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let email = 'default';
    try { email = JSON.parse(localStorage.getItem('user'))?.email || 'default'; } catch {}
    const raw = localStorage.getItem(`history_${email}`);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        setHistory(Array.isArray(arr) ? arr : []);
      } catch { setHistory([]); }
    }
  }, []);

  return (
    <div className="history-container">
      <header className="navbar">
        <h2>AYASA</h2>
        <Link to="/home" className="btn-exit">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Home
        </Link>
      </header>

      <div className="history-content">
        <h1>
          <span className="material-symbols-rounded" style={{ fontSize: 30, verticalAlign: 'middle', marginRight: 10, color: '#cebdff' }}>timeline</span>
          Your Journey
        </h1>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(68,229,194,0.06)', border: '2px solid rgba(68,229,194,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 36, color: '#85948e' }}>history</span>
            </div>
            <p style={{ color: '#85948e', fontSize: '1rem', marginBottom: '0.5rem' }}>No check-ins yet.</p>
            <p style={{ color: '#3c4a45', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Complete your first stress check to see your journey here.</p>
            <Link to="/checkin" className="btn-accent" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>play_arrow</span>
              Start Your First Check-in
            </Link>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => {
              const level = item.stressLevel || 'Moderate';
              const color = stressColors[level] || '#cebdff';
              const icon  = stressIcons[level] || 'trending_flat';
              const summary = item.feeling || 'Check-in completed';
              return (
                <div
                  key={index}
                  className="history-item"
                  style={{
                    borderLeft: `4px solid ${color}`,
                    animation: `fadeSlideIn 0.5s ease ${index * 0.1}s both`
                  }}
                >
                  <div className="history-header">
                    <h3>
                      <span className="material-symbols-rounded" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 8, color }}>
                        {icon}
                      </span>
                      {level} Stress
                    </h3>
                    <div className="history-badge" style={{ backgroundColor: color }}>
                      {level}
                    </div>
                  </div>
                  <p style={{ color: '#85948e', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{summary}</p>
                  <p>
                    <span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 5, color: '#3c4a45' }}>schedule</span>
                    {item.timestamp || 'Unknown date'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="nav-buttons-row nav-bottom">
          <Link to="/checkin" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add_circle</span>
            New Check-in
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
