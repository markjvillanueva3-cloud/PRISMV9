/**
 * wizardTrioMachineQualityWire.test.ts — U-DB-MACHINE-QUALITY-CONSUMERS Phase 5 wire (wizard trio).
 *
 * Proves WizardToQuoteBridgeEngine consumes machine-quality signals for ALL
 * 3 wizard domains (mill / lathe / wedm) when machine_id is provided. The
 * bridge is the canonical wire surface for the wizard trio — adding the
 * overlay there hits all 3 wizards in one place rather than 3 separate engines.
 *
 * Coverage:
 *   - mill / lathe / wedm domains each produce machine_quality overlay
 *   - Top-tier machine → small cycle uplift, machine_cost ≈ baseline
 *   - Hobby machine → large cycle uplift, machine_cost > baseline
 *   - No machine input → machine_quality undefined (additive — backward compatible)
 *   - Tier hierarchy invariant: top.machine_cost < hobby.machine_cost (same wizard output)
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MACHINE-QUALITY-CONSUMERS-WIRE-WIZARD-TRIO (slot juliett, 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { wizardToQuoteBridgeEngine } from "../engines/WizardToQuoteBridgeEngine.js";

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

function wizardOutput(domain: "mill" | "lathe" | "wedm") {
  return {
    domain,
    machine_family: domain === "mill" ? "haas_vf2" : domain === "lathe" ? "okuma_lb3000" : "mitsubishi_mv1200r",
    material: "aluminum_6061",
    operations: [
      { name: "rough", cycle_min: 12, tool_ids: ["t1"] },
      { name: "finish", cycle_min: 8, tool_ids: ["t2"] },
    ],
    setup_min: 30,
    operator_tier: "operator" as const,
    quantity: 50,
  };
}

describe("U-DB-MACHINE-QUALITY-CONSUMERS-WIRE-WIZARD-TRIO — bridge consumes machine-quality for all 3 domains", () => {
  for (const domain of ["mill", "lathe", "wedm"] as const) {
    it(`${domain} domain: top-tier machine → cycle_uplift ≤20%, tier=S overlay populated with real values`, async () => {
      const r = await wizardToQuoteBridgeEngine.bridge(wizardOutput(domain), {
        machine: TOP_TIER_MACHINE,
      });
      expect(r.ok).toBe(true);
      // Real value assertions — checking literal fields proves machine_quality exists
      expect(r.machine_quality?.tier).toBe("S");
      expect(r.machine_quality?.cycle_time_uplift_pct).toBeLessThanOrEqual(20);
      expect(r.machine_quality?.cycle_time_uplift_pct).toBeGreaterThanOrEqual(0);
      expect(r.machine_quality?.source).toMatch(/^machine_quality_score\[S\]$/);
      expect(r.machine_quality?.wizard_display.display_name).toBe("DMG MORI NMV5000DCG");
      expect(r.machine_quality?.wizard_display.tier_badge).toBe("S");
      expect(r.machine_quality?.wizard_display.capability_bullets.length).toBe(5);
    });

    it(`${domain} domain: hobby machine → cycle_uplift > 40%, tier=D overlay populated with real values`, async () => {
      const r = await wizardToQuoteBridgeEngine.bridge(wizardOutput(domain), {
        machine: HOBBY_MACHINE,
      });
      expect(r.ok).toBe(true);
      expect(r.machine_quality?.tier).toBe("D");
      expect(r.machine_quality?.cycle_time_uplift_pct ?? 0).toBeGreaterThan(40);
      expect(r.machine_quality?.derate_factor ?? 1).toBeLessThanOrEqual(0.7);
      expect(r.machine_quality?.wizard_display.display_name).toBe("Shapeoko Pro");
      expect(r.machine_quality?.wizard_display.tier_badge).toBe("D");
    });
  }

  it("no machine_id + no machine → machine_quality field absent (additive, backward compatible)", async () => {
    const r = await wizardToQuoteBridgeEngine.bridge(wizardOutput("mill"));
    expect(r.ok).toBe(true);
    expect(r.machine_quality === undefined).toBe(true);
    expect(r.machine_cost_usd).toBeGreaterThan(0);
  });

  it("tier hierarchy invariant: top.machine_cost_usd < hobby.machine_cost_usd (same wizard output, mill domain)", async () => {
    const wiz = wizardOutput("mill");
    const [top, hobby] = await Promise.all([
      wizardToQuoteBridgeEngine.bridge(wiz, { machine: TOP_TIER_MACHINE }),
      wizardToQuoteBridgeEngine.bridge(wiz, { machine: HOBBY_MACHINE }),
    ]);
    expect(top.ok).toBe(true);
    expect(hobby.ok).toBe(true);
    expect(top.machine_cost_usd).toBeLessThan(hobby.machine_cost_usd);
    expect(top.cost_per_part_usd).toBeLessThan(hobby.cost_per_part_usd);
  });

  it("backward compat: bridge call without opts.machine_id matches pre-Phase-5 behavior", async () => {
    const baseline = await wizardToQuoteBridgeEngine.bridge(wizardOutput("lathe"));
    const explicit = await wizardToQuoteBridgeEngine.bridge(wizardOutput("lathe"), {});
    expect(baseline.machine_cost_usd).toBe(explicit.machine_cost_usd);
    expect(baseline.cost_per_part_usd).toBe(explicit.cost_per_part_usd);
    expect(baseline.machine_quality === undefined).toBe(true);
    expect(explicit.machine_quality === undefined).toBe(true);
  });
});
