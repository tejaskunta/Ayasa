const mongoose = require('mongoose');

/**
 * Connect to MongoDB once, at boot.
 *
 * Unlike the original (which called connect in two places and had a stray
 * server/db.js duplicate), there is exactly one connection module.
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!globalThis.__ayasaMongoConnection) {
    globalThis.__ayasaMongoConnection = mongoose.connect(uri)
      .then(() => mongoose.connection)
      .catch((error) => {
        globalThis.__ayasaMongoConnection = null;
        throw error;
      });
  }
  await globalThis.__ayasaMongoConnection;
  return mongoose.connection;
}

module.exports = { connectDB };