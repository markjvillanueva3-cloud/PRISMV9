import { describe, it, expect } from "vitest";
import { latheCoaxialityRunoutValidatorEngine } from "../engines/LatheCoaxialityRunoutValidatorEngine.js";

describe("LatheCoaxialityRunoutValidatorEngine", () => {
  it("returns comfortable verdict for loose tolerance", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.2,
      feature_diameter_mm: 30,
      spindle_runout_mm: 0.002,
      chuck_runout_mm: 0.010,
      toolsetup_offset_mm: 0.005,
      cutting_force_n: 100,
      overhang_mm: 20,
    });
    expect(r.verdict).toBe("comfortable");
    expect(r.ratio_predicted_to_tol).toBeLessThan(0.6);
  });

  it("returns infeasible for very tight tolerance", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "coaxiality",
      tolerance_mm: 0.005,
      feature_diameter_mm: 20,
      chuck_runout_mm: 0.020,
    });
    expect(r.verdict).toBe("infeasible");
    expect(r.mitigations.some((m) => /grinding/i.test(m.action))).toBe(true);
  });

  it("returns tight for marginal tolerance", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.02,
      feature_diameter_mm: 30,
      spindle_runout_mm: 0.003,
      chuck_runout_mm: 0.015,
      toolsetup_offset_mm: 0.006,
      cutting_force_n: 100,
      overhang_mm: 20,
    });
    expect(r.verdict).toBe("tight");
  });

  it("identifies chuck as dominant source with high chuck runout", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.05,
      feature_diameter_mm: 30,
      spindle_runout_mm: 0.001,
      chuck_runout_mm: 0.025,
      toolsetup_offset_mm: 0.003,
      overhang_mm: 10,
    });
    expect(r.dominant_source).toBe("chuck_collet_runout");
    expect(r.mitigations.some((m) => /chuck/i.test(m.action))).toBe(true);
  });

  it("identifies deflection as dominant on long overhang", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.1,
      feature_diameter_mm: 12,
      overhang_mm: 150,
      cutting_force_n: 400,
    });
    expect(r.dominant_source).toBe("part_deflection");
  });

  it("Cpk estimate scales with tolerance/predicted", () => {
    const loose = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.1,
      feature_diameter_mm: 30,
      spindle_runout_mm: 0.002,
      chuck_runout_mm: 0.010,
      overhang_mm: 10,
    });
    const tight = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.02,
      feature_diameter_mm: 30,
      spindle_runout_mm: 0.002,
      chuck_runout_mm: 0.010,
      overhang_mm: 10,
    });
    expect(loose.cpk_estimated).toBeGreaterThan(tight.cpk_estimated);
  });

  it("total_runout uses length factor", () => {
    const r1 = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "total_runout",
      tolerance_mm: 0.05,
      feature_diameter_mm: 30,
      feature_length_mm: 100,
    });
    const r2 = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.05,
      feature_diameter_mm: 30,
      feature_length_mm: 100,
    });
    // total_runout should predict ≥ circular_runout TIR (length amplification)
    expect(r1.predicted_tir_mm).toBeGreaterThanOrEqual(r2.predicted_tir_mm);
  });

  it("contribution percentages sum to ~100%", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.05,
      feature_diameter_mm: 30,
    });
    const sum = r.contributions.reduce((s, c) => s + c.pct_of_budget, 0);
    expect(sum).toBeGreaterThan(95);
    expect(sum).toBeLessThanOrEqual(100.5);
  });

  it("deflection scales cubically with overhang", () => {
    const short = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.1,
      feature_diameter_mm: 12,
      overhang_mm: 20,
      cutting_force_n: 300,
    });
    const long = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "circular_runout",
      tolerance_mm: 0.1,
      feature_diameter_mm: 12,
      overhang_mm: 80,
      cutting_force_n: 300,
    });
    const shortDef = short.contributions.find((c) => c.source === "part_deflection")!;
    const longDef = long.contributions.find((c) => c.source === "part_deflection")!;
    // 4x overhang → ~64x deflection
    expect(longDef.sigma_mm / shortDef.sigma_mm).toBeGreaterThan(30);
  });

  it("provides grinding mitigation when infeasible", () => {
    const r = latheCoaxialityRunoutValidatorEngine.validate({
      callout: "coaxiality",
      tolerance_mm: 0.003,
      feature_diameter_mm: 20,
      chuck_runout_mm: 0.020,
    });
    expect(r.verdict).toBe("infeasible");
    expect(r.mitigations.some((m) => m.action.toLowerCase().includes("grinding"))).toBe(true);
  });

  it("getStats returns formula + ranges", () => {
    const s = latheCoaxialityRunoutValidatorEngine.getStats();
    expect(s.formula).toMatch(/RSS/);
    expect(s.typical_contributions.chuck_collet_runout[1]).toBeGreaterThan(0);
  });
});
