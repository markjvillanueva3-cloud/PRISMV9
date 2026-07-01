// Tests for generate-cad-cam-pdf-tribal-seeds.mjs.
// Run: node --test scripts/generate-cad-cam-pdf-tribal-seeds.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBySoftware, buildTip } from './generate-cad-cam-pdf-tribal-seeds.mjs';

const SAMPLE_NODES = [
  { software: 'hypermill', textChars: 1000, pageCount: 5, relPath: 'HYPERMILL/a.pdf', domain: 'cam' },
  { software: 'hypermill', textChars: 2000, pageCount: 8, relPath: 'HYPERMILL/b.pdf', domain: 'cam' },
  { software: 'mastercam', textChars: 1500, pageCount: 6, relPath: 'MasterCam/c.pdf', domain: 'cam' },
];

test('aggregateBySoftware groups by software', () => {
  const r = aggregateBySoftware(SAMPLE_NODES);
  assert.equal(r.size, 2);
  assert.ok(r.has('hypermill'));
  assert.ok(r.has('mastercam'));
});

test('aggregateBySoftware accumulates chars + pages', () => {
  const r = aggregateBySoftware(SAMPLE_NODES);
  assert.equal(r.get('hypermill').count, 2);
  assert.equal(r.get('hypermill').totalChars, 3000);
  assert.equal(r.get('hypermill').totalPages, 13);
  assert.equal(r.get('mastercam').count, 1);
});

test('aggregateBySoftware caps sample paths at 5', () => {
  const big = Array.from({ length: 10 }, (_, i) => ({
    software: 'foo', textChars: 1, pageCount: 1, relPath: `p${i}.pdf`, domain: 'cam',
  }));
  const r = aggregateBySoftware(big);
  assert.equal(r.get('foo').count, 10);
  assert.equal(r.get('foo').paths.length, 5);
});

test('aggregateBySoftware handles empty input', () => {
  const r = aggregateBySoftware([]);
  assert.equal(r.size, 0);
});

test('buildTip emits required fields', () => {
  const agg = { count: 2, totalChars: 3000, totalPages: 13, paths: ['a.pdf', 'b.pdf'] };
  const tip = buildTip('hypermill', agg, 'cam');
  assert.equal(tip.id, 'tribal-pdf-corpus-hypermill');
  assert.equal(tip.domain, 'cam');
  assert.equal(tip.software, 'hypermill');
  assert.equal(tip.nodeCount, 2);
  assert.ok(tip.tags.includes('cam'));
  assert.ok(tip.tags.includes('hypermill'));
  assert.ok(tip.tags.includes('pdf-corpus'));
  assert.equal(tip.sourceType, 'pointer');
});

test('buildTip resolves software→domain via SOFTWARE_TO_DOMAIN_TAG when present', () => {
  const agg = { count: 1, totalChars: 100, totalPages: 1, paths: ['p.pdf'] };
  // Mastercam is mapped to cam, even if domain arg said something else.
  assert.equal(buildTip('mastercam', agg, 'wat').domain, 'cam');
  assert.equal(buildTip('solidworks', agg, 'wat').domain, 'cad');
  assert.equal(buildTip('engineering-drawing', agg, 'wat').domain, 'blueprint');
});

test('buildTip falls back to passed domain for unknown software', () => {
  const agg = { count: 1, totalChars: 100, totalPages: 1, paths: ['p.pdf'] };
  assert.equal(buildTip('not-a-real-software', agg, 'training').domain, 'training');
});
