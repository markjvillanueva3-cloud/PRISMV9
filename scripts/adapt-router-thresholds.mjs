#!/usr/bin/env node
/**
 * adapt-router-thresholds.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02
 *
 * Weekly cron tuner. Reads the last-7-days slice of
 * `mcp-server/data/state/model-telemetry.jsonl` (+ rotated `.1`), computes
 * per-model P95 latency + failure rate, and writes adaptation decisions to:
 *
 *   - `mcp-server/data/state/router-adaptation.jsonl`       (append-only audit log)
 *   - `mcp-server/data/state/router-adaptation-state.json`  (current effective state, overwritten)
 *
 * The state file is consumed at process boot by
 * `ModelRoutingEngine.applyAdaptiveState(state)` — see engine docstring.
 *
 * Decision rules (kept simple, easy to audit):
 *   - Skip models with fewer than MIN_SAMPLES calls in the window.
 *   - `effectiveLatencyMs = observed P95` (always emit). The engine
 *     compares this to its catalog `latencyMsTypical`; a no-op override
 *     when the observed P95 matches is harmless.
 *   - `excludedFromSafety = true` when observed failure rate ≥
 *     FAILURE_RATE_DEGRADATION. Cleared when failure rate falls below
 *     FAILURE_RATE_RECOVERY on a later run.
 *
 * Usage:
 *   node scripts/adapt-router-thresholds.mjs           # weekly cron — full run
 *   node scripts/adapt-router-thresholds.mjs --dry-run # compute + print, no writes
 *   node scripts/adapt-router-thresholds.mjs --window-days 30
 *   node scripts/adapt-router-thresholds.mjs --json    # machine-readable output
 *
 * Exit codes:
 *   0 — success (with or without decisions emitted)
 *   1 — fatal error (telemetry file missing AND not dry-run, or write failure)
 *
 * Hermetic-test note: all I/O paths can be overridden by env vars
 * (PRISM_MODEL_TELEMETRY_PATH, PRISM_ROUTER_ADAPTATION_PATH,
 * PRISM_ROUTER_ADAPTATION_STATE_PATH) so a test can point at a tmp dir.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";

// ── tunables (single source of truth) ─────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 7;
const MIN_SAMPLES = 10;                 // skip per-model decisions below this
const FAILURE_RATE_DEGRADATION = 0.20;  // ≥20% failures → exclude from safety
const FAILURE_RATE_RECOVERY = 0.05;     // <5% failures → restore safety eligibility
const P95 = 0.95;
const SCHEMA_VERSION = 1;

// ── CLI parsing ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function hasFlag(name) { return argv.includes(name); }
function flagValue(name) {
  const idx = argv.indexOf(name);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : null;
}

const dryRun = hasFlag("--dry-run");
const jsonOutput = hasFlag("--json");
const windowDays = (() => {
  const v = flagValue("--window-days");
  if (v == null) return DEFAULT_WINDOW_DAYS;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`invalid --window-days '${v}', falling back to ${DEFAULT_WINDOW_DAYS}`);
    return DEFAULT_WINDOW_DAYS;
  }
  return n;
})();

// ── path resolution ───────────────────────────────────────────────────────

const MCP_SERVER_WALK_DEPTH = 8;
function findMcpServerRoot(start) {
  let dir = start;
  for (let i = 0; i < MCP_SERVER_WALK_DEPTH; i++) {
    if (path.basename(dir) === "mcp-server") return dir;
    const candidate = path.join(dir, "mcp-server");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const mcpServerRoot = findMcpServerRoot(process.cwd());
const stateDir = mcpServerRoot ? path.join(mcpServerRoot, "data", "state") : null;

const telemetryPath =
  process.env.PRISM_MODEL_TELEMETRY_PATH ||
  (stateDir ? path.join(stateDir, "model-telemetry.jsonl") : null);
const adaptationLogPath =
  process.env.PRISM_ROUTER_ADAPTATION_PATH ||
  (stateDir ? path.join(stateDir, "router-adaptation.jsonl") : null);
const adaptationStatePath =
  process.env.PRISM_ROUTER_ADAPTATION_STATE_PATH ||
  (stateDir ? path.join(stateDir, "router-adaptation-state.json") : null);

function fail(msg) {
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
  } else {
    console.error(`adapt-router-thresholds: ${msg}`);
  }
  process.exit(1);
}

if (!telemetryPath) fail("could not resolve telemetry path — set PRISM_MODEL_TELEMETRY_PATH or run from inside the repo");

// ── telemetry reader (mirrors ModelTelemetryEngine.coerceEntry contract) ──

function isValidEntry(r) {
  if (!r || typeof r !== "object") return false;
  if (typeof r.ts !== "string" || !Number.isFinite(Date.parse(r.ts))) return false;
  if (typeof r.model !== "string" || r.model.length === 0) return false;
  if (!Number.isInteger(r.promptTokens) || r.promptTokens < 0) return false;
  if (!Number.isInteger(r.completionTokens) || r.completionTokens < 0) return false;
  if (typeof r.latencyMs !== "number" || !Number.isFinite(r.latencyMs) || r.latencyMs < 0) return false;
  if (r.outcome !== "ok" && r.outcome !== "fail" && r.outcome !== "timeout") return false;
  return true;
}

function readJsonlInto(file, cutoffMs, out) {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf8");
  if (raw.length === 0) return;
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    let parsed;
    try { parsed = JSON.parse(line); }
    catch { continue; }
    if (!isValidEntry(parsed)) continue;
    if (Date.parse(parsed.ts) < cutoffMs) continue;
    out.push(parsed);
  }
}

function loadRecentTelemetry(jsonlPath, windowMs, now) {
  const cutoff = now.getTime() - windowMs;
  const entries = [];
  // Read rotated file first (older), then live (newer) — preserves chrono order well enough.
  readJsonlInto(jsonlPath + ".1", cutoff, entries);
  readJsonlInto(jsonlPath, cutoff, entries);
  return entries;
}

// ── percentile (Hyndman–Fan Type 7, matches numpy default) ────────────────

function percentile(sortedNumbers, p) {
  if (sortedNumbers.length === 0) return 0;
  if (sortedNumbers.length === 1) return sortedNumbers[0];
  if (p <= 0) return sortedNumbers[0];
  if (p >= 1) return sortedNumbers[sortedNumbers.length - 1];
  const rank = (sortedNumbers.length - 1) * p;
  const lo = Math.floor(rank), hi = Math.ceil(rank);
  if (lo === hi) return sortedNumbers[lo];
  const w = rank - lo;
  return sortedNumbers[lo] * (1 - w) + sortedNumbers[hi] * w;
}

// ── stats + decisions ─────────────────────────────────────────────────────

function statsByModel(entries) {
  const grouped = Object.create(null);
  for (const e of entries) {
    (grouped[e.model] ??= []).push(e);
  }
  const stats = {};
  for (const [model, list] of Object.entries(grouped)) {
    const latencies = list.map((e) => e.latencyMs).sort((a, b) => a - b);
    const failures = list.reduce((n, e) => n + (e.outcome === "ok" ? 0 : 1), 0);
    stats[model] = {
      calls: list.length,
      failures,
      failureRate: list.length > 0 ? failures / list.length : 0,
      latencyP95Ms: percentile(latencies, P95),
      latencyMaxMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    };
  }
  return stats;
}

function loadCurrentState(p) {
  if (!p || !fs.existsSync(p)) return {};
  try {
    const raw = fs.readFileSync(p, "utf8");
    if (raw.length === 0) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object") {
      return parsed.state;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Compute the new adaptation state from the per-model stats. Returns
 *   {
 *     newState: { [modelId]: { effectiveLatencyMs?, excludedFromSafety?, reason?, appliedAt? } },
 *     decisions: [{ model, action, before, after, reason, observed }]
 *   }
 */
