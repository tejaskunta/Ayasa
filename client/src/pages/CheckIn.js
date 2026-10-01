import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API_BASE from '../utils/api';
import '../styles/pages.css';

const initialMessages = [
  { id: 1, type: 'bot', text: "Welcome to your sanctuary. I'm here to help you understand your stress level. Let's have a mindful conversation." },
  { id: 2, type: 'bot', text: 'How are you feeling right now?' },
];

const initialUserData = { feeling: '', trigger: '', physical: '' };

export default function CheckIn() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [conversationPhase, setConversationPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(initialUserData);
  const [resultsLinkShown, setResultsLinkShown] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [aiRuntime, setAiRuntime] = useState({ loading: true, available: false, geminiActive: false });
  const [aiDelivery, setAiDelivery] = useState({ mode: 'unknown', detail: 'Waiting for first reply.' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getUserEmail = () => {
    try { return JSON.parse(localStorage.getItem('user'))?.email || 'default'; }
    catch { return 'default'; }
  };

  const fallbackResources = [
    { title: 'Box Breathing Exercise', url: 'https://themindclan.com/exercises/box-breathing-exercise-online/' },
    { title: 'Calming Playlist', url: 'https://open.spotify.com/track/0Dy7FBIZbU5pgz6KFSixML' },
  ];

  const sessionKey = `checkinSession_${getUserEmail()}`;

  const saveCheckIn = (data) => {
    const email = getUserEmail();
    localStorage.setItem(`lastCheckIn_${email}`, JSON.stringify(data));
    const existing = JSON.parse(localStorage.getItem(`history_${email}`) || '[]');
    existing.unshift(data);
    localStorage.setItem(`history_${email}`, JSON.stringify(existing));
  };

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(sessionKey);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (Number.isFinite(parsed?.conversationPhase)) {
          setConversationPhase(parsed.conversationPhase);
        }
        if (parsed?.userData && typeof parsed.userData === 'object') {
          setUserData({
            feeling: parsed.userData.feeling || '',
            trigger: parsed.userData.trigger || '',
            physical: parsed.userData.physical || '',
          });
        }
        setResultsLinkShown(Boolean(parsed?.resultsLinkShown));
      }
    } catch {
      // Ignore corrupt session payload and continue with defaults.
    } finally {
      setSessionReady(true);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!sessionReady) return;
    const payload = {
      messages,
      conversationPhase,
      userData,
      resultsLinkShown,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(sessionKey, JSON.stringify(payload));
  }, [messages, conversationPhase, userData, resultsLinkShown, sessionReady, sessionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadAiRuntimeStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/checkin/ml-health`);
      const data = await response.json().catch(() => ({}));
      return {
        loading: false,
        available: Boolean(data.available),
        geminiActive: Boolean(data.geminiActive),
      };
    } catch {
      return { loading: false, available: false, geminiActive: false };
    }
  };

  useEffect(() => {
    let alive = true;
    const refreshAiRuntime = async () => {
      const next = await loadAiRuntimeStatus();
      if (!alive) return;
      setAiRuntime(next);
    };

    refreshAiRuntime();
    const timer = setInterval(refreshAiRuntime, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
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

  const addBotMessage = (text, extra = {}) => {
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      type: 'bot',
      text,
      time: new Date(),
      ...extra,
    }]);
  };

  const submitForAnalysis = async (userInput) => {
    const activeUserId = getUserEmail();
    const response = await fetch(`${API_BASE}/api/checkin/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput,
        userId: activeUserId,
        geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to submit check-in');
    }

    const result = data.result || {};
    return {
      stressLevel: result.stressLevel || 'Moderate',
      emotion: result.emotion || 'unknown',
      confidence: result.confidence || 80,
      ayasaResponse: result.ayasaResponse || 'I am here with you. Tell me more about what is on your mind right now.',
      resources: Array.isArray(result.resources) ? result.resources : fallbackResources,
      directScoreQuery: Boolean(result.directScoreQuery),
      geminiUsed: Boolean(result.geminiUsed),
      geminiError: result.geminiError || null,
    };
  };

  const getFallbackResponse = () => {
    return {
      stressLevel: ['Low', 'Moderate', 'High'][Math.floor(Math.random() * 3)],
      emotion: 'unknown',
      confidence: 80,
      ayasaResponse: 'I could not reach the analysis server, but I am still here with you. Keep sharing and we can continue this conversation.',
      resources: fallbackResources,
      directScoreQuery: false,
      geminiUsed: false,
      geminiError: 'Backend request failed.',
    };
  };

  const persistResult = (result, snapshot) => {
    saveCheckIn({
      feeling: snapshot.feeling || userData.feeling,
      trigger: snapshot.trigger || userData.trigger,
      physical: snapshot.physical || userData.physical,
      timestamp: new Date().toISOString(),
      stressLevel: result.stressLevel,
      emotion: result.emotion,
      confidence: result.confidence,
      ayasaResponse: result.ayasaResponse,
      resources: result.resources,
      directScoreQuery: result.directScoreQuery,
      geminiUsed: result.geminiUsed,
      geminiError: result.geminiError,
    });
  };

  const updateAiDeliveryIndicator = (result) => {
    const hasStoredGeminiKey = Boolean(localStorage.getItem('geminiApiKey')?.trim());
    const summarizeGeminiError = (rawError) => {
      const text = String(rawError || '').toLowerCase();
      if (!text) return 'Fallback response used.';
      if (text.includes('api_key_invalid') || text.includes('api key not valid')) {
        return 'Fallback active: invalid Gemini key.';
      }
      if (text.includes('quota exceeded') || text.includes('429')) {
        return 'Fallback active: quota/rate limit reached.';
      }
      if (text.includes('not found') || text.includes('not supported')) {
        return 'Fallback active: model access unavailable.';
      }
      if (text.includes('temporarily paused')) {
        return 'Fallback active: Gemini cooldown in effect.';
      }
      return 'Fallback active while Gemini is unavailable.';
    };

    if (result?.geminiUsed) {
      setAiDelivery({ mode: 'gemini', detail: 'Latest reply came from Gemini.' });
      return;
    }

    if (!hasStoredGeminiKey) {
      setAiDelivery({ mode: 'fallback', detail: 'Fallback active: no Gemini key saved.' });
      return;
    }

    setAiDelivery({ mode: 'fallback', detail: summarizeGeminiError(result?.geminiError) });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { id: messages.length + 1, type: 'user', text: trimmedInput, time: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    let nextUserData = userData;
    if (conversationPhase === 0) nextUserData = { ...userData, feeling: trimmedInput };
    else if (conversationPhase === 1) nextUserData = { ...userData, trigger: trimmedInput };
    else if (conversationPhase === 2) nextUserData = { ...userData, physical: trimmedInput };

    if (conversationPhase <= 2) setUserData(nextUserData);

    let botResponse = '';
    let nextPhase = conversationPhase + 1;

    if (conversationPhase === 0) {
      botResponse = 'I understand. ' + questions[1];
    } else if (conversationPhase === 1) {
      botResponse = 'Thank you for sharing. ' + questions[2];
    } else if (conversationPhase === 2) {
      nextPhase = 3;
      addBotMessage('Got it. Let me analyze your responses with AYASA intelligence...');
      setLoading(true);
      try {
        const combinedMessage = `${nextUserData.feeling}. ${nextUserData.trigger}. ${nextUserData.physical}`;
        const result = await submitForAnalysis(combinedMessage);
        persistResult(result, nextUserData);
        addBotMessage(result.ayasaResponse, {
          tags: {
            emotion: result.emotion === 'unknown' ? 'Reflective' : result.emotion,
            stress: `${result.stressLevel} Stress`,
          },
        });
        updateAiDeliveryIndicator(result);
        if (!resultsLinkShown) {
          addBotMessage('Your result card is ready. Open it anytime while we keep chatting.', { showResultsLink: true });
          setResultsLinkShown(true);
        }
      } catch (err) {
        const fallback = getFallbackResponse();
        persistResult(fallback, nextUserData);
        addBotMessage(fallback.ayasaResponse);
        updateAiDeliveryIndicator(fallback);
        if (!resultsLinkShown) {
          addBotMessage('Your latest check-in is saved. You can open Results whenever you want.', { showResultsLink: true });
          setResultsLinkShown(true);
        }
      } finally {
        setLoading(false);
      }
    } else {
      nextPhase = 3;
      setLoading(true);
      try {
        const result = await submitForAnalysis(trimmedInput);
        persistResult(result, userData);
        addBotMessage(result.ayasaResponse, {
          tags: {
            emotion: result.emotion === 'unknown' ? 'Reflective' : result.emotion,
            stress: `${result.stressLevel} Stress`,
          },
        });
        updateAiDeliveryIndicator(result);
      } catch (err) {
        const fallback = getFallbackResponse();
        persistResult(fallback, userData);
        addBotMessage(fallback.ayasaResponse);
        updateAiDeliveryIndicator(fallback);
      } finally {
        setLoading(false);
      }
    }

    if (botResponse) {
      addBotMessage(botResponse, { tags: phaseTags[Math.min(conversationPhase, 2)] });
    }

    if (nextPhase <= conversationPhase && conversationPhase < 3) nextPhase = conversationPhase;
    setConversationPhase(nextPhase);
  };

  const handleResetChat = () => {
    const shouldReset = window.confirm('Reset this chat and start a new check-in?');
    if (!shouldReset) return;

    localStorage.removeItem(sessionKey);
    setMessages(initialMessages);
    setInput('');
    setConversationPhase(0);
    setLoading(false);
    setUserData(initialUserData);
    setResultsLinkShown(false);
    setAiDelivery({ mode: 'unknown', detail: 'Waiting for first reply.' });

    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const formatTime = (d) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const hasStoredGeminiKey = Boolean(localStorage.getItem('geminiApiKey'));
  const aiRuntimeTone = aiRuntime.loading
    ? 'checking'
    : (!aiRuntime.available ? 'offline' : (aiRuntime.geminiActive || hasStoredGeminiKey ? 'ready' : 'warn'));
  const aiRuntimeLabel = aiRuntime.loading
    ? 'Checking AI...'
    : (!aiRuntime.available
      ? 'ML Offline'
      : (aiRuntime.geminiActive || hasStoredGeminiKey ? 'Gemini Ready' : 'Key Missing'));
  const deliveryMode = aiDelivery.mode === 'unknown'
    ? (aiRuntimeTone === 'ready' ? 'gemini' : 'fallback')
    : aiDelivery.mode;
  const deliveryLabel = deliveryMode === 'gemini' ? 'Gemini first' : 'Fallback replies';

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
            <h2 style={{ fontFamily: 'Playfair Display, Noto Serif, serif', fontSize: '1.15rem', fontWeight: 700, color: '#1b1f2c', margin: 0 }}>
              Wellness Sanctuary
            </h2>
            <span style={{ fontSize: '0.6rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#4aa3ff' }}>
              Active Insight Mode
            </span>
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`ai-runtime-pill ai-runtime-${aiRuntimeTone} ai-runtime-compact`}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>
                    {aiRuntimeTone === 'ready' ? 'check_circle' : aiRuntimeTone === 'offline' ? 'cloud_off' : aiRuntimeTone === 'warn' ? 'key_off' : 'progress_activity'}
                  </span>
                  {aiRuntimeLabel}
                </span>
                <span
                  className={`ai-delivery-chip ai-delivery-${deliveryMode}`}
                  title={aiDelivery.detail}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 13 }}>
                    {deliveryMode === 'gemini' ? 'auto_awesome' : 'forum'}
                  </span>
                  {deliveryLabel}
                </span>
              </div>
            </div>
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
          <button
            type="button"
            className="sanctuary-reset-btn"
            onClick={handleResetChat}
            title="Reset chat"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 15 }}>restart_alt</span>
            Reset Chat
          </button>
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
                    <p>{msg.text}</p>
                    {msg.showResultsLink && (
                      <div className="sanc-results-inline-wrap">
                        <Link to="/home" className="sanc-results-inline-link">
                          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>assessment</span>
                          Open Results
                        </Link>
                      </div>
                    )}
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
                <p className="sanc-analyzing-text">AYASA is preparing a thoughtful response...</p>
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
              placeholder={conversationPhase > 2 ? 'Continue talking with AYASA...' : 'Share your thoughts...'}
              disabled={loading}
              className="sanctuary-input"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 6 }}>
              <span style={{ fontSize: '0.6rem', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#72809a', whiteSpace: 'nowrap' }}>
                {input.length} / 2000
              </span>
              <button
                type="submit"
                disabled={loading || !input.trim()}
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

