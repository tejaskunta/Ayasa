const axios = require('axios');
const crypto = require('crypto');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const ML_BASE_URL = process.env.ML_BACKEND_URL || 'http://localhost:8000';
const CHECKIN_DEDUP_WINDOW_MS = Math.max(1000, Number(process.env.CHECKIN_DEDUP_WINDOW_MS) || 15000);

const recentCheckIns = new Map();
const inMemoryCheckInHistory = [];

const normalizeInputForDedup = (value = '') => String(value).toLowerCase().trim().replace(/\s+/g, ' ');

const keyFingerprintForDedup = (llmApiKey = '') => {
  const cleanKey = String(llmApiKey || '').trim();
  if (!cleanKey) return 'no-key';
  return crypto.createHash('sha256').update(cleanKey).digest('hex').slice(0, 12);
};

const buildDedupKey = (userId, userInput, llmApiKey) => {
  const safeUserId = String(userId || 'demo_user').trim().toLowerCase();
  const keyFingerprint = keyFingerprintForDedup(llmApiKey);
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
  stressLevel: payload.stressLevel || payload.stress,
  emotion: payload.emotion,
  confidence: payload.confidence,
  ayasaResponse: payload.ayasaResponse || payload.ayasa_response,
  resources: payload.resources,
  directScoreQuery: payload.directScoreQuery,
  llmUsed: Boolean(payload.llmUsed ?? payload.groqUsed ?? payload.geminiUsed),
  llmError: payload.llmError || payload.groqError || payload.geminiError || null,
});

const normalizeChatPayload = (payload = {}) => ({
  stressLevel: payload.stress,
  emotion: payload.emotion,
  confidence: payload.confidence ?? payload.emotion_score,
  ayasaResponse: payload.ayasa_response,
  resources: [],
  directScoreQuery: false,
  llmUsed: false,
  llmError: 'Legacy /chat endpoint does not expose LLM diagnostics.',
});

