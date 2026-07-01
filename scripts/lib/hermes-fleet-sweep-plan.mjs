// scripts/lib/hermes-fleet-sweep-plan.mjs
//
// PURE planner for the durable Hermes FLEET SWEEP cron (HERMES-FLEET-MAXOUT/U-CRON).
//
// The sweep's job: while the fleet is running, periodically fire the PROVEN
// hermes-work-loop-driver.mts (-> parallel Hermes agents on the FREE NVIDIA lane +
// Obsidian vault context) on the next batch of OPEN fleet units -- so the fleet
// "covers more ground" autonomously, $0 / off-Claude, even while slots are busy or idle.
//
// This module owns ONLY the decision: given the current sweep state (last-sweep time,
// today's spent Hermes-call budget, fleet idle-slot count) it returns whether to fire
// THIS tick and how wide (maxUnits / maxParallel). The shell (hermes-fleet-sweep.mjs)
// does the I/O + spawns the driver + records the outcome. Keeping the decision pure
// makes the quota math unit-testable without spawning a single agent.
//
// QUOTA-AWARENESS (from [[reference_parallel_hermes_ratelimit_pattern_2026_06_29]] --
// parallel Hermes agents hit a provider rate ceiling; NVIDIA NGC has its own quota):
//   - a per-UTC-day call budget (resets at midnight UTC),
//   - a minimum interval between sweeps (no back-to-back storms),
//   - a small maxParallel cap (the cloud-lane rate ceiling),
//   - maxUnits bounded by the remaining daily budget.
// All four are knob-overridable; defaults are deliberately CONSERVATIVE because the live
// NVIDIA NGC free-tier ceiling is not yet characterized (R12 -- bound by budget, say so).
//
// PURE -- no I/O, no Date.now(); the caller passes nowMs. Fully unit-testable.
// @module hermes-fleet-sweep-plan

export const SWEEP_DEFAULTS = Object.freeze({
  dailyBudget: 300,            // max Hermes agent calls per UTC day (conservative; NVIDIA NGC quota uncharacterized)
  minIntervalMs: 45 * 60_000,  // >= 45 min between sweeps (no back-to-back storms)
  maxParallel: 2,              // cloud-lane rate-ceiling cap (parallel Hermes calls per wave)
  maxUnitsCap: 6,              // never feed more than this many units in one sweep
  minUnits: 1,                 // a sweep that fires always feeds at least one unit
  unitsPerIdleSlot: 0.25,      // maxUnits scales ~ idleSlots/4 (quiet fleet -> cover a bit more ground)
});

/** Resolve the knob-overridable sweep options from env (each falls back to the conservative default). */
export function resolveSweepOpts(env = process.env) {
  const num = (k, d) => {
    const n = Number(env?.[k]);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    dailyBudget: num("PRISM_HERMES_SWEEP_DAILY_BUDGET", SWEEP_DEFAULTS.dailyBudget),
    minIntervalMs: num("PRISM_HERMES_SWEEP_MIN_INTERVAL_MS", SWEEP_DEFAULTS.minIntervalMs),
    maxParallel: num("PRISM_HERMES_SWEEP_MAX_PARALLEL", SWEEP_DEFAULTS.maxParallel),
    maxUnitsCap: num("PRISM_HERMES_SWEEP_MAX_UNITS", SWEEP_DEFAULTS.maxUnitsCap),
    minUnits: SWEEP_DEFAULTS.minUnits,
    unitsPerIdleSlot: SWEEP_DEFAULTS.unitsPerIdleSlot,
  };
}

/** UTC day key (YYYY-MM-DD) for the daily-budget reset boundary. Pure (explicit ms arg). */
export function utcDayKey(ms) {
  const n = Number.isFinite(ms) ? ms : 0;
  return new Date(n).toISOString().slice(0, 10);
}

/**
 * Decide whether THIS sweep tick fires, and how wide.
 *
 * @param {object} state
 * @param {number} state.nowMs            current epoch ms (caller supplies -- keeps this pure)
 * @param {number} [state.idleSlots]      count of idle fleet slots (more idle -> a bit more ground)
 * @param {number} [state.lastSweepMs]    epoch ms of the previous sweep (0 = never)
 * @param {number} [state.dailyCallsUsed] Hermes calls already spent in state.budgetDay
 * @param {string} [state.budgetDay]      UTC day (YYYY-MM-DD) state.dailyCallsUsed belongs to
 * @param {object} [opts]                 resolveSweepOpts() result (defaults applied if absent)
 * @returns {{fire:boolean, reason:string, maxUnits:number, maxParallel:number,
 *            usedToday:number, remaining:number, budgetDay:string, nextEligibleMs?:number}}
 */
