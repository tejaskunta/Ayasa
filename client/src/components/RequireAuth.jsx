import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/** Gate a route behind auth. Shows nothing while the token is being checked. */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 80 }}>
        <p className="muted">Checking your session…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}