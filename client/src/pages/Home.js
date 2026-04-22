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

function getMessageStoreKey() {
  const email = getUserEmail();
  return `ayasa_chat_history:${email}`;
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

function pickRandom(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function pickExerciseForEmotion(emotion, stressLevel) {
  const safeEmotion = String(emotion || '').toLowerCase();
  const safeStress = normalizeStressLevel(stressLevel);

  const lowPool = ['grounding', 'gratitude', 'breathing'];
  const moderatePool = ['thoughtDump', 'reframe', 'controlSplit'];
  const highPool = ['boxBreathing', 'safeLoop', 'oneStep'];

  if (safeEmotion.includes('anger') || safeEmotion.includes('fear')) {
    return pickRandom(highPool);
  }
  if (safeEmotion.includes('sad')) {
    return pickRandom(moderatePool);
  }
  if (safeEmotion.includes('joy') || safeEmotion.includes('love')) {
    return pickRandom(lowPool);
  }

  if (safeStress === 'High') return pickRandom(highPool);
  if (safeStress === 'Low') return pickRandom(lowPool);
  return pickRandom(moderatePool);
}

function GroundingExercise() {
  const steps = [
    '5 things you see',
    '4 things you feel',
    '3 things you hear',
    '2 things you smell',
    '1 thing you taste',
  ];
  const [checked, setChecked] = useState(Array(5).fill(false));

  return (
    <div className="mainchat-exercise-card">
      <h5>5-4-3-2-1 Grounding</h5>
      {steps.map((step, i) => (
        <label key={step} className="mainchat-check-row">
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={() => {
              const next = [...checked];
              next[i] = !next[i];
              setChecked(next);
            }}
          />
          <span>{step}</span>
        </label>
      ))}
    </div>
  );
}

function GratitudeExercise() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');

  return (
    <div className="mainchat-exercise-card">
      <h5>3 Small Wins</h5>
      <input
        className="mainchat-exercise-input"
        value={draft}
        placeholder="Type and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const value = draft.trim();
            if (!value) return;
            setItems((prev) => [...prev, value].slice(0, 12));
            setDraft('');
          }
        }}
      />
      <div className="mainchat-chip-wrap">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="mainchat-chip">{item}</span>
        ))}
      </div>
    </div>
  );
}

function BreathingCircle() {
  return (
    <div className="mainchat-exercise-card">
      <h5>Breathing Circle</h5>
      <div className="mainchat-breath-circle" />
    </div>
  );
}

