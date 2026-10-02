import { useEffect, useState } from 'react';
import { api } from '../api.js';
import StressPill from '../components/StressPill.jsx';

/** Shows a quick check-in composer and simple aggregate insights. */
export default function Insights() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [latestReply, setLatestReply] = useState('');

  const load = async () => {
    try {
      const [ins, list] = await Promise.all([api.getInsights(), api.listCheckIns()]);
      setInsights(ins);
      setCheckIns(list.checkIns);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.createCheckIn(value);
      setLatestReply(res.checkIn.reply);
      setText('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = insights?.counts || { Low: 0, Medium: 0, High: 0 };

  const when = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <h2>A quick check-in</h2>
        <p className="muted">One sentence is enough. This is separate from your chat.</p>
        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form className="stack" onSubmit={submit}>
          <label htmlFor="checkin" className="sr-only">
            Your check-in
          </label>
          <textarea
            id="checkin"
            value={text}
            placeholder="How is today going?"
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Saving…' : 'Log check-in'}
            </button>
          </div>
        </form>
        {latestReply && (
          <div className="card card-soft" style={{ marginTop: 16 }}>
            <strong>Ayasa:</strong> <span className="muted">{latestReply}</span>
          </div>
        )}
      </div>

      <div>
        <h2>Your patterns</h2>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 140 }}>
            <div className="faint">Total check-ins</div>
            <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-body)' }}>
              {insights?.total ?? '—'}
            </div>
          </div>
          <div className="card" style={{ flex: 2, minWidth: 240 }}>
            <div className="faint" style={{ marginBottom: 8 }}>
              By stress level
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="pill pill-low">Low · {counts.Low}</span>
              <span className="pill pill-medium">Medium · {counts.Medium}</span>
              <span className="pill pill-high">High · {counts.High}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3>Recent</h3>
        {checkIns.length === 0 ? (
          <p className="muted faint">Nothing logged yet.</p>
        ) : (
          <div className="stack">
            {checkIns.slice(0, 10).map((c) => (
              <div key={c._id} className="card card-soft">
                <div className="row">
                  <span className="muted">{c.text}</span>
                  <span className="spacer" />
                  <StressPill level={c.stressLevel} />
                </div>
                <div className="faint" style={{ marginTop: 6 }}>
                  {when(c.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}