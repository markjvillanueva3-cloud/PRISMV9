// TOKEN-AWARENESS-MS0 / U-TA01 — pure lib for token-awareness state machine.
//
// Pure functions only. No I/O. Composes 4 data sources into one canonical
// TokenAwarenessState; classifies into 4 zones; recommends actions.
//
// Data sources (any subset may be present):
//   1. statusline — { ctxTokens, ctxMaxTokens } from transcript tail-read
//   2. rateLimits — { fiveHourPct, sevenDayPct, ... } from Claude Code v1.2.80+ statusLine stdin
//   3. transcript — { cumulative: { input, cache_read, cache_creation, output } } dedup-by-msgId
//   4. offload    — { offloaded, kept, ratio } from ollama-offload-stats.json
//
// Zone classification — worst-of (any single signal at RED → RED):
//   GREEN    worst < 60%
//   YELLOW   60% <= worst < 85%
//   RED      85% <= worst < 95%
//   CRITICAL worst >= 95%
//
// Honest scope (R12): an unknown signal doesn't downgrade the zone; it's
// excluded from the worst-of. A stale state (>180s) is flagged stale=true and
// the inject hook surfaces that — it is NOT silently demoted to fresh.

export const SCHEMA_VERSION = "1.0.0";

// Zone thresholds — env-overrideable for tuning. The order is GREEN→YELLOW→RED→CRITICAL.
export const DEFAULT_THRESHOLDS = Object.freeze({
  yellowPct: 0.60,
  redPct: 0.85,
  criticalPct: 0.95,
});

// Stale-after window. 180s, not 60s: the sidecar refreshes only on
// UserPromptSubmit / PostToolUse, so a single slow turn (a 40s Bash call is
// routine under fleet load) legitimately leaves it 60-120s old with nothing
// wrong. 60s false-flagged healthy sidecars stale on every long turn; 180s
// flags only genuinely-frozen ones. Kept equal across all three readers
// (statusline TOKEN_AWARENESS_SIDECAR_TTL_MS, precompact SIDECAR_TTL_MS).
export const DEFAULT_STALE_TTL_MS = 180_000;

export const ZONES = Object.freeze(["GREEN", "YELLOW", "RED", "CRITICAL"]);

