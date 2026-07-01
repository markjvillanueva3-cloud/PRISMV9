#!/usr/bin/env node
// scripts/blueprint-accuracy-consumer.mjs
//
// BLUEPRINT-OCR-TRAINING-MS2/U-BPA-CONSUMER — offline consumer CLI.
//
// Reads blueprint-accuracy-events.jsonl (written by the MS1
// `.claude/hooks/blueprint-accuracy-guard.mjs` PostToolUse hook) and:
//   1. Applies events to the rolling window in its OWN `blueprint-accuracy-consumer-state.json`
//      (NEVER the hook's `blueprint-accuracy-state.json` -- separate states, see lib docstring)
//   2. Tracks lastProcessedOffset for idempotent re-runs
//   3. Emits a daily consolidation summary to a dated ledger file
//   4. Prints xproc_* action dispatches the operator can route through prism_ai
//
// Pure logic lives in scripts/lib/blueprint-accuracy-consumer-lib.mjs — this
// CLI only does the I/O.
//
// USAGE:
//   node scripts/blueprint-accuracy-consumer.mjs            # once, default paths
//   node scripts/blueprint-accuracy-consumer.mjs --dry-run  # no writes
//   node scripts/blueprint-accuracy-consumer.mjs --json     # machine-readable summary
//   node scripts/blueprint-accuracy-consumer.mjs --dispatch-plan  # also emit the resolved {action,params} xproc plan (ready-to-route)
//   node scripts/blueprint-accuracy-consumer.mjs --reset    # zero the state file (DESTRUCTIVE -- opt-in)
//
// KNOBS:
//   PRISM_BPA_EVENTS_FILE — override events JSONL path
//   PRISM_BPA_STATE_FILE — override state JSON path
//   PRISM_BPA_LEDGER_DIR — override daily ledger output dir
//   PRISM_BPA_WINDOW_CAP — rolling window cap (default 50, clamp 5..500)
//   PRISM_BPA_CONSOLIDATE_THRESHOLD — outcomes-since-consolidate threshold (default 25)

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, exit, env } from "node:process";

import {
  parseEventsBlob,
  applyEvents,
  migrateState,
  buildConsolidationSummary,
  advanceOffset,
  STATE_SCHEMA_VERSION,
  DEFAULT_WINDOW_CAP,
  DEFAULT_CONSOLIDATE_THRESHOLD,
  CONSUMER_STATE_FILENAME,
} from "./lib/blueprint-accuracy-consumer-lib.mjs";
import { resolveDispatch } from "./lib/blueprint-loop-drain-lib.mjs";

// ── Defaults ───────────────────────────────────────────────────────

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "..");
const DEFAULT_EVENTS_FILE = env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");
// Dedicated consumer state file -- NEVER the hook's `blueprint-accuracy-state.json`.
// The hook owns that path for its drift rolling-window (schemaVersion:1) and resets
// any non-v1 file it finds, which would clobber our lastProcessedOffset and force a
// full-ledger re-process every run (U-BPA-CONSUMER-STATE-ISOLATE, slot:india). The
// PRISM_BPA_STATE_FILE override still wins for tests/operators who want a custom path.
const DEFAULT_STATE_FILE = env.PRISM_BPA_STATE_FILE || join(REPO_ROOT, "state", "shared", CONSUMER_STATE_FILENAME);
const DEFAULT_LEDGER_DIR = env.PRISM_BPA_LEDGER_DIR || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-ledger");

