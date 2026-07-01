#!/usr/bin/env node
// scripts/cag-galaxy-warm-sweep.mjs
//
// CAG-WARM-SWEEP (slot:alpha 2026-06-16) -- the Ollama-offloaded ($0) CAG/RAG
// WARMING harness the operator's "engineered loops and harnesses and crons ...
// ollama offloading optimally" directive asked for. It runs the proven
// galaxy-reasoning-bridge (`reasonForGalaxy`) across all 34 galaxies for a small
// set of canonical, frequently-re-asked WARMING QUERIES, so the FIRST real ask of
// each common question is already a warm CAG hit instead of a cold Ollama miss.
//
// WHY THIS IS A REAL AI-SUBSYSTEM IMPROVEMENT (not infra): the CAG/RAG hybrid
// (galaxy-reasoning-bridge: per-galaxy RAG over CLAUDE.md/SOUL/MEMORY/wiki ->
// Ollama reasoning -> cache-augmented store) only pays off on a cache HIT. A cold
// fleet caches nothing until a question happens to repeat. This sweep pre-populates
// the cache from the per-galaxy Obsidian/wiki/memory corpus, turning cold first-asks
// into warm reuse -- a measurable lift in the substrate hit-rate (PSN leg #10), at
// $0 (Ollama-local), synergizing every galaxy's doctrine docs. It is the PRODUCER
// the CAG warm-rate metric (U-CAG-WARM-RATE-LEGACY-QUARANTINE) was built to measure.
//
// COMPOSES (R8, does NOT duplicate):
//   - galaxy-reasoning-bridge.mjs `reasonForGalaxy` -- the CAG/RAG engine (auto-
//     records CAG telemetry via recordCagStat; we just drive it in a loop).
//   - galaxy-mining-registry.mjs `GALAXY_KEYS` -- the canonical 34-galaxy list.
//   - hermes-cron-prewarm.mjs is DISTINCT (it warms the Ollama MODEL into VRAM;
//     this warms the CAG CACHE) -- complementary, run prewarm first off-hours if
//     the model is cold.
//
// DURABILITY + SAFETY (the box-cascade + xray-OCR-resumable lessons):
//   - RESUMABLE: a per-galaxy cursor (state/shared/cag-warm-cursor.jsonl) is appended
//     AFTER each galaxy completes, so a reaper kill / box-pressure abort mid-sweep
//     resumes at the next galaxy on the following run (re-warm = 0 wasted Ollama).
//   - C:-FREE ABORT FLOOR: before each galaxy, check os.freemem() (a pure syscall,
//     no disk, no 550MB graph load) against a floor; below it -> write cursor + exit
//     gracefully so we never deepen a memory cascade. NEVER loads the system graph.
//   - PER-GALAXY try/catch: one galaxy's failure (missing docs / Ollama blip) drops
//     that galaxy to an error row and the sweep continues (fail-soft, R12-honest count).
//
// Run (manual):   node H:/prism/scripts/cag-galaxy-warm-sweep.mjs --resume [--limit N] [--dry-run]
// Run (cron):     installed by .claude/helpers/install-cag-warm-task.ps1 (nightly, --resume)
// Knobs: PRISM_CAG_WARM_RAM_FLOOR_MB (default 6144) - PRISM_CAG_WARM_QUERY_TIMEOUT_MS (default 90000)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.env.PRISM_ROOT || "H:/prism";
const CURSOR_PATH = path.join(REPO_ROOT, "state/shared/cag-warm-cursor.jsonl");
const DEFAULT_RAM_FLOOR_MB = Number(process.env.PRISM_CAG_WARM_RAM_FLOOR_MB) || 6144;
const DEFAULT_QUERY_TIMEOUT_MS = Number(process.env.PRISM_CAG_WARM_QUERY_TIMEOUT_MS) || 90000;

// -- Canonical warming queries --
// The galaxy-agnostic questions most likely to be RE-asked of ANY galaxy (so
// warming them yields real future hits, not just more cold first-asks). Kept small
// (3) so a full 34-galaxy sweep is ~102 Ollama calls -- bounded for an off-hours run.
// These mirror the shape of real galaxy-reasoning lookups seen in the CAG telemetry.
export const BASE_WARMING_QUERIES = Object.freeze([
  "what are the key safety constraints and failure modes for this galaxy",
  "what is this galaxy's primary capability and how does it fit the PRISM pipeline",
  "what are the most common operations and their canonical inputs for this galaxy",
]);

/**
 * Pure: the warming query set for a galaxy. Base set today (galaxy-agnostic, high
 * re-ask probability); extensible per-galaxy later without changing callers.
 */
export function warmingQueriesFor(galaxy) {
  if (!galaxy || typeof galaxy !== "string") return [];
  return [...BASE_WARMING_QUERIES];
}

