#!/usr/bin/env node
/**
 * arm-account-switch.mjs -- one-command arm/disarm for the auto account-switch
 * watchdog (ZULU-ACCOUNT-CYCLE). The watchdog (the "PRISM Account Switch Monitor"
 * scheduled task running account-switch-monitor.mjs every 10 min) stays in DRY-RUN
 * until armed. Arming = set USER-scope env vars that the NEXT monitor tick reads:
 *   PRISM_5H_WEIGHTED_BUDGET         (pct path: switch at PCT of this budget) OR
 *   PRISM_5H_WEIGHTED_TOKEN_TRIGGER  (absolute path: switch when weighted >= this)
 *   PRISM_ACCT_SWITCH_PCT            (the gate fraction; default 0.92 = mid 90-95%)
 *   PRISM_ACCT_SWITCH_AUTO_APPLY=1   (actuate the swap + staggered fleet restart)
 *
 * CALIBRATE FIRST: read state/shared/account-switch-monitor.jsonl -- each dry-run
 * tick logs "Live 5h weighted=N". Watch where N plateaus / where an account starts
 * getting throttled; that is your ceiling. Arm --budget at/just-above the ceiling
 * (switch fires at PCT of it), or arm --trigger just below it (absolute).
 *
 *   node scripts/arm-account-switch.mjs --budget 250000000            # pct path @ 92%
 *   node scripts/arm-account-switch.mjs --trigger 230000000           # absolute path
 *   node scripts/arm-account-switch.mjs --budget 250000000 --pct 0.90
 *   node scripts/arm-account-switch.mjs --auto                        # arm at the OBSERVED ceiling
 *   node scripts/arm-account-switch.mjs --auto --accept-low-confidence# override the <4-crossings refusal
 *   node scripts/arm-account-switch.mjs --disarm                      # back to DRY-RUN
 *   node scripts/arm-account-switch.mjs --status                      # show arm state
 *
 * --auto reads state/shared/five-hour-ceiling-observed.json (written by
 * five-hour-limit-tracker --calibrate) and arms at the OBSERVED 5h ceiling so the
 * operator never guesses a number. It REFUSES a low-confidence ceiling (<4 observed
 * crossings) unless --accept-low-confidence is passed (one weekly-limit artifact
 * crossing must not silently drive the fleet swap).
 *
 * ACCOUNT-SET PREFLIGHT GATE: any arm (--auto OR --budget/--trigger) first runs the
 * read-only account-switch-preflight. If it grades RED (current account
 * UNIDENTIFIABLE, <2 distinct rotation accounts, a rotation member missing a refresh
 * token, ...), arming is REFUSED -- a swap would risk overwriting the working login
 * with a wrong/stale snapshot. Fail-CLOSED: if the preflight cannot even run, arming
 * is also refused. Override with --accept-unsafe-accounts (logged in the output).
 * YELLOW (degraded-but-safe) and GREEN both proceed.
 *
 * Sets USER-scope env (no admin); the scheduled task's next tick (<=10 min)
 * inherits it. SAFE: this only sets env -- the actual swap+restart happens on the
 * NEXT tick IF the live weighted crosses the gate. Disarm anytime with --disarm.
 * Prereq (already done): >=2 accounts captured + ROTATION_ORDER.json present.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readObservedCeiling, DEFAULT_OBSERVED_CEILING_PATH } from "./five-hour-limit-tracker.mjs";
import { runPreflight } from "./account-switch-preflight.mjs";

export const ARM_VARS = {
  AUTO_APPLY: "PRISM_ACCT_SWITCH_AUTO_APPLY",
  PCT: "PRISM_ACCT_SWITCH_PCT",
  BUDGET: "PRISM_5H_WEIGHTED_BUDGET",
  TRIGGER: "PRISM_5H_WEIGHTED_TOKEN_TRIGGER",
};
export const DEFAULT_PCT = 0.92; // mid 90-95%

// ---- PURE ----

/** Parse argv -> {action, budget, trigger, pct, acceptLowConfidence}. PURE. */
export function parseArmArgs(argv) {
  const a = { action: "arm", budget: null, trigger: null, pct: null, acceptLowConfidence: false, acceptStale: false, acceptUnsafe: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--disarm") a.action = "disarm";
    else if (t === "--status") a.action = "status";
    else if (t === "--auto") a.action = "auto";
    else if (t === "--accept-low-confidence") a.acceptLowConfidence = true;
    else if (t === "--accept-stale") a.acceptStale = true;
    else if (t === "--accept-unsafe-accounts") a.acceptUnsafe = true;
    else if (t === "--budget") a.budget = Number(argv[++i]);
    else if (t === "--trigger") a.trigger = Number(argv[++i]);
    else if (t === "--pct") a.pct = Number(argv[++i]);
  }
  return a;
}

