const axios = require('axios');

const ML_BASE_URL = process.env.ML_BACKEND_URL || 'http://localhost:8000';
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 15000;

const FALLBACK_RESOURCES = {
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

function getFallbackResources(level) {
  return FALLBACK_RESOURCES[level] || FALLBACK_RESOURCES.Moderate;
}

function normalizePredictPayload(payload = {}) {
  return {
    stressLevel: payload.stressLevel || payload.stress,
    emotion: payload.emotion,
    confidence: payload.confidence,
    ayasaResponse: payload.ayasaResponse || payload.ayasa_response,
    resources: payload.resources,
    directScoreQuery: payload.directScoreQuery,
    llmUsed: Boolean(payload.llmUsed ?? payload.groqUsed ?? payload.geminiUsed),
    llmError: payload.llmError || payload.groqError || payload.geminiError || null,
    emotionHighlights: Array.isArray(payload.emotionHighlights) ? payload.emotionHighlights : [],
  };
}

function normalizeChatPayload(payload = {}) {
  return {
    stressLevel: payload.stress,
    emotion: payload.emotion,
    confidence: payload.confidence ?? payload.emotion_score,
    ayasaResponse: payload.ayasa_response,
    resources: [],
    directScoreQuery: false,
    llmUsed: false,
    llmError: 'Legacy /chat endpoint does not expose LLM diagnostics.',
  };
}

async function callMLBackend(text, userId = 'demo_user', llmApiKey = '') {
  const safeUserId = userId || 'demo_user';
  const safeKey = llmApiKey || '';

  try {
    const { data } = await axios.post(
      `${ML_BASE_URL}/predict`,
      { text, user_id: safeUserId, llm_api_key: safeKey, groq_api_key: safeKey },
      { timeout: TIMEOUT_MS }
    );
    return normalizePredictPayload(data);
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
    // Fallback to legacy /chat endpoint if /predict is not available.
    const { data } = await axios.post(
      `${ML_BASE_URL}/chat`,
      { message: text, user_id: safeUserId, llm_api_key: safeKey, groq_api_key: safeKey },
      { timeout: TIMEOUT_MS }
    );
    return normalizeChatPayload(data);
  }
}

async function getMLHealth() {
  try {
    const { data } = await axios.get(`${ML_BASE_URL}/health`, { timeout: 5000 });
    return { available: true, payload: data || {}, error: null };
  } catch (error) {
    return { available: false, payload: {}, error: error?.message || 'ML backend unavailable' };
  }
}

module.exports = { callMLBackend, getMLHealth, getFallbackResources, ML_BASE_URL };
