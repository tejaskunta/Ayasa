import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export default function History() {
  const [history] = useState([
    {
      id: 1,
      date: 'Dec 24, 3:30 PM',
      level: 'High',
      color: '#e74c3c'
    },
    {
      id: 2,
      date: 'Dec 22, 9:10 AM',
      level: 'Moderate',
      color: '#f5b041'
    },
    {
      id: 3,
      date: 'Dec 20, 6:45 PM',
      level: 'Low',
      color: '#26d07c'
    }
  ]);

  return (
    <div className="history-container">
      <header className="navbar">
        <h2>Ayasa</h2>
      </header>

      <div className="history-content">
        <h1>History</h1>
        
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-header">
                <h3>{item.level} Stress</h3>
                <button className="btn-small">Details</button>
              </div>
              <p>{item.date}</p>
              <div 
                className="history-badge" 
                style={{ backgroundColor: item.color }}
              >
                {item.level}
              </div>
            </div>
          ))}
        </div>

        <div className="nav-buttons-row nav-bottom">
          <Link to="/checkin" className="btn-secondary">
            New Check-in
          </Link>
          <Link to="/home" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
