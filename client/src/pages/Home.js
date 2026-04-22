import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Orb from '../components/Orb';
import '../styles/pages.css';

function getUserEmail() {
  try { return JSON.parse(localStorage.getItem('user'))?.email || 'default'; }
  catch { return 'default'; }
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) || {}; }
  catch { return {}; }
}

function safeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimestamp(value) {
  const d = safeDate(value);
  if (!d) return 'Unknown time';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function normalizeStressLevel(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('high')) return 'High';
  if (raw.includes('low')) return 'Low';
  return 'Moderate';
}

function normalizeEntry(entry, index = 0) {
  return {
    id: entry.id || `${entry.timestamp || 'entry'}-${index}`,
    userInput: String(entry.userInput || ''),
    stressLevel: normalizeStressLevel(entry.stressLevel),
    emotion: String(entry.emotion || 'unknown'),
    confidence: Number(entry.confidence || 0),
    ayasaResponse: String(entry.ayasaResponse || ''),
    resources: Array.isArray(entry.resources) ? entry.resources : [],
    timestamp: entry.timestamp || new Date().toISOString(),
  };
}

const SCORE_MAP = {
  Low: 1,
  Moderate: 2,
  High: 3,
};

const QUICK_ACTIONS = [
  { key: 'week', label: 'Last 7 days trend' },
  { key: 'month', label: 'Last 30 days trend' },
  { key: 'patterns', label: 'Pattern detection' },
  { key: 'feedback', label: 'Contextual feedback' },
  { key: 'weekly', label: 'Weekly summary' },
];

