const { createApp } = require('../server');
const { connectDB } = require('../config/db');

const app = createApp();
let databasePromise;

module.exports = async (req, res) => {
  databasePromise ||= connectDB(process.env.MONGODB_URI);
  await databasePromise;
  return app(req, res);
};