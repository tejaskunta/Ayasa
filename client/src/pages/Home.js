import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

function getUserEmail() {
  try { return JSON.parse(localStorage.getItem('user'))?.email || 'default'; }
  catch { return 'default'; }
}

function getHistory() {
  try {
    const raw = localStorage.getItem(`history_${getUserEmail()}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function computeMetrics(history) {
  const total = history.length;
  if (total === 0) return { total: 0, dominant: '—', highDays: 0, avgConf: 0 };
  const emotions = {};
  let highDays = 0;
  let confSum = 0;
  const stressDates = new Set();
  history.forEach(h => {
    const em = (h.emotion || 'unknown').toLowerCase();
    emotions[em] = (emotions[em] || 0) + 1;
    if (h.stressLevel === 'High') {
      stressDates.add(new Date(h.timestamp).toDateString());
    }
    confSum += (h.confidence || 0);
  });
  highDays = stressDates.size;
  const dominant = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
  return {
    total,
    dominant: dominant ? dominant[0].charAt(0).toUpperCase() + dominant[0].slice(1) : '—',
    dominantPct: dominant ? Math.round((dominant[1] / total) * 100) : 0,
    highDays,
    avgConf: Math.round(confSum / total),
  };
}

function computeEmotionBreakdown(history) {
  if (history.length === 0) return [];
  const counts = {};
  history.forEach(h => {
    const em = (h.emotion || 'unknown').toLowerCase();
    counts[em] = (counts[em] || 0) + 1;
  });
  const total = history.length;
  const colors = {
    joy: '#44e5c2', sadness: '#80b4ff', anger: '#ffb4ab',
    fear: '#cebdff', love: '#ff8fb8', surprise: '#ffd166',
    unknown: '#85948e',
  };
  return Object.entries(counts)
    .map(([em, c]) => ({ emotion: em.charAt(0).toUpperCase() + em.slice(1), pct: Math.round((c / total) * 100), color: colors[em] || '#85948e' }))
    .sort((a, b) => b.pct - a.pct);
}

function computeWeeklyStress(history) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = Array(7).fill(null).map(() => ({ total: 0, high: 0 }));
  history.forEach(h => {
    const d = new Date(h.timestamp).getDay();
    buckets[d].total++;
    if (h.stressLevel === 'High') buckets[d].high++;
  });
  const max = Math.max(1, ...buckets.map(b => b.total));
  return days.map((label, i) => ({
    label,
    pct: Math.round((buckets[i].total / max) * 100),
    highPct: buckets[i].total > 0 ? Math.round((buckets[i].high / buckets[i].total) * 100) : 0,
    count: buckets[i].total,
  }));
}

function computeWellbeing(history) {
  if (history.length === 0) return 0;
  let score = 50;
  history.slice(-10).forEach(h => {
    if (h.stressLevel === 'Low') score += 5;
    else if (h.stressLevel === 'Moderate') score += 1;
    else if (h.stressLevel === 'High') score -= 4;
    const em = (h.emotion || '').toLowerCase();
    if (['joy', 'love'].includes(em)) score += 3;
    if (['sadness', 'anger', 'fear'].includes(em)) score -= 2;
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [selectedMood, setSelectedMood] = useState(null);
  const [geminiKey, setGeminiKey]       = useState(localStorage.getItem('geminiApiKey') || '');
  const [keySaved, setKeySaved]         = useState(!!localStorage.getItem('geminiApiKey'));
  const [showKey, setShowKey]           = useState(false);
  const [history, setHistory]           = useState([]);

  useEffect(() => { setHistory(getHistory()); }, []);

  const metrics   = useMemo(() => computeMetrics(history), [history]);
  const emotions  = useMemo(() => computeEmotionBreakdown(history), [history]);
  const weekly    = useMemo(() => computeWeeklyStress(history), [history]);
  const wellbeing = useMemo(() => computeWellbeing(history), [history]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const saveGeminiKey = () => {
    const trimmed = geminiKey.trim();
    if (!trimmed) return;
    localStorage.setItem('geminiApiKey', trimmed);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const recentSessions = history.slice(-5).reverse();
  const stressColors = { Low: '#44e5c2', Moderate: '#cebdff', High: '#ffb4ab' };

  const wbAngle = (wellbeing / 100) * 180;
  const wbRad   = (a) => (a * Math.PI) / 180;
  const arcR    = 80;
  const arcEnd  = {
    x: 100 + arcR * Math.cos(wbRad(180 - wbAngle)),
    y: 100 - arcR * Math.sin(wbRad(180 - wbAngle)),
  };
  const largeArc = wbAngle > 180 ? 1 : 0;

  const highPct = history.length > 0 ? Math.round((history.filter(h => h.stressLevel === 'High').length / history.length) * 100) : 0;
  const lowPct  = 100 - highPct;

  return (
    <div className="home-container">
      {/* ── Navbar ─────────────────── */}
      <header className="navbar">
        <Link to="/home" className="navbar-brand">AYASA</Link>
        <nav className="navbar-links">
          <Link to="/home" className="active">Dashboard</Link>
          <Link to="/checkin">Journal</Link>
          <Link to="/history">History</Link>
        </nav>
        <div className="navbar-right">
          <div className="navbar-avatar">{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
          <button className="btn-logout" onClick={handleLogout}>
            <span className="material-symbols-rounded" style={{ fontSize: 15 }}>logout</span>
            Logout
          </button>
        </div>
      </header>

      <div className="home-content">
        {/* ── Hero ─────────────────── */}
        <div className="home-hero">
          <div className="home-hero-text">
            <h1>Welcome back, <span className="highlight">{(user.fullName || 'Explorer').split(' ')[0]}</span></h1>
            <p>How are you feeling today?</p>
          </div>
          <div className="mood-selector">
            {[
              { key: 'good', icon: 'sentiment_very_satisfied', label: 'Good' },
              { key: 'okay', icon: 'sentiment_neutral', label: 'Okay' },
              { key: 'stressed', icon: 'sentiment_stressed', label: 'Stressed' },
            ].map(m => (
              <div key={m.key} className={`mood-item${selectedMood === m.key ? ' selected' : ''}`} onClick={() => setSelectedMood(m.key)}>
                <div className="mood-icon"><span className="material-symbols-rounded">{m.icon}</span></div>
                <span className="mood-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Metric Summary Cards ─── */}
        <div className="dash-metrics">
          <div className="dash-metric-card">
            <div className="dash-mc-header">
              <span className="dash-mc-label">Total Sessions</span>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'rgba(68,229,194,0.4)' }}>clinical_notes</span>
            </div>
            <div className="dash-mc-value">{metrics.total}</div>
            <p className="dash-mc-sub">Sessions completed</p>
          </div>
          <div className="dash-metric-card">
            <div className="dash-mc-header">
              <span className="dash-mc-label">Dominant Emotion</span>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'rgba(68,229,194,0.4)' }}>mood</span>
            </div>
            <div className="dash-mc-value" style={{ fontSize: metrics.dominant.length > 7 ? '1.6rem' : undefined }}>{metrics.dominant}</div>
            <p className="dash-mc-sub">{metrics.dominantPct > 0 ? `${metrics.dominantPct}% of sessions` : 'No data yet'}</p>
          </div>
          <div className="dash-metric-card">
            <div className="dash-mc-header">
              <span className="dash-mc-label">High Stress Days</span>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'rgba(255,180,171,0.5)' }}>warning</span>
            </div>
            <div className="dash-mc-value" style={{ color: metrics.highDays > 0 ? '#ffb4ab' : undefined }}>{metrics.highDays}</div>
            <p className="dash-mc-sub">Days above threshold</p>
          </div>
          <div className="dash-metric-card">
            <div className="dash-mc-header">
              <span className="dash-mc-label">Avg Confidence</span>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'rgba(68,229,194,0.4)' }}>speed</span>
            </div>
            <div className="dash-mc-value">{metrics.avgConf}<span style={{ fontSize: '1.1rem', opacity: 0.4, marginLeft: 2 }}>%</span></div>
            <p className="dash-mc-sub">Model confidence avg</p>
          </div>
        </div>

        {/* ── Action Cards ─────────── */}
        <div className="home-cards">
          <div className="home-card">
            <div className="card-icon"><span className="material-symbols-rounded">self_improvement</span></div>
            <h2>Start Stress Check</h2>
            <p>Share how you're feeling and let AYASA analyze your stress patterns.</p>
            <Link to="/checkin" className="btn-primary">Begin Check-in</Link>
          </div>
          <div className="home-card">
            <div className="card-icon"><span className="material-symbols-rounded">timeline</span></div>
            <h2>View History</h2>
            <p>Review your emotional journey and track progress over time.</p>
            <Link to="/history" className="btn-secondary">See Timeline</Link>
          </div>
        </div>

        {/* ── Emotion Breakdown + Stress Pattern ── */}
        <div className="dash-row-2col">
          {/* Emotion Breakdown */}
          <div className="dash-panel">
            <h3 className="dash-panel-title">Emotion Breakdown</h3>
            {emotions.length === 0 ? (
              <p className="dash-empty">Complete a check-in to see your emotion data</p>
            ) : (
              <div className="dash-progress-list">
                {emotions.map(e => (
                  <div key={e.emotion} className="dash-progress-row">
                    <div className="dash-progress-labels">
                      <span>{e.emotion}</span>
                      <span style={{ color: e.color, fontWeight: 700 }}>{e.pct}%</span>
                    </div>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${e.pct}%`, background: `linear-gradient(90deg, ${e.color}88, ${e.color})` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stress Pattern */}
          <div className="dash-panel">
            <h3 className="dash-panel-title">Stress Pattern</h3>
            {history.length === 0 ? (
              <p className="dash-empty">No stress data to visualize yet</p>
            ) : (
              <>
                <div className="dash-stress-split">
                  <div className="dash-split-high" style={{ width: `${highPct}%` }}>High {highPct}%</div>
                  <div className="dash-split-low" style={{ width: `${lowPct}%` }}>Low {lowPct}%</div>
                </div>
                <div className="dash-bar-chart">
                  {weekly.map((d, i) => (
                    <div key={i} className="dash-bar-col">
                      <div className="dash-bar" style={{ height: `${Math.max(d.pct, 4)}%` }}>
                        {d.count > 0 && <span className="dash-bar-tooltip">{d.count}</span>}
                      </div>
                      <span className="dash-bar-label">{d.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Recent Sessions + AYASA Insight ── */}
        <div className="dash-row-2col">
          {/* Recent Sessions */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3 className="dash-panel-title" style={{ margin: 0 }}>Recent Sessions</h3>
              <Link to="/history" style={{ fontSize: '0.75rem', color: '#44e5c2', textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>View All</Link>
            </div>
            {recentSessions.length === 0 ? (
              <p className="dash-empty">No sessions yet — start your first check-in!</p>
            ) : (
              <div className="dash-sessions-list">
                {recentSessions.map((s, i) => {
                  const d = new Date(s.timestamp);
                  const time = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const level = s.stressLevel || 'Moderate';
                  return (
                    <div key={i} className="dash-session-item">
                      <div className="dash-session-left">
                        <div className="dash-session-icon">
                          <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#44e5c2' }}>chat</span>
                        </div>
                        <div>
                          <p className="dash-session-title">{s.emotion ? s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1) + ' Session' : 'Check-in'}</p>
                          <p className="dash-session-time">{time}</p>
                        </div>
                      </div>
                      <span className="dash-session-badge" style={{
                        background: `${stressColors[level]}18`,
                        color: stressColors[level],
                        border: `1px solid ${stressColors[level]}33`,
                      }}>{level}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AYASA Insight */}
          <div className="dash-insight-card">
            <div className="dash-insight-glow" />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <span className="material-symbols-rounded" style={{ color: '#cebdff', fontSize: 20 }}>auto_awesome</span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#cebdff' }}>AYASA Perspective</span>
              </div>
              <blockquote style={{ fontFamily: 'Noto Serif, serif', fontStyle: 'italic', fontSize: '1.05rem', color: '#bacac3', lineHeight: 1.7, marginBottom: '1.5rem', flex: 1 }}>
                {history.length > 0
                  ? '"Your patterns suggest growth emerging from recent challenges. Remember to pause and breathe — small moments of stillness create lasting change."'
                  : '"Begin your journey of self-awareness. Every check-in is a step toward understanding the language of your emotions."'}
              </blockquote>
              <Link to="/checkin" className="btn-secondary" style={{ textAlign: 'center', borderColor: 'rgba(206,189,255,0.2)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chat</span>
                Talk to AYASA
              </Link>
            </div>
          </div>
        </div>

        {/* ── Wellbeing Score ─────── */}
        <div className="dash-wellbeing">
          <div className="dash-wellbeing-inner">
            <div className="dash-wellbeing-gauge">
              <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 280 }}>
                <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                {wellbeing > 0 && (
                  <path
                    d={`M20,100 A80,80 0 ${largeArc},1 ${arcEnd.x.toFixed(1)},${arcEnd.y.toFixed(1)}`}
                    fill="none" stroke="url(#wbGrad)" strokeWidth="12" strokeLinecap="round"
                    style={{ transition: 'all 1s ease' }}
                  />
                )}
                <defs>
                  <linearGradient id="wbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffb4ab" />
                    <stop offset="100%" stopColor="#44e5c2" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="dash-wellbeing-score">
                <span className="dash-wb-num">{wellbeing}</span>
                <span className="dash-wb-max">/ 100</span>
                <span className="dash-wb-label">Wellbeing Score</span>
              </div>
            </div>
            <div className="dash-wellbeing-info">
              <h3 style={{ fontFamily: 'Noto Serif, serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                {wellbeing >= 70 ? 'Thriving' : wellbeing >= 45 ? 'Stability Focus' : 'Needs Attention'}
              </h3>
              <p style={{ color: '#bacac3', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1.2rem' }}>
                {history.length > 0
                  ? <>Your wellbeing score is computed from your last 10 sessions. {wellbeing >= 50 ? 'Keep up the healthy balance!' : 'Consider more frequent check-ins and breaks.'}</>
                  : 'Start checking in to build your wellbeing profile over time.'}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="dash-wb-badge" style={{ background: 'rgba(68,229,194,0.08)', border: '1px solid rgba(68,229,194,0.18)' }}>
                  <span style={{ fontSize: '0.6rem', color: '#44e5c2', fontWeight: 700, textTransform: 'uppercase' }}>Sessions</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{metrics.total}</span>
                </div>
                <div className="dash-wb-badge" style={{ background: 'rgba(206,189,255,0.08)', border: '1px solid rgba(206,189,255,0.18)' }}>
                  <span style={{ fontSize: '0.6rem', color: '#cebdff', fontWeight: 700, textTransform: 'uppercase' }}>Resilience</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{wellbeing >= 60 ? 'Growing' : 'Building'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Gemini Key + Quote ─── */}
        <div className="home-bottom">
          <div className="quote-card" style={{ padding: '1.5rem 1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.9rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#cebdff', fontSize: 20 }}>key</span>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#dfe2f3', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Gemini API Key</h3>
              {localStorage.getItem('geminiApiKey') && (
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#44e5c2', background: 'rgba(68,229,194,0.08)', border: '1px solid rgba(68,229,194,0.2)', borderRadius: 20, padding: '2px 10px', letterSpacing: '0.04em', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>ACTIVE</span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#85948e', margin: '0 0 0.9rem', fontFamily: 'DM Sans, sans-serif' }}>
              Required for AI responses.{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#cebdff', textDecoration: 'none' }}>Get yours here</a>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => { setGeminiKey(e.target.value); setKeySaved(false); }}
                  placeholder="AIza..."
                  style={{ width: '100%', background: 'rgba(10,14,26,0.6)', border: '1px solid rgba(68,229,194,0.15)', borderRadius: 10, padding: '0.6rem 2.4rem 0.6rem 0.85rem', color: '#dfe2f3', fontSize: '0.82rem', fontFamily: 'DM Sans, monospace', outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && saveGeminiKey()}
                />
                <button type="button" onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#85948e', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showKey ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <button onClick={saveGeminiKey} disabled={!geminiKey.trim()} style={{ padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: keySaved ? 'rgba(68,229,194,0.15)' : 'rgba(206,189,255,0.12)', color: keySaved ? '#44e5c2' : '#cebdff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{keySaved ? 'check_circle' : 'save'}</span>
                {keySaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          <div className="quote-card">
            <span className="quote-mark open">"</span>
            <blockquote>"Quiet the mind, and the soul will speak."</blockquote>
            <span className="quote-mark close">"</span>
            <p className="quote-source">— Daily Inspiration</p>
          </div>

          <div className="recommendation-card">
            <div className="rec-icon"><span className="material-symbols-rounded">spa</span></div>
            <div className="rec-content">
              <h3>Nature Sounds</h3>
              <p><span className="material-symbols-rounded" style={{ fontSize: 14 }}>play_arrow</span> Recommended for you</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
