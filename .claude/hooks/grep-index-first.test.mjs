// tier: T3
// grep-index-first.test.mjs
// Tests for PSN-SYNERGIZE/U-GREP-GRAPH-WIRE additions to grep-index-first.mjs:
//   - getGraphNodeHits()   — system-graph.json node-name lookup
//   - recordTelemetry()    — atomic-RMW telemetry sink into ollama-offload-stats.json
//
// Hook tests live next to the hook (matches ollama-route-pretooluse.test.mjs
// pattern; engine tests go in src/__tests__/, hooks do not).
//
// Run: node --test H:/prism/.claude/hooks/grep-index-first.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { getGraphNodeHits, recordTelemetry } from './grep-index-first.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), `grep-index-first-${prefix}-`));
}

function writeGraph(dir, nodes) {
  const path = join(dir, 'graph.json');
  writeFileSync(path, JSON.stringify({ schemaVersion: '2.0.0', nodes }));
  return path;
}

// Canonical reference graph used across happy-path tests. Three nodes from
// three different layers — exercises layer/built/path passthrough.
const REF_NODES = [
  {
    id: 'engine.OutcomeCaptureBusEngine',
    name: 'OutcomeCaptureBusEngine',
    layer: 'L10',
    built: true,
    path: 'mcp-server/src/engines/OutcomeCaptureBusEngine.ts',
  },
  {
    id: 'dispatcher.sessionDispatcher',
    name: 'sessionDispatcher',
    layer: 'L8',
    built: true,
    path: 'mcp-server/src/tools/dispatchers/sessionDispatcher.ts',
  },
  {
    id: 'hook.grep-index-first',
    name: 'grep-index-first',
    layer: 'L10',
    built: true,
    path: '.claude/hooks/grep-index-first.mjs',
  },
  {
    // ghost / unbuilt node — exercises the built===false path
    id: 'ghost.future-engine',
    name: 'FutureEngineThatDoesNotExist',
    layer: 'L8',
    built: false,
    path: null,
  },
];

// ---------------------------------------------------------------------------
// getGraphNodeHits — happy path
// ---------------------------------------------------------------------------

test('getGraphNodeHits returns exact name match with layer+built+path', () => {
  const dir = mkTempDir('hits-1');
  const graphPath = writeGraph(dir, REF_NODES);

  const hits = getGraphNodeHits('OutcomeCaptureBusEngine', { graphPath });

  assert.equal(hits.length, 1, 'exactly one hit for unique name');
  assert.equal(hits[0].name, 'OutcomeCaptureBusEngine');
  assert.equal(hits[0].layer, 'L10');
  assert.equal(hits[0].built, 'built');
  assert.equal(hits[0].path, 'mcp-server/src/engines/OutcomeCaptureBusEngine.ts');
});

test('getGraphNodeHits surfaces ghost nodes with built="ghost"', () => {
  const dir = mkTempDir('hits-ghost');
  const graphPath = writeGraph(dir, REF_NODES);

  const hits = getGraphNodeHits('FutureEngineThatDoesNotExist', { graphPath });

  assert.equal(hits.length, 1);
  assert.equal(hits[0].built, 'ghost');
  assert.equal(hits[0].path, null);
});

test('getGraphNodeHits respects maxHits opt (boundary)', () => {
  const dir = mkTempDir('hits-max');
  const graphPath = writeGraph(dir, [
    { id: 'a', name: 'EngineFoo' },
    { id: 'b', name: 'EngineBar' },
    { id: 'c', name: 'EngineBaz' },
    { id: 'd', name: 'EngineQux' },
  ]);

  const hits = getGraphNodeHits('Engine', { graphPath, maxHits: 2 });
  assert.equal(hits.length, 2, 'maxHits=2 caps the result');
});

