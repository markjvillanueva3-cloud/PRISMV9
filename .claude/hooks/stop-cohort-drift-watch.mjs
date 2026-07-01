#!/usr/bin/env node
// tier: T3
/**
 * stop-cohort-drift-watch.mjs — Stage 5 of the lego-stacking plan.
 *
 * Tier-3 advisory Stop hook. Detects when the engine-cohort taxonomy has
 * drifted since the last cohort-detector run and tells the operator to
 * re-run batch-compat-scorer + bridge-shim-emit so the lego-stacking
 * substrate stays current.
 *
 * What counts as drift:
 *   - A cohort NAME appears in the live cohort-detector output that wasn't
 *     in the last snapshot (e.g. someone shipped a new "iter25+" cohort).
 *   - A cohort engine-count moved >10% since the last snapshot.
 *
 * Why this matters:
 *   - When engines are added/migrated, the COHORT-COMPAT-MATRIX.json gets
 *     stale silently — Stage 4's bridge-shim-emit would keep emitting edges
 *     based on the old matrix, missing new bridge opportunities.
 *
 * Throttle:
 *   - Doesn't actually run cohort-detector on every Stop (expensive — touches
 *     every engine on disk). Runs at most once every DRIFT_CHECK_INTERVAL_MS
 *     (default 24h). Outside the window, no-op + exit 0.
 *
 * Non-blocking — always exits 0 even on drift detection. Just surfaces a
 * hint via additionalContext.
 *
 * Knobs:
 *   PRISM_COHORT_DRIFT_WATCH_DISABLE=1  — disable entirely
 *   PRISM_COHORT_DRIFT_INTERVAL_MS=N    — override throttle (default 86400000)
 *   PRISM_COHORT_DRIFT_VERBOSE=1        — log throttle decision to stderr
 *
 * Wiring (settings.json Stop chain):
 *   { "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-cohort-drift-watch.mjs" }
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DISABLE_ENV = "PRISM_COHORT_DRIFT_WATCH_DISABLE";
const INTERVAL_ENV = "PRISM_COHORT_DRIFT_INTERVAL_MS";
const VERBOSE_ENV = "PRISM_COHORT_DRIFT_VERBOSE";
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
const ENGINE_COUNT_DRIFT_THRESHOLD = 0.10;       // 10%

const REPO_ROOT = "H:/prism";
const SNAPSHOT_PATH = path.join(REPO_ROOT, "state/shared/specs/.cohort-drift-snapshot.json");
const COHORTS_PATH = path.join(REPO_ROOT, "state/shared/specs/PRISM-COHORTS.json");
const COHORT_DETECTOR = path.join(REPO_ROOT, "scripts/cohort-detector.mjs");

function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

if (process.env[DISABLE_ENV] === "1") out({});

const intervalMs = Number(process.env[INTERVAL_ENV]) || DEFAULT_INTERVAL_MS;
const verbose = process.env[VERBOSE_ENV] === "1";

// ─── Throttle: load last-check timestamp ─────────────────────────────
let snapshot = null;
try {
  snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
} catch { snapshot = null; }

const now = Date.now();
const lastCheckedAt = snapshot?.lastCheckedAt ? new Date(snapshot.lastCheckedAt).getTime() : 0;
const sinceLast = now - lastCheckedAt;

if (sinceLast < intervalMs) {
  if (verbose) {
    const remainMin = Math.round((intervalMs - sinceLast) / 60000);
    process.stderr.write(`[cohort-drift-watch] throttled — next check in ${remainMin}m\n`);
  }
  out({});
}

// ─── Read live cohort state (don't re-run cohort-detector if PRISM-COHORTS.json is fresh) ──
let live = null;
let liveMtimeMs = 0;
try {
  const st = fs.statSync(COHORTS_PATH);
  live = JSON.parse(fs.readFileSync(COHORTS_PATH, "utf8"));
  liveMtimeMs = st.mtimeMs;
} catch { live = null; }

if (!live || (now - liveMtimeMs) > intervalMs) {
  // PRISM-COHORTS.json missing or stale → run cohort-detector to refresh.
  // This is the expensive bit; only fires once per intervalMs.
  if (!fs.existsSync(COHORT_DETECTOR)) {
    if (verbose) process.stderr.write(`[cohort-drift-watch] cohort-detector missing — nothing to do\n`);
    out({});
  }
  const r = spawnSync(process.execPath, [COHORT_DETECTOR], { windowsHide: true, cwd: REPO_ROOT, encoding: "utf8", timeout: 60000 });
  if (r.status !== 0) {
    if (verbose) process.stderr.write(`[cohort-drift-watch] detector failed: ${(r.stderr || "").slice(0, 200)}\n`);
    out({});
  }
  try { live = JSON.parse(fs.readFileSync(COHORTS_PATH, "utf8")); }
  catch { out({}); }
}

const liveCohorts = Array.isArray(live.cohorts) ? live.cohorts : [];
const liveByName = new Map(liveCohorts.map(c => [c.cohort, c.count]));
const prevByName = new Map(Object.entries(snapshot?.cohortCounts || {}));

// ─── Detect drift ───────────────────────────────────────────────────
const newCohorts = [];
const removedCohorts = [];
const shiftedCohorts = [];

for (const [name, count] of liveByName) {
  if (!prevByName.has(name)) {
    newCohorts.push({ cohort: name, count });
    continue;
  }
  const prev = Number(prevByName.get(name));
  if (Number.isFinite(prev) && prev > 0) {
    const drift = Math.abs(count - prev) / prev;
    if (drift >= ENGINE_COUNT_DRIFT_THRESHOLD) {
      shiftedCohorts.push({ cohort: name, prev, now: count, driftPct: Number((drift * 100).toFixed(1)) });
    }
  }
}
for (const [name, count] of prevByName) {
  if (!liveByName.has(name)) removedCohorts.push({ cohort: name, lastCount: Number(count) });
}

// ─── Persist new snapshot regardless of drift ───────────────────────
const nextSnapshot = {
  schemaVersion: "1.0.0",
  lastCheckedAt: new Date(now).toISOString(),
  cohortCount: liveCohorts.length,
  cohortCounts: Object.fromEntries(liveByName),
};
try { fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(nextSnapshot, null, 2)); }
catch { /* best-effort persistence — never block on snapshot write */ }

