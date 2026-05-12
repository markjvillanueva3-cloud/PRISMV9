/**
 * CastingDefectEngine — Unit Tests
 * @milestone FORGE-ENGINES-B42
 */
import { describe, it, expect } from "vitest";
import { castingDefectEngine } from "../engines/CastingDefectEngine.js";

describe("CastingDefectEngine", () => {
  it("overall defect risk has valid value", () => {
    const r = castingDefectEngine.calculate({});
    expect(["low", "moderate", "high"]).toContain(r.overall_defect_risk.unit);
  });

  it("thinner sections have higher misrun risk", () => {
    const thick = castingDefectEngine.calculate({ section_thickness_mm: 20 });
    const thin = castingDefectEngine.calculate({ section_thickness_mm: 2 });
    expect(thin.misrun_risk.value).toBeGreaterThanOrEqual(
      thick.misrun_risk.value
    );
  });

  it("die mold solidifies faster than sand", () => {
    const sand = castingDefectEngine.calculate({ mold_type: "sand" });
    const die = castingDefectEngine.calculate({ mold_type: "die" });
    expect(die.solidification_time.value).toBeLessThan(
      sand.solidification_time.value
    );
  });

  it("feeding distance increases with section thickness", () => {
    const thin = castingDefectEngine.calculate({ section_thickness_mm: 5 });
    const thick = castingDefectEngine.calculate({ section_thickness_mm: 40 });
    expect(thick.feeding_distance.value).toBeGreaterThan(
      thin.feeding_distance.value
    );
  });

  it("riser modulus > casting modulus", () => {
    const r = castingDefectEngine.calculate({ section_thickness_mm: 20 });
    const castingModulus = 20 / 2; // t/2
    expect(r.riser_modulus.value).toBeGreaterThan(castingModulus);
  });

  it("high gas content increases porosity risk", () => {
    const low = castingDefectEngine.calculate({ gas_content_ppm: 0 });
    const high = castingDefectEngine.calculate({ gas_content_ppm: 10 });
    expect(high.gas_porosity_risk.value).toBeGreaterThanOrEqual(
      low.gas_porosity_risk.value
    );
  });

  it("solidification time > 0", () => {
    const r = castingDefectEngine.calculate({});
    expect(r.solidification_time.value).toBeGreaterThan(0);
  });

  it("recommended pour temp > liquidus", () => {
    const r = castingDefectEngine.calculate({ alloy: "a356_aluminum" });
    expect(r.recommended_pour_temp.value).toBeGreaterThan(615);
  });

  it("warns low superheat", () => {
    const r = castingDefectEngine.calculate({
      alloy: "a356_aluminum",
      pouring_temp_c: 625,
    });
    expect(r.warnings.some(w => w.includes("Superheat"))).toBe(true);
  });

  it("warns thin section in sand mold", () => {
    const r = castingDefectEngine.calculate({
      section_thickness_mm: 2,
      mold_type: "sand",
    });
    expect(r.warnings.some(w => w.includes("misrun") || w.includes("<3mm"))).toBe(true);
  });
});
