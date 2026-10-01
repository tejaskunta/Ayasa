const axios = require('axios');

const { CONTRACT_VERSION, normalizeStressLabel } = require('../contract');
const { CRISIS_RESPONSE, detectCrisis } = require('./safety');

const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 8000);

const http = axios.create({ baseURL: MODEL_SERVICE_URL, timeout: TIMEOUT_MS });

/**
 * A local, deterministic fallback used when the model service is unreachable.
 *
 * Why a fallback at all? The product must never show "Something went wrong" to
 * someone in distress. If the ML box is down, we still return a valid, typed
 * analysis in rules_only mode. The shape EXACTLY matches the model service so
 * callers do not branch.
 */
function localFallback(text, reason) {
  // Safety FIRST — never delegate this to another service being up.
  const crisis = detectCrisis(text);

  const lowered = String(text || '').toLowerCase();
  const heavy = ['overwhelm', 'anxious', 'panic', 'hopeless', 'cannot cope', "can't cope"];
  const calm = ['calm', 'fine', 'okay', 'relaxed', 'good'];
  const isHeavy = heavy.some((w) => lowered.includes(w));
  const isCalm = calm.some((w) => lowered.includes(w));

  const stressLevel = crisis ? 'High' : isHeavy ? 'High' : isCalm ? 'Low' : 'Medium';
  const reply = crisis
    ? CRISIS_RESPONSE
    : stressLevel === 'High'
      ? 'That sounds like a lot to carry. I am here with you — what feels heaviest right now?'
      : stressLevel === 'Low'
        ? 'Glad you checked in. What would make the rest of today feel good?'
        : 'Thank you for sharing that. What has been building up the most?';

  return {
    contract_version: CONTRACT_VERSION,
    model_mode: 'rules_only',
    model_name: 'local-fallback',
    is_safety_override: Boolean(crisis),
    stress_level: stressLevel,
    confidence: crisis ? 0.99 : 0.5,
    dominant_emotion: crisis ? 'fear' : isHeavy ? 'sadness' : 'joy',
    emotions: [],
    strategy: crisis ? 'crisis_override' : stressLevel === 'High' ? 'deep_support' : 'light_checkin',
    reply,
    _fallback_reason: reason,
  };
}

/**
 * Call the model service, normalising the response into a safe, typed object.
 *
 * This function NEVER throws for a network/5xx problem — it degrades. Callers
 * can rely on getting a well-formed analysis object every time.
 */
async function analyze(text) {
  try {
    const res = await http.post('/analyze', { text });
    const data = res.data || {};

    // Defend the boundary: even a "valid" 200 gets normalised.
    return {
      contract_version: data.contract_version || CONTRACT_VERSION,
      model_mode: data.model_mode || 'rules_only',
      model_name: data.model_name || 'unknown',
      is_safety_override: Boolean(data.is_safety_override),
      stress_level: normalizeStressLabel(data.stress_level),
      confidence: typeof data.confidence === 'number' ? data.confidence : null,
      dominant_emotion: data.dominant_emotion || null,
      emotions: Array.isArray(data.emotions) ? data.emotions : [],
      strategy: data.strategy || 'light_checkin',
      reply: data.reply || '',
      llm_used: Boolean(data.llm_used),
      _fallback_reason: null,
    };
  } catch (err) {
    const reason = err.code === 'ECONNABORTED' ? 'timeout' : err.message;
    console.warn(`[modelClient] analyze degraded (${reason})`);
    return localFallback(text, reason);
  }
}

async function health() {
  try {
    const res = await http.get('/health');
    return { reachable: true, ...res.data };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}

module.exports = { analyze, health };