function ThoughtDump() {
  const [time, setTime] = useState(30);
  useEffect(() => {
    if (time <= 0) return undefined;
    const timer = setTimeout(() => setTime((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [time]);

  return (
    <div className="mainchat-exercise-card">
      <h5>Dump Your Thoughts ({time}s)</h5>
      <textarea className="mainchat-exercise-area" placeholder="Type freely..." />
      <button type="button" className="mainchat-mini-btn" onClick={() => setTime(30)}>Restart</button>
    </div>
  );
}

function Reframe() {
  return (
    <div className="mainchat-exercise-card">
      <h5>Reframe Thought</h5>
      <div className="mainchat-ex-grid two">
        <textarea className="mainchat-exercise-area" placeholder="Stress thought" />
        <textarea className="mainchat-exercise-area" placeholder="Rewrite realistically" />
      </div>
    </div>
  );
}

function ControlSplit() {
  return (
    <div className="mainchat-exercise-card">
      <h5>Control Split</h5>
      <div className="mainchat-ex-grid two">
        <textarea className="mainchat-exercise-area" placeholder="Can control" />
        <textarea className="mainchat-exercise-area" placeholder="Can't control" />
      </div>
    </div>
  );
}

function BoxBreathing() {
  return (
    <div className="mainchat-exercise-card">
      <h5>Box Breathing</h5>
      <div className="mainchat-box-breath" />
    </div>
  );
}

function SafeLoop() {
  return (
    <div className="mainchat-exercise-card">
      <h5>Safe Statement Loop</h5>
      <div className="mainchat-safe-loop">I&apos;m safe right now. This will pass.</div>
    </div>
  );
}

function OneStep() {
  const [step, setStep] = useState('');
  return (
    <div className="mainchat-exercise-card">
      <h5>Just One Step</h5>
      <input
        className="mainchat-exercise-input"
        value={step}
        onChange={(e) => setStep(e.target.value)}
        placeholder="Type one small action"
      />
    </div>
  );
}

function ExercisePanel({ exerciseKey, stressLevel }) {
  const normalized = normalizeStressLevel(stressLevel);

  return (
    <div className={`mainchat-exercise-panel ${normalized.toLowerCase()}`}>
      {exerciseKey === 'grounding' && <GroundingExercise />}
      {exerciseKey === 'gratitude' && <GratitudeExercise />}
      {exerciseKey === 'breathing' && <BreathingCircle />}
      {exerciseKey === 'thoughtDump' && <ThoughtDump />}
      {exerciseKey === 'reframe' && <Reframe />}
      {exerciseKey === 'controlSplit' && <ControlSplit />}
      {exerciseKey === 'boxBreathing' && <BoxBreathing />}
      {exerciseKey === 'safeLoop' && <SafeLoop />}
      {exerciseKey === 'oneStep' && <OneStep />}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const userEmail = useMemo(() => currentUser.email || getUserEmail(), [currentUser]);
  const displayName = useMemo(() => (currentUser.fullName || 'Friend').split(' ')[0], [currentUser]);
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
  const [aiRuntime, setAiRuntime] = useState({ loading: true, available: false, llmActive: false });
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => getUser().fullName || '');
  const [profileSaved, setProfileSaved] = useState('');
  const [llmApiKey, setLlmApiKey] = useState(() => localStorage.getItem('llmApiKey') || '');
  const [hfToken, setHfToken] = useState(() => localStorage.getItem('hfToken') || '');
  const [keysSaved, setKeysSaved] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingExercise, setPendingExercise] = useState(null);
  const exerciseOfferShownRef = useRef(false);
  const endRef = useRef(null);
  const lastWarningRef = useRef('');

  const loadStoredMessages = () => {
    try {
      const raw = localStorage.getItem(getMessageStoreKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const hasChatStarted = useMemo(() => messages.some((item) => item.role === 'user'), [messages]);

  const selectedEntry = useMemo(
    () => historyEntries.find((item) => String(item.id) === String(selectedEntryId)) || historyEntries[0] || null,
    [historyEntries, selectedEntryId]
  );

  const emotionDistribution = useMemo(() => {
    if (!historyEntries.length) return [];
    const counts = historyEntries.reduce((acc, item) => {
      const key = String(item.emotion || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = historyEntries.length;
    return Object.entries(counts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);
  }, [historyEntries]);

  const pushMessage = (message) => {
    setMessages((prev) => {
      const next = [
      ...prev,
      {
        id: `${message.role}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        time: new Date().toISOString(),
        ...message,
      },
      ];
      localStorage.setItem(getMessageStoreKey(), JSON.stringify(next));
      return next;
    });
  };

  const fetchInsights = async (seedHistory = historyEntries) => {
    try {
      const response = await fetch('/api/checkin/insights', {
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.insights) throw new Error('Insights unavailable');
      return data.insights;
    } catch {
      return buildLocalInsights(seedHistory);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/checkin/history', {
        headers: authHeaders(),
      });
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
        llmActive: Boolean(data.llmActive ?? data.geminiActive),
      });
    } catch {
      setAiRuntime({ loading: false, available: false, llmActive: false });
    }
  };

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
      return undefined;
    }

    const storedMessages = loadStoredMessages();
    if (storedMessages) {
      setMessages(storedMessages);
    }

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

  const handleProfileSave = async () => {
    const nextName = profileName.trim();
    if (!nextName) return;

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: userEmail,
          fullName: nextName,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Could not save profile');
      }

      const updatedUser = {
        ...getUser(),
        ...(data?.user || {}),
        fullName: nextName,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setProfileSaved('Saved');
      setTimeout(() => setProfileSaved(''), 1500);
    } catch {
      setProfileSaved('Failed');
      setTimeout(() => setProfileSaved(''), 1500);
    }
  };

  const handleSaveApiKeys = async () => {
    const nextLlm = llmApiKey.trim();
    const nextHf = hfToken.trim();
    localStorage.setItem('llmApiKey', nextLlm);
    localStorage.setItem('hfToken', nextHf);

    try {
      const response = await fetch('/api/auth/keys', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          llmApiKey: nextLlm,
          hfToken: nextHf,
        }),
      });
      if (!response.ok) {
        throw new Error('Key save failed');
      }
      setKeysSaved('Saved');
      setTimeout(() => setKeysSaved(''), 1500);
    } catch {
      setKeysSaved('Failed');
      setTimeout(() => setKeysSaved(''), 1500);
    }
  };

  const submitMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || loading) return;

    pushMessage({ role: 'user', type: 'text', text });
    setInput('');

    if (/\b(no|not now|later|skip)\b/i.test(text)) {
      setPendingExercise(null);
      return;
    }

    const isExerciseCommand = /\b(start|begin|yes|ok|okay|sure)\b[\w\s]*\bexercise\b/i.test(text) || /^exercise$/i.test(text);
    if (isExerciseCommand) {
      const exerciseStress = normalizeStressLevel(
        pendingExercise?.stressLevel || selectedEntry?.stressLevel || historyEntries[0]?.stressLevel || 'Moderate'
      );
      const exerciseKey = pendingExercise?.exerciseKey || pickExerciseForEmotion(selectedEntry?.emotion, exerciseStress);
      pushMessage({
        role: 'assistant',
        type: 'exercise',
        text: `Starting a ${exerciseStress.toLowerCase()} exercise for you now.`,
        exerciseStress,
        exerciseKey,
      });
      setPendingExercise(null);
      exerciseOfferShownRef.current = true;
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userInput: text,
          llmApiKey: llmApiKey.trim(),
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
          emotion: result.emotion,
        },
      });

      const shouldOfferExercise = !exerciseOfferShownRef.current && result.emotion
        ? (['anger', 'fear', 'sadness'].some((key) => String(result.emotion).toLowerCase().includes(key))
          ? Math.random() < 0.65
          : Math.random() < 0.2)
        : false;

      if (shouldOfferExercise) {
        const exerciseKey = pickExerciseForEmotion(result.emotion, result.stressLevel);
        setPendingExercise({ exerciseKey, stressLevel: result.stressLevel, emotion: result.emotion });
        exerciseOfferShownRef.current = true;
        pushMessage({
          role: 'assistant',
          type: 'exercise-offer',
          text: 'Would you like to start a quick exercise now?',
        });
      }

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
    if (key === 'menu') {
      pushMessage({
        role: 'assistant',
        type: 'insight',
        text: 'Reset menu: choose Anxiety, Sleep, Workload, Relationships, or a fresh stress check. You can type any of these to continue.',
      });
      return;
    }
    pushMessage({ role: 'assistant', type: 'insight', text: nextInsights.weeklySummary });
  };

  const runtimeLabel = aiRuntime.loading
    ? 'Checking AI status'
    : aiRuntime.available
      ? (aiRuntime.llmActive ? 'AI online' : 'Fallback mode')
      : 'AI offline';

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(input);
    }
  };

  const pageClassName = [
    'mainchat-page',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
  ].join(' ').trim();

  return (
    <div className={pageClassName}>
      <aside className="mainchat-sidebar">
        <div className="mainchat-sidebar-head">
          <Link to="/" className="mainchat-logo">
            <span className="material-symbols-rounded">diversity_1</span>
            {!sidebarCollapsed && 'AYASA'}
          </Link>
          <div className="mainchat-sidebar-head-actions">
            <button
              className="mainchat-icon-btn"
              type="button"
              onClick={() => {
                setSidebarCollapsed((prev) => !prev);
              }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-symbols-rounded">{sidebarCollapsed ? 'left_panel_open' : 'left_panel_close'}</span>
            </button>
            {!sidebarCollapsed && <button className="mainchat-logout" onClick={handleLogout}>Logout</button>}
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="mainchat-sidebar-scroll">
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
                  <div className="mainchat-history-meta">
                    <span>Emotion: {entry.emotion || 'unknown'}</span>
                    <span>Confidence: {entry.confidence || 0}%</span>
                  </div>
                  <p>{entry.userInput || 'Conversation entry'}</p>
                </button>
              ))}
            </div>

            <div className="mainchat-collapsible">
              <button
                className="mainchat-collapse-toggle"
                type="button"
                onClick={() => setIsAnalyticsOpen((prev) => !prev)}
              >
                <span>Stress Analytics</span>
                <span className={`material-symbols-rounded ${isAnalyticsOpen ? 'open' : ''}`}>expand_more</span>
              </button>
              {isAnalyticsOpen && (
                <div className="mainchat-detail-card">
                  <h4>Stress Snapshot</h4>
                  {selectedEntry ? (
                    <>
                      <p><strong>Current Stress:</strong> {selectedEntry.stressLevel}</p>
                      <p><strong>Emotion:</strong> {selectedEntry.emotion || 'unknown'}</p>
                      <p><strong>Confidence:</strong> {selectedEntry.confidence || 0}%</p>
                      <p><strong>Captured:</strong> {formatTimestamp(selectedEntry.timestamp)}</p>
                    </>
                  ) : (
                    <p>No selected session.</p>
                  )}
                  <div className="mainchat-emotion-box">
                    <h5>Emotion Distribution</h5>
                    {emotionDistribution.length === 0 && <p>No emotion data yet.</p>}
                    {emotionDistribution.map((item) => (
                      <div key={item.emotion} className="mainchat-emotion-row">
                        <div className="mainchat-emotion-head">
                          <span>{item.emotion}</span>
                          <strong>{item.percent}%</strong>
                        </div>
                        <div className="mainchat-emotion-bar">
                          <span style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mainchat-collapsible">
              <button
                className="mainchat-collapse-toggle"
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
              >
                <span>User Profile</span>
                <span className={`material-symbols-rounded ${isProfileOpen ? 'open' : ''}`}>expand_more</span>
              </button>
              {isProfileOpen && (
                <div className="mainchat-detail-card">
                  <h4>Profile</h4>
                  <p><strong>Email:</strong> {userEmail}</p>
                  <label className="mainchat-profile-label" htmlFor="profileNameInput">Display Name</label>
                  <input
                    id="profileNameInput"
                    className="mainchat-profile-input"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                  />
                  <div className="mainchat-profile-actions">
                    <button type="button" onClick={handleProfileSave}>Save</button>
                    {profileSaved && <span>{profileSaved}</span>}
                  </div>

                  <h4 className="mainchat-subtitle">API Keys</h4>
                  <label className="mainchat-profile-label" htmlFor="llmApiKeyInput">LLM API Key (Groq)</label>
                  <input
                    id="llmApiKeyInput"
                    className="mainchat-profile-input"
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="Paste LLM key"
                  />
                  <label className="mainchat-profile-label" htmlFor="hfTokenInput">HF Token</label>
                  <input
                    id="hfTokenInput"
                    className="mainchat-profile-input"
                    type="password"
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder="Paste HF token"
                  />
                  <div className="mainchat-key-indicators">
                    <span className={`mainchat-key-pill ${llmApiKey.trim() ? 'set' : 'unset'}`}>
                      LLM: {llmApiKey.trim() ? 'Configured' : 'Missing'}
                    </span>
                    <span className={`mainchat-key-pill ${hfToken.trim() ? 'set' : 'unset'}`}>
                      HF: {hfToken.trim() ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                  <div className="mainchat-profile-actions">
                    <button type="button" onClick={handleSaveApiKeys}>Save Keys</button>
                    {keysSaved && <span>{keysSaved}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="mainchat-detail-card compact">
              <h4>Insight Snapshot</h4>
              <p>{insights.personalTrend.week}</p>
            </div>
          </div>
        )}
      </aside>

      <main className="mainchat-main">
        <header className="mainchat-header">
          <div className="mainchat-top-left" />
          <button
            type="button"
            className="mainchat-user-avatar"
            onClick={() => {
              setIsProfileOpen(true);
              setSidebarCollapsed(false);
            }}
            aria-label="Open user profile"
            title="Open user profile"
          >
            {displayName.charAt(0).toUpperCase()}
          </button>
        </header>

        <section className={`mainchat-hero ${hasChatStarted ? 'dismissed' : ''}`}>
          <h1>{greeting}, {displayName}</h1>
          <h2>Can I help you with anything?</h2>
          <p>Everything stays here in chat: analysis, resources, trends, and weekly summaries.</p>
          <div className="mainchat-prompt-grid">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.key} className="mainchat-prompt-chip" onClick={() => handlePrompt(action.key)}>
                {action.label}
              </button>
            ))}
            <button className="mainchat-prompt-chip" onClick={() => handlePrompt('menu')}>Reset menu</button>
          </div>
          <div className="mainchat-runtime">{runtimeLabel}</div>
        </section>

        <section className="mainchat-thread">
          {messages.map((message) => (
            <div key={message.id} className={`mainchat-msg ${message.role === 'assistant' ? 'assistant' : 'user'} ${message.type || ''}`}>
              <div className="mainchat-msg-bubble">
                <p>{message.text}</p>
                {message.type === 'exercise' && (
                  <ExercisePanel
                    exerciseKey={message.exerciseKey}
                    stressLevel={message.exerciseStress}
                  />
                )}
                {message.meta && (
                  <div className="mainchat-meta-row">
                    <span className="mainchat-meta-pill">Emotion: {message.meta.emotion}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="mainchat-msg assistant loading">
              <div className="mainchat-msg-bubble"><p>Analyzing your message...</p></div>
            </div>
          )}
          <div ref={endRef} />
        </section>

        <div className="mainchat-orb-dock" aria-hidden="true">
          <Orb
            hoverIntensity={0}
            rotateOnHover={false}
            paused
            hue={136}
            forceHoverState={false}
            backgroundColor="#ecf3ff"
          />
        </div>

        <form
          className="mainchat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(input);
          }}
        >
          <div className="mainchat-input-row">
            <div className="mainchat-input-shell">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="How can AYASA help you today?"
                rows={1}
                maxLength={2000}
              />
            </div>
            <button className="mainchat-send-btn external" type="submit" disabled={loading || !input.trim()}>
              <span className="material-symbols-rounded">arrow_upward</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
