#!/usr/bin/env node
/**
 * account-switch-restart-coordinator.mjs — the TIE between the 90%-of-5h-limit
 * signal and the staggered, token-gated fleet restart (slot:bravo, hermes-zulu).
 *
 * THE LOOSE END THIS CLOSES (the operator ask):
 *   "switch accounts when an account hits 90% of its 5-hour usage limit, then
 *    STAGGER-restart the chats — waiting for each restarted chat's token counter
 *    to register before restarting the next."
 *
 * Two mature primitives already exist on disk; what was MISSING was the wire
 * between them — nothing read the 5h% and then drove the staggered restart:
 *
 *   1. THE 90% SIGNAL — `.claude/hooks/token-awareness-sidecar.mjs` writes
 *      `state/shared/token-budget-<slot>.json` with `quota.fiveHour.pct` (0..1),
 *      sourced from Claude Code's `rate_limits.five_hour.used_percentage`. This
 *      is the canonical 5h source. (NOTE: as of this build it is `null` on every
 *      slot — Claude Code on this host isn't emitting `rate_limits` yet, the
 *      ZULU-ACCOUNT-CYCLE-MS0 §C5 chokepoint. That is EXACTLY why this coordinator
 *      FAILS LOUD on a null/unparseable 5h source instead of silently no-op'ing —
 *      a silent skip would mean the fleet never switches and nobody notices.)
 *
 *   2. THE STAGGERED RESTART — `scripts/fleet-wake-sequencer.mjs` already wakes
 *      slots ONE AT A TIME and WAITS until each woken chat starts accumulating
 *      tokens (transcript-growth gate) before waking the next. We call its
 *      `runSequencer()` — we do NOT reinvent the stagger.
 *
 *   3. THE ACCOUNT SWITCH — ZULU-ACCOUNT-CYCLE-MS0 §C1/§C2: switching accounts is
 *      `claude logout` → `claude login` (an interactive browser OAuth dance) and a
 *      Claude Code session reads credentials in-memory at launch, so a running
 *      chat MUST relaunch to pick up the new account. There is NO scriptless auto-
 *      switch (the spec's U2 `switch-claude-account.ps1` is still a ghost; only the
 *      interactive `switch-claude-account.bat` exists). So this coordinator EMITS a
 *      clear advisory + the exact command to run rather than faking an auto-switch
 *      (R12 fail-loud, bravo soul GOVERNANCE-before-COMMAND-CONTROL). The restart
 *      handoff still runs (dry-run unless --apply) so the staggered relaunch is
 *      planned/actuated immediately after the operator completes the swap.
 *
 * ARCHITECTURE — pure core + injected I/O (PRISM "pure-core + injected readers
 * MUST ship a real-data E2E" rule):
 *   PURE (no I/O, fully unit-tested):
 *     shouldSwitch(fiveHourPct, threshold)      — the 90% gate
 *     planSwitchRestart(activeSlots, opts)      — restart order + never-self + dedup
 *     thresholdFromEnv(env)                     — PRISM_ACCT_SWITCH_PCT parse
 *     composeSwitchAdvisory(state)              — the operator directive text
 *   I/O (injectable, fail-soft individually but the orchestrator fails LOUD if the
 *        5h source is wholly missing):
 *     readFiveHourPct(opts)                     — canonical sidecar → max 5h pct
 *     readActiveFleet (from fleet-wake-sequencer) — active-fleet.json roster
 *   ORCHESTRATION:
 *     runCoordinator(opts)                      — read 5h → fail-loud-if-null →
 *                                                 gate → switch-advisory → staggered
 *                                                 restart via runSequencer().
 *
 * SAFETY: actuation (the account-switch directive AND the restarts) is DRY-RUN by
 * default. `--apply` is required to (a) actuate the staggered restarts and (b)
 * mark the advisory as "actuate now". A wrong restart cascade thunder-herds the
 * fleet, so the default is plan-only.
 *
 * Knobs / CLI:
 *   --apply                actuate the staggered restart (default = dry-run)
 *   --threshold N          5h fraction that triggers a switch (def 0.90; env
 *                          PRISM_ACCT_SWITCH_PCT overrides; CLI wins over env)
 *   --self <slot>          this chat's slot (never restarted; env PRISM_SLOT too)
 *   --slots a,b,c          explicit restart roster (overrides active-fleet)
 *   --stagger-ms / --poll-ms / --timeout-ms / --min-growth / --wake-cmd
 *                          forwarded verbatim to fleet-wake-sequencer
 *   --json                 compact JSON output
 *   PRISM_ROOT             repo root override (tests)
 *
 * @module account-switch-restart-coordinator
 */

