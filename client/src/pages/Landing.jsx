import { Link } from 'react-router-dom';

/** Public marketing page. Quiet, spacious, one clear action. */
export default function Landing() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <h1>A calm place to check in with yourself.</h1>
      <p className="muted" style={{ maxWidth: 520, margin: '0 auto 28px', fontSize: '1.05rem' }}>
        Ayasa listens to how you are feeling, reflects it back gently, and keeps a
        private record so you can notice patterns over time.
      </p>

      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/register" className="btn btn-primary">
          Create an account
        </Link>
        <Link to="/login" className="btn btn-ghost">
          I already have one
        </Link>
      </div>

      <div
        className="card card-soft"
        style={{ maxWidth: 560, margin: '48px auto 0', textAlign: 'left' }}
      >
        <h3>What it does</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-soft)' }}>
          <li>Listens to a message or a quick check-in.</li>
          <li>Estimates stress and emotion, and responds in kind.</li>
          <li>Flags crisis language and always shows real helplines.</li>
          <li>Keeps a private history you can look back on.</li>
        </ul>
      </div>

      <p className="faint" style={{ marginTop: 24, maxWidth: 520, marginInline: 'auto' }}>
        Ayasa is a supportive companion, not a medical service. If you are in
        danger, please contact your local emergency number.
      </p>
    </div>
  );
}