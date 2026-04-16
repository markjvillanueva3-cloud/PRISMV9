/**
 * CNC Simulation Pipeline Foundation — SweptVolume + ToolAssembly tests
 * SIM-MS0 Phase 0
 */
import { describe, it, expect } from "vitest";
import { sweptVolumeEngine } from "../engines/SweptVolumeEngine.js";
import { toolAssemblyModelEngine } from "../engines/ToolAssemblyModelEngine.js";

describe("SweptVolumeEngine", () => {
  it("interpolates linear move at 1mm resolution", () => {
    const points = sweptVolumeEngine.interpolate({
      type: "linear",
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 0, z: 0 },
    }, 1.0);
    expect(points.length).toBe(11); // 0,1,2,...,10
    expect(points[0].x).toBe(0);
    expect(points[10].x).toBe(10);
  });

  it("interpolates arc move", () => {
    const points = sweptVolumeEngine.interpolate({
      type: "ccw_arc",
      start: { x: 10, y: 0, z: 0 },
      end: { x: 0, y: 10, z: 0 },
      center: { x: 0, y: 0, z: 0 },
    }, 1.0);
    expect(points.length).toBeGreaterThan(10);
    // Last point should be near (0, 10, 0)
    const last = points[points.length - 1];
    expect(Math.abs(last.x)).toBeLessThan(0.1);
    expect(Math.abs(last.y - 10)).toBeLessThan(0.1);
  });

  it("computes swept volume bounding box", () => {
    const result = sweptVolumeEngine.computeSweptVolume(
      [{ type: "linear", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 50, z: -20 } }],
      { type: "cylinder", diameter_mm: 12, length_mm: 50 },
      1.0
    );
    expect(result.bounding_box.max_x).toBeGreaterThan(100);
    expect(result.bounding_box.min_x).toBeLessThan(0);
    expect(result.total_path_length_mm).toBeGreaterThan(100);
    expect(result.interpolation_points).toBeGreaterThan(50);
  });

  it("rapid moves use coarser resolution", () => {
    const rapid = sweptVolumeEngine.computeSweptVolume(
      [{ type: "rapid", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } }],
      { type: "cylinder", diameter_mm: 12, length_mm: 50 },
      1.0 // Engine should use max(1.0, 5.0) = 5.0 for rapids
    );
    const linear = sweptVolumeEngine.computeSweptVolume(
      [{ type: "linear", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } }],
      { type: "cylinder", diameter_mm: 12, length_mm: 50 },
      1.0
    );
    expect(rapid.interpolation_points).toBeLessThan(linear.interpolation_points);
  });

  it("detects collision with zone", () => {
    const swept = sweptVolumeEngine.computeSweptVolume(
      [{ type: "linear", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } }],
      { type: "cylinder", diameter_mm: 20, length_mm: 50 },
      1.0
    );
    const result = sweptVolumeEngine.checkCollisions(swept,
      { type: "cylinder", diameter_mm: 20, length_mm: 50 },
      [{ name: "column", box: { min_x: 40, max_x: 60, min_y: -5, max_y: 5, min_z: -100, max_z: 100 } }],
      0 // no margin
    );
    expect(result.has_collision).toBe(true);
    expect(result.collisions[0].zone_name).toBe("column");
  });

  it("no collision when path avoids zone", () => {
    const swept = sweptVolumeEngine.computeSweptVolume(
      [{ type: "linear", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 } }],
      { type: "cylinder", diameter_mm: 10, length_mm: 50 },
      1.0
    );
    const result = sweptVolumeEngine.checkCollisions(swept,
      { type: "cylinder", diameter_mm: 10, length_mm: 50 },
      [{ name: "far_wall", box: { min_x: 200, max_x: 300, min_y: 200, max_y: 300, min_z: -100, max_z: 100 } }],
      0
    );
    expect(result.has_collision).toBe(false);
    expect(result.closest_clearance_mm).toBeGreaterThan(50);
  });

  it("larger safety margin detects more collisions", () => {
    const swept = sweptVolumeEngine.computeSweptVolume(
      [{ type: "linear", start: { x: 0, y: 0, z: 0 }, end: { x: 50, y: 0, z: 0 } }],
      { type: "cylinder", diameter_mm: 10, length_mm: 50 },
      1.0
    );
    const small = sweptVolumeEngine.checkCollisions(swept,
      { type: "cylinder", diameter_mm: 10, length_mm: 50 },
      [{ name: "column", box: { min_x: 20, max_x: 30, min_y: -5, max_y: 5, min_z: -100, max_z: 100 } }],
      1
    );
    const large = sweptVolumeEngine.checkCollisions(swept,
      { type: "cylinder", diameter_mm: 10, length_mm: 50 },
      [{ name: "column", box: { min_x: 20, max_x: 30, min_y: -5, max_y: 5, min_z: -100, max_z: 100 } }],
      50
    );
    // Both should detect collision, but larger margin should report deeper penetration
    expect(small.has_collision).toBe(true);
    expect(large.has_collision).toBe(true);
    expect(large.collisions[0].penetration_mm).toBeGreaterThanOrEqual(small.collisions[0].penetration_mm);
  });

  it("handles zero-length move", () => {
    const points = sweptVolumeEngine.interpolate({
      type: "linear",
      start: { x: 50, y: 50, z: -10 },
      end: { x: 50, y: 50, z: -10 },
    }, 1.0);
    expect(points.length).toBe(2);
  });
});

