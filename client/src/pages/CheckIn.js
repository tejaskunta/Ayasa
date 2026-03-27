import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

export default function CheckIn() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: "Welcome to your sanctuary. I'm here to help you understand your stress level. Let's have a mindful conversation." },
    { id: 2, type: 'bot', text: 'How are you feeling right now?' }
  ]);
  const [input, setInput] = useState('');
  const [conversationPhase, setConversationPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({ feeling: '', trigger: '', physical: '' });
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getUserEmail = () => {
    try { return JSON.parse(localStorage.getItem('user'))?.email || 'default'; }
    catch { return 'default'; }
  };

  const saveCheckIn = (data) => {
    const email = getUserEmail();
    localStorage.setItem(`lastCheckIn_${email}`, JSON.stringify(data));
    const existing = JSON.parse(localStorage.getItem(`history_${email}`) || '[]');
    existing.unshift(data);
    localStorage.setItem(`history_${email}`, JSON.stringify(existing));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading && conversationPhase <= 2) inputRef.current?.focus();
  }, [loading, conversationPhase]);

  const questions = [
    'How are you feeling right now?',
    "What's been triggering your stress lately?",
    'Are you experiencing any physical symptoms (headache, tension, etc)?',
  ];
  const phaseLabels = ['Feelings', 'Triggers', 'Symptoms'];
  const phaseIcons  = ['mood', 'bolt', 'monitor_heart'];
  const phaseTags   = [
    { emotion: 'Listening', stress: 'Assessing' },
    { emotion: 'Empathy', stress: 'Analyzing' },
    { emotion: 'Attentive', stress: 'Processing' },
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: messages.length + 1, type: 'user', text: input, time: new Date() };
    setMessages([...messages, userMessage]);

    if (conversationPhase === 0) setUserData({ ...userData, feeling: input });
    else if (conversationPhase === 1) setUserData({ ...userData, trigger: input });
    else if (conversationPhase === 2) setUserData({ ...userData, physical: input });

    let botResponse = '';
    let nextPhase = conversationPhase + 1;

    if (conversationPhase === 0) {
      botResponse = 'I understand. ' + questions[1];
    } else if (conversationPhase === 1) {
      botResponse = 'Thank you for sharing. ' + questions[2];
    } else if (conversationPhase === 2) {
      botResponse = 'Got it. Let me analyze your responses with AYASA intelligence...';
      nextPhase = conversationPhase;
      const combinedMessage = `${userData.feeling}. ${userData.trigger}. ${input}`;

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
          saveCheckIn({
            feeling: userData.feeling, trigger: userData.trigger, physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: result.stressLevel || 'Moderate',
            emotion: result.emotion || 'unknown',
            confidence: result.confidence || 80,
            ayasaResponse: result.ayasaResponse || '',
          });
        } catch (err) {
          const levels = ['Low', 'Moderate', 'High'];
          saveCheckIn({
            feeling: userData.feeling, trigger: userData.trigger, physical: input,
            timestamp: new Date().toLocaleString(),
            stressLevel: levels[Math.floor(Math.random() * 3)],
            emotion: 'unknown', confidence: 80,
            ayasaResponse: 'I was unable to reach the analysis server. Please try again when the ML backend is running.',
          });
        } finally {
          setLoading(false);
          navigate('/results');
        }
      }, 400);
    }

    if (nextPhase <= conversationPhase) nextPhase = conversationPhase;

    setMessages(prev => [...prev, {
      id: prev.length + 2, type: 'bot', text: botResponse, time: new Date(),
      tags: phaseTags[Math.min(conversationPhase, 2)]
    }]);
    setConversationPhase(nextPhase);
    setInput('');
  };

  const formatTime = (d) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="sanctuary-chat">
      {/* Background layers */}
      <div className="sanctuary-grain" />
      <div className="sanctuary-aurora" />

      {/* Header */}
      <header className="sanctuary-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/home" className="sanctuary-back">
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, Noto Serif, serif', fontSize: '1.15rem', fontWeight: 700, color: '#dfe2f3', margin: 0 }}>
              Wellness Sanctuary
            </h2>
            <span style={{ fontSize: '0.6rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#44e5c2' }}>
              Active Insight Mode
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Phase Pills */}
          <div className="sanctuary-phases">
            {phaseLabels.map((label, i) => {
              const isDone   = conversationPhase > i;
              const isActive = conversationPhase === i;
              return (
                <div key={label} className={`sanctuary-phase${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{isDone ? 'check_circle' : phaseIcons[i]}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <Link to="/home" style={{ color: '#85948e', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, textDecoration: 'none' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
          </Link>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="sanctuary-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`sanc-msg sanc-msg-${msg.type}`}>
            {msg.type === 'bot' ? (
              <div className="sanc-bot-row">
                <div className="sanc-bot-avatar">
                  <span className="material-symbols-rounded" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="sanc-bot-content">
                  <span className="sanc-bot-label">AYASA Intelligence</span>
                  <div className="sanc-bot-bubble">
                    <div className="sanc-bot-bubble-gradient" />
                    <p style={{ position: 'relative', zIndex: 1 }}>{msg.text}</p>
                  </div>
                  {msg.tags && (
                    <div className="sanc-tags">
                      <span className="sanc-tag sanc-tag-emotion">{msg.tags.emotion}</span>
                      <span className="sanc-tag sanc-tag-stress">{msg.tags.stress}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sanc-user-row">
                <div className="sanc-user-bubble">
                  <p>{msg.text}</p>
                </div>
                <span className="sanc-msg-time">{formatTime(msg.time)}</span>
              </div>
            )}
          </div>
        ))}

        {/* Premium Typing Indicator */}
        {loading && (
          <div className="sanc-msg sanc-msg-bot">
            <div className="sanc-bot-row">
              <div className="sanc-bot-avatar pulsing">
                <span className="material-symbols-rounded" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div className="sanc-bot-content">
                <span className="sanc-bot-label" style={{ opacity: 0.6 }}>Processing...</span>
                <div className="sanc-typing-bubble">
                  <div className="sanc-typing-dots">
                    <span className="dot dot-1" /><span className="dot dot-2" /><span className="dot dot-3" />
                  </div>
                </div>
                <p className="sanc-analyzing-text">AYASA is analyzing your emotional patterns...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="sanctuary-input-area">
        <form onSubmit={handleSendMessage} className="sanctuary-input-form">
          <div className="sanctuary-input-glow" />
          <div className="sanctuary-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={conversationPhase > 2 ? 'Analyzing your responses...' : 'Share your thoughts...'}
              disabled={conversationPhase > 2 || loading}
              className="sanctuary-input"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 6 }}>
              <span style={{ fontSize: '0.6rem', fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'rgba(133,148,142,0.4)', whiteSpace: 'nowrap' }}>
                {input.length} / 2000
              </span>
              <button
                type="submit"
                disabled={conversationPhase > 2 || loading || !input.trim()}
                className="sanctuary-send-btn"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_upward</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
