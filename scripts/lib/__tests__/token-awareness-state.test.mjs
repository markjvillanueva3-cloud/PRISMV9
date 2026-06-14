// TOKEN-AWARENESS-MS0 / U-TA01 — pure lib tests.
// Real-value assertions; no toBeDefined() stubs (CLAUDE.md R9).
// Variability floor: ≥3 zone configs + ≥3 failure modes + ≥2 adversarial.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  DEFAULT_THRESHOLDS,
  sanitizePct,
  sanitizeTokens,
  computeZone,
  computeWorst,
  decideAction,
  isStale,
  mergeFromSources,
  applyStaleness,
  thresholdsFromEnv,
} from "../token-awareness-state.mjs";

// ── sanitizers ──────────────────────────────────────────────────────────────
test("sanitizePct — null/undefined → null", () => {
  assert.equal(sanitizePct(null), null);
  assert.equal(sanitizePct(undefined), null);
});

test("sanitizePct — NaN/Infinity → null", () => {
  assert.equal(sanitizePct(Number.NaN), null);
  assert.equal(sanitizePct(Number.POSITIVE_INFINITY), null);
  assert.equal(sanitizePct(Number.NEGATIVE_INFINITY), null);
});

test("sanitizePct — clamps to [0, 1]", () => {
  assert.equal(sanitizePct(-0.5), 0);
  assert.equal(sanitizePct(1.5), 1);
  assert.equal(sanitizePct(0.5), 0.5);
});

test("sanitizeTokens — NaN → 0, negative → 0, null → null", () => {
  assert.equal(sanitizeTokens(Number.NaN), 0);
  assert.equal(sanitizeTokens(-100), 0);
  assert.equal(sanitizeTokens(null), null);
  assert.equal(sanitizeTokens(undefined), null);
  assert.equal(sanitizeTokens(42), 42);
});

// ── zone classification (variability floor — 4 zones) ──────────────────────
test("computeZone — GREEN at 10%", () => {
  assert.equal(computeZone(0.1), "GREEN");
});

test("computeZone — YELLOW at 70%", () => {
  assert.equal(computeZone(0.7), "YELLOW");
});

test("computeZone — RED at 88%", () => {
  assert.equal(computeZone(0.88), "RED");
});

test("computeZone — CRITICAL at 96%", () => {
  assert.equal(computeZone(0.96), "CRITICAL");
});

test("computeZone — boundary at exactly 60% → YELLOW", () => {
  assert.equal(computeZone(0.6), "YELLOW");
});

test("computeZone — boundary at exactly 85% → RED", () => {
  assert.equal(computeZone(0.85), "RED");
});

test("computeZone — boundary at exactly 95% → CRITICAL", () => {
  assert.equal(computeZone(0.95), "CRITICAL");
});

test("computeZone — null input → GREEN (no-signal default)", () => {
  assert.equal(computeZone(null), "GREEN");
});

test("computeZone — custom thresholds override defaults", () => {
  const tight = { yellowPct: 0.4, redPct: 0.6, criticalPct: 0.8 };
  assert.equal(computeZone(0.5, tight), "YELLOW");
  assert.equal(computeZone(0.7, tight), "RED");
  assert.equal(computeZone(0.85, tight), "CRITICAL");
});

// ── worst-of ────────────────────────────────────────────────────────────────
test("computeWorst — all signals present, ctx wins", () => {
  const r = computeWorst({ ctxPct: 0.9, fiveHourPct: 0.5, sevenDayPct: 0.6 });
  assert.equal(r.worstPct, 0.9);
  assert.equal(r.worstSource, "ctx");
});

test("computeWorst — 5h wins when highest", () => {
  const r = computeWorst({ ctxPct: 0.3, fiveHourPct: 0.92, sevenDayPct: 0.4 });
  assert.equal(r.worstPct, 0.92);
  assert.equal(r.worstSource, "5h");
});

test("computeWorst — 7d wins when highest", () => {
  const r = computeWorst({ ctxPct: 0.2, fiveHourPct: 0.3, sevenDayPct: 0.88 });
  assert.equal(r.worstPct, 0.88);
  assert.equal(r.worstSource, "7d");
});

