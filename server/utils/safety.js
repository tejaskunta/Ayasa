/**
 * Server-side mirror of model-service/safety.py.
 *
 * This duplication is DELIBERATE and safety-critical. If the model service is
 * unreachable, the server must still recognise crisis text and return the
 * helpline. Safety logic is one of the few things worth mirroring rather than
 * remote-calling, because a network hop should never be able to disable it.
 */

const CRISIS_PHRASES = [
  'suicide',
  'suicidal',
  'kill myself',
  'killing myself',
  'end my life',
  'end it all',
  'want to die',
  'wanna die',
  'self-harm',
  'self harm',
  'harm myself',
  'hurt myself',
  'cut myself',
  'no reason to live',
  'cannot go on',
  "can't go on",
];

const CRISIS_RESPONSE =
  'I am really glad you told me this, and your safety matters most right now. ' +
  'If you might hurt yourself, please contact your local emergency number immediately, ' +
  'or in India call Tele-MANAS on 14416 (or 1-800-891-4416), available 24/7. ' +
  'If you can, stay with someone you trust and tell them how you are feeling right now.';

/** Returns the matched phrase, or null. Mirrors detect_crisis() in Python. */
function detectCrisis(text) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return CRISIS_PHRASES.find((phrase) => normalized.includes(phrase)) || null;
}

module.exports = { CRISIS_PHRASES, CRISIS_RESPONSE, detectCrisis };