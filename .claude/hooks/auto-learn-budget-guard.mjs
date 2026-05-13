#!/usr/bin/env node
// tier: T1
/**
 * auto-learn-budget-guard — AUTO-LEARNING-LOOP-MS0 / U-ALL11
 * ===========================================================
 *
 * Pre-dispatch hook. Reads the daily research-dispatch counter and
 * the daily cost counter. If either is at/above its cap, returns
 * `{ continue: false, reason: "budget_exhausted" }` so the upstream
 * dispatcher (`prism_ai:auto_research_dispatch`, U-ALL03) sees the
 * budget hit and defers the call to tomorrow's quota.
 *
 * State file: `state/shared/auto-learning/budget-counter.json`
 *   {
 *     "schemaVersion": 1,
 *     "dayKey": "YYYY-MM-DD",
 *     "dispatches": <int>,    // count since dayKey
 *     "cost_usd": <float>     // cumulative cost since dayKey
 *   }
 *
 * Defaults (per spec § U-ALL11):
 *   - dispatch cap = 12 (env `PRISM_AUTOLEARN_DAILY_DISPATCHES`)
 *   - cost cap     = $20 (env `PRISM_AUTOLEARN_DAILY_COST_USD`)
 *
 * Day rollover: the engine resets `dispatches` + `cost_usd` to 0
 * whenever `dayKey` differs from `utcDayKey(Date.now())`. This is
 * idempotent — every guard invocation checks rollover before
 * comparing against caps. UTC-internal (no DST drift).
 *
 * Increment contract: the hook returns the CURRENT counter snapshot.
 * Callers (the dispatcher or a wrapper script) must update the
 * counter AFTER a dispatch lands. This separation keeps the hook
 * pure-read on the gate path (no double-increment risk).
 *
 * Invocation modes:
 *   - As a hook (default): reads stdin JSON, writes guarded response to stdout.
 *   - As a library (export `evaluateBudget(opts)`): returns the verdict object.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export const STATE_FILE = "state/shared/auto-learning/budget-counter.json";
export const SCHEMA_VERSION = 1;
export const DEFAULT_DAILY_DISPATCHES = 12;
export const DEFAULT_DAILY_COST_USD = 20.0;

export function utcDayKey(epochMs) {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function freshState(dayKey) {
  return {
    schemaVersion: SCHEMA_VERSION,
    dayKey,
    dispatches: 0,
    cost_usd: 0,
  };
}

export function loadState(json, now = Date.now) {
  const today = utcDayKey(now());
  let parsed = null;
  if (typeof json === "string" && json.length > 0) {
    try {
      parsed = JSON.parse(json);
    } catch {
      // Corrupt → start fresh.
      return freshState(today);
    }
  }
  if (!parsed || typeof parsed !== "object") return freshState(today);
  if (parsed.schemaVersion !== SCHEMA_VERSION) return freshState(today);
  if (parsed.dayKey !== today) return freshState(today);
  return {
    schemaVersion: SCHEMA_VERSION,
    dayKey: parsed.dayKey,
    dispatches: Number.isFinite(parsed.dispatches) ? Math.max(0, Math.floor(parsed.dispatches)) : 0,
    cost_usd: Number.isFinite(parsed.cost_usd) ? Math.max(0, Number(parsed.cost_usd)) : 0,
  };
}

/**
 * Decide whether the next dispatch is allowed. Pure function — no
 * I/O. Tests call this directly with hand-built state.
 */
export function evaluateBudget(opts) {
  const {
    state,
    dispatchCap = DEFAULT_DAILY_DISPATCHES,
    costCap = DEFAULT_DAILY_COST_USD,
    estimatedCostUsd = 0,
  } = opts;
  const dispatches = Number.isFinite(state?.dispatches) ? state.dispatches : 0;
  const cost = Number.isFinite(state?.cost_usd) ? state.cost_usd : 0;
  if (dispatches >= dispatchCap) {
    return {
      decision: "block",
      reason: "dispatch_budget_exhausted",
      dispatches,
      cost_usd: cost,
      dispatchCap,
      costCap,
    };
  }
  if (cost + estimatedCostUsd > costCap) {
    return {
      decision: "block",
      reason: "cost_budget_exhausted",
      dispatches,
      cost_usd: cost,
      dispatchCap,
      costCap,
    };
  }
  return {
    decision: "allow",
    reason: null,
    dispatches,
    cost_usd: cost,
    dispatchCap,
    costCap,
    remaining_dispatches: dispatchCap - dispatches,
    remaining_cost_usd: Math.max(0, costCap - cost),
  };
}

export function recordDispatch(state, costUsd = 0) {
  return {
    schemaVersion: SCHEMA_VERSION,
    dayKey: state.dayKey,
    dispatches: state.dispatches + 1,
    cost_usd: state.cost_usd + Math.max(0, Number(costUsd) || 0),
  };
}

export function persistState(path, state) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

// Hook entry-point — reads stdin event JSON, decides, returns hook response.
async function main() {
  let stdinBuf = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) stdinBuf += chunk;
  const event = stdinBuf.length > 0 ? safeJson(stdinBuf) : {};
  const dispatchCap = Number(process.env.PRISM_AUTOLEARN_DAILY_DISPATCHES ?? DEFAULT_DAILY_DISPATCHES);
  const costCap = Number(process.env.PRISM_AUTOLEARN_DAILY_COST_USD ?? DEFAULT_DAILY_COST_USD);

  let stateJson = "";
  if (existsSync(STATE_FILE)) {
    try {
      stateJson = readFileSync(STATE_FILE, "utf8");
    } catch {
      // unreadable — fall through to fresh.
    }
  }
  const state = loadState(stateJson);
  const estimatedCostUsd = Number(event?.estimated_cost_usd) || 0;
  const verdict = evaluateBudget({ state, dispatchCap, costCap, estimatedCostUsd });

  if (verdict.decision === "block") {
    // Conventional hook response for "deny this tool call".
    process.stdout.write(JSON.stringify({
      continue: false,
      systemMessage: `[auto-learn-budget-guard] BLOCKED: ${verdict.reason} (dispatches=${verdict.dispatches}/${verdict.dispatchCap}, cost=$${verdict.cost_usd.toFixed(2)}/$${verdict.costCap})`,
    }) + "\n");
    process.exit(0);
  }
  // Allow — emit informational system message + carry on.
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: `[auto-learn-budget-guard] OK: ${verdict.remaining_dispatches} dispatches + $${verdict.remaining_cost_usd.toFixed(2)} remaining today`,
  }) + "\n");
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// Run main only when invoked as a script — skip when imported by tests.
const invokedDirectly = process.argv[1] && /auto-learn-budget-guard\.mjs$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`[auto-learn-budget-guard] error: ${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
