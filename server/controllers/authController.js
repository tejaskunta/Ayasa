const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Mock user data for demo (replace with real DB queries when MongoDB is ready)
const mockUsers = {};

exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Mock database check
    if (mockUsers[email]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // For demo, just store in mock object
    mockUsers[email] = { fullName, email, password };

    const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { fullName, email }
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

    // Mock authentication
    const user = mockUsers[email];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: { fullName: user.fullName, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
