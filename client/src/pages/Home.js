import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <h2>Ayasa</h2>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </header>

      <div className="home-content">
        <div className="welcome-card">
          <div className="avatar-circle">👤</div>
          <h1>Hello, {user.fullName || 'User'}</h1>
          <p>Ready to check in on your mental well-being today?</p>
          
          <div className="action-buttons">
            <Link to="/checkin" className="btn-primary">
              Start Stress Check
            </Link>
            <Link to="/history" className="btn-secondary">
              View History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
