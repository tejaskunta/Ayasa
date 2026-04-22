const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/messages', require('./routes/messages'));

app.get('/health', (_req, res) => res.json({ status: 'Server is running', time: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;

if (require.main === module) {
  const { connectDB } = require('./config/db');
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Ayasa server running on http://localhost:${PORT}`));
  });
}
