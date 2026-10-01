import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/** Shared top bar. Shows the brand, nav, and a logout button when signed in. */
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page">
      <header className="topbar">
        <Link to={user ? '/app' : '/'} className="brand">
          Ayasa<span className="brand-dot">.</span>
        </Link>
        <span className="spacer" />
        {user ? (
          <div className="row">
            <Link to="/app" className="btn btn-ghost">
              Chat
            </Link>
            <Link to="/insights" className="btn btn-ghost">
              Insights
            </Link>
            <button className="btn btn-link" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="row">
            <Link to="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get started
            </Link>
          </div>
        )}
      </header>
      <main className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {children}
      </main>
    </div>
  );
}