/**
 * TrilobeDeformationEngine Test Suite
 */
import { describe, it, expect } from "vitest";
import { trilobeDeformationEngine } from "../engines/TrilobeDeformationEngine.js";

function baseInput(overrides: any = {}): any {
  return {
    bore_radius_mm: 50,
    wall_thickness_mm: 5,
    grip_length_mm: 40,
    total_clamp_force_n: 10000,
    jaw_count: 3,
    ...overrides,
  };
}

describe("TrilobeDeformationEngine", () => {
  it("produces positive lobe amplitude for 3-jaw grip", () => {
    const r = trilobeDeformationEngine.analyze(baseInput());
    expect(r.lobe_amplitude_um).toBeGreaterThan(0);
  });

  it("3-jaw produces MORE lobe than 6-jaw at same force", () => {
    const threeJaw = trilobeDeformationEngine.analyze(baseInput({ jaw_count: 3 }));
    const sixJaw = trilobeDeformationEngine.analyze(baseInput({ jaw_count: 6 }));
    expect(threeJaw.lobe_amplitude_um).toBeGreaterThan(sixJaw.lobe_amplitude_um);
  });

  it("doubles force roughly doubles lobe amplitude", () => {
    const low = trilobeDeformationEngine.analyze(baseInput({ total_clamp_force_n: 5000 }));
    const high = trilobeDeformationEngine.analyze(baseInput({ total_clamp_force_n: 10000 }));
    expect(high.lobe_amplitude_um).toBeCloseTo(low.lobe_amplitude_um * 2, 1);
  });

  it("thin wall amplifies deformation", () => {
    const thick = trilobeDeformationEngine.analyze(baseInput({ wall_thickness_mm: 10 }));
    const thin = trilobeDeformationEngine.analyze(baseInput({ wall_thickness_mm: 2 }));
    expect(thin.lobe_amplitude_um).toBeGreaterThan(thick.lobe_amplitude_um);
  });

  it("per_jaw_force = total / jaw_count", () => {
    const r = trilobeDeformationEngine.analyze(
      baseInput({ total_clamp_force_n: 9000, jaw_count: 3 })
    );
    expect(r.per_jaw_force_n).toBeCloseTo(3000, 0);
  });

  it("flags is_trilobe_critical for 3-jaw + large deformation", () => {
    const r = trilobeDeformationEngine.analyze(
      baseInput({
        total_clamp_force_n: 50000,
        wall_thickness_mm: 1.5,
      })
    );
    expect(r.is_trilobe_critical).toBe(true);
  });

  it("recommends oversize bore equal to lobe amplitude", () => {
    const r = trilobeDeformationEngine.analyze(baseInput());
    expect(r.recommended_oversize_mm * 1000).toBeCloseTo(r.lobe_amplitude_um, 1);
  });

  it("warns when lobe exceeds tolerance", () => {
    const r = trilobeDeformationEngine.analyze(
      baseInput({
        total_clamp_force_n: 50000,
        finish_tolerance_mm: 0.001,
      })
    );
    expect(r.warnings.some((w) => /exceed|out-of-round/i.test(w))).toBe(true);
  });

  it("warns about 4-jaw quadrilobe", () => {
    const r = trilobeDeformationEngine.analyze(baseInput({ jaw_count: 4 }));
    expect(r.warnings.some((w) => /quadrilobe|4-jaw/i.test(w))).toBe(true);
  });

  it("recommends soft jaws when deformation > half of tolerance", () => {
    const r = trilobeDeformationEngine.analyze(
      baseInput({
        total_clamp_force_n: 20000,
        finish_tolerance_mm: 0.002,
      })
    );
    expect(r.use_soft_jaws_recommended).toBe(true);
  });

  it("safety_margin_vs_tolerance is computable and non-negative", () => {
    const r = trilobeDeformationEngine.analyze(baseInput());
    expect(Number.isFinite(r.safety_margin_vs_tolerance)).toBe(true);
    expect(r.safety_margin_vs_tolerance).toBeGreaterThanOrEqual(0);
  });

  it("recommendMaxForce inverts the formula", () => {
    const rec = trilobeDeformationEngine.recommendMaxForce(50, 5, 40, 3, 0.005);
    expect(rec.max_total_force_n).toBeGreaterThan(0);
    // Applying the recommended force should produce ~tolerance deformation
    const r = trilobeDeformationEngine.analyze(
      baseInput({
        total_clamp_force_n: rec.max_total_force_n,
        finish_tolerance_mm: 0.005,
      })
    );
    expect(r.lobe_amplitude_um).toBeCloseTo(5, 0); // 5 μm = 0.005 mm
  });

  it("getStats reports formula + jaw counts analyzed", () => {
    const s = trilobeDeformationEngine.getStats();
    expect(s.formula).toContain("cos");
    expect(s.jaw_counts_analyzed).toContain(3);
    expect(s.mitigations).toContain("soft_jaws (ring distribution)");
  });
});
