/**
 * AxisCompensationEngine — Unit Tests
 * @milestone FORGE-ENGINES-B20
 */
import { describe, it, expect } from "vitest";
import {
  axisCompensationEngine,
} from "../engines/AxisCompensationEngine.js";

describe("AxisCompensationEngine", () => {
  it("calculates thermal growth", () => {
    const r = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
      temperature_rise_c: 3,
    });
    // 12e-6 × 0.5m × 3°C × 1000 = 0.018mm
    expect(r.thermal_growth.value).toBeCloseTo(0.018, 3);
  });

  it("Z-axis has extra spindle growth", () => {
    const x = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
      temperature_rise_c: 3,
    });
    const z = axisCompensationEngine.calculate({
      axis: "Z",
      travel_mm: 500,
      temperature_rise_c: 3,
    });
    expect(z.thermal_growth.value).toBeGreaterThan(
      x.thermal_growth.value
    );
  });

  it("glass scale reduces error", () => {
    const noScale = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
      has_glass_scale: false,
    });
    const withScale = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
      has_glass_scale: true,
    });
    expect(withScale.achievable_accuracy.value).toBeLessThan(
      noScale.achievable_accuracy.value
    );
  });

  it("pitch error depends on screw class", () => {
    const c3 = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 300,
      screw_class: "C3",
    });
    const c7 = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 300,
      screw_class: "C7",
    });
    expect(c7.pitch_error_per_300mm.value).toBeGreaterThan(
      c3.pitch_error_per_300mm.value
    );
  });

  it("calculates warmup time", () => {
    const r = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
    });
    expect(r.warmup_time.value).toBeGreaterThan(60);
  });

  it("warns high thermal growth", () => {
    const r = axisCompensationEngine.calculate({
      axis: "Z",
      travel_mm: 800,
      temperature_rise_c: 5,
    });
    expect(
      r.warnings.some(w => w.includes("warmup") ||
        w.includes("Thermal"))
    ).toBe(true);
  });

  it("warns low accuracy screw without scale", () => {
    const r = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 600,
      screw_class: "C7",
      has_glass_scale: false,
    });
    expect(
      r.warnings.some(w => w.includes("scale"))
    ).toBe(true);
  });

  it("total error budget includes all sources", () => {
    const r = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 500,
    });
    expect(r.total_error_budget.value).toBeGreaterThan(
      r.thermal_growth.value
    );
  });

  it("backlash uses measured value when provided", () => {
    const r = axisCompensationEngine.calculate({
      axis: "X",
      travel_mm: 300,
      measured_backlash_mm: 0.012,
    });
    expect(r.backlash_compensation.value).toBe(0.012);
  });
});
