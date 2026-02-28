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
    return <div>Loading...</div>;
  }

  const stressLevels = ['Low', 'Moderate', 'High'];
  const stressColors = ['#26d07c', '#f5b041', '#e74c3c'];
  const currentLevel = stressLevels[checkIn.stressLevel];
  const currentColor = stressColors[checkIn.stressLevel];

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
          <p>Confidence Score: {checkIn.confidence}%</p>
        </div>

        <div className="assistant-card">
          <h3>Assistant</h3>
          <p>
            It sounds like you're carrying a heavy load right now. The pressure from work combined with lack of sleep is a common trigger for high stress. Here are some suggestions:
          </p>
          <ul>
            <li>Breathing Exercise</li>
            <li>Calming Playlist</li>
          </ul>
          <button className="btn-secondary">Check Again</button>
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