/**
 * Pure: parse the resume cursor jsonl into a Set of completed galaxy keys.
 * Fail-soft: malformed/empty lines are skipped (a torn last line never aborts).
 *
 * CYCLE-AWARENESS (opts.maxAgeHours): with no opts (or maxAgeHours<=0) a galaxy counts as done if it
 * has ANY cursor row -- the within-a-single-run resume semantic. The DAILY cron passes
 * {maxAgeHours, nowMs} so a galaxy counts as done ONLY if warmed within the window: yesterday's rows
 * are stale -> the galaxy re-warms (catching galaxies whose doctrine docs changed). Without this the
 * cron would no-op forever after the first full sweep (all 34 marked done permanently). A row whose
 * `at` is missing/unparseable is treated as stale (re-warm) when the window is active.
 */
export function parseCursorDone(cursorText, opts = {}) {
  const done = new Set();
  if (typeof cursorText !== "string" || !cursorText.length) return done;
  const maxAgeHours = Number(opts.maxAgeHours) || 0;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : null;
  const cutoffMs = maxAgeHours > 0 && nowMs !== null ? nowMs - maxAgeHours * 3600 * 1000 : null;
  for (const line of cursorText.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      if (!o || typeof o.galaxy !== "string") continue;
      if (cutoffMs !== null) {
        const at = Date.parse(o.at);
        if (!Number.isFinite(at) || at < cutoffMs) continue; // stale/undated -> re-warm this cycle
      }
      done.add(o.galaxy);
    } catch { /* skip torn/partial line (fail-soft) */ }
  }
  return done;
}

/**
 * Pure: split the galaxy list into {pending, done} given the done-set. Preserves
 * input order so the sweep is deterministic + resumes exactly where it left off.
 */
export function partitionByResumeCursor(galaxies, doneSet) {
  const done = doneSet instanceof Set ? doneSet : new Set();
  const pending = [];
  const skipped = [];
  for (const g of Array.isArray(galaxies) ? galaxies : []) {
    if (done.has(g)) skipped.push(g);
    else pending.push(g);
  }
  return { pending, done: skipped };
}

/**
 * Pure: the C:-free abort floor (box-cascade lesson). True when free RAM has
 * dropped below the floor -> the sweep must stop gracefully (write cursor + exit)
 * rather than deepen a memory cascade. os.freemem() is the only signal (a syscall,
 * never the 550MB graph). floorMb<=0 disables the floor (never abort).
 */
export function shouldAbortForPressure(freeBytes, floorMb = DEFAULT_RAM_FLOOR_MB) {
  if (!Number.isFinite(floorMb) || floorMb <= 0) return false;
  if (!Number.isFinite(freeBytes) || freeBytes < 0) return false; // unknown -> don't abort
  return freeBytes < floorMb * 1024 * 1024;
}

/**
 * Pure: aggregate per-query results into a run summary. Each result is
 * {galaxy, query, cached, ok}. cached=true -> warm HIT (no Ollama); cached=false&ok
 * -> cold MISS (Ollama ran + cached for next time); ok=false -> error row.
 */
export function summarizeWarmRun(results) {
  const r = Array.isArray(results) ? results : [];
  const galaxies = new Set();
  let hits = 0, ollamaCalls = 0, errors = 0;
  for (const x of r) {
    if (!x || typeof x !== "object") continue;
    if (x.galaxy) galaxies.add(x.galaxy);
    if (x.ok === false) { errors++; continue; }
    if (x.cached === true) hits++;
    else ollamaCalls++;
  }
  const queries = hits + ollamaCalls + errors;
  const warmRate = queries - errors > 0 ? hits / (queries - errors) : null;
  return { galaxiesWarmed: galaxies.size, queries, cacheHits: hits, ollamaCalls, errors, warmRate };
}

/**
 * Pure: classify a `reasonForGalaxy` return into {ok, cached, degraded}. The bridge
 * has FOUR shapes: {ok:true,cached:true} warm hit | {ok:true,cached:false} cold-warmed |
 * {ok:true,degraded:true,error} Ollama down/timed-out (NO cache written) | {ok:false} hard
 * fail. The DEGRADED shape carries ok:true but did NOT warm the cache, so it MUST count as
 * a failure -- otherwise the galaxy gets cursor-marked done + permanently skipped on resume
 * while still cold (the silent-skip bug, scrutiny arm C P1). degraded -> ok:false here.
 */
export function classifyResult(r) {
  if (!r || typeof r !== "object") return { ok: false, cached: false, degraded: false };
  const degraded = r.degraded === true;
  const ok = r.ok !== false && !degraded;
  const cached = r.cached === true;
  return { ok, cached, degraded };
}

// -- Side-effectful runner (skipped under unit import) --

