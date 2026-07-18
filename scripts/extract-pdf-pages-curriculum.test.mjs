// Tests for extract-pdf-pages-curriculum.mjs pure-fn classifiers.
// Run: node --test scripts/extract-pdf-pages-curriculum.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumTier, isBoilerplatePage } from './extract-pdf-pages-curriculum.mjs';

test('curriculumTier: beginner content scores tier 1', () => {
  assert.equal(curriculumTier({ relPath: 'Quick_Ref_Card.pdf', sizeBytes: 50000, top: 'MasterCam' }), 1);
  assert.equal(curriculumTier({ relPath: 'glossary.pdf', sizeBytes: 30000, top: 'foo' }), 1);
  assert.equal(curriculumTier({ relPath: 'shop-math.pdf', sizeBytes: 100000, top: 'foo' }), 1);
  assert.equal(curriculumTier({ relPath: 'WhatsNew.pdf', sizeBytes: 50000, top: 'MasterCam' }), 1);
  assert.equal(curriculumTier({ relPath: 'lesson.pdf', sizeBytes: 100000, top: '1- Basic Training Day 1' }), 1);
});

test('curriculumTier: intro tutorials score tier 2', () => {
  assert.equal(curriculumTier({ relPath: 'Getting Started with X.pdf', sizeBytes: 500000, top: 'foo' }), 2);
  assert.equal(curriculumTier({ relPath: 'Intro_to_Y.pdf', sizeBytes: 200000, top: 'foo' }), 2);
});

test('curriculumTier: procedural tutorials score tier 3', () => {
  assert.equal(curriculumTier({ relPath: 'tutorial.pdf', sizeBytes: 600000, top: 'foo' }), 3);
  assert.equal(curriculumTier({ relPath: 'Dynamic_Milling.pdf', sizeBytes: 3000000, top: 'MasterCam' }), 3);
});

test('curriculumTier: advanced/strategy score tier 4', () => {
  assert.equal(curriculumTier({ relPath: 'cam-strategies.pdf', sizeBytes: 2000000, top: 'foo' }), 4);
  assert.equal(curriculumTier({ relPath: 'post_processor.pdf', sizeBytes: 1000000, top: 'foo' }), 4);
  assert.equal(curriculumTier({ relPath: '5-Axis-Guide.pdf', sizeBytes: 4000000, top: 'foo' }), 4);
});

test('curriculumTier: deep reference scores tier 5', () => {
  assert.equal(curriculumTier({ relPath: 'Administrator_Guide.pdf', sizeBytes: 200000, top: 'MasterCam' }), 5);
  assert.equal(curriculumTier({ relPath: 'Installation_Guide.pdf', sizeBytes: 1000000, top: 'foo' }), 5);
  assert.equal(curriculumTier({ relPath: 'operator-manual.pdf', sizeBytes: 100000, top: 'foo' }), 5);
  assert.equal(curriculumTier({ relPath: 'random.pdf', sizeBytes: 10_000_000, top: 'foo' }), 5);
});

test('curriculumTier: defaults to tier 2 for small unknown PDFs', () => {
  assert.equal(curriculumTier({ relPath: 'random.pdf', sizeBytes: 100000, top: 'foo' }), 2);
});

test('isBoilerplatePage: blank or short page is skipped', () => {
  assert.equal(isBoilerplatePage(''), true);
  assert.equal(isBoilerplatePage('   '), true);
  assert.equal(isBoilerplatePage('only 50 chars of text here, nothing notable'), true);
});

test('isBoilerplatePage: copyright page is skipped', () => {
  const copyright = `Copyright © 2014 CNC Software, Inc.
All rights reserved.
Terms of Use: Use of this document is subject to the Mastercam End User License Agreement.
Software: Mastercam X8.
Date: June 2014.`.padEnd(800, ' ');
  assert.equal(isBoilerplatePage(copyright), true);
});

test('isBoilerplatePage: page-numbers-only is skipped', () => {
  assert.equal(isBoilerplatePage('1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46'), true);
});

test('isBoilerplatePage: notable content is kept', () => {
  const real = `# Dynamic Milling

Dynamic Milling is a high-speed roughing strategy that maintains a consistent chip load by varying the toolpath.

## Key parameters
- Stepover: 10-15% for HSM
- Stepdown: full flute length supported
- Spindle speed: based on surface speed × diameter
- Feedrate: chip thinning compensation required`.padEnd(500, ' ');
  assert.equal(isBoilerplatePage(real), false);
});

test('isBoilerplatePage: real content with mention of copyright is kept', () => {
  const real = `Adaptive clearing uses constant tool engagement to maximize material removal rate. Chip thinning compensates for the reduced radial engagement. Tool life is improved by 3-5x compared to conventional pocketing strategies. This document supersedes prior copyright 2012 guidance from CAM vendors.`.padEnd(1600, ' ');
  // Has copyright keyword but content is long + substantive — keep it.
  assert.equal(isBoilerplatePage(real), false);
});
