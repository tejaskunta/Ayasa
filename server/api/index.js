const { createApp } = require('../server');
const { connectDB } = require('../config/db');

const app = createApp();
let databasePromise;

// /api/health answers even while the database is down — it reports DB status
// instead of being blocked by it.
const HEALTH_PATH = '/api/health';

function dbHealth() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return { state: states[require('mongoose').connection.readyState] || 'unknown' };
}

module.exports = async (req, res) => {
  if (req.url.startsWith(HEALTH_PATH) || req.method === 'OPTIONS') {
    // Health and CORS preflight never require a DB round-trip.
    if (req.url.startsWith(HEALTH_PATH)) {
      const model = await require('../utils/modelClient').health();
      // This response skips Express' cors middleware, so set the header here.
      res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || '*');
      return res.json({ status: 'ok', model, database: dbHealth() });
    }
    return app(req, res);
  }
  databasePromise ||= connectDB(process.env.MONGODB_URI).catch((error) => {
    databasePromise = null;
    throw error;
  });
  try {
    await databasePromise;
  } catch (error) {
    console.error('[serverless] database connection failed:', error?.message || error);
    return res.status(503).json({ error: 'Database unavailable', detail: String(error?.message || error).slice(0, 200) });
  }
  return app(req, res);
};