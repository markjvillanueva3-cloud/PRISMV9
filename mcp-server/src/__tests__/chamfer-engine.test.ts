/**
 * ChamferEngine — Unit Tests
 * @milestone FORGE-ENGINES-B13
 */
import { describe, it, expect } from "vitest";
import { chamferEngine } from "../engines/ChamferEngine.js";

describe("ChamferEngine", () => {
  it("calculates basic 1mm × 45° chamfer on hole", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 1,
      chamfer_angle_deg: 45,
      hole_diameter_mm: 10,
      edge_type: "hole",
    });
    expect(r.chamfer_width.value).toBe(1);
    // tan(45°) = 1, so depth = 1mm
    expect(r.chamfer_depth.value).toBeCloseTo(1, 2);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.recommended_tool_angle.value).toBe(45);
  });

  it("calculates 60° chamfer geometry", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 0.5,
      chamfer_angle_deg: 60,
    });
    // tan(60°) ≈ 1.732
    expect(r.chamfer_depth.value).toBeCloseTo(
      0.5 * Math.tan(Math.PI / 3), 2
    );
    expect(r.recommended_tool_angle.value).toBe(60);
  });

  it("warns on back-chamfer requirement", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 0.5,
      hole_diameter_mm: 8,
      back_chamfer: true,
    });
    expect(
      r.warnings.some(w => w.includes("Back-chamfer"))
    ).toBe(true);
  });

  it("warns on non-standard angle", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 1,
      chamfer_angle_deg: 37,
    });
    expect(
      r.warnings.some(w => w.includes("Non-standard"))
    ).toBe(true);
  });

  it("warns large chamfer with spot drill", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 5,
      tool_type: "spot_drill",
    });
    expect(
      r.warnings.some(w => w.includes("chamfer mill"))
    ).toBe(true);
  });

  it("calculates hole circumference path length", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 1,
      hole_diameter_mm: 20,
      edge_type: "hole",
    });
    // Path ≈ π × (20 + 1) ≈ 65.97
    expect(r.tool_path_length.value).toBeCloseTo(
      Math.PI * 21, 0
    );
  });

  it("uses edge length when provided", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 0.5,
      edge_type: "edge",
      edge_length_mm: 100,
    });
    expect(r.tool_path_length.value).toBe(100);
  });

  it("handles aluminum with higher speeds", () => {
    const steel = chamferEngine.calculate({
      chamfer_size_mm: 1,
      hole_diameter_mm: 10,
      material_type: "steel",
    });
    const alum = chamferEngine.calculate({
      chamfer_size_mm: 1,
      hole_diameter_mm: 10,
      material_type: "aluminum",
    });
    expect(alum.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  it("cycle time is positive", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 1,
      hole_diameter_mm: 10,
    });
    expect(r.cycle_time_per_feature.value).toBeGreaterThan(0);
  });

  it("warns tool larger than hole", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 1,
      hole_diameter_mm: 5,
      tool_diameter_mm: 10,
      edge_type: "hole",
    });
    expect(
      r.warnings.some(w => w.includes("larger than hole"))
    ).toBe(true);
  });

  it("warns large chamfer in titanium", () => {
    const r = chamferEngine.calculate({
      chamfer_size_mm: 6,
      material_type: "titanium",
    });
    expect(
      r.warnings.some(w => w.includes("multiple passes"))
    ).toBe(true);
  });
});
