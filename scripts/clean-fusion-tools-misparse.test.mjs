// Tests for clean-fusion-tools-misparse.mjs -- drops bad-diameter end mills, fixes bad shanks, spares the rest.
// Run: node scripts/clean-fusion-tools-misparse.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanToolsLibrary } from './clean-fusion-tools-misparse.mjs';

test('cleanToolsLibrary: drops oversize end mills, fixes bad shanks, keeps real tools', () => {
  const json = {
    version: 1,
    data: [
      { type: 'flat end mill', unit: 'millimeters', geometry: { DC: 200, 'shaft-diameter': 200 } }, // drop (bad dia)
      { type: 'face mill', unit: 'millimeters', geometry: { DC: 200, 'shaft-diameter': 60 } },       // keep (face)
      { type: 'flat end mill', unit: 'millimeters', geometry: { DC: 12.7, 'shaft-diameter': 1.0 } }, // keep, fix shank
      { type: 'flat end mill', unit: 'millimeters', geometry: { DC: 12, 'shaft-diameter': 12 } },    // keep clean
      { type: 'drill', unit: 'millimeters', geometry: { DC: 100, 'shaft-diameter': 100 } },          // keep (not end mill)
    ],
  };
  const r = cleanToolsLibrary(json);
  assert.equal(r.dropped, 1);
  assert.equal(r.shankFixed, 1);
  assert.equal(r.kept, 4);
  // the bad-shank tool's shaft fell back to the cutting diameter
  const fixed = r.library.data.find((t) => t.type === 'flat end mill' && t.geometry.DC === 12.7);
  assert.equal(fixed.geometry['shaft-diameter'], 12.7);
  // the clean tool is untouched
  const clean = r.library.data.find((t) => t.geometry.DC === 12);
  assert.equal(clean.geometry['shaft-diameter'], 12);
  // the oversize end mill is gone
  assert.equal(r.library.data.some((t) => t.geometry.DC === 200 && t.type === 'flat end mill'), false);
  // the face mill survived
  assert.equal(r.library.data.some((t) => t.type === 'face mill'), true);
});

test('cleanToolsLibrary: inch end mill oversize uses mm conversion', () => {
  const json = { data: [
    { type: 'flat end mill', unit: 'inches', geometry: { DC: 4, 'shaft-diameter': 4 } }, // 101.6mm > 80 -> drop
    { type: 'flat end mill', unit: 'inches', geometry: { DC: 0.5, 'shaft-diameter': 0.5 } }, // 12.7mm -> keep
  ] };
  const r = cleanToolsLibrary(json);
  assert.equal(r.dropped, 1);
  assert.equal(r.kept, 1);
});

test('cleanToolsLibrary: empty / malformed input is safe', () => {
  assert.deepEqual(cleanToolsLibrary({}).kept, 0);
  assert.deepEqual(cleanToolsLibrary(null).dropped, 0);
  assert.deepEqual(cleanToolsLibrary({ data: 'nope' }).kept, 0);
});
