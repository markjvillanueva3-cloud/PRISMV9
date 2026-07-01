#!/usr/bin/env node
// tier: T3
//
// stop-rtk-fraction-recalibrate.mjs - Stop advisory
//
// PSN-RTK-ADOPTION-MEASURE/U-RAM03 (2026-05-24, slot:alpha)
//
// Closes the substrate auto-calibration loop:
//   posttool-rtk-adoption-measure (U-RAM01)
//     -> rtk-adoption-measure.jsonl
//     -> tuneFractions() (U-RAM02, pure lib)
//     -> THIS HOOK (U-RAM03): diff old vs new FRACTIONS, emit operator advisory.
//
// ADVISORY ONLY - never auto-modifies posttool-rtk-adoption-measure.mjs.
// (Per CLAUDE.md "Executing actions with care" + autotune-revert-fallback doctrine.)
//
// Throttle: max once per 24h via lockfile at state/shared/.rtk-fraction-recal-throttle.
// Knob: PRISM_RTK_FRACTION_RECAL_DISABLE=1.
// Fail-soft: any error -> {continue:true}, never block Stop.
//
// Pure helpers exported for tests:
//   - computeTuningDeltas(oldTable, newTable, minDeltaPct=10) -> Array<{base, old, new, deltaPct}>
//   - shouldEmit(lockPath, now, fs?) -> boolean
//   - formatSuggestionEntry(deltas, ts, opts?) -> string (JSONL line, no trailing newline)
//   - extractCurrentFractions(sourceText) -> object | null

import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { tuneFractions } from "../../scripts/lib/rtk-fraction-tune.mjs";

const LEDGER = "H:/prism/state/shared/dashboards/rtk-adoption-measure.jsonl";
const SUGGESTIONS = "H:/prism/state/shared/dashboards/rtk-fraction-calibration-suggestions.jsonl";
const THROTTLE_LOCK = "H:/prism/state/shared/.rtk-fraction-recal-throttle";
const SOURCE_HOOK = "H:/prism/.claude/hooks/posttool-rtk-adoption-measure.mjs";

// Throttle window: at most one advisory per 24h to avoid spamming the operator.
const THROTTLE_MS = 24 * 60 * 60 * 1000;

// Default percent-change floor below which a per-base delta is considered noise.
const DEFAULT_MIN_DELTA_PCT = 10;

// Fixed-point rounding helpers (avoid magic-number lint noise).
const ROUND_4DP = 10000;  // round fraction values to 4 decimal places
const ROUND_1DP = 10;     // round delta percent to 1 decimal place

// Tuner blend parameters (mirror U-RAM02 defaults; documented in caller).
const TUNE_MIN_SAMPLES = 5;
const TUNE_BLEND_WEIGHT = 0.3;

/**
 * Pure: compute per-base deltas between two fraction tables, filtered to
 * bases where the absolute relative-percent change is at least minDeltaPct.
 *
 * Relative-percent change is computed against the OLD value:
 *   deltaPct = (new - old) / old * 100
 *
 * - Bases present in newTable but missing from oldTable are skipped
 *   (new-base events are a deliberate schema change, not a tuning event).
 * - Bases with non-finite old or new values are skipped.
 * - Bases with old=0 are skipped (relative-pct undefined).
 * - Output is sorted by absolute deltaPct descending so the largest moves
 *   appear first in the operator's advisory.
 */
export function computeTuningDeltas(oldTable, newTable, minDeltaPct = DEFAULT_MIN_DELTA_PCT) {
  const out = [];
  if (!oldTable || typeof oldTable !== "object") return out;
  if (!newTable || typeof newTable !== "object") return out;
  const floor = Number.isFinite(minDeltaPct) ? Math.abs(minDeltaPct) : DEFAULT_MIN_DELTA_PCT;
  for (const base of Object.keys(oldTable)) {
    const oldV = Number(oldTable[base]);
    const newV = Number(newTable[base]);
    if (!Number.isFinite(oldV) || !Number.isFinite(newV)) continue;
    if (oldV === 0) continue;
    const deltaPct = ((newV - oldV) / oldV) * 100;
    if (Math.abs(deltaPct) < floor) continue;
    out.push({
      base,
      old: Math.round(oldV * ROUND_4DP) / ROUND_4DP,
      new: Math.round(newV * ROUND_4DP) / ROUND_4DP,
      deltaPct: Math.round(deltaPct * ROUND_1DP) / ROUND_1DP,
    });
  }
  out.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return out;
}

