/**
 * U-W100-34: Sodick C### and Makino HYPER-i condition code tests
 *
 * Validates proper generation of controller-specific technology codes
 * based on material, thickness, and pass type.
 */
import { describe, it, expect } from "vitest";

describe("U-W100-34: Sodick and Makino condition codes", () => {
  it("Sodick C### codes vary by material", async () => {
    const { edmPostProcessGCodeEngine } = await import("../engines/EDMPostProcessGCodeEngine.js");

    const steelResult = edmPostProcessGCodeEngine.generate_sodick({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "steel",
      thickness_mm: 25,
    });

    const carbideResult = edmPostProcessGCodeEngine.generate_sodick({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "carbide",
      thickness_mm: 25,
    });

    // Steel = material code 0, Carbide = material code 2
    expect(steelResult.gcode).toContain("C0");
    expect(carbideResult.gcode).toContain("C2");
    expect(steelResult.gcode).not.toContain("C2");
    expect(carbideResult.gcode).not.toContain("C0");
  });

  it("Sodick C### codes vary by thickness", async () => {
    const { edmPostProcessGCodeEngine } = await import("../engines/EDMPostProcessGCodeEngine.js");

    const thinResult = edmPostProcessGCodeEngine.generate_sodick({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "steel",
      thickness_mm: 5,  // < 10mm = thickness code 0
    });

    const thickResult = edmPostProcessGCodeEngine.generate_sodick({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "steel",
      thickness_mm: 80,  // 60-100mm = thickness code 3
    });

    // Thin (5mm) → C000, Thick (80mm) → C030
    expect(thinResult.gcode).toContain("C000");
    expect(thickResult.gcode).toContain("C030");
  });

  it("Makino HYPER-i codes vary by material", async () => {
    const { edmPostProcessGCodeEngine } = await import("../engines/EDMPostProcessGCodeEngine.js");

    const steelResult = edmPostProcessGCodeEngine.generate_makino({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "steel",
      thickness_mm: 25,
    });

    const titaniumResult = edmPostProcessGCodeEngine.generate_makino({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "titanium",
      thickness_mm: 25,
    });

    // Steel = H1xx, Titanium = H6xx
    expect(steelResult.gcode).toContain("H1");
    expect(titaniumResult.gcode).toContain("H6");
  });

  it("Makino includes HYPERCUT comments for finish passes", async () => {
    const { edmPostProcessGCodeEngine } = await import("../engines/EDMPostProcessGCodeEngine.js");

    const result = edmPostProcessGCodeEngine.generate_makino({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [
        { pass_number: 1, offset_mm: 0.15, technology_table: "E1234", wire_speed_m_min: 10, tension_N: 12, servo_voltage: 50, corner_strategy: "continuous" },
        { pass_number: 2, offset_mm: 0.05, technology_table: "E1234", wire_speed_m_min: 8, tension_N: 10, servo_voltage: 45, corner_strategy: "exact_stop" },
      ],
      wire_type: "brass 0.25mm",
      material: "steel",
      thickness_mm: 25,
    });

    expect(result.gcode).toContain("HYPERCUT");
    expect(result.gcode).toContain("HYPER-i");
  });

  it("condition codes include material name in comments", async () => {
    const { edmPostProcessGCodeEngine } = await import("../engines/EDMPostProcessGCodeEngine.js");

    const result = edmPostProcessGCodeEngine.generate_sodick({
      profiles: [{
        name: "test",
        contour_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        start_hole: { x: 5, y: 5 },
        approach: { type: "linear", length_mm: 2 },
        departure: { type: "linear", length_mm: 2 },
        profile_type: "external",
      }],
      passes: [{
        pass_number: 1,
        offset_mm: 0.15,
        technology_table: "E1234",
        wire_speed_m_min: 10,
        tension_N: 12,
        servo_voltage: 50,
        corner_strategy: "exact_stop",
      }],
      wire_type: "brass 0.25mm",
      material: "d2",
      thickness_mm: 40,
    });

    // Should include material and thickness in comment (case insensitive)
    expect(result.gcode.toLowerCase()).toContain("d2");
    expect(result.gcode).toContain("40mm");
  });
});
