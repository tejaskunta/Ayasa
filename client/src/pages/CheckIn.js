import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function CheckIn() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const maxChars = 5000;

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);

    // Simulate analysis
    setTimeout(() => {
      const stressLevel = Math.floor(Math.random() * 3);
      const confidence = (80 + Math.random() * 20).toFixed(0);
      const checkInData = {
        text: text,
        timestamp: new Date().toISOString(),
        stressLevel,
        confidence,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      localStorage.setItem('lastCheckIn', JSON.stringify(checkInData));

      // Save to history
      const history = JSON.parse(localStorage.getItem('checkInHistory') || '[]');
      history.unshift({ ...checkInData, id: Date.now() });
      localStorage.setItem('checkInHistory', JSON.stringify(history));

      navigate('/results');
    }, 1500);
  };

  return (
    <div className="checkin-page">
      {/* Floating background blobs */}
      <div className="floating-blob blob-1" />
      <div className="floating-blob blob-2" />
      <div className="floating-blob blob-3" />

      <header className="navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined">spa</span> AYASA
        </div>
        <div className="navbar-links">
          <Link to="/home">Dashboard</Link>
          <Link to="/history">History</Link>
        </div>
        <div className="navbar-right">
          <button className="navbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>notifications</span>
          </button>
          <div className="navbar-avatar">U</div>
        </div>
      </header>

      <div className="checkin-content">
        <div className="checkin-card">
          <div className="checkin-icon">
            <span className="material-symbols-outlined">self_improvement</span>
          </div>
          <h1>Tell us what's on your mind</h1>
          <p className="subtitle">
            Share your thoughts freely. Our AI is here to listen
            and help you understand your stress levels.
          </p>

          <div className="checkin-textarea-wrapper">
            <textarea
              className="checkin-textarea"
              placeholder="I'm feeling overwhelmed because..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              maxLength={maxChars}
            />
            <div className="textarea-footer">
              <button className="mic-button" type="button" title="Voice input">
                <span className="material-symbols-outlined">mic</span>
                Voice Input
              </button>
              <span className="char-count">{text.length} / {maxChars}</span>
            </div>
          </div>

          <div className="checkin-actions">
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={!text.trim() || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', animation: 'pulse-dot 1s ease-in-out infinite' }}>hourglass_top</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>psychology</span>
                  Analyze Stress
                </>
              )}
            </button>
          </div>
        </div>

        <div className="checkin-privacy">
          <span className="material-symbols-outlined">lock</span>
          Your entries are private and encrypted.
        </div>
      </div>

      <footer className="checkin-footer">
        <div className="checkin-footer-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#crisis">Crisis Support</a>
        </div>
        <p>© 2024 AYASA Wellness. All rights reserved.</p>
      </footer>
    </div>
  );
}