function decideAdaptations(stats, previousState, now) {
  const newState = {};
  const decisions = [];
  const nowIso = now.toISOString();
  for (const [model, s] of Object.entries(stats)) {
    if (s.calls < MIN_SAMPLES) {
      decisions.push({
        model,
        action: "skip-low-samples",
        observed: { calls: s.calls, failureRate: s.failureRate, latencyP95Ms: s.latencyP95Ms },
        reason: `only ${s.calls} calls in window (min ${MIN_SAMPLES})`,
        appliedAt: nowIso,
      });
      // Preserve prior state for under-sampled models so a quiet week doesn't reset hard-won adaptations.
      if (previousState[model]) newState[model] = previousState[model];
      continue;
    }

    const prev = previousState[model] ?? {};
    const entry = {};
    let action = "update-latency";

    // Always emit effectiveLatencyMs so the engine sees the live P95.
    entry.effectiveLatencyMs = s.latencyP95Ms;

    if (s.failureRate >= FAILURE_RATE_DEGRADATION) {
      entry.excludedFromSafety = true;
      entry.reason = `failure rate ${(s.failureRate * 100).toFixed(1)}% over ${s.calls} calls`;
      action = prev.excludedFromSafety ? "keep-excluded" : "demote-safety";
    } else if (s.failureRate < FAILURE_RATE_RECOVERY && prev.excludedFromSafety) {
      // Drop the excludedFromSafety flag — recovery threshold met.
      entry.excludedFromSafety = false;
      entry.reason = `recovered: failure rate ${(s.failureRate * 100).toFixed(1)}% < ${(FAILURE_RATE_RECOVERY * 100).toFixed(1)}%`;
      action = "restore-safety";
    } else if (prev.excludedFromSafety) {
      // Still in the grey zone — keep the existing exclusion.
      entry.excludedFromSafety = true;
      entry.reason = prev.reason ?? "previously excluded from safety";
      action = "keep-excluded";
    }

    entry.appliedAt = nowIso;
    newState[model] = entry;
    decisions.push({
      model,
      action,
      observed: { calls: s.calls, failureRate: s.failureRate, latencyP95Ms: s.latencyP95Ms },
      before: prev,
      after: entry,
      reason: entry.reason ?? `effectiveLatencyMs := ${entry.effectiveLatencyMs.toFixed(0)}ms`,
      appliedAt: nowIso,
    });
  }
  return { newState, decisions };
}

