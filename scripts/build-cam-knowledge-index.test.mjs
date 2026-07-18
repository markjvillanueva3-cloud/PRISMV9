// Tests for build-cam-knowledge-index.mjs classifyCamRelevance.
// Run: node --test scripts/build-cam-knowledge-index.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCamRelevance } from './build-cam-knowledge-index.mjs';

test('classifyCamRelevance matches Mastercam in filename', () => {
  const r = classifyCamRelevance('tribal-mastercam-dynamic-motion.md');
  assert.equal(r.camRelevant, true);
  assert.ok(r.matchedKeywords.includes('mastercam'));
  assert.equal(r.matchSource, 'filename');
});

test('classifyCamRelevance matches HYPERMILL/Fusion variants', () => {
  assert.equal(classifyCamRelevance('hypermill-tip.md').camRelevant, true);
  assert.equal(classifyCamRelevance('fusion-360-post.md').camRelevant, true);
  assert.equal(classifyCamRelevance('fusion360-cam-notes.md').camRelevant, true);
  assert.equal(classifyCamRelevance('inventor-hsm-bridge.md').camRelevant, true);
});

test('classifyCamRelevance matches CAM concepts in content but not filename', () => {
  const r = classifyCamRelevance('random.md', 'This document explains adaptive clearing toolpath strategy for HSM.');
  assert.equal(r.camRelevant, true);
  assert.equal(r.matchSource, 'content');
  assert.ok(r.matchedKeywords.length >= 1);
});

test('classifyCamRelevance returns both when filename AND content match', () => {
  const r = classifyCamRelevance('mastercam.md', 'See also toolpath, g-code emit.');
  assert.equal(r.matchSource, 'both');
  assert.ok(r.matchedKeywords.length >= 2);
});

test('classifyCamRelevance excludes non-CAM names + content', () => {
  const r = classifyCamRelevance('shop-math.md', 'Trigonometry and arithmetic for shop floor.');
  assert.equal(r.camRelevant, false);
  assert.equal(r.matchSource, 'none');
  assert.deepEqual(r.matchedKeywords, []);
});

test('classifyCamRelevance is case-insensitive', () => {
  assert.equal(classifyCamRelevance('MASTERCAM.MD').camRelevant, true);
  assert.equal(classifyCamRelevance('a.md', 'HSM HIGH SPEED MACHINING IS FAST').camRelevant, true);
});

test('classifyCamRelevance handles empty inputs gracefully', () => {
  assert.equal(classifyCamRelevance('').camRelevant, false);
  assert.equal(classifyCamRelevance('', '').camRelevant, false);
  assert.equal(classifyCamRelevance('foo.md', '').camRelevant, false);
});

test('classifyCamRelevance dedupes overlapping keyword hits across name+content', () => {
  const r = classifyCamRelevance('mastercam-doc.md', 'this mentions mastercam too');
  // 'mastercam' should not appear twice in matchedKeywords.
  const occurrences = r.matchedKeywords.filter((k) => k === 'mastercam').length;
  assert.equal(occurrences, 1);
});
