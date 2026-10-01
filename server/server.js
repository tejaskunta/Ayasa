require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const { CONTRACT_VERSION } = require('./contract');
const { errorHandler } = require('./utils/http');
const modelClient = require('./utils/modelClient');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const checkInRoutes = require('./routes/checkins');

const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayasa';

function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
  app.use(express.json({ limit: '1mb' }));

  // Health check that also reports whether the model service is reachable.
  // A single place to answer "is the stack up?".
  app.get('/api/health', async (_req, res) => {
    const model = await modelClient.health();
    res.json({ status: 'ok', contractVersion: CONTRACT_VERSION, model });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/checkins', checkInRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

async function start() {
  const app = createApp();
  await connectDB(MONGODB_URI);
  console.log('[server] connected to MongoDB');
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

// Only start when run directly, so tests can import createApp without a socket.
if (require.main === module) {
  start().catch((err) => {
    console.error('[server] failed to start', err);
    process.exit(1);
  });
}

module.exports = { createApp };