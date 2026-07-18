#!/usr/bin/env node
// tier: T4
/**
 * route-savings-session-start-inject.mjs — SessionStart hook
 *
 * HIGH-ROI-TS2/iter4 (2026-05-22). Surfaces the current TOKEN-SAVINGS-PIVOT
 * route-suggest sidecar's headline at session start so every chat sees a
 * one-line ROI reminder + measured take-rate before its first tool call.
 *
 * Compounds the iter1-3 chain: telemetry sidecar collects, /route-suggest-stats
 * reports on demand, this hook surfaces unprompted at session start.
 *
 * Tight: reads ONE file (the sidecar), emits ONE line of additionalContext,
 * fails silent on any IO error. Adds <50ms to SessionStart.
 *
 * Disable: PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1
 *
 * TOKEN-SAVINGS-PIVOT/U-PSN-BANNER-FAIL-LOUD (iter2, 2026-05-23, slot:alpha):
 * R12 fix. The original iter4 code fell back to a 0.30 "doctrine" rate when
 * totalTakeups was 0, then multiplied THAT against fires × 8000 for the
 * "Est. saved" number — turning a 0/41 measured take-rate into a fake
 * "30% doctrine · Est. saved: ~98K tokens" banner that lied to every chat
 * at session start. Now the banner shows the actual measured rate (no fake
 * fallback), the target sits next to it for context, and savings reflect
 * ACTUAL takeups not a projected guess. Pure `formatBanner` for tests.
 *
 * TOKEN-EFFICIENCY-INJECT/U-ROUTE-SAVINGS-BAND-GATE (2026-06-10, slot:bravo):
 * Backlog #6b from reference_injection_surface_token_audit_2026_06_10. This
 * banner fired 10,193x at a persistently 0.4%-below-target take-rate -- the
 * single largest persistent SessionStart waster by `bytes x fires x (1-take)`.
 * A banner that says the SAME "0.4% below target" every session, across 26
 * slots x sessions/day, is a standing nag, not fresh signal. FIX: a rate-BAND
 * gate -- emit ONLY when the measured take-rate crosses a band boundary (5pp
 * default) since the last time it was shown fleet-wide, with a 24h daily-
 * refresh floor so it is never fully invisible. The band-state file is OWNED
 * by this hook (NOT the route-suggest sidecar -- that is written by the
 * telemetry collector; a second writer there would race it). Quality-
 * preserving: the operator still sees every ACTUAL rate movement (up OR down)
 * + a daily heartbeat, just not 25 redundant within-band copies. Knobs:
 *   PRISM_ROUTE_SAVINGS_BANNER_BAND=0          -> legacy always-emit (gate off)
 *   PRISM_ROUTE_SAVINGS_BAND_WIDTH_PCT=N       -> band width in pct points (def 5)
 *   PRISM_ROUTE_SAVINGS_BANNER_MAX_SILENT_MS=N -> daily-refresh floor (def 24h)
 *   PRISM_ROUTE_SAVINGS_BANNER_STATE=path      -> band-state file (test override)
 *   PRISM_ROUTE_SUGGEST_SIDECAR=path           -> stats sidecar (test override)
 * Pure `computeRateBand` + `shouldEmitBanner` for tests.
 */

import { readFileSync, writeFileSync, renameSync } from "node:fs";

const SIDECAR = "H:/prism/state/shared/mcp-route-suggest-stats.json";
const BAND_STATE_PATH = "H:/prism/state/shared/route-savings-banner-band.json";
const TOKENS_PER_TAKEUP = 8000;   // empirical: each prevented broad-search saves ~8K tokens
const DOCTRINE_TARGET = 0.30;     // target take-rate we aim to drive the fleet to
const WARMING_FIRES = 5;          // below this fire count, label as "warming up"
// U-ROUTE-SAVINGS-MEASUREMENT-GAP (2026-06-15, slot:alpha): 0 takeups credited across this many
// fires is almost certainly a MEASUREMENT gap, not the model ignoring nudges -- the takeup hook
// (mcp-route-takeup.mjs) only credits a suggestion when a prism_*:* MCP action runs within its
// window, so a persistently-offline MCP bridge (port 3100) zeroes the take-rate regardless of
// behavior. Same >=50-fire threshold the mcp-route-takerate audit uses for its verify-wiring /
// takeup-wiring-broken doctrine -- single canonical floor across both surfaces.
const MEASUREMENT_GAP_MIN_FIRES = 50;
const DEFAULT_BAND_WIDTH_PCT = 5; // a rate move of <5pp is not a fresh signal
const DEFAULT_MAX_SILENT_MS = 24 * 60 * 60 * 1000; // re-surface at least once/day

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  }));
}

function pass() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

/**
 * Pure: derive the fire/takeup/rate triple from a sidecar object, applying the
 * same validation `formatBanner` uses (so the visible banner and the band gate
 * NEVER disagree on what the rate is -- single-sourced, R7). Returns null when
 * the sidecar is missing/malformed/has no fires.
 */
