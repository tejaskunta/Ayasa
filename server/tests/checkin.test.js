require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/CheckIn');
jest.mock('../models/User');
jest.mock('../config/db', () => ({ connectDB: jest.fn().mockResolvedValue(true) }));

// Mock mlClient so no real HTTP to Python backend
jest.mock('../utils/mlClient', () => ({
  callMLBackend: jest.fn(),
  getMLHealth: jest.fn(),
  getFallbackResources: jest.fn(() => []),
}));

const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const { callMLBackend, getMLHealth } = require('../utils/mlClient');
const app = require('../server');

const USER_ID = '507f1f77bcf86cd799439011';

function makeToken(id = USER_ID) {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const ML_RESULT = {
  stressLevel: 'High',
  emotion: 'fear',
  confidence: 0.87,
  ayasaResponse: 'That sounds really hard. What feels heaviest right now?',
  resources: [{ title: 'Helpline', url: 'https://example.com' }],
  directScoreQuery: false,
  llmUsed: true,
  llmError: null,
};

const SAVED_DOC = {
  _id: '507f191e810c19729de860ea',
  userId: USER_ID,
  userInput: 'I am overwhelmed',
  stressLevel: 'High',
  emotion: 'fear',
  confidence: 87,
  ayasaResponse: ML_RESULT.ayasaResponse,
  resources: ML_RESULT.resources,
  directScoreQuery: false,
  geminiUsed: true,
  geminiError: null,
  timestamp: new Date('2025-01-01T10:00:00Z'),
  createdAt: new Date('2025-01-01T10:00:00Z'),
};

// ── POST /api/checkin/submit ───────────────────────────────────────────────
describe('POST /api/checkin/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ llm_api_key: 'gsk_key' }) }) });
  });

  test('rejects request without token', async () => {
    const res = await request(app).post('/api/checkin/submit').send({ userInput: 'I feel bad' });
    expect(res.status).toBe(401);
  });

  test('rejects missing userInput', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/checkin/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/input/i);
  });

  test('calls ML backend and saves check-in', async () => {
    callMLBackend.mockResolvedValue(ML_RESULT);
    CheckIn.create.mockResolvedValue(SAVED_DOC);
    const token = makeToken();
    const res = await request(app)
      .post('/api/checkin/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ userInput: 'I am overwhelmed' });
    expect(res.status).toBe(200);
    expect(callMLBackend).toHaveBeenCalledWith('I am overwhelmed', expect.any(String), expect.any(String));
    expect(res.body.result.stressLevel).toBe('High');
    expect(res.body.result.emotion).toBe('fear');
    expect(res.body.result.ayasaResponse).toBe(ML_RESULT.ayasaResponse);
  });

  test('uses fallback when ML backend is down', async () => {
    callMLBackend.mockRejectedValue(new Error('connection refused'));
    CheckIn.create.mockResolvedValue({ ...SAVED_DOC, stressLevel: 'Low', geminiError: 'Node fallback path: connection refused' });
    const token = makeToken();
    const res = await request(app)
      .post('/api/checkin/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ userInput: 'Hello there' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });

  test('deduplicates repeated identical requests', async () => {
    callMLBackend.mockResolvedValue(ML_RESULT);
    CheckIn.create.mockResolvedValue(SAVED_DOC);
    const token = makeToken();
    const payload = { userInput: 'unique dedup test input xyz' };
    await request(app).post('/api/checkin/submit').set('Authorization', `Bearer ${token}`).send(payload);
    const res2 = await request(app).post('/api/checkin/submit').set('Authorization', `Bearer ${token}`).send(payload);
    expect(res2.body.deduplicated).toBe(true);
    expect(callMLBackend).toHaveBeenCalledTimes(1);
  });
});

// ── GET /api/checkin/history ───────────────────────────────────────────────
describe('GET /api/checkin/history', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/checkin/history');
    expect(res.status).toBe(401);
  });

  test('returns history for authenticated user', async () => {
    CheckIn.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([SAVED_DOC]) }) });
    const token = makeToken();
    const res = await request(app).get('/api/checkin/history').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBe(1);
  });
});

// ── GET /api/checkin/insights ──────────────────────────────────────────────
describe('GET /api/checkin/insights', () => {
  test('returns insights for empty history', async () => {
    CheckIn.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
    const token = makeToken();
    const res = await request(app).get('/api/checkin/insights').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.insights.personalTrend).toBeDefined();
    expect(res.body.count).toBe(0);
  });

  test('returns insights for existing history', async () => {
    CheckIn.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([SAVED_DOC]) }) });
    const token = makeToken();
    const res = await request(app).get('/api/checkin/insights').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.insights.patternDetection).toBeDefined();
    expect(res.body.insights.earlyWarning).toBeDefined();
  });
});

// ── GET /api/checkin/ml-health ─────────────────────────────────────────────
describe('GET /api/checkin/ml-health', () => {
  test('returns health status when ML backend is up', async () => {
    getMLHealth.mockResolvedValue({
      available: true,
      payload: { groq_active: true, stress_model_loaded: true, emotion_model_loaded: true },
      error: null,
    });
    const res = await request(app).get('/api/checkin/ml-health');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.llmActive).toBe(true);
  });

  test('returns available:false when ML backend is down', async () => {
    getMLHealth.mockResolvedValue({ available: false, payload: {}, error: 'timeout' });
    const res = await request(app).get('/api/checkin/ml-health');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.error).toBe('timeout');
  });
});
