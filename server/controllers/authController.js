const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = loadUsers();
    const key = email.toLowerCase().trim();

    if (users[key]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    users[key] = { fullName, email: key, password: hashed };
    saveUsers(users);

    const token = jwt.sign({ email: key }, process.env.JWT_SECRET || 'ayasa_secret_2025', { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { fullName, email: key }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const users = loadUsers();
    const key = email.toLowerCase().trim();
    const user = users[key];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ email: key }, process.env.JWT_SECRET || 'ayasa_secret_2025', { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { fullName: user.fullName, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