test("computeWorst — missing signals excluded, not treated as 0", () => {
  // R12 invariant: a missing quota signal must not silently lower the worst-of.
  const r = computeWorst({ ctxPct: 0.7, fiveHourPct: null, sevenDayPct: undefined });
  assert.equal(r.worstPct, 0.7);
  assert.equal(r.worstSource, "ctx");
});

test("computeWorst — all signals missing → unknown source", () => {
  const r = computeWorst({});
  assert.equal(r.worstPct, 0);
  assert.equal(r.worstSource, "unknown");
});

test("computeWorst — adversarial NaN excluded", () => {
  const r = computeWorst({ ctxPct: Number.NaN, fiveHourPct: 0.4, sevenDayPct: Number.NaN });
  assert.equal(r.worstPct, 0.4);
  assert.equal(r.worstSource, "5h");
});

// ── action decision ─────────────────────────────────────────────────────────
test("decideAction — GREEN → proceed", () => {
  const { action } = decideAction("GREEN");
  assert.equal(action, "proceed");
});

test("decideAction — YELLOW → wrap-up", () => {
  const { action, reasoning } = decideAction("YELLOW");
  assert.equal(action, "wrap-up");
  assert.match(reasoning, /Ollama|offload|batch/);
});

test("decideAction — RED → compact", () => {
  const { action } = decideAction("RED");
  assert.equal(action, "compact");
});

test("decideAction — CRITICAL → stop-and-compact", () => {
  const { action } = decideAction("CRITICAL");
  assert.equal(action, "stop-and-compact");
});

test("decideAction — CRITICAL with no open work omits handoff suggestion", () => {
  const { reasoning } = decideAction("CRITICAL", { hasOpenWork: false });
  assert.doesNotMatch(reasoning, /handoff/);
});

// ── staleness ───────────────────────────────────────────────────────────────
test("isStale — missing capturedAt → stale", () => {
  assert.equal(isStale(null, 0), true);
  assert.equal(isStale("", 0), true);
});

test("isStale — recent → not stale", () => {
  const now = 1_000_000_000_000;
  const iso = new Date(now - 5000).toISOString();
  assert.equal(isStale(iso, now), false);
});

test("isStale — older than TTL → stale", () => {
  const now = 1_000_000_000_000;
  // 240s old — past the 180s DEFAULT_STALE_TTL_MS.
  const iso = new Date(now - 240_000).toISOString();
  assert.equal(isStale(iso, now), true);
});

test("isStale — malformed ISO → stale", () => {
  assert.equal(isStale("not-a-date", Date.now()), true);
});

// ── merge happy paths (variability floor — 3 spanning configs) ─────────────
test("mergeFromSources — config A: GREEN, all sources present", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 100_000, ctxMaxTokens: 1_000_000 },
    rateLimits: { fiveHourPct: 0.1, sevenDayPct: 0.1 },
    transcript: { input: 50_000, cache_read: 200_000, cache_creation: 10_000, output: 5_000 },
    offload: { offloaded: 60, kept: 40 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.zone, "GREEN");
  assert.equal(s.worstSource, "ctx");
  assert.equal(s.ctx.pct, 0.1);
  assert.equal(s.offload.ratio, 0.6);
  assert.equal(s.cumulative.input, 50_000);
  assert.equal(s.sources.statusline, true);
  assert.equal(s.sources.offload, true);
});

test("mergeFromSources — config B: YELLOW on 5h quota even with low ctx", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 200_000, ctxMaxTokens: 1_000_000 },
    rateLimits: { fiveHourPct: 0.75, sevenDayPct: 0.4 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.zone, "YELLOW");
  assert.equal(s.worstSource, "5h");
  assert.equal(s.action, "wrap-up");
});

test("mergeFromSources — config C: RED on ctx alone, no quota signal", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 880_000, ctxMaxTokens: 1_000_000 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.zone, "RED");
  assert.equal(s.worstSource, "ctx");
  assert.equal(s.quota, null);
  assert.equal(s.sources.rateLimits, false);
});

