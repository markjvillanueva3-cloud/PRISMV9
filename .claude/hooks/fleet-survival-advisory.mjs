#!/usr/bin/env node
// tier: T2
/**
 * fleet-survival-advisory.mjs -- UserPromptSubmit advisory that proactively
 * surfaces the 5h-session-limit SURVIVAL verdict at the moment it is actionable.
 *
 * THE GAP. scripts/fleet-survival-status.mjs composes the three survival signals
 * (5h proximity + account-switch preflight + armed-flag) into one GO/NO-GO
 * verdict -- "will the fleet survive the next 5h limit WITHOUT operator action?"
 * But it is PULL-only: the operator has to remember to run it. Verified 0
 * consumers fleet-wide. So the verdict exists but is never DELIVERED to the
 * operator at the moment it matters -- the exact "so I don't have to worry about
 * it" gap in the autonomy chain. This hook is that delivery surface.
 *
 * It fires ONLY when the verdict is actionable, i.e. BOTH:
 *   1. survives === false  -- the fleet WILL block at the next limit (not armed,
 *      or the account set is not arm-safe / RED), AND
 *   2. proximity zone is `warn` or `critical` -- we have actually climbed toward
 *      the limit. (survives===false is true from 0% onward until the operator
 *      arms; gating on the zone too means we nudge only when runway is low AND
 *      the fleet is unprotected -- never from a fresh window.)
 * When the fleet IS survivable (armed + preflight GREEN/YELLOW) it is silent --
 * the monitor will swap+restart automatically, no operator action is needed.
 *
 * PER-PROMPT COST. The survival composition scans this chat's transcript, so
 * running it on every UserPromptSubmit fleet-wide would be wasteful. A cheap
 * CHECK-INTERVAL stamp gates the expensive compute to at most once per
 * checkInterval (default 5m) per chat; within that, a longer NUDGE COOLDOWN
 * (default 30m) throttles the emission itself so a sustained low-runway episode
 * nudges periodically, not every prompt.
 *
 * ADVISORY ONLY -- injects context; never blocks the prompt, never arms anything
 * (the account-switch RED-gate stays operator-gated in arm-account-switch.mjs).
 * Emitting {continue:true} unconditionally is the contract.
 *
 * Knobs:
 *   PRISM_FLEET_SURVIVAL_ADVISORY_DISABLE=1       -> silent no-op.
 *   PRISM_FLEET_SURVIVAL_ADVISORY_COOLDOWN_SEC=N  -> nudge cooldown (default 1800 = 30m).
 *   PRISM_FLEET_SURVIVAL_ADVISORY_CHECK_SEC=N     -> min seconds between survival computes (default 300 = 5m).
 *
 * Wired: .claude/settings.json UserPromptSubmit chain (advisory).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSurvivalStatus } from "../../scripts/fleet-survival-status.mjs";

const DEFAULT_COOLDOWN_SEC = 1800;     // 30 min between nudges (per chat)
const DEFAULT_CHECK_SEC = 300;         // 5 min between (expensive) survival computes
const STDIN_READ_TIMEOUT_MS = 250;     // never wait on an EOF that won't come

/** ok/unknown < warn < critical. Pure lookup. */
export const ZONE_RANK = { ok: 0, unknown: 0, warn: 1, critical: 2 };

