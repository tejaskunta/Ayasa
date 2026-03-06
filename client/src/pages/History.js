import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

const defaultHistory = [
  {
    id: 1,
    date: 'Oct 24, 2023 • 14:30 PM',
    level: 2,
    text: "I felt really overwhelmed during the meeting today because the project deadline was moved up unexpectedly, and I haven't finished the initial report yet...",
    confidence: 92,
  },
  {
    id: 2,
    date: 'Oct 23, 2023 • 09:15 AM',
    level: 1,
    text: 'Morning commute was stressful due to heavy traffic, but I tried some breathing exercises which helped a little bit before arriving at the office.',
    confidence: 85,
  },
  {
    id: 3,
    date: 'Oct 22, 2023 • 20:45 PM',
    level: 0,
    text: "Had a relaxing evening reading my book. The day went well overall and I feel prepared for tomorrow's presentation.",
    confidence: 98,
  },
  {
    id: 4,
    date: 'Oct 20, 2023 • 11:00 AM',
    level: 2,
    text: 'Conflict with a colleague regarding the budget allocation. It escalated quickly and I felt my heart racing for an hour afterwards.',
    confidence: 89,
  }
];

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const stressLabels = ['Low Stress', 'Medium Stress', 'High Stress'];
  const stressClasses = ['low', 'moderate', 'high'];
  const stressIcons = ['check_circle', 'remove_circle', 'warning'];

  // Get history from localStorage or use defaults
  const savedHistory = JSON.parse(localStorage.getItem('checkInHistory') || '[]');
  const allHistory = savedHistory.length > 0
    ? savedHistory.map((item, i) => ({
        id: item.id || i,
        date: item.date || new Date(item.timestamp).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        level: item.stressLevel,
        text: item.text || item.feeling || 'Check-in entry',
        confidence: parseInt(item.confidence) || 85,
      }))
    : defaultHistory;

  const filteredHistory = useMemo(() => {
    return allHistory.filter(item => {
      const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterLevel === 'all' || item.level === parseInt(filterLevel);
      return matchesSearch && matchesFilter;
    });
  }, [allHistory, searchQuery, filterLevel]);

  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="history-page">
      <header className="navbar">
        <div className="navbar-brand">
          <span className="material-symbols-outlined">spa</span> AYASA
        </div>
        <div className="navbar-links">
          <Link to="/home">Dashboard</Link>
          <Link to="/history" className="active">History</Link>
        </div>
        <div className="navbar-right">
          <Link to="/checkin" className="btn-checkin-nav">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
            Check In
          </Link>
          <button className="navbar-icon-btn" title="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: '1.15rem' }}>notifications</span>
          </button>
          <div className="navbar-avatar">U</div>
        </div>
      </header>

      <div className="history-content">
        <div className="history-header">
          <div className="history-header-text">
            <h1>Stress History</h1>
            <p>Your Mental Wellness Journey</p>
          </div>
          <div className="history-filters">
            <div className="search-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              className="filter-select"
              value={filterLevel}
              onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Stress Levels</option>
              <option value="0">Low Stress</option>
              <option value="1">Medium Stress</option>
              <option value="2">High Stress</option>
            </select>
          </div>
        </div>

        <div className="history-timeline">
          {paginatedHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>search_off</span>
              <p>No entries found. Try a different search or filter.</p>
            </div>
          ) : (
            paginatedHistory.map((item) => (
              <div key={item.id} className={`history-entry ${stressClasses[item.level]}`}>
                <div className={`entry-icon ${stressClasses[item.level]}`}>
                  <span className="material-symbols-outlined">{stressIcons[item.level]}</span>
                </div>
                <div className="entry-content">
                  <div className="entry-header">
                    <span className={`entry-stress-badge ${stressClasses[item.level]}`}>
                      {stressLabels[item.level]}
                    </span>
                    <span className="entry-date">{item.date}</span>
                  </div>
                  <p className="entry-text">{item.text}</p>
                  <div className="entry-confidence">
                    <span className="conf-label">AI Confidence</span>
                    <div className="conf-bar">
                      <div className="conf-bar-fill" style={{ width: `${item.confidence}%` }} />
                    </div>
                    <span className="conf-value">{item.confidence}%</span>
                  </div>
                </div>
                <div className="entry-action">
                  <button className="btn-details">
                    View Details
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
              Previous
            </button>
            <div className="pagination-numbers">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  className={`page-num ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              {totalPages > 3 && (
                <>
                  <span className="page-dots">...</span>
                  <button
                    className={`page-num ${currentPage === totalPages ? 'active' : ''}`}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
