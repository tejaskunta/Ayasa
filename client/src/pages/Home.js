import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [apiKey, setApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [keyVisible, setKeyVisible] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSaveKey = () => {
    localStorage.setItem('geminiApiKey', apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('geminiApiKey');
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

        {/* ── Gemini API Key Settings ── */}
        <div className="api-key-card">
          <div className="api-key-header" onClick={() => setKeyVisible(!keyVisible)}>
            <span>🔑 Gemini API Key</span>
            <span className={`api-key-status ${localStorage.getItem('geminiApiKey') ? 'connected' : 'not-set'}`}>
              {localStorage.getItem('geminiApiKey') ? '✅ Connected' : '⚠️ Not set'}
            </span>
            <span className="api-key-toggle">{keyVisible ? '▲' : '▼'}</span>
          </div>

          {keyVisible && (
            <div className="api-key-body">
              <p className="api-key-hint">
                Enter your <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> key to enable real AI responses from Gemini.
              </p>
              <div className="api-key-input-row">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="api-key-input"
                />
                <button onClick={handleSaveKey} className="btn-save-key">
                  {keySaved ? '✓ Saved!' : 'Save'}
                </button>
                {apiKey && (
                  <button onClick={handleClearKey} className="btn-clear-key">Clear</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
