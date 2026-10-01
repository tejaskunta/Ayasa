import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api.js';

/**
 * Auth state lives in one context so no page has to re-implement login logic.
 * On first load we ask /auth/me to validate any stored token, so a stale token
 * does not leave the UI in a half-logged-in state.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Validate a stored token once on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!localStorage.getItem('ayasa.token')) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await api.me();
        if (alive) setUser(me);
      } catch {
        if (alive) logout();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [logout]);

  // If any request 401s, drop the session globally.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('ayasa:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ayasa:unauthorized', onUnauthorized);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, user: me } = await api.login({ email, password });
    setToken(token);
    setUser(me);
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    const { token, user: me } = await api.register({ email, password, fullName });
    setToken(token);
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}