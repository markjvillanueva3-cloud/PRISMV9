// Tests for the single-source slot->galaxy map (GALAXY-KIT-MS0). node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_GALAXY_MAP, UNMAPPED_SLOTS, galaxyForSlot } from './slot-galaxy-map.mjs';

test('every mapped slot points to a non-empty galaxy string', () => {
  const keys = Object.keys(SLOT_GALAXY_MAP);
  assert.equal(keys.length, 25, '24 NATO-with-galaxy + zebra alias');
  for (const [slot, g] of Object.entries(SLOT_GALAXY_MAP)) {
    assert.ok(typeof g === 'string' && g.length > 0, `${slot} -> non-empty galaxy`);
  }
});

test('shared-galaxy aliases collapse to the same galaxy', () => {
  // bravo (Hermes building) + zebra/zulu (fleet orchestrator) all share the hermes-zulu
  // galaxy dir. Fixed 2026-06-13: was "hermes-zebra" (a nonexistent dir) -> hermes-zulu.
  assert.equal(SLOT_GALAXY_MAP.bravo, 'hermes-zulu');
  assert.equal(SLOT_GALAXY_MAP.zebra, 'hermes-zulu');
  assert.equal(SLOT_GALAXY_MAP.zulu, 'hermes-zulu');
  // papa = backend-helper (operator-canonical CHAT-SLOT-DOMAINS); quebec is sole frontend-app.
  assert.equal(SLOT_GALAXY_MAP.papa, 'backend-helper');
  assert.equal(SLOT_GALAXY_MAP.quebec, 'frontend-app');
});

test('INVARIANT: every mapped galaxy is a real engines/<g>/ dir with a CLAUDE.md', () => {
  // The test that would have caught the hermes-zebra broken-pointer bug. The whole point
  // of the map is to route a slot to a LOADABLE galaxy CLAUDE.md; a value with no dir is
  // a silent no-op injection (the slot gets nothing). Resolve relative to this file.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const enginesRoot = path.resolve(here, '../../mcp-server/src/engines');
  const missing = [];
  for (const [slot, g] of Object.entries(SLOT_GALAXY_MAP)) {
    if (!fs.existsSync(path.join(enginesRoot, g, 'CLAUDE.md'))) missing.push(`${slot} -> ${g}`);
  }
  assert.deepEqual(missing, [], `every mapped galaxy must have engines/<g>/CLAUDE.md; missing: ${missing.join(', ')}`);
});

test('zulu is present (the briefgen drift this consolidation fixes)', () => {
  assert.ok('zulu' in SLOT_GALAXY_MAP);
});

test('november + yankee are intentionally unmapped and absent from the map', () => {
  assert.deepEqual([...UNMAPPED_SLOTS].sort(), ['november', 'yankee']);
  for (const s of UNMAPPED_SLOTS) assert.ok(!(s in SLOT_GALAXY_MAP), `${s} must NOT be in map`);
});

test('galaxyForSlot returns the mapping or null (never throws)', () => {
  assert.equal(galaxyForSlot('foxtrot'), 'mill');
  assert.equal(galaxyForSlot('papa'), 'backend-helper');
  assert.equal(galaxyForSlot('november'), null);
  assert.equal(galaxyForSlot('yankee'), null);
  assert.equal(galaxyForSlot('does-not-exist'), null);
  assert.equal(galaxyForSlot(''), null);
});