import fs from "node:fs";
import path from "node:path";
import { SLOT_NAMES } from "../.claude/helpers/chat-slots.mjs";
import {
  computeWakePlan,
  readActiveFleet,
  runSequencer,
} from "./fleet-wake-sequencer.mjs";
import {
  DEFAULT_ACCOUNTS_ROOT,
  activateAccount,
  credentialSnapshotPath,
  nextAccountInRotation,
  readActiveAccount,
  readRotationOrder,
} from "./lib/claude-account-lib.mjs";
import { decideSwitch, absThresholdFromEnv } from "./lib/five-hour-switch-gate.mjs";
import { fiveHourTokenSum, FIVE_HOURS_MS } from "./lib/five-hour-token-sum.mjs";
// U-5H-ACCOUNT-BOUNDARY: the switch DECISION must use the per-account-floored 5h window (else after a
// switch the raw sum still counts the OLD account's tokens -> the coordinator could re-switch = thrash).
import { readSwitchBoundaryMs, effectiveWindowMs } from "./five-hour-limit-tracker.mjs";
import { budgetFromEnv, computePct } from "./populate-five-hour-sidecar.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";

export const DEFAULT_THRESHOLD = 0.90;          // 90% of the 5h window
const DEFAULT_SIDECAR_DIR = path.join(ROOT, "state/shared");
// The command that performs the swap. As of U-ACCT-SWITCH-U2 the credential swap
// is SCRIPTABLE (switch-claude-account.mjs --next --apply) when the next account's
// credential was captured (U1); first-time setup still needs an interactive
// `claude login` to capture that account before --next can rotate to it.
export const SWITCH_COMMAND = "node H:/prism/scripts/switch-claude-account.mjs --next --apply";

// ═════════════════════════════════════════════════════════════════════════════
// PURE CORE — no I/O, fully unit-testable.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The 90% gate. True iff the 5h-usage fraction is a finite number in [0,1] AND
 * at or above the threshold. Anything non-finite (NaN / null / undefined /
 * Infinity / non-numeric) → FALSE — but the caller is responsible for failing
 * LOUD on a *missing* source (a null 5h reading is "unknown", not "0% used", and
 * must never be silently treated as "don't switch" without surfacing why).
 *
 * @param {number|null|undefined} fiveHourPct  usage fraction 0..1
 * @param {number} [threshold=DEFAULT_THRESHOLD]
 * @returns {boolean}
 */
export function shouldSwitch(fiveHourPct, threshold = DEFAULT_THRESHOLD) {
  const p = Number(fiveHourPct);
  const t = Number.isFinite(threshold) ? threshold : DEFAULT_THRESHOLD;
  if (!Number.isFinite(p)) return false;
  if (p < 0) return false;
  return p >= t;
}

/**
 * Plan the staggered restart roster: validate against SLOT_NAMES, drop unknowns,
 * dedup, never restart self, front-load priority (golf reaper first). This is the
 * SAME ordering contract as fleet-wake-sequencer.computeWakePlan() — we delegate
 * to it so the two can never drift — and return the bare slot order that the
 * restart handoff will drive.
 *
 * @param {string[]} activeSlots
 * @param {{selfSlot?:string|null, priority?:string[]}} [opts]
 * @returns {string[]}  ordered, deduped, self-excluded restart roster
 */
export function planSwitchRestart(activeSlots, opts = {}) {
  return computeWakePlan(activeSlots, opts).map((p) => p.slot);
}

/** Parse PRISM_ACCT_SWITCH_PCT from env → fraction in (0,1]. Falls back to default. Pure. */
export function thresholdFromEnv(env = process.env) {
  const v = parseFloat(env?.PRISM_ACCT_SWITCH_PCT);
  if (Number.isFinite(v) && v > 0 && v <= 1) return v;
  return DEFAULT_THRESHOLD;
}

/**
 * Compose the operator-facing account-switch directive. Pure — all inputs given.
 * The switch is interactive (browser OAuth), so this is an ADVISORY + the exact
 * command, never an auto-actuation claim.
 *
 * @param {{pct:number, threshold:number, source:string, apply:boolean, restartPlan:string[]}} s
 * @returns {string}
 */
