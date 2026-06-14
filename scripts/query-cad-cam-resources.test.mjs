// Tests for query-cad-cam-resources.mjs filterEntries.
// Run via: node --test scripts/query-cad-cam-resources.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEntries } from './query-cad-cam-resources.mjs';

const ENTRIES = [
  { relPath: 'HYPERMILL/a.pdf',  domain: 'cam', software: 'hypermill', top: 'HYPERMILL' },
  { relPath: 'MasterCam/b.pdf',  domain: 'cam', software: 'mastercam', top: 'MasterCam' },
  { relPath: 'SOLIDWORKS/c.pdf', domain: 'cad', software: 'solidworks', top: 'SOLIDWORKS' },
  { relPath: 'Freecad/d.pdf',    domain: 'cad', software: 'freecad',   top: 'Freecad' },
  { relPath: 'MIT/x.pdf',        domain: 'training', software: 'mit-ocw', top: 'MIT' },
];

test('filterEntries with no opts returns everything', () => {
  assert.equal(filterEntries(ENTRIES).length, ENTRIES.length);
  assert.equal(filterEntries(ENTRIES, {}).length, ENTRIES.length);
});

test('filterEntries by domain narrows correctly', () => {
  assert.equal(filterEntries(ENTRIES, { domain: 'cam' }).length, 2);
  assert.equal(filterEntries(ENTRIES, { domain: 'cad' }).length, 2);
  assert.equal(filterEntries(ENTRIES, { domain: 'training' }).length, 1);
});

test('filterEntries by software narrows correctly', () => {
  assert.equal(filterEntries(ENTRIES, { software: 'hypermill' }).length, 1);
  assert.equal(filterEntries(ENTRIES, { software: 'mastercam' }).length, 1);
});

test('filterEntries combines domain + software with AND', () => {
  assert.equal(filterEntries(ENTRIES, { domain: 'cam', software: 'hypermill' }).length, 1);
  assert.equal(filterEntries(ENTRIES, { domain: 'cad', software: 'hypermill' }).length, 0);
});

test('filterEntries returns empty for unmatched filters', () => {
  assert.equal(filterEntries(ENTRIES, { domain: 'nonsense' }).length, 0);
  assert.equal(filterEntries(ENTRIES, { software: 'nonsense' }).length, 0);
});

test('filterEntries handles empty input', () => {
  assert.deepEqual(filterEntries([]), []);
  assert.deepEqual(filterEntries([], { domain: 'cam' }), []);
});