/**
 * Pure: the cursor path for a warming MODE. The deep (gpt-oss:120b) reasoning cache is keyed
 * SEPARATELY from the default (qwen2.5-coder:32b) cache in the CAG store, so the two modes MUST use
 * separate resume cursors -- otherwise a deep warm marks a galaxy "done" and a default --resume skips
 * it (or vice-versa) while that mode's cache is still cold. Deep -> `<base>-deep.jsonl`.
 */
export function cursorPathFor(deep, basePath = CURSOR_PATH) {
  return deep ? String(basePath).replace(/\.jsonl$/, "-deep.jsonl") : basePath;
}

function appendCursor(galaxy, counts, ts, cursorPath = CURSOR_PATH) {
  try {
    const row = JSON.stringify({ galaxy, ...counts, at: ts }) + "\n";
    fs.appendFileSync(cursorPath, row);
  } catch { /* cursor is best-effort; a write failure just re-warms next run */ }
}

function parseArgs(argv) {
  const a = { limit: 0, resume: false, dryRun: false, galaxy: null, ramFloorMb: DEFAULT_RAM_FLOOR_MB, maxAgeHours: 0, deep: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--resume") a.resume = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--limit") a.limit = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (t === "--galaxy") a.galaxy = argv[++i] || null;
    else if (t === "--ram-floor-mb") a.ramFloorMb = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (t === "--max-age-hours") a.maxAgeHours = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (t === "--deep") a.deep = true; // warm the DEEP-reasoning cache (gpt-oss:120b) instead of the default
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Lazy-import the heavy deps so the module stays cheaply importable by tests.
  const { GALAXY_KEYS } = await import("./lib/galaxy-mining-registry.mjs");
  const allGalaxies = args.galaxy ? [args.galaxy] : [...GALAXY_KEYS];

  const cursorPath = cursorPathFor(args.deep);
  let doneSet = new Set();
  if (args.resume) {
    try {
      doneSet = parseCursorDone(fs.readFileSync(cursorPath, "utf8"), { maxAgeHours: args.maxAgeHours, nowMs: Date.now() });
    } catch { /* no cursor yet */ }
  }
  const { pending, done } = partitionByResumeCursor(allGalaxies, doneSet);
  let queue = pending;
  if (args.limit > 0) queue = queue.slice(0, args.limit);

  const stamp = new Date().toISOString();
  const results = [];
  let aborted = false;

  let reasonForGalaxy = null;
  if (!args.dryRun) {
    ({ reasonForGalaxy } = await import("./lib/galaxy-reasoning-bridge.mjs"));
  }

  for (const galaxy of queue) {
    const free = os.freemem();
    if (shouldAbortForPressure(free, args.ramFloorMb)) {
      aborted = true;
      process.stderr.write(`[cag-warm] ABORT (RAM floor): free=${Math.round(free / 1048576)}MB < ${args.ramFloorMb}MB -- resume next run\n`);
      break;
    }
    const queries = warmingQueriesFor(galaxy);
    let gHits = 0, gMiss = 0, gErr = 0;
    for (const q of queries) {
      if (args.dryRun) { results.push({ galaxy, query: q, cached: null, ok: true, dryRun: true }); continue; }
      try {
        const r = await reasonForGalaxy(galaxy, q, { timeoutMs: args.deep ? DEFAULT_QUERY_TIMEOUT_MS * 3 : DEFAULT_QUERY_TIMEOUT_MS, deep: args.deep });
        const { ok, cached } = classifyResult(r);
        results.push({ galaxy, query: q, cached, ok });
        if (!ok) gErr++; else if (cached) gHits++; else gMiss++;
      } catch (e) {
        results.push({ galaxy, query: q, cached: false, ok: false, error: String(e && e.message) });
        gErr++;
      }
    }
    // Cursor-mark a galaxy DONE only when every query warmed cleanly (gErr===0). A galaxy with
    // any error/degraded query is left OUT of the cursor so the next --resume retries it (rather
    // than silently skipping a never-warmed galaxy forever -- scrutiny arm C P1). Re-warm of the
    // already-warmed queries is a cheap idempotent cache hit.
    if (!args.dryRun && gErr === 0) appendCursor(galaxy, { hits: gHits, miss: gMiss, err: gErr }, stamp, cursorPath);
  }

  const summary = summarizeWarmRun(results);
  process.stdout.write(JSON.stringify({
    ok: true,
    dryRun: args.dryRun,
    aborted,
    totalGalaxies: allGalaxies.length,
    alreadyDone: done.length,
    attempted: queue.length,
    ...summary,
    mode: args.deep ? "deep" : "default",
    cursor: cursorPath,
  }, null, 2) + "\n");
}

// Only run as CLI (not when imported by tests).
const __isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (__isMain) {
  main().catch((e) => { process.stderr.write(`[cag-warm] fatal: ${String(e && e.stack || e)}\n`); process.exit(1); });
}
