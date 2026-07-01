/**
 * U-QP-RATE-WIRE (charlie 2026-06-12) -- the quote cost kernel reads per-shop
 * rates from ShopConfigurationEngine instead of inline planning-default
 * constants, killing the silent divergence between the quote and the real rate
 * source. QuoteEstimatorEngine takes optional machine/setup/programming rate
 * overrides (dependency injection); InstantQuoteEngine populates them from the
 * active shop via the machine-type -> shop-type bridge.
 *
 * Reference rates are READ FROM ShopConfigurationEngine (the canonical source),
 * never hardcoded -- a hardcoded $/hr in a test is exactly the inline-rate-
 * constant the charlie soul refuses.
 */
import { describe, it, expect } from "vitest";
import { quoteEstimatorEngine, type QuoteEstimateInput } from "../engines/QuoteEstimatorEngine.js";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

const QE_BASE: QuoteEstimateInput = {
  part_name: "rate-wire-test",
  quantity: 10,
  material: "4140",
  complexity: "medium",
  machine_type: "cnc_mill_3axis",
};

describe("U-QP-RATE-WIRE -- QuoteEstimatorEngine rate injection", () => {
  it("injected machine/setup/programming rates replace the inline planning defaults", () => {
    // Distinct sentinel rates that are NOT any inline default (85/55/75).
    const q = quoteEstimatorEngine.estimate({ ...QE_BASE, machine_rate_hr: 123, setup_rate_hr: 41, programming_rate_hr: 99 });
    expect(q.costs.machining.machine_rate_hr).toBe(123);
    expect(q.costs.setup.setup_rate_hr).toBe(41);
    expect(q.costs.programming.rate_hr).toBe(99);
  });

  it("WITHOUT injection -> inline planning defaults are unchanged (regression lock)", () => {
    const q = quoteEstimatorEngine.estimate(QE_BASE);
    // The pre-existing planning defaults: 3-axis mill 85, setup 55, programming 75.
    expect(q.costs.machining.machine_rate_hr).toBe(85);
    expect(q.costs.setup.setup_rate_hr).toBe(55);
    expect(q.costs.programming.rate_hr).toBe(75);
  });

  it("injected machine rate actually drives machining cost (rate x time)", () => {
    const lo = quoteEstimatorEngine.estimate({ ...QE_BASE, machine_rate_hr: 50 });
    const hi = quoteEstimatorEngine.estimate({ ...QE_BASE, machine_rate_hr: 200 });
    // Same part + time, 4x rate -> strictly higher machining cost.
    expect(hi.costs.machining.total).toBeGreaterThan(lo.costs.machining.total);
  });
});

describe("U-QP-RATE-WIRE -- InstantQuoteEngine reads ShopConfigurationEngine rates", () => {
  const IQ_MILL: InstantQuoteInput = {
    part_name: "rate-wire-mill",
    material: "4140",
    quantity: 10,
    stock_dimensions_mm: { length: 100, width: 50, height: 25 },
    part_volume_cm3: 80,
    iso_group: "P",
    machine_type: "cnc_mill_3axis",
  };

  it("a 3-axis-mill quote uses the shop's first VMC hourly_rate (not the inline $85)", () => {
    // Canonical reference: read the rate the engine SHOULD have wired, from the source.
    const expectedVmcRate = shopConfigurationEngine.getMachines().find(m => m.type.toLowerCase() === "vmc")?.hourly_rate;
    expect(expectedVmcRate).toBeGreaterThan(0); // shop must have a VMC for this test to mean anything
    const r = instantQuoteEngine.quote(IQ_MILL);
    expect(r.cost_breakdown.machining.machine_rate_hr).toBe(expectedVmcRate);
    expect(r.physics_engines_used).toContain("ShopConfigurationEngine");
  });

  it("a cylindrical (lathe) part uses the shop's first Lathe hourly_rate", () => {
    const expectedLatheRate = shopConfigurationEngine.getMachines().find(m => m.type.toLowerCase() === "lathe")?.hourly_rate;
    const r = instantQuoteEngine.quote({
      ...IQ_MILL,
      part_name: "rate-wire-shaft",
      machine_type: undefined,
      // long-thin cylindrical bounding box -> inferMachineType returns cnc_lathe
      bounding_box_mm: { x: 200, y: 20, z: 20 },
    });
    expect(r.cost_breakdown.machining.machine_rate_hr).toBe(expectedLatheRate);
  });

  it("the wired rate matches the canonical source exactly (no stale duplicate)", () => {
    // Proves there is ONE source of truth: the quoted rate equals getMachineRate-style resolution.
    const shopVmc = shopConfigurationEngine.getMachines().find(m => m.type.toLowerCase() === "vmc")?.hourly_rate;
    const r = instantQuoteEngine.quote(IQ_MILL);
    expect(r.cost_breakdown.machining.machine_rate_hr).toBe(shopVmc);
    // And it is NOT silently the inferior inline planning default unless the shop rate equals it.
    if (shopVmc !== 85) {
      expect(r.cost_breakdown.machining.machine_rate_hr).not.toBe(85);
    }
  });
});