export function planSweep(state = {}, opts = {}) {
  const o = { ...SWEEP_DEFAULTS, ...opts };
  const nowMs = Number.isFinite(state.nowMs) ? state.nowMs : 0;
  const idleSlots = Number.isFinite(state.idleSlots) ? Math.max(0, Math.floor(state.idleSlots)) : 0;
  const lastSweepMs = Number.isFinite(state.lastSweepMs) ? state.lastSweepMs : 0;

  // Daily budget resets at UTC midnight: a recorded day != today -> 0 spent so far today.
  const today = utcDayKey(nowMs);
  const usedToday = (state.budgetDay === today && Number.isFinite(state.dailyCallsUsed))
    ? Math.max(0, Math.floor(state.dailyCallsUsed))
    : 0;
  const remaining = Math.max(0, o.dailyBudget - usedToday);

  const no = (reason, extra = {}) => ({
    fire: false, reason, maxUnits: 0, maxParallel: 0, usedToday, remaining, budgetDay: today, ...extra,
  });

  // Gate 1 -- daily budget exhausted (the hard quota ceiling).
  if (remaining <= 0) return no("daily-budget-exhausted");

  // Gate 2 -- minimum interval between sweeps (no back-to-back storms). A missing/non-finite
  // lastSweepMs is coerced to 0 above ("never swept"), so the FIRST sweep fires -- safe because
  // that fire is bounded by the daily budget AND immediately stamps lastSweepMs (the next tick is
  // then interval-gated, no storm). A FUTURE lastSweepMs (clock skew) yields a negative delta
  // < interval -> no fire (fail-safe).
  if (nowMs - lastSweepMs < o.minIntervalMs) {
    return no("min-interval-not-elapsed", { nextEligibleMs: lastSweepMs + o.minIntervalMs });
  }

  // Eligible -- size the wave. maxUnits scales gently with idle slots (quiet fleet covers a
  // bit more ground) but is capped AND bounded by the remaining daily budget; maxParallel is
  // the cloud-lane rate cap, never exceeding the unit count. The fleet being fully busy
  // (idleSlots == 0) still fires at the floor -- Hermes is FREE + off-Claude, so covering
  // more ground is exactly the point (operator: "cover more ground ... since it's free").
  const byIdle = Math.min(o.maxUnitsCap, Math.max(o.minUnits, Math.ceil(idleSlots * o.unitsPerIdleSlot)));
  const maxUnits = Math.max(o.minUnits, Math.min(byIdle, remaining));
  const maxParallel = Math.max(1, Math.min(o.maxParallel, maxUnits));

  return { fire: true, reason: "eligible", maxUnits, maxParallel, usedToday, remaining, budgetDay: today };
}

/**
 * Count IDLE fleet slots from a parsed chat-slots.json (pure). A slot is ACTIVE iff it is a
 * non-null record whose lastHeartbeat (ISO string or epoch ms) is within activeWindowMs of now;
 * everything else (null/unclaimed/stale) is idle. Accepts the full object ({slots:{...}}) or a
 * bare slot map. Fail-soft: an unparseable shape -> 0 (the sweep then fires at its floor width).
 *
 * @param {object} parsed             chat-slots.json (or its .slots map)
 * @param {number} nowMs              current epoch ms
 * @param {number} [activeWindowMs]   heartbeat freshness window (default 10 min)
 * @returns {number} idle slot count
 */
export function idleSlotCount(parsed, nowMs, activeWindowMs = 10 * 60_000) {
  const slots = parsed && typeof parsed === "object"
    ? (parsed.slots && typeof parsed.slots === "object" ? parsed.slots : parsed)
    : null;
  if (!slots || typeof slots !== "object") return 0;
  const entries = Object.values(slots);
  if (entries.length === 0) return 0;
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  let active = 0;
  for (const s of entries) {
    if (!s || typeof s !== "object") continue; // null/unclaimed -> idle
    const raw = s.lastHeartbeat;
    const hb = typeof raw === "number" ? raw : (typeof raw === "string" ? Date.parse(raw) : NaN);
    // fresh (incl. a future-stamped heartbeat, treated as active = conservative) -> active
    if (Number.isFinite(hb) && now - hb < activeWindowMs) active++;
  }
  return Math.max(0, entries.length - active);
}

/**
 * Fold a completed wave's outcome back into the sweep state (pure -- the shell persists it).
 * Increments today's spent budget by the agents actually fired and stamps the sweep time.
 *
 * @param {object} prev      previous persisted state ({budgetDay, dailyCallsUsed, lastSweepMs, sweeps})
 * @param {object} outcome   { nowMs, agentsFired }
 * @returns {object} next persisted state
 */
export function applySweepOutcome(prev = {}, outcome = {}) {
  const nowMs = Number.isFinite(outcome.nowMs) ? outcome.nowMs : 0;
  const fired = Number.isFinite(outcome.agentsFired) ? Math.max(0, Math.floor(outcome.agentsFired)) : 0;
  const today = utcDayKey(nowMs);
  const carry = (prev.budgetDay === today && Number.isFinite(prev.dailyCallsUsed))
    ? Math.max(0, Math.floor(prev.dailyCallsUsed))
    : 0;
  return {
    schemaVersion: "1.0.0",
    budgetDay: today,
    dailyCallsUsed: carry + fired,
    lastSweepMs: nowMs,
    sweeps: (Number.isFinite(prev.sweeps) ? prev.sweeps : 0) + 1,
  };
}