function rateOf(stats) {
  if (!stats || typeof stats !== "object") return null;
  const totalFires = Number(stats.totalFires) || 0;
  if (totalFires <= 0) return null;
  const totalTakeups = Number(stats.takeupTotals?.totalTakeups) || 0;
  const measuredRate = totalTakeups / totalFires;
  // Honest denominator (U-TAKEUP-EVAL-DENOMINATOR, 2026-06-19): count of times the
  // takeup hook EVALUATED a creditable route. evaluations>0 proves the credit path
  // is wired + exercised, so a 0 take-rate is GENUINE -- not the "MEASUREMENT GAP"
  // the banner used to assert unconditionally. Default 0 on old sidecars.
  const evaluations = Number(stats.takeupTotals?.evaluations) || 0;
  return { totalFires, totalTakeups, measuredRate, evaluations };
}

/**
 * Pure: format the SessionStart banner from a sidecar object. Returns null
 * when no banner should be emitted (no fires yet, malformed input). Exported
 * for tests.
 *
 * R12 (fail-loud) rules baked in:
 *  • Savings estimate uses ACTUAL takeups × tokens-per-takeup, never a
 *    projected/doctrine rate. 0 takeups → "~0K tokens saved" — not a lie.
 *  • Rate label shows measured fraction (N/M) with a target context, never
 *    the bare "30% doctrine" placeholder that hid the gap.
 *  • Below-target measured rates surface a "🔴 below target" tag so the
 *    operator sees the gap inline instead of having to drill into stats.
 */
export function formatBanner(stats) {
  const r = rateOf(stats);
  if (!r) return null;
  const { totalFires, totalTakeups, measuredRate, evaluations } = r;

  // Savings = ACTUAL takeups × tokens-per-takeup. Zero takeups = zero saved.
  const estTokens = totalTakeups * TOKENS_PER_TAKEUP;
  const estKb = Math.round(estTokens / 1000);

  // Rate label: warming / measured / measurement-gap / below-target.
  let rateLabel;
  if (totalFires < WARMING_FIRES) {
    rateLabel = `warming up (${totalTakeups}/${totalFires})`;
  } else if (measuredRate >= DOCTRINE_TARGET) {
    rateLabel = `${(measuredRate * 100).toFixed(1)}% measured ✓ (target ${(DOCTRINE_TARGET * 100).toFixed(0)}%)`;
  } else if (totalTakeups === 0 && totalFires >= MEASUREMENT_GAP_MIN_FIRES) {
    // 0 takeups across many fires. The `evaluations` denominator (U-TAKEUP-EVAL-DENOMINATOR)
    // disambiguates the cause -- mirrors the mcp-route-takerate audit's genuine-low-take-rate
    // vs takeup-wiring-broken split (single canonical doctrine across both surfaces, R7):
    //  - evaluations>0: the takeup hook checked N creditable routes yet none landed in-window.
    //    The credit path is PROVEN LIVE -> this is a GENUINE low take-rate (the fleet isn't routing),
    //    NOT a wiring/measurement gap. Actionable as retune/suppress, not a behavioral goose chase.
    //  - evaluations===0: the credit path was never exercised (MCP bridge offline so prism_*:* takeup
    //    actions can't be called / no eligible route invoked) -> cause UNPROVEN. Keep the MEASUREMENT
    //    GAP framing + point at the verify path (do NOT chase a behavioral fix for an env problem).
    rateLabel = evaluations > 0
      ? `0/${totalFires} credited (credit path PROVEN LIVE -- ${evaluations} route-checks, 0 in-window) -- GENUINE low take-rate, not a wiring gap; consider retune`
      : `0/${totalFires} credited -- likely a MEASUREMENT GAP (MCP bridge offline / takeup unexercised), not ignored; /route-suggest-stats to verify before retuning`;
  } else {
    rateLabel = `${totalTakeups}/${totalFires} (${(measuredRate * 100).toFixed(1)}%) -- below ${(DOCTRINE_TARGET * 100).toFixed(0)}% target`;
  }

  const topTool = Object.entries(stats.byToolName || {}).sort((a, b) => b[1] - a[1])[0];
  const topClassifier = Object.entries(stats.byClassifier || {}).sort((a, b) => b[1] - a[1])[0];

  const tt = topTool ? `${topTool[0]}(${topTool[1]})` : "—";
  const tc = topClassifier ? `${topClassifier[0]}(${topClassifier[1]})` : "—";

  return (
    `## 💰 Route-savings telemetry (TOKEN-SAVINGS-PIVOT)\n` +
    `Fires: ${totalFires} · Take-rate: ${rateLabel} · Est. saved: ~${estKb}K tokens · Top tool: ${tt} · Top classifier: ${tc}\n` +
    `_Use /route-suggest-stats for the full breakdown. Disable this banner: \`PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1\`._`
  );
}

