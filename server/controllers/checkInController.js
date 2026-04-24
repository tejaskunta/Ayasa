const crypto = require('crypto');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const { callMLBackend, getMLHealth, getFallbackResources } = require('../utils/mlClient');

const CHECKIN_DEDUP_WINDOW_MS = Math.max(1000, Number(process.env.CHECKIN_DEDUP_WINDOW_MS) || 15000);
const recentCheckIns = new Map();
const inMemoryCheckInHistory = [];

// ── Deduplication helpers ──────────────────────────────────────────────────
function normalizeInput(value = '') {
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

function keyFingerprint(llmApiKey = '') {
  const clean = String(llmApiKey || '').trim();
  if (!clean) return 'no-key';
  return crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12);
}

function buildDedupKey(userId, userInput, llmApiKey) {
  const safeId = String(userId || 'demo_user').trim().toLowerCase();
  return `${safeId}|${keyFingerprint(llmApiKey)}|${normalizeInput(userInput)}`;
}

function pruneRecentCheckIns() {
  const now = Date.now();
  for (const [key, entry] of recentCheckIns.entries()) {
    if (!entry || now - entry.createdAt > CHECKIN_DEDUP_WINDOW_MS * 2) {
      recentCheckIns.delete(key);
    }
  }
}

// ── Normalisation helpers ──────────────────────────────────────────────────
function normalizeStressLevel(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('high')) return 'High';
  if (s.includes('medium') || s.includes('moderate')) return 'Moderate';
  if (s.includes('low')) return 'Low';
  return 'Moderate';
}

function normalizeConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 85;
  return num <= 1 ? Math.round(num * 100) : Math.round(num);
}

function getAdvice(level) {
  return {
    Low: "You're doing well! Keep up your wellness routine.",
    Moderate: 'Try some relaxation techniques — breathing exercises or a calming playlist can help.',
    High: 'You seem to be under significant stress. Consider talking to a counsellor or trusted friend.',
  }[level] || 'Remember to take care of yourself!';
}

function toCheckInShape(doc) {
  return {
    id: String(doc._id || doc.id),
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
  };
}