const ARGS = new Set(argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const JSON_OUT = ARGS.has("--json");
const RESET = ARGS.has("--reset");
// --dispatch-plan: additionally emit the RESOLVED {action,params} xproc dispatch
// list (the machine-consumable, ready-to-route plan) for each processed event.
// This is what the in-process prism_ai drainer (next unit) consumes; the CLI
// itself stays print-only (it cannot reach an MCP dispatcher).
const DISPATCH_PLAN = ARGS.has("--dispatch-plan");

// ── Helpers ────────────────────────────────────────────────────────

/** Atomic write: write to tmp, rename over target. Survives mid-write crashes. */
function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── Main ───────────────────────────────────────────────────────────

function main() {
  const result = {
    eventsFile: DEFAULT_EVENTS_FILE,
    stateFile: DEFAULT_STATE_FILE,
    ledgerDir: DEFAULT_LEDGER_DIR,
    eventsFileExists: existsSync(DEFAULT_EVENTS_FILE),
    eventsFileSize: 0,
    priorOffset: 0,
    newOffset: 0,
    parsedEvents: 0,
    malformedCount: 0,
    processedCount: 0,
    droppedFromWindow: 0,
    actions: [],
    summary: null,
    dryRun: DRY_RUN,
    reset: RESET,
    writes: [],
  };

  // RESET path -- wipe the consumer state file back to clean v2 baseline. Opt-in only.
  if (RESET) {
    const fresh = migrateState(null);
    if (!DRY_RUN) {
      atomicWriteJson(DEFAULT_STATE_FILE, fresh);
      result.writes.push(DEFAULT_STATE_FILE);
    }
    result.note = "reset complete -- consumer state file reset to v2 baseline";
    return result;
  }

  // Load current state (or migrate from v1/empty).
  const prior = readJsonIfExists(DEFAULT_STATE_FILE);
  let state = migrateState(prior);
  result.priorOffset = state.lastProcessedOffset;

  // Load events file. If it doesn't exist, the hook hasn't fired yet — that's
  // fine, we exit clean (R12: report it, don't pretend we did work).
  if (!result.eventsFileExists) {
    result.note = "events file does not exist yet (hook has not fired with extraction tool inputs)";
    return result;
  }

  const stat = statSync(DEFAULT_EVENTS_FILE);
  result.eventsFileSize = stat.size;

  // If the file shrank below our offset, the hook rotated it — reset offset to 0.
  if (stat.size < state.lastProcessedOffset) {
    state.lastProcessedOffset = 0;
    result.note = `events file shrank (size=${stat.size} < priorOffset=${result.priorOffset}) — assuming rotation, offset reset to 0`;
  }

  // Read only the unconsumed tail. fs.readFileSync + slice on byte boundary —
  // safe because we wrote UTF-8 newline-terminated JSONL (no multi-byte
  // splits at line boundaries).
  const fullBlob = readFileSync(DEFAULT_EVENTS_FILE, "utf8");
  const fullBuf = Buffer.from(fullBlob, "utf8");
  const tailBuf = fullBuf.subarray(state.lastProcessedOffset);
  const tailBlob = tailBuf.toString("utf8");

  const parsed = parseEventsBlob(tailBlob);
  result.parsedEvents = parsed.events.length;
  result.malformedCount = parsed.malformedCount;

  const windowCap = Number(env.PRISM_BPA_WINDOW_CAP) || DEFAULT_WINDOW_CAP;
  const consolidateThreshold = Number(env.PRISM_BPA_CONSOLIDATE_THRESHOLD) || DEFAULT_CONSOLIDATE_THRESHOLD;

  const { state: newState, actions, summary } = applyEvents(state, parsed.events, {
    windowCap,
    consolidateThreshold,
  });

  newState.lastProcessedOffset = advanceOffset(state.lastProcessedOffset, tailBuf.length);
  result.newOffset = newState.lastProcessedOffset;
  result.processedCount = summary.processedCount;
  result.droppedFromWindow = summary.droppedFromWindow;
  result.actions = actions;
  if (DISPATCH_PLAN) result.dispatchPlan = actions.map(resolveDispatch);
  result.summary = summary;

  if (!DRY_RUN) {
    atomicWriteJson(DEFAULT_STATE_FILE, newState);
    result.writes.push(DEFAULT_STATE_FILE);

    // Emit daily ledger entry summarizing this consumer pass.
    const ledgerEntry = buildConsolidationSummary(newState);
    ledgerEntry.run = {
      ts: new Date().toISOString(),
      processedCount: summary.processedCount,
      droppedFromWindow: summary.droppedFromWindow,
      actionsEmitted: actions.length,
      consolidationTriggeredByEvent: summary.consolidationTriggeredByEvent,
      consolidationTriggeredByThreshold: summary.consolidationTriggeredByThreshold,
    };
    const ledgerPath = join(DEFAULT_LEDGER_DIR, `blueprint-accuracy-${todayUtc()}.json`);
    atomicWriteJson(ledgerPath, ledgerEntry);
    result.writes.push(ledgerPath);
  }

  return result;
}

const out = main();

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`[bpa-consumer] events=${out.eventsFile}`);
  console.log(`[bpa-consumer] state=${out.stateFile}`);
  if (out.note) console.log(`[bpa-consumer] note: ${out.note}`);
  console.log(`[bpa-consumer] offset: ${out.priorOffset} -> ${out.newOffset}`);
  console.log(`[bpa-consumer] events parsed=${out.parsedEvents} malformed=${out.malformedCount} processed=${out.processedCount} dropped=${out.droppedFromWindow}`);
  console.log(`[bpa-consumer] actions to dispatch via prism_ai: ${out.actions.length}`);
  for (const a of out.actions.slice(0, 10)) {
    console.log(`  - ${a.xproc_action}  (event_type=${a.event_type})`);
  }
  if (out.actions.length > 10) {
    console.log(`  ... and ${out.actions.length - 10} more`);
  }
  if (out.dispatchPlan) {
    console.log(`[bpa-consumer] resolved dispatch plan (ready-to-route): ${out.dispatchPlan.length}`);
    for (const d of out.dispatchPlan.slice(0, 10)) {
      console.log(`  -> ${d.action ?? "(unresolvable)"}  params=${JSON.stringify(d.params)}`);
    }
    if (out.dispatchPlan.length > 10) {
      console.log(`  ... and ${out.dispatchPlan.length - 10} more`);
    }
  }
  if (out.dryRun) {
    console.log(`[bpa-consumer] DRY RUN — no files written`);
  } else if (out.writes.length) {
    console.log(`[bpa-consumer] wrote: ${out.writes.length} file(s)`);
    for (const w of out.writes) console.log(`  - ${w}`);
  }
}

exit(0);
