import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function CheckIn() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi there! I\'m here to help you understand your stress level. Let\'s chat for a moment.'
    },
    {
      id: 2,
      type: 'bot',
      text: 'How are you feeling right now?'
    }
  ]);
  const [input, setInput] = useState('');
  const [conversationPhase, setConversationPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    feeling: '',
    trigger: '',
    physical: ''
  });
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const questions = [
    'How are you feeling right now?',
    'What\'s been triggering your stress lately?',
    'Are you experiencing any physical symptoms (headache, tension, etc)?',
  ];

  const phaseLabels = ['Feelings', 'Triggers', 'Symptoms'];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input
    };

    setMessages([...messages, userMessage]);

    if (conversationPhase === 0) {
      setUserData({ ...userData, feeling: input });
    } else if (conversationPhase === 1) {
      setUserData({ ...userData, trigger: input });
    } else if (conversationPhase === 2) {
      setUserData({ ...userData, physical: input });
    }

    let botResponse = '';
    let nextPhase = conversationPhase + 1;

    if (conversationPhase === 0) {
      botResponse = 'I understand. ' + questions[1];
    } else if (conversationPhase === 1) {
      botResponse = 'Thank you for sharing. ' + questions[2];
    } else if (conversationPhase === 2) {
      botResponse = 'Got it! Let me analyze your responses with AYASA...';
      nextPhase = conversationPhase;

      const combinedMessage =
        `${userData.feeling}. ${userData.trigger}. ${input}`;

      setTimeout(async () => {
        setLoading(true);
        try {
          const response = await fetch('http://localhost:5000/api/checkin/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            userInput: combinedMessage,
            geminiApiKey: localStorage.getItem('geminiApiKey') || '',
          }),
          });
          const data = await response.json();
          const result = data.result || {};

          const fullUserData = {
            feeling: userData.feeling,
            trigger: userData.trigger,
            physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: result.stressLevel || 'Moderate',
            emotion:    result.emotion    || 'unknown',
            confidence: result.confidence || 80,
            ayasaResponse: result.ayasaResponse || '',
          };
          localStorage.setItem('lastCheckIn', JSON.stringify(fullUserData));
        } catch (err) {
          const levels = ['Low', 'Moderate', 'High'];
          localStorage.setItem('lastCheckIn', JSON.stringify({
            feeling: userData.feeling,
            trigger: userData.trigger,
            physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: levels[Math.floor(Math.random() * 3)],
            emotion: 'unknown',
            confidence: 80,
            ayasaResponse: 'I was unable to reach the analysis server. Please try again when the ML backend is running.',
          }));
        } finally {
          setLoading(false);
          navigate('/results');
        }
      }, 400);
    }

    if (nextPhase <= conversationPhase) {
      nextPhase = conversationPhase;
    }

    setMessages(prev => [...prev, {
      id: prev.length + 2,
      type: 'bot',
      text: botResponse
    }]);

    setConversationPhase(nextPhase);
    setInput('');
  };

  return (
    <div className="checkin-container">
      <header className="navbar">
        <h2>AYASA</h2>
        <Link to="/home" className="btn-exit">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Exit
        </Link>
      </header>

      {/* Phase progress indicator */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16, padding: '1.25rem 1rem 0.5rem',
        position: 'relative', zIndex: 1
      }}>
        {phaseLabels.map((label, i) => {
          const isDone = conversationPhase > i;
          const isActive = conversationPhase === i;
          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: conversationPhase >= i ? 1 : 0.35,
              transition: 'opacity 0.3s ease'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isDone
                  ? 'linear-gradient(135deg, #065f46, #34d399)'
                  : isActive
                    ? 'rgba(68,229,194,0.12)' : 'rgba(68,229,194,0.04)',
                border: conversationPhase >= i
                  ? `2px solid ${isDone ? 'rgba(110,231,183,0.8)' : '#44e5c2'}`
                  : '2px solid rgba(68,229,194,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: isDone ? '#fff' : '#44e5c2',
                transition: 'all 0.3s ease',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: conversationPhase >= i ? '#44e5c2' : '#85948e',
                letterSpacing: '0.04em',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message message-${msg.type}`}>
              {msg.type === 'bot' && (
                <div className="bot-avatar">
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>spa</span>
                </div>
              )}
              <div className="message-content">
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message message-bot">
              <div className="bot-avatar">
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>spa</span>
              </div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={conversationPhase > 2 ? 'Analyzing...' : 'Share your thoughts...'}
              className="chat-input"
              disabled={conversationPhase > 2 || loading}
            />
            <button type="submit" className="send-btn" disabled={conversationPhase > 2 || loading}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
