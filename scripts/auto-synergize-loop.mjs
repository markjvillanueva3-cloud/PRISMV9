#!/usr/bin/env node
/**
 * auto-synergize-loop.mjs -- AUTO-SYNERGIZE-MS0 (slot:india)
 *
 * The "automatic system synergizing" loop the operator asked for: detect when
 * generated/extracted data (memories, wiki, cross-substrate edges) has drifted
 * ahead of the searchable system-viz graph, and AUTOMATICALLY fold it in by
 * firing `regen-viz.mjs` -- so "everything communicates" without a human running
 * regen by hand.
 *
 * Division of labor (no re-implementation -- R8):
 *   - DECISION: scripts/lib/auto-synergize-staleness.mjs (pure, tested)
 *   - FOLD:     scripts/regen-viz.mjs (default mode already re-runs
 *               generate-cross-substrate-edges.mjs [FAST :199], folds via
 *               merge-augmentations.mjs [:276], rebuilds find-cache/index, and
 *               holds the graph write-lock -- exit 4 = EXIT_GRAPH_WRITE_LOCK_SKIP
 *               when a peer regen already holds it).
 *
 * This runner is CHEAP in --status mode (stats dirs + reads a small sidecar; never
 * loads the ~862MB graph). Only --apply spawns regen-viz, which self-heaps to 24GB.
 *
 * State sidecar:  state/shared/system-viz/AUTO-SYNERGIZE-STATE.json
 * Ledger:         state/shared/system-viz/AUTO-SYNERGIZE-LEDGER.jsonl
 *
 * Usage:
 *   node scripts/auto-synergize-loop.mjs            # status (decide + print, no side effects)
 *   node scripts/auto-synergize-loop.mjs --json     # machine-readable decision
 *   node scripts/auto-synergize-loop.mjs --apply    # fold IFF stale (the cron/automatic entry)
 *   node scripts/auto-synergize-loop.mjs --apply --force   # fold now, ignore debounce
 *   node scripts/auto-synergize-loop.mjs --apply --dry-run # decide + would-fire, no spawn/write
 *
 * Knobs: PRISM_AUTO_SYNERGIZE_DISABLE=1 (apply becomes a no-op),
 *        PRISM_AUTO_SYNERGIZE_MIN_FILES, _MAX_HOURS, _DEBOUNCE_MIN (threshold overrides).
 *
 * Pure-export contract (for tests):
 *   defaultWalk(absRoot) -> { exists, count, mtimes }
 *   loadState(path) -> state object (fail-soft {})
 *   classifyRegenExit(code) -> { status, code }
 *   nextState({ prev, decision, regenResult, nowIso }) -> state
 *   buildLedgerRow({ decision, regenResult, nowIso }) -> row
 *   thresholdsFromEnv(env) -> thresholds
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  computeSynergyFingerprint,
  decideSynergyAction,
  summarizeDecision,
  DEFAULT_SOURCES,
  DEFAULT_THRESHOLDS,
} from "./lib/auto-synergize-staleness.mjs";
import { EXIT_GRAPH_WRITE_LOCK_SKIP } from "./lib/system-graph-write-lock.mjs";
import { atomicWriteText } from "./lib/atomic-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const STATE_PATH = path.join(VIZ_DIR, "AUTO-SYNERGIZE-STATE.json");
const LEDGER_PATH = path.join(VIZ_DIR, "AUTO-SYNERGIZE-LEDGER.jsonl");
const REGEN_VIZ = path.join(ROOT, "scripts", "regen-viz.mjs");
const STATE_SCHEMA_VERSION = "1.0.0";

const MAX_FILES = 12000;        // cost bound on the per-root walk
const WALK_SKIP_DIRS = new Set([".git", ".obsidian", "node_modules", ".trash", "_legacy-root"]);

/** Recursively collect *.md file mtimes under an absolute root, capped. Fail-soft.
 * `maxFiles` is injectable so the cap-truncation path is unit-testable (scrutiny arm B). */
