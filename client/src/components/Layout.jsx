import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const navClass = ({ isActive }) =>
  ['btn', 'btn-ghost', 'nav-link', isActive ? 'is-active' : ''].join(' ');

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
            <NavLink to="/app" end className={navClass}>
              Chat
            </NavLink>
            <NavLink to="/insights" className={navClass}>
              Insights
            </NavLink>
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