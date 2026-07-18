/**
 * ultimateSpeedFeedMachineQualityWire.test.ts — U-DB-MACHINE-QUALITY-CONSUMERS Phase 5 wire.
 *
 * Proves that machineQualityForConsumer('sfc') derate is actually applied to
 * UltimateSpeedFeedEngine output via the new calculateWithMachineQuality()
 * wrapper. NOT a contract test — a real behavior test on the wire itself.
 *
 * Coverage:
 *   - High-tier machine (DMG MORI) → derate ~1.0, feed_rate ≈ unmodified
 *   - Hobby machine (Shapeoko) → derate < 0.75, feed_rate visibly reduced
 *   - Caller-supplied derate bypasses lookup
 *   - No machine input → derate=1.0, source="none", base behavior preserved
 *   - Adversarial: invalid derate (NaN/Infinity) clamped to [0.5, 1.0]
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS-WIRE (slot juliett, 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const TOP_TIER_MACHINE = {
  id: "test-top", manufacturer: "DMG MORI", model: "NMV5000DCG",
  controller: { family: "fanuc_31i" }, way_type: "box_way",
  positioning_accuracy_um: 5, repeatability_um: 3,
  max_rapid_mm_min: 24000, max_accel_g: 1.5, look_ahead_blocks: 1000, machine_mass_kg: 8000,
};
const HOBBY_MACHINE = {
  id: "test-hobby", manufacturer: "Shapeoko", model: "Pro",
  controller: { family: "grbl" }, way_type: "v_way",
  positioning_accuracy_um: 100, repeatability_um: 50,
  max_rapid_mm_min: 5000, max_accel_g: 0.3, look_ahead_blocks: 16, machine_mass_kg: 50,
};

const BASE_SF_INPUT = {
  material: "steel",
  tool_diameter_mm: 10,
  flutes: 4,
  operation: "milling" as const,
  axial_depth_mm: 2,
  radial_depth_mm: 5,
};

describe("U-DB-MACHINE-QUALITY-CONSUMERS-WIRE — SFC consumer derate applied to UltimateSpeedFeed", () => {
  it("top-tier machine (DMG MORI) → derate ≥0.85, feed_rate within 15% of base", async () => {
    const base = ultimateSpeedFeedEngine.calculate(BASE_SF_INPUT);
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine: TOP_TIER_MACHINE,
    });
    expect(derated.machine_quality_derate_applied).toBeGreaterThanOrEqual(0.85);
    expect(derated.machine_quality_derate_applied).toBeLessThanOrEqual(1.0);
    expect(derated.machine_quality_source).toMatch(/^machine_quality_score\[S\]$/);
    // Feed rate reduction ≤ 15% for top-tier
    const reductionPct = (base.feed_rate.value - derated.feed_rate.value) / base.feed_rate.value;
    expect(reductionPct).toBeLessThan(0.15);
  });

  it("hobby machine (Shapeoko) → derate < 0.75, feed_rate visibly reduced", async () => {
    const base = ultimateSpeedFeedEngine.calculate(BASE_SF_INPUT);
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine: HOBBY_MACHINE,
    });
    expect(derated.machine_quality_derate_applied).toBeLessThan(0.75);
    expect(derated.machine_quality_source).toMatch(/^machine_quality_score\[D\]$/);
    // Feed rate reduction ≥ 20% for hobby
    expect(derated.feed_rate.value).toBeLessThan(base.feed_rate.value * 0.85);
    expect(derated.spindle_rpm.value).toBeLessThan(base.spindle_rpm.value * 0.85);
  });

  it("caller-supplied derate=0.75 bypasses lookup → source=caller_supplied, exact multiplier applied", async () => {
    const base = ultimateSpeedFeedEngine.calculate(BASE_SF_INPUT);
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine_quality_derate: 0.75,
    });
    expect(derated.machine_quality_derate_applied).toBe(0.75);
    expect(derated.machine_quality_source).toBe("caller_supplied");
    // Within 1% of base * 0.75 (roundSig rounds to 4 sig figs)
    const expected = base.feed_rate.value * 0.75;
    expect(Math.abs(derated.feed_rate.value - expected) / expected).toBeLessThan(0.01);
  });

  it("no machine + no derate → derate=1.0, source=none, output matches base calculate()", async () => {
    const base = ultimateSpeedFeedEngine.calculate(BASE_SF_INPUT);
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality(BASE_SF_INPUT);
    expect(derated.machine_quality_derate_applied).toBe(1.0);
    expect(derated.machine_quality_source).toBe("none");
    // roundSig with 4 sig figs may move base values slightly — allow 0.1%
    expect(Math.abs(derated.feed_rate.value - base.feed_rate.value) / base.feed_rate.value).toBeLessThan(0.001);
  });

  it("ADVERSARIAL: derate=NaN → falls through to machine lookup (or 1.0 if no machine)", async () => {
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine_quality_derate: NaN,
    });
    // NaN is not finite → ignored. No machine → derate=1.0, source=none.
    expect(derated.machine_quality_derate_applied).toBe(1.0);
    expect(derated.machine_quality_source).toBe("none");
  });

  it("ADVERSARIAL: derate=1.5 (above clamp ceiling) → clamped to 1.0", async () => {
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine_quality_derate: 1.5,
    });
    expect(derated.machine_quality_derate_applied).toBe(1.0);
    expect(derated.machine_quality_source).toBe("caller_supplied");
  });

  it("ADVERSARIAL: derate=0.2 (below clamp floor) → clamped to 0.5", async () => {
    const derated = await ultimateSpeedFeedEngine.calculateWithMachineQuality({
      ...BASE_SF_INPUT,
      machine_quality_derate: 0.2,
    });
    expect(derated.machine_quality_derate_applied).toBe(0.5);
    expect(derated.machine_quality_source).toBe("caller_supplied");
  });
});
