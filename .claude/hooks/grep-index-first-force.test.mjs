// tier: T3
// grep-index-first-force.test.mjs
// Tests for FORCE-USE-MAP-MS0 / U-GREP-INDEX-FORCE: decideForceGraphRead() --
// the advisory-to-forced-deny promotion in grep-index-first.mjs. Real
// reference-value asserts (R9): each pins the exact force/no-force decision +
// its quality guard (exact-match, path-exists, clean-identifier, escape).
//
// Run: node --test H:/prism/.claude/hooks/grep-index-first-force.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { decideForceGraphRead, loadFindCacheNodes, getGraphNodeHits } from './grep-index-first.mjs';

const HIT = (name, path) => ({ name, layer: 'L10', built: 'built', path });
const yes = () => true;   // exists stub: path present on disk
const no = () => false;   // exists stub: path absent (stale graph)

test('force: exact identifier match + path exists -> force', () => {
  const r = decideForceGraphRead('TokenAwarenessEngine', [HIT('TokenAwarenessEngine', 'src/engines/TokenAwarenessEngine.ts')], { exists: yes });
  assert.equal(r.force, true);
  assert.deepEqual(r.paths, ['src/engines/TokenAwarenessEngine.ts']);
  assert.equal(r.name, 'TokenAwarenessEngine');
});
test('force: case-insensitive exact match still forces', () => {
  const r = decideForceGraphRead('tokenawarenessengine', [HIT('TokenAwarenessEngine', 'a.ts')], { exists: yes });
  assert.equal(r.force, true);
});
test('GUARD: matched path does NOT exist on disk -> no force (stale graph)', () => {
  const r = decideForceGraphRead('TokenAwarenessEngine', [HIT('TokenAwarenessEngine', 'src/engines/TokenAwarenessEngine.ts')], { exists: no });
  assert.equal(r.force, false);
  assert.deepEqual(r.paths, []);
});
test('GUARD: substring (not exact) match -> no force (never hijack a partial-name grep)', () => {
  const r = decideForceGraphRead('Token', [HIT('TokenAwarenessEngine', 'a.ts')], { exists: yes });
  assert.equal(r.force, false);
});
test('GUARD: regex / metachar / multi-word pattern -> no force (content search, not a name)', () => {
  for (const p of ['function\\s+\\w+', 'foo.*bar', 'a|b', 'x+', '.*', 'Foo Bar']) {
    assert.equal(decideForceGraphRead(p, [HIT('Foo', 'a.ts')], { exists: yes }).force, false, `pattern ${p} must not force`);
  }
});
test('GUARD: too-short identifier (<4 chars) -> no force', () => {
  assert.equal(decideForceGraphRead('abc', [HIT('abc', 'a.ts')], { exists: yes }).force, false);
});
test('no graph hit -> no force (falls through to real Grep)', () => {
  assert.equal(decideForceGraphRead('NoSuchEngine', [], { exists: yes }).force, false);
});
test('hit with null path -> no force', () => {
  assert.equal(decideForceGraphRead('FooEngine', [HIT('FooEngine', null)], { exists: yes }).force, false);
});
test('disabled via enabled=false -> no force (PRISM_GREP_INDEX_FORCE=0 escape)', () => {
  assert.equal(decideForceGraphRead('FooEngine', [HIT('FooEngine', 'a.ts')], { exists: yes, enabled: false }).force, false);
});
test('empty/null/non-string pattern -> no force', () => {
  for (const p of ['', null, undefined, 42, {}]) {
    assert.equal(decideForceGraphRead(p, [HIT('FooEngine', 'a.ts')], { exists: yes }).force, false);
  }
});
test('dedupes multiple hits resolving to the same path', () => {
  const r = decideForceGraphRead('FooEngine', [HIT('FooEngine', 'a.ts'), HIT('fooengine', 'a.ts')], { exists: yes });
  assert.equal(r.force, true);
  assert.deepEqual(r.paths, ['a.ts']);
});

