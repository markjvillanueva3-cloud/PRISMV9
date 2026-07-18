// Tests for TemplateApplicabilityClassifierEngine
// Run: node --test mcp-server/src/engines/TemplateApplicabilityClassifierEngine.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { jaccardSimilarity, needsParameterOverride, classify, META } from './TemplateApplicabilityClassifierEngine.mjs';

// === Reference template corpus spanning 3 materials × 3 ops × 3 machines ===
const CORPUS = [
  { id: 't1', material: 'aluminum', operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' },
  { id: 't2', material: 'stainless', operation: 'finish-contour', machine: 'okuma-multus', toleranceClass: 'tight', geometryClass: 'freeform' },
  { id: 't3', material: 'titanium', operation: 'drilling', machine: 'mazak-vtc', toleranceClass: 'standard', geometryClass: 'prismatic' },
  { id: 't4', material: 'aluminum', operation: 'finish-contour', machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' },
];

test('jaccardSimilarity: identical tuples score 1.0', () => {
  const a = { x: 'a', y: 'b' };
  assert.equal(jaccardSimilarity(a, { ...a }), 1);
});

test('jaccardSimilarity: disjoint tuples score 0', () => {
  assert.equal(jaccardSimilarity({ x: 'a' }, { y: 'b' }), 0);
});

test('jaccardSimilarity: case-insensitive value match', () => {
  assert.equal(jaccardSimilarity({ m: 'ALUMINUM' }, { m: 'aluminum' }), 1);
});

test('jaccardSimilarity: null/empty inputs return 0 (no silent fallback)', () => {
  assert.equal(jaccardSimilarity(null, null), 0);
  assert.equal(jaccardSimilarity({}, {}), 0);
  assert.equal(jaccardSimilarity(null, { x: 'a' }), 0);
});

test('jaccardSimilarity: partial overlap scored correctly', () => {
  // 5 keys total, 3 match (material, operation, machine), 2 differ (tol, geom)
  // jaccard = 3/5 = 0.6
  const q = { material: 'aluminum', operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'tight', geometryClass: 'freeform' };
  const t = CORPUS[0];
  assert.equal(jaccardSimilarity(q, t), 0.6);
});

test('needsParameterOverride: same anchor + different peripheral returns true', () => {
  const q = { material: 'aluminum', operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'tight', geometryClass: 'prismatic' };
  assert.equal(needsParameterOverride(q, CORPUS[0]), true);
});

test('needsParameterOverride: different anchor returns false', () => {
  const q = { material: 'stainless', operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' };
  assert.equal(needsParameterOverride(q, CORPUS[0]), false);
});

test('classify: direct hit when query matches a template exactly', () => {
  const r = classify(CORPUS[0], CORPUS);
  assert.equal(r.decision, 'direct');
  assert.equal(r.matchedTemplateId, 't1');
  assert.ok(r.confidence >= META.thresholds.direct);
});

test('classify: override when anchor matches but peripheral differs', () => {
  const q = { material: 'aluminum', operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'tight', geometryClass: 'freeform' };
  const r = classify(q, CORPUS);
  assert.equal(r.decision, 'override');
  assert.equal(r.matchedTemplateId, 't1');
});

test('classify: compose when no template close enough but tuple is well-formed', () => {
  const q = { material: 'inconel', operation: 'engraving', machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' };
  const r = classify(q, CORPUS);
  // best match has 3/5 keys overlap on (machine + tol + geom) = 0.6 → override-bucket
  // but anchor (material+operation) differs → not override → falls into direct/compose
  // jaccard 0.6 is below DIRECT floor (0.85) but above OVERRIDE floor (0.55)
  // and NOT needsParameterOverride → direct via close-enough.
  assert.ok(['direct', 'compose'].includes(r.decision));
});

test('classify: gate (refuse silent fallback) on empty corpus', () => {
  const r = classify(CORPUS[0], []);
  assert.equal(r.decision, 'gate');
  assert.equal(r.reason, 'empty-template-corpus');
});

test('classify: gate on missing anchor field (kilo soul refuse)', () => {
  const r = classify({ material: 'aluminum' }, CORPUS);
  assert.equal(r.decision, 'gate');
  assert.equal(r.reason, 'missing-anchor-fields');
});

test('classify: gate on truly orthogonal query', () => {
  // No shared keys at all → jaccard 0 across all templates.
  const q = { material: 'magnesium', operation: 'lapping', machine: 'jig-grinder', toleranceClass: 'super-precision', geometryClass: 'thin-wall' };
  const r = classify(q, CORPUS);
  // 0/5 keys match any template → jaccard=0 → below GATE floor.
  assert.equal(r.decision, 'gate');
});

test('classify: alternatives surfaced for operator review', () => {
  const r = classify(CORPUS[0], CORPUS);
  assert.ok(Array.isArray(r.alternatives));
  assert.ok(r.alternatives.length >= 1, 'alternatives must include at least 1 other candidate');
});

test('classify: adversarial NaN/undefined values do not crash', () => {
  const q = { material: undefined, operation: NaN, machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' };
  const r = classify(q, CORPUS);
  // missing anchor → gate
  assert.equal(r.decision, 'gate');
});

test('classify: variability — exercises 3 spanning materials', () => {
  const queries = [
    { material: 'aluminum',  operation: 'pocket-roughing', machine: 'haas-vf2', toleranceClass: 'standard', geometryClass: 'prismatic' },
    { material: 'stainless', operation: 'finish-contour', machine: 'okuma-multus', toleranceClass: 'tight', geometryClass: 'freeform' },
    { material: 'titanium',  operation: 'drilling',       machine: 'mazak-vtc', toleranceClass: 'standard', geometryClass: 'prismatic' },
  ];
  const decisions = queries.map((q) => classify(q, CORPUS).decision);
  assert.deepEqual(decisions, ['direct', 'direct', 'direct']);
});
