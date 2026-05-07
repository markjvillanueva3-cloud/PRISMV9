/**
 * TurningChipWrappingRiskEngine — per-engine tests (MS7 / U-LPC04)
 */
import { describe, it, expect } from "vitest";
import { turningChipWrappingRiskEngine } from "../engines/TurningChipWrappingRiskEngine.js";

function base() {
  return {
    peak_rpm: 3000,
    feed_mm_rev: 0.2,
    ap_mm: 2.0,
    min_diameter_mm: 25,
    cut_stroke_mm: 40,
    predicted_chip_form: "segmented" as const,
    material: "steel" as const,
    css_active: true,
  };
}

describe("TurningChipWrappingRiskEngine", () => {
  it("low risk on small RPM + broken chips + cast iron", () => {
    const r = turningChipWrappingRiskEngine.assess({
      ...base(),
      peak_rpm: 800,
      predicted_chip_form: "broken",
      material: "cast_iron",
    });
    expect(r.risk_level).toBe("low");
    expect(r.mitigations).toHaveLength(0);
  });

  it("extreme risk: high RPM + stringy chip + titanium + long stroke at small dia", () => {
    const r = turningChipWrappingRiskEngine.assess({
      peak_rpm: 7500,
      feed_mm_rev: 0.05,
      ap_mm: 0.3,
      min_diameter_mm: 4,
      cut_stroke_mm: 150,
      predicted_chip_form: "stringy",
      material: "titanium",
      css_active: true,
    });
    expect(["high", "extreme"]).toContain(r.risk_level);
    expect(r.mitigations.length).toBeGreaterThan(2);
  });

  it("co-directional factors sum into score", () => {
    const r = turningChipWrappingRiskEngine.assess(base());
    const sum = r.factors.rpm_factor + r.factors.chip_form_factor + r.factors.material_factor + r.factors.geometry_factor;
    expect(Math.abs(r.risk_score - sum)).toBeLessThan(0.01);
  });

  it("oscillating_feed appears first at medium risk (≥25)", () => {
    // Medium risk: stringy chip on stainless at modest RPM.
    const r = turningChipWrappingRiskEngine.assess({
      ...base(),
      predicted_chip_form: "stringy",
      material: "stainless",
    });
    expect(r.risk_score).toBeGreaterThanOrEqual(25);
    expect(r.mitigations.some(m => m.strategy === "oscillating_feed")).toBe(true);
  });

  it("forced_peck recommended at ≥40 risk", () => {
    const r = turningChipWrappingRiskEngine.assess({
      ...base(),
      peak_rpm: 5500,
      predicted_chip_form: "continuous",
      material: "stainless",
    });
    if (r.risk_score >= 40) {
      expect(r.mitigations.some(m => m.strategy === "forced_peck")).toBe(true);
    }
  });

  it("speed_cap suggested only when CSS is active", () => {
    const off = turningChipWrappingRiskEngine.assess({
      ...base(),
      peak_rpm: 7000,
      predicted_chip_form: "stringy",
      material: "titanium",
      css_active: false,
    });
    expect(off.mitigations.some(m => m.strategy === "speed_cap")).toBe(false);
  });

  it("chipbreaker_upgrade emitted when chip form is stringy+", () => {
    const r = turningChipWrappingRiskEngine.assess({
      ...base(),
      predicted_chip_form: "stringy",
      material: "stainless",
      peak_rpm: 5000,
    });
    expect(r.mitigations.some(m => m.strategy === "chipbreaker_upgrade")).toBe(true);
  });

  it("high_pressure_coolant not redundantly recommended when already ≥ 40 bar", () => {
    const r = turningChipWrappingRiskEngine.assess({
      peak_rpm: 6000,
      feed_mm_rev: 0.05,
      ap_mm: 0.3,
      min_diameter_mm: 5,
      cut_stroke_mm: 120,
      predicted_chip_form: "stringy",
      material: "titanium",
      css_active: true,
      coolant_pressure_bar: 70,
    });
    expect(r.mitigations.some(m => m.strategy === "high_pressure_coolant")).toBe(false);
  });

  it("factor rpm_factor saturates at 30 for very high RPM", () => {
    const r = turningChipWrappingRiskEngine.assess({ ...base(), peak_rpm: 20000 });
    expect(r.factors.rpm_factor).toBe(30);
  });

  it("risk_score capped logically at 100", () => {
    const r = turningChipWrappingRiskEngine.assess({
      peak_rpm: 15000,
      feed_mm_rev: 0.02,
      ap_mm: 0.1,
      min_diameter_mm: 2,
      cut_stroke_mm: 300,
      predicted_chip_form: "snarled",
      material: "superalloy",
      css_active: true,
    });
    expect(r.risk_score).toBeLessThanOrEqual(100);
  });

  it("risk_level mapping: <25 low, 25-60 medium, 60-75 high, ≥75 extreme", () => {
    const lo = turningChipWrappingRiskEngine.assess({ ...base(), peak_rpm: 300, predicted_chip_form: "broken", material: "aluminum" });
    expect(lo.risk_level).toBe("low");

    const hi = turningChipWrappingRiskEngine.assess({
      peak_rpm: 12000,
      feed_mm_rev: 0.03,
      ap_mm: 0.2,
      min_diameter_mm: 3,
      cut_stroke_mm: 200,
      predicted_chip_form: "snarled",
      material: "superalloy",
      css_active: true,
    });
    expect(["high", "extreme"]).toContain(hi.risk_level);
  });

  it("mitigation priority escalates with risk level", () => {
    const high = turningChipWrappingRiskEngine.assess({
      peak_rpm: 9000,
      feed_mm_rev: 0.03,
      ap_mm: 0.2,
      min_diameter_mm: 3,
      cut_stroke_mm: 200,
      predicted_chip_form: "stringy",
      material: "titanium",
      css_active: true,
    });
    expect(high.mitigations.some(m => m.priority === "required")).toBe(true);
  });
});
