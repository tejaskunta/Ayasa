const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../utils/http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body || {};
  if (!email || !password) throw httpError(400, 'Email and password are required');
  if (!EMAIL_RE.test(email)) throw httpError(400, 'Please enter a valid email');
  if (String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw httpError(409, 'An account with that email already exists');

  const user = await User.create({ email, passwordHash: password, fullName });
  return res.status(201).json({
    token: signToken(user._id),
    user: { id: user._id, email: user.email, fullName: user.fullName },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, 'Email and password are required');

  // passwordHash is select:false, so it must be requested explicitly.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  // Same generic message whether the email or the password was wrong.
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, 'Invalid email or password');
  }
  return res.json({
    token: signToken(user._id),
    user: { id: user._id, email: user.email, fullName: user.fullName },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw httpError(404, 'User not found');
  return res.json({ user: { id: user._id, email: user.email, fullName: user.fullName } });
});

module.exports = { register, login, me };