/** Resolve repo-relative paths from this hook's own location (worktree-safe). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", ".."); // .claude/hooks/ -> .claude/ -> repo
  return { stampDir: join(repoRoot, "state", "shared") };
}

/** Emit the hook verdict. ALWAYS {continue:true} -- this hook never blocks. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

/** Read the hook's stdin payload, time-bounded so it can never hang on EOF. */
function readStdin() {
  return new Promise((res) => {
    let buf = "";
    let done = false;
    let timer = null;
    const fin = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try { process.stdin.destroy(); } catch { /* already gone */ }
      res(buf);
    };
    try {
      timer = setTimeout(fin, STDIN_READ_TIMEOUT_MS);
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/**
 * Derive this chat's stable id from a UserPromptSubmit payload's session_id:
 * `claude-` + first 8 hex of the session UUID (the scheme chat-slots.json keys
 * on). Returns null when there is no usable session_id. Pure -- no IO.
 */
export function stableIdFromPayload(payload) {
  const sid = payload && typeof payload === "object" ? payload.session_id : null;
  if (typeof sid !== "string" || sid.length < 8) return null;
  return "claude-" + sid.slice(0, 8);
}

/**
 * Cheap gate: should we run the (expensive) survival compute at all this prompt?
 * True when no prior check, or checkIntervalMs has elapsed since the last one.
 * Pure -- no IO.
 */
export function shouldRunCheck(nowMs, lastCheckMs, checkIntervalMs) {
  if (!Number.isFinite(lastCheckMs)) return true;
  return (nowMs - lastCheckMs) >= checkIntervalMs;
}

/**
 * Decide whether to nudge, and with what text, from a survival verdict.
 *
 * Nudges only when the fleet WILL block (survives===false) AND proximity has
 * climbed into warn/critical AND the nudge cooldown has elapsed. Pure -- no IO;
 * the caller supplies `lastNudgeMs` (from the stamp) and persists on nudge.
 *
 * @returns {{nudge:boolean, text:(string|null), reason:string}}
 */
export function decideAdvisory({ survival, nowMs, lastNudgeMs, cooldownMs }) {
  if (!survival || typeof survival !== "object") {
    return { nudge: false, text: null, reason: "no-survival" };
  }
  // Survivable (armed + preflight ok) -> the monitor swaps+restarts itself; silent.
  if (survival.survives === true) {
    return { nudge: false, text: null, reason: "survivable" };
  }
  const zone = survival.proximity && survival.proximity.zone ? survival.proximity.zone : "unknown";
  const rank = Number.isFinite(ZONE_RANK[zone]) ? ZONE_RANK[zone] : 0;
  if (rank < ZONE_RANK.warn) {
    return { nudge: false, text: null, reason: "proximity-ok" };
  }
  if (Number.isFinite(lastNudgeMs) && (nowMs - lastNudgeMs) < cooldownMs) {
    return { nudge: false, text: null, reason: "cooldown" };
  }

  const p = survival.proximity || {};
  const pct = Number.isFinite(p.pctUsed) ? `${p.pctUsed}%` : "?";
  const eta = Number.isFinite(p.etaMinutes) ? `~${p.etaMinutes} min` : "soon";
  const armed = survival.armed ? "armed" : "NOT armed";
  const grade = survival.preflightGrade || "UNKNOWN";

  const lines = [];
  lines.push(`⏳ 5h SESSION LIMIT approaching & fleet NOT protected -- proximity ${zone.toUpperCase()} (${pct} of ceiling), time-to-limit ${eta}.`);
  lines.push(`When the limit fires the WHOLE fleet blocks until manual recovery (auto account-switch: ${armed}; account preflight: ${grade}).`);
  if (Array.isArray(survival.actions) && survival.actions.length) {
    lines.push("To make the fleet survive autonomously:");
    for (const a of survival.actions) lines.push(`  * ${a}`);
  }
  lines.push("(read-only advisory -- never arms anything; the account-switch RED-gate stays operator-gated)");
  return { nudge: true, text: lines.join("\n"), reason: `actionable-${zone}` };
}

/** Read the per-chat stamp {lastCheckMs,lastNudgeMs}. Never throws. */
function readStamp(stampFile) {
  try {
    if (!existsSync(stampFile)) return { lastCheckMs: NaN, lastNudgeMs: NaN };
    const j = JSON.parse(readFileSync(stampFile, "utf8"));
    return {
      lastCheckMs: Number.isFinite(j.lastCheckMs) ? j.lastCheckMs : NaN,
      lastNudgeMs: Number.isFinite(j.lastNudgeMs) ? j.lastNudgeMs : NaN,
    };
  } catch {
    return { lastCheckMs: NaN, lastNudgeMs: NaN };
  }
}

/** Persist the per-chat stamp. Best-effort -- a missed write just re-checks sooner. */
function writeStamp(stampDir, stampFile, doc) {
  try {
    mkdirSync(stampDir, { recursive: true });
    writeFileSync(stampFile, JSON.stringify(doc));
  } catch { /* best-effort */ }
}

/** Strip a stable id to a filesystem-safe stamp key. Pure -- no IO. */
export function stampKeyOf(payload) {
  const stableId = stableIdFromPayload(payload);
  return stableId ? stableId.replace(/[^a-z0-9-]/gi, "") : "unknown";
}

/**
 * Orchestrate one advisory decision with INJECTED stamp IO + survival fn, so the
 * cost-control gate (skip the expensive compute within the check interval) is
 * testable end-to-end. The cheap check-interval gate runs BEFORE survivalFn, so
 * a within-interval prompt never pays the transcript-scan cost. Fail-soft: a
 * throwing survivalFn degrades to no nudge but STILL stamps lastCheckMs so the
 * next prompt does not re-hammer the compute.
 *
 * @returns {{additionalContext:(string|null), computed:boolean, wrote:boolean, reason:string, stampKey:string}}
 */
export function computeAdvisory({ payload, nowMs, readStampFn, writeStampFn, survivalFn, cooldownMs, checkMs }) {
  const stampKey = stampKeyOf(payload);
  const stamp = readStampFn(stampKey) || { lastCheckMs: NaN, lastNudgeMs: NaN };

  // Cheap gate FIRST -- bounds per-prompt cost to ~1 survival compute / checkInterval.
  if (!shouldRunCheck(nowMs, stamp.lastCheckMs, checkMs)) {
    return { additionalContext: null, computed: false, wrote: false, reason: "check-throttled", stampKey };
  }

  let survival = null;
  try { survival = survivalFn({ nowMs }); } catch { survival = null; }

  const decision = decideAdvisory({ survival, nowMs, lastNudgeMs: stamp.lastNudgeMs, cooldownMs });

  writeStampFn(stampKey, {
    lastCheckMs: nowMs,
    lastNudgeMs: decision.nudge ? nowMs : stamp.lastNudgeMs,
  });

  return {
    additionalContext: decision.nudge ? decision.text : null,
    computed: true,
    wrote: true,
    reason: decision.reason,
    stampKey,
  };
}

async function main() {
  const raw = await readStdin();

  if (process.env.PRISM_FLEET_SURVIVAL_ADVISORY_DISABLE === "1") {
    emitContinue();
    return;
  }

  let payload = {};
  try { payload = raw.trim() ? JSON.parse(raw) : {}; } catch { payload = {}; }

  const cooldownMs = (Number(process.env.PRISM_FLEET_SURVIVAL_ADVISORY_COOLDOWN_SEC) || DEFAULT_COOLDOWN_SEC) * 1000;
  const checkMs = (Number(process.env.PRISM_FLEET_SURVIVAL_ADVISORY_CHECK_SEC) || DEFAULT_CHECK_SEC) * 1000;

  const { stampDir } = repoPaths();
  const stampFileFor = (key) => join(stampDir, `.fleet-survival-advisory-${key}.stamp`);

  const result = computeAdvisory({
    payload,
    nowMs: Date.now(),
    cooldownMs,
    checkMs,
    readStampFn: (key) => readStamp(stampFileFor(key)),
    writeStampFn: (key, doc) => writeStamp(stampDir, stampFileFor(key), doc),
    survivalFn: runSurvivalStatus,
  });

  emitContinue(result.additionalContext || undefined);
}

// Run main() only when invoked as the hook entry point -- NOT when imported by a
// test. The last-resort .catch() still guarantees a {continue:true} verdict.
const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
