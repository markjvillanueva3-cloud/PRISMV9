/**
 * ShaftAlignmentEngine — Unit Tests
 * @milestone FORGE-ENGINES-B28
 */
import { describe, it, expect } from "vitest";
import { shaftAlignmentEngine } from "../engines/ShaftAlignmentEngine.js";

describe("ShaftAlignmentEngine", () => {
  it("perfectly aligned machine returns zero misalignment", () => {
    const r = shaftAlignmentEngine.calculate({});
    expect(r.angular_misalignment.value).toBe(0);
    expect(r.offset_misalignment.value).toBe(0);
    expect(r.alignment_status.unit).toBe("PASS");
  });

  it("vertical offset from rim readings", () => {
    const r = shaftAlignmentEngine.calculate({
      rim_gap_top_bottom_mm: 0.20,
    });
    // offset = 0.20 / 2 = 0.10
    expect(r.offset_misalignment.value).toBeCloseTo(0.1, 2);
  });

  it("angular misalignment from face readings", () => {
    const r = shaftAlignmentEngine.calculate({
      coupling_diameter_mm: 200,
      face_tir_12: 0.10,
      face_tir_6: -0.10,
    });
    // angular vert = (0.10 - (-0.10)) / 200 = 0.001 rad → 0.1 mm/100mm
    expect(r.angular_misalignment.value).toBeCloseTo(0.1, 2);
  });

  it("higher RPM has tighter tolerance", () => {
    const slow = shaftAlignmentEngine.calculate({ rpm: 1200 });
    const fast = shaftAlignmentEngine.calculate({ rpm: 3600 });
    expect(fast.tolerance_offset.value).toBeLessThan(slow.tolerance_offset.value);
  });

  it("warns when offset exceeds tolerance", () => {
    const r = shaftAlignmentEngine.calculate({
      rim_gap_top_bottom_mm: 0.40,
      rpm: 3600,
    });
    // offset = 0.20mm > 0.05mm tolerance at 3600 RPM
    expect(r.alignment_status.unit).toBe("FAIL");
    expect(r.warnings.some(w => w.includes("Offset"))).toBe(true);
  });

  it("thermal growth calculated from temperature delta", () => {
    const r = shaftAlignmentEngine.calculate({
      driver_temp_c: 70,
      ambient_temp_c: 20,
      driver_centerline_mm: 300,
      cte_um_m_c: 12,
    });
    // ΔL = 12e-6 × 300 × 50 = 0.18mm
    expect(r.thermal_growth_driver.value).toBeCloseTo(0.18, 2);
  });

  it("no thermal growth when temps equal ambient", () => {
    const r = shaftAlignmentEngine.calculate({
      driver_temp_c: 20,
      driven_temp_c: 20,
      ambient_temp_c: 20,
    });
    expect(r.thermal_growth_driver.value).toBe(0);
    expect(r.thermal_growth_driven.value).toBe(0);
  });

  it("shim corrections project angular to feet", () => {
    const r = shaftAlignmentEngine.calculate({
      coupling_diameter_mm: 200,
      face_tir_12: 0.04,
      face_tir_6: -0.04,
      dist_coupling_to_front_mm: 300,
      dist_coupling_to_rear_mm: 600,
    });
    // angular = 0.08/200 = 0.0004 rad
    // rear shim > front shim (further from coupling)
    expect(Math.abs(r.rear_foot_shim.value)).toBeGreaterThan(
      Math.abs(r.front_foot_shim.value)
    );
  });

  it("warns high-speed machine to use laser", () => {
    const r = shaftAlignmentEngine.calculate({ rpm: 7200 });
    expect(r.warnings.some(w => w.includes("laser"))).toBe(true);
  });

  it("combined angular + offset RSS", () => {
    const r = shaftAlignmentEngine.calculate({
      coupling_diameter_mm: 200,
      face_tir_12: 0.06,
      face_tir_6: -0.06,
      face_tir_3: -0.04,
      face_tir_9: 0.04,
      rim_gap_top_bottom_mm: 0.10,
      rim_gap_left_right_mm: 0.08,
    });
    // Should have both angular and offset > 0
    expect(r.angular_misalignment.value).toBeGreaterThan(0);
    expect(r.offset_misalignment.value).toBeGreaterThan(0);
  });
});