// ── DB helpers ────────────────────────────────────────────────────────────
async function fetchUserHistory(safeUserId) {
  try {
    const docs = await CheckIn.find({ userId: safeUserId }).sort({ timestamp: 1, createdAt: 1 }).lean();
    return docs.map(toCheckInShape);
  } catch {
    return inMemoryCheckInHistory
      .filter((e) => String(e.userId || '').toLowerCase() === safeUserId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

// ── Insights calculation ───────────────────────────────────────────────────
const STRESS_TO_SCORE = { Low: 1, Moderate: 2, High: 3 };
const SCORE_TO_STRESS = { 1: 'Low', 2: 'Moderate', 3: 'High' };

function toScore(level) { return STRESS_TO_SCORE[level] || 2; }
function toLabel(score) { return SCORE_TO_STRESS[Math.max(1, Math.min(3, Math.round(score || 2)))] || 'Moderate'; }
function avg(arr) { return arr.length ? arr.reduce((s, v) => s + Number(v || 0), 0) / arr.length : 0; }
function safeDate(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
function periodForHour(h) {
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

function buildInsightsPayload(entries = []) {
  const cleaned = entries
    .map((e) => { const d = safeDate(e.timestamp); return d ? { ...e, _date: d } : null; })
    .filter(Boolean)
    .sort((a, b) => a._date - b._date);

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
      metrics: { avg7: 0, avg30: 0, movingAverage: 0, weeklyChangePct: 0 },
    };
  }

  const now = Date.now();
  const dayMs = 86400000;
  const withinDays = (days) => cleaned.filter((e) => now - e._date.getTime() <= days * dayMs);
  const last7 = withinDays(7);
  const last30 = withinDays(30);
  const prev7 = cleaned.filter((e) => { const age = now - e._date.getTime(); return age > 7 * dayMs && age <= 14 * dayMs; });

  const avg7 = avg(last7.map((e) => toScore(e.stressLevel)));
  const avg30 = avg(last30.map((e) => toScore(e.stressLevel)));
  const prev7Avg = avg(prev7.map((e) => toScore(e.stressLevel)));
  const movingAverage = avg(cleaned.slice(-5).map((e) => toScore(e.stressLevel)));
  const weeklyChangePct = prev7Avg > 0 ? ((avg7 - prev7Avg) / prev7Avg) * 100 : 0;

  const latest = cleaned[cleaned.length - 1];
  const latestStress = latest?.stressLevel || 'Moderate';
  const latestEmotion = String(latest?.emotion || 'unknown').toLowerCase();
  const latestInput = String(latest?.userInput || '').toLowerCase();

  const byPeriod = { morning: [], afternoon: [], evening: [], night: [] };
  let angerBeforeDeadline = 0;
  let lowAfterSocial = 0;

  cleaned.forEach((e) => {
    byPeriod[periodForHour(e._date.getHours())].push(toScore(e.stressLevel));
    const input = String(e.userInput || '').toLowerCase();
    const emotion = String(e.emotion || '').toLowerCase();
    if (/deadline|exam|submission|project/.test(input) && (emotion.includes('anger') || emotion.includes('fear'))) {
      angerBeforeDeadline++;
    }
    if (/friend|family|social|team|hangout|talked/.test(input) && e.stressLevel === 'Low') {
      lowAfterSocial++;
    }
  });

  const topPeriod = Object.entries(byPeriod)
    .map(([name, vals]) => ({ name, avg: avg(vals), count: vals.length }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.avg - a.avg)[0];

  const patternParts = [];
  if (topPeriod?.avg >= 2.2) patternParts.push(`Higher stress appears most during the ${topPeriod.name}.`);
  if (angerBeforeDeadline > 0) patternParts.push('Anger or fear spikes often appear around deadline-related messages.');
  if (lowAfterSocial > 0) patternParts.push('Lower stress often follows social interactions.');
  const patternDetection = patternParts.length
    ? patternParts.join(' ')
    : 'No dominant pattern yet. Keep checking in to reveal stronger trends.';

  let contextualFeedback = 'Keep sharing your context and AYASA will tailor support to your current state.';
  const uncertaintySignal = /uncertain|unsure|overwhelm|overwhelmed|confused/.test(latestInput);
  if (latestStress === 'High' && latestEmotion.includes('anger')) {
    contextualFeedback = 'Your stress is high with anger signals. Try a 90-second cooldown and step away before responding to triggers.';
  } else if (latestStress === 'Moderate' && uncertaintySignal) {
    contextualFeedback = 'You are in a moderate but uncertain state. Break the next task into one small clear step to regain control.';
  } else if (latestStress === 'High' && (latestEmotion.includes('fear') || latestEmotion.includes('sadness'))) {
    contextualFeedback = 'Your stress is high with negative emotional load. Reach out to support and reduce pressure to one manageable priority.';
  } else if (latestStress === 'Low') {
    contextualFeedback = 'Your current pattern is stable. Protect this by keeping your routine and taking short mindful pauses.';
  }

  const weekStartScore = toScore(last7[0]?.stressLevel || latestStress);
  const weekEndScore = toScore(last7[last7.length - 1]?.stressLevel || latestStress);
  const shiftText = weekEndScore > weekStartScore ? 'trending upward' : weekEndScore < weekStartScore ? 'trending downward' : 'remaining stable';

  const dominantEmotion = Object.entries(
    last7.reduce((acc, e) => { const k = String(e.emotion || 'unknown').toLowerCase(); acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const weeklySummary = [
    `This week: stress is mostly ${toLabel(avg7).toLowerCase()} and ${shiftText}.`,
    `Dominant emotion: ${dominantEmotion?.[0] || 'unknown'}.`,
    topPeriod ? `Highest stress window: ${topPeriod.name}.` : 'Highest stress window: not enough data yet.',
  ].join(' ');

  const lastThree = cleaned.slice(-3).map((e) => toScore(e.stressLevel));
  const isRising = lastThree.length === 3 && lastThree[2] > lastThree[1] && lastThree[1] > lastThree[0];
  const hasRepeatedHigh = cleaned.slice(-4).filter((e) => e.stressLevel === 'High').length >= 3;
  const earlyWarning = (isRising || hasRepeatedHigh)
    ? 'Early warning: your stress has increased sharply in recent entries. Consider an immediate reset and support step.'
    : '';

  const personalTrendWeek = prev7Avg > 0
    ? `Your stress has ${weeklyChangePct >= 0 ? 'increased' : 'decreased'} ${Math.abs(Math.round(weeklyChangePct))}% over the last 7 days and is now mostly ${toLabel(avg7)}.`
    : `Your recent 7-day trend is mostly ${toLabel(avg7)}.`;

  const half = Math.max(1, Math.floor(last30.length / 2));
  const monthStartAvg = avg(last30.slice(0, half).map((e) => toScore(e.stressLevel)));
  const monthEndAvg = avg(last30.slice(half).map((e) => toScore(e.stressLevel)));

  return {
    personalTrend: {
      week: personalTrendWeek,
      month: `Last 30 days show a ${monthEndAvg >= monthStartAvg ? 'upward' : 'downward'} shift from ${toLabel(monthStartAvg)} toward ${toLabel(monthEndAvg)}.`,
      movingAverage: `Current moving average across your latest entries is ${toLabel(movingAverage)} (${movingAverage.toFixed(2)}).`,
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
}

// ── POST /api/checkin/submit ───────────────────────────────────────────────
exports.submitCheckIn = async (req, res) => {
  try {
    const { userInput, userId, llmApiKey, geminiApiKey } = req.body;
    const authUserId = String(req.user?.userId || '').trim();
    const safeUserId = String(authUserId || userId || 'demo_user').trim().toLowerCase();
    let resolvedKey = String(llmApiKey || geminiApiKey || '').trim();

    if (!resolvedKey && authUserId) {
      const user = await User.findById(authUserId).select('+llm_api_key').lean();
      resolvedKey = String(user?.llm_api_key || '').trim();
    }

    if (!userInput) {
      return res.status(400).json({ error: 'User input is required' });
    }

    pruneRecentCheckIns();
    const dedupKey = buildDedupKey(safeUserId, userInput, resolvedKey);
    const recentEntry = recentCheckIns.get(dedupKey);

    if (recentEntry && Date.now() - recentEntry.createdAt <= CHECKIN_DEDUP_WINDOW_MS) {
      return res.json({ message: 'Duplicate check-in suppressed; returning previous result', result: recentEntry.result, deduplicated: true });
    }

    let stressLevel, emotion, ayasaResponse, confidence, resources, directScoreQuery, geminiUsed, geminiError, emotionHighlights;

    try {
      const ml = await callMLBackend(userInput, safeUserId, resolvedKey);
      emotion = ml.emotion || 'unknown';
      stressLevel = normalizeStressLevel(ml.stressLevel);
      ayasaResponse = ml.ayasaResponse || 'I can see what you are carrying right now. Try one small, supportive step and check in again soon.';
      confidence = normalizeConfidence(ml.confidence);
      resources = Array.isArray(ml.resources) ? ml.resources : getFallbackResources(stressLevel);
      directScoreQuery = Boolean(ml.directScoreQuery);
      geminiUsed = Boolean(ml.llmUsed);
      geminiError = ml.llmError || null;
      emotionHighlights = ml.emotionHighlights || [];
    } catch (mlError) {
      console.warn('ML backend unavailable, using fallback:', mlError.message);
      const levels = ['Low', 'Moderate', 'High'];
      stressLevel = levels[Math.floor(Math.random() * 3)];
      emotion = 'unknown';
      ayasaResponse = getAdvice(stressLevel);
      confidence = Math.floor(75 + Math.random() * 25);
      resources = getFallbackResources(stressLevel);
      directScoreQuery = false;
      geminiUsed = false;
      geminiError = `Node fallback path: ${mlError.message}`;
      emotionHighlights = [];
    }

    let checkInData;
    try {
      const created = await CheckIn.create({
        userId: safeUserId, userInput, stressLevel, emotion, confidence,
        ayasaResponse, resources, directScoreQuery, geminiUsed, geminiError,
        timestamp: new Date(), mlPredictionData: null,
      });
      checkInData = toCheckInShape(created);
    } catch {
      checkInData = {
        id: `mem-${Date.now()}`, userId: safeUserId, userInput, stressLevel, emotion,
        confidence, ayasaResponse, resources, directScoreQuery, geminiUsed, geminiError,
        timestamp: new Date().toISOString(),
      };
      inMemoryCheckInHistory.push(checkInData);
    }

    recentCheckIns.set(dedupKey, { createdAt: Date.now(), result: checkInData });
    res.json({ message: 'Check-in submitted successfully', result: { ...checkInData, emotionHighlights } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/history ───────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const safeUserId = String(req.user?.userId || req.query.userId || '').trim().toLowerCase();
    if (!safeUserId) return res.status(400).json({ error: 'Authenticated user context is required' });
    const history = await fetchUserHistory(safeUserId);
    res.json({ message: 'Check-in history retrieved', history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/insights ──────────────────────────────────────────────
exports.getInsights = async (req, res) => {
  try {
    const safeUserId = String(req.user?.userId || req.query.userId || '').trim().toLowerCase();
    if (!safeUserId) return res.status(400).json({ error: 'Authenticated user context is required' });
    const history = await fetchUserHistory(safeUserId);
    const insights = buildInsightsPayload(history);
    res.json({ message: 'Insights generated successfully', insights, count: history.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/checkin/ml-health ─────────────────────────────────────────────
exports.getMLHealth = async (req, res) => {
  const health = await getMLHealth();
  const llmActive = Boolean(health.payload?.llm_active ?? health.payload?.groq_active ?? false);
  res.json({
    available: health.available,
    llmActive,
    geminiActive: llmActive,
    modelName: health.payload?.llm_model || health.payload?.model_name || '',
    stressModelLoaded: Boolean(health.payload?.stress_model_loaded),
    emotionModelLoaded: Boolean(health.payload?.emotion_model_loaded),
    timestamp: new Date().toISOString(),
    error: health.error,
  });
};
