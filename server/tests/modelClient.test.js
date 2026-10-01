const test = require('node:test');
const assert = require('node:assert');

// Force the model client to always fail so we exercise the degradation path.
process.env.MODEL_SERVICE_URL = 'http://127.0.0.1:1';
process.env.MODEL_TIMEOUT_MS = '200';

const modelClient = require('../utils/modelClient');

test('analyze degrades to a valid shape when the service is unreachable', async () => {
  const result = await modelClient.analyze('I feel completely overwhelmed today');
  assert.strictEqual(result.model_mode, 'rules_only');
  assert.ok(['Low', 'Medium', 'High'].includes(result.stress_level));
  assert.ok(typeof result.reply === 'string' && result.reply.length > 0);
  assert.ok(result._fallback_reason, 'should record why it degraded');
});

test('fallback never returns the forbidden Moderate label', async () => {
  for (const text of ['okay', 'so-so', 'nothing much']) {
    const result = await modelClient.analyze(text);
    assert.notStrictEqual(result.stress_level, 'Moderate');
  }
});

test('crisis text still maps to a safe fallback', async () => {
  const result = await modelClient.analyze('I want to die');
  assert.strictEqual(result.stress_level, 'High');
});