export function defaultWalk(absRoot, maxFiles = MAX_FILES) {
  const out = { exists: false, count: 0, mtimes: [] };
  let st;
  try { st = fs.statSync(absRoot); } catch { return out; }
  if (!st.isDirectory()) return out;
  out.exists = true;

  const stack = [absRoot];
  while (stack.length && out.count < maxFiles) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; } // unreadable subdir -> skip, never throw
    for (const ent of entries) {
      if (out.count >= maxFiles) break;
      if (ent.isDirectory()) {
        if (!WALK_SKIP_DIRS.has(ent.name)) stack.push(path.join(dir, ent.name));
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        try {
          const fst = fs.statSync(path.join(dir, ent.name));
          out.mtimes.push(Number(fst.mtimeMs) || 0);
          out.count++;
        } catch { /* vanished mid-walk -> ignore */ }
      }
    }
  }
  return out;
}

/** Load the state sidecar, fail-soft to {} on missing/corrupt (never throws). */
export function loadState(statePath = STATE_PATH) {
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
}

/** Map a regen-viz exit code to a status. 0=success, 4=locked(peer regen), else=failed. */
export function classifyRegenExit(code) {
  if (code === 0) return { status: "success", code };
  if (code === EXIT_GRAPH_WRITE_LOCK_SKIP) return { status: "locked", code };
  return { status: "failed", code };
}

/** Compute the next state sidecar. Only ADVANCE synergize/apply stamps on a real
 * successful fold -- a locked/failed regen must NOT reset the staleness clock
 * (else a perpetually-locked graph would silently stop ever folding). */
export function nextState({ prev = {}, decision, regenResult, nowIso }) {
  const base = {
    schemaVersion: STATE_SCHEMA_VERSION,
    lastSynergizeAt: prev.lastSynergizeAt ?? null,
    lastApplyAt: prev.lastApplyAt ?? null,
    lastCheckAt: nowIso,
    lastDecision: decision ? { action: decision.action, severity: decision.severity, changedFiles: decision.changedFiles } : null,
    lastResult: regenResult ? regenResult.status : (prev.lastResult ?? null),
  };
  // Any actual fold ATTEMPT (success/locked/failed) advances lastApplyAt so the
  // debounce rate-limits retries -- this prevents a perpetually-failing regen
  // (e.g. an OOM loop) from re-spawning the 24GB job on every cron tick (scrutiny
  // arm C P2). Only a SUCCESS advances lastSynergizeAt (the staleness clock): a
  // locked/failed fold leaves the graph stale, so the loop resumes folding once
  // the debounce window elapses.
  if (regenResult) {
    base.lastApplyAt = nowIso;
    if (regenResult.status === "success") base.lastSynergizeAt = nowIso;
  }
  return base;
}

/** Build one append-only ledger row. */
export function buildLedgerRow({ decision, regenResult, nowIso }) {
  return {
    at: nowIso,
    action: decision?.action ?? "none",
    severity: decision?.severity ?? 0,
    changedFiles: decision?.changedFiles ?? 0,
    hoursSinceSynergize: decision?.hoursSinceSynergize ?? null,
    result: regenResult ? regenResult.status : "skipped",
    exitCode: regenResult ? regenResult.code : null,
    reasons: decision?.reasons ?? [],
  };
}

/** Threshold overrides from env (positive numbers only; else lib defaults). */
export function thresholdsFromEnv(env = process.env) {
  const num = (v, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : dflt;
  };
  return {
    minFilesForRegen: num(env.PRISM_AUTO_SYNERGIZE_MIN_FILES, DEFAULT_THRESHOLDS.minFilesForRegen),
    maxHoursBeforeRegen: num(env.PRISM_AUTO_SYNERGIZE_MAX_HOURS, DEFAULT_THRESHOLDS.maxHoursBeforeRegen),
    debounceMinutes: num(env.PRISM_AUTO_SYNERGIZE_DEBOUNCE_MIN, DEFAULT_THRESHOLDS.debounceMinutes),
  };
}

