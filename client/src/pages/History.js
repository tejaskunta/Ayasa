import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

const stressColors  = { Low: '#44e5c2', Moderate: '#cebdff', High: '#ffb4ab' };
const emotionEmojis = {
  joy: '😄', sadness: '😢', anger: '😡', fear: '😨',
  love: '😍', surprise: '😲', unknown: '💭',
};
const emotionColors = {
  joy: '#FFD700', sadness: '#4A90E2', anger: '#FF4500',
  fear: '#9B51E0', love: '#FF69B4', surprise: '#00CED1', unknown: '#85948e',
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    let email = 'default';
    try { email = JSON.parse(localStorage.getItem('user'))?.email || 'default'; } catch {}
    const raw = localStorage.getItem(`history_${email}`);
    if (raw) {
      try { const arr = JSON.parse(raw); setHistory(Array.isArray(arr) ? arr : []); }
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

  const formatDate = (ts) => {
    if (!ts) return 'Unknown date';
    const d = new Date(ts);
    if (isNaN(d)) return ts;
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
          <span style={{ fontFamily: 'Noto Serif, serif', fontStyle: 'italic', fontSize: '1.25rem', fontWeight: 700, color: '#44e5c2' }}>AYASA</span>
        </div>
        <nav style={{ display: 'flex', gap: 24, fontFamily: 'Noto Serif, serif', fontSize: '0.85rem' }}>
          <Link to="/home" style={{ color: '#85948e', textDecoration: 'none' }}>Sanctuary</Link>
          <Link to="/checkin" style={{ color: '#85948e', textDecoration: 'none' }}>Journal</Link>
          <span style={{ color: '#44e5c2', fontWeight: 600, borderBottom: '2px solid #44e5c2', paddingBottom: 2 }}>History</span>
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

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="hist-empty">
            <div className="hist-empty-orb">
              <span className="material-symbols-rounded" style={{ fontSize: 40, color: '#85948e' }}>history</span>
            </div>
            {history.length === 0 ? (
              <>
                <p style={{ color: '#dfe2f3', fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>No check-ins yet</p>
                <p style={{ color: '#85948e', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Complete your first stress check to see your journey here.</p>
                <Link to="/checkin" className="hist-cta-btn">
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>play_arrow</span>
                  Start Your First Check-in
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
                    <Link to="/checkin" className="hist-card-link">
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
          <Link to="/checkin" className="hist-action-btn primary">
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add_circle</span>
            New Check-in
          </Link>
          <Link to="/home" className="hist-action-btn secondary">
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>home</span>
            Back to Sanctuary
          </Link>
        </div>
      </main>
    </div>
  );
}
