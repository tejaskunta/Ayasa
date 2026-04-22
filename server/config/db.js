const mongoose = require('mongoose');

let connectionPromise = null;

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) {
    console.warn('MongoDB URI is not set. Running with local JSON fallback persistence.');
    return false;
  }

  // Conservative defaults for a traditional Node server workload.
  const options = {
    maxPoolSize: envInt('MONGO_MAX_POOL_SIZE', 20),
    minPoolSize: envInt('MONGO_MIN_POOL_SIZE', 2),
    maxIdleTimeMS: envInt('MONGO_MAX_IDLE_MS', 60000),
    connectTimeoutMS: envInt('MONGO_CONNECT_TIMEOUT_MS', 10000),
    socketTimeoutMS: envInt('MONGO_SOCKET_TIMEOUT_MS', 30000),
    serverSelectionTimeoutMS: envInt('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
  };

  connectionPromise = mongoose.connect(uri, options)
    .then(() => {
      console.log('MongoDB connected.');
      return true;
    })
    .catch((error) => {
      console.error('MongoDB connection failed; falling back to JSON persistence:', error.message);
      return false;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

module.exports = { connectDB };