// ── safety helpers ──────────────────────────────────────────────────────────
// Sanitize a percent input to [0, 1]. NaN / Infinity / negative / >1 → clamped.
// Returns null on null/undefined so downstream can distinguish "missing" from
// "0%" (the worst-of must ignore missing, not treat them as 0).
export function sanitizePct(x) {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// Same idea for raw token counts — null=missing, NaN/Inf → 0, negative → 0.
export function sanitizeTokens(x) {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

// ── zone classification ─────────────────────────────────────────────────────
export function computeZone(worstPct, thresholds = DEFAULT_THRESHOLDS) {
  const p = sanitizePct(worstPct);
  if (p === null) return "GREEN"; // R12: no signal → assume GREEN, surface 'unknown' source upstream
  if (p >= thresholds.criticalPct) return "CRITICAL";
  if (p >= thresholds.redPct) return "RED";
  if (p >= thresholds.yellowPct) return "YELLOW";
  return "GREEN";
}

// Determine worst-of-known signals + which signal is worst.
// Returns { worstPct: number, worstSource: 'ctx'|'5h'|'7d'|'unknown' }.
export function computeWorst({ ctxPct, fiveHourPct, sevenDayPct } = {}) {
  const signals = [
    { source: "ctx", pct: sanitizePct(ctxPct) },
    { source: "5h", pct: sanitizePct(fiveHourPct) },
    { source: "7d", pct: sanitizePct(sevenDayPct) },
  ].filter((s) => s.pct !== null);
  if (signals.length === 0) return { worstPct: 0, worstSource: "unknown" };
  let max = signals[0];
  for (const s of signals) if (s.pct > max.pct) max = s;
  return { worstPct: max.pct, worstSource: max.source };
}

// ── action decision ─────────────────────────────────────────────────────────
// Zone → recommended action. STATE not INSTRUCTION (per Reddit "model anxiety"
// warning — the inject hook phrases this as data; CLAUDE.md doctrine carries
// the directive).
export function decideAction(zone, { hasOpenWork = true } = {}) {
  switch (zone) {
    case "GREEN":
      return { action: "proceed", reasoning: "context within budget" };
    case "YELLOW":
      return {
        action: "wrap-up",
        reasoning: "approaching budget — prefer Ollama offload, batch tool calls, avoid exploratory subagents",
      };
    case "RED":
      return {
        action: "compact",
        reasoning: "near hard limit — voluntary /compact now preserves cleaner handoff than forced trip",
      };
    case "CRITICAL":
      return {
        action: "stop-and-compact",
        reasoning: hasOpenWork
          ? "at hard limit — write handoff + /compact immediately"
          : "at hard limit — /compact immediately",
      };
    default:
      return { action: "proceed", reasoning: "unknown zone — default proceed" };
  }
}

// ── ageMs / staleness ───────────────────────────────────────────────────────
export function isStale(capturedAtIso, nowMs, ttlMs = DEFAULT_STALE_TTL_MS) {
  if (!capturedAtIso) return true;
  const t = Date.parse(capturedAtIso);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > ttlMs;
}

// ── source merger ───────────────────────────────────────────────────────────
// Compose canonical TokenAwarenessState from raw source inputs. Any source may
// be null/undefined; merger handles missing gracefully.
//
// Inputs (all optional):
//   statusline: { ctxTokens, ctxMaxTokens } — from transcript tail-read
//   rateLimits: { fiveHourPct, fiveHourResetsAt, sevenDayPct, sevenDayResetsAt }
//   transcript: { input, cache_read, cache_creation, output }  — cumulative from dedup
//   offload   : { offloaded, kept, ratio }
//   nowMs     : injected clock for testability
//   thresholds: { yellowPct, redPct, criticalPct }
export function mergeFromSources({
  statusline = null,
  rateLimits = null,
  transcript = null,
  offload = null,
  nowMs = Date.now(),
  thresholds = DEFAULT_THRESHOLDS,
} = {}) {
  const sources = {
    statusline: statusline != null,
    transcript: transcript != null,
    offload: offload != null,
    rateLimits: rateLimits != null,
  };

  // ctx pct from statusline
  let ctxTokens = null;
  let ctxMaxTokens = null;
  let ctxPct = null;
  if (statusline) {
    ctxTokens = sanitizeTokens(statusline.ctxTokens);
    ctxMaxTokens = sanitizeTokens(statusline.ctxMaxTokens);
    if (ctxTokens != null && ctxMaxTokens != null && ctxMaxTokens > 0) {
      ctxPct = sanitizePct(ctxTokens / ctxMaxTokens);
    }
  }

  // quota pcts from rateLimits — fields per Claude Code v1.2.80+ statusLine spec
  let fiveHourPct = null;
  let fiveHourResetsAt = null;
  let sevenDayPct = null;
  let sevenDayResetsAt = null;
  if (rateLimits) {
    fiveHourPct = sanitizePct(rateLimits.fiveHourPct);
    fiveHourResetsAt = rateLimits.fiveHourResetsAt || null;
    sevenDayPct = sanitizePct(rateLimits.sevenDayPct);
    sevenDayResetsAt = rateLimits.sevenDayResetsAt || null;
  }

  // cumulative from transcript
  let cumulative = null;
  if (transcript) {
    cumulative = {
      input: sanitizeTokens(transcript.input) ?? 0,
      cache_read: sanitizeTokens(transcript.cache_read) ?? 0,
      cache_creation: sanitizeTokens(transcript.cache_creation) ?? 0,
      output: sanitizeTokens(transcript.output) ?? 0,
    };
  }

  // offload
  let offloadObj = null;
  if (offload) {
    const off = sanitizeTokens(offload.offloaded) ?? 0;
    const kept = sanitizeTokens(offload.kept) ?? 0;
    const ratio = off + kept > 0 ? sanitizePct(off / (off + kept)) : null;
    offloadObj = { offloaded: off, kept, ratio };
  }

  const { worstPct, worstSource } = computeWorst({ ctxPct, fiveHourPct, sevenDayPct });
  const zone = computeZone(worstPct, thresholds);
  const { action, reasoning } = decideAction(zone);

  const capturedAtIso = new Date(nowMs).toISOString();

  return {
    schemaVersion: SCHEMA_VERSION,
    capturedAt: capturedAtIso,
    sources,
    ctx: { tokens: ctxTokens, maxTokens: ctxMaxTokens, pct: ctxPct },
    quota:
      fiveHourPct === null && sevenDayPct === null
        ? null
        : {
            fiveHour: { pct: fiveHourPct, resetsAt: fiveHourResetsAt },
            sevenDay: { pct: sevenDayPct, resetsAt: sevenDayResetsAt },
          },
    cumulative,
    offload: offloadObj,
    zone,
    worstPct,
    worstSource,
    stale: false,
    ageMs: 0,
    action,
    reasoning,
  };
}

// Apply staleness to an already-merged state (used by readers -- see U-TA05/06).
// Returns a NEW object (never mutates). Marks stale=true + ageMs; KEEPS the real
// last-measured zone.
//
// WHY NOT bump a stale zone up (fixed 2026-06-11, operator-reported): staleness
// is a FRESHNESS signal, NOT a BUDGET signal -- the two are orthogonal (R7: surface
// both, don't conflate). The sidecar writer refreshes on EVERY UserPromptSubmit +
// PostToolUse, so staleness accumulates only during IDLE (no tool calls) -- exactly
// when ctx is STABLE, not growing (a session doing heavy work refreshes the sidecar
// on every tool result). The old bumpZoneForStale forced GREEN->YELLOW on any stale
// read, fabricating "approaching budget" at e.g. ctx=17% after an idle/crash gap
// (live case: a 5.3h-stale sidecar at 17% ctx rendered YELLOW). That is the exact
// inaccuracy the operator flagged. The `stale` flag + `ageMs` already carry the
// freshness uncertainty, and the inject/statusline surface it on its own line -- the
// model sees "GREEN 17% + stale 5.3h" and reasons correctly, NOT lulled. Keeping the
// measured zone is strictly more honest than fabricating a pressure level we have no
// evidence for.
export function applyStaleness(state, nowMs = Date.now(), ttlMs = DEFAULT_STALE_TTL_MS) {
  if (!state || typeof state !== "object") return state;
  const t = Date.parse(state.capturedAt || "");
  if (!Number.isFinite(t)) {
    // Unparseable capturedAt = no freshness signal. Flag stale; keep the measured
    // zone (do NOT fabricate pressure -- see the doctrine note above).
    return { ...state, stale: true, ageMs: Infinity };
  }
  const ageMs = Math.max(0, nowMs - t);
  const stale = ageMs > ttlMs;
  return { ...state, stale, ageMs };
}

// Read thresholds from env (used by hooks). Falls back to defaults.
export function thresholdsFromEnv(env = process.env) {
  const y = parseFloat(env.PRISM_TOKEN_AWARE_YELLOW_PCT);
  const r = parseFloat(env.PRISM_TOKEN_AWARE_RED_PCT);
  const c = parseFloat(env.PRISM_TOKEN_AWARE_CRIT_PCT);
  return Object.freeze({
    yellowPct: Number.isFinite(y) && y > 0 && y < 1 ? y : DEFAULT_THRESHOLDS.yellowPct,
    redPct: Number.isFinite(r) && r > 0 && r < 1 ? r : DEFAULT_THRESHOLDS.redPct,
    criticalPct: Number.isFinite(c) && c > 0 && c <= 1 ? c : DEFAULT_THRESHOLDS.criticalPct,
  });
}
