require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ── Mock mongoose models ───────────────────────────────────────────────────
jest.mock('../models/User');
const User = require('../models/User');

// ── Mock axios (ML backend sync) ──────────────────────────────────────────
jest.mock('axios');
const axios = require('axios');
axios.post.mockResolvedValue({ data: {} });

// ── Mock DB (skip connection) ─────────────────────────────────────────────
jest.mock('../config/db', () => ({ connectDB: jest.fn().mockResolvedValue(true) }));

const app = require('../server');

const MOCK_USER = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  fullName: 'Test User',
  password_hash: '$2a$10$hashedpassword',
  comparePassword: jest.fn(),
  llm_api_key: '',
  hf_token: '',
};

function makeToken(userId = MOCK_USER._id) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ── POST /api/auth/register ────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('rejects duplicate email', async () => {
    // authController does: await User.findOne({ email }).lean()
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(MOCK_USER) });
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'pass' });
    expect(res.status).toBe(409);
  });

  test('creates user and returns token', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    User.create.mockResolvedValue({ ...MOCK_USER, _id: MOCK_USER._id });
    const res = await request(app).post('/api/auth/register').send({ email: 'new@example.com', password: 'pass123', fullName: 'New User' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('rejects unknown email', async () => {
    // authController does: await User.findOne({ email }).select('+password_hash')
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('rejects wrong password', async () => {
    const userWithCompare = { ...MOCK_USER, comparePassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userWithCompare) });
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('returns token on valid credentials', async () => {
    const userWithCompare = { ...MOCK_USER, comparePassword: jest.fn().mockResolvedValue(true) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(userWithCompare) });
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns user profile with valid token', async () => {
    User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(MOCK_USER) });
    const token = makeToken();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  test('returns 404 if user not in DB', async () => {
    User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const token = makeToken();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ── GET /health ────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });
});