test("mergeFromSources — config D: CRITICAL on 7d quota", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 50_000, ctxMaxTokens: 1_000_000 },
    rateLimits: { fiveHourPct: 0.3, sevenDayPct: 0.98 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.zone, "CRITICAL");
  assert.equal(s.worstSource, "7d");
  assert.equal(s.action, "stop-and-compact");
});

// ── merge failure modes ────────────────────────────────────────────────────
test("mergeFromSources — empty input → GREEN, all sources false", () => {
  const s = mergeFromSources({ nowMs: 1_000_000_000_000 });
  assert.equal(s.zone, "GREEN");
  assert.equal(s.worstSource, "unknown");
  assert.equal(s.sources.statusline, false);
  assert.equal(s.sources.rateLimits, false);
  assert.equal(s.sources.transcript, false);
  assert.equal(s.sources.offload, false);
});

test("mergeFromSources — ctxMaxTokens=0 → ctxPct null (no div-by-zero)", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 1000, ctxMaxTokens: 0 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.ctx.pct, null);
});

test("mergeFromSources — NaN ctxTokens → 0", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: Number.NaN, ctxMaxTokens: 1_000_000 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.ctx.tokens, 0);
  assert.equal(s.ctx.pct, 0);
});

// ── adversarial ────────────────────────────────────────────────────────────
test("mergeFromSources — Infinity rate-limit pct → null (excluded from worst)", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 100_000, ctxMaxTokens: 1_000_000 },
    rateLimits: { fiveHourPct: Number.POSITIVE_INFINITY, sevenDayPct: Number.NEGATIVE_INFINITY },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.zone, "GREEN");
  assert.equal(s.worstSource, "ctx");
});

test("mergeFromSources — adversarial negative offload → 0", () => {
  const s = mergeFromSources({
    offload: { offloaded: -50, kept: -10 },
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.offload.offloaded, 0);
  assert.equal(s.offload.kept, 0);
  assert.equal(s.offload.ratio, null); // div by zero guard
});

// ── staleness application ──────────────────────────────────────────────────
test("applyStaleness — fresh state → unchanged zone, stale=false", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 100_000, ctxMaxTokens: 1_000_000 },
    nowMs: 1_000_000_000_000,
  });
  const aged = applyStaleness(s, 1_000_000_000_000 + 5_000);
  assert.equal(aged.stale, false);
  assert.equal(aged.zone, "GREEN");
});

test("applyStaleness — old GREEN KEEPS zone GREEN (staleness != budget pressure) + stale=true", () => {
  // CORRECTED 2026-06-11 (operator-reported): a stale GREEN must NOT be bumped to
  // YELLOW. Staleness is a freshness signal, not budget pressure -- the sidecar
  // refreshes on every tool call, so a stale read means IDLE (ctx stable), not
  // unobserved growth. The old bumpZoneForStale fabricated "approaching budget" here.
  const s = mergeFromSources({
    statusline: { ctxTokens: 100_000, ctxMaxTokens: 1_000_000 },
    nowMs: 1_000_000_000_000,
  });
  // 240s ahead → past the 180s TTL → stale
  const aged = applyStaleness(s, 1_000_000_000_000 + 240_000);
  assert.equal(aged.stale, true);
  assert.equal(aged.zone, "GREEN");
  assert.equal(aged.ageMs, 240_000);
});

test("applyStaleness — old RED stays RED (real zone preserved)", () => {
  const s = mergeFromSources({
    statusline: { ctxTokens: 900_000, ctxMaxTokens: 1_000_000 },
    nowMs: 1_000_000_000_000,
  });
  // 240s ahead → past the 180s TTL → stale; real RED zone preserved
  const aged = applyStaleness(s, 1_000_000_000_000 + 240_000);
  assert.equal(aged.stale, true);
  assert.equal(aged.zone, "RED");
});