/**
 * Pure: map the measured take-rate to a coarse band token. A move WITHIN a band
 * is not a fresh signal (0.4% -> 0.41% is noise); a move ACROSS a band is. Bands:
 *   null      -- no banner (no fires / malformed)
 *   "warming" -- too few fires to evaluate (< WARMING_FIRES)
 *   "b<N>"    -- N = floor(ratePct / widthPct); width default 5pp
 * Exported for tests. Width <=0 / non-finite falls back to the default.
 */
export function computeRateBand(stats, bandWidthPct = DEFAULT_BAND_WIDTH_PCT) {
  const r = rateOf(stats);
  if (!r) return null;
  if (r.totalFires < WARMING_FIRES) return "warming";
  const w = Number.isFinite(Number(bandWidthPct)) && Number(bandWidthPct) > 0
    ? Number(bandWidthPct) : DEFAULT_BAND_WIDTH_PCT;
  return `b${Math.floor((r.measuredRate * 100) / w)}`;
}

/**
 * Pure: decide whether to emit the banner this session given the last-shown
 * band-state. Emits when ANY of:
 *   - the gate is disabled (legacy always-emit), OR
 *   - there is no prior state (first show / corrupt file -- show baseline once), OR
 *   - the band moved since last shown (either direction -- a drop is also signal), OR
 *   - the last show is older than maxSilentMs (daily-refresh floor / missing ts).
 * Suppresses only when the band is unchanged AND was shown within maxSilentMs.
 * currentBand === null (no banner) -> never emit. Exported for tests.
 */
export function shouldEmitBanner(priorState, currentBand, opts = {}) {
  const { gateDisabled = false, nowMs = Date.now(), maxSilentMs = DEFAULT_MAX_SILENT_MS } = opts;
  if (gateDisabled) return true;
  if (currentBand === null) return false;
  if (!priorState || typeof priorState !== "object") return true;
  if (priorState.band !== currentBand) return true;
  const shownAt = Number(priorState.shownAt) || 0;
  // Re-emit on: missing/garbage ts (0), a stale show (> maxSilentMs), OR a
  // FUTURE ts (clock skew / hand-edited state) -- a future shownAt would make
  // (nowMs - shownAt) negative and suppress the band indefinitely otherwise.
  if (!shownAt || shownAt > nowMs || (nowMs - shownAt) > maxSilentMs) return true;
  return false;
}

function readBandState(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return null; } // missing/corrupt -> treated as "no prior" -> emit once
}

function writeBandState(path, band, rate, nowMs) {
  try {
    const tmp = `${path}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify({ schemaVersion: 1, band, rate, shownAt: nowMs }));
    renameSync(tmp, path); // atomic -- concurrent slots writing the SAME band is safe
  } catch { /* fail-safe: the band gate must never throw out of main() */ }
}

function parsePct(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

function parseMs(v, dflt) {
  if (v === undefined || v === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}

function main() {
  if (process.env.PRISM_ROUTE_SAVINGS_INJECT_DISABLE === "1") { pass(); return; }
  const sidecar = process.env.PRISM_ROUTE_SUGGEST_SIDECAR || SIDECAR;
  let stats;
  try { stats = JSON.parse(readFileSync(sidecar, "utf8")); }
  catch { pass(); return; } // sidecar not present — silent

  const banner = formatBanner(stats);
  if (!banner) { pass(); return; }

  // U-ROUTE-SAVINGS-BAND-GATE: emit only on a fleet-wide band change (or daily refresh).
  const gateDisabled = process.env.PRISM_ROUTE_SAVINGS_BANNER_BAND === "0";
  const bandWidthPct = parsePct(process.env.PRISM_ROUTE_SAVINGS_BAND_WIDTH_PCT, DEFAULT_BAND_WIDTH_PCT);
  const maxSilentMs = parseMs(process.env.PRISM_ROUTE_SAVINGS_BANNER_MAX_SILENT_MS, DEFAULT_MAX_SILENT_MS);
  const statePath = process.env.PRISM_ROUTE_SAVINGS_BANNER_STATE || BAND_STATE_PATH;

  const currentBand = computeRateBand(stats, bandWidthPct);
  const priorState = readBandState(statePath);
  const nowMs = Date.now();

  if (shouldEmitBanner(priorState, currentBand, { gateDisabled, nowMs, maxSilentMs })) {
    emit(banner);
    // Record what was shown so within-band repeats stay silent. Skip in legacy
    // mode (gate off = pure always-emit, no state interaction).
    if (!gateDisabled) writeBandState(statePath, currentBand, rateOf(stats)?.measuredRate ?? 0, nowMs);
  } else {
    pass(); // unchanged band, shown recently -- the nag is suppressed
  }
}

if (process.argv[1] && process.argv[1].endsWith("route-savings-session-start-inject.mjs")) {
  try { main(); }
  catch { pass(); }
}
