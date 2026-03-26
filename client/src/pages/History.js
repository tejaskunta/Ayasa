import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export default function History() {
  const [history] = useState([
    {
      id: 1,
      date: 'Dec 24, 3:30 PM',
      level: 'High',
      color: '#ffb4ab',
      icon: 'warning',
      summary: 'Feeling overwhelmed with deadlines'
    },
    {
      id: 2,
      date: 'Dec 22, 9:10 AM',
      level: 'Moderate',
      color: '#cebdff',
      icon: 'trending_flat',
      summary: 'Mild tension from work pressure'
    },
    {
      id: 3,
      date: 'Dec 20, 6:45 PM',
      level: 'Low',
      color: '#44e5c2',
      icon: 'check_circle',
      summary: 'Relaxed after weekend rest'
    }
  ]);

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

        <div className="history-list">
          {history.map((item, index) => (
            <div
              key={item.id}
              className="history-item"
              style={{
                borderLeft: `4px solid ${item.color}`,
                animationDelay: `${index * 0.1}s`,
                animation: `fadeSlideIn 0.5s ease ${index * 0.1}s both`
              }}
            >
              <div className="history-header">
                <h3>
                  <span className="material-symbols-rounded" style={{ fontSize: 22, verticalAlign: 'middle', marginRight: 8, color: item.color }}>
                    {item.icon}
                  </span>
                  {item.level} Stress
                </h3>
                <div
                  className="history-badge"
                  style={{ backgroundColor: item.color }}
                >
                  {item.level}
                </div>
              </div>
              <p style={{ color: '#85948e', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{item.summary}</p>
              <p>
                <span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 5, color: '#3c4a45' }}>schedule</span>
                {item.date}
              </p>
            </div>
          ))}
        </div>

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
