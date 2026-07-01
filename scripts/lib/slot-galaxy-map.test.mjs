// Tests for the single-source slot->galaxy map (GALAXY-KIT-MS0). node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SLOT_GALAXY_MAP, UNMAPPED_SLOTS, galaxyForSlot, slotForGalaxy, GALAXY_SLOT_REVERSE, GALAXY_FALLBACK_SLOT, galaxyAddressabilityReport } from './slot-galaxy-map.mjs';

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

// ─── reverse resolver: galaxy -> addressable slot (HERMES-CONTROL-READINESS blocker #4) ───

test('slotForGalaxy: an explicitly-owned galaxy resolves to its map owner (source:map, explicit)', () => {
  assert.deepEqual(slotForGalaxy('mill'),           { slot: 'foxtrot', source: 'map', explicit: true, addressable: true });
  assert.deepEqual(slotForGalaxy('backend-helper'), { slot: 'papa',    source: 'map', explicit: true, addressable: true });
  assert.deepEqual(slotForGalaxy('frontend-app'),   { slot: 'quebec',  source: 'map', explicit: true, addressable: true });
});

test('slotForGalaxy: a shared galaxy resolves to its CANONICAL owner, never the legacy alias', () => {
  // hermes-zulu is shared by bravo (builder) + zebra (legacy alias) + zulu (runtime). First
  // non-alias slot in map order wins -> bravo. The `zebra` alias must NEVER be returned.
  const r = slotForGalaxy('hermes-zulu');
  assert.equal(r.slot, 'bravo');
  assert.equal(r.explicit, true);
  assert.notEqual(r.slot, 'zebra');
});

test('slotForGalaxy: an UNOWNED galaxy is addressable via the fallback, marked NOT explicit (R12-honest)', () => {
  for (const g of ['quality', 'shop-floor', 'compliance-safety', 'mit-curriculum', 'tribal-knowledge']) {
    const r = slotForGalaxy(g);
    assert.equal(r.addressable, true, `${g} must be addressable (no dead-end)`);
    assert.equal(r.source, 'fallback', `${g} has no explicit owner`);
    assert.equal(r.explicit, false, `${g} fallback must NOT masquerade as a real owner`);
    assert.equal(r.slot, GALAXY_FALLBACK_SLOT, `${g} -> the orchestrator backstop`);
  }
});

test('slotForGalaxy: opts.fallbackSlot overrides the default backstop; env is also honored', () => {
  assert.equal(slotForGalaxy('quality', { fallbackSlot: 'golf' }).slot, 'golf');
  assert.equal(slotForGalaxy('mill', { fallbackSlot: 'golf' }).slot, 'foxtrot'); // explicit owner ignores fallback
});

test('slotForGalaxy: invalid input returns a non-addressable none verdict (never throws)', () => {
  for (const bad of [null, undefined, '', 42, {}]) {
    const r = slotForGalaxy(bad);
    assert.equal(r.slot, null);
    assert.equal(r.addressable, false);
    assert.equal(r.source, 'none');
  }
});

test('GALAXY_SLOT_REVERSE round-trips every forward-map galaxy to a slot that maps back to it', () => {
  for (const [galaxy, slot] of Object.entries(GALAXY_SLOT_REVERSE)) {
    assert.equal(SLOT_GALAXY_MAP[slot], galaxy, `${galaxy} -> ${slot} must map back to ${galaxy}`);
  }
  // the reverse index covers exactly the DISTINCT galaxies in the forward map
  const distinctForward = new Set(Object.values(SLOT_GALAXY_MAP));
  assert.equal(Object.keys(GALAXY_SLOT_REVERSE).length, distinctForward.size);
});

test('BLOCKER #4 CLOSED: every real galaxy (engines/<g>/CLAUDE.md) is addressable', () => {
  // The REACH-dim proof: enumerate the REAL galaxy population (engine dirs with a CLAUDE.md)
  // and assert galaxyAddressabilityReport leaves NONE unaddressable. Pre-resolver, ~11 of these
  // had zero owner-slot and were routing dead-ends; the fallback now makes all of them reachable.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const enginesRoot = path.resolve(here, '../../mcp-server/src/engines');
  const galaxies = fs.readdirSync(enginesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') // skip engines/.claude (rules dir, not a galaxy)
      && fs.existsSync(path.join(enginesRoot, d.name, 'CLAUDE.md')))
    .map((d) => d.name);
  assert.ok(galaxies.length >= 30, `expected the full galaxy set (>=30), got ${galaxies.length}`);
  const report = galaxyAddressabilityReport(galaxies);
  assert.equal(report.unaddressable, 0, 'NO galaxy may be a routing dead-end');
  assert.equal(report.allAddressable, true);
  assert.ok(report.explicit >= 20, `most galaxies still resolve to a real owner (got ${report.explicit})`);
  assert.ok(report.fallback >= 1, `the previously-unowned galaxies now resolve via fallback (got ${report.fallback})`);
});
