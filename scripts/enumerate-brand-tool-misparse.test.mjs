// Tests for enumerate-brand-tool-misparse.mjs -- classification logic, real reference cases.
// Run: node scripts/enumerate-brand-tool-misparse.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRecord, enumerateMisparses } from './enumerate-brand-tool-misparse.mjs';

test('classifyRecord: bad-diameter (oversize end mill, shank plausible)', () => {
  // 200mm solid end mill on a 30mm shank: diameter is the artifact (ratio 6.7 < 8)
  assert.equal(classifyRecord({ category: 'solid_mill', diameter_mm: 200, shank_mm: 30 }), 'bad-diameter');
});

test('classifyRecord: bad-shank (plausible end mill diameter, tiny shank)', () => {
  // ACCU-0.3750 case: real 9.5mm (3/8") end mill, mis-parsed 0.8mm shank
  assert.equal(classifyRecord({ category: 'solid_mill', diameter_mm: 9.5, shank_mm: 0.8 }), 'bad-shank');
});

test('classifyRecord: ISCAR ECS-A 102mm on 6mm connection = bad-diameter', () => {
  // an end-mill-type tool above the 80mm end-mill ceiling: the cutting diameter is the artifact
  assert.equal(classifyRecord({ category: 'indexable_mill', diameter_mm: 102.67, shank_mm: 5.99 }), 'bad-diameter');
});

test('classifyRecord: clean tools return null', () => {
  assert.equal(classifyRecord({ category: 'solid_mill', diameter_mm: 12, shank_mm: 12 }), null);
  assert.equal(classifyRecord({ category: 'solid_mill', diameter_mm: 50, shank_mm: 16 }), null);
});

test('classifyRecord: large real drill (Allied, no shank) is NOT flagged', () => {
  assert.equal(classifyRecord({ category: 'drill', diameter_mm: 101.6, shank_mm: 0 }), null);
  assert.equal(classifyRecord({ category: 'drill', diameter_mm: 100, shank_mm: null }), null);
});

test('classifyRecord: non-endmill rotating cutter flagged only on gross shank ratio', () => {
  // a drill with a plausible diameter but impossible tiny shank
  assert.equal(classifyRecord({ category: 'drill', diameter_mm: 10, shank_mm: 1 }), 'bad-shank');
  // inserts/turning never flagged here
  assert.equal(classifyRecord({ category: 'insert', diameter_mm: 200, shank_mm: 0 }), null);
});

test('enumerateMisparses: aggregates counts by class and brand', () => {
  const recs = [
    { brand: 'ISCAR', id: 'a', category: 'indexable_mill', type: 'end_mill', diameter_mm: 102.67, shank_mm: 5.99 }, // bad-diameter (dc>80 wins before shank check)
    { brand: 'Accupro', id: 'b', category: 'solid_mill', type: 'end_mill', diameter_mm: 9.5, shank_mm: 0.8 }, // bad-shank
    { brand: 'ISCAR', id: 'c', category: 'solid_mill', type: 'end_mill', diameter_mm: 200, shank_mm: 30 }, // bad-diameter
    { brand: 'MAFord', id: 'd', category: 'solid_mill', type: 'end_mill', diameter_mm: 12, shank_mm: 12 }, // clean
    { brand: 'Allied', id: 'e', category: 'drill', type: 'drill', diameter_mm: 101.6, shank_mm: 0 }, // clean (real drill)
  ];
  const r = enumerateMisparses(recs);
  assert.equal(r.total, 3);
  assert.equal(r.byClass['bad-diameter'], 2); // ISCAR a (102.67) + ISCAR c (200)
  assert.equal(r.byClass['bad-shank'], 1); // Accupro b (9.5/0.8)
  assert.equal(r.byBrand.ISCAR, 2);
  assert.equal(r.byBrand.Allied, undefined);
});
