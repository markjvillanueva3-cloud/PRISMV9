/**
 * instantQuoteMachineQualityWire.test.ts — U-DB-MACHINE-QUALITY-CONSUMERS Phase 5 wire (quoting).
 *
 * Proves quoteWithMachineQuality() actually consumes machineQualityForConsumer
 * payloads + applies them to unit_price + ci95 bounds.
 *
 * Coverage:
 *   - High-tier machine → small cycle uplift (~5%), narrow ci95 (5% widen)
 *   - Hobby machine → large cycle uplift (>40%), wide ci95 (20% widen)
 *   - No machine input → behavior identical to quote() + adjustment.source="none"
 *   - Tier hierarchy invariant: top-tier unit_price < mid-tier < hobby (same part)
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS-WIRE (slot juliett, 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { instantQuoteEngine } from "../engines/InstantQuoteEngine.js";

const TOP_TIER_MACHINE = {
  id: "test-top", manufacturer: "DMG MORI", model: "NMV5000DCG",
  controller: { family: "fanuc_31i" }, way_type: "box_way",
  positioning_accuracy_um: 5, repeatability_um: 3,
  max_rapid_mm_min: 24000, max_accel_g: 1.5, look_ahead_blocks: 1000, machine_mass_kg: 8000,
};
const MID_TIER_MACHINE = {
  id: "test-mid", manufacturer: "Haas", model: "VF-2",
  controller: { family: "haas_ngc" }, way_type: "linear_rail",
  positioning_accuracy_um: 10, repeatability_um: 8,
  max_rapid_mm_min: 18000, max_accel_g: 0.8, look_ahead_blocks: 200, machine_mass_kg: 4500,
};
const HOBBY_MACHINE = {
  id: "test-hobby", manufacturer: "Shapeoko", model: "Pro",
  controller: { family: "grbl" }, way_type: "v_way",
  positioning_accuracy_um: 100, repeatability_um: 50,
  max_rapid_mm_min: 5000, max_accel_g: 0.3, look_ahead_blocks: 16, machine_mass_kg: 50,
};

const BASE_QUOTE_INPUT = {
  part_name: "WIRE-TEST-PART",
  material: "AL6061",
  iso_group: "N" as const,
  quantity: 100,
  bounding_box_mm: { x: 50, y: 50, z: 25 },
  part_volume_cm3: 30,
  machine_type: "vertical_mill" as const,
  tool_diameter_mm: 12,
  flutes: 3,
};

describe("U-DB-MACHINE-QUALITY-CONSUMERS-WIRE — InstantQuote consumes machine-quality signals", () => {
  it("top-tier machine → cycle_uplift ≤ 20%, ci95_widen=5% (narrow band)", async () => {
    const adj = await instantQuoteEngine.quoteWithMachineQuality({
      ...BASE_QUOTE_INPUT, machine: TOP_TIER_MACHINE,
    });
    expect(adj.machine_quality_adjustment.tier).toBe("S");
    expect(adj.machine_quality_adjustment.source).toMatch(/^machine_quality_score\[S\]$/);
    expect(adj.machine_quality_adjustment.cycle_time_uplift_pct).toBeLessThanOrEqual(20);
    expect(adj.machine_quality_adjustment.cycle_time_uplift_pct).toBeGreaterThanOrEqual(0);
    expect(adj.machine_quality_adjustment.ci95_widen_pct).toBe(5);
  });

  it("hobby machine → cycle_uplift > 40%, ci95_widen=20% (wide band)", async () => {
    const adj = await instantQuoteEngine.quoteWithMachineQuality({
      ...BASE_QUOTE_INPUT, machine: HOBBY_MACHINE,
    });
    expect(adj.machine_quality_adjustment.tier).toBe("D");
    expect(adj.machine_quality_adjustment.cycle_time_uplift_pct).toBeGreaterThan(40);
    expect(adj.machine_quality_adjustment.ci95_widen_pct).toBe(20);
    // derate ≤ 0.7 for hobby
    expect(adj.machine_quality_adjustment.derate_factor).toBeLessThanOrEqual(0.7);
  });

  it("no machine input → derate=1.0, no uplift, narrow band default, source=none", async () => {
    const adj = await instantQuoteEngine.quoteWithMachineQuality(BASE_QUOTE_INPUT);
    expect(adj.machine_quality_adjustment.tier).toBe("UNKNOWN");
    expect(adj.machine_quality_adjustment.source).toBe("none");
    expect(adj.machine_quality_adjustment.derate_factor).toBe(1.0);
    expect(adj.machine_quality_adjustment.cycle_time_uplift_pct).toBe(0);
  });

  it("tier hierarchy invariant: top.unit_price < mid.unit_price < hobby.unit_price (same part)", async () => {
    const [top, mid, hobby] = await Promise.all([
      instantQuoteEngine.quoteWithMachineQuality({ ...BASE_QUOTE_INPUT, machine: TOP_TIER_MACHINE }),
      instantQuoteEngine.quoteWithMachineQuality({ ...BASE_QUOTE_INPUT, machine: MID_TIER_MACHINE }),
      instantQuoteEngine.quoteWithMachineQuality({ ...BASE_QUOTE_INPUT, machine: HOBBY_MACHINE }),
    ]);
    // Same part, different machines — slower/lower-tier machine = higher unit price
    expect(top.unit_price).toBeLessThanOrEqual(mid.unit_price);
    expect(mid.unit_price).toBeLessThanOrEqual(hobby.unit_price);
    // Hobby price strictly greater than top (not equal)
    expect(hobby.unit_price).toBeGreaterThan(top.unit_price);
  });

  it("ci95 widening hierarchy: top band tighter than hobby band (same part)", async () => {
    const [top, hobby] = await Promise.all([
      instantQuoteEngine.quoteWithMachineQuality({ ...BASE_QUOTE_INPUT, machine: TOP_TIER_MACHINE }),
      instantQuoteEngine.quoteWithMachineQuality({ ...BASE_QUOTE_INPUT, machine: HOBBY_MACHINE }),
    ]);
    const topBand   = top.ci95_high   - top.ci95_low;
    const hobbyBand = hobby.ci95_high - hobby.ci95_low;
    expect(topBand).toBeLessThan(hobbyBand);
  });

  it("structural preservation: adjusted quote keeps base fields (quantity, dfm, quote_id)", async () => {
    const base = instantQuoteEngine.quote(BASE_QUOTE_INPUT);
    const adj = await instantQuoteEngine.quoteWithMachineQuality({
      ...BASE_QUOTE_INPUT, machine: TOP_TIER_MACHINE,
    });
    // Non-price/CI fields should pass through unchanged
    expect(adj.quantity).toBe(base.quantity);
    expect(adj.dfm).toEqual(base.dfm);
    expect(adj.part_name).toBe(base.part_name);
    expect(typeof adj.machine_quality_adjustment).toBe("object");
  });
});