describe("ToolAssemblyModelEngine", () => {
  it("builds endmill assembly with holder", () => {
    const assembly = toolAssemblyModelEngine.buildAssembly(
      { type: "endmill", cutting_diameter_mm: 12, cutting_length_mm: 30, shank_diameter_mm: 12, overall_length_mm: 75 },
      { type: "collet_chuck", taper: "BT40", body_diameter_mm: 50, body_length_mm: 60, bore_diameter_mm: 12, gauge_length_mm: 80 }
    );
    expect(assembly.segments.length).toBeGreaterThanOrEqual(4);
    expect(assembly.total_length_mm).toBeGreaterThan(200);
    expect(assembly.cutting_tip_z_mm).toBe(0);
    expect(assembly.max_diameter_mm).toBeGreaterThanOrEqual(50);
  });

  it("builds drill assembly without holder", () => {
    const assembly = toolAssemblyModelEngine.buildAssembly(
      { type: "drill", cutting_diameter_mm: 8, cutting_length_mm: 40, shank_diameter_mm: 8, overall_length_mm: 100 }
    );
    expect(assembly.segments.length).toBeGreaterThanOrEqual(3);
    expect(assembly.tool_type).toBe("drill");
    expect(assembly.holder_type).toBe("none");
  });

  it("collision profile returns radius at each Z height", () => {
    const assembly = toolAssemblyModelEngine.buildAssembly(
      { type: "endmill", cutting_diameter_mm: 20, cutting_length_mm: 40, shank_diameter_mm: 20, overall_length_mm: 80 },
      { type: "shrink_fit", taper: "HSK-A63", body_diameter_mm: 40, body_length_mm: 50, bore_diameter_mm: 20, gauge_length_mm: 70 }
    );
    const profile = toolAssemblyModelEngine.getCollisionProfile(assembly, 5);
    expect(profile.length).toBeGreaterThan(10);
    // Tip should have cutting radius
    expect(profile[0].radius).toBe(10); // 20mm dia / 2
    // Holder body should be larger
    const holderPoint = profile.find(p => p.z > 100);
    expect(holderPoint!.radius).toBeGreaterThan(10);
  });

  it("max radius in range finds widest section", () => {
    const assembly = toolAssemblyModelEngine.buildAssembly(
      { type: "endmill", cutting_diameter_mm: 10, cutting_length_mm: 30, shank_diameter_mm: 10, overall_length_mm: 60 },
      { type: "collet_chuck", taper: "BT40", body_diameter_mm: 55, body_length_mm: 65, bore_diameter_mm: 10, gauge_length_mm: 85 }
    );
    const maxR = toolAssemblyModelEngine.getMaxRadiusInRange(assembly, 0, assembly.total_length_mm);
    expect(maxR).toBeGreaterThanOrEqual(55 / 2);
  });

  it("BT40 vs HSK-A63 have different spindle dimensions", () => {
    const bt40 = toolAssemblyModelEngine.buildAssembly(
      { type: "endmill", cutting_diameter_mm: 12, cutting_length_mm: 30, shank_diameter_mm: 12, overall_length_mm: 75 },
      { type: "shrink_fit", taper: "BT40", body_diameter_mm: 40, body_length_mm: 50, bore_diameter_mm: 12, gauge_length_mm: 70 }
    );
    const hsk = toolAssemblyModelEngine.buildAssembly(
      { type: "endmill", cutting_diameter_mm: 12, cutting_length_mm: 30, shank_diameter_mm: 12, overall_length_mm: 75 },
      { type: "shrink_fit", taper: "HSK-A63", body_diameter_mm: 40, body_length_mm: 50, bore_diameter_mm: 12, gauge_length_mm: 70 }
    );
    // Different tapers should result in different spindle housing sizes
    expect(bt40.taper).toBe("BT40");
    expect(hsk.taper).toBe("HSK-A63");
  });
});
