import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { decideBackstop } from "./stop-graph-staleness-backstop.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "stop-graph-staleness-backstop.mjs");

const HOUR = 3_600_000;
const MIN = 60_000;
const NOW = Date.parse("2026-05-22T18:00:00.000Z");
// Production defaults: 3 h stale threshold, 30 min re-trigger throttle.
const THRESHOLD = 3 * HOUR;
const THROTTLE = 30 * MIN;

// ── decideBackstop — the pure decision core ────────────────────────────────

test("fresh graph (age < threshold) → no trigger", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 1 * HOUR, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false);
  assert.equal(d.reason, "fresh");
});

test("age exactly == threshold → no trigger (boundary, ageMs <= thresholdMs)", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - THRESHOLD, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false, "a graph aged exactly to the threshold is still fresh");
});

test("stale graph, no prior spawn → trigger (reason=stale)", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 9 * HOUR, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, true);
  assert.equal(d.reason, "stale");
  assert.equal(d.ageMs, 9 * HOUR);
});

test("stale graph, regen spawned recently (within throttle) → no trigger (throttled)", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 9 * HOUR, lastSpawnMs: NOW - 10 * MIN, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false, "a regen 10 min ago must suppress a re-trigger");
  assert.equal(d.reason, "throttled");
});

test("stale graph, last spawn older than throttle → trigger", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 9 * HOUR, lastSpawnMs: NOW - 45 * MIN, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, true, "a 45-min-old spawn is past the 30-min throttle");
  assert.equal(d.reason, "stale");
});

test("missing graph (graphMtimeMs null) → trigger (reason=graph-missing, age Infinity)", () => {
  const d = decideBackstop({
    graphMtimeMs: null, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, true);
  assert.equal(d.reason, "graph-missing");
  assert.equal(d.ageMs, Infinity);
});

test("missing graph but a recent spawn → throttled, not trigger", () => {
  const d = decideBackstop({
    graphMtimeMs: null, lastSpawnMs: NOW - 5 * MIN, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false, "even a missing graph must respect the fleet throttle");
  assert.equal(d.reason, "throttled");
});

test("clock skew: graph mtime in the future (negative age) → treated as fresh", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW + 2 * HOUR, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false, "a future graph mtime must not be read as stale");
  assert.equal(d.reason, "fresh");
});

test("clock skew: last spawn in the future → conservatively throttled", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 9 * HOUR, lastSpawnMs: NOW + 10 * MIN, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, false, "a future-dated spawn marker must suppress, never double-spawn");
  assert.equal(d.reason, "throttled");
});

test("adversarial: graphMtimeMs NaN → treated as missing → trigger", () => {
  const d = decideBackstop({
    graphMtimeMs: NaN, lastSpawnMs: null, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, true);
  assert.equal(d.ageMs, Infinity);
});

test("adversarial: lastSpawnMs NaN → ignored, stale graph still triggers", () => {
  const d = decideBackstop({
    graphMtimeMs: NOW - 9 * HOUR, lastSpawnMs: NaN, nowMs: NOW,
    thresholdMs: THRESHOLD, throttleMs: THROTTLE,
  });
  assert.equal(d.trigger, true, "an unparseable spawn marker must not block a needed regen");
  assert.equal(d.reason, "stale");
});

// ── hook I/O — real subprocess, env-pointed fixtures, NEVER spawns a regen ──
// Every subprocess case below resolves to the SILENCE branch, so no real
// ~100 s system-viz-on-commit chain is ever kicked off by the test suite.

function runHook(env) {
  return spawnSync(process.execPath, [HOOK], {
    input: "{}", encoding: "utf8", env: { ...process.env, ...env },
  });
}

test("hook E2E: a fresh graph → SILENCE, no spawn marker written", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b4-fresh-"));
  try {
    const graph = path.join(dir, "system-graph.json");
    const marker = path.join(dir, ".graph-backstop-spawn.json");
    fs.writeFileSync(graph, "{}"); // just-written → fresh
    const r = runHook({
      PRISM_GRAPH_STALENESS_GRAPH_PATH: graph,
      PRISM_GRAPH_STALENESS_MARKER_PATH: marker,
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true, "a fresh graph must be a silent no-op");
    assert.equal(fs.existsSync(marker), false, "no trigger → no spawn marker");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hook E2E: a stale graph but a recent spawn marker → SILENCE (throttled), marker untouched", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b4-throttle-"));
  try {
    const graph = path.join(dir, "system-graph.json");
    const marker = path.join(dir, ".graph-backstop-spawn.json");
    fs.writeFileSync(graph, "{}");
    const old = new Date(Date.now() - 10 * HOUR);
    fs.utimesSync(graph, old, old); // 10 h stale, past the 3 h threshold
    const markerBody = JSON.stringify({ ts: new Date().toISOString(), host: "test" });
    fs.writeFileSync(marker, markerBody); // spawned ~now → inside the throttle
    const r = runHook({
      PRISM_GRAPH_STALENESS_GRAPH_PATH: graph,
      PRISM_GRAPH_STALENESS_MARKER_PATH: marker,
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true, "throttled → silent");
    assert.equal(fs.readFileSync(marker, "utf8"), markerBody,
      "the throttle path must NOT rewrite the spawn marker");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hook E2E: disable knob → SILENCE even with a stale graph, no marker", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b4-disable-"));
  try {
    const graph = path.join(dir, "system-graph.json");
    const marker = path.join(dir, ".graph-backstop-spawn.json");
    fs.writeFileSync(graph, "{}");
    const old = new Date(Date.now() - 10 * HOUR);
    fs.utimesSync(graph, old, old);
    const r = runHook({
      PRISM_GRAPH_STALENESS_BACKSTOP_DISABLE: "1",
      PRISM_GRAPH_STALENESS_GRAPH_PATH: graph,
      PRISM_GRAPH_STALENESS_MARKER_PATH: marker,
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
    assert.equal(fs.existsSync(marker), false, "disabled → never spawns, never marks");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
