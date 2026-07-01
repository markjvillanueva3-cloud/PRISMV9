#!/usr/bin/env node
// tier: T3
/**
 * stop-graph-staleness-backstop.mjs — Stop hook (T3, non-blocking)
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B4 — the autoupdate backstop.
 *
 * The system-viz master graph (state/shared/system-viz/system-graph.json) is
 * refreshed by the git post-commit hook on every commit. That is best-effort:
 * a wedged lock, an OOM, or simply a pause in commits can let the graph go
 * stale — and master-index search depends on it (via the sidecar). U-GO-B1
 * observed the graph 9.5 h stale with nobody aware.
 *
 * This hook is the backstop. On every chat Stop it checks the graph's age and,
 * when it exceeds a threshold, fire-and-forget spawns scripts/system-viz-on-
 * commit.mjs (detached) to regenerate it. With up to 26 chats in the fleet,
 * Stop events are frequent, so the graph cannot stay stale for long unnoticed.
 *
 * Safety:
 *   - Non-blocking: always emits { continue: true }; never blocks a Stop.
 *   - Fleet throttle: a shared marker (.graph-backstop-spawn.json) suppresses
 *     re-triggering for THROTTLE_MIN minutes so a Stop-storm across 26 chats
 *     spawns at most one regen.
 *   - The spawned system-viz-on-commit.mjs has its OWN pid guard + graph-write
 *     lock, so even a double-spawn self-resolves to a single real regen.
 *   - Fail-open everywhere: any error → { continue: true }.
 *
 * Knobs:
 *   PRISM_GRAPH_STALENESS_BACKSTOP_DISABLE=1        — off entirely
 *   PRISM_GRAPH_STALENESS_BACKSTOP_HRS=N            — stale threshold (default 3)
 *   PRISM_GRAPH_STALENESS_BACKSTOP_THROTTLE_MIN=N   — re-trigger cooldown (default 30)
 *   PRISM_GRAPH_STALENESS_GRAPH_PATH=...            — graph path override (tests)
 *   PRISM_GRAPH_STALENESS_MARKER_PATH=...           — marker path override (tests)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = "H:/prism";
const SILENCE = { continue: true, suppressOutput: true };

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;
const DEFAULT_THRESHOLD_HRS = 3;
const DEFAULT_THROTTLE_MIN = 30;

function graphPath() {
  return process.env.PRISM_GRAPH_STALENESS_GRAPH_PATH
    || path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
}
function markerPath() {
  return process.env.PRISM_GRAPH_STALENESS_MARKER_PATH
    || path.join(ROOT, "state", "shared", "system-viz", ".graph-backstop-spawn.json");
}
function thresholdMs() {
  const v = Number(process.env.PRISM_GRAPH_STALENESS_BACKSTOP_HRS);
  return (Number.isFinite(v) && v > 0 ? v : DEFAULT_THRESHOLD_HRS) * HOUR_MS;
}
function throttleMs() {
  const v = Number(process.env.PRISM_GRAPH_STALENESS_BACKSTOP_THROTTLE_MIN);
  return (Number.isFinite(v) && v > 0 ? v : DEFAULT_THROTTLE_MIN) * MIN_MS;
}

/**
 * Pure backstop decision — no I/O, fully deterministic for tests.
 *
 * @param {object} a
 * @param {number|null} a.graphMtimeMs  graph file mtime (ms), null if missing
 * @param {number|null} a.lastSpawnMs   last backstop-spawn ts (ms), null if none
 * @param {number} a.nowMs
 * @param {number} a.thresholdMs        staleness threshold
 * @param {number} a.throttleMs         re-trigger cooldown
 * @returns {{trigger:boolean, reason:string, ageMs:number}}
 */
export function decideBackstop({ graphMtimeMs, lastSpawnMs, nowMs, thresholdMs, throttleMs }) {
  // A missing / unstatable graph is maximally stale — age Infinity.
  const ageMs = (graphMtimeMs == null || !Number.isFinite(graphMtimeMs))
    ? Infinity
    : nowMs - graphMtimeMs;

  // A graph at-or-under the threshold (incl. clock-skew negative age) is fresh.
  if (ageMs <= thresholdMs) {
    return { trigger: false, reason: "fresh", ageMs };
  }

  // Stale — but suppress if any chat already triggered a regen recently. A
  // future-dated marker (clock skew) reads as "very recent" → still throttled
  // (conservative: never double-spawn on an ambiguous clock).
  if (lastSpawnMs != null && Number.isFinite(lastSpawnMs)) {
    if (nowMs - lastSpawnMs < throttleMs) {
      return { trigger: false, reason: "throttled", ageMs };
    }
  }

  return { trigger: true, reason: graphMtimeMs == null ? "graph-missing" : "stale", ageMs };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function readGraphMtimeMs() {
  try { return fs.statSync(graphPath()).mtimeMs; } catch { return null; }
}

function readLastSpawnMs() {
  try {
    const m = JSON.parse(fs.readFileSync(markerPath(), "utf-8"));
    const t = Date.parse(m && m.ts);
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
}

function writeSpawnMarker(nowMs, reason, ageMs) {
  try {
    fs.writeFileSync(markerPath(), JSON.stringify({
      ts: new Date(nowMs).toISOString(),
      host: os.hostname(),
      reason,
      graphAgeHrs: Number.isFinite(ageMs) ? Number((ageMs / HOUR_MS).toFixed(2)) : null,
    }, null, 2));
  } catch { /* best-effort — spawn anyway */ }
}

function main() {
  if (process.env.PRISM_GRAPH_STALENESS_BACKSTOP_DISABLE === "1") { emit(SILENCE); return; }
  readStdin(); // drain stdin; the Stop payload is not needed

  const nowMs = Date.now();
  const d = decideBackstop({
    graphMtimeMs: readGraphMtimeMs(),
    lastSpawnMs: readLastSpawnMs(),
    nowMs,
    thresholdMs: thresholdMs(),
    throttleMs: throttleMs(),
  });
  if (!d.trigger) { emit(SILENCE); return; }

  // Stamp the throttle marker BEFORE spawning so a concurrent peer Stop sees
  // it and does not also spawn (the on-commit pid guard is the hard mutex;
  // this just trims wasted self-skipping spawns).
  writeSpawnMarker(nowMs, d.reason, d.ageMs);

  try {
    const child = spawn(process.execPath, ["scripts/system-viz-on-commit.mjs"], {
      cwd: ROOT, stdio: "ignore", detached: true, windowsHide: true,
    });
    child.unref();
  } catch (e) {
    emit({ continue: true, systemMessage: `graph-staleness-backstop: regen spawn failed (${e.message})` });
    return;
  }

  const ageHrs = Number.isFinite(d.ageMs) ? (d.ageMs / HOUR_MS).toFixed(1) : "∞";
  emit({
    continue: true,
    systemMessage: `🔄 system-viz graph stale (${ageHrs}h, reason=${d.reason}) — triggered a background regen (detached). `
      + `Disable: PRISM_GRAPH_STALENESS_BACKSTOP_DISABLE=1`,
  });
}

// Entry-point guard: run only when invoked directly, never on import (tests
// import decideBackstop without firing the hook).
const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invoked && import.meta.url === invoked) {
  try { main(); } catch { emit(SILENCE); }
}
