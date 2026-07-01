#!/usr/bin/env node
/**
 * fleet-survival-status.mjs -- ZULU-ACCOUNT-CYCLE / U-FLEET-SURVIVAL (slot:zulu,
 * 2026-06-18). The orchestrator's GO/NO-GO cockpit for the one question that decides
 * "run as long as possible before session limits hit again":
 *
 *     Will the fleet survive the next 5h session limit WITHOUT operator action?
 *
 * Composes three already-built signals into one verdict (no new logic, no dup):
 *   - liveStatus()  (five-hour-limit-tracker)  -> how close are we to the limit NOW
 *   - runPreflight() (account-switch-preflight) -> is the account set arm-safe
 *   - PRISM_ACCT_SWITCH_AUTO_APPLY               -> is the auto-switch actually armed
 *
 * SURVIVABLE iff (armed AND account-set-not-RED): when the 5h limit fires, the
 * "PRISM Account Switch Monitor" tick swaps to a fresh account + staggered-restarts
 * the fleet, so the chats resume. Otherwise the whole fleet BLOCKS at the limit until
 * manual recovery -- and this prints the exact unblock command(s). Read-only; never
 * arms anything (that stays operator-gated behind the preflight RED-gate).
 *
 *   node scripts/fleet-survival-status.mjs           # human GO/NO-GO
 *   node scripts/fleet-survival-status.mjs --json
 */

import { pathToFileURL } from "node:url";
import { liveStatus, DEFAULT_OBSERVED_CEILING_PATH } from "./five-hour-limit-tracker.mjs";
import { runPreflight } from "./account-switch-preflight.mjs";

export const ARMED_ENV = "PRISM_ACCT_SWITCH_AUTO_APPLY";

// ============================== PURE CORE ==============================

/**
 * Grade fleet survival from the three composed signals. PURE.
 * @param {object} a
 * @param {object|null} a.live       liveStatus() result (proximity); null if it could not run
 * @param {object|null} a.preflight  runPreflight() result; null if it could not run
 * @param {boolean} a.armed          PRISM_ACCT_SWITCH_AUTO_APPLY === "1" as this process sees it
 * @returns {{survives:boolean, verdict:string, blockers:string[], actions:string[], proximity:object}}
 */
export function gradeSurvival({ live, preflight, armed }) {
  const blockers = [];
  const actions = [];

  // Leg 1 -- is the auto-switch armed at all.
  if (!armed) {
    blockers.push(`account-switch is NOT armed (${ARMED_ENV} != 1) -- the monitor detects the limit but will not swap.`);
  }

  // Leg 2 -- is the account set arm-safe (preflight GREEN/YELLOW, never RED).
  const preflightOk = !!(preflight && preflight.safeToArm);
  if (!preflightOk) {
    const grade = preflight && preflight.grade ? preflight.grade : "UNKNOWN";
    const why = preflight && Array.isArray(preflight.reasons) && preflight.reasons.length
      ? preflight.reasons[0]
      : (preflight ? `account preflight ${grade}` : "account preflight could not run");
    blockers.push(`account set is not arm-safe (${grade}): ${why}`);
  }

  const survives = armed && preflightOk;

  // Recommended unblock path (only when not survivable).
  if (!survives) {
    if (preflight && preflight.grade === "RED" && preflight.currentAccount == null) {
      actions.push("Re-capture the CURRENT login so the account is identifiable: `node scripts/capture-claude-credentials.mjs account-N` (overwrite the slot you are logged into), then re-check.");
    }
    if (preflightOk && !armed) {
      actions.push("Arm the auto-switch: `node scripts/arm-account-switch.mjs --auto`");
    } else if (!armed) {
      actions.push("Once the account set is GREEN, arm: `node scripts/arm-account-switch.mjs --auto`");
    }
  }

  // Proximity (informational -- does NOT gate survival; survival is armed+preflight).
  const zone = live && live.zone ? live.zone : "unknown";
  const pctUsed = live && Number.isFinite(live.pctUsed) ? Math.round(live.pctUsed * 1000) / 10 : null;
  const proximity = {
    zone,
    pctUsed,
    currentWeighted: live && Number.isFinite(live.currentWeighted) ? live.currentWeighted : null,
    ceiling: live && Number.isFinite(live.ceiling) ? live.ceiling : null,
    armTrigger: live && Number.isFinite(live.armTrigger) ? live.armTrigger : null,
    armWouldFire: live && typeof live.armWouldFire === "boolean" ? live.armWouldFire : null,
    // Time-to-limit projection (from computeStatus's burn-rate over the trailing
    // window) -- "how long until the fleet blocks", the actionable companion to the
    // static %. null when burn<=0 (not climbing) or no ceiling. Rounded to whole min.
    etaMinutes: live && Number.isFinite(live.etaMinutes) ? Math.round(live.etaMinutes) : null,
    burnPerMin: live && Number.isFinite(live.burnPerMin) ? Math.round(live.burnPerMin) : null,
  };

  const verdict = survives
    ? `SURVIVABLE -- armed + account set ${preflight.grade}; the monitor will swap+restart the fleet at the trigger.`
    : `WILL BLOCK at the next 5h limit -- ${blockers.length} blocker(s). The whole fleet stops until manual recovery.`;

  return { survives, verdict, blockers, actions, proximity };
}

