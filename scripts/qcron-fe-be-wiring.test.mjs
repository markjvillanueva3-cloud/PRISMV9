// Tests for qcron-fe-be-wiring.mjs extractContractGaps (shape-tolerant LF1 signal).
// Run directly: node scripts/qcron-fe-be-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractContractGaps } from './qcron-fe-be-wiring.mjs';

test('new shape (stats.liveGaps/orphanGaps) -> reads live + orphan + total', () => {
  const c = { stats: { gaps: 3, liveGaps: 1, orphanGaps: 2 } };
  assert.deepEqual(extractContractGaps(c), { live: 1, orphan: 2, total: 3 });
});

test('new shape via arrays (no stats) -> counts liveGaps/orphanGaps arrays', () => {
  const c = { liveGaps: [{ prefix: '/api/v1/ai' }], orphanGaps: [{ prefix: '/api/dispatch' }, { prefix: '/api/prism' }] };
  assert.deepEqual(extractContractGaps(c), { live: 1, orphan: 2, total: 3 });
});

test('legacy flat gaps[] -> treated as all-live (conservative), orphan null', () => {
  const c = { gaps: [{ prefix: '/a' }, { prefix: '/b' }] };
  assert.deepEqual(extractContractGaps(c), { live: 2, orphan: null, total: 2 });
});

test('legacy uncovered[] / gapCount fallbacks', () => {
  assert.deepEqual(extractContractGaps({ uncovered: [1, 2, 3] }), { live: 3, orphan: null, total: 3 });
  assert.deepEqual(extractContractGaps({ gapCount: 5 }), { live: 5, orphan: null, total: 5 });
});

test('zero live gaps is preserved (not coerced to null) -> no false "signal lost"', () => {
  const c = { stats: { gaps: 2, liveGaps: 0, orphanGaps: 2 } };
  assert.deepEqual(extractContractGaps(c), { live: 0, orphan: 2, total: 2 });
});

test('empty/garbage -> all null (no throw)', () => {
  assert.deepEqual(extractContractGaps({}), { live: null, orphan: null, total: null });
  assert.deepEqual(extractContractGaps(null), { live: null, orphan: null, total: null });
  assert.deepEqual(extractContractGaps(undefined), { live: null, orphan: null, total: null });
});
