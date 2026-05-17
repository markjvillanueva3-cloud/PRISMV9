/**
 * Tests for probe-cache-daemon.mjs (REAPER-PERMFIX-MS1/U-C3).
 *
 * Run: node --test scripts/probe-cache-daemon.test.mjs
 *
 * Intent: the three exported pure-ish functions (probeGpu, probeOllamaDocker,
 * readProbeCache) must each degrade gracefully — a dead daemon, a missing
 * nvidia-smi, a non-JSON probe, or a stale cache must NEVER throw and must
 * NEVER hand a sweep bad data. The whole point of U-C3 is that readers can
 * trust `null` to mean "fall back to a direct probe".
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { probeGpu, probeOllamaDocker, readProbeCache } from "./probe-cache-daemon.mjs";

// ─── probeGpu ────────────────────────────────────────────────────────────────

test("probeGpu — valid nvidia-smi CSV row parses every field", () => {
  const runner = () => "NVIDIA GeForce RTX 4080 SUPER, 16376, 994, 15052, 27";
  const r = probeGpu({ runner });
  assert.equal(r.available, true);
  assert.equal(r.name, "NVIDIA GeForce RTX 4080 SUPER");
  assert.equal(r.memTotalMb, 16376);
  assert.equal(r.memUsedMb, 994);
  assert.equal(r.memFreeMb, 15052);
  assert.equal(r.utilizationPct, 27);
});

test("probeGpu — runner returns null (no GPU/driver) → available:false, no throw", () => {
  const r = probeGpu({ runner: () => null });
  assert.equal(r.available, false);
  assert.match(r.reason, /unavailable/);
});

test("probeGpu — runner throws (nvidia-smi crash) → available:false, no throw", () => {
  const r = probeGpu({ runner: () => { throw new Error("ENOENT"); } });
  assert.equal(r.available, false);
  assert.match(r.reason, /threw/);
});

test("probeGpu — malformed CSV (too few columns) → available:false unparseable", () => {
  const r = probeGpu({ runner: () => "only, three, columns" });
  assert.equal(r.available, false);
  assert.match(r.reason, /unparseable/);
});

test("probeGpu — empty string from runner → available:false", () => {
  const r = probeGpu({ runner: () => "" });
  assert.equal(r.available, false);
});

test("probeGpu — CSV with stray units still numeric-parses (nounits guard)", () => {
  // nvidia-smi sometimes emits trailing units even with --format=nounits on
  // older drivers. The num() helper strips non-digits.
  const runner = () => "Tesla T4, 15360 MiB, 1024 MiB, 14336 MiB, 5 %";
  const r = probeGpu({ runner });
  assert.equal(r.available, true);
  assert.equal(r.memFreeMb, 14336);
  assert.equal(r.utilizationPct, 5);
});

// ─── probeOllamaDocker ───────────────────────────────────────────────────────

test("probeOllamaDocker — valid JSON probe → available:true + spread fields", () => {
  const runner = () => JSON.stringify({ ollama: { up: true }, docker: { up: false } });
  const r = probeOllamaDocker({ runner });
  assert.equal(r.available, true);
  assert.deepEqual(r.ollama, { up: true });
  assert.deepEqual(r.docker, { up: false });
});

test("probeOllamaDocker — runner returns null → available:false, no throw", () => {
  const r = probeOllamaDocker({ runner: () => null });
  assert.equal(r.available, false);
  assert.match(r.reason, /unavailable/);
});

test("probeOllamaDocker — non-JSON output → available:false, no throw", () => {
  const r = probeOllamaDocker({ runner: () => "<html>error 500</html>" });
  assert.equal(r.available, false);
  assert.match(r.reason, /non-JSON/);
});

test("probeOllamaDocker — runner throws → available:false, no throw", () => {
  const r = probeOllamaDocker({ runner: () => { throw new Error("spawn failed"); } });
  assert.equal(r.available, false);
  assert.match(r.reason, /threw/);
});

// ─── readProbeCache (staleness contract) ─────────────────────────────────────
// readProbeCache reads the fixed CACHE_FILE. These tests exercise the
// load-bearing staleness boundary via the injectable `now` param against
// whatever cache file is on disk (the --once mode in CI writes one first).

test("readProbeCache — far-future now makes any cache read as stale → null", () => {
  // Whatever is on disk, a `now` 10 years out is past every maxAgeMs.
  const r = readProbeCache({ now: Date.now() + 10 * 365 * 24 * 3600 * 1000 });
  assert.equal(r, null, "a cache 10 years stale must return null (reader falls back)");
});

test("readProbeCache — maxAgeMs:0 rejects even a just-written cache", () => {
  // Boundary: with a 0ms tolerance, any cache with age>0 is stale.
  const r = readProbeCache({ maxAgeMs: 0, now: Date.now() + 1 });
  assert.equal(r, null);
});

test("readProbeCache — never throws regardless of cache state", () => {
  // The contract: a reader calls this and either gets a snapshot or null.
  // It must not throw even if the cache file is absent/corrupt.
  assert.doesNotThrow(() => readProbeCache({ maxAgeMs: 1 }));
  assert.doesNotThrow(() => readProbeCache({ maxAgeMs: Infinity }));
});

test("readProbeCache — a fresh snapshot (if present) has the documented shape", () => {
  // Not hermetic — depends on a prior `--once`. When a cache exists and is
  // fresh, assert its shape so a schema drift is caught. When absent, skip.
  const snap = readProbeCache({ maxAgeMs: Infinity });
  if (snap === null) return; // no cache on disk in this CI run — nothing to assert
  assert.equal(typeof snap.schemaVersion, "string");
  assert.equal(typeof snap.updatedAtMs, "number");
  assert.ok("gpu" in snap, "snapshot must carry a gpu field");
  assert.ok("stack" in snap, "snapshot must carry a stack field");
});
