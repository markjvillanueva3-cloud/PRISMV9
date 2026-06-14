// scripts/lib/advisory-decay.mjs
// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
// context tokens on a nudge nobody takes. This gates that, fleet-wide.
//
// THE METRIC (R8-corrected 2026-06-09 -- a fabricated belief this fixes):
//   The token tax of an advisory hook is its INJECTION count (the
//   additionalContext it actually emits), NOT its fire count. A hook that fires
//   2374x but `pass`-emits {continue:true} 2361x and only INJECTS 13 advisories
//   costs ~13 injections of tokens, not 2374. So conversion = taken / injected
//   (offloaded / suggested), NOT offloaded / fired. Measured this way,
//   ollama-route-pretooluse converts 2/13 = 15% (HEALTHY) and ollama-task-offloader
//   12/22 = 55% (HEALTHY) -- neither is noise. The "0.1%" framing was fired-based
//   and WRONG; it is what made the memory mislabel route as "the 0.1% offender".
//
// UNMEASURABLE guard (the false-mute trap this lib exists to avoid):
//   A hook that records `suggested` but has NO `offloaded` key (e.g.
//   grep-index-first: a redirect advisory with no taken-signal) has conversion
//   0/N that means "UNMEASURED", NOT "noise". We classify it `unmeasurable` and
//   NEVER mute it -- muting on an absent signal is a false mute. Such a hook must
//   be instrumented (given a real taken-signal) before it can be judged.
//
// SELF-REVIVAL (explore-exploit; R12 -- a permanent blind mute is a kill, not a
//   "decay"): a pure mute freezes the signal (muted -> stops injecting -> can
//   never recover). So even when muted, an epsilon probe (1-in-probeInterval, by
//   the monotonic injection counter) still fires, keeping the sample alive so a
//   recovered conversion lifts the mute.
//
// FAIL-SAFE: any uncertainty (disabled, no telemetry, unreadable stats,
//   unmeasurable, insufficient injections, healthy) -> fire:true. Degrade toward
//   MORE output, never silently suppress (the find-cache stale-OOM lesson
//   inverted -- on doubt, do the visible thing).
//
// PURE-CORE + INJECTED READER so a real-data E2E is testable (R9): classify() is
// pure; decayDecision()/decayReport() take an optional readImpl + env so tests
// drive them with fixtures and the live byHook numbers, no real I/O.

import { readFileSync } from "node:fs";

export const DEFAULT_STATS_PATH =
  "H:/prism/mcp-server/data/state/ollama-offload-stats.json";

export const DEFAULTS = Object.freeze({
  minInjections: 50, // need this many INJECTIONS (not fires) before judging noise
  maxTakeRate: 0.05, // < 5% conversion on injections == proven noise
  probeInterval: 20, // even when muted, fire 1-in-N to keep the signal alive
});

// ---- knob resolution (env overrides defaults; pure given an env object) ----
function resolveOpts(opts = {}, env = process.env) {
  const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    minInjections: num(
      opts.minInjections ?? env.PRISM_ADVISORY_DECAY_MIN_INJ,
      DEFAULTS.minInjections,
    ),
    maxTakeRate: num(
      opts.maxTakeRate ?? env.PRISM_ADVISORY_DECAY_MAX_TAKE,
      DEFAULTS.maxTakeRate,
    ),
    // clamp >=1: a probeInterval of 0/neg would freeze (modulo NaN) or never
    // probe -> degrade to "always probe" (1) == effectively unmuted (safe).
    probeInterval: Math.max(
      1,
      Math.trunc(
        num(opts.probeInterval ?? env.PRISM_ADVISORY_DECAY_PROBE, DEFAULTS.probeInterval),
      ),
    ),
  };
}

/**
 * classify -- PURE. Decide a single hook's decay status from its byHook stat slot.
 *
 * @param {object} stat   - one byHook[key] slot, e.g. {fired,suggested,offloaded,kept}
 * @param {object} opts   - {minInjections, maxTakeRate} (already resolved)
 * @returns {{injected:number, taken:number|null, takeRate:number|null,
 *            hasTakenSignal:boolean, status:'healthy'|'noise'|'insufficient'|'unmeasurable'}}
 */
