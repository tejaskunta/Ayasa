const axios = require('axios');
const crypto = require('crypto');
const ML_BASE_URL = process.env.ML_BACKEND_URL || 'http://localhost:8000';
const CHECKIN_DEDUP_WINDOW_MS = Math.max(1000, Number(process.env.CHECKIN_DEDUP_WINDOW_MS) || 15000);

// In-memory check-in history (demo — replace with MongoDB for production)
const checkInHistory = [];
const recentCheckIns = new Map();

const normalizeInputForDedup = (value = '') => String(value).toLowerCase().trim().replace(/\s+/g, ' ');

const keyFingerprintForDedup = (geminiApiKey = '') => {
  const cleanKey = String(geminiApiKey || '').trim();
  if (!cleanKey) return 'no-key';
  return crypto.createHash('sha256').update(cleanKey).digest('hex').slice(0, 12);
};

const buildDedupKey = (userId, userInput, geminiApiKey) => {
  const safeUserId = String(userId || 'demo_user').trim().toLowerCase();
  const keyFingerprint = keyFingerprintForDedup(geminiApiKey);
  return `${safeUserId}|${keyFingerprint}|${normalizeInputForDedup(userInput)}`;
};

const pruneRecentCheckIns = () => {
  const now = Date.now();
  for (const [key, entry] of recentCheckIns.entries()) {
    if (!entry || now - entry.createdAt > CHECKIN_DEDUP_WINDOW_MS * 2) {
      recentCheckIns.delete(key);
    }
  }
};

const normalizePredictPayload = (payload = {}) => ({
  stressLevel: payload.stressLevel,
  emotion: payload.emotion,
  confidence: payload.confidence,
  ayasaResponse: payload.ayasaResponse,
  resources: payload.resources,
  directScoreQuery: payload.directScoreQuery,
  geminiUsed: Boolean(payload.geminiUsed),
  geminiError: payload.geminiError || null,
});

const normalizeChatPayload = (payload = {}) => ({
  stressLevel: payload.stress,
  emotion: payload.emotion,
  confidence: payload.confidence ?? payload.emotion_score,
  ayasaResponse: payload.ayasa_response,
  resources: [],
  directScoreQuery: false,
  geminiUsed: false,
  geminiError: 'Legacy /chat endpoint does not expose Gemini diagnostics.',
});

// ── Call the Python ML backend ──────────────────────────────────────────────
const callMLBackend = async (text, userId = 'demo_user', geminiApiKey = '') => {
  const safeUserId = userId || 'demo_user';
  const safeKey = geminiApiKey || '';

  try {
    const predictResponse = await axios.post(
      `${ML_BASE_URL}/predict`,
      {
        text,
        user_id: safeUserId,
        gemini_api_key: safeKey,
      },
      { timeout: 15000 }
    );
    return normalizePredictPayload(predictResponse.data);
  } catch (error) {
    const status = error?.response?.status;
    if (status !== 404) throw error;

    // Compatibility path for legacy ML backend exposing /chat only.
    const chatResponse = await axios.post(
      `${ML_BASE_URL}/chat`,
      {
        message: text,
        user_id: safeUserId,
        gemini_api_key: safeKey,
      },
      { timeout: 15000 }
    );
    return normalizeChatPayload(chatResponse.data);
  }
};

const getMLBackendHealth = async () => {
  try {
    const response = await axios.get(`${ML_BASE_URL}/health`, { timeout: 5000 });
    const payload = response?.data || {};
    return {
      available: true,
      geminiActive: Boolean(payload.gemini_active),
      payload,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      geminiActive: false,
      payload: {},
      error: error?.message || 'ML backend unavailable',
    };
  }
};

const normalizeStressLevelForUI = (mlStressLevel) => {
  const raw = (mlStressLevel || '').toLowerCase();
  if (raw.includes('high')) return 'High';
  if (raw.includes('medium') || raw.includes('moderate')) return 'Moderate';
  if (raw.includes('low')) return 'Low';
  return 'Moderate';
};

const normalizeConfidence = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 85;
  if (num <= 1) return Math.round(num * 100);
  return Math.round(num);
};

