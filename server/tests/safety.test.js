const test = require('node:test');
const assert = require('node:assert');

const { detectCrisis, CRISIS_RESPONSE } = require('../utils/safety');

test('detects crisis phrases', () => {
  assert.strictEqual(detectCrisis('some days I want to die'), 'want to die');
  assert.strictEqual(detectCrisis('I keep thinking about suicide'), 'suicide');
  assert.ok(detectCrisis('Honestly I want to end my life'));
});

test('is not fooled by spacing or case', () => {
  assert.ok(detectCrisis('I   WANT   TO   DIE'));
});

test('does not flag ordinary text', () => {
  assert.strictEqual(detectCrisis('I am tired but managing'), null);
  assert.strictEqual(detectCrisis(''), null);
});

test('crisis response always contains the helpline number', () => {
  assert.ok(CRISIS_RESPONSE.includes('14416'));
});