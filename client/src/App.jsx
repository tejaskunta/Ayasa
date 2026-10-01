import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Chat from './pages/Chat.jsx';
import Insights from './pages/Insights.jsx';

/** Send logged-in users away from the public pages. */
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/app" replace /> : children;
}

function Shell(children) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={Shell(<Landing />)} />
          <Route
            path="/login"
            element={<PublicOnly>{Shell(<Login />)}</PublicOnly>}
          />
          <Route
            path="/register"
            element={<PublicOnly>{Shell(<Register />)}</PublicOnly>}
          />
          <Route
            path="/app"
            element={
              <RequireAuth>{Shell(<Chat />)}</RequireAuth>
            }
          />
          <Route
            path="/insights"
            element={
              <RequireAuth>{Shell(<Insights />)}</RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}