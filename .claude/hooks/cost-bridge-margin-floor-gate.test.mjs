/**
 * Tests for cost-bridge-margin-floor-gate.mjs — the margin-floor blocking gate.
 * Real-value assertions (cost math, block/allow) + adversarial inputs + a DRIFT GUARD that the
 * vendored marginFloor matches the canonical scripts/lib/quote-dry-run.mjs:computeShouldCost.
 * Run: node --test .claude/hooks/cost-bridge-margin-floor-gate.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isQuoteEmitAction, marginFloor, extractQuoteCost, assessMargin } from "./cost-bridge-margin-floor-gate.mjs";

test("isQuoteEmitAction: matches quote-emit/accept actions only", () => {
  for (const a of ["quote_accept", "quote_estimate", "instant_quote", "fair_market_value", "scenario_generate", "order_from_quote"])
    assert.equal(isQuoteEmitAction(a), true, a);
  for (const a of ["read_file", "cam_strategy_select", "material_price", "git_status", "", null])
    assert.equal(isQuoteEmitAction(a), false, String(a));
});

test("marginFloor: should_cost = Σ cost×max(conf,0.5); floor = should_cost×(1+min)", () => {
  // 100×0.9 + 50×0.6 = 90 + 30 = 120; floor = 120×1.08 = 129.6
  const f = marginFloor([{ cost: 100, confidence: 0.9 }, { cost: 50, confidence: 0.6 }], null, 0.08);
  assert.equal(f.should_cost, 120);
  assert.equal(f.margin_floor, 129.6);
  // confidence floored at 0.5: 100×0.3 → treated as 100×0.5 = 50
  assert.equal(marginFloor([{ cost: 100, confidence: 0.3 }], null, 0).should_cost, 50);
  // precomputed should_cost path
  assert.equal(marginFloor(null, 200, 0.1).margin_floor, 220);
});

test("marginFloor: no usable cost basis → null (never fabricate a floor)", () => {
  assert.equal(marginFloor(null, null, 0.08), null);
  assert.equal(marginFloor([], null, 0.08), null);
  assert.equal(marginFloor(null, 0, 0.08), null, "zero should_cost is not a basis");
  assert.equal(marginFloor("nonsense", undefined, 0.08), null);
});

test("DRIFT GUARD: vendored marginFloor matches canonical computeShouldCost", async (t) => {
  let lib;
  try {
    lib = await import("../../scripts/lib/quote-dry-run.mjs");
  } catch {
    // canonical lib is main-only (the slot worktree is commits-behind) — drift-guard validates on main.
    t.skip("quote-dry-run.mjs unavailable in this tree (validates on main)");
    return;
  }
  const decomp = [{ cost: 100, confidence: 0.9 }, { cost: 50, confidence: 0.6 }, { cost: 25, confidence: 0.4 }];
  const mine = marginFloor(decomp, null, 0.08);
  const canon = lib.computeShouldCost(decomp, { minimumMarginPct: 0.08 });
  assert.equal(mine.should_cost, canon.should_cost, "should_cost must match the lib");
  assert.equal(mine.margin_floor, canon.margin_floor, "margin_floor must match the lib — if this fails, re-sync the vendored formula");
  // Pin the DEFAULT minMargin too (both sides omit it) — catches DEFAULT_MIN_MARGIN_PCT drift, not just formula drift.
  const md = marginFloor(decomp);
  const cd = lib.computeShouldCost(decomp);
  assert.equal(md.margin_floor, cd.margin_floor, "default margin_floor must match — if this fails, DEFAULT_MIN_MARGIN_PCT drifted from the lib");
});

test("extractQuoteCost: pulls quoted price + decomposition + minMargin from params", () => {
  const e = extractQuoteCost({ quoted_unit_price_usd: 150, decomposition: [{ cost: 100, confidence: 1 }], minimumMarginPct: 0.1 }, 0.08);
  assert.equal(e.quotedPrice, 150);
  assert.equal(e.decomposition.length, 1);
  assert.equal(e.minMargin, 0.1, "param minMargin wins over env");
  // env fallback
  assert.equal(extractQuoteCost({ price: 50 }, 0.12).minMargin, 0.12);
  // alt price keys
  assert.equal(extractQuoteCost({ quoted_price: 99 }).quotedPrice, 99);
  // defensive
  assert.equal(extractQuoteCost(null).quotedPrice, null);
});

test("assessMargin: BLOCKS a below-floor quote with a reason", () => {
  const v = assessMargin({ quotedPrice: 100, decomposition: [{ cost: 100, confidence: 1 }], minMargin: 0.08 });
  // floor = 100×1.08 = 108; quoted 100 < 108 → block
  assert.equal(v.block, true);
  assert.equal(v.floor, 108);
  assert.ok(/BELOW the margin floor/.test(v.reason));
  assert.ok(v.reason.includes("$108"));
});

test("assessMargin: ALLOWS an at/above-floor quote", () => {
  assert.equal(assessMargin({ quotedPrice: 108, decomposition: [{ cost: 100, confidence: 1 }], minMargin: 0.08 }).block, false);
  assert.equal(assessMargin({ quotedPrice: 200, shouldCost: 150, minMargin: 0.08 }).block, false);
});

test("assessMargin: cent-rounding boundary — no sub-cent false-positive denial (Finding 1)", () => {
  // should_cost 333.33 → margin_floor round2(359.9964)=360.00. A quote of 359.997 is ABOVE the true
  // floor 359.9964 but below the rounded 360.00. Rounding the quote to cents (360.00) must ALLOW it —
  // not deny. (Pre-fix this denied a legitimate above-margin quote.)
  const v = assessMargin({ quotedPrice: 359.997, shouldCost: 333.33, minMargin: 0.08 });
  assert.equal(v.floor, 360, "rounded margin floor");
  assert.equal(v.block, false, "359.997 rounds to 360.00 == floor → ALLOW (no sub-cent false-positive)");
  // genuinely below floor by ≥1 cent still BLOCKS
  assert.equal(assessMargin({ quotedPrice: 359.98, shouldCost: 333.33, minMargin: 0.08 }).block, true, "359.98 < 360.00 → block");
});

test("assessMargin: cannot assess → ALLOW (no quoted price OR no cost basis)", () => {
  assert.equal(assessMargin({ quotedPrice: null, decomposition: [{ cost: 100, confidence: 1 }], minMargin: 0.08 }).block, false);
  assert.equal(assessMargin({ quotedPrice: 50, decomposition: null, shouldCost: null, minMargin: 0.08 }).block, false);
});
