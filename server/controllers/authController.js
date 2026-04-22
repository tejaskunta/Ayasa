const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

const ML_BASE_URL = process.env.ML_BACKEND_URL || 'http://localhost:8000';

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'ayasa_secret_2025', { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const key = email.toLowerCase().trim();
    const existing = await User.findOne({ email: key }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const created = await User.create({
      fullName: String(fullName || '').trim() || 'User',
      email: key,
      password_hash: password,
    });
    const token = signToken(String(created._id));

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { fullName: created.fullName, email: created.email }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const key = email.toLowerCase().trim();
    const user = await User.findOne({ email: key }).select('+password_hash');

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(String(user._id));

    return res.json({
      message: 'Login successful',
      token,
      user: { fullName: user.fullName, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const nextName = String(fullName || '').trim();
    const safeEmail = String(email || '').toLowerCase().trim();

    if (!nextName) {
      return res.status(400).json({ error: 'fullName is required' });
    }

    let updated = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName: nextName },
      { new: true }
    ).lean();

    if (!updated && safeEmail) {
      updated = await User.findOneAndUpdate(
        { email: safeEmail },
        { fullName: nextName },
        { new: true }
      ).lean();
    }

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Profile updated successfully',
      user: {
        fullName: updated.fullName,
        email: updated.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.saveRuntimeKeys = async (req, res) => {
  try {
    const llmApiKey = String(req.body.llmApiKey || '').trim();
    const hfToken = String(req.body.hfToken || '').trim();

    await User.findByIdAndUpdate(req.user.userId, {
      llm_api_key: llmApiKey,
      hf_token: hfToken,
    });

    // Sync keys with ML backend so runtime can update without env edits.
    try {
      await axios.post(
        `${ML_BASE_URL}/runtime/keys`,
        {
          user_id: String(req.user.userId),
          llm_api_key: llmApiKey,
          hf_token: hfToken,
        },
        {
          timeout: 10000,
          headers: {
            'x-sync-token': process.env.RUNTIME_SYNC_TOKEN || '',
          },
        }
      );
    } catch {
      // Do not fail user settings save if ML backend sync is temporarily unavailable.
    }

    return res.json({
      message: 'Runtime keys saved',
      status: {
        llmConfigured: Boolean(llmApiKey),
        hfConfigured: Boolean(hfToken),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getRuntimeKeyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+llm_api_key +hf_token').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      llmConfigured: Boolean(String(user.llm_api_key || '').trim()),
      hfConfigured: Boolean(String(user.hf_token || '').trim()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      user: {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName || 'User',
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