// ============================== IO (injectable) ==============================

/** Read the armed flag as THIS process sees it (inherited USER env). Authoritative USER-scope check is `arm-account-switch.mjs --status`. */
export function readArmed(env = process.env) {
  return env[ARMED_ENV] === "1";
}

/**
 * Compose the live survival report. Read-only. Each signal is fail-soft: if a
 * dependency throws, that leg degrades (live -> null proximity; preflight -> null ->
 * a blocker) but the verdict is still produced. Injectable for tests.
 */
export function runSurvivalStatus({
  nowMs,
  env = process.env,
  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
  _live = liveStatus,
  _preflight = runPreflight,
  _readArmed = readArmed,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("runSurvivalStatus: nowMs (finite epoch ms) is required");
  let live = null;
  try { live = _live({ nowMs, ceilingPath, env }); } catch { live = null; }
  let preflight = null;
  try { preflight = _preflight({ nowMs }); } catch { preflight = null; }
  const armed = _readArmed(env);

  const graded = gradeSurvival({ live, preflight, armed });
  return {
    schemaVersion: "1.0.0",
    computedAt: new Date(nowMs).toISOString(),
    armed,
    preflightGrade: preflight && preflight.grade ? preflight.grade : "UNKNOWN",
    currentAccount: preflight && preflight.currentAccount != null ? preflight.currentAccount : null,
    nextTarget: preflight && preflight.nextTarget != null ? preflight.nextTarget : null,
    ...graded,
  };
}

// ============================== CLI ==============================

function main() {
  const json = process.argv.includes("--json");
  const r = runSurvivalStatus({ nowMs: Date.now() });
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return; }
  const mark = r.survives ? "GO (survivable)" : "NO-GO (will block)";
  process.stdout.write(`[fleet-survival] ${r.survives ? "SURVIVABLE" : "WILL BLOCK"}  (${mark})\n`);
  process.stdout.write(`  ${r.verdict}\n`);
  const p = r.proximity;
  process.stdout.write(`  5h proximity   : zone=${p.zone}${p.pctUsed == null ? "" : ` (${p.pctUsed}% of ceiling)`}${p.currentWeighted == null ? "" : ` weighted=${Math.round(p.currentWeighted)}`}${p.ceiling == null ? "" : `/${Math.round(p.ceiling)}`}\n`);
  process.stdout.write(`  time-to-limit  : ${p.etaMinutes == null ? "(not climbing / no ceiling)" : `~${p.etaMinutes} min`}${p.burnPerMin == null ? "" : ` @ ${p.burnPerMin}/min burn`}\n`);
  process.stdout.write(`  arm trigger    : ${p.armTrigger == null ? "(no sidecar)" : p.armTrigger}${p.armWouldFire == null ? "" : ` | wouldFireNow=${p.armWouldFire}`}\n`);
  process.stdout.write(`  armed          : ${r.armed} | account preflight: ${r.preflightGrade}${r.currentAccount ? ` (current=${r.currentAccount})` : ""}\n`);
  if (r.blockers.length) { process.stdout.write("  blockers:\n"); for (const b of r.blockers) process.stdout.write(`    - ${b}\n`); }
  if (r.actions.length) { process.stdout.write("  to make the fleet survive autonomously:\n"); for (const a of r.actions) process.stdout.write(`    * ${a}\n`); }
}

const __direct = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__direct) {
  try { main(); } catch (e) { process.stderr.write(`[fleet-survival] fatal: ${e?.stack || e}\n`); process.exit(1); }
}