test('getGraphNodeHits multi-token AND match', () => {
  const dir = mkTempDir('hits-multi');
  const graphPath = writeGraph(dir, REF_NODES);

  // Both tokens must match — "Outcome Bus" should match OutcomeCaptureBus
  // but not sessionDispatcher.
  const hits = getGraphNodeHits('outcome bus', { graphPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'OutcomeCaptureBusEngine');
});

// ---------------------------------------------------------------------------
// getGraphNodeHits — failure modes (≥3 required by comprehensive-build-enforce)
// ---------------------------------------------------------------------------

test('getGraphNodeHits rejects patterns shorter than 4 chars', () => {
  const dir = mkTempDir('hits-short');
  const graphPath = writeGraph(dir, REF_NODES);

  assert.deepEqual(getGraphNodeHits('Eng', { graphPath }), []);
  assert.deepEqual(getGraphNodeHits('a', { graphPath }), []);
  assert.deepEqual(getGraphNodeHits('', { graphPath }), []);
});

test('getGraphNodeHits returns [] when graph file missing (fail-soft)', () => {
  const hits = getGraphNodeHits('OutcomeCaptureBusEngine', {
    graphPath: '/nonexistent/path/graph.json',
  });
  assert.deepEqual(hits, []);
});

test('getGraphNodeHits returns [] when graph JSON is corrupt (fail-soft)', () => {
  const dir = mkTempDir('hits-corrupt');
  const graphPath = join(dir, 'graph.json');
  writeFileSync(graphPath, '{not valid json');

  const hits = getGraphNodeHits('OutcomeCaptureBusEngine', { graphPath });
  assert.deepEqual(hits, []);
});

test('getGraphNodeHits returns [] when graph has no nodes array', () => {
  const dir = mkTempDir('hits-nonodes');
  const graphPath = join(dir, 'graph.json');
  writeFileSync(graphPath, JSON.stringify({ schemaVersion: '2.0.0' /* no nodes */ }));

  assert.deepEqual(
    getGraphNodeHits('OutcomeCaptureBusEngine', { graphPath }),
    [],
  );
});

// ---------------------------------------------------------------------------
// getGraphNodeHits — adversarial inputs (≥2 required)
// ---------------------------------------------------------------------------

test('getGraphNodeHits strips regex metachars before matching', () => {
  const dir = mkTempDir('hits-regex');
  const graphPath = writeGraph(dir, REF_NODES);

  // 'class\\s+\\w*Engine' should tokenize to ['class', 'Engine'] — neither
  // appears as a literal in the graph node names (no 'class' substring),
  // so we expect zero hits. The point is the function does NOT throw on
  // regex metacharacters.
  const hits = getGraphNodeHits('class\\s+\\w*Engine', { graphPath });
  assert.ok(Array.isArray(hits), 'returns array (not crash) on regex meta');
});

test('getGraphNodeHits tolerates malformed nodes inside the graph', () => {
  const dir = mkTempDir('hits-malformed');
  const graphPath = writeGraph(dir, [
    null,
    undefined,
    { id: null, name: null },
    { /* totally empty */ },
    { id: 'good', name: 'GoodEngine' },
  ]);

  const hits = getGraphNodeHits('GoodEngine', { graphPath });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'GoodEngine');
});

test('getGraphNodeHits handles NaN/Infinity-shaped node payloads', () => {
  const dir = mkTempDir('hits-nan');
  const graphPath = join(dir, 'graph.json');
  // Node where built is NaN-like (string 'NaN'), layer is Infinity-like
  writeFileSync(
    graphPath,
    JSON.stringify({
      nodes: [{ id: 'x', name: 'XEngine', built: 'NaN', layer: 'Infinity' }],
    }),
  );

  const hits = getGraphNodeHits('XEngine', { graphPath });
  assert.equal(hits.length, 1);
  // built coerces to '?' when not exactly true/false (the production code's
  // contract: only literal boolean true→'built', false→'ghost', else '?')
  assert.equal(hits[0].built, '?');
});

// ---------------------------------------------------------------------------
// recordTelemetry — happy path + boundary + adversarial
// ---------------------------------------------------------------------------

test('recordTelemetry creates new stats file on first fire', () => {
  const dir = mkTempDir('tel-new');
  const statsPath = join(dir, 'sub', 'stats.json');

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, true);
  assert.ok(existsSync(statsPath), 'stats file created');
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['grep-index-first'].fired, 1);
  assert.equal(stats.byHook['grep-index-first'].suggested, 1);
});

test('recordTelemetry increments existing fired/suggested counters', () => {
  const dir = mkTempDir('tel-inc');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({
      schemaVersion: '2.0.0',
      byHook: { 'grep-index-first': { fired: 5, suggested: 2 } },
    }),
  );

  recordTelemetry({ suggested: false, statsPath });
  recordTelemetry({ suggested: true, statsPath });

  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['grep-index-first'].fired, 7);
  assert.equal(stats.byHook['grep-index-first'].suggested, 3);
});

