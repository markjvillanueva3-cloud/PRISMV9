#!/usr/bin/env node
/**
 * hermes-fleet-sweep.mjs -- the durable idle Hermes FLEET SWEEP cron shell (HERMES-FLEET-MAXOUT/U-CRON).
 *
 * COMPOSES the proven harness (R8 -- builds NO new runner): each eligible tick fires
 * scripts/hermes-work-loop-driver.mts (--gate), which fans parallel Hermes agents on the FREE
 * NVIDIA lane + Obsidian vault over the next batch of OPEN fleet units (roadmap / research /
 * unwired-engine). The sweep adds ONLY the quota-aware scheduling envelope around it
 * (scripts/lib/hermes-fleet-sweep-plan.mjs: per-UTC-day budget + min-interval + idle-scaled width)
 * so the fleet "covers more ground" autonomously, $0 / off-Claude -- the operator's "parallel
 * Hermes agents ... crons until ... complete ... cover more ground since it's free".
 *
 * DEFAULT-OFF (conservative until the NVIDIA NGC quota is characterized -- R12). The sweep PLANS
 * every tick but only SPAWNS the driver when PRISM_HERMES_FLEET_SWEEP=1 (the single arming control,
 * set by the installer's -GateEnv). Un-armed: it prints the plan + records a "would-fire" ledger
 * row and spawns nothing. The driver's OWN runner gate (--gate, passed here) is the second gate.
 *
 * State : state/shared/hermes-fleet-sweep-state.json  (budgetDay, dailyCallsUsed, lastSweepMs, sweeps)
 * Ledger: state/shared/hermes-fleet-sweep-ledger.jsonl (one append-only receipt per tick)
 *
 * Exit ALWAYS 0 (advisory cron -- a driver failure is RECORDED, never a non-zero that alarms the
 * scheduler). Usage: node scripts/hermes-fleet-sweep.mjs [--dry-run] [--json] [--quiet]
 *   --dry-run : plan + record, but never spawn the driver even when armed (proves the envelope $0)
 *
 * Exported for tests: readState, writeState, readIdleSlots, extractDriverSummary, runSweep.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { planSweep, resolveSweepOpts, applySweepOutcome, idleSlotCount } from "./lib/hermes-fleet-sweep-plan.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const STATE_PATH = path.join(REPO_ROOT, "state", "shared", "hermes-fleet-sweep-state.json");
const LEDGER_PATH = path.join(REPO_ROOT, "state", "shared", "hermes-fleet-sweep-ledger.jsonl");
const DRIVER = path.join(REPO_ROOT, "scripts", "hermes-work-loop-driver.mts");
const TSX_CLI = path.join(REPO_ROOT, "mcp-server", "node_modules", "tsx", "dist", "cli.mjs");
const CHAT_SLOTS_JSON = path.join(REPO_ROOT, "state", "shared", "chat-slots.json");
const LEDGER_SCHEMA_VERSION = "1.0.0";
const MAX_SUMMARY_SCAN_TRIES = 200; // bound the driver-stdout brace scan (pathological input must not hang)

/** True iff the sweep is armed to actually spawn the driver (the single arming control). */
export function isArmed(env = process.env) {
  return /^(1|on|true|yes)$/i.test(String(env.PRISM_HERMES_FLEET_SWEEP || ""));
}

