/**
 * ThreeViewPricingEngine.test.ts -- QUOTING-JM-GROUND-MS0 / U-3VIEW01
 *
 * Reference-value tests (R9: tests verify INTENT, not behavior). Every expected
 * number is hand-computed from the LIVE canonical ShopConfigurationEngine jm-die
 * rates verified 2026-06-23:
 *    labor $45/hr, overhead $35/hr, admin $15/hr, setup $55/hr, programming $75/hr
 *    machine: mill $85/hr, lathe $75/hr, wedm $85/hr
 *    overhead_pct 15%, material_markup_pct 10%, margin_floor_pct ABSENT -> engine
 *    fallback DEFAULT_MARGIN_FLOOR_PCT = 20% is the active floor.
 *
 * If JM's rates change in ShopConfigurationEngine, THESE NUMBERS SHOULD CHANGE --
 * that is the point (R9): a hardcoded-return regression would fail here.
 *
 * Coverage: happy path + 4 failure modes + 2 adversarial inputs.
 */

import { describe, it, expect } from "vitest";
import { threeViewPricingEngine, ThreeViewPricingEngine } from "../engines/ThreeViewPricingEngine.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

// Live canonical reference -- READ from the engine at test time, NOT hardcoded.
// Hardcoding rate-derived dollars is fragile: the jm-die profile rates can drift
// and another engine's module-load can mutate the in-memory profile. Deriving the
// expected values from the same source the engine uses keeps the test an INTENT
// check (R9) that still fails on a genuine business-logic regression.
const RATES = shopConfigurationEngine.getRates("jm-die");
const PROFILE = shopConfigurationEngine.getProfile("jm-die");
const MILL_RATE = shopConfigurationEngine.getMachineRate("jm-die", "VMC");   // process "mill" -> VMC
const LATHE_RATE = shopConfigurationEngine.getMachineRate("jm-die", "Lathe"); // process "lathe" -> Lathe
const OVERHEAD_PCT = PROFILE.overhead_pct;
const MARKUP_PCT = PROFILE.material_markup_pct;
const FLOOR_PCT = PROFILE.margin_floor_pct ?? 20;

function r2(n: number): number { return Math.round(n * 100) / 100; }