// -- U-GREP-FORCE-ACTIVATE (2026-06-15): the resolver fallback that actually lights the force --
// find-cache hits carry NO path, so the path now comes from the CODE_SYSTEM_INDEX resolver.
const RESOLVE = (name) => (name.toLowerCase() === 'fooengine' ? ['mcp-server/src/engines/FooEngine.ts'] : []);
test('ACTIVATE: null-path graph hit + resolver resolves an existing path -> force (the latency fix)', () => {
  const r = decideForceGraphRead('FooEngine', [HIT('FooEngine', null)], { exists: yes, resolvePaths: RESOLVE });
  assert.equal(r.force, true);
  assert.deepEqual(r.paths, ['mcp-server/src/engines/FooEngine.ts']);
  assert.equal(r.name, 'FooEngine');
});
test('ACTIVATE: resolver works even with ZERO graph hits (code-index match is authoritative)', () => {
  const r = decideForceGraphRead('FooEngine', [], { exists: yes, resolvePaths: RESOLVE });
  assert.equal(r.force, true);
  assert.deepEqual(r.paths, ['mcp-server/src/engines/FooEngine.ts']);
});
test('GUARD: resolver path that does NOT exist on disk -> no force (stale index)', () => {
  const r = decideForceGraphRead('FooEngine', [], { exists: no, resolvePaths: RESOLVE });
  assert.equal(r.force, false);
});
test('GUARD: uncatalogued name (resolver returns []) -> no force', () => {
  const r = decideForceGraphRead('UncataloguedThing', [], { exists: yes, resolvePaths: RESOLVE });
  assert.equal(r.force, false);
});
test('GUARD: a substring still does NOT force even with a resolver (resolver is exact-key only)', () => {
  // "Foo" is a substring; RESOLVE only resolves the exact "fooengine" key -> [] -> no force
  const r = decideForceGraphRead('Foo', [HIT('FooEngine', null)], { exists: yes, resolvePaths: RESOLVE });
  assert.equal(r.force, false);
});
test('ACTIVATE: hit-path AND resolver-path dedupe into one set', () => {
  const sharedResolve = () => ['a.ts'];
  const r = decideForceGraphRead('FooEngine', [HIT('FooEngine', 'a.ts')], { exists: yes, resolvePaths: sharedResolve });
  assert.equal(r.force, true);
  assert.deepEqual(r.paths, ['a.ts']);   // not ['a.ts','a.ts']
});

// ---------------------------------------------------------------------------
// loadFindCacheNodes() + getGraphNodeHits cap-safe fallback (the silent-death fix)
// ---------------------------------------------------------------------------
test('loadFindCacheNodes: reads find-cache.json beside the graph -> nodes[]', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gif-'));
  writeFileSync(join(dir, 'find-cache.json'), JSON.stringify({ nodes: [{ id: 'eng.foo', label: 'FooEngine', layer: 'L10' }] }));
  const r = loadFindCacheNodes(join(dir, 'system-graph.json'));
  assert.equal(r.nodes.length, 1);
  assert.equal(r.nodes[0].label, 'FooEngine');
});
test('loadFindCacheNodes: missing find-cache -> {nodes:[]} (fail-soft, never throws)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gif-'));
  assert.deepEqual(loadFindCacheNodes(join(dir, 'system-graph.json')), { nodes: [] });
});
test('loadFindCacheNodes: corrupt find-cache -> {nodes:[]} (fail-soft)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gif-'));
  writeFileSync(join(dir, 'find-cache.json'), '{ not valid json');
  assert.deepEqual(loadFindCacheNodes(join(dir, 'system-graph.json')), { nodes: [] });
});
test('getGraphNodeHits: small fixture graph (under cap) still reads directly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gif-'));
  const gp = join(dir, 'system-graph.json');
  writeFileSync(gp, JSON.stringify({ nodes: [{ id: 'eng.widget', name: 'WidgetEngine', layer: 'L10', built: true, path: 'src/WidgetEngine.ts' }] }));
  const hits = getGraphNodeHits('WidgetEngine', { graphPath: gp });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'src/WidgetEngine.ts'); // direct-read path preserves the path field
});