function buildLocalInsights(historyEntries) {
  const sorted = historyEntries
    .map((item) => ({ ...item, parsed: safeDate(item.timestamp) }))
    .filter((item) => item.parsed)
    .sort((a, b) => a.parsed - b.parsed);

  if (!sorted.length) {
    return {
      personalTrend: {
        week: 'No trend yet. Start a conversation to build your 7-day signal.',
        month: 'No 30-day trend yet.',
        movingAverage: 'Moving average appears after a few entries.',
      },
      patternDetection: 'Patterns will appear once there is enough check-in data.',
      contextualFeedback: 'Share your current state and AYASA will tailor support.',
      weeklySummary: 'No weekly summary yet.',
      earlyWarning: '',
    };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const last7 = sorted.filter((item) => now - item.parsed.getTime() <= 7 * dayMs);
  const prev7 = sorted.filter((item) => {
    const age = now - item.parsed.getTime();
    return age > 7 * dayMs && age <= 14 * dayMs;
  });
  const last30 = sorted.filter((item) => now - item.parsed.getTime() <= 30 * dayMs);

  const avg = (items) => {
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + (SCORE_MAP[item.stressLevel] || 2), 0) / items.length;
  };

  const avg7 = avg(last7);
  const prevAvg = avg(prev7);
  const movingAverage = avg(sorted.slice(-5));

  const pct = prevAvg > 0 ? Math.round(((avg7 - prevAvg) / prevAvg) * 100) : 0;
  const direction = pct >= 0 ? 'increased' : 'decreased';

  const byPeriod = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  sorted.forEach((item) => {
    const hour = item.parsed.getHours();
    const bucket = hour >= 5 && hour < 12
      ? 'morning'
      : hour >= 12 && hour < 17
        ? 'afternoon'
        : hour >= 17 && hour < 22
          ? 'evening'
          : 'night';
    byPeriod[bucket].push(SCORE_MAP[item.stressLevel] || 2);
  });

  const dominantPeriod = Object.entries(byPeriod)
    .map(([name, values]) => ({ name, score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0, count: values.length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.score - a.score)[0];

  const latest = sorted[sorted.length - 1];
  const latestInput = String(latest.userInput || '').toLowerCase();
  const latestEmotion = String(latest.emotion || 'unknown').toLowerCase();

  let contextualFeedback = 'Keep sharing your context and AYASA will guide your next best step.';
  if (latest.stressLevel === 'High' && latestEmotion.includes('anger')) {
    contextualFeedback = 'High stress with anger detected. Try a short cooldown before reacting to triggers.';
  } else if (latest.stressLevel === 'Moderate' && /uncertain|confused|overwhelmed|overwhelm/.test(latestInput)) {
    contextualFeedback = 'Medium stress with uncertainty detected. Break your next task into one clear action.';
  } else if (latest.stressLevel === 'High' && (latestEmotion.includes('fear') || latestEmotion.includes('sadness'))) {
    contextualFeedback = 'High stress with negative emotional load detected. Slow down and reach out for support.';
  }

  const lastThree = sorted.slice(-3).map((item) => SCORE_MAP[item.stressLevel] || 2);
  const earlyWarning = (lastThree.length === 3 && lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0])
    ? 'Early warning: stress has risen across your last 3 entries.'
    : '';

  const monthStart = avg(last30.slice(0, Math.max(1, Math.floor(last30.length / 2))));
  const monthEnd = avg(last30.slice(Math.max(1, Math.floor(last30.length / 2))));
  const monthDirection = monthEnd >= monthStart ? 'upward' : 'downward';

  return {
    personalTrend: {
      week: prevAvg > 0
        ? `Your stress has ${direction} ${Math.abs(pct)}% over the last week.`
        : `Your recent 7-day trend is mostly ${latest.stressLevel}.`,
      month: `Your 30-day trend is ${monthDirection}, moving from score ${monthStart.toFixed(2)} to ${monthEnd.toFixed(2)}.`,
      movingAverage: `Current moving average is ${movingAverage.toFixed(2)} on a 1-3 stress scale.`,
    },
    patternDetection: dominantPeriod
      ? `High stress occurs most in the ${dominantPeriod.name}.`
      : 'No dominant pattern detected yet.',
    contextualFeedback,
    weeklySummary: `This week stress is mostly ${latest.stressLevel}, dominant emotion is ${latest.emotion || 'unknown'}, and the latest movement is ${direction}.`,
    earlyWarning,
  };
}

function stressClass(level) {
  return level === 'High' ? 'high' : level === 'Low' ? 'low' : 'moderate';
}

export default function Home() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);
  const userEmail = useMemo(() => getUserEmail(), []);
  const displayName = useMemo(() => (user.fullName || 'Friend').split(' ')[0], [user]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const [messages, setMessages] = useState(() => [
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      type: 'intro',
      text: 'I am ready whenever you are. Tell me how you feel, what is triggering stress, or ask for your latest trends.',
      time: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [insights, setInsights] = useState(buildLocalInsights([]));
  const [aiRuntime, setAiRuntime] = useState({ loading: true, available: false, geminiActive: false });
  const endRef = useRef(null);
  const lastWarningRef = useRef('');

  const selectedEntry = useMemo(
    () => historyEntries.find((item) => String(item.id) === String(selectedEntryId)) || historyEntries[0] || null,
    [historyEntries, selectedEntryId]
  );

  const pushMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${message.role}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        time: new Date().toISOString(),
        ...message,
      },
    ]);
  };

  const fetchInsights = async (seedHistory = historyEntries) => {
    try {
      const response = await fetch(`/api/checkin/insights?userId=${encodeURIComponent(userEmail)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.insights) throw new Error('Insights unavailable');
      return data.insights;
    } catch {
      return buildLocalInsights(seedHistory);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/checkin/history?userId=${encodeURIComponent(userEmail)}`);
      const data = await response.json().catch(() => ({}));
      const normalized = Array.isArray(data?.history)
        ? data.history.map((item, index) => normalizeEntry(item, index)).sort((a, b) => {
          const aDate = safeDate(a.timestamp)?.getTime() || 0;
          const bDate = safeDate(b.timestamp)?.getTime() || 0;
          return bDate - aDate;
        })
        : [];
      setHistoryEntries(normalized);
      if (normalized[0]) setSelectedEntryId(String(normalized[0].id));
      const nextInsights = await fetchInsights(normalized);
      setInsights(nextInsights);
    } catch {
      setHistoryEntries([]);
      setInsights(buildLocalInsights([]));
    }
  };

  const loadRuntime = async () => {
    try {
      const response = await fetch('/api/checkin/ml-health');
      const data = await response.json().catch(() => ({}));
      setAiRuntime({
        loading: false,
        available: Boolean(data.available),
        geminiActive: Boolean(data.geminiActive),
      });
    } catch {
      setAiRuntime({ loading: false, available: false, geminiActive: false });
    }
  };

  useEffect(() => {
    loadHistory();
    loadRuntime();
    const timer = setInterval(loadRuntime, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const submitMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || loading) return;

    pushMessage({ role: 'user', type: 'text', text });
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: text,
          userId: userEmail,
          geminiApiKey: localStorage.getItem('geminiApiKey') || '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.result) throw new Error(data?.error || 'Could not analyze message');

      const result = normalizeEntry(data.result);
      const updatedHistory = [result, ...historyEntries.filter((item) => item.id !== result.id)].slice(0, 100);
      setHistoryEntries(updatedHistory);
      setSelectedEntryId(String(result.id));

      pushMessage({
        role: 'assistant',
        type: 'analysis',
        text: result.ayasaResponse || 'Analysis completed.',
        meta: {
          stressLevel: result.stressLevel,
          emotion: result.emotion,
          confidence: result.confidence,
        },
        resources: result.resources,
      });

      const nextInsights = await fetchInsights(updatedHistory);
      setInsights(nextInsights);

      if (nextInsights?.earlyWarning && nextInsights.earlyWarning !== lastWarningRef.current) {
        lastWarningRef.current = nextInsights.earlyWarning;
        pushMessage({ role: 'assistant', type: 'warning', text: nextInsights.earlyWarning });
      }
    } catch (error) {
      pushMessage({
        role: 'assistant',
        type: 'warning',
        text: 'I could not reach analysis right now. Please try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrompt = async (key) => {
    const nextInsights = await fetchInsights();
    setInsights(nextInsights);

    if (key === 'week') {
      pushMessage({ role: 'assistant', type: 'insight', text: nextInsights.personalTrend.week });
      return;
    }
    if (key === 'month') {
      pushMessage({ role: 'assistant', type: 'insight', text: `${nextInsights.personalTrend.month} ${nextInsights.personalTrend.movingAverage}` });
      return;
    }
    if (key === 'patterns') {
      pushMessage({ role: 'assistant', type: 'insight', text: nextInsights.patternDetection });
      return;
    }
    if (key === 'feedback') {
      pushMessage({ role: 'assistant', type: 'insight', text: nextInsights.contextualFeedback });
      return;
    }
    pushMessage({ role: 'assistant', type: 'insight', text: nextInsights.weeklySummary });
  };

  const runtimeLabel = aiRuntime.loading
    ? 'Checking AI status'
    : aiRuntime.available
      ? (aiRuntime.geminiActive ? 'AI online' : 'AI fallback mode')
      : 'AI offline';

  return (
    <div className="mainchat-page">
      <aside className="mainchat-sidebar">
        <div className="mainchat-sidebar-head">
          <Link to="/" className="mainchat-logo">
            <span className="material-symbols-rounded">diversity_1</span>
            AYASA
          </Link>
          <button className="mainchat-logout" onClick={handleLogout}>Logout</button>
        </div>

        <div className="mainchat-history-title">Conversation History</div>
        <div className="mainchat-history-list">
          {historyEntries.length === 0 && <p className="mainchat-empty">No sessions yet. Start chatting to build your timeline.</p>}
          {historyEntries.map((entry) => (
            <button
              key={entry.id}
              className={`mainchat-history-item${String(selectedEntryId) === String(entry.id) ? ' active' : ''}`}
              onClick={() => setSelectedEntryId(String(entry.id))}
            >
              <div className="mainchat-history-item-head">
                <span className={`mainchat-stress-badge ${stressClass(entry.stressLevel)}`}>{entry.stressLevel}</span>
                <span className="mainchat-history-time">{formatTimestamp(entry.timestamp)}</span>
              </div>
              <p>{entry.userInput || 'Conversation entry'}</p>
            </button>
          ))}
        </div>

        <div className="mainchat-detail-card">
          <h4>Details</h4>
          {selectedEntry ? (
            <>
              <p><strong>Emotion:</strong> {selectedEntry.emotion || 'unknown'}</p>
              <p><strong>Confidence:</strong> {selectedEntry.confidence || 0}%</p>
              <p><strong>Captured:</strong> {formatTimestamp(selectedEntry.timestamp)}</p>
              <p><strong>Resources:</strong> {selectedEntry.resources.length}</p>
            </>
          ) : (
            <p>No selected session.</p>
          )}
        </div>

        <div className="mainchat-detail-card compact">
          <h4>Insight Snapshot</h4>
          <p>{insights.personalTrend.week}</p>
        </div>
      </aside>

      <main className="mainchat-main">
        <header className="mainchat-header">
          <div className="mainchat-top-left">ThinkAI</div>
          <div className="mainchat-orb-shell" aria-hidden="true">
            <Orb
              hoverIntensity={0.08}
              rotateOnHover
              hue={136}
              forceHoverState
              backgroundColor="#eaf6f2"
            />
          </div>
          <div className="mainchat-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
        </header>

        <section className="mainchat-hero">
          <h1>{greeting}, {displayName}</h1>
          <h2>Can I help you with anything?</h2>
          <p>Everything stays here in chat: analysis, resources, trends, and weekly summaries.</p>
          <div className="mainchat-prompt-grid">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.key} className="mainchat-prompt-chip" onClick={() => handlePrompt(action.key)}>
                {action.label}
              </button>
            ))}
          </div>
          <div className="mainchat-runtime">{runtimeLabel}</div>
        </section>

        <section className="mainchat-thread">
          {messages.map((message) => (
            <div key={message.id} className={`mainchat-msg ${message.role === 'assistant' ? 'assistant' : 'user'} ${message.type || ''}`}>
              <div className="mainchat-msg-bubble">
                <p>{message.text}</p>
                {message.meta && (
                  <div className="mainchat-meta-row">
                    <span className={`mainchat-stress-badge ${stressClass(message.meta.stressLevel)}`}>{message.meta.stressLevel}</span>
                    <span className="mainchat-meta-pill">Emotion: {message.meta.emotion}</span>
                    <span className="mainchat-meta-pill">Confidence: {message.meta.confidence}%</span>
                  </div>
                )}
                {Array.isArray(message.resources) && message.resources.length > 0 && (
                  <div className="mainchat-resource-grid">
                    {message.resources.map((resource) => (
                      <a key={`${message.id}-${resource.url}`} href={resource.url} target="_blank" rel="noreferrer">
                        {resource.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="mainchat-msg assistant loading">
              <div className="mainchat-msg-bubble">Analyzing your message...</div>
            </div>
          )}
          <div ref={endRef} />
        </section>

        <form
          className="mainchat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can AYASA help you today?"
            rows={2}
            maxLength={2000}
          />
          <div className="mainchat-composer-foot">
            <span>Use shift + enter for new line</span>
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