test('recordTelemetry preserves OTHER hooks unchanged (no clobber)', () => {
  const dir = mkTempDir('tel-other');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({
      schemaVersion: '2.0.0',
      byHook: {
        'ollama-route-pretooluse': { fired: 177, offloaded: 0, kept: 176, suggested: 1 },
        'ollama-task-offloader': { fired: 303, offloaded: 15 },
      },
    }),
  );

  recordTelemetry({ suggested: true, statsPath });

  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  // grep-index-first appears as new slot
  assert.equal(stats.byHook['grep-index-first'].fired, 1);
  // PEER slots untouched — proves the atomic-RMW is read-modify-write, not
  // a full overwrite. This is the failure mode that bit U-CAMX11.
  assert.equal(stats.byHook['ollama-route-pretooluse'].fired, 177);
  assert.equal(stats.byHook['ollama-task-offloader'].fired, 303);
});

test('recordTelemetry fail-soft on corrupt existing stats JSON', () => {
  const dir = mkTempDir('tel-corrupt');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(statsPath, '{not valid');

  const res = recordTelemetry({ suggested: true, statsPath });

  // Implementation contract: on JSON.parse failure, return {ok:false} with
  // the error message — do NOT throw (the hook must never crash the host
  // Grep call). The corrupt file is left in place; an operator decides
  // whether to nuke + restart or recover from a peer write.
  assert.equal(res.ok, false);
  assert.ok(res.error && typeof res.error === 'string');
});

test('recordTelemetry handles missing byHook field in existing stats', () => {
  // Adversarial: existing stats file has a stale schema without `byHook`.
  // Hook must create the field rather than throwing.
  const dir = mkTempDir('tel-nobh');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({ schemaVersion: '1.0.0', offloaded: 17 }),
  );

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, true);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['grep-index-first'].fired, 1);
  // Pre-existing top-level fields preserved
  assert.equal(stats.offloaded, 17);
});

// === U-GREP-INDEX-DECAY-WIRE (2026-06-10): advisory-decay gate ===
// The advisory must MUTE once proven noise (>=50 injections at <5% conversion) and
// FIRE when telemetry is insufficient (fail-safe). Subprocess test -- the gate is
// impure (reads offload-stats). TEMP/TMP point os.tmpdir at an isolated dir so the
// 60s rate-limiter + pending markers do not bleed across runs; PRISM_GREP_INDEX_STATS_PATH
// points bump+decay at the fixture (read==write); cwd=tmp so getGraphNodeHits has no
// graph and the index files do not exist -- only the expensivePattern suggestion fires,
// keeping the test independent of the live tree. Clone of the large-read-digest decay test.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GREP_HOOK = fileURLToPath(new URL('./grep-index-first.mjs', import.meta.url));

function runGrepHook(pattern, seedSlot) {
  const dir = mkdtempSync(join(tmpdir(), 'grep-decay-'));
  try {
    const stats = join(dir, 'stats.json');
    writeFileSync(stats, JSON.stringify({ schemaVersion: '2.0.0', byHook: { 'grep-index-first': seedSlot } }, null, 2));
    const out = execFileSync(process.execPath, [GREP_HOOK], {
      input: JSON.stringify({ tool_name: 'Grep', tool_input: { pattern, path: '.' }, session_id: 'decay-test' }),
      cwd: dir,
      env: { ...process.env, PRISM_GREP_INDEX_STATS_PATH: stats, TEMP: dir, TMP: dir, PRISM_ADVISORY_DECAY_DISABLE: '' },
      encoding: 'utf8',
    });
    return JSON.parse(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the grep advisory', () => {
  // seed 52 -> recordTelemetry bumps suggested -> 53; 53 % 20 != 0 -> muted.
  const res = runGrepHook('class FooBarEngine', { fired: 52, suggested: 52, offloaded: 0 });
  assert.equal(res.continue, true);
  assert.ok(
    !res.hookSpecificOutput || !res.hookSpecificOutput.additionalContext,
    'a proven-noise grep advisory must be muted (no additionalContext injected)',
  );
});

test('decay-gate: INSUFFICIENT telemetry (<50 injections) still FIRES (fail-safe)', () => {
  const res = runGrepHook('class FooBarEngine', { fired: 5, suggested: 5, offloaded: 0 });
  assert.equal(res.continue, true);
  assert.ok(
    res.hookSpecificOutput && res.hookSpecificOutput.additionalContext &&
      res.hookSpecificOutput.additionalContext.includes('Index-first'),
    'with insufficient telemetry the grep advisory must still fire',
  );
});