/**
 * Build the env plan for --auto from an observed-ceiling doc (written by
 * five-hour-limit-tracker --calibrate). PURE. Arms at the OBSERVED ceiling so the
 * operator never has to guess a number. Fail-loud refusals (R12 + the P1 guard):
 *   - no doc / no observedCeiling  -> throw (run --calibrate first; nothing to arm against).
 *   - doc.lowConfidence && !accept  -> throw (<4 crossings; the basis is a raw min that
 *     may be a weekly-limit artifact -- one bad observation must not drive the swap).
 * Otherwise delegates to composeEnvPlan("arm", {budget: observedCeiling, pct}), using
 * the doc's own recommend.pct unless an explicit --pct overrides it.
 */
export const DEFAULT_CEILING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const EXPECTED_CEILING_SCHEMA_MAJOR = "1"; // the sidecar schemaVersion major this consumer understands

export function composeAutoPlan(ceilingDoc, { pct = null, acceptLowConfidence = false, acceptStale = false, nowMs = null, maxAgeMs = DEFAULT_CEILING_MAX_AGE_MS } = {}) {
  if (!ceilingDoc || typeof ceilingDoc !== "object") {
    throw new Error("--auto: no observed-ceiling sidecar -- run `node scripts/five-hour-limit-tracker.mjs --calibrate` first");
  }
  // Schema gate (P2): a PRESENT but incompatible schemaVersion means a future tracker
  // wrote a shape this consumer does not understand -- refuse rather than mis-read its
  // fields and arm wrong. Absent version is tolerated (pre-1.0/foreign doc) since the
  // other field guards below still apply; only a wrong MAJOR is a hard refusal.
  if (ceilingDoc.schemaVersion != null) {
    const major = String(ceilingDoc.schemaVersion).split(".")[0];
    if (major !== EXPECTED_CEILING_SCHEMA_MAJOR) {
      throw new Error(`--auto: REFUSING -- observed-ceiling sidecar schemaVersion '${ceilingDoc.schemaVersion}' is incompatible (expected major ${EXPECTED_CEILING_SCHEMA_MAJOR}.x). Upgrade arm-account-switch.mjs to read the new schema.`);
    }
  }
  const ceiling = Number(ceilingDoc.observedCeiling);
  if (!Number.isFinite(ceiling) || ceiling <= 0) {
    throw new Error("--auto: observed-ceiling sidecar has no usable observedCeiling (no session-limit 429 seen yet) -- nothing to arm against");
  }
  // Freshness guard (P2): a stale ceiling can reflect an old plan tier. Only checked
  // when a clock is injected (pure-safe default) and computedAt is parseable.
  if (Number.isFinite(nowMs) && !acceptStale && typeof ceilingDoc.computedAt === "string") {
    const ageMs = nowMs - Date.parse(ceilingDoc.computedAt);
    if (Number.isFinite(ageMs) && ageMs > maxAgeMs) {
      const ageDays = (ageMs / (24 * 60 * 60 * 1000)).toFixed(1);
      throw new Error(`--auto: REFUSING -- observed ceiling is stale (${ageDays}d old, computed ${ceilingDoc.computedAt}). Re-run --calibrate, or pass --accept-stale to override.`);
    }
  }
  if (ceilingDoc.lowConfidence && !acceptLowConfidence) {
    throw new Error(
      `--auto: REFUSING -- low-confidence ceiling (only ${ceilingDoc.crossings ?? "<4"} crossing(s); basis may be a weekly-limit artifact). ` +
      "Re-run --calibrate after more 5h-limit observations, or pass --accept-low-confidence to override.",
    );
  }
  const resolvedPct = pct != null ? pct : (ceilingDoc.recommend && Number.isFinite(Number(ceilingDoc.recommend.pct)) ? Number(ceilingDoc.recommend.pct) : null);
  return composeEnvPlan("arm", { budget: ceiling, pct: resolvedPct });
}

/**
 * Build the env-var map to set for the requested action. PURE.
 * arm: requires EXACTLY ONE of budget|trigger (a calibration value -- never arm
 *      blind), pct in (0,1] (default 0.92). disarm: just flips AUTO_APPLY off.
 * Throws (fail-loud) on a missing/ambiguous calibration value or a bad pct.
 */