/**
 * Pure-ish: returns true iff the throttle gate is open.
 *
 * Gate is open when EITHER the lockfile does not exist OR its mtime is
 * older than (now - THROTTLE_MS). On any fs read error, fail-soft to
 * closed (false) so a flaky disk cannot stampede the operator.
 *
 * `fs` is injectable for tests; defaults to node:fs.
 */
export function shouldEmit(lockPath, now, fs) {
  const _fs = fs || { existsSync, statSync };
  try {
    if (!_fs.existsSync(lockPath)) return true;
    const st = _fs.statSync(lockPath);
    const mtime = st && st.mtimeMs ? Number(st.mtimeMs) : 0;
    if (!Number.isFinite(mtime)) return false;
    const t = Number.isFinite(now) ? now : Date.now();
    return (t - mtime) >= THROTTLE_MS;
  } catch {
    return false; // fail-soft: keep gate closed on error
  }
}

/**
 * Pure: format a JSONL suggestion entry. No trailing newline (caller adds).
 *
 * Schema:
 *   {ts, kind:"suggestion", source:"stop-rtk-fraction-recalibrate",
 *    deltas:[{base,old,new,deltaPct}, ...], hint:"...", advisoryOnly:true}
 */
export function formatSuggestionEntry(deltas, ts, opts = {}) {
  const entry = {
    ts: ts || new Date().toISOString(),
    kind: "suggestion",
    source: "stop-rtk-fraction-recalibrate",
    deltas: Array.isArray(deltas) ? deltas : [],
    advisoryOnly: true,
    hint: opts.hint ||
      "Operator may update FRACTIONS table in .claude/hooks/posttool-rtk-adoption-measure.mjs. " +
      "Do NOT auto-apply - verify samples are representative first.",
  };
  return JSON.stringify(entry);
}

/**
 * Pure: extract the current FRACTIONS object literal from the source-hook
 * text. Returns null on parse failure. Looks for `const FRACTIONS = { ... };`
 * inside the source and parses keys/values out via regex. Conservative -
 * only recognises numeric values and bare-identifier or quoted keys.
 */
export function extractCurrentFractions(sourceText) {
  if (typeof sourceText !== "string" || sourceText.length === 0) return null;
  const m = sourceText.match(/const\s+FRACTIONS\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  // Match either bare-identifier or single/double-quoted key, then a numeric value.
  const re = /(?:["']([^"']+)["']|([A-Za-z_][A-Za-z0-9_-]*))\s*:\s*(-?\d+(?:\.\d+)?)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const key = (match[1] || match[2] || "").toLowerCase();
    const val = Number(match[3]);
    if (!key || !Number.isFinite(val)) continue;
    out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function pass() {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* ignore */ }
}

function touchLock(path) {
  try {
    if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, String(Date.now()));
  } catch { /* fail-soft */ }
}

function appendSuggestion(line) {
  try {
    if (!existsSync(dirname(SUGGESTIONS))) mkdirSync(dirname(SUGGESTIONS), { recursive: true });
    appendFileSync(SUGGESTIONS, line + "\n");
  } catch { /* fail-soft */ }
}

function main() {
  if (process.env.PRISM_RTK_FRACTION_RECAL_DISABLE === "1") return pass();
  if (!shouldEmit(THROTTLE_LOCK, Date.now())) return pass();

  let ledgerText = "";
  try { ledgerText = readFileSync(LEDGER, "utf8"); } catch { return pass(); }
  if (!ledgerText) return pass();

  let sourceText = "";
  try { sourceText = readFileSync(SOURCE_HOOK, "utf8"); } catch { return pass(); }
  const currentTable = extractCurrentFractions(sourceText);
  if (!currentTable) return pass();

  const newTable = tuneFractions(currentTable, ledgerText, {
    minSamples: TUNE_MIN_SAMPLES,
    blendWeight: TUNE_BLEND_WEIGHT,
  });
  const deltas = computeTuningDeltas(currentTable, newTable, DEFAULT_MIN_DELTA_PCT);
  if (deltas.length === 0) return pass();

  const line = formatSuggestionEntry(deltas, new Date().toISOString());
  appendSuggestion(line);
  touchLock(THROTTLE_LOCK);
  return pass();
}

if (process.argv[1] && process.argv[1].endsWith("stop-rtk-fraction-recalibrate.mjs")) {
  try { main(); } catch { pass(); }
}