// ── POST /api/checkin/submit ────────────────────────────────────────────────
exports.submitCheckIn = async (req, res) => {
  try {
    const { userInput, userId, geminiApiKey } = req.body;

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required' });
    }

    pruneRecentCheckIns();
    const dedupKey = buildDedupKey(userId, userInput, geminiApiKey);
    const recentEntry = recentCheckIns.get(dedupKey);
    const now = Date.now();

    if (recentEntry && now - recentEntry.createdAt <= CHECKIN_DEDUP_WINDOW_MS) {
      return res.json({
        message: 'Duplicate check-in suppressed; returning previous result',
        result: recentEntry.result,
        deduplicated: true,
      });
    }

    let stressLevel, emotion, ayasaResponse, confidence, resources, directScoreQuery, geminiUsed, geminiError;

    try {
      const mlResult = await callMLBackend(userInput, userId, geminiApiKey);
      emotion = mlResult.emotion || 'unknown';
      stressLevel = normalizeStressLevelForUI(mlResult.stressLevel);
      ayasaResponse =
        mlResult.ayasaResponse ||
        'I can see what you are carrying right now. Try one small, supportive step and check in again soon.';
      confidence = normalizeConfidence(mlResult.confidence);
      resources = Array.isArray(mlResult.resources) ? mlResult.resources : getFallbackResources(stressLevel);
      directScoreQuery = Boolean(mlResult.directScoreQuery);
      geminiUsed = Boolean(mlResult.geminiUsed);
      geminiError = mlResult.geminiError || null;
    } catch (mlError) {
      // ── Fallback: ML server not running ──
      console.warn('ML backend unavailable, using fallback:', mlError.message);
      const levels  = ['Low', 'Moderate', 'High'];
      stressLevel   = levels[Math.floor(Math.random() * 3)];
      emotion       = 'unknown';
      ayasaResponse = getAdviceForStressLevel(stressLevel);
      confidence    = Math.floor(75 + Math.random() * 25);
      resources     = getFallbackResources(stressLevel);
      directScoreQuery = false;
      geminiUsed = false;
      geminiError = `Node fallback path: ${mlError.message}`;
    }

    const checkInData = {
      id: checkInHistory.length + 1,
      userInput,
      stressLevel,
      emotion,
      confidence,
      ayasaResponse,
      resources,
      directScoreQuery,
      geminiUsed,
      geminiError,
      timestamp: new Date().toISOString(),
    };

    checkInHistory.push(checkInData);
    recentCheckIns.set(dedupKey, {
      createdAt: Date.now(),
      result: checkInData,
    });

    res.json({
      message: 'Check-in submitted successfully',
      result: checkInData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/history ────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    res.json({
      message: 'Check-in history retrieved',
      history: checkInHistory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/ml-health ─────────────────────────────────────────────
exports.getMLHealth = async (req, res) => {
  const health = await getMLBackendHealth();
  res.json({
    available: health.available,
    geminiActive: health.geminiActive,
    stressModelLoaded: Boolean(health.payload?.stress_model_loaded),
    emotionModelLoaded: Boolean(health.payload?.emotion_model_loaded),
    timestamp: new Date().toISOString(),
    error: health.error,
  });
};

// ── Fallback rule-based advice ──────────────────────────────────────────────
const getAdviceForStressLevel = (level) => {
  const advice = {
    Low:      "You're doing well! Keep up your wellness routine.",
    Moderate: 'Try some relaxation techniques — breathing exercises or a calming playlist can help.',
    High:     'You seem to be under significant stress. Consider talking to a counsellor or trusted friend.',
  };
  return advice[level] || 'Remember to take care of yourself!';
};

const getFallbackResources = (level) => {
  const resources = {
    Low: [
      { title: 'Box Breathing Exercise', url: 'https://themindclan.com/exercises/box-breathing-exercise-online/' },
      { title: 'Pomodoro Focus Timer', url: 'https://pomofocus.io/' },
    ],
    Moderate: [
      { title: 'Guided Meditation', url: 'https://www.youtube.com/watch?v=inpok4MKVLM' },
      { title: 'Stress Management Tips', url: 'https://www.mind.org.uk/information-support/types-of-mental-health-problems/stress/' },
    ],
    High: [
      { title: 'KIRAN Mental Health Helpline', url: 'https://telemanas.mohfw.gov.in/home' },
      { title: 'AASRA 24/7 Helpline', url: 'http://www.aasra.info/helpline.html' },
    ],
  };
  return resources[level] || resources.Moderate;
};