export function composeSwitchAdvisory(s) {
  const pctStr = Number.isFinite(s?.pct) ? `${(s.pct * 100).toFixed(1)}%` : "unknown";
  const thrStr = Number.isFinite(s?.threshold) ? `${(s.threshold * 100).toFixed(0)}%` : "90%";
  const roster = Array.isArray(s?.restartPlan) && s.restartPlan.length ? s.restartPlan.join(", ") : "(none)";
  const mode = s?.apply ? "WILL actuate the staggered restart now" : "DRY-RUN — planned restart only (pass --apply to actuate)";
  return [
    `[acct:switch] 5h usage ${pctStr} >= ${thrStr} threshold (source: ${s?.source || "?"}).`,
    `ACTION REQUIRED (interactive — cannot be auto-scripted, ZULU-ACCOUNT-CYCLE-MS0 C1/C2):`,
    `  1. Run:  ${SWITCH_COMMAND}`,
    `     (or: claude logout && claude login) and complete the browser OAuth for the next account.`,
    `  2. The fleet will then be STAGGER-restarted one chat at a time, each gated on its`,
    `     token counter registering before the next — order: ${roster}.`,
    `Restart handoff: ${mode}.`,
  ].join("\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// I/O — injectable, fail-soft per-read; the orchestrator decides fail-loud policy.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * On-demand 5h fallback: when NO sidecar carries a usable quota.fiveHour (this
 * host never emits rate_limits.five_hour, so the live token-awareness hook leaves
 * the field absent), compute the HOST-WIDE rolling-5h weighted token sum directly
 * from the transcripts at the point of consumption. This dissolves the
 * two-writers problem (no sidecar population needed, no clobber) and is always
 * fresh -- the coordinator becomes self-sufficient.
 *
 * The sum is host-wide (all transcripts in the 5h window) = already the
 * account-wide figure the coordinator wants, so it is returned directly (the
 * per-slot MAX in readFiveHourPct is for the rate_limits case where each chat
 * reports its own view of the shared window).
 *
 * Fail-soft: if the sum throws or yields no finite weighted, returns null and the
 * caller stays at "unknown" -> the orchestrator fails LOUD (never silent). pct is
 * derived from PRISM_5H_WEIGHTED_BUDGET / PRISM_5H_TOKEN_BUDGET when set, else null
 * (NO fabricated denominator -- keystone #3's absolute weighted trigger handles
 * the denominator-free case).
 *
 * @param {{nowMs?:number, env?:object, _sum?:function}} [o]
 * @returns {{pct:number|null, weighted:number, source:string, meteredTokens:number|null}|null}
 */
export function fiveHourFallbackFromTranscripts(o = {}) {
  const env = o.env || process.env;
  const now = Number.isFinite(o.nowMs) ? o.nowMs : Date.now();
  const sumFn = o._sum || fiveHourTokenSum;
  // Floor the window at the last account-switch so the DECISION reflects the CURRENT account only
  // (after a switch the raw 5h sum still includes the old account -> the coordinator would re-trigger
  // a switch = thrash). A null/older boundary leaves the full 5h window (backward compatible).
  // Injectable for tests (mirrors the existing o._sum hook).
  const boundaryMs = (o._readBoundary || readSwitchBoundaryMs)({ nowMs: now });
  const effWindowMs = effectiveWindowMs(now, FIVE_HOURS_MS, boundaryMs);
  let sum = null;
  try {
    sum = sumFn({ nowMs: now, windowMs: effWindowMs });
  } catch {
    return null; // fail-soft: unreadable transcripts -> unknown -> caller fails loud
  }
  if (!sum || sum.weightedTokens == null || !Number.isFinite(Number(sum.weightedTokens))) return null;
  const weighted = Number(sum.weightedTokens);
  let pct = null;
  try {
    const info = computePct(sum, budgetFromEnv(env));
    pct = info && info.pct != null && Number.isFinite(Number(info.pct)) ? Number(info.pct) : null;
  } catch {
    pct = null;
  }
  const metered = Number.isFinite(Number(sum.meteredTokens)) ? Number(sum.meteredTokens) : null;
  return {
    pct,
    weighted,
    source: `transcript-sum:on-demand(weighted=${weighted}${metered != null ? `,metered=${metered}` : ""})`,
    meteredTokens: metered,
  };
}

/**
 * Read the canonical 5h-usage fraction from the token-awareness sidecars.
 *
 * Source of truth: state/shared/token-budget-<slot>.json → quota.fiveHour.pct
 * (written by token-awareness-sidecar.mjs from Claude Code's
 * rate_limits.five_hour.used_percentage, normalized to 0..1).
 *
 * Why MAX across the active fleet: per ZULU-ACCOUNT-CYCLE-MS0 §C6 the rotation
 * unit is "all chats on account-N" — every active chat shares the SAME account's
 * single 5-hour window, so the account is at 90% the instant ANY of its chats
 * reports 90%. Taking the max is the honest "is this account at 90%?" reading
 * (a stale/idle chat reporting a low number must not mask a hot chat at 95%).
 *
 * Fail-soft per file (corrupt/missing/null quota → that slot contributes
 * nothing), but returns pct:null when NO slot yields a finite reading — the
 * orchestrator turns that into a LOUD failure (never a silent skip).
 *
 * @returns {{pct:number|null, source:string|null, perSlot:Record<string,number>, slotsRead:number}}
 */
export function readFiveHourPct(opts = {}) {
  const _fs = opts._fs || fs;
  const dir = opts.sidecarDir || DEFAULT_SIDECAR_DIR;
  // Limit to the active roster when given, else scan all token-budget-*.json.
  const slots = Array.isArray(opts.slots) && opts.slots.length
    ? opts.slots.filter((s) => SLOT_NAMES.includes(s))
    : null;

  const perSlot = {};
  let files = [];
  try {
    if (slots) {
      files = slots.map((s) => ({ slot: s, file: path.join(dir, `token-budget-${s}.json`) }));
    } else {
      files = _fs.readdirSync(dir)
        .filter((f) => /^token-budget-[a-z]+\.json$/.test(f))
        .map((f) => ({ slot: f.replace(/^token-budget-|\.json$/g, ""), file: path.join(dir, f) }))
        .filter((x) => SLOT_NAMES.includes(x.slot));
    }
  } catch {
    return { pct: null, source: null, perSlot: {}, slotsRead: 0 };
  }

  let best = null;
  let bestSlot = null;
  let slotsRead = 0;
  let bestWeighted = null;
  for (const { slot, file } of files) {
    let doc = null;
    try {
      if (!_fs.existsSync(file)) continue;
      doc = JSON.parse(_fs.readFileSync(file, "utf-8"));
    } catch { continue; }
    slotsRead++;
    const wRaw = doc?.quota?.fiveHour?.weightedTokens;
    const wNum = wRaw == null ? NaN : Number(wRaw); // == null -> unknown (Number(null)===0 trap); real 0 stays valid
    if (Number.isFinite(wNum) && (bestWeighted === null || wNum > bestWeighted)) bestWeighted = wNum;
    const raw = doc?.quota?.fiveHour?.pct;
    if (raw == null) continue; // explicit null = unknown, NOT 0% (Number(null)===0 trap)
    const p = Number(raw);
    if (!Number.isFinite(p)) continue;       // null/undef quota → unknown, not 0
    if (best === null || p > best) { best = p; bestSlot = slot; }
  }
  // Sidecars carried NO usable 5h figure (this host never emits
  // rate_limits.five_hour, so the live token-awareness hook leaves quota.fiveHour
  // absent). Fall back to an on-demand host-wide transcript sum so the coordinator
  // is self-sufficient -- no sidecar population, no two-writers problem, always
  // fresh. Sidecar-first: a real rate_limits-based pct, if it ever appears, wins.
  // Gated on (_sum injected | fallbackLive) so existing direct-call unit tests
  // (no _sum) keep their exact behavior; env kill-switch PRISM_5H_ONDEMAND_FALLBACK=0.
  const _env = opts.env || process.env;
  if (
    best === null && bestWeighted === null &&
    _env.PRISM_5H_ONDEMAND_FALLBACK !== "0" &&
    (opts._sum || opts.fallbackLive)
  ) {
    const fb = fiveHourFallbackFromTranscripts({ nowMs: opts.nowMs, env: _env, _sum: opts._sum });
    if (fb) {
      return {
        pct: fb.pct,
        weighted: fb.weighted,
        source: fb.source,
        perSlot,
        slotsRead,
        fallback: true,
        meteredTokens: fb.meteredTokens,
      };
    }
  }

  return {
    pct: best,
    weighted: bestWeighted,
    source: best === null ? null : `token-budget-${bestSlot}.json:quota.fiveHour.pct`,
    perSlot,
    slotsRead,
  };
}

/**
 * Resolve whether the credential swap can be auto-scripted right now (U2 wiring).
 *
 * The swap is auto-scriptable iff a DISTINCT next account exists in the rotation
 * AND that account's credential was already captured (U1) — a non-empty snapshot
 * file. If not (single account, no ROTATION_ORDER, or the next account was never
 * captured), the coordinator must fall back to the interactive advisory: you
 * cannot rotate to an account whose OAuth bundle was never captured.
 *
 * Fail-soft: any read error → canAutoSwap:false with a reason (never throws; the
 * coordinator simply uses the advisory path).
 *
 * @returns {{active:string|null, next:string|null, canAutoSwap:boolean, reason:string}}
 */
export function resolveSwapTarget(opts = {}) {
  const _fs = opts._fs || fs;
  const accountsRoot = opts.accountsRoot || DEFAULT_ACCOUNTS_ROOT;
  let active = null, order = null;
  try { active = readActiveAccount({ accountsRoot, _fs }); } catch { active = null; }
  try { order = readRotationOrder({ accountsRoot, _fs }); } catch { order = null; }
  if (!Array.isArray(order) || order.length < 2) {
    return { active, next: null, canAutoSwap: false, reason: "no-rotation-order (need >=2 captured accounts in ROTATION_ORDER.json)" };
  }
  const next = nextAccountInRotation(active, order);
  if (!next) return { active, next: null, canAutoSwap: false, reason: "rotation-empty" };
  if (next === active) return { active, next, canAutoSwap: false, reason: "next-equals-active (single-account rotation)" };
  // Verify the next account's credential was captured (non-empty snapshot).
  let captured = false;
  try {
    const credPath = credentialSnapshotPath(next, { accountsRoot });
    captured = _fs.existsSync(credPath) && _fs.statSync(credPath).size > 0;
  } catch { captured = false; }
  if (!captured) {
    return { active, next, canAutoSwap: false, reason: `next account '${next}' has no captured credential (run \`claude login\` as ${next} then capture-claude-credentials.mjs)` };
  }
  return { active, next, canAutoSwap: true, reason: "ready" };
}

/**
 * Compose the auto-swap summary line (pure). Used when the swap was actually
 * scripted (canAutoSwap) instead of advised. Distinct from composeSwitchAdvisory
 * (the manual-fallback directive).
 *
 * @param {{from:string|null, to:string, apply:boolean, dryRun:boolean, restartPlan:string[]}} s
 * @returns {string}
 */
export function composeAutoSwapSummary(s) {
  const roster = Array.isArray(s?.restartPlan) && s.restartPlan.length ? s.restartPlan.join(", ") : "(none)";
  const mode = s?.dryRun
    ? `DRY-RUN — credential swap ${s?.from ?? "none"} -> ${s?.to} planned (pass --apply to actuate swap + restart)`
    : `ACTUATED — credential swapped ${s?.from ?? "none"} -> ${s?.to}; live ~/.claude/.credentials.json now points at ${s?.to}`;
  return [
    `[acct:switch] auto-swap (U2): ${mode}.`,
    `  Next: the fleet is STAGGER-restarted one chat at a time, each gated on its token`,
    `  counter registering before the next — order: ${roster}.`,
  ].join("\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION — read 5h → fail-loud-if-null → gate → switch-advisory → restart.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The coordinator. Returns a structured report; throws ONLY on a genuinely
 * unreadable 5h source (fail-loud per R12 — a missing 5h signal must surface, not
 * silently skip a switch). All actuation is dry-run unless opts.apply.
 *
 * @param {object} opts
 * @param {boolean} [opts.apply=false]          actuate the staggered restart
 * @param {number}  [opts.threshold]            5h trigger fraction (def env/0.90)
 * @param {string}  [opts.selfSlot]             never-restart-self
 * @param {string[]}[opts.slots]                explicit restart roster
 * @param {function}[opts.readFiveHourPctFn]    injected 5h reader (tests)
 * @param {function}[opts.readActiveFleetFn]    injected roster reader (tests)
 * @param {function}[opts.runSequencerFn]       injected restart driver (tests)
 *  + all fleet-wake-sequencer knobs (staggerMs, pollMs, perSlotTimeoutMs, ...).
 * @returns {Promise<object>}
 */
export async function runCoordinator(opts = {}) {
  const apply = opts.apply === true;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : thresholdFromEnv(opts.env || process.env);
  const selfSlot = opts.selfSlot || opts.env?.PRISM_SLOT || process.env.PRISM_SLOT || null;

  const readFiveHour = opts.readFiveHourPctFn || ((o) => readFiveHourPct(o));
  const readFleet = opts.readActiveFleetFn || ((o) => readActiveFleet(o));
  const runSeq = opts.runSequencerFn || ((o) => runSequencer(o));

  // 1. DETECT — read the canonical 5h source.
  const roster = Array.isArray(opts.slots) && opts.slots.length
    ? opts.slots.filter((s) => SLOT_NAMES.includes(s))
    : readFleet(opts);
  const reading = readFiveHour({ ...opts, slots: roster });

  // 2. DECIDE: pct gate when a budget is set, else absolute weighted-token
  // trigger (keystone #3, denominator-free), else undecidable -> fail loud.
  const decision = decideSwitch(
    { pct: reading.pct, weightedTokens: reading.weighted },
    { threshold, absThreshold: absThresholdFromEnv(opts.env || process.env) },
  );
  // A missing signal (no pct AND no absolute trigger) must surface, never be
  // swallowed -- same R12 contract + same error code as before.
  if (decision.gate === "undecidable") {
    const wLive = reading?.weighted == null ? NaN : Number(reading.weighted);
    const wInfo = Number.isFinite(wLive)
      ? `Live 5h weighted=${wLive} (on-demand transcript sum) -- set PRISM_5H_WEIGHTED_TOKEN_TRIGGER below your observed ceiling to arm the switch. `
      : `populate-five-hour-sidecar.mjs writes the real weightedTokens to calibrate against. `;
    const err = new Error(
      `[acct:switch] 5h-usage source unavailable (read ${reading?.slotsRead ?? 0} sidecar(s); no finite quota.fiveHour.pct AND no absolute trigger). ` +
      `Cannot decide a switch. Set PRISM_5H_WEIGHTED_BUDGET (pct path) or PRISM_5H_WEIGHTED_TOKEN_TRIGGER (denominator-free). ` +
      wInfo + `Until then this is operator-manual.`,
    );
    err.code = "FIVE_HOUR_SOURCE_UNAVAILABLE";
    err.slotsRead = reading?.slotsRead ?? 0;
    throw err;
  }

  const pct = reading.pct != null && Number.isFinite(Number(reading.pct)) ? Number(reading.pct) : null;
  const restartPlan = planSwitchRestart(roster, { selfSlot, priority: opts.priority });

  // 3. GATE.
  const trigger = decision.switch;
  if (!trigger) {
    return {
      ok: true,
      apply,
      switched: false,
      fiveHourPct: pct,
      threshold,
      source: reading.source,
      reason: "below-threshold",
      restartPlan,
      advisory: null,
      swap: null,
      restart: null,
    };
  }

  // 3. SWITCH. Two paths:
  //   (a) AUTO-SWAP (opt-in: opts.autoSwap) — U2 wiring. If a distinct next
  //       account with a captured credential exists, SCRIPT the swap via
  //       activateAccount() (dry-run unless --apply). This is the closed loop.
  //   (b) ADVISORY (default + fallback) — interactive OAuth directive. Used when
  //       auto-swap isn't opted in, OR when it is but the next account was never
  //       captured (can't rotate to an un-captured account).
  const wantAuto = opts.autoSwap === true;
  const resolveSwap = opts.resolveSwapTargetFn || ((o) => resolveSwapTarget(o));
  const doSwap = opts.swapAccountFn || ((o) => activateAccount(o));

  let swap = null;
  let advisory;
  let target = wantAuto ? resolveSwap({ ...opts, accountsRoot: opts.accountsRoot }) : null;

  if (wantAuto && target && target.canAutoSwap) {
    // Actuate (or plan) the credential swap. dryRun unless --apply.
    let swapResult;
    try {
      swapResult = await doSwap({
        accountName: target.next,
        accountsRoot: opts.accountsRoot,
        by: "account-switch-coordinator",
        trigger: "five-hour-90pct",
        dryRun: !apply,
      });
    } catch (e) {
      // Swap failed LOUD (e.g. corrupt captured credential). Do NOT proceed to
      // restart on a failed swap — surface and fall back to the advisory so the
      // operator fixes the credential rather than restarting onto a broken one.
      swap = { ok: false, error: String(e?.message || e), from: target.active, to: target.next };
      advisory = composeSwitchAdvisory({ pct, threshold, source: reading.source, apply, restartPlan })
        + `\n[acct:switch] AUTO-SWAP FAILED (${swap.error}) — fell back to manual; NOT restarting onto a broken credential.`;
      return {
        ok: true, apply, switched: true, fiveHourPct: pct, threshold, source: reading.source,
        reason: "swap-failed-fell-back-to-advisory", restartPlan, advisory, swap,
        switchCommand: SWITCH_COMMAND, restart: null,
      };
    }
    swap = { ok: true, mode: apply ? "actuated" : "dry-run", ...swapResult };
    advisory = composeAutoSwapSummary({
      from: target.active, to: target.next, apply, dryRun: !apply, restartPlan,
    });
  } else {
    // Advisory path (default or fallback). If auto-swap was requested but blocked,
    // explain why (e.g. next account not captured) so it's actionable.
    advisory = composeSwitchAdvisory({ pct, threshold, source: reading.source, apply, restartPlan });
    if (wantAuto && target && !target.canAutoSwap) {
      advisory += `\n[acct:switch] auto-swap requested but unavailable: ${target.reason}.`;
    }
  }

  // 4. RESTART handoff. Hand off to the staggered, token-gated restart. DRY-RUN
  // unless --apply. We forward every wake-sequencer knob verbatim; `confirm:apply`
  // is the sequencer's actuation gate (it only sends keys when confirm===true).
  const restart = await runSeq({
    ...opts,
    slots: roster,
    selfSlot,
    confirm: apply,
  });

  return {
    ok: true,
    apply,
    switched: true,
    fiveHourPct: pct,
    threshold,
    source: reading.source,
    reason: "at-or-above-threshold",
    restartPlan,
    advisory,
    swap,
    autoSwap: wantAuto,
    switchCommand: SWITCH_COMMAND,
    restart,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--json") a.json = true;
    else if (t === "--auto-swap") a.autoSwap = true;
    else if (t === "--accounts-root") a.accountsRoot = argv[++i];
    else if (t === "--threshold") a.threshold = Number(argv[++i]);
    else if (t === "--self") a.self = argv[++i];
    else if (t === "--slots") a.slots = argv[++i];
    else if (t === "--stagger-ms") a.staggerMs = Number(argv[++i]);
    else if (t === "--poll-ms") a.pollMs = Number(argv[++i]);
    else if (t === "--timeout-ms") a.timeoutMs = Number(argv[++i]);
    else if (t === "--min-growth") a.minGrowth = Number(argv[++i]);
    else if (t === "--wake-cmd") a.wakeCmd = argv[++i];
    else a._.push(t);
  }
  return a;
}

function numOr(v, d) { return Number.isFinite(v) ? v : d; }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slots = args.slots ? String(args.slots).split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  let out;
  try {
    out = await runCoordinator({
      fallbackLive: true,
      apply: args.apply === true,
      autoSwap: args.autoSwap === true,
      accountsRoot: args.accountsRoot || undefined,
      threshold: Number.isFinite(args.threshold) ? args.threshold : undefined,
      selfSlot: args.self || process.env.PRISM_SLOT || null,
      slots,
      staggerMs: numOr(args.staggerMs),
      pollMs: numOr(args.pollMs),
      perSlotTimeoutMs: numOr(args.timeoutMs),
      minGrowthBytes: numOr(args.minGrowth),
      wakeCmd: args.wakeCmd || undefined,
    });
  } catch (e) {
    // Fail-loud: emit the structured failure + non-zero exit so a scheduled
    // caller surfaces it (the 5h source being unavailable is operator-actionable).
    const payload = { ok: false, error: e?.code || "error", message: String(e?.message || e), slotsRead: e?.slotsRead ?? null };
    process.stdout.write(JSON.stringify(payload, null, args.json ? 0 : 2) + "\n");
    process.exit(2);
  }

  if (out.advisory) process.stderr.write(out.advisory + "\n");
  process.stdout.write(JSON.stringify(out, null, args.json ? 0 : 2) + "\n");
}

const __invokedDirectly = (() => {
  try { return path.basename(process.argv[1] || "") === "account-switch-restart-coordinator.mjs"; }
  catch { return false; }
})();

if (__invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[account-switch-restart-coordinator] fatal: ${e?.stack || e}\n`);
    process.exit(1);
  });
}
