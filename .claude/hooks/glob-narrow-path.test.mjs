// tier: T3
// glob-narrow-path.test.mjs
// Tests for PSN-SYNERGIZE/U-GLOB-TELEMETRY additions to glob-narrow-path.mjs:
//   - recordTelemetry()  — atomic-RMW telemetry sink into ollama-offload-stats.json
//   - module-vs-CLI gate — import-without-stdin-crash invariant
//
// Run: node --test H:/prism/.claude/hooks/glob-narrow-path.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { recordTelemetry } from './glob-narrow-path.mjs';

function mkTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), `glob-narrow-${prefix}-`));
}

// ---------------------------------------------------------------------------
// Module-import sanity (the very fact that the import above succeeded proves
// the module-vs-CLI gate works — without it, the top-level
// JSON.parse(readFileSync(0)) would have thrown on empty stdin and aborted
// the test file load. This explicit assertion makes the invariant visible.)
// ---------------------------------------------------------------------------

test('module import does NOT crash on empty stdin (CLI-gate works)', () => {
  // If we got here, recordTelemetry is defined and the module loaded clean.
  assert.equal(typeof recordTelemetry, 'function');
});

// ---------------------------------------------------------------------------
// recordTelemetry — happy path
// ---------------------------------------------------------------------------

test('recordTelemetry creates new stats file on first fire', () => {
  const dir = mkTempDir('new');
  const statsPath = join(dir, 'sub', 'stats.json');

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, true);
  assert.ok(existsSync(statsPath));
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
  assert.equal(stats.byHook['glob-narrow-path'].suggested, 1);
});

test('recordTelemetry increments fired but NOT suggested when suggested=false', () => {
  const dir = mkTempDir('inc-nosug');
  const statsPath = join(dir, 'stats.json');

  recordTelemetry({ suggested: false, statsPath });
  recordTelemetry({ suggested: false, statsPath });
  recordTelemetry({ suggested: true, statsPath });

  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['glob-narrow-path'].fired, 3);
  assert.equal(stats.byHook['glob-narrow-path'].suggested, 1);
});

// ---------------------------------------------------------------------------
// recordTelemetry — peer-slot preservation (the U-CAMX11 anti-clobber case)
// ---------------------------------------------------------------------------

test('recordTelemetry preserves OTHER byHook entries unchanged', () => {
  const dir = mkTempDir('peer');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({
      schemaVersion: '2.0.0',
      byHook: {
        'ollama-route-pretooluse': { fired: 177, kept: 176, suggested: 1 },
        'grep-index-first': { fired: 42, suggested: 8 },
      },
    }),
  );

  recordTelemetry({ suggested: true, statsPath });

  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  // New slot appears
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
  assert.equal(stats.byHook['glob-narrow-path'].suggested, 1);
  // PEER slots untouched — proves read-modify-write semantics
  assert.equal(stats.byHook['ollama-route-pretooluse'].fired, 177);
  assert.equal(stats.byHook['ollama-route-pretooluse'].kept, 176);
  assert.equal(stats.byHook['grep-index-first'].fired, 42);
  assert.equal(stats.byHook['grep-index-first'].suggested, 8);
});

// ---------------------------------------------------------------------------
// recordTelemetry — failure modes (≥3 required)
// ---------------------------------------------------------------------------

test('recordTelemetry fail-soft on corrupt existing stats JSON', () => {
  const dir = mkTempDir('corrupt');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(statsPath, '{not valid json');

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, false);
  assert.ok(res.error && typeof res.error === 'string');
});

test('recordTelemetry handles missing byHook field in existing stats', () => {
  const dir = mkTempDir('nobh');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(statsPath, JSON.stringify({ schemaVersion: '1.0.0', offloaded: 5 }));

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, true);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
  // Top-level fields preserved (anti-clobber)
  assert.equal(stats.offloaded, 5);
});

test('recordTelemetry handles non-object byHook field (defensive)', () => {
  // Adversarial: previous writer left byHook as a string or array. Hook
  // must reset it without throwing.
  const dir = mkTempDir('badbh');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({ schemaVersion: '2.0.0', byHook: 'not-an-object' }),
  );

  const res = recordTelemetry({ suggested: true, statsPath });

  assert.equal(res.ok, true);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(typeof stats.byHook, 'object');
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
});

// ---------------------------------------------------------------------------
// recordTelemetry — adversarial inputs (≥2 required)
// ---------------------------------------------------------------------------

test('recordTelemetry handles undefined opts (defaults are valid)', () => {
  // Caller forgets to pass an object — must not throw. The hook's main()
  // calls recordTelemetry() with no args during certain paths.
  // We pass {statsPath} to redirect from the default project path, but
  // still let suggested be undefined.
  const dir = mkTempDir('undef');
  const statsPath = join(dir, 'stats.json');

  const res = recordTelemetry({ statsPath });
  assert.equal(res.ok, true);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
  // suggested undefined -> not incremented
  assert.equal(stats.byHook['glob-narrow-path'].suggested, 0);
});

test('recordTelemetry handles malformed existing slot (re-initializes)', () => {
  // Existing byHook[glob-narrow-path] is malformed (e.g., a string or
  // partially-corrupt object missing the counter fields). The hook
  // re-initializes with safe defaults rather than NaN-propagating.
  const dir = mkTempDir('badslot');
  const statsPath = join(dir, 'stats.json');
  writeFileSync(
    statsPath,
    JSON.stringify({
      schemaVersion: '2.0.0',
      byHook: { 'glob-narrow-path': { /* missing fired/suggested */ } },
    }),
  );

  const res = recordTelemetry({ suggested: true, statsPath });
  assert.equal(res.ok, true);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  // Missing fields default to 0, then increment to 1
  assert.equal(stats.byHook['glob-narrow-path'].fired, 1);
  assert.equal(stats.byHook['glob-narrow-path'].suggested, 1);
});
