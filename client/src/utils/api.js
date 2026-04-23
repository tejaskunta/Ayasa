// Resolves the API base URL for fetch calls.
// In development, CRA's proxy rewrites relative /api/* calls to localhost:5000.
// In production (Render), REACT_APP_API_URL is injected at build time as the
// API service hostname (e.g. "ayasa-server.onrender.com"). We prepend https://.
const API_BASE = process.env.REACT_APP_API_URL
  ? `https://${process.env.REACT_APP_API_URL}`
  : '';

export default API_BASE;
