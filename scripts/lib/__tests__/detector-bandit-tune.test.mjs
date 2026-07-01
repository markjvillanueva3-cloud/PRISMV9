/**
 * detector-bandit-tune.test.mjs — pure-function tests for detector bandit lib.
 *
 * Uses node:test (no vitest dependency) so the lib can be exercised standalone
 * from any worktree without bringing in mcp-server's test toolchain.
 *
 * Run: node --test scripts/lib/__tests__/detector-bandit-tune.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDecisionLedger,
  computeRewards,
  formatBanditReport,
} from '../detector-bandit-tune.mjs';

// --------------------------------------------------------------------------------------
// Test 1: parseDecisionLedger empty string → empty Map
// --------------------------------------------------------------------------------------
test('parseDecisionLedger: empty string returns empty Map', () => {
  const result = parseDecisionLedger('');
  assert.ok(result instanceof Map, 'expected a Map');
  assert.equal(result.size, 0, 'expected empty Map for empty input');
});

test('parseDecisionLedger: non-string input returns empty Map', () => {
  // Edge-case armor — null/undefined/number shouldn't throw
  assert.equal(parseDecisionLedger(null).size, 0);
  assert.equal(parseDecisionLedger(undefined).size, 0);
  assert.equal(parseDecisionLedger(42).size, 0);
});

// --------------------------------------------------------------------------------------
// Test 2: parseDecisionLedger 3 detector mix → correct buckets
// --------------------------------------------------------------------------------------
test('parseDecisionLedger: 3-detector mix buckets correctly', () => {
  const lines = [
    // detectorA: 2 nudges, 1 followed, 1 ignored
    JSON.stringify({ ts: '2026-05-24T00:00:01Z', detector: 'detectorA', reason: 'r1', nudge: true, follower_action: 'rewrote' }),
    JSON.stringify({ ts: '2026-05-24T00:00:02Z', detector: 'detectorA', reason: 'r2', nudge: true, follower_action: 'ignored' }),
    // detectorB: 1 nudge, 1 unknown
    JSON.stringify({ ts: '2026-05-24T00:00:03Z', detector: 'detectorB', reason: 'r3', nudge: true, follower_action: 'unknown' }),
    // detectorC: 1 nudge=false but rewrote (counts toward followed, not nudges)
    JSON.stringify({ ts: '2026-05-24T00:00:04Z', detector: 'detectorC', reason: 'r4', nudge: false, follower_action: 'rewrote' }),
    // detectorC: 1 nudge=true, ignored
    JSON.stringify({ ts: '2026-05-24T00:00:05Z', detector: 'detectorC', reason: 'r5', nudge: true, follower_action: 'ignored' }),
  ].join('\n');

  const result = parseDecisionLedger(lines);
  assert.equal(result.size, 3, 'expected 3 detectors');

  assert.deepEqual(result.get('detectorA'), { nudges: 2, followed: 1, ignored: 1, unknown: 0 });
  assert.deepEqual(result.get('detectorB'), { nudges: 1, followed: 0, ignored: 0, unknown: 1 });
  assert.deepEqual(result.get('detectorC'), { nudges: 1, followed: 1, ignored: 1, unknown: 0 });
});

// --------------------------------------------------------------------------------------
// Test 3: computeRewards 0/20 followed → status "suppress"
// --------------------------------------------------------------------------------------
test('computeRewards: 0/20 followed → "suppress"', () => {
  const parsed = new Map([
    ['noisyDetector', { nudges: 20, followed: 0, ignored: 20, unknown: 0 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('noisyDetector');
  assert.ok(info, 'detector entry missing');
  assert.equal(info.samples, 20);
  assert.equal(info.reward, 0);
  assert.equal(info.status, 'suppress');
});

// --------------------------------------------------------------------------------------
// Test 4: computeRewards 18/20 → status "boost"
// --------------------------------------------------------------------------------------
test('computeRewards: 18/20 followed → "boost"', () => {
  const parsed = new Map([
    ['goodDetector', { nudges: 20, followed: 18, ignored: 2, unknown: 0 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('goodDetector');
  assert.equal(info.samples, 20);
  assert.equal(info.reward, 18 / 20);
  assert.equal(info.status, 'boost');
});

// --------------------------------------------------------------------------------------
// Test 5: computeRewards 10/20 → status "hold"
// --------------------------------------------------------------------------------------
test('computeRewards: 10/20 followed → "hold"', () => {
  const parsed = new Map([
    ['mehDetector', { nudges: 20, followed: 10, ignored: 10, unknown: 0 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('mehDetector');
  assert.equal(info.samples, 20);
  assert.equal(info.reward, 0.5);
  assert.equal(info.status, 'hold');
});

// --------------------------------------------------------------------------------------
// Test 6: computeRewards < minSamples → "hold" regardless of ratio
// --------------------------------------------------------------------------------------
test('computeRewards: below minSamples → "hold" even at perfect ratio', () => {
  const parsed = new Map([
    ['tinySample', { nudges: 5, followed: 5, ignored: 0, unknown: 0 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('tinySample');
  assert.equal(info.samples, 5);
  assert.equal(info.reward, 1);
  assert.equal(info.status, 'hold', 'samples<minSamples must hold regardless of reward');
});

test('computeRewards: below minSamples → "hold" even at zero ratio', () => {
  const parsed = new Map([
    ['tinyBadSample', { nudges: 5, followed: 0, ignored: 5, unknown: 0 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('tinyBadSample');
  assert.equal(info.status, 'hold', 'samples<minSamples blocks suppress too');
});

test('computeRewards: custom minSamples respected', () => {
  const parsed = new Map([
    ['detA', { nudges: 10, followed: 9, ignored: 1, unknown: 0 }],
  ]);
  const result = computeRewards(parsed, { minSamples: 10 });
  const info = result.get('detA');
  assert.equal(info.status, 'boost', 'samples=10 meets minSamples=10');
});

test('computeRewards: unknowns count toward samples but not denominator', () => {
  // 15 followed, 0 ignored, 10 unknown → samples=25, reward=15/15=1.0 → boost
  const parsed = new Map([
    ['unkHeavy', { nudges: 25, followed: 15, ignored: 0, unknown: 10 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('unkHeavy');
  assert.equal(info.samples, 25);
  assert.equal(info.reward, 1);
  assert.equal(info.status, 'boost');
});

test('computeRewards: zero decisive total → reward 0 (no NaN)', () => {
  // All unknown — denominator is zero, reward must not be NaN
  const parsed = new Map([
    ['allUnknown', { nudges: 30, followed: 0, ignored: 0, unknown: 30 }],
  ]);
  const result = computeRewards(parsed);
  const info = result.get('allUnknown');
  assert.equal(info.reward, 0);
  assert.ok(!Number.isNaN(info.reward), 'reward must not be NaN');
  assert.equal(info.status, 'suppress', 'reward=0 with samples>=minSamples → suppress');
});

// --------------------------------------------------------------------------------------
// Test 7: formatBanditReport produces correct triage lists
// --------------------------------------------------------------------------------------
test('formatBanditReport: buckets detectors by status, sorted', () => {
  const rewards = new Map([
    ['zSuppress', { reward: 0.05, samples: 30, status: 'suppress' }],
    ['aBoost', { reward: 0.9, samples: 30, status: 'boost' }],
    ['mHold', { reward: 0.5, samples: 30, status: 'hold' }],
    ['aSuppress', { reward: 0.02, samples: 30, status: 'suppress' }],
    ['zBoost', { reward: 0.99, samples: 30, status: 'boost' }],
  ]);
  const report = formatBanditReport(rewards, '2026-05-24T00:00:00Z');

  assert.equal(report.ts, '2026-05-24T00:00:00Z');
  assert.deepEqual(report.summary.suppress, ['aSuppress', 'zSuppress'], 'suppress sorted');
  assert.deepEqual(report.summary.boost, ['aBoost', 'zBoost'], 'boost sorted');
  assert.deepEqual(report.summary.hold, ['mHold'], 'hold sorted');
});

test('formatBanditReport: empty Map → empty triage lists', () => {
  const report = formatBanditReport(new Map(), '2026-05-24T00:00:00Z');
  assert.deepEqual(report.summary, { suppress: [], boost: [], hold: [] });
});

test('formatBanditReport: non-Map input → empty lists, no throw', () => {
  const report = formatBanditReport(null, '2026-05-24T00:00:00Z');
  assert.deepEqual(report.summary, { suppress: [], boost: [], hold: [] });
});

test('formatBanditReport: missing ts defaults to empty string', () => {
  const report = formatBanditReport(new Map(), undefined);
  assert.equal(report.ts, '');
});

// --------------------------------------------------------------------------------------
// Test 8: Adversarial — malformed JSON line skipped (no throw)
// --------------------------------------------------------------------------------------
test('parseDecisionLedger: malformed JSON lines skipped, valid lines preserved', () => {
  const lines = [
    JSON.stringify({ ts: 't1', detector: 'goodDet', reason: 'r1', nudge: true, follower_action: 'rewrote' }),
    'this is not json at all{{{',                          // malformed
    '{"detector": "goodDet", "follower_action":',          // truncated JSON
    JSON.stringify({ ts: 't2', detector: 'goodDet', reason: 'r2', nudge: true, follower_action: 'ignored' }),
    '',                                                    // blank line (skipped silently)
    '   ',                                                 // whitespace-only (skipped)
    JSON.stringify({ ts: 't3', noDetectorField: true }),   // missing detector field
    JSON.stringify({ ts: 't4', detector: '', nudge: true }), // empty-string detector
    JSON.stringify({ ts: 't5', detector: 42, nudge: true }), // non-string detector
    JSON.stringify({ ts: 't6', detector: 'goodDet', nudge: true, follower_action: 'rewrote' }),
  ].join('\n');

  // Must not throw
  const result = parseDecisionLedger(lines);
  assert.equal(result.size, 1, 'only goodDet survives');
  assert.deepEqual(result.get('goodDet'), { nudges: 3, followed: 2, ignored: 1, unknown: 0 });
});

test('parseDecisionLedger: handles CRLF line endings', () => {
  const lines = [
    JSON.stringify({ detector: 'd1', nudge: true, follower_action: 'rewrote' }),
    JSON.stringify({ detector: 'd1', nudge: true, follower_action: 'ignored' }),
  ].join('\r\n');

  const result = parseDecisionLedger(lines);
  assert.deepEqual(result.get('d1'), { nudges: 2, followed: 1, ignored: 1, unknown: 0 });
});

test('parseDecisionLedger: entry that is a JSON array → skipped (not an object)', () => {
  const lines = [
    JSON.stringify([1, 2, 3]),                                                    // skip
    JSON.stringify({ detector: 'd1', nudge: true, follower_action: 'rewrote' }),  // keep
  ].join('\n');

  const result = parseDecisionLedger(lines);
  // Array.detector is undefined → skipped
  assert.equal(result.size, 1);
  assert.ok(result.has('d1'));
});

// --------------------------------------------------------------------------------------
// Integration smoke — parse → compute → format end-to-end
// --------------------------------------------------------------------------------------
test('integration: parse → compute → format end-to-end', () => {
  // Build a ledger with 3 detectors at known reward levels.
  const entries = [];
  // detSuppress: 0 followed, 25 ignored → reward 0 → suppress
  for (let i = 0; i < 25; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detSuppress', nudge: true, follower_action: 'ignored' }));
  }
  // detBoost: 22 followed, 3 ignored → reward 0.88 → boost
  for (let i = 0; i < 22; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detBoost', nudge: true, follower_action: 'rewrote' }));
  }
  for (let i = 0; i < 3; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detBoost', nudge: true, follower_action: 'ignored' }));
  }
  // detHold: 10 followed, 15 ignored → reward 0.4 → hold
  for (let i = 0; i < 10; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detHold', nudge: true, follower_action: 'rewrote' }));
  }
  for (let i = 0; i < 15; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detHold', nudge: true, follower_action: 'ignored' }));
  }
  // detTiny: 5 followed → under threshold → hold
  for (let i = 0; i < 5; i++) {
    entries.push(JSON.stringify({ ts: 't', detector: 'detTiny', nudge: true, follower_action: 'rewrote' }));
  }

  const parsed = parseDecisionLedger(entries.join('\n'));
  const rewards = computeRewards(parsed);
  const report = formatBanditReport(rewards, '2026-05-24T12:00:00Z');

  assert.deepEqual(report.summary.suppress, ['detSuppress']);
  assert.deepEqual(report.summary.boost, ['detBoost']);
  assert.deepEqual(report.summary.hold.sort(), ['detHold', 'detTiny']);
  assert.equal(report.ts, '2026-05-24T12:00:00Z');
});
