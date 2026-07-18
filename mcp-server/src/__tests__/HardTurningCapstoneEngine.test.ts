/**
 * HardTurningCapstoneEngine.test.ts -- U-LW-CAPSTONE-TEST-DESTUB (slot:whiskey, MISC-046)
 * ============================================================================
 * This file existed as an EMPTY husk (vitest: "No test suite found" -- a file-level
 * suite failure and a no-stub violation). Real coverage of the LATHE-PRO-MS5 capstone:
 * fail-loud validation, composition shape, the deterministic residual-stress judgement
 * (VB/coolant flips, requirement gating), and the composite-safety algebraic invariant.
 * Sub-engine physics is NOT re-derived here -- the capstone delegates (see its header);
 * dispatcher round-trips live in turningDispatcher.hardTurning.test.ts.
 */
import { describe, it, expect } from "vitest";
import { hardTurningCapstoneEngine, type HardTurningCapstoneInput } from "../engines/HardTurningCapstoneEngine.js";

const eng = hardTurningCapstoneEngine;

// 58 HRC OD journal, benign hard-turning conditions.
const BASE: HardTurningCapstoneInput = {
  hardness_hrc: 58,
  target_ra_um: 0.4,
  target_tolerance_mm: 0.01,
  feature: "od",
  lot_size: 200,
  diameter_mm: 45,
};

describe("HardTurningCapstoneEngine.optimize -- LATHE-PRO-MS5 composite", () => {
  it("FAIL-LOUD: missing/non-finite/non-positive required fields throw with the field name", () => {
    expect(() => eng.optimize(undefined as unknown as HardTurningCapstoneInput)).toThrow(/input is required/);
    expect(() => eng.optimize({ ...BASE, hardness_hrc: 0 })).toThrow(/hardness_hrc must be positive/);
    expect(() => eng.optimize({ ...BASE, diameter_mm: NaN })).toThrow(/diameter_mm must be finite/);
    expect(() => eng.optimize({ ...BASE, lot_size: -5 })).toThrow(/lot_size must be positive/);
  });

  it("ADVERSARIAL: hardness above 75 HRC is rejected as non-physical", () => {
    expect(() => eng.optimize({ ...BASE, hardness_hrc: 80 })).toThrow(/non-physical/);
  });

  it("composes all four stages: decision + white-layer + residual-stress + reasoning trace", () => {
    const r = eng.optimize(BASE);
    expect(typeof r.decision.recommendation).toBe("string");
    expect(r.white_layer).toBeTruthy();
    expect(["compressive", "tensile", "mixed"]).toContain(r.residual_stress.predicted_state);
    expect(r.reasoning[0]).toMatch(/^Decision: /);
    expect(r.reasoning[r.reasoning.length - 1]).toMatch(/^Composite safety: (SAFE|BLOCKED)\.$/);
    expect(r.source).toContain("HardTurningCapstoneEngine.optimize");
  });

  it("grinding_replacement is null without a baseline and populated with one", () => {
    expect(eng.optimize(BASE).grinding_replacement).toBeNull();
    const withBaseline = eng.optimize({
      ...BASE,
      grinding_baseline: {
        achieved_ra_um: 0.3,
        achieved_tolerance_mm: 0.008,
        stock_removal_mm: 0.2,
        grind_cycle_sec: 240,
        grind_cost_per_part_usd: 6.5,
      },
    });
    expect(withBaseline.grinding_replacement).not.toBeNull();
    expect(typeof withBaseline.grinding_replacement!.feasibility).toBe("string");
  });

  it("DRY cutting flips residual stress to tensile (coolant_ok false)", () => {
    const r = eng.optimize({ ...BASE, coolant: "dry" });
    expect(r.residual_stress.predicted_state).toBe("tensile");
    expect(r.residual_stress.coolant_ok).toBe(false);
    expect(r.residual_stress.rationale.join(" ")).toMatch(/tensile/);
  });

  it("worn tool (VB 0.3 > 0.20 limit) flips residual stress to tensile (vb_wear_ok false)", () => {
    const r = eng.optimize({ ...BASE, tool_wear_VB_mm: 0.3 });
    expect(r.residual_stress.vb_wear_ok).toBe(false);
    expect(r.residual_stress.predicted_state).toBe("tensile");
  });

  it("REQUIREMENT GATE: compressive_ok + dry cutting fails the requirement AND blocks composite safety", () => {
    const r = eng.optimize({ ...BASE, coolant: "dry", residual_stress_requirement: "compressive_ok" });
    expect(r.residual_stress.meets_requirement).toBe(false);
    expect(r.composite_safe).toBe(false); // meets_requirement=false forces the composite block
    expect(r.residual_stress.rationale.join(" ")).toMatch(/reduce VB limit, restore flood coolant/);
  });

  it("REQUIREMENT GATE: tensile_required under benign CBN conditions fails with the shot-peen advisory", () => {
    const r = eng.optimize({
      ...BASE,
      forced_tool_material: "CBN",
      tool_wear_VB_mm: 0.1,
      coolant: "flood",
      residual_stress_requirement: "tensile_required",
    });
    if (r.residual_stress.predicted_state !== "tensile") {
      expect(r.residual_stress.meets_requirement).toBe(false);
      expect(r.residual_stress.rationale.join(" ")).toMatch(/shot-peen/);
    } else {
      // white-layer risk pushed the state to tensile -- the gate must then pass
      expect(r.residual_stress.meets_requirement).toBe(true);
    }
  });

  it("ALGEBRAIC INVARIANT: without a baseline, composite_safe === white_layer.safe_to_proceed && meets_requirement", () => {
    for (const variant of [BASE, { ...BASE, coolant: "dry" as const }, { ...BASE, tool_wear_VB_mm: 0.25 }]) {
      const r = eng.optimize(variant);
      expect(r.composite_safe).toBe(r.white_layer.safe_to_proceed && r.residual_stress.meets_requirement);
    }
  });

  it("forced_tool_material override keeps the composition valid across all three materials", () => {
    for (const tool of ["CBN", "ceramic", "carbide"] as const) {
      const r = eng.optimize({ ...BASE, forced_tool_material: tool });
      expect(["compressive", "tensile", "mixed"]).toContain(r.residual_stress.predicted_state);
      expect(r.residual_stress.rationale.length).toBeGreaterThan(0);
    }
  });
});
