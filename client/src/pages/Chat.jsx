import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import StressPill, { EmotionPill } from '../components/StressPill.jsx';
import '../styles/chat.css';

/**
 * Chat — the core experience.
 *
 * Flow:
 *  1. on mount, list sessions; create one if the user has none
 *  2. load that session's messages
 *  3. sending: optimistic user bubble -> POST -> replace with server truth
 *  4. crisis: the safety *reply* carries the crisis style + label, and a
 *     banner repeats the helplines at the top of the thread
 *
 * Layout notes (Alden): the thread is a parchment stage, so white bot cards
 * read as surfaces without shadows. The user's analysis pills sit beside
 * their sage bubble, never painted over it.
 */

const STARTERS = [
  'Today has been a lot.',
  "I can't switch my brain off.",
  'I want to reflect on my week.',
];

/** "rules_only" is dev-speak; the footer should say who did the reading. */
function modeNote(mode) {
  if (mode === 'transformer') return 'Language-model estimate';
  return "Built-in reader's estimate";
}

export default function Chat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const endRef = useRef(null);
  const composerRef = useRef(null);

  // --- boot: ensure a session + load its messages --------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { sessions } = await api.listSessions();
        let id = sessions[0]?._id;
        if (!id) {
          const created = await api.createSession();
          id = created.session._id;
        }
        if (!alive) return;
        setSessionId(id);
        const { messages: msgs } = await api.getMessages(id);
        if (alive) setMessages(msgs);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Keep the newest turn in view (respecting reduced-motion).
  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
  }, [messages, busy]);

  // Grow the composer with its content, up to the CSS max-height.
  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy || !sessionId) return;

    setError('');
    setText('');
    setBusy(true);

    // Optimistic user bubble while we wait for the server's analysis.
    const optimistic = {
      _id: `tmp-${Date.now()}`,
      sender: 'user',
      text: value,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.postMessage(sessionId, value);
      // Replace the optimistic bubble with the persisted one, then add the bot.
      setMessages((prev) => [
        ...prev.filter((m) => m._id !== optimistic._id),
        res.userMessage,
        res.botMessage,
      ]);
      setLastAnalysis(res.analysis);
    } catch (err) {
      setError(err.message);
      // Roll back the optimistic bubble so state matches reality.
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(value);
    } finally {
      setBusy(false);
    }
  };

  /** A fresh session = a clean page. Old conversations stay in the history. */
  const startFresh = async () => {
    if (busy) return;
    try {
      const created = await api.createSession();
      setSessionId(created.session._id);
      setMessages([]);
      setLastAnalysis(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const useStarter = (starter) => {
    setText(starter);
    composerRef.current?.focus();
  };

  return (
    <div className="container" style={{ paddingInline: 0 }}>
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>How are you feeling?</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.92rem' }}>
            Share as much or as little as you like.
          </p>
        </div>
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={startFresh}
          disabled={busy || messages.length === 0}
        >
          New conversation
        </button>
      </div>

      {lastAnalysis?.wasCrisis && (
        <div className="safety-banner" role="alert" style={{ marginBottom: 16 }}>
          <strong>Your safety matters.</strong> If you might hurt yourself, please call
          your local emergency number, or in India Tele-MANAS on <strong>14416</strong>.
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="chat">
        <div className="thread">
          {messages.length === 0 && !busy && (
            <div className="empty">
              <p className="muted" style={{ margin: 0 }}>
                This is your space. Start wherever you are.
              </p>
              <div className="chips">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    onClick={() => useStarter(s)}
                    disabled={!sessionId}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.sender === 'user' ? (
              <div key={m._id} className="turn-row">
                <div className="turn turn-user">{m.text}</div>
                {(m.stressLevel || m.emotion) && (
                  <div className="turn-meta">
                    <StressPill level={m.stressLevel} />
                    <EmotionPill emotion={m.emotion} />
                  </div>
                )}
              </div>
            ) : (
              <div
                key={m._id}
                className={['turn', 'turn-bot', m.wasCrisis ? 'turn-crisis' : ''].join(' ')}
              >
                {m.wasCrisis && <span className="turn-label">A note on safety</span>}
                {m.text}
              </div>
            ),
          )}

          <div className="sr-only" aria-live="polite">
            {busy ? 'Ayasa is thinking' : ''}
          </div>

          {busy && (
            <div className="turn turn-bot">
              <span className="typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={send}>
          <label htmlFor="msg" className="sr-only">
            Your message
          </label>
          <textarea
            id="msg"
            ref={composerRef}
            value={text}
            placeholder="Type how you're feeling…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            disabled={busy || !sessionId}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
      </div>

      {lastAnalysis && (
        <p className="faint" style={{ marginTop: 14 }}>
          {modeNote(lastAnalysis.modelMode)}
          {' · a supportive companion, not a diagnosis'}
        </p>
      )}
    </div>
  );
}