export function composeEnvPlan(action, { budget = null, trigger = null, pct = null } = {}) {
  if (action === "disarm") return { [ARM_VARS.AUTO_APPLY]: "0" };
  if (action !== "arm") throw new Error(`composeEnvPlan: unknown action '${action}'`);

  const hasBudget = budget != null && Number.isFinite(budget) && budget > 0;
  const hasTrigger = trigger != null && Number.isFinite(trigger) && trigger > 0;
  if (hasBudget === hasTrigger) {
    throw new Error("arm requires EXACTLY ONE positive --budget OR --trigger (the calibration value; never arm blind)");
  }
  const p = pct == null ? DEFAULT_PCT : pct;
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    throw new Error(`--pct must be in (0,1]; got '${pct}'`);
  }
  const plan = { [ARM_VARS.AUTO_APPLY]: "1", [ARM_VARS.PCT]: String(p) };
  if (hasBudget) plan[ARM_VARS.BUDGET] = String(Math.round(budget));
  else plan[ARM_VARS.TRIGGER] = String(Math.round(trigger));
  return plan;
}

/**
 * Decide whether the account-set preflight permits arming. PURE.
 * Blocks (refuses to arm) when the preflight is RED (not safeToArm) -- arming would
 * risk swapping the live login to a wrong/stale account. FAIL-CLOSED: a null/failed
 * report (preflight could not even assess the vault) also blocks. --accept-unsafe-
 * accounts overrides any block. YELLOW (degraded-but-safe) and GREEN both pass.
 * @param {object|null} report  the account-switch-preflight report (or null if it threw)
 * @returns {{block:boolean, grade:string, overridden:boolean, reason:string}}
 */
export function preflightGateVerdict(report, { acceptUnsafe = false } = {}) {
  const grade = report && typeof report === "object" && report.grade ? report.grade : "UNKNOWN";
  if (acceptUnsafe) {
    return { block: false, grade, overridden: true, reason: `account preflight ${grade} overridden by --accept-unsafe-accounts` };
  }
  if (!report || typeof report !== "object") {
    return {
      block: true, grade: "UNKNOWN", overridden: false,
      reason: "account preflight could not be assessed -- refusing to arm (fail-closed). Run `node scripts/account-switch-preflight.mjs` to diagnose, or pass --accept-unsafe-accounts.",
    };
  }
  if (report.safeToArm === false || report.grade === "RED") {
    const detail = Array.isArray(report.reasons) && report.reasons.length ? ` ${report.reasons.join("; ")}` : "";
    return {
      block: true, grade: report.grade || "RED", overridden: false,
      reason: `account preflight is RED (NO-GO) -- a swap would risk overwriting the working login with a wrong/stale snapshot.${detail} Fix per the preflight recommendations, or pass --accept-unsafe-accounts to override.`,
    };
  }
  return { block: false, grade, overridden: false, reason: `account preflight ${grade}` };
}

// ---- IO (injectable) ----

/** Set a USER-scope env var (persists; next process inherits). Default impl shells PowerShell. */
function defaultSetUserEnv(name, value) {
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", `[Environment]::SetEnvironmentVariable('${name}', '${value}', 'User')`],
    { encoding: "utf8", timeout: 15000 },
  );
  if (r.status !== 0) throw new Error(`failed to set USER env ${name}: ${r.stderr || r.stdout || `exit ${r.status}`}`);
}

/** Read the current USER-scope values of the arm vars + the live process.env view. */
function readArmState(getUserEnv) {
  const out = { user: {}, process: {} };
  for (const v of Object.values(ARM_VARS)) {
    out.user[v] = getUserEnv(v);
    out.process[v] = process.env[v] ?? null;
  }
  return out;
}
function defaultGetUserEnv(name) {
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", `[Environment]::GetEnvironmentVariable('${name}', 'User')`],
    { encoding: "utf8", timeout: 15000 },
  );
  const v = (r.stdout || "").trim();
  return v === "" ? null : v;
}

function lastLedgerTick(ledgerPath) {
  try {
    const lines = readFileSync(ledgerPath, "utf8").trim().split(/\r?\n/);
    return JSON.parse(lines[lines.length - 1]);
  } catch { return null; }
}

/** Run the read-only account preflight; null if it throws (fail-closed handled by the gate). */
function safeRunPreflight(_run = runPreflight) {
  try { return _run({ nowMs: Date.now() }); } catch { return null; }
}

/**
 * Run the account-set preflight and THROW (refuse to arm) when it blocks. Returns a
 * compact summary for the arm output on pass. Shared by --auto and the manual arm path.
 */
