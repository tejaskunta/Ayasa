import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

const stressColors  = { Low: '#4aa3ff', Moderate: '#cebdff', High: '#ffb4ab' };
const stressLevelToValue = { Low: 1, Moderate: 2, High: 3 };
const emotionEmojis = {
  joy: '😄', sadness: '😢', anger: '😡', fear: '😨',
  love: '😍', surprise: '😲', unknown: '💭',
};
const emotionColors = {
  joy: '#FFD700', sadness: '#4A90E2', anger: '#FF4500',
  fear: '#9B51E0', love: '#FF69B4', surprise: '#00CED1', unknown: '#85948e',
};

function sanitizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries.reduce((acc, item) => {
    if (!item || typeof item !== 'object') return acc;

    const rawTimestamp = item.timestamp || item.createdAt || item.date;
    if (!rawTimestamp) return acc;

    const dt = new Date(rawTimestamp);
    if (Number.isNaN(dt.getTime())) return acc;

    acc.push({ ...item, timestamp: dt.toISOString() });
    return acc;
  }, []);
}

function buildTrendPoints(history) {
  const sorted = [...history]
    .filter((item) => {
      if (!item?.timestamp) return false;
      const time = new Date(item.timestamp).getTime();
      return !Number.isNaN(time);
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-14);

  return sorted.map((item, idx) => ({
    x: idx,
    value: stressLevelToValue[item.stressLevel] || 2,
    label: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}

function buildHeatmapCells(history) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cells = [];
  const byDayKey = {};

  history.forEach((item) => {
    if (!item?.timestamp) return;
    const dt = new Date(item.timestamp);
    if (Number.isNaN(dt.getTime())) return;
    const key = dt.toISOString().slice(0, 10);
    const level = stressLevelToValue[item.stressLevel] || 2;
    byDayKey[key] = Math.max(byDayKey[key] || 0, level);
  });

  for (let i = 27; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const level = byDayKey[key] || 0;

    cells.push({
      key,
      day: days[dt.getDay()],
      level,
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return cells;
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    let email = 'default';
    try { email = JSON.parse(localStorage.getItem('user'))?.email || 'default'; } catch {}
    const historyKey = `history_${email}`;
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        const cleaned = sanitizeHistoryEntries(arr);
        setHistory(cleaned);

        // One-time cleanup: persist normalized, valid entries so future renders stay safe.
        if (!Array.isArray(arr) || cleaned.length !== arr.length) {
          localStorage.setItem(historyKey, JSON.stringify(cleaned));
        }
      }
      catch { setHistory([]); }
    }
  }, []);

  const filters = useMemo(() => {
    const set = new Set(['All']);
    history.forEach(h => {
      if (h.stressLevel === 'High') set.add('High Stress');
      if (h.stressLevel === 'Low') set.add('Low Stress');
      const em = (h.emotion || '').toLowerCase();
      if (em && em !== 'unknown') set.add(em.charAt(0).toUpperCase() + em.slice(1));
    });
    return Array.from(set);
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (filter === 'High Stress' && h.stressLevel !== 'High') return false;
      if (filter === 'Low Stress' && h.stressLevel !== 'Low') return false;
      const em = (h.emotion || '').toLowerCase();
      if (!['All', 'High Stress', 'Low Stress'].includes(filter) && em !== filter.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (h.feeling || '').toLowerCase().includes(q) ||
               (h.ayasaResponse || '').toLowerCase().includes(q) ||
               (h.emotion || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [history, filter, search]);

  const trend = useMemo(() => buildTrendPoints(filtered), [filtered]);
  const heatmap = useMemo(() => buildHeatmapCells(filtered), [filtered]);

  const formatDate = (ts) => {
    if (!ts) return 'Unknown date';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' \u2022 ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="hist-page">
      <div className="sanctuary-grain" />
      <div className="sanctuary-aurora" />

      {/* Header */}
      <header className="hist-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/home" className="sanctuary-back">
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <span style={{ fontFamily: 'Playfair Display, Noto Serif, serif', fontStyle: 'italic', fontSize: '1.25rem', fontWeight: 700, color: '#4aa3ff' }}>AYASA</span>
        </div>
        <nav style={{ display: 'flex', gap: 24, fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 600 }}>
          <Link to="/home" style={{ color: '#85948e', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/home" style={{ color: '#85948e', textDecoration: 'none' }}>Chat</Link>
          <span style={{ color: '#4aa3ff', fontWeight: 600, borderBottom: '2px solid #4aa3ff', paddingBottom: 2 }}>History</span>
        </nav>
      </header>

      <main className="hist-main">
        {/* Title + Search */}
        <div className="hist-title-row">
          <div>
            <h1 className="hist-title">
              Your Conversations
              <span className="hist-title-line" />
            </h1>
            <p className="hist-subtitle">A record of every moment you chose to reach out.</p>
          </div>
          <div className="hist-search-wrap">
            <span className="material-symbols-rounded hist-search-icon">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="hist-search"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="hist-filter-row">
          <div className="hist-filters">
            {filters.map(f => (
              <button
                key={f}
                className={`hist-filter-pill${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
          <span style={{ fontSize: '0.7rem', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#85948e' }}>
            {filtered.length} {filtered.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        <section className="hist-analytics-grid">
          <article className="hist-analytics-card">
            <div className="hist-analytics-head">
              <h3>Stress Trend</h3>
              <span>Last {Math.max(0, trend.length)} sessions</span>
            </div>
            {trend.length === 0 ? (
              <p className="dash-empty">No stress trend available yet</p>
            ) : (
              <svg viewBox="0 0 480 180" className="hist-trend-svg" role="img" aria-label="Stress trend graph">
                <defs>
                  <linearGradient id="stressTrendBlue" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#a7d4ff" />
                    <stop offset="100%" stopColor="#4aa3ff" />
                  </linearGradient>
                </defs>
                {[1, 2, 3].map((lvl) => {
                  const y = 150 - ((lvl - 1) / 2) * 120;
                  return <line key={lvl} x1="24" y1={y} x2="456" y2={y} stroke="rgba(27,31,44,0.12)" strokeWidth="1" />;
                })}
                <polyline
                  fill="none"
                  stroke="url(#stressTrendBlue)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trend.map((p, idx) => {
                    const x = 24 + (idx / Math.max(1, trend.length - 1)) * 432;
                    const y = 150 - ((p.value - 1) / 2) * 120;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                {trend.map((p, idx) => {
                  const x = 24 + (idx / Math.max(1, trend.length - 1)) * 432;
                  const y = 150 - ((p.value - 1) / 2) * 120;
                  return <circle key={`${p.label}-${idx}`} cx={x} cy={y} r="4" fill="#4aa3ff" />;
                })}
              </svg>
            )}
          </article>

          <article className="hist-analytics-card">
            <div className="hist-analytics-head">
              <h3>Stress Heatmap</h3>
              <span>Last 28 days</span>
            </div>
            <div className="hist-heatmap-grid">
              {heatmap.map((cell) => (
                <div
                  key={cell.key}
                  className={`hist-heat-cell level-${cell.level}`}
                  title={`${cell.label} (${cell.day})`}
                  aria-label={`${cell.label} stress level ${cell.level}`}
                />
              ))}
            </div>
            <div className="hist-heat-legend">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
            </div>
          </article>
        </section>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="hist-empty">
            <div className="hist-empty-orb">
              <span className="material-symbols-rounded" style={{ fontSize: 40, color: '#85948e' }}>history</span>
            </div>
            {history.length === 0 ? (
              <>
                <p style={{ color: '#1b1f2c', fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>No check-ins yet</p>
                <p style={{ color: '#85948e', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Complete your first stress check to see your journey here.</p>
                <Link to="/home" className="hist-cta-btn">
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>play_arrow</span>
                  Open Main Chat
                </Link>
              </>
            ) : (
              <p style={{ color: '#85948e', fontSize: '0.9rem' }}>No sessions match your filter.</p>
            )}
          </div>
        ) : (
          <div className="hist-grid">
            {filtered.map((item, i) => {
              const level   = item.stressLevel || 'Moderate';
              const sColor  = stressColors[level] || '#cebdff';
              const em      = (item.emotion || 'unknown').toLowerCase();
              const emoji   = emotionEmojis[em] || '💭';
              const emColor = emotionColors[em] || '#85948e';
              const emLabel = em.charAt(0).toUpperCase() + em.slice(1);
              const summary = item.feeling || 'Check-in completed';
              const preview = item.ayasaResponse
                ? 'AYASA: ' + item.ayasaResponse.slice(0, 140) + (item.ayasaResponse.length > 140 ? '...' : '')
                : '';

              return (
                <div key={i} className="hist-card" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="hist-card-glow" />

                  {/* Top row: date + badges */}
                  <div className="hist-card-top">
                    <span className="hist-card-date">{formatDate(item.timestamp)}</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="hist-badge" style={{ background: `${emColor}15`, color: emColor, borderColor: `${emColor}30` }}>
                        {emoji} {emLabel}
                      </span>
                      <span className="hist-badge" style={{ background: `${sColor}15`, color: sColor, borderColor: `${sColor}30` }}>
                        {level === 'High' ? '🔴' : level === 'Low' ? '🟢' : '🟡'} {level} Stress
                      </span>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="hist-card-headline">{summary}</h3>

                  {/* Preview */}
                  {preview && <p className="hist-card-preview">{preview}</p>}

                  {/* Footer */}
                  <div className="hist-card-footer">
                    <span style={{ fontSize: '0.7rem', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#85948e' }}>
                      {item.confidence ? `${item.confidence}% confidence` : ''}
                    </span>
                    <Link to="/home" className="hist-card-link">
                      Continue Chat
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="hist-bottom-actions">
          <Link to="/home" className="hist-action-btn primary">
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add_circle</span>
            New Chat Entry
          </Link>
          <Link to="/home" className="hist-action-btn secondary">
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>home</span>
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
