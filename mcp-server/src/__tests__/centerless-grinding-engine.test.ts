/**
 * CenterlessGrindingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B17
 */
import { describe, it, expect } from "vitest";
import {
  centerlessGrindingEngine,
} from "../engines/CenterlessGrindingEngine.js";

describe("CenterlessGrindingEngine", () => {
  it("calculates basic through-feed parameters", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 20,
      mode: "through_feed",
    });
    expect(r.grinding_wheel_rpm.value).toBeGreaterThan(0);
    expect(r.workpiece_rpm.value).toBeGreaterThan(0);
    expect(r.through_feed_rate.value).toBeGreaterThan(0);
    expect(r.center_height.value).toBeGreaterThan(0);
  });

  it("through-feed blade angle is 30°", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 15,
      mode: "through_feed",
    });
    expect(r.work_rest_blade_angle.value).toBe(30);
  });

  it("infeed blade angle is 0°", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 15,
      mode: "infeed",
    });
    expect(r.work_rest_blade_angle.value).toBe(0);
  });

  it("production rate positive for through-feed", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 10,
      part_length_mm: 30,
      mode: "through_feed",
    });
    expect(r.production_rate.value).toBeGreaterThan(0);
  });

  it("production rate positive for infeed", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 20,
      mode: "infeed",
    });
    expect(r.production_rate.value).toBeGreaterThan(0);
  });

  it("warns high grinding speed", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 15,
      grinding_wheel_speed_mps: 50,
    });
    expect(
      r.warnings.some(w => w.includes("wheel rating"))
    ).toBe(true);
  });

  it("warns high inclination angle", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 15,
      inclination_angle_deg: 8,
      mode: "through_feed",
    });
    expect(
      r.warnings.some(w => w.includes("spiral"))
    ).toBe(true);
  });

  it("warns small workpiece", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 2,
    });
    expect(
      r.warnings.some(w => w.includes("small"))
    ).toBe(true);
  });

  it("warns stainless loading", () => {
    const r = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 20,
      material_type: "stainless",
    });
    expect(
      r.warnings.some(w => w.includes("loading"))
    ).toBe(true);
  });

  it("contact arc increases with stock removal", () => {
    const light = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 20,
      stock_removal_mm: 0.1,
    });
    const heavy = centerlessGrindingEngine.calculate({
      workpiece_diameter_mm: 20,
      stock_removal_mm: 0.5,
    });
    expect(heavy.contact_arc_length.value).toBeGreaterThan(
      light.contact_arc_length.value
    );
  });
});
