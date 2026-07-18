// tier: T3
// grep-index-taken-correlator.test.mjs
// Tests for U-GREP-TAKEN-SIGNAL: the taken-signal that gives grep-index-first a
// real numeric `offloaded` counter so advisory-decay classify() stops marking it
// 'unmeasurable'.
//
// Covers:
//   - recordTelemetry({offloaded:true}) bumps byHook['grep-index-first'].offloaded
//     and creates the key (exact integer assertions, real temp stats file).
//   - extractSuggestionPaths + writePending/readPending capture the right paths.
//   - correlateRead on a matching Read bumps offloaded by exactly 1 + removes the
//     matched path; non-matching bumps nothing; expired (>TTL) bumps nothing.
//   - pathMatches robust to absolute-vs-repo-relative + slash direction.
//
// Run: node --test H:/prism/.claude/hooks/grep-index-taken-correlator.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  recordTelemetry,
  extractSuggestionPaths,
  surfacedIndexFiles,
  readPending,
  writePending,
  writePendingMap,
  PENDING_TTL_MS,
} from './grep-index-first.mjs';
import { pathMatches, correlateRead } from './grep-index-taken-correlator.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), `grep-taken-${prefix}-`));
}

function readStats(statsPath) {
  return JSON.parse(readFileSync(statsPath, 'utf8'));
}

// A realistic suggestion set: two graph-hit nodes (with paths) + one named
// index file. extractSuggestionPaths must yield exactly these three paths.
const GRAPH_HITS = [
  { name: 'OutcomeCaptureBusEngine', layer: 'L10', built: 'built', path: 'mcp-server/src/engines/OutcomeCaptureBusEngine.ts' },
  { name: 'sessionDispatcher', layer: 'L8', built: 'built', path: 'mcp-server/src/tools/dispatchers/sessionDispatcher.ts' },
  { name: 'FutureGhost', layer: 'L8', built: 'ghost', path: null }, // ghost: no path -> excluded
];
const INDEX_FILES = [
  { path: 'mcp-server/data/docs/ENGINE_DIGEST.md', covers: ['Engine'] },
];

// ---------------------------------------------------------------------------
// recordTelemetry({offloaded:true})
// ---------------------------------------------------------------------------

test('recordTelemetry({offloaded:true}) creates offloaded key on a fresh file', () => {
  const dir = mkTempDir('off-new');
  const statsPath = join(dir, 'stats.json');

  const res = recordTelemetry({ offloaded: true, statsPath });

  assert.equal(res.ok, true);
  const stats = readStats(statsPath);
  const slot = stats.byHook['grep-index-first'];
  // offloaded-only call: offloaded bumped to 1, fired/suggested untouched (0).
  assert.equal(slot.offloaded, 1, 'offloaded created and bumped to exactly 1');
  assert.equal(slot.fired, 0, 'offloaded-only call does NOT bump fired');
  assert.equal(slot.suggested, 0, 'offloaded-only call does NOT bump suggested');
  // typeof number is what flips advisory-decay classify() off 'unmeasurable'.
  assert.equal(typeof slot.offloaded, 'number');
});

test('recordTelemetry({suggested:true}) initializes offloaded:0 (measurable key exists)', () => {
  const dir = mkTempDir('off-init');
  const statsPath = join(dir, 'stats.json');

  recordTelemetry({ suggested: true, statsPath });

  const slot = readStats(statsPath).byHook['grep-index-first'];
  assert.equal(slot.fired, 1);
  assert.equal(slot.suggested, 1);
  // The offloaded:0 init is the whole point: classify() needs typeof number.
  assert.equal(slot.offloaded, 0);
  assert.equal(typeof slot.offloaded, 'number');
});

test('recordTelemetry({offloaded:true}) bumps an existing numeric offloaded by exactly 1', () => {
  const dir = mkTempDir('off-inc');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(statsPath, JSON.stringify({
    schemaVersion: '2.0.0',
    byHook: { 'grep-index-first': { fired: 40, suggested: 12, offloaded: 3 } },
  }));

  recordTelemetry({ offloaded: true, statsPath });

  const slot = readStats(statsPath).byHook['grep-index-first'];
  assert.equal(slot.offloaded, 4, '3 -> 4');
  assert.equal(slot.fired, 40, 'fired untouched by offloaded call');
  assert.equal(slot.suggested, 12, 'suggested untouched by offloaded call');
});

test('recordTelemetry({offloaded:true}) preserves peer hooks (no clobber)', () => {
  const dir = mkTempDir('off-peer');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(statsPath, JSON.stringify({
    schemaVersion: '2.0.0',
    byHook: {
      'ollama-route-pretooluse': { fired: 177, offloaded: 2, suggested: 13 },
      'grep-index-first': { fired: 10, suggested: 5, offloaded: 0 },
    },
  }));

  recordTelemetry({ offloaded: true, statsPath });

  const stats = readStats(statsPath);
  assert.equal(stats.byHook['grep-index-first'].offloaded, 1);
  assert.equal(stats.byHook['ollama-route-pretooluse'].fired, 177, 'peer untouched');
  assert.equal(stats.byHook['ollama-route-pretooluse'].offloaded, 2, 'peer untouched');
});

