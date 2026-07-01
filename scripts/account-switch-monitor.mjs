#!/usr/bin/env node
/**
 * account-switch-monitor.mjs -- cron-callable auto-trigger wrapper for the account-switch coordinator.
 *
 * OPERATOR GAP THIS CLOSES (2026-06-15):
 *   The account-switch-restart-coordinator.mjs already DETECTS the 90%-of-5h-limit signal,
 *   DECIDES whether to switch, and (with --apply) ACTUATES the credential swap + staggered
 *   fleet restart. But nothing auto-fired it on a schedule -- the operator had to run it by
 *   hand. This wrapper is what a Windows Scheduled Task runs every N minutes to close that gap.
 *
 * SAFETY MODEL (read before enabling):
 *   Real actuation (credential swap + fleet restart) is OFF unless env
 *   PRISM_ACCT_SWITCH_AUTO_APPLY=1. The default (omitted or "0") is DRY-RUN:
 *     - the coordinator still runs and detects 5h pressure
 *     - it still emits the switch advisory to stderr
 *     - it does NOT swap accounts, does NOT restart chats
 *   So installing the scheduled task is SAFE until the operator:
 *     (a) captures >=2 accounts  (claude logout / claude login cycle)
 *     (b) calibrates PRISM_5H_WEIGHTED_TOKEN_TRIGGER (the coordinator's 90% gate source)
 *     (c) sets PRISM_ACCT_SWITCH_AUTO_APPLY=1 on the task environment
 *
 * OUTPUT:
 *   Each tick appends one JSON record to state/shared/account-switch-monitor.jsonl (ledger)
 *   and writes the same record to stdout for the scheduled-task log.
 *   Exit code is ALWAYS 0 -- "not armed" and "below threshold" are success states, not errors.
 *
 * PURE EXPORTS (unit-tested, no I/O):
 *   applyEnabled(env)    -- true iff PRISM_ACCT_SWITCH_AUTO_APPLY === "1"
 *   shapeRecord(res, {apply, at, error})  -- normalise coordinator result or error -> ledger row
 *
 * Knobs:
 *   PRISM_ACCT_SWITCH_AUTO_APPLY=1   -- arm real actuation (default: off)
 *   PRISM_SLOT                       -- forwarded to coordinator as selfSlot
 *   PRISM_ROOT                       -- repo root for ledger path (default: H:/prism)
 */

import { appendFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// PURE FUNCTIONS (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * applyEnabled -- returns true iff the auto-apply knob is armed.
 * @param {Record<string,string|undefined>} env
 * @returns {boolean}
 */
export function applyEnabled(env = process.env) {
  return env.PRISM_ACCT_SWITCH_AUTO_APPLY === "1";
}

/**
 * shapeRecord -- normalise a coordinator result (or thrown error) into a ledger row.
 *
 * Error path:
 *   FIVE_HOUR_SOURCE_UNAVAILABLE -> status "not-armed"  (expected: host not calibrated yet)
 *   any other code               -> status "error"
 *
 * Success path:
 *   res.switched true  -> status "switched"
 *   res.switched false -> status "below-threshold"
 *
 * @param {object|null} res   -- coordinator return value, or null on error
 * @param {{apply:boolean, at:string, error?:Error|null}} meta
 * @returns {object}
 */
export function shapeRecord(res, { apply, at, error = null }) {
  if (error) {
    const code =
      (error && error.code) ? error.code : "error";
    const status =
      code === "FIVE_HOUR_SOURCE_UNAVAILABLE" ? "not-armed" : "error";
    return {
      at,
      status,
      apply,
      code,
      message: String((error && error.message) || error).slice(0, 400),
    };
  }

  return {
    at,
    status: res.switched ? "switched" : "below-threshold",
    apply,
    switched: !!res.switched,
    fiveHourPct: res.fiveHourPct != null ? res.fiveHourPct : null,
    threshold: res.threshold,
    source: res.source,
    reason: res.reason,
    autoSwap: !!res.autoSwap,
    swap: res.swap
      ? { ok: res.swap.ok, mode: res.swap.mode, to: res.swap.to }
      : null,
    restartPlan: res.restartPlan || [],
  };
}

// ---------------------------------------------------------------------------
// MAIN (run-as-main guard)
// ---------------------------------------------------------------------------

const _thisFile = "account-switch-monitor.mjs";
const _isMain =
  path.basename(process.argv[1] || "") === _thisFile;

if (_isMain) {
  // Import coordinator (dynamic so unit tests never execute I/O).
  const { runCoordinator } = await import(
    "./account-switch-restart-coordinator.mjs"
  );

  const apply = applyEnabled();
  const at = new Date().toISOString();

  let record;
  try {
    const res = await runCoordinator({
      fallbackLive: true,
      autoSwap: true,
      apply,
      selfSlot: process.env.PRISM_SLOT || null,
    });
    record = shapeRecord(res, { apply, at });
    if (res.advisory) {
      process.stderr.write("[account-switch-monitor] advisory:\n" + res.advisory + "\n");
    }
  } catch (e) {
    record = shapeRecord(null, { apply, at, error: e });
  }

  // Append to ledger.
  const root = process.env.PRISM_ROOT || "H:/prism";
  const ledger = path.join(root, "state", "shared", "account-switch-monitor.jsonl");
  try {
    appendFileSync(ledger, JSON.stringify(record) + "\n", "utf8");
  } catch (_) {
    // Ledger write failure is non-fatal -- stdout record is the fallback log.
  }

  process.stdout.write(JSON.stringify(record) + "\n");
  process.exit(0);
}
