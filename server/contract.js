/**
 * Server-side mirror of the model service contract.
 *
 * The model service owns `CONTRACT_VERSION`. This file must stay in lock-step
 * with model-service/contract.py. It is the ONE place the server speaks the
 * stress vocabulary, so nothing downstream can invent "Moderate" again.
 *
 * Why mirror it instead of sharing a file? Different runtimes (Python vs Node).
 * A shared source would need codegen. A tiny, tested mirror with a version
 * check at startup is simpler and still safe.
 */

const CONTRACT_VERSION = '1.1.0';

// MUST equal contract.py StressLevel. Never "Moderate".
const STRESS_LEVELS = ['Low', 'Medium', 'High'];

const EMOTION_LABELS = ['joy', 'anger', 'sadness', 'fear', 'love', 'surprise'];

const STRATEGIES = [
  'crisis_override',
  'deep_support',
  'calm_validation',
  'empathetic_probe',
  'light_checkin',
];

/** Coerce any incoming label onto our vocabulary, or null. Mirrors the Python fn. */
function normalizeStressLabel(raw) {
  const label = String(raw ?? '').trim().toLowerCase();
  if (label.includes('low')) return 'Low';
  if (label.includes('moderate') || label.includes('medium')) return 'Medium';
  if (label.includes('high')) return 'High';
  if (/^label_[0-9]$/.test(label)) {
    return { 0: 'Low', 1: 'Medium', 2: 'High' }[Number(label.slice(-1))] ?? null;
  }
  if (/^[0-9]$/.test(label)) {
    return { 0: 'Low', 1: 'Medium', 2: 'High' }[Number(label)] ?? null;
  }
  return null;
}

module.exports = {
  CONTRACT_VERSION,
  STRESS_LEVELS,
  EMOTION_LABELS,
  STRATEGIES,
  normalizeStressLabel,
};