// ---------------------------------------------------------------------------
// extractSuggestionPaths + pending marker write
// ---------------------------------------------------------------------------

test('extractSuggestionPaths captures graph-hit paths + index-file paths (ghost no-path excluded)', () => {
  const paths = extractSuggestionPaths(GRAPH_HITS, INDEX_FILES);
  assert.deepEqual(paths, [
    'mcp-server/src/engines/OutcomeCaptureBusEngine.ts',
    'mcp-server/src/tools/dispatchers/sessionDispatcher.ts',
    'mcp-server/data/docs/ENGINE_DIGEST.md',
  ]);
  // The ghost node (path:null) must NOT appear.
  assert.ok(!paths.some((p) => p == null));
});

test('extractSuggestionPaths de-dupes repeated paths', () => {
  const dup = extractSuggestionPaths(
    [{ path: 'a/b.ts' }, { path: 'a/b.ts' }],
    [{ path: 'a/b.ts' }],
  );
  assert.deepEqual(dup, ['a/b.ts']);
});

test('writePending captures the target paths from a sample suggestion set', () => {
  const dir = mkTempDir('pend-write');
  const pendingPath = join(dir, 'pending.json');
  const sid = 'sess-ABC';
  const now = 1_700_000_000_000;

  const paths = extractSuggestionPaths(GRAPH_HITS, INDEX_FILES);
  const res = writePending(sid, paths, { pendingPath, now });

  assert.equal(res.ok, true);
  const map = readPending({ pendingPath });
  assert.equal(map[sid].ts, now);
  assert.deepEqual(map[sid].paths, paths);
});

test('writePending prunes entries older than TTL', () => {
  const dir = mkTempDir('pend-prune');
  const pendingPath = join(dir, 'pending.json');
  const now = 1_700_000_000_000;
  // Seed a stale entry (older than TTL) directly.
  writePendingMap({
    'old-sess': { ts: now - PENDING_TTL_MS - 1, paths: ['stale/x.ts'] },
  }, { pendingPath });

  writePending('new-sess', ['fresh/y.ts'], { pendingPath, now });

  const map = readPending({ pendingPath });
  assert.equal(map['old-sess'], undefined, 'stale session pruned');
  assert.deepEqual(map['new-sess'].paths, ['fresh/y.ts']);
});

// ---------------------------------------------------------------------------
// correlateRead -- matching / non-matching / expired
// ---------------------------------------------------------------------------

test('correlateRead on a matching Read bumps offloaded by exactly 1 and removes that path', () => {
  const dir = mkTempDir('corr-match');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  const sid = 'sess-MATCH';
  const now = 1_700_000_000_000;

  // Seed pending with two paths.
  writePending(sid, [
    'mcp-server/data/docs/ENGINE_DIGEST.md',
    'mcp-server/src/engines/OutcomeCaptureBusEngine.ts',
  ], { pendingPath, now });

  // Read the first target (repo-relative, exact).
  const res = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', sid, {
    statsPath, pendingPath, now,
  });

  assert.equal(res.matched, true);
  assert.equal(res.matchedPath, 'mcp-server/data/docs/ENGINE_DIGEST.md');
  // offloaded bumped by exactly 1.
  assert.equal(readStats(statsPath).byHook['grep-index-first'].offloaded, 1);
  // Matched path removed; the other remains (one suggestion converts once).
  const map = readPending({ pendingPath });
  assert.deepEqual(map[sid].paths, ['mcp-server/src/engines/OutcomeCaptureBusEngine.ts']);
});

test('correlateRead converts at most once -- a 2nd Read of the same path bumps nothing', () => {
  const dir = mkTempDir('corr-once');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  const sid = 'sess-ONCE';
  const now = 1_700_000_000_000;

  writePending(sid, ['mcp-server/data/docs/ENGINE_DIGEST.md'], { pendingPath, now });

  const first = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', sid, { statsPath, pendingPath, now });
  assert.equal(first.matched, true);
  assert.equal(readStats(statsPath).byHook['grep-index-first'].offloaded, 1);

  // Session entry now has empty paths (dropped) -> 2nd read does not bump.
  const second = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', sid, { statsPath, pendingPath, now });
  assert.equal(second.matched, false);
  assert.equal(readStats(statsPath).byHook['grep-index-first'].offloaded, 1, 'still 1, not 2');
});

test('correlateRead on a NON-matching Read bumps nothing', () => {
  const dir = mkTempDir('corr-nomatch');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  const sid = 'sess-NOMATCH';
  const now = 1_700_000_000_000;

  writePending(sid, ['mcp-server/data/docs/ENGINE_DIGEST.md'], { pendingPath, now });

  const res = correlateRead('some/unrelated/file.ts', sid, { statsPath, pendingPath, now });

  assert.equal(res.matched, false);
  assert.equal(res.reason, 'no-path-match');
  // No stats file created at all (no bump occurred).
  assert.equal(existsSync(statsPath), false, 'no offloaded bump -> no stats write');
  // Pending entry intact.
  assert.deepEqual(readPending({ pendingPath })[sid].paths, ['mcp-server/data/docs/ENGINE_DIGEST.md']);
});

