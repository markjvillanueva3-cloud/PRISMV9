import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { decideStalenessAdvisory } from "./sessionstart-graph-staleness-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "sessionstart-graph-staleness-inject.mjs");

const HOUR = 3_600_000;
const NOW = Date.parse("2026-05-22T20:00:00.000Z");
const STALE_HRS = 6;

// ── decideStalenessAdvisory — pure decision (each branch covered) ──────────

test("fresh everything → silent (no advisory)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: NOW - 0.5 * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.advisory, null);
  assert.equal(d.reason, "fresh");
});

test("failure marker NEWER than success sentinel → failure advisory (priority 1)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: NOW - 6 * HOUR,
    failureTs: NOW - 2 * HOUR,
    failure: { stage: "merge augmentations", exitCode: 134, stderrTail: "JavaScript heap OOM" },
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "failure");
  assert.match(d.advisory, /system-viz regen FAILED/);
  assert.match(d.advisory, /merge augmentations/);
  assert.match(d.advisory, /exit 134/);
  assert.match(d.advisory, /JavaScript heap OOM/);
  assert.match(d.advisory, /2\.0h ago/, "must surface the failure age");
});

test("failure marker OLDER than success sentinel → ignored (recovered)", () => {
  // Last run was a failure 6h ago, but a SUCCESS happened 1h ago — recovered.
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: NOW - 1 * HOUR,
    failureTs: NOW - 6 * HOUR,
    failure: { stage: "x", exitCode: 1 },
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.notEqual(d.reason, "failure", "a recovered failure must not surface");
  assert.equal(d.advisory, null);
});

test("failure marker with no sentinel ever → still surfaces (no recovery proof)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: null,
    failureTs: NOW - 2 * HOUR,
    failure: { stage: "generate base graph", exitCode: 1, stderrTail: "ENOENT" },
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "failure");
  assert.match(d.advisory, /never \(no sentinel\)/);
});

test("graph missing → graph-missing advisory (priority 2)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: null,
    sidecarMtimeMs: null,
    sentinelTs: null,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "graph-missing");
  assert.match(d.advisory, /system-viz graph missing/);
  assert.match(d.advisory, /system-viz-on-commit\.mjs/);
});

test("graph older than threshold → graph-stale advisory (priority 3)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 10 * HOUR, // 10h > 6h
    sidecarMtimeMs: NOW - 10 * HOUR,
    sentinelTs: NOW - 10 * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "graph-stale");
  assert.match(d.advisory, /graph stale \(10\.0h old\)/);
});

test("graph at exactly the threshold → still silent (strict >)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - STALE_HRS * HOUR,
    sidecarMtimeMs: NOW - STALE_HRS * HOUR,
    sentinelTs: NOW - STALE_HRS * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.advisory, null, "boundary equality must NOT trigger");
});

test("graph fresh, sidecar missing → sidecar-missing advisory (priority 4)", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: null,
    sentinelTs: NOW - 1 * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "sidecar-missing");
  assert.match(d.advisory, /sidecar missing/);
  assert.match(d.advisory, /build-graph-index/);
});

test("graph fresh, sidecar built from an OLDER graph → sidecar-stale advisory", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 0.5 * HOUR,    // graph regenerated 30 min ago
    sidecarMtimeMs: NOW - 48 * HOUR,    // sidecar from 2 days ago
    sentinelTs: NOW - 0.5 * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "sidecar-stale");
  assert.match(d.advisory, /sidecar stale/);
  assert.match(d.advisory, /47\.5h behind/);
});

test("clock skew: graph mtime in the future → treated as fresh, sidecar check still applies", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW + 1 * HOUR,
    sidecarMtimeMs: NOW + 1 * HOUR,
    sentinelTs: NOW - 0.5 * HOUR,
    failureTs: null,
    failure: null,
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.advisory, null, "a future graph mtime must not be flagged stale");
});

test("adversarial: failureTs NaN → ignored, falls through to other branches", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: NOW - 1 * HOUR,
    failureTs: NaN,
    failure: { stage: "x" },
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.notEqual(d.reason, "failure", "an unparseable failure ts must not block fall-through");
});

test("adversarial: failure object missing stage → uses 'unknown stage'", () => {
  const d = decideStalenessAdvisory({
    graphMtimeMs: NOW - 1 * HOUR,
    sidecarMtimeMs: NOW - 1 * HOUR,
    sentinelTs: null,
    failureTs: NOW - 2 * HOUR,
    failure: { exitCode: 1 },
    nowMs: NOW, staleHrs: STALE_HRS,
  });
  assert.equal(d.reason, "failure");
  assert.match(d.advisory, /unknown stage/);
});

// ── hook E2E — real subprocess with env-pointed fixtures ───────────────────

function runHook(env) {
  return spawnSync(process.execPath, [HOOK], {
    input: "{}", encoding: "utf8", env: { ...process.env, ...env },
  });
}

test("hook E2E: a fresh graph + fresh sidecar → SILENCE", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b5-fresh-"));
  try {
    const g = path.join(dir, "system-graph.json");
    const s = path.join(dir, "system-graph-index.json");
    fs.writeFileSync(g, "{}");
    fs.writeFileSync(s, "{}");
    const r = runHook({
      PRISM_GRAPH_STALENESS_GRAPH_PATH: g,
      PRISM_GRAPH_STALENESS_SIDECAR_PATH: s,
      PRISM_GRAPH_STALENESS_SENTINEL_PATH: path.join(dir, "_no_sentinel.json"),
      PRISM_GRAPH_STALENESS_FAILURE_PATH: path.join(dir, "_no_failure.json"),
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true, "a healthy graph state must be silent");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hook E2E: a stale sidecar (older than the graph) → emits a SessionStart advisory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b5-stale-sidecar-"));
  try {
    const g = path.join(dir, "system-graph.json");
    const s = path.join(dir, "system-graph-index.json");
    fs.writeFileSync(s, "{}");                                  // sidecar first
    const past = new Date(Date.now() - 48 * HOUR);
    fs.utimesSync(s, past, past);                               // backdate sidecar 48h
    fs.writeFileSync(g, "{}");                                  // graph now (fresh)
    const r = runHook({
      PRISM_GRAPH_STALENESS_GRAPH_PATH: g,
      PRISM_GRAPH_STALENESS_SIDECAR_PATH: s,
      PRISM_GRAPH_STALENESS_SENTINEL_PATH: path.join(dir, "_no_sentinel.json"),
      PRISM_GRAPH_STALENESS_FAILURE_PATH: path.join(dir, "_no_failure.json"),
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.ok(out.hookSpecificOutput, "must emit a SessionStart advisory, not silence");
    assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(out.hookSpecificOutput.additionalContext, /sidecar stale/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hook E2E: disable knob → SILENCE even with a missing graph", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b5-disable-"));
  try {
    const r = runHook({
      PRISM_GRAPH_STALENESS_INJECT_DISABLE: "1",
      PRISM_GRAPH_STALENESS_GRAPH_PATH: path.join(dir, "_absent_graph.json"),
      PRISM_GRAPH_STALENESS_SIDECAR_PATH: path.join(dir, "_absent_sidecar.json"),
      PRISM_GRAPH_STALENESS_SENTINEL_PATH: path.join(dir, "_absent_sentinel.json"),
      PRISM_GRAPH_STALENESS_FAILURE_PATH: path.join(dir, "_absent_failure.json"),
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
