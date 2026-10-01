/**
 * One API helper for the whole app.
 *
 * Responsibilities:
 *  - attach the JWT automatically
 *  - parse JSON once, in one place
 *  - surface a clean Error with the server's message
 *  - clear the token and signal the app when a 401 happens
 *
 * The original spread fetch calls across every page with different error
 * handling. Centralising it removes a whole class of "sometimes it fails"
 * behaviour.
 */

const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('ayasa.token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ayasa.token', token);
  else localStorage.removeItem('ayasa.token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (server down, offline).
    throw new Error('Could not reach the server. Please check your connection.');
  }

  // 204 or empty body -> nothing to parse.
  const text = await res.text();
  const data = text ? safeJson(text) : {};

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('ayasa:unauthorized'));
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),

  createSession: () => request('/sessions', { method: 'POST' }),
  listSessions: () => request('/sessions'),
  getMessages: (id) => request(`/sessions/${id}/messages`),
  postMessage: (id, text) => request(`/sessions/${id}/messages`, { method: 'POST', body: { text } }),

  createCheckIn: (text) => request('/checkins', { method: 'POST', body: { text } }),
  listCheckIns: () => request('/checkins'),
  getInsights: () => request('/checkins/insights'),
};