test('correlateRead on an EXPIRED pending entry (>TTL) bumps nothing', () => {
  const dir = mkTempDir('corr-expired');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  const sid = 'sess-EXPIRED';
  const seededTs = 1_700_000_000_000;

  writePending(sid, ['mcp-server/data/docs/ENGINE_DIGEST.md'], { pendingPath, now: seededTs });

  // Read happens after TTL has elapsed.
  const readNow = seededTs + PENDING_TTL_MS + 1;
  const res = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', sid, {
    statsPath, pendingPath, now: readNow,
  });

  assert.equal(res.matched, false);
  assert.equal(res.reason, 'expired');
  assert.equal(existsSync(statsPath), false, 'expired -> no offloaded bump');
});

test('correlateRead with no pending entry for the session bumps nothing', () => {
  const dir = mkTempDir('corr-none');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  // No writePending at all -> empty marker file does not exist.
  const res = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', 'ghost-sess', {
    statsPath, pendingPath, now: 1_700_000_000_000,
  });
  assert.equal(res.matched, false);
  assert.equal(res.reason, 'no-pending-for-session');
});

// ---------------------------------------------------------------------------
// pathMatches -- robust to absolute-vs-relative + slash direction
// ---------------------------------------------------------------------------

test('pathMatches: absolute Windows backslash path matches repo-relative forward-slash target', () => {
  // Known pair: the Read tool delivers an absolute backslash path; the pending
  // marker stored a repo-relative forward-slash path. These MUST match.
  assert.equal(
    pathMatches(
      'H:\\prism\\mcp-server\\data\\docs\\ENGINE_DIGEST.md',
      'mcp-server/data/docs/ENGINE_DIGEST.md',
    ),
    true,
  );
});

test('pathMatches: absolute forward-slash path matches repo-relative target (segment boundary)', () => {
  assert.equal(
    pathMatches(
      'H:/prism/mcp-server/src/engines/OutcomeCaptureBusEngine.ts',
      'mcp-server/src/engines/OutcomeCaptureBusEngine.ts',
    ),
    true,
  );
});

test('pathMatches: basename fallback matches divergent prefixes / drive letters', () => {
  assert.equal(
    pathMatches('C:/some-worktree/x/y/ENGINE_DIGEST.md', 'mcp-server/data/docs/ENGINE_DIGEST.md'),
    true,
    'basenames equal -> match even when dir prefixes diverge',
  );
});

test('pathMatches: does NOT match on a non-segment-boundary suffix', () => {
  // "obar.ts" must NOT be matched by target "bar.ts" via endsWith -- guarded by
  // the segment-boundary check AND basename inequality (obar.ts != bar.ts).
  assert.equal(pathMatches('a/b/obar.ts', 'bar.ts'), false);
});

test('pathMatches: case-insensitive + collapses repeated slashes', () => {
  assert.equal(
    pathMatches('H:/PRISM//mcp-server/data/docs/Engine_Digest.MD', 'mcp-server/data/docs/engine_digest.md'),
    true,
  );
});

test('pathMatches: empty / null inputs return false (no crash)', () => {
  assert.equal(pathMatches('', 'a.ts'), false);
  assert.equal(pathMatches('a.ts', ''), false);
  assert.equal(pathMatches(null, undefined), false);
});

// ---------------------------------------------------------------------------
// correlateRead -- robustness: matches absolute Read against repo-relative pending
// ---------------------------------------------------------------------------

test('correlateRead matches an absolute backslash Read against a repo-relative pending path', () => {
  const dir = mkTempDir('corr-abs');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  const sid = 'sess-ABS';
  const now = 1_700_000_000_000;

  writePending(sid, ['mcp-server/data/docs/ENGINE_DIGEST.md'], { pendingPath, now });

  const res = correlateRead('H:\\prism\\mcp-server\\data\\docs\\ENGINE_DIGEST.md', sid, {
    statsPath, pendingPath, now,
  });

  assert.equal(res.matched, true);
  assert.equal(readStats(statsPath).byHook['grep-index-first'].offloaded, 1);
});

// ---------------------------------------------------------------------------
// correlateRead -- fail-safe: corrupt pending marker never throws
// ---------------------------------------------------------------------------

test('correlateRead is fail-safe on a corrupt pending marker (returns matched:false, no throw)', () => {
  const dir = mkTempDir('corr-corrupt');
  const pendingPath = join(dir, 'pending.json');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(pendingPath, '{not valid json');

  const res = correlateRead('mcp-server/data/docs/ENGINE_DIGEST.md', 'sess-X', {
    statsPath, pendingPath, now: 1_700_000_000_000,
  });
  // readPending fail-soft returns {} -> no entry -> matched:false (not a throw).
  assert.equal(res.matched, false);
});