export function classify(stat, opts = DEFAULTS) {
  const { minInjections, maxTakeRate } = { ...DEFAULTS, ...opts };
  const s = stat && typeof stat === "object" ? stat : {};
  const injected = Math.max(0, Number(s.suggested) || 0); // clamp: a rolled-over/-ve counter never goes negative

  // A FINITE NUMBER `offloaded` is the only valid taken-signal. We require the
  // raw value be `typeof number` (not just key-present): grep-index-first's slot
  // is {fired,suggested} -- no offloaded key -> unmeasurable; and a present-but-
  // junk `offloaded` (null / "" / "x") must ALSO stay unmeasurable, NOT coerce to
  // 0 (Number(null)===0 would manufacture a false 0% -> false mute -- the
  // over-suppression direction this gate must never take). route/task/reaper
  // carry a real numeric offloaded -> measurable (reaper's offloaded:0 is a real
  // 0, classified noise in the REPORT, but only MUTED if the hook self-gates).
  const hasTakenSignal = typeof s.offloaded === "number" && Number.isFinite(s.offloaded);
  const taken = hasTakenSignal ? Math.max(0, s.offloaded) : null;

  if (!hasTakenSignal) {
    return { injected, taken: null, takeRate: null, hasTakenSignal: false, status: "unmeasurable" };
  }
  if (injected < minInjections) {
    return { injected, taken, takeRate: injected > 0 ? taken / injected : null, hasTakenSignal: true, status: "insufficient" };
  }
  const takeRate = taken / injected;
  return {
    injected,
    taken,
    takeRate,
    hasTakenSignal: true,
    status: takeRate < maxTakeRate ? "noise" : "healthy",
  };
}

// ---- stats read (fail-safe; injected for tests) ----
function readStats(statsPath, readImpl) {
  const reader = readImpl || ((p) => readFileSync(p, "utf8"));
  try {
    const raw = reader(statsPath);
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !j.byHook || typeof j.byHook !== "object") return null;
    return j;
  } catch {
    return null; // absent/corrupt -> caller fails safe (fire)
  }
}

/**
 * decayDecision -- should this advisory hook FIRE (emit its advisory) this run?
 * Fail-safe: anything other than a confirmed `noise` classification fires.
 *
 * @returns {{fire:boolean, muted:boolean, probe:boolean,
 *            status:string, takeRate:number|null, reason:string}}
 */
export function decayDecision(hookKey, {
  statsPath = DEFAULT_STATS_PATH,
  readImpl = null,
  env = process.env,
  ...rawOpts
} = {}) {
  if (String(env.PRISM_ADVISORY_DECAY_DISABLE ?? "") === "1") {
    return { fire: true, muted: false, probe: false, status: "disabled", takeRate: null, reason: "disabled" };
  }
  const opts = resolveOpts(rawOpts, env);
  const stats = readStats(statsPath, readImpl);
  if (!stats) {
    return { fire: true, muted: false, probe: false, status: "no-stats", takeRate: null, reason: "stats-unreadable-failsafe" };
  }
  const stat = stats.byHook[hookKey];
  if (!stat) {
    return { fire: true, muted: false, probe: false, status: "no-telemetry", takeRate: null, reason: "no-telemetry-for-hook" };
  }
  const c = classify(stat, opts);
  if (c.status !== "noise") {
    // healthy / insufficient / unmeasurable all FIRE (only confirmed noise mutes)
    return { fire: true, muted: false, probe: false, status: c.status, takeRate: c.takeRate, reason: c.status };
  }
  // confirmed noise -> mute, but keep an epsilon probe alive for self-revival
  const probe = c.injected % opts.probeInterval === 0;
  return {
    fire: probe,
    muted: true,
    probe,
    status: "noise",
    takeRate: c.takeRate,
    reason: probe ? "noise-probe-fire" : "noise-suppressed",
  };
}

/**
 * decayReport -- classify every byHook entry (observability CLI/skill).
 * @returns {Array<{hookKey,injected,taken,takeRate,status}>} sorted worst-first
 */
export function decayReport({ statsPath = DEFAULT_STATS_PATH, readImpl = null, env = process.env, ...rawOpts } = {}) {
  const opts = resolveOpts(rawOpts, env);
  const stats = readStats(statsPath, readImpl);
  if (!stats) return [];
  const rank = { noise: 0, unmeasurable: 1, insufficient: 2, healthy: 3 };
  return Object.entries(stats.byHook)
    .map(([hookKey, stat]) => {
      const c = classify(stat, opts);
      return { hookKey, injected: c.injected, taken: c.taken, takeRate: c.takeRate, status: c.status };
    })
    .sort((a, b) => (rank[a.status] - rank[b.status]) || (a.takeRate ?? 1) - (b.takeRate ?? 1));
}
