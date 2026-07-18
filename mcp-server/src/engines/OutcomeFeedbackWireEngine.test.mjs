// Tests for OutcomeFeedbackWireEngine
// Run: node --test mcp-server/src/engines/OutcomeFeedbackWireEngine.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidOutcome, aggregateByTemplate, computeCorpusDelta, shouldRetrain, META } from './OutcomeFeedbackWireEngine.mjs';

const FLOOR = META.productionPromotionSuccessFloor;

function mkOutcome(over = {}) {
  return {
    outcomeId: 'o-' + Math.random().toString(36).slice(2, 8),
    templateId: 't1',
    decision: 'direct',
    observed: 'success',
    query: { material: 'aluminum', operation: 'pocket-roughing', machine: 'haas-vf2' },
    ...over,
  };
}

test('isValidOutcome: well-formed record passes', () => {
  assert.equal(isValidOutcome(mkOutcome()), true);
});

test('isValidOutcome: missing observed → false', () => {
  assert.equal(isValidOutcome({ outcomeId: 'x', decision: 'direct' }), false);
});

test('isValidOutcome: invalid observed value → false', () => {
  assert.equal(isValidOutcome(mkOutcome({ observed: 'maybe' })), false);
});

test('isValidOutcome: null/undefined → false', () => {
  assert.equal(isValidOutcome(null), false);
  assert.equal(isValidOutcome(undefined), false);
});

test('aggregateByTemplate: counts success/partial/fail per template', () => {
  const outcomes = [
    mkOutcome({ templateId: 't1', observed: 'success' }),
    mkOutcome({ templateId: 't1', observed: 'success' }),
    mkOutcome({ templateId: 't1', observed: 'fail' }),
    mkOutcome({ templateId: 't2', observed: 'partial' }),
  ];
  const agg = aggregateByTemplate(outcomes);
  assert.deepEqual(agg.get('t1'), { success: 2, partial: 0, fail: 1, total: 3 });
  assert.deepEqual(agg.get('t2'), { success: 0, partial: 1, fail: 0, total: 1 });
});

test('aggregateByTemplate: invalid outcomes skipped', () => {
  const outcomes = [mkOutcome(), { not: 'valid' }, null];
  const agg = aggregateByTemplate(outcomes);
  assert.equal(agg.size, 1);
});

test('aggregateByTemplate: rejects non-array', () => {
  assert.equal(aggregateByTemplate(null).size, 0);
});

test('computeCorpusDelta: promotes template hitting success floor with 0 fails', () => {
  const outcomes = Array.from({ length: FLOOR }, () => mkOutcome({ observed: 'success' }));
  const d = computeCorpusDelta(outcomes);
  assert.equal(d.promote.length, 1);
  assert.equal(d.promote[0].templateId, 't1');
  assert.equal(d.demote.length, 0);
});

test('computeCorpusDelta: does NOT promote if any fail present', () => {
  const outcomes = [
    ...Array.from({ length: FLOOR }, () => mkOutcome({ observed: 'success' })),
    mkOutcome({ observed: 'fail' }),
  ];
  const d = computeCorpusDelta(outcomes);
  // 3 success + 1 fail: not promoted (fail>0), not demoted (fail<2*success).
  assert.equal(d.promote.length, 0);
  assert.equal(d.demote.length, 0);
});

test('computeCorpusDelta: demotes template where fail ≥ 2× success', () => {
  const outcomes = [
    mkOutcome({ observed: 'success' }),
    mkOutcome({ observed: 'fail' }),
    mkOutcome({ observed: 'fail' }),
  ];
  const d = computeCorpusDelta(outcomes);
  assert.equal(d.demote.length, 1);
  assert.equal(d.demote[0].fail, 2);
  assert.equal(d.demote[0].success, 1);
});

test('computeCorpusDelta: surfaces compose-decision successes as newCandidates', () => {
  const outcomes = [
    mkOutcome({ templateId: '_compose_', decision: 'compose', observed: 'success' }),
    mkOutcome({ templateId: '_compose_', decision: 'compose', observed: 'fail' }),
  ];
  const d = computeCorpusDelta(outcomes);
  assert.equal(d.newCandidates.length, 1);
  assert.ok(d.newCandidates[0].query);
});

test('computeCorpusDelta: skips invalid records and counts them', () => {
  const outcomes = [mkOutcome(), { bogus: true }, null];
  const d = computeCorpusDelta(outcomes);
  assert.equal(d.skipped, 2);
  assert.equal(d.totalConsumed, 1);
});

test('computeCorpusDelta: handles empty/non-array input', () => {
  const d = computeCorpusDelta(null);
  assert.deepEqual(d.promote, []);
  assert.deepEqual(d.demote, []);
  assert.deepEqual(d.newCandidates, []);
  assert.equal(d.totalConsumed, 0);
});

test('shouldRetrain: below threshold → no retrain', () => {
  const r = shouldRetrain({ promote: [], demote: [], newCandidates: [], totalConsumed: 10 });
  assert.equal(r.retrain, false);
  assert.equal(r.reason, 'below-outcome-threshold');
});

test('shouldRetrain: at threshold but no novelty → no retrain', () => {
  const r = shouldRetrain({ promote: [], demote: [], newCandidates: [], totalConsumed: 50 });
  assert.equal(r.retrain, false);
  assert.equal(r.reason, 'no-novel-information');
});

test('shouldRetrain: at threshold + novelty → retrain', () => {
  const r = shouldRetrain({
    promote: [{ templateId: 't1' }],
    demote: [],
    newCandidates: [],
    totalConsumed: 50,
  });
  assert.equal(r.retrain, true);
  assert.equal(r.novelty, 1);
});

test('shouldRetrain: rejects invalid delta', () => {
  const r = shouldRetrain(null);
  assert.equal(r.retrain, false);
  assert.equal(r.reason, 'invalid-delta');
});

test('shouldRetrain: custom threshold respected', () => {
  const r = shouldRetrain(
    { promote: [{ templateId: 't1' }], demote: [], newCandidates: [], totalConsumed: 20 },
    10
  );
  assert.equal(r.retrain, true);
});

test('end-to-end: 3 materials × 3 templates → 1 promote + 1 demote + 1 candidate', () => {
  const outcomes = [
    // t1 aluminum: 3 success → promote
    mkOutcome({ templateId: 't1', query: { material: 'aluminum' }, observed: 'success' }),
    mkOutcome({ templateId: 't1', query: { material: 'aluminum' }, observed: 'success' }),
    mkOutcome({ templateId: 't1', query: { material: 'aluminum' }, observed: 'success' }),
    // t2 stainless: 1 success, 2 fail → demote
    mkOutcome({ templateId: 't2', query: { material: 'stainless' }, observed: 'success' }),
    mkOutcome({ templateId: 't2', query: { material: 'stainless' }, observed: 'fail' }),
    mkOutcome({ templateId: 't2', query: { material: 'stainless' }, observed: 'fail' }),
    // compose titanium: 1 success → newCandidate
    mkOutcome({ templateId: '_compose_', decision: 'compose', query: { material: 'titanium' }, observed: 'success' }),
  ];
  const d = computeCorpusDelta(outcomes);
  assert.equal(d.promote.length, 1);
  assert.equal(d.demote.length, 1);
  assert.equal(d.newCandidates.length, 1);
  assert.equal(d.totalConsumed, 7);
});

test('META exposes thresholds', () => {
  assert.equal(META.schemaVersion, '1.0.0');
  assert.equal(META.productionPromotionSuccessFloor, 3);
});
