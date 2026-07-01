#!/usr/bin/env node
// tier: T0
/**
 * cost-bridge-margin-floor-gate.mjs — PreToolUse BLOCKING gate (slot:charlie quoting galaxy).
 *
 * Closes the #1 completeness gap from the 2026-05-29 galaxy audit: the should-cost / margin-floor
 * math existed only as a LIBRARY (scripts/lib/quote-dry-run.mjs:computeShouldCost) — the galaxy
 * could DETECT an under-margin quote but never STOP one. This is exactly charlie's soul refuse
 * `emitting-customer-quote-without-margin-floor-gate`. This hook makes the refuse REAL: when a
 * quote-emit/accept MCP action carries a quoted price + a cost basis, it computes the margin floor
 * and DENIES the call if the quoted price is below it.
 *
 * Gate fires ONLY when it can actually assess (quoted price + cost basis both present in params);
 * otherwise it's a silent no-op (cannot fabricate a floor). FAIL-OPEN on any internal error
 * (a gate bug must never break legitimate quoting) — but a CLEAR below-floor violation BLOCKS.
 *
 * margin_floor formula is vendored from quote-dry-run.mjs:computeShouldCost (KEEP-IN-SYNC — the
 * test asserts this matches the canonical lib output, so drift is caught). should_cost =
 * Σ stage.cost × max(stage.confidence, 0.5); margin_floor = should_cost × (1 + minimumMarginPct).
 *
 * Knobs: PRISM_QUOTING_MARGIN_GATE_DISABLE=1 (off) · PRISM_QUOTING_MIN_MARGIN_PCT=N (default 0.08).
 */
import { readFileSync } from "node:fs";

const DEFAULT_MIN_MARGIN_PCT = 0.08;
const CONFIDENCE_FLOOR = 0.5;

const QUOTE_EMIT_RE = /quote.*accept|quote_accept|quote_estimate|instant_quote|fair_market_value|scenario_generate|quote.*emit|emit.*quote|order.*from.*quote/i;

/** Does this action emit/accept a customer quote (→ subject to the margin floor)? Pure. */
export function isQuoteEmitAction(action) {
  return typeof action === "string" && QUOTE_EMIT_RE.test(action);
}

/** round to cents (matches the lib's round2). Pure. */
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

/**
 * Compute the margin floor. Vendored from quote-dry-run.mjs:computeShouldCost (KEEP-IN-SYNC).
 * `decomposition` is an array of {cost, confidence}; OR pass a precomputed `shouldCost` number.
 * Returns { should_cost, margin_floor } or null if no usable cost basis. Pure.
 */
export function marginFloor(decomposition, shouldCost, minMarginPct = DEFAULT_MIN_MARGIN_PCT) {
  let sc = null;
  if (Array.isArray(decomposition) && decomposition.length > 0) {
    sc = 0;
    for (const stage of decomposition) {
      if (!stage || typeof stage !== "object") continue;
      const conf = Math.max(Number(stage.confidence ?? CONFIDENCE_FLOOR), CONFIDENCE_FLOOR);
      sc += (Number(stage.cost) || 0) * conf;
    }
  } else if (Number.isFinite(shouldCost)) {
    sc = shouldCost;
  }
  if (sc == null || !Number.isFinite(sc) || sc <= 0) return null;
  const m = Number.isFinite(minMarginPct) ? minMarginPct : DEFAULT_MIN_MARGIN_PCT;
  return { should_cost: round2(sc), margin_floor: round2(sc * (1 + m)) };
}

/** Extract the quoted price + cost basis + minMargin from action params. Pure + defensive. */
export function extractQuoteCost(params, envMinMargin) {
  const p = params && typeof params === "object" ? params : {};
  const num = (v) => (Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : null);
  const quotedPrice = num(p.quoted_unit_price_usd) ?? num(p.quoted_price_usd) ?? num(p.quoted_price) ?? num(p.quote_total_usd) ?? num(p.price) ?? num(p.unit_price);
  const decomposition = Array.isArray(p.decomposition) ? p.decomposition : Array.isArray(p.cost_decomposition) ? p.cost_decomposition : Array.isArray(p.stages) ? p.stages : null;
  const shouldCost = num(p.should_cost);
  const minMargin = num(p.minimumMarginPct) ?? num(p.min_margin_pct) ?? (Number.isFinite(envMinMargin) ? envMinMargin : DEFAULT_MIN_MARGIN_PCT);
  return { quotedPrice, decomposition, shouldCost, minMargin };
}

/** Decide block vs allow. Pure. Returns {block:boolean, reason?:string, floor?:number}. */
export function assessMargin({ quotedPrice, decomposition, shouldCost, minMargin }) {
  if (quotedPrice == null) return { block: false }; // no quoted price → cannot assess
  const f = marginFloor(decomposition, shouldCost, minMargin);
  if (!f) return { block: false }; // no cost basis → cannot assess (never fabricate a floor)
  // Round the quoted price to cents before comparing — margin_floor is already cent-rounded, so a
  // cent-vs-cent compare avoids a sub-cent false-positive denial (a quote above the TRUE floor but
  // below the rounded floor). Real customer quotes are in cents; this makes the boundary consistent.
  const q = round2(quotedPrice);
  if (q < f.margin_floor) {
    const shortfall = round2(f.margin_floor - q);
    return {
      block: true,
      floor: f.margin_floor,
      reason: `Margin-floor gate (charlie soul): quoted $${q} is BELOW the margin floor $${f.margin_floor} (should_cost $${f.should_cost} × ${1 + minMargin}). Shortfall $${shortfall}. Raise the quote to ≥ $${f.margin_floor}, or pass an explicit override with a documented reason. Math: scripts/lib/quote-dry-run.mjs:computeShouldCost.`,
    };
  }
  return { block: false, floor: f.margin_floor };
}

function emitAllow() { process.stdout.write("{}"); }
function emitDeny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
}

async function main() {
  if (process.env.PRISM_QUOTING_MARGIN_GATE_DISABLE === "1") { emitAllow(); return 0; }
  let event;
  try { event = JSON.parse(readFileSync(0, "utf8")); } catch { emitAllow(); return 0; }
  const action = event?.tool_input?.action ?? event?.tool_input?.params?.action ?? "";
  if (!isQuoteEmitAction(action)) { emitAllow(); return 0; }
  const params = event?.tool_input?.params ?? event?.tool_input ?? {};
  const envMin = Number(process.env.PRISM_QUOTING_MIN_MARGIN_PCT);
  let verdict;
  try {
    verdict = assessMargin(extractQuoteCost(params, Number.isFinite(envMin) ? envMin : undefined));
  } catch {
    emitAllow(); return 0; // fail-OPEN: a gate bug must never break legitimate quoting
  }
  if (verdict.block) { emitDeny(verdict.reason); return 0; }
  emitAllow();
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && process.argv[1].replace(/\\/g, "/").endsWith("cost-bridge-margin-floor-gate.mjs"); } catch { return false; }
})();
if (invokedDirectly) { main().then((c) => process.exit(c || 0)).catch(() => { try { process.stdout.write("{}"); } catch {} process.exit(0); }); }
