/**
 * SpotDrillingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B14
 */
import { describe, it, expect } from "vitest";
import { spotDrillingEngine } from "../engines/SpotDrillingEngine.js";

describe("SpotDrillingEngine", () => {
  it("calculates basic spot depth for 90° drill", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 12,
      spot_drill_angle_deg: 90,
      desired_spot_diameter_mm: 8,
    });
    // depth = (8/2) / tan(45°) = 4mm
    expect(r.spot_depth.value).toBeCloseTo(4, 2);
    expect(r.spot_surface_diameter.value).toBeCloseTo(8, 1);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
  });

  it("detects poor angle match (spot < drill)", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 16,
      spot_drill_angle_deg: 90,
      subsequent_drill_diameter_mm: 10,
      subsequent_drill_angle_deg: 118,
    });
    expect(r.angle_match.value).toBe(0);
    expect(r.centering_quality.value).toBeLessThan(50);
    expect(
      r.warnings.some(w => w.includes("walk"))
    ).toBe(true);
  });

  it("ideal angle match (spot > drill)", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 16,
      spot_drill_angle_deg: 140,
      subsequent_drill_diameter_mm: 10,
      subsequent_drill_angle_deg: 118,
    });
    expect(r.angle_match.value).toBe(2);
    expect(r.centering_quality.value).toBeGreaterThan(80);
  });

  it("warns spot too large vs drill", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 20,
      spot_drill_angle_deg: 90,
      subsequent_drill_diameter_mm: 5,
      desired_spot_diameter_mm: 8,
    });
    expect(
      r.warnings.some(w => w.includes("120%"))
    ).toBe(true);
  });

  it("warns spot too small vs drill", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 20,
      spot_drill_angle_deg: 90,
      subsequent_drill_diameter_mm: 16,
      desired_spot_diameter_mm: 6,
    });
    expect(
      r.warnings.some(w => w.includes("50%"))
    ).toBe(true);
  });

  it("warns center drill for large diameters", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 12,
      tool_type: "center_drill",
      desired_spot_diameter_mm: 8,
    });
    expect(
      r.warnings.some(w => w.includes("fragile"))
    ).toBe(true);
  });

  it("calculates dwell time", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 10,
    });
    expect(r.dwell_time.value).toBeGreaterThan(0);
  });

  it("handles aluminum with higher speeds", () => {
    const steel = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 12,
      material_type: "steel",
    });
    const alum = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 12,
      material_type: "aluminum",
    });
    expect(alum.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  it("warns desired diameter > tool diameter", () => {
    const r = spotDrillingEngine.calculate({
      spot_drill_diameter_mm: 6,
      desired_spot_diameter_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("increase tool"))
    ).toBe(true);
  });
});