test("applyStaleness — missing capturedAt → stale, keeps measured zone (no fabricated bump)", () => {
  const bogus = { capturedAt: null, zone: "GREEN" };
  const aged = applyStaleness(bogus, Date.now());
  assert.equal(aged.stale, true);
  assert.equal(aged.ageMs, Infinity);
  assert.equal(aged.zone, "GREEN"); // unparseable timestamp is not budget pressure
});

// ── env threshold parsing ──────────────────────────────────────────────────
test("thresholdsFromEnv — defaults when env unset", () => {
  const t = thresholdsFromEnv({});
  assert.equal(t.yellowPct, DEFAULT_THRESHOLDS.yellowPct);
  assert.equal(t.redPct, DEFAULT_THRESHOLDS.redPct);
  assert.equal(t.criticalPct, DEFAULT_THRESHOLDS.criticalPct);
});

test("thresholdsFromEnv — env override valid range", () => {
  const t = thresholdsFromEnv({
    PRISM_TOKEN_AWARE_YELLOW_PCT: "0.5",
    PRISM_TOKEN_AWARE_RED_PCT: "0.75",
    PRISM_TOKEN_AWARE_CRIT_PCT: "0.9",
  });
  assert.equal(t.yellowPct, 0.5);
  assert.equal(t.redPct, 0.75);
  assert.equal(t.criticalPct, 0.9);
});

test("thresholdsFromEnv — invalid env values fall back to defaults", () => {
  const t = thresholdsFromEnv({
    PRISM_TOKEN_AWARE_YELLOW_PCT: "bogus",
    PRISM_TOKEN_AWARE_RED_PCT: "1.5", // out of range
    PRISM_TOKEN_AWARE_CRIT_PCT: "-0.1", // negative
  });
  assert.equal(t.yellowPct, DEFAULT_THRESHOLDS.yellowPct);
  assert.equal(t.redPct, DEFAULT_THRESHOLDS.redPct);
  assert.equal(t.criticalPct, DEFAULT_THRESHOLDS.criticalPct);
});

// ── fail-on-revert regression oracle ───────────────────────────────────────
test("regression: missing 5h doesn't silently downgrade RED ctx", () => {
  // The R12 invariant — a missing quota signal must NOT pull the worst-of down.
  // If this fails, someone changed computeWorst to treat null as 0.
  const r = computeWorst({ ctxPct: 0.9, fiveHourPct: null, sevenDayPct: null });
  assert.equal(r.worstPct, 0.9);
  assert.equal(r.worstSource, "ctx");
});

test("regression: stale GREEN KEEPS its zone (staleness is NOT budget pressure)", () => {
  // CORRECTED invariant (2026-06-11). applyStaleness must NOT bump a stale GREEN to
  // YELLOW. The old behavior rendered a 5.3h-stale sidecar at ctx=17% as "YELLOW
  // approaching budget" -- the operator-reported lie. Staleness is surfaced via the
  // stale flag + ageMs; the zone reflects the last MEASURED budget. If this fails,
  // someone re-added bumpZoneForStale and regressed the fix.
  const s = {
    capturedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    zone: "GREEN",
  };
  const aged = applyStaleness(s, Date.now());
  assert.equal(aged.zone, "GREEN");
  assert.equal(aged.stale, true);
});

test("regression: operator live case — deeply-GREEN ctx that is HOURS stale renders GREEN, not YELLOW", () => {
  // The exact 2026-06-11 report: a merged state at ctx=17% (clearly GREEN, < 60%)
  // whose sidecar is 5.3h old must NOT be reported as YELLOW "approaching budget".
  const s = mergeFromSources({
    statusline: { ctxTokens: 170_000, ctxMaxTokens: 1_000_000 }, // 17%
    nowMs: 1_000_000_000_000,
  });
  assert.equal(s.zone, "GREEN"); // sanity: 17% is GREEN at capture
  const aged = applyStaleness(s, 1_000_000_000_000 + 19_219_000); // 19219s = ~5.3h stale
  assert.equal(aged.stale, true);
  assert.equal(aged.zone, "GREEN"); // stays GREEN -- the fix
  assert.equal(aged.ctx.pct, 0.17); // ctx number itself was always accurate
});