// ── output writers ────────────────────────────────────────────────────────

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function appendAdaptationLog(p, decisions, now) {
  if (!p || decisions.length === 0) return 0;
  ensureDir(p);
  const ts = now.toISOString();
  const lines = decisions
    .map((d) => JSON.stringify({ ts, schemaVersion: SCHEMA_VERSION, ...d }))
    .join("\n") + "\n";
  fs.appendFileSync(p, lines, "utf8");
  return decisions.length;
}

function writeAdaptationState(p, state, now) {
  if (!p) return;
  ensureDir(p);
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    state,
  };
  // tmp + rename for atomicity (matches ModelTelemetryEngine.purgeOlderThan pattern).
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, p);
}

// ── orchestration ────────────────────────────────────────────────────────

export function runAdaptation(opts = {}) {
  const now = opts.now ?? new Date();
  const wDays = opts.windowDays ?? windowDays;
  const tPath = opts.telemetryPath ?? telemetryPath;
  const aLog = opts.adaptationLogPath ?? adaptationLogPath;
  const aState = opts.adaptationStatePath ?? adaptationStatePath;
  const writes = opts.dryRun ?? dryRun ? false : true;

  if (!tPath) {
    return { ok: false, error: "telemetry path unresolved" };
  }
  if (!fs.existsSync(tPath) && !fs.existsSync(tPath + ".1")) {
    // No telemetry yet — emit a no-op result rather than failing.
    return {
      ok: true,
      reason: "no telemetry yet",
      windowDays: wDays,
      totalCalls: 0,
      modelsConsidered: 0,
      decisions: [],
      newState: {},
    };
  }

  const windowMs = wDays * 24 * 60 * 60 * 1000;
  const entries = loadRecentTelemetry(tPath, windowMs, now);
  const stats = statsByModel(entries);
  const previousState = loadCurrentState(aState);
  const { newState, decisions } = decideAdaptations(stats, previousState, now);

  let logsWritten = 0;
  if (writes) {
    logsWritten = appendAdaptationLog(aLog, decisions, now);
    writeAdaptationState(aState, newState, now);
  }

  return {
    ok: true,
    windowDays: wDays,
    totalCalls: entries.length,
    modelsConsidered: Object.keys(stats).length,
    decisionsEmitted: decisions.length,
    logsWritten,
    decisions,
    newState,
    stats,
    paths: { telemetry: tPath, adaptationLog: aLog, adaptationState: aState },
    dryRun: !writes,
  };
}

// ── CLI entry ────────────────────────────────────────────────────────────

const isMainModule = (() => {
  try {
    return (
      process.argv[1] &&
      path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")
    );
  } catch {
    return false;
  }
})();

if (isMainModule) {
  const result = runAdaptation();
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!result.ok) {
    console.error(`adapt-router-thresholds: ${result.error}`);
    process.exit(1);
  } else {
    const tag = result.dryRun ? "[DRY-RUN] " : "";
    console.log(`${tag}adapt-router-thresholds: window=${result.windowDays}d, totalCalls=${result.totalCalls}, models=${result.modelsConsidered}, decisions=${result.decisionsEmitted}`);
    for (const d of result.decisions) {
      console.log(`  - [${d.action}] ${d.model}: ${d.reason}`);
    }
  }
}
