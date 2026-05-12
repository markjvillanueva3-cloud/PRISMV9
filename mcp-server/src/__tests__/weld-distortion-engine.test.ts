/**
 * WeldDistortionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B41
 */
import { describe, it, expect } from "vitest";
import { weldDistortionEngine } from "../engines/WeldDistortionEngine.js";

describe("WeldDistortionEngine", () => {
  it("angular distortion > 0 with defaults", () => {
    const r = weldDistortionEngine.calculate({});
    expect(r.angular_distortion.value).toBeGreaterThan(0);
  });

  it("thinner plate has more angular distortion", () => {
    const thick = weldDistortionEngine.calculate({ plate_thickness_mm: 20 });
    const thin = weldDistortionEngine.calculate({ plate_thickness_mm: 5 });
    expect(thin.angular_distortion.value).toBeGreaterThan(
      thick.angular_distortion.value
    );
  });

  it("rigid restraint reduces distortion", () => {
    const free = weldDistortionEngine.calculate({ restraint_level: "free" });
    const rigid = weldDistortionEngine.calculate({ restraint_level: "rigid" });
    expect(rigid.angular_distortion.value).toBeLessThan(
      free.angular_distortion.value
    );
  });

  it("higher heat input increases distortion", () => {
    const low = weldDistortionEngine.calculate({ heat_input_kj_mm: 0.5 });
    const high = weldDistortionEngine.calculate({ heat_input_kj_mm: 3.0 });
    expect(high.angular_distortion.value).toBeGreaterThan(
      low.angular_distortion.value
    );
  });

  it("transverse shrinkage > 0", () => {
    const r = weldDistortionEngine.calculate({});
    expect(r.transverse_shrinkage.value).toBeGreaterThan(0);
  });

  it("high CE requires preheat", () => {
    const r = weldDistortionEngine.calculate({ material: "high_strength" });
    expect(r.preheat_temp.value).toBeGreaterThan(0);
  });

  it("mild steel has lower preheat than high strength", () => {
    const ms = weldDistortionEngine.calculate({ material: "mild_steel" });
    const hs = weldDistortionEngine.calculate({ material: "high_strength" });
    expect(hs.preheat_temp.value).toBeGreaterThanOrEqual(
      ms.preheat_temp.value
    );
  });

  it("residual stress > 0", () => {
    const r = weldDistortionEngine.calculate({});
    expect(r.residual_stress.value).toBeGreaterThan(0);
  });

  it("mitigation score between 1 and 10", () => {
    const r = weldDistortionEngine.calculate({});
    expect(r.mitigation_score.value).toBeGreaterThanOrEqual(1);
    expect(r.mitigation_score.value).toBeLessThanOrEqual(10);
  });

  it("warns high heat input", () => {
    const r = weldDistortionEngine.calculate({ heat_input_kj_mm: 5 });
    expect(r.warnings.some(w => w.includes("Heat input"))).toBe(true);
  });
});
