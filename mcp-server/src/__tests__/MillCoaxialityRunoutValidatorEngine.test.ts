import { describe, it, expect } from "vitest";
import {
  millCoaxialityRunoutValidatorEngine as eng,
  type MillFormToleranceInput,
} from "../engines/MillCoaxialityRunoutValidatorEngine.js";

function nominal(o: Partial<MillFormToleranceInput> = {}): MillFormToleranceInput {
  return {
    callout: "perpendicularity",
    tolerance_mm: 0.05,
    feature_size_mm: 25,
    feature_length_mm: 30,
    tool_diameter_mm: 10,
    tool_overhang_mm: 30,
    cutting_force_n: 300,
    ...o,
  };
}

describe("MillCoaxialityRunoutValidatorEngine", () => {
  it("getStats reports formula + 6 typical contribution ranges + 7 callouts", () => {
    const s = eng.getStats();
    expect(s.formula).toMatch(/RSS.*spindle_sq.*axis_sq.*workholding_flat.*deflection.*thermal/);
    expect(Object.keys(s.typical_contributions)).toEqual([
      "spindle_squareness", "axis_squareness", "workholding_flatness",
      "toolsetup_offset", "tool_deflection", "thermal_growth",
    ]);
    expect(s.supported_callouts).toEqual([
      "perpendicularity", "parallelism", "flatness", "position",
      "cylindricity", "circular_runout", "total_runout",
    ]);
  });

  it("throws on missing input fields", () => {
    expect(() => eng.validate({} as never)).toThrow(/callout required/);
    expect(() => eng.validate(nominal({ tolerance_mm: 0 }))).toThrow(/tolerance_mm must be > 0/);
    expect(() => eng.validate(nominal({ feature_size_mm: 0 }))).toThrow(/feature_size_mm must be > 0/);
  });

  it("nominal perpendicularity with 0.05mm tol → returns verdict + contributions + RSS sum", () => {
    const r = eng.validate(nominal());
    expect(["comfortable", "tight", "infeasible"]).toContain(r.verdict);
    expect(r.predicted_form_error_mm).toBeGreaterThan(0);
    expect(r.contributions.length).toBe(6);
    expect(r.contributions[0].pct_of_budget).toBeGreaterThan(0);
    // Sum of pct_of_budget across all contributions ≈ 100
    const totalPct = r.contributions.reduce((s, c) => s + c.pct_of_budget, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("very loose tolerance (0.5mm) → COMFORTABLE verdict with Cpk > 1.33", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.5 }));
    expect(r.verdict).toBe("comfortable");
    expect(r.cpk_estimated).toBeGreaterThan(1.33);
    expect(r.ratio_predicted_to_tol).toBeLessThan(0.6);
  });

  it("very tight tolerance (0.005mm) → INFEASIBLE verdict + grinding/EDM mitigation", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.005 }));
    expect(r.verdict).toBe("infeasible");
    expect(r.ratio_predicted_to_tol).toBeGreaterThan(1.0);
    expect(r.mitigations.some(m => /grinding|EDM/.test(m.action))).toBe(true);
  });

  it("contributions sorted by sigma descending (largest first)", () => {
    const r = eng.validate(nominal());
    for (let i = 1; i < r.contributions.length; i++) {
      expect(r.contributions[i].sigma_mm).toBeLessThanOrEqual(r.contributions[i - 1].sigma_mm);
    }
  });

  it("dominant_source matches contributions[0].source", () => {
    const r = eng.validate(nominal());
    expect(r.dominant_source).toBe(r.contributions[0].source);
  });

  it("long tool overhang (100mm) makes tool_deflection dominant → shorten-projection mitigation", () => {
    const r = eng.validate(nominal({ tool_overhang_mm: 100, tool_diameter_mm: 6, cutting_force_n: 400 }));
    // δ = 400 * 100^3 / (3 * 600000 * π*6^4/64) = huge
    expect(r.dominant_source).toBe("tool_deflection");
    expect(r.mitigations.some(m => /Shorten tool projection/.test(m.action))).toBe(true);
    expect(r.mitigations.some(m => m.priority === "high")).toBe(true);
  });

  it("high cutting force + long overhang → secondary mitigation 'Reduce cutting force'", () => {
    const r = eng.validate(nominal({ tool_overhang_mm: 100, tool_diameter_mm: 6, cutting_force_n: 500 }));
    expect(r.mitigations.some(m => /Reduce cutting force/.test(m.action))).toBe(true);
  });

  it("large spindle_squareness → spindle dominant + tram-spindle mitigation", () => {
    const r = eng.validate(nominal({ spindle_squareness_mm: 0.05, axis_squareness_mm: 0.001, workholding_flatness_mm: 0.001, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.001, tool_overhang_mm: 10, tool_diameter_mm: 25 }));
    expect(r.dominant_source).toBe("spindle_squareness");
    expect(r.mitigations.some(m => /Tram spindle/.test(m.action))).toBe(true);
  });

  it("large axis_squareness → axis dominant + laser interferometer + ball bar mitigation", () => {
    const r = eng.validate(nominal({ spindle_squareness_mm: 0.001, axis_squareness_mm: 0.05, workholding_flatness_mm: 0.001, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.001, tool_overhang_mm: 10, tool_diameter_mm: 25 }));
    expect(r.dominant_source).toBe("axis_squareness");
    expect(r.mitigations.some(m => /laser interferometer.*ball bar/.test(m.action))).toBe(true);
  });

  it("large workholding_flatness → workholding dominant + re-machine soft jaws mitigation", () => {
    const r = eng.validate(nominal({ spindle_squareness_mm: 0.001, axis_squareness_mm: 0.001, workholding_flatness_mm: 0.05, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.001, tool_overhang_mm: 10, tool_diameter_mm: 25 }));
    expect(r.dominant_source).toBe("workholding_flatness");
    expect(r.mitigations.some(m => /Re-machine soft jaws|surface-grind fixture/.test(m.action))).toBe(true);
  });

  it("large thermal_growth → thermal dominant + spindle warm-up mitigation", () => {
    const r = eng.validate(nominal({ spindle_squareness_mm: 0.001, axis_squareness_mm: 0.001, workholding_flatness_mm: 0.001, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.05, tool_overhang_mm: 10, tool_diameter_mm: 25 }));
    expect(r.dominant_source).toBe("thermal_growth");
    expect(r.mitigations.some(m => /warm-up cycle/.test(m.action))).toBe(true);
  });

  it("Cpk formula: Cpk = (tol/2) / (3 * predicted_sigma)", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.1 }));
    const expectedCpk = (0.1 / 2) / (3 * r.predicted_form_error_mm);
    expect(r.cpk_estimated).toBeCloseTo(Math.round(expectedCpk * 100) / 100, 2);
  });

  it("ratio_predicted_to_tol = predicted / tolerance", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.05 }));
    const expected = r.predicted_form_error_mm / 0.05;
    expect(r.ratio_predicted_to_tol).toBeCloseTo(Math.round(expected * 100) / 100, 2);
  });

  it("long feature (>50mm) applies length_factor amplification to spindle + axis contributions", () => {
    const rShort = eng.validate(nominal({ feature_length_mm: 30 }));
    const rLong = eng.validate(nominal({ feature_length_mm: 200 }));
    // Long feature should have higher predicted form error (length factor amplifies)
    expect(rLong.predicted_form_error_mm).toBeGreaterThan(rShort.predicted_form_error_mm);
  });

  it("each callout type is accepted without error", () => {
    const callouts: MillFormToleranceInput["callout"][] = [
      "perpendicularity", "parallelism", "flatness", "position",
      "cylindricity", "circular_runout", "total_runout",
    ];
    for (const c of callouts) {
      const r = eng.validate(nominal({ callout: c }));
      expect(r.predicted_form_error_mm).toBeGreaterThan(0);
      expect(["comfortable", "tight", "infeasible"]).toContain(r.verdict);
    }
  });

  it("reasoning array cites RSS predicted vs tol + dominant source + Cpk if below target", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.005 })); // infeasible → cpk < target
    expect(r.reasoning.some(s => /RSS predicted form error.*mm vs tol/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Dominant:.*pct_of_budget|% of budget/i.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Cpk.*< target/.test(s))).toBe(true);
  });

  it("tool_deflection cantilever scales as L^3 (10x increase in overhang → ~1000x increase in deflection)", () => {
    const rShort = eng.validate(nominal({ tool_overhang_mm: 10, tool_diameter_mm: 6, cutting_force_n: 300, workholding_flatness_mm: 0.001, axis_squareness_mm: 0.001, spindle_squareness_mm: 0.001, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.001 }));
    const rLong = eng.validate(nominal({ tool_overhang_mm: 100, tool_diameter_mm: 6, cutting_force_n: 300, workholding_flatness_mm: 0.001, axis_squareness_mm: 0.001, spindle_squareness_mm: 0.001, toolsetup_offset_mm: 0.001, thermal_growth_mm: 0.001 }));
    const dShort = rShort.contributions.find(c => c.source === "tool_deflection")!.sigma_mm;
    const dLong = rLong.contributions.find(c => c.source === "tool_deflection")!.sigma_mm;
    // Ratio should be approximately 1000x (10^3)
    expect(dLong / dShort).toBeGreaterThan(800);
    expect(dLong / dShort).toBeLessThan(1200);
  });

  it("verdict='comfortable' produces no infeasibility mitigation", () => {
    const r = eng.validate(nominal({ tolerance_mm: 1.0 }));
    expect(r.verdict).toBe("comfortable");
    expect(r.mitigations.every(m => !/grinding|EDM/.test(m.action))).toBe(true);
  });

  it("custom cpk_target tightens threshold (cpk_target=2.0 → more 'tight' verdicts)", () => {
    const r = eng.validate(nominal({ tolerance_mm: 0.05, cpk_target: 2.0 }));
    // Reasoning should cite higher Cpk threshold
    if (r.cpk_estimated < 2.0) {
      expect(r.reasoning.some(s => /Cpk.*< target 2/.test(s))).toBe(true);
    }
  });
});
