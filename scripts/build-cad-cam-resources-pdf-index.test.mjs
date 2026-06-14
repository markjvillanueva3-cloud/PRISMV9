// Tests for build-cad-cam-resources-pdf-index.mjs classifier.
// Run via: node --test scripts/build-cad-cam-resources-pdf-index.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './build-cad-cam-resources-pdf-index.mjs';

test('classify routes top-level CAM dirs to cam domain', () => {
  assert.equal(classify('HYPERMILL/foo.pdf').domain, 'cam');
  assert.equal(classify('MasterCam/bar.pdf').domain, 'cam');
  assert.equal(classify('SOLIDCAM/baz.pdf').domain, 'cam');
  assert.equal(classify('OPEN MIND/qux.pdf').domain, 'cam');
  assert.equal(classify('FUSION 360 PROGRAMS/x.pdf').domain, 'cam');
  assert.equal(classify('inventor-hsm/y.pdf').domain, 'cam');
});

test('classify routes top-level CAD dirs to cad domain', () => {
  assert.equal(classify('SOLIDWORKS/p.pdf').domain, 'cad');
  assert.equal(classify('Freecad/q.pdf').domain, 'cad');
  assert.equal(classify('Inventor/r.pdf').domain, 'cad');
  assert.equal(classify('DWG TrueView 2027 - English/s.pdf').domain, 'cad');
});

test('classify carries software label per top-level mapping', () => {
  assert.equal(classify('HYPERMILL/a.pdf').software, 'hypermill');
  assert.equal(classify('OPEN MIND/b.pdf').software, 'hypermill');
  assert.equal(classify('Freecad/c.pdf').software, 'freecad');
  assert.equal(classify('FUSION POSTS/d.pdf').software, 'fusion360-post');
});

test('classify routes training/machine/catalog dirs distinctly', () => {
  assert.equal(classify('MIT COURSES/lec1.pdf').domain, 'training');
  assert.equal(classify('GENERIC_MACHINE_MODELS/m.pdf').domain, 'machine');
  assert.equal(classify('MANUFACTURER_CATALOGS/t.pdf').domain, 'catalog');
  assert.equal(classify('MACRO PROGRAMS/g.pdf').domain, 'mfg');
});

test('classify uses filename heuristics for unmapped top-levels', () => {
  // Top-level loose file matching Hurco/WinMax keyword.
  assert.equal(classify('WinMax Mill CUTTER COMPENSATION.pdf').software, 'hurco');
  assert.equal(classify('AC1337_handout_1337_AC1377_20_20Mighty_20Macros_20_2013-1115.pdf').domain, 'mfg');
});

test('classify falls back to training/misc for truly unknown', () => {
  const r = classify('NOT_A_REAL_DIR/x.pdf');
  assert.equal(r.domain, 'training');
  assert.equal(r.software, 'misc');
});

test('classify preserves the top-level dir name', () => {
  assert.equal(classify('HYPERMILL/sub/dir/file.pdf').top, 'HYPERMILL');
  assert.equal(classify('orphan.pdf').top, 'orphan.pdf');
});

test('classify handles backslash and forward-slash separators', () => {
  assert.equal(classify('HYPERMILL\\sub\\file.pdf').domain, 'cam');
  assert.equal(classify('SOLIDWORKS/file.pdf').domain, 'cad');
});
