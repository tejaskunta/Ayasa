const test = require('node:test');
const assert = require('node:assert');

const {
  STRESS_LEVELS,
  normalizeStressLabel,
  CONTRACT_VERSION,
} = require('../contract');

test('vocabulary is exactly Low/Medium/High', () => {
  assert.deepStrictEqual(STRESS_LEVELS, ['Low', 'Medium', 'High']);
  assert.ok(!STRESS_LEVELS.includes('Moderate'));
});

test('normalizeStressLabel maps every real-world label', () => {
  assert.strictEqual(normalizeStressLabel('Low'), 'Low');
  assert.strictEqual(normalizeStressLabel('low'), 'Low');
  assert.strictEqual(normalizeStressLabel('LABEL_0'), 'Low');
  assert.strictEqual(normalizeStressLabel('LABEL_1'), 'Medium');
  assert.strictEqual(normalizeStressLabel('LABEL_2'), 'High');
  assert.strictEqual(normalizeStressLabel('0'), 'Low');
  assert.strictEqual(normalizeStressLabel('2'), 'High');
});

test('Moderate collapses to Medium instead of breaking the DB', () => {
  assert.strictEqual(normalizeStressLabel('Moderate'), 'Medium');
  assert.strictEqual(normalizeStressLabel('moderate'), 'Medium');
});

test('unknown labels return null', () => {
  assert.strictEqual(normalizeStressLabel('banana'), null);
  assert.strictEqual(normalizeStressLabel(null), null);
});

test('contract version is pinned', () => {
  assert.strictEqual(CONTRACT_VERSION, '1.1.0');
});