/** Compute the current staleness decision (cheap -- dir stats + sidecar only). */
export function computeDecision({ now = Date.now(), force = false, env = process.env } = {}) {
  const state = loadState();
  const sinceMs = state.lastSynergizeAt ? Date.parse(state.lastSynergizeAt) || 0 : 0;
  const fingerprint = computeSynergyFingerprint({
    sources: DEFAULT_SOURCES,
    sinceMs,
    walk: (rel) => defaultWalk(path.join(ROOT, rel)),
  });
  const decision = decideSynergyAction({
    fingerprint,
    lastState: state,
    nowMs: now,
    thresholds: thresholdsFromEnv(env),
    force,
  });
  return { state, fingerprint, decision };
}

function parseArgs(argv) {
  return {
    json: argv.includes("--json"),
    apply: argv.includes("--apply"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
    quiet: argv.includes("--quiet"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("usage: auto-synergize-loop [--apply] [--force] [--dry-run] [--json] [--quiet]");
    return;
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const disabled = process.env.PRISM_AUTO_SYNERGIZE_DISABLE === "1";

  const { state: prevState, decision } = computeDecision({ now: nowMs, force: args.force });

  // STATUS modes: decide + report, zero side effects.
  if (!args.apply) {
    if (args.json) console.log(JSON.stringify({ at: nowIso, ...decision }, null, 2));
    else if (!args.quiet) console.log(summarizeDecision(decision));
    return;
  }

  // APPLY mode.
  if (disabled) {
    if (!args.quiet) console.log("auto-synergize: DISABLED (PRISM_AUTO_SYNERGIZE_DISABLE=1) -- no fold");
    return;
  }

  let regenResult = null;
  if (decision.action === "regen") {
    if (args.dryRun) {
      if (!args.quiet) console.log(`auto-synergize: DRY-RUN would fold -- ${summarizeDecision(decision)}`);
      return;
    }
    if (!args.quiet) console.log(`auto-synergize: folding -- ${summarizeDecision(decision)}`);
    // regen-viz self-heaps to 24GB and owns the write-lock; inherit stdio so its
    // progress is visible. windowsHide avoids spawning a console window on Win.
    const r = spawnSync(process.execPath, [REGEN_VIZ], {
      stdio: args.quiet ? "ignore" : "inherit",
      cwd: ROOT,
      windowsHide: true,
    });
    regenResult = classifyRegenExit(r.status ?? 1);
    // Distinguish a spawn failure (ENOENT/EACCES -> r.error) from a regen crash;
    // both classify as "failed" but the operator needs the cause (scrutiny arm C P2).
    if (r.error && !args.quiet) console.error(`auto-synergize: spawn error: ${r.error.message}`);
    if (!args.quiet) console.log(`auto-synergize: regen-viz -> ${regenResult.status} (exit ${regenResult.code})`);
  } else {
    if (!args.quiet) console.log(`auto-synergize: nothing to do -- ${summarizeDecision(decision)}`);
  }

  // Persist state + ledger (fail-soft -- a write failure must not crash the cron).
  try {
    const ns = nextState({ prev: prevState, decision, regenResult, nowIso });
    atomicWriteText(STATE_PATH, JSON.stringify(ns, null, 2));
  } catch (err) {
    if (!args.quiet) console.error(`auto-synergize: WARN state write failed: ${err?.message || err}`);
  }
  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.appendFileSync(LEDGER_PATH, JSON.stringify(buildLedgerRow({ decision, regenResult, nowIso })) + "\n");
  } catch (err) {
    if (!args.quiet) console.error(`auto-synergize: WARN ledger append failed: ${err?.message || err}`);
  }

  // Non-zero exit only on a genuine regen FAILURE (locked is a normal skip).
  if (regenResult && regenResult.status === "failed") process.exitCode = 1;
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
