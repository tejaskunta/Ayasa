import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Orb from '../components/Orb.jsx';
import StressPill, { EmotionPill } from '../components/StressPill.jsx';
import '../styles/chat.css';

/**
 * Chat — the core experience.
 *
 * Flow:
 *  1. on mount, list sessions; create one if the user has none
 *  2. load that session's messages
 *  3. sending: optimistic user bubble -> POST -> replace with server truth
 *  4. crisis: the bot turn is rendered with a distinct style AND the orb tone
 *     shifts, so safety is impossible to miss
 */
export default function Chat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const listRef = useRef(null);

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

  // Keep the newest turn in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

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

  const orbTone = lastAnalysis
    ? lastAnalysis.stressLevel === 'High'
      ? 'high'
      : lastAnalysis.stressLevel === 'Medium'
        ? 'medium'
        : 'calm'
    : 'calm';

  return (
    <div className="container" style={{ paddingInline: 0 }}>
      <div className="row" style={{ marginBottom: 20 }}>
        <Orb tone={orbTone} size={64} />
        <div>
          <h2 style={{ margin: 0 }}>How are you feeling?</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.92rem' }}>
            Share as much or as little as you like.
          </p>
        </div>
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
        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && !busy && (
            <p className="muted faint">No messages yet. Say anything to begin.</p>
          )}

          {messages.map((m) => (
            <div
              key={m._id}
              className={[
                'turn',
                m.sender === 'user' ? 'turn-user' : 'turn-bot',
                m.wasCrisis ? 'turn-crisis' : '',
              ].join(' ')}
            >
              <div>{m.text}</div>
              {m.sender === 'user' && (m.stressLevel || m.emotion) && (
                <div className="turn-meta">
                  <StressPill level={m.stressLevel} />
                  <EmotionPill emotion={m.emotion} />
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="turn turn-bot">
              <span className="typing" aria-label="Ayasa is thinking">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={send}>
          <label htmlFor="msg" className="sr-only" style={{ display: 'none' }}>
            Your message
          </label>
          <textarea
            id="msg"
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
          Estimated in <strong>{lastAnalysis.modelMode}</strong> mode
          {lastAnalysis.confidence != null
            ? ` · confidence ${Math.round(lastAnalysis.confidence * 100)}%`
            : ''}
          {lastAnalysis.wasCrisis ? ' · safety override applied' : ''}
        </p>
      )}
    </div>
  );
}