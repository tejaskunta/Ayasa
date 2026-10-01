// Resolves the API base URL for fetch calls.
// In development, CRA's proxy rewrites relative /api/* calls to localhost:5000.
// In production, accept either a full URL or a bare hostname from env.
const rawApiUrl = process.env.REACT_APP_API_URL || '';
const API_BASE = rawApiUrl
  ? rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
    ? rawApiUrl
    : `https://${rawApiUrl}`
  : '';

export default API_BASE;