// ─── Emit advisory only when there's actual drift ────────────────────
const hasDrift = newCohorts.length > 0 || removedCohorts.length > 0 || shiftedCohorts.length > 0;
if (!hasDrift) out({});

const lines = [];
lines.push(`## 🪟 Cohort drift detected (lego-stacking substrate)`);
if (newCohorts.length > 0) {
  lines.push(`**New cohorts (${newCohorts.length}):** ` + newCohorts.map(c => `${c.cohort}(${c.count})`).join(", "));
}
if (removedCohorts.length > 0) {
  lines.push(`**Removed cohorts (${removedCohorts.length}):** ` + removedCohorts.map(c => `${c.cohort}(was ${c.lastCount})`).join(", "));
}
if (shiftedCohorts.length > 0) {
  const top = shiftedCohorts.sort((a, b) => b.driftPct - a.driftPct).slice(0, 5);
  lines.push(`**Engine-count drift ≥10% (${shiftedCohorts.length}):** ` + top.map(c => `${c.cohort} ${c.prev}→${c.now} (${c.driftPct}%)`).join(", "));
}
lines.push(`> COHORT-COMPAT-MATRIX is now stale. Refresh: \`node scripts/batch-compat-scorer.mjs && node scripts/bridge-shim-emit.mjs\`.`);
lines.push(`> Disable this watch: \`PRISM_COHORT_DRIFT_WATCH_DISABLE=1\`.`);

out({
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: lines.join("\n"),
  },
});