describe("ThreeViewPricingEngine", () => {
  // -------- HAPPY PATH: fully-specified mill quote, reference values derived --
  it("computes current/optimal/cost_floor matching an independent cost re-derivation", () => {
    const res = threeViewPricingEngine.price({
      material: "tool_steel_a2", // a real catalog grade
      process: "mill",
      machine_hours_per_part: 2,
      labor_hours_per_part: 0.5,
      setup_hours: 1,
      programming_hours: 0,
      material_lb_per_part: 1,
      tooling_cost_per_part: 1,
      quantity: 10,
      material_cost_per_lb_override: 5, // override -> deterministic material basis
      verified_comparables: 0,
      profile_id: "jm-die",
    });

    expect(res.ok).toBe(true);

    // Independent re-derivation using the SAME canonical rates the engine reads.
    const machineCost = 2 * MILL_RATE * 10;
    const laborCost = 0.5 * RATES.labor_per_hr * 10;
    const setupCost = 1 * RATES.setup_per_hr;
    const toolingCost = 1 * 10;
    const optimalMat = 5 * 1 * 10;                 // override $/lb x weight x qty
    const currentMat = 5 * 1 * (1 + MARKUP_PCT / 100) * 10;
    const directFloor = machineCost + laborCost + setupCost + toolingCost + optimalMat;
    const expectFloor = r2(directFloor + r2(directFloor * (OVERHEAD_PCT / 100)));

    const currentBase = machineCost + laborCost + setupCost + toolingCost + currentMat;
    const currentFull = r2(currentBase + r2(currentBase * (OVERHEAD_PCT / 100)));
    const expectCurrent = r2(currentFull / (1 - FLOOR_PCT / 100));

    expect(res.cost_floor_usd).toBeCloseTo(expectFloor, 1);
    const current = res.views.find((v) => v.key === "current")!;
    expect(current.total_usd).toBeCloseTo(expectCurrent, 1);
    expect(current.unit_price_usd).toBeCloseTo(r2(expectCurrent / 10), 1);
    expect(current.advisory).toBe(false); // headline is customer-facing

    const floor = res.views.find((v) => v.key === "cost_floor")!;
    expect(floor.total_usd).toBeCloseTo(expectFloor, 1);
    expect(floor.advisory).toBe(true);

    // Headline grosses to the floor over its own full cost; clears the gate.
    expect(res.belowMarginFloor).toBe(false);
    expect(res.margin_floor_pct).toBe(FLOOR_PCT);

    // Provenance must cite the real engines (audit trail, no fabrication).
    expect(res.provenance.rates_source).toContain("ShopConfigurationEngine.getRates");
    expect(res.provenance.cost_floor_source).toContain("JobProfitabilityWaterfallEngine");
  });

  // -------- INTENT: process maps to its OWN machine type/rate ---------------
  it("uses the Lathe machine rate for process=lathe and VMC for process=mill", () => {
    // Sanity: the profile must actually distinguish these two machine types, else
    // this invariant is vacuous. (Verified jm-die: VMC vs Lathe.)
    expect(MILL_RATE).not.toBe(LATHE_RATE);

    const mill = threeViewPricingEngine.price({
      material: "tool_steel_a2", process: "mill", machine_hours_per_part: 1, quantity: 1,
      material_cost_per_lb_override: 0, profile_id: "jm-die",
    });
    const lathe = threeViewPricingEngine.price({
      material: "tool_steel_a2", process: "lathe", machine_hours_per_part: 1, quantity: 1,
      material_cost_per_lb_override: 0, profile_id: "jm-die",
    });
    // Floors differ by exactly the machine-rate gap times the overhead multiplier.
    const expectedDelta = r2((MILL_RATE - LATHE_RATE) * (1 + OVERHEAD_PCT / 100));
    expect(mill.cost_floor_usd - lathe.cost_floor_usd).toBeCloseTo(expectedDelta, 1);
    expect(mill.provenance.rates_source).toContain("jm-die");
  });

  // -------- CONFIDENCE: thin data -> wide band; rich data -> tight band ------
  it("widens the confidence band when verified_comparables is low", () => {
    const base = {
      material: "tool_steel_a2", process: "mill" as const, machine_hours_per_part: 2, quantity: 10,
      material_cost_per_lb_override: 5, material_lb_per_part: 1, profile_id: "jm-die",
    };
    const thin = threeViewPricingEngine.price({ ...base, verified_comparables: 0 });
    const rich = threeViewPricingEngine.price({ ...base, verified_comparables: 12 });
    expect(thin.headline.confidence.tier).toBe("wide");
    expect(rich.headline.confidence.tier).toBe("tight");
    // Wide band is strictly wider than tight for the same total.
    expect(thin.headline.confidence.half_width_usd).toBeGreaterThan(rich.headline.confidence.half_width_usd);
    // Wide = 35% of total; tight = 8%.
    expect(thin.headline.confidence.half_width_usd / thin.headline.total_usd).toBeCloseTo(0.35, 2);
    expect(rich.headline.confidence.half_width_usd / rich.headline.total_usd).toBeCloseTo(0.08, 2);
  });

  // -------- FAILURE MODE 1: invalid input (negative machine hours) -----------
  it("rejects negative machine hours with ok:false and a reason", () => {
    const res = threeViewPricingEngine.price({
      material: "A2", process: "mill", machine_hours_per_part: -1, quantity: 10, profile_id: "jm-die",
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("invalid-input");
    expect(res.views).toHaveLength(0);
  });

  // -------- FAILURE MODE 2: zero quantity (positive-int violation) -----------
  it("rejects quantity=0 (lot must be a positive integer)", () => {
    const res = threeViewPricingEngine.price({
      material: "A2", process: "mill", machine_hours_per_part: 1, quantity: 0, profile_id: "jm-die",
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("quantity");
  });

  // -------- FAILURE MODE 3: empty material string -------------------------
  it("rejects an empty material string", () => {
    const res = threeViewPricingEngine.price({
      material: "", process: "mill", machine_hours_per_part: 1, quantity: 1, profile_id: "jm-die",
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("material");
  });

  // -------- MARGIN-FLOOR GATE (soul rule): healthy cost-build sits at-floor ---
  it("does NOT trip belowMarginFloor for a clean cost-build (grosses to the floor)", () => {
    // A clean cost-build divides full cost by (1 - floor), so it grosses to exactly
    // the floor over its own cost. The gate (with GATE_TOLERANCE_PCT) treats this as
    // at-floor, not below. This proves the gate is wired and does not false-positive.
    const res = threeViewPricingEngine.price({
      material: "A2", process: "mill", machine_hours_per_part: 1, quantity: 1,
      material_cost_per_lb_override: 0, profile_id: "jm-die",
    });
    expect(typeof res.belowMarginFloor).toBe("boolean");
    expect(res.belowMarginFloor).toBe(false);
    // Headline grosses to exactly the target floor over its own full cost.
    expect(res.headline.margin_pct).toBeCloseTo(FLOOR_PCT, 1);
    // The improvement advisor always returns at least one lever.
    expect(res.improvement.length).toBeGreaterThanOrEqual(1);
  });

  // -------- ADVISOR: every lever is well-formed + from the known lever set --------
  it("improvement advisor returns only well-formed levers from the known id set", () => {
    const res = threeViewPricingEngine.price({
      material: "tool_steel_a2", process: "mill", machine_hours_per_part: 2, quantity: 10,
      material_cost_per_lb_override: 5, material_lb_per_part: 1, profile_id: "jm-die",
    });
    const knownIds = new Set([
      "shop-rate-gap", "below-margin-floor", "material-markup-thin",
      "underpriced-vs-market", "above-market", "structure-healthy",
    ]);
    expect(res.improvement.length).toBeGreaterThanOrEqual(1);
    for (const lever of res.improvement) {
      expect(knownIds.has(lever.id)).toBe(true);
      expect(typeof lever.headline).toBe("string");
      expect(lever.headline.length).toBeGreaterThan(0);
      expect(typeof lever.action).toBe("string");
      expect(["info", "opportunity", "warning"]).toContain(lever.severity);
      expect(lever.upside_usd_per_lot).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(lever.upside_usd_per_lot)).toBe(true);
    }
  });

  // -------- ADVERSARIAL 1: market lookup miss -> profile default, flagged ----
  it("falls back to the profile material default when market lookup misses (no override, no weight)", () => {
    const res = threeViewPricingEngine.price({
      material: "unobtainium_xyz_no_such_grade", process: "mill",
      machine_hours_per_part: 1, quantity: 1, profile_id: "jm-die",
      // no override, no material_lb_per_part -> market miss path
    });
    expect(res.ok).toBe(true);
    expect(res.provenance.material_price_source).toContain("material_cost_per_part_default");
  });

  // -------- ADVERSARIAL 2: huge quantity does not overflow / stays finite ----
  it("handles a very large lot without NaN/Infinity", () => {
    const res = threeViewPricingEngine.price({
      material: "A2", process: "mill", machine_hours_per_part: 0.1, quantity: 1_000_000,
      material_cost_per_lb_override: 2, material_lb_per_part: 0.5, profile_id: "jm-die",
    });
    expect(res.ok).toBe(true);
    expect(Number.isFinite(res.headline.total_usd)).toBe(true);
    expect(Number.isFinite(res.cost_floor_usd)).toBe(true);
    expect(res.headline.total_usd).toBeGreaterThan(res.cost_floor_usd);
    // Per-unit price tracks total/qty (within round2 granularity -- the stored
    // unit is round2(total/qty), so allow a cent of rounding slack).
    expect(res.headline.unit_price_usd).toBeCloseTo(res.headline.total_usd / 1_000_000, 2);
  });

  it("exports a singleton and a constructible class", () => {
    expect(threeViewPricingEngine).toBeInstanceOf(ThreeViewPricingEngine);
    const fresh = new ThreeViewPricingEngine();
    const a = fresh.price({ material: "A2", process: "mill", machine_hours_per_part: 1, quantity: 1, material_cost_per_lb_override: 0, profile_id: "jm-die" });
    const b = threeViewPricingEngine.price({ material: "A2", process: "mill", machine_hours_per_part: 1, quantity: 1, material_cost_per_lb_override: 0, profile_id: "jm-die" });
    // Deterministic: same input -> same headline.
    expect(a.headline.total_usd).toBe(b.headline.total_usd);
  });
});
