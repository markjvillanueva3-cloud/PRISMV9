/**
 * KeywayEngine — Unit Tests
 * @milestone FORGE-ENGINES-B14
 */
import { describe, it, expect } from "vitest";
import { keywayEngine } from "../engines/KeywayEngine.js";

describe("KeywayEngine", () => {
  it("looks up standard key for 25mm shaft", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 25,
    });
    // DIN 6885: 22-30mm → W=8, H=7
    expect(r.key_width.value).toBe(8);
    expect(r.key_height.value).toBe(7);
    expect(r.shaft_depth.value).toBe(3.5);
    expect(r.hub_depth.value).toBe(3.5);
  });

  it("looks up standard key for 40mm shaft", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 40,
    });
    // 38-44mm → W=12, H=8
    expect(r.key_width.value).toBe(12);
    expect(r.key_height.value).toBe(8);
  });

  it("calculates broaching force", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 30,
      machining_method: "broach",
    });
    expect(r.broaching_force.value).toBeGreaterThan(0);
  });

  it("end mill diameter matches key width", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 20,
      machining_method: "end_mill",
    });
    expect(r.end_mill_diameter.value).toBe(r.key_width.value);
    expect(r.milling_feed.value).toBeGreaterThan(0);
    expect(r.milling_rpm.value).toBeGreaterThan(0);
  });

  it("calculates torque capacity", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 50,
      keyway_length_mm: 60,
    });
    expect(r.torque_capacity.value).toBeGreaterThan(0);
  });

  it("warns on small shaft", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 4,
    });
    expect(
      r.warnings.some(w => w.includes("pin"))
    ).toBe(true);
  });

  it("warns on large shaft", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 150,
    });
    expect(
      r.warnings.some(w => w.includes("extended"))
    ).toBe(true);
  });

  it("warns short keyway", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 30,
      keyway_length_mm: 20,
    });
    expect(
      r.warnings.some(w => w.includes("too short"))
    ).toBe(true);
  });

  it("warns stainless broaching", () => {
    const r = keywayEngine.calculate({
      shaft_diameter_mm: 25,
      material_type: "stainless",
      machining_method: "broach",
    });
    expect(
      r.warnings.some(w => w.includes("work-hardens"))
    ).toBe(true);
  });

  it("fit tolerances differ by class", () => {
    const slide = keywayEngine.calculate({
      shaft_diameter_mm: 25,
      fit_class: "slide",
    });
    const tight = keywayEngine.calculate({
      shaft_diameter_mm: 25,
      fit_class: "tight",
    });
    expect(slide.width_tolerance_shaft.value)
      .not.toBe(tight.width_tolerance_shaft.value);
  });
});