/** Read the persisted sweep state; fail-soft to {} (a missing/corrupt file = a fresh first run). */
export function readState(p = STATE_PATH, readFile = (f) => fs.readFileSync(f, "utf8")) {
  try {
    const j = JSON.parse(readFile(p));
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

/** Persist the sweep state (pretty JSON). */
export function writeState(state, p = STATE_PATH, writeFile = (f, d) => fs.writeFileSync(f, d)) {
  writeFile(p, JSON.stringify(state, null, 2) + "\n");
}

/** Idle-slot count from the live chat-slots.json; fail-soft to 0 (sweep then fires at floor width). */
export function readIdleSlots(nowMs, p = CHAT_SLOTS_JSON, readFile = (f) => fs.readFileSync(f, "utf8")) {
  try {
    return idleSlotCount(JSON.parse(readFile(p)), nowMs);
  } catch {
    return 0;
  }
}

/** Append one schema-stamped receipt row to the sweep ledger (pure w.r.t. logic). */
function appendLedger(receipt, deps) {
  const append = deps?.append ?? ((f, line) => fs.appendFileSync(f, line));
  const row = { schemaVersion: LEDGER_SCHEMA_VERSION, ...receipt };
  append(LEDGER_PATH, JSON.stringify(row) + "\n");
  return row;
}

/**
 * Extract the driver's summary JSON from its stdout. The driver prints ONLY its summary object on
 * stdout under --json --quiet, but a child ask-hermes notice could leak a line; parse defensively
 * by scanning for the last brace-balanced JSON object. Returns {} if none parses.
 */
export function extractDriverSummary(stdout) {
  const s = String(stdout || "");
  // fast path: the whole thing is the JSON object
  try { const j = JSON.parse(s.trim()); if (j && typeof j === "object") return j; } catch { /* fall through */ }
  // Scan from the last '{' backwards for the first balanced parse. BOUNDED so pathological
  // input (e.g. many open braces) cannot hang: (a) break at index 0 -- `lastIndexOf("{", -1)`
  // returns 0 (NOT -1) per spec, so without this guard any input starting with '{' loops
  // forever; (b) cap total attempts (the real summary parses within the first few tries).
  let i = s.lastIndexOf("{");
  let tries = 0;
  while (i >= 0 && tries < MAX_SUMMARY_SCAN_TRIES) {
    try { const j = JSON.parse(s.slice(i)); if (j && typeof j === "object") return j; } catch { /* keep scanning */ }
    if (i === 0) break;
    i = s.lastIndexOf("{", i - 1);
    tries++;
  }
  return {};
}

/**
 * One sweep tick. Pure-ish orchestration: reads state/idle, plans, optionally spawns the driver,
 * folds the outcome, persists. All side-effecting deps are injectable for tests.
 */
export function runSweep(argv = [], deps = {}) {
  const json = argv.includes("--json");
  const quiet = argv.includes("--quiet");
  const dryRun = argv.includes("--dry-run");
  const now = deps.now ?? (() => Date.now());
  const env = deps.env ?? process.env;
  const log = deps.log ?? ((m) => { if (!quiet) process.stderr.write(m + "\n"); });

  const nowMs = now();
  const opts = resolveSweepOpts(env);
  const state = (deps.readState ?? readState)();
  const idleSlots = (deps.readIdleSlots ?? readIdleSlots)(nowMs);
  const plan = planSweep(
    { nowMs, idleSlots, lastSweepMs: state.lastSweepMs, dailyCallsUsed: state.dailyCallsUsed, budgetDay: state.budgetDay },
    opts,
  );
  const armed = (deps.isArmed ?? isArmed)(env);

  // Helper to finish: record a ledger row + emit.
  const finish = (extra) => {
    const receipt = { stampedAt: new Date(nowMs).toISOString(), idleSlots, armed, dryRun, plan, ...extra };
    (deps.appendLedger ?? appendLedger)(receipt, deps);
    if (json) process.stdout.write(JSON.stringify(receipt) + "\n");
    return { exitCode: 0, receipt };
  };

  // Not eligible this tick (budget / interval) -> record + done, no state mutation.
  if (!plan.fire) {
    log(`fleet-sweep: NO FIRE (${plan.reason}); idle=${idleSlots} remaining=${plan.remaining}`);
    return finish({ fired: false, agentsFired: 0 });
  }

  // Eligible but not armed -> would-fire, spawn nothing, no budget spent.
  if (!armed || dryRun) {
    const why = dryRun ? "dry-run" : "not-armed (set PRISM_HERMES_FLEET_SWEEP=1 to arm)";
    log(`fleet-sweep: WOULD FIRE ${plan.maxUnits} unit(s) x${plan.maxParallel} -- ${why}; spawning nothing`);
    return finish({ fired: false, agentsFired: 0, wouldFire: true, suppressedReason: why });
  }

  // Armed + eligible -> spawn the proven driver (gated), parse ranAgents, fold + persist.
  const spawn = deps.spawn ?? ((exe, args) =>
    execFileSync(exe, args, { encoding: "utf8", windowsHide: true, timeout: 20 * 60_000, maxBuffer: 16 * 1024 * 1024 }));
  let summary = {};
  let driverError;
  try {
    const out = spawn(process.execPath, [
      TSX_CLI, DRIVER, "--gate",
      "--max-units", String(plan.maxUnits),
      "--max-parallel", String(plan.maxParallel),
      "--json", "--quiet",
    ]);
    summary = extractDriverSummary(out);
  } catch (e) {
    driverError = `driver spawn failed: ${e?.message || e}`;
    log(`fleet-sweep: ${driverError}`);
  }

  const agentsFired = Number.isFinite(summary.ranAgents) ? summary.ranAgents : 0;
  const nextState = applySweepOutcome(state, { nowMs, agentsFired });
  try { (deps.writeState ?? writeState)(nextState); } catch (e) { log(`fleet-sweep: state write failed: ${e?.message || e}`); }
  log(`fleet-sweep: FIRED -- agents=${agentsFired} picked=${summary.picked ?? "?"} (today ${nextState.dailyCallsUsed}/${opts.dailyBudget})`);
  return finish({ fired: true, agentsFired, driverSummary: summary, driverError, nextState });
}

// run-as-main (Windows-safe basename guard).
const _direct = (() => {
  try { return path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (_direct) {
  const { exitCode } = runSweep(process.argv.slice(2));
  process.exit(exitCode);
}