function gateOrThrow(action, acceptUnsafe, _run = runPreflight) {
  const report = safeRunPreflight(_run);
  const verdict = preflightGateVerdict(report, { acceptUnsafe });
  if (verdict.block) throw new Error(`--${action}: ${verdict.reason}`);
  return {
    grade: verdict.grade,
    overridden: verdict.overridden,
    currentAccount: report && report.currentAccount != null ? report.currentAccount : null,
    nextTarget: report && report.nextTarget != null ? report.nextTarget : null,
  };
}

/**
 * Resolve the env plan for an arming/disarming action AND run the account-set safety
 * gate, WITHOUT writing any env. The caller sets env over the returned `plan`, so the
 * gate-before-set ordering is STRUCTURAL: a blocked gate THROWS here and the caller
 * never reaches setUserEnv (no partial arm is possible). `disarm` returns a plan with
 * preflight:null and NEVER runs the preflight (it turns auto-apply OFF). Reads are
 * injectable so the wiring (gate-before-set + the disarm exemption) is regression-locked.
 * @returns {{plan:object, preflight:object|null, meta:object}}
 */
export function armPlan(action, args, {
  runPreflightFn = runPreflight,
  readCeilingFn = readObservedCeiling,
  ceilingPath = DEFAULT_OBSERVED_CEILING_PATH,
  nowMs = Date.now(),
} = {}) {
  if (action === "auto") {
    // Account-set safety FIRST: refuse if a swap now would land on a wrong/stale
    // account (RED) or the vault can't be assessed (fail-closed) -- before any plan.
    const preflight = gateOrThrow("auto", args.acceptUnsafe, runPreflightFn);
    const doc = readCeilingFn(ceilingPath);
    const plan = composeAutoPlan(doc, { pct: args.pct, acceptLowConfidence: args.acceptLowConfidence, acceptStale: args.acceptStale, nowMs });
    return { plan, preflight, meta: { armedFrom: ceilingPath, observedCeiling: doc.observedCeiling, crossings: doc.crossings, lowConfidence: !!doc.lowConfidence } };
  }
  if (action === "arm" || action === "disarm") {
    const plan = composeEnvPlan(action, args);
    // Gate the manual arm too -- arming AUTO_APPLY=1 with a RED account set is the same
    // blind-swap hazard as --auto. disarm never gates (it only turns auto-apply off).
    const preflight = action === "arm" ? gateOrThrow("arm", args.acceptUnsafe, runPreflightFn) : null;
    return { plan, preflight, meta: {} };
  }
  throw new Error(`armPlan: unsupported action '${action}'`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("arm-account-switch.mjs")) {
  const args = parseArmArgs(process.argv.slice(2));
  const ledger = "H:/prism/state/shared/account-switch-monitor.jsonl";
  try {
    if (args.action === "status") {
      const state = readArmState(defaultGetUserEnv);
      const tick = lastLedgerTick(ledger);
      const armed = state.user[ARM_VARS.AUTO_APPLY] === "1";
      process.stdout.write(JSON.stringify({
        armed,
        mode: armed ? "ARMED (auto-apply ON)" : "DRY-RUN (auto-apply off)",
        env: state.user,
        lastTick: tick ? { at: tick.at, status: tick.status, apply: tick.apply } : null,
      }, null, 2) + "\n");
    } else {
      // armPlan runs the gate + builds the env plan WITHOUT writing env. A RED gate
      // throws inside armPlan, so the setUserEnv loop below is unreachable on a block.
      const { plan, preflight, meta } = armPlan(args.action, args);
      for (const [name, value] of Object.entries(plan)) defaultSetUserEnv(name, value);
      if (args.action === "auto") {
        process.stdout.write(JSON.stringify({
          ok: true,
          action: "auto",
          armedFrom: meta.armedFrom,
          observedCeiling: meta.observedCeiling,
          crossings: meta.crossings,
          lowConfidence: meta.lowConfidence,
          preflight,
          set: plan,
          note: "ARMED from observed ceiling. The next monitor tick (<=10 min) switches+restarts IF live 5h weighted crosses the gate. Disarm: --disarm.",
        }, null, 2) + "\n");
      } else {
        process.stdout.write(JSON.stringify({
          ok: true,
          action: args.action,
          preflight,
          set: plan,
          note: args.action === "arm"
            ? "ARMED. The next monitor tick (<=10 min) will switch+restart IF the live 5h weighted crosses the gate. Disarm: --disarm."
            : "DISARMED. Back to dry-run (detect + log only).",
        }, null, 2) + "\n");
      }
    }
  } catch (e) {
    process.stderr.write(`[arm-account-switch] ${e?.message || e}\n`);
    process.exit(1);
  }
}