// ── Call the Python ML backend ──────────────────────────────────────────────
const callMLBackend = async (text, userId = 'demo_user', llmApiKey = '') => {
  const safeUserId = userId || 'demo_user';
  const safeKey = llmApiKey || '';

  try {
    const predictResponse = await axios.post(
      `${ML_BASE_URL}/predict`,
      {
        text,
        user_id: safeUserId,
        llm_api_key: safeKey,
        groq_api_key: safeKey,
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
        llm_api_key: safeKey,
        groq_api_key: safeKey,
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

const STRESS_TO_SCORE = {
  Low: 1,
  Moderate: 2,
  High: 3,
};

const SCORE_TO_STRESS = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
};

const safeDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
};

const toStressScore = (level) => STRESS_TO_SCORE[level] || 2;

const scoreToStressLabel = (score) => {
  const rounded = Math.max(1, Math.min(3, Math.round(score || 2)));
  return SCORE_TO_STRESS[rounded] || 'Moderate';
};

const periodForHour = (hour) => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

const fetchUserHistory = async (safeUserId) => {
  try {
    const docs = await CheckIn.find({ userId: safeUserId }).sort({ timestamp: 1, createdAt: 1 }).lean();
    return docs.map((doc) => ({
      id: String(doc._id),
      userId: doc.userId,
      userInput: doc.userInput,
      stressLevel: doc.stressLevel,
      emotion: doc.emotion || 'unknown',
      confidence: doc.confidence,
      ayasaResponse: doc.ayasaResponse,
      resources: Array.isArray(doc.resources) ? doc.resources : [],
      directScoreQuery: Boolean(doc.directScoreQuery),
      geminiUsed: Boolean(doc.geminiUsed),
      geminiError: doc.geminiError || null,
      timestamp: (doc.timestamp || doc.createdAt || new Date()).toISOString(),
    }));
  } catch {
    return inMemoryCheckInHistory
      .filter((entry) => String(entry.userId || '').toLowerCase() === safeUserId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
};

const buildInsightsPayload = (entries = []) => {
  const cleaned = entries
    .map((entry) => {
      const parsedDate = safeDate(entry.timestamp);
      return parsedDate ? { ...entry, _parsedDate: parsedDate } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a._parsedDate - b._parsedDate);

  if (!cleaned.length) {
    return {
      personalTrend: {
        week: 'No check-ins yet. Start a conversation to build your 7-day trend.',
        month: '30-day trend will appear after a few check-ins.',
        movingAverage: 'Moving average unavailable until more entries are collected.',
      },
      patternDetection: 'Patterns will appear after multiple check-ins across different times.',
      contextualFeedback: 'Share how you feel now and AYASA will provide personalized support.',
      weeklySummary: 'Weekly summary is unavailable because there are no entries yet.',
      earlyWarning: '',
      metrics: {
        avg7: 0,
        avg30: 0,
        movingAverage: 0,
        weeklyChangePct: 0,
      },
    };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const withinDays = (days) => cleaned.filter((entry) => now - entry._parsedDate.getTime() <= days * dayMs);
  const last7 = withinDays(7);
  const last30 = withinDays(30);
  const prev7 = cleaned.filter((entry) => {
    const age = now - entry._parsedDate.getTime();
    return age > 7 * dayMs && age <= 14 * dayMs;
  });

  const avg7 = average(last7.map((entry) => toStressScore(entry.stressLevel)));
  const avg30 = average(last30.map((entry) => toStressScore(entry.stressLevel)));
  const prev7Avg = average(prev7.map((entry) => toStressScore(entry.stressLevel)));
  const movingEntries = cleaned.slice(-5);
  const movingAverage = average(movingEntries.map((entry) => toStressScore(entry.stressLevel)));

  const weeklyChangePct = prev7Avg > 0 ? ((avg7 - prev7Avg) / prev7Avg) * 100 : 0;
  const weeklyDirection = weeklyChangePct >= 0 ? 'increased' : 'decreased';
  const weeklyMagnitude = Math.abs(Math.round(weeklyChangePct));

  const latest = cleaned[cleaned.length - 1];
  const latestStress = latest?.stressLevel || 'Moderate';
  const latestEmotion = String(latest?.emotion || 'unknown').toLowerCase();
  const latestInput = String(latest?.userInput || '').toLowerCase();

  const byPeriod = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  let angerBeforeDeadline = 0;
  let lowAfterSocial = 0;

  cleaned.forEach((entry) => {
    const period = periodForHour(entry._parsedDate.getHours());
    byPeriod[period].push(toStressScore(entry.stressLevel));
    const input = String(entry.userInput || '').toLowerCase();
    const emotion = String(entry.emotion || '').toLowerCase();
    if ((/deadline|exam|submission|project/.test(input)) && (emotion.includes('anger') || emotion.includes('fear'))) {
      angerBeforeDeadline += 1;
    }
    if ((/friend|family|social|team|hangout|talked/.test(input)) && entry.stressLevel === 'Low') {
      lowAfterSocial += 1;
    }
  });

  const topPeriod = Object.entries(byPeriod)
    .map(([name, values]) => ({ name, avg: average(values), count: values.length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.avg - a.avg)[0];

  const patternParts = [];
  if (topPeriod && topPeriod.avg >= 2.2) {
    patternParts.push(`Higher stress appears most during the ${topPeriod.name}.`);
  }
  if (angerBeforeDeadline > 0) {
    patternParts.push('Anger or fear spikes often appear around deadline-related messages.');
  }
  if (lowAfterSocial > 0) {
    patternParts.push('Lower stress often follows social interactions.');
  }
  const patternDetection = patternParts.length
    ? patternParts.join(' ')
    : 'No dominant pattern yet. Keep checking in to reveal stronger trends.';

  const uncertaintySignal = /uncertain|unsure|overwhelm|overwhelmed|confused/.test(latestInput);
  let contextualFeedback = 'Keep sharing your context and AYASA will tailor support to your current state.';
  if (latestStress === 'High' && latestEmotion.includes('anger')) {
    contextualFeedback = 'Your stress is high with anger signals. Try a 90-second cooldown and step away before responding to triggers.';
  } else if (latestStress === 'Moderate' && uncertaintySignal) {
    contextualFeedback = 'You are in a moderate but uncertain state. Break the next task into one small clear step to regain control.';
  } else if (latestStress === 'High' && (latestEmotion.includes('fear') || latestEmotion.includes('sadness'))) {
    contextualFeedback = 'Your stress is high with negative emotional load. Reach out to support and reduce pressure to one manageable priority.';
  } else if (latestStress === 'Low') {
    contextualFeedback = 'Your current pattern is stable. Protect this by keeping your routine and taking short mindful pauses.';
  }

  const weekStartScore = toStressScore(last7[0]?.stressLevel || latestStress);
  const weekEndScore = toStressScore(last7[last7.length - 1]?.stressLevel || latestStress);
  const shiftText = weekEndScore > weekStartScore
    ? 'trending upward'
    : weekEndScore < weekStartScore
      ? 'trending downward'
      : 'remaining stable';

  const dominantEmotion = Object.entries(
    last7.reduce((acc, entry) => {
      const key = String(entry.emotion || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const weeklySummary = [
    `This week: stress is mostly ${scoreToStressLabel(avg7).toLowerCase()} and ${shiftText}.`,
    `Dominant emotion: ${(dominantEmotion?.[0] || 'unknown')}.`,
    topPeriod ? `Highest stress window: ${topPeriod.name}.` : 'Highest stress window: not enough data yet.',
  ].join(' ');

  const lastThree = cleaned.slice(-3).map((entry) => toStressScore(entry.stressLevel));
  const isRising = lastThree.length === 3 && lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0];
  const hasRepeatedHigh = cleaned.slice(-4).filter((entry) => entry.stressLevel === 'High').length >= 3;
  const earlyWarning = (isRising || hasRepeatedHigh)
    ? 'Early warning: your stress has increased sharply in recent entries. Consider an immediate reset and support step.'
    : '';

  const personalTrendWeek = prev7Avg > 0
    ? `Your stress has ${weeklyDirection} ${weeklyMagnitude}% over the last 7 days and is now mostly ${scoreToStressLabel(avg7)}.`
    : `Your recent 7-day trend is mostly ${scoreToStressLabel(avg7)}.`;

  const first30 = last30.slice(0, Math.max(1, Math.floor(last30.length / 2)));
  const second30 = last30.slice(Math.max(1, Math.floor(last30.length / 2)));
  const monthStartAvg = average(first30.map((entry) => toStressScore(entry.stressLevel)));
  const monthEndAvg = average(second30.map((entry) => toStressScore(entry.stressLevel)));
  const monthShift = monthEndAvg >= monthStartAvg ? 'upward' : 'downward';

  return {
    personalTrend: {
      week: personalTrendWeek,
      month: `Last 30 days show a ${monthShift} shift from ${scoreToStressLabel(monthStartAvg)} toward ${scoreToStressLabel(monthEndAvg)}.`,
      movingAverage: `Current moving average across your latest entries is ${scoreToStressLabel(movingAverage)} (${movingAverage.toFixed(2)}).`,
    },
    patternDetection,
    contextualFeedback,
    weeklySummary,
    earlyWarning,
    metrics: {
      avg7: Number(avg7.toFixed(3)),
      avg30: Number(avg30.toFixed(3)),
      movingAverage: Number(movingAverage.toFixed(3)),
      weeklyChangePct: Number(weeklyChangePct.toFixed(2)),
    },
  };
};

// ── POST /api/checkin/submit ────────────────────────────────────────────────
exports.submitCheckIn = async (req, res) => {
  try {
    const { userInput, userId, llmApiKey, geminiApiKey } = req.body;
    const authUserId = String(req.user?.userId || '').trim();
    const safeUserId = String(authUserId || userId || 'demo_user').trim().toLowerCase();
    let resolvedLlmApiKey = String(llmApiKey || geminiApiKey || '').trim();

    if (!resolvedLlmApiKey && authUserId) {
      const user = await User.findById(authUserId).select('+llm_api_key').lean();
      resolvedLlmApiKey = String(user?.llm_api_key || '').trim();
    }

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required' });
    }

    pruneRecentCheckIns();
    const dedupKey = buildDedupKey(safeUserId, userInput, resolvedLlmApiKey);
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
      const mlResult = await callMLBackend(userInput, safeUserId, resolvedLlmApiKey);
      emotion = mlResult.emotion || 'unknown';
      stressLevel = normalizeStressLevelForUI(mlResult.stressLevel);
      ayasaResponse =
        mlResult.ayasaResponse ||
        'I can see what you are carrying right now. Try one small, supportive step and check in again soon.';
      confidence = normalizeConfidence(mlResult.confidence);
      resources = Array.isArray(mlResult.resources) ? mlResult.resources : getFallbackResources(stressLevel);
      directScoreQuery = Boolean(mlResult.directScoreQuery);
      geminiUsed = Boolean(mlResult.llmUsed);
      geminiError = mlResult.llmError || null;
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

    let checkInData;
    try {
      const created = await CheckIn.create({
        userId: safeUserId,
        userInput,
        stressLevel,
        emotion,
        confidence,
        ayasaResponse,
        resources,
        directScoreQuery,
        geminiUsed,
        geminiError,
        timestamp: new Date(),
        mlPredictionData: null,
      });

      checkInData = {
        id: String(created._id),
        userId: created.userId,
        userInput: created.userInput,
        stressLevel: created.stressLevel,
        emotion: created.emotion || 'unknown',
        confidence: created.confidence,
        ayasaResponse: created.ayasaResponse,
        resources: Array.isArray(created.resources) ? created.resources : [],
        directScoreQuery: Boolean(created.directScoreQuery),
        geminiUsed: Boolean(created.geminiUsed),
        geminiError: created.geminiError || null,
        timestamp: (created.timestamp || created.createdAt || new Date()).toISOString(),
      };
    } catch {
      checkInData = {
        id: `mem-${Date.now()}`,
        userId: safeUserId,
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
      inMemoryCheckInHistory.push(checkInData);
    }

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
    const safeUserId = String(req.user?.userId || req.query.userId || '').trim().toLowerCase();
    if (!safeUserId) {
      return res.status(400).json({ error: 'Authenticated user context is required' });
    }
    const filteredHistory = await fetchUserHistory(safeUserId);

    res.json({
      message: 'Check-in history retrieved',
      history: filteredHistory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/insights ─────────────────────────────────────────────
exports.getInsights = async (req, res) => {
  try {
    const safeUserId = String(req.user?.userId || req.query.userId || '').trim().toLowerCase();
    if (!safeUserId) {
      return res.status(400).json({ error: 'Authenticated user context is required' });
    }
    const userHistory = await fetchUserHistory(safeUserId);

    const insights = buildInsightsPayload(userHistory);
    res.json({
      message: 'Insights generated successfully',
      insights,
      count: userHistory.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/ml-health ─────────────────────────────────────────────
exports.getMLHealth = async (req, res) => {
  const health = await getMLBackendHealth();
  const llmActive = Boolean(
    health.payload?.llm_active
      ?? health.payload?.groq_active
      ?? health.payload?.gemini_active
      ?? false
  );
  res.json({
    available: health.available,
    llmActive,
    geminiActive: llmActive,
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
