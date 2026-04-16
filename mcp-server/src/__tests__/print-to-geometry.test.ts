import { describe, it, expect } from "vitest";
import { PrintToGeometryEngine } from "../engines/PrintToGeometryEngine.js";
import type { BlueprintAnalysis } from "../engines/PrintToGeometryEngine.js";

describe("PrintToGeometryEngine", () => {
  const engine = new PrintToGeometryEngine();

  it("generates CadQuery script for simple plate with holes", () => {
    const input: BlueprintAnalysis = {
      part_name: "Mounting Plate",
      material: "6061-T6 Aluminum",
      units: "mm",
      overall_dimensions: { length: 100, width: 80, height: 10 },
      part_type: "prismatic",
      features: [
        { type: "hole", dimensions: { diameter_mm: 6.35 }, position: { x: 15, y: 15 }, count: 4, pattern: "rectangular", pattern_spacing: 70 },
        { type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 5 }, position: { x: 0, y: 0 } },
        { type: "chamfer", dimensions: { size_mm: 1 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("cq.Workplane");
    expect(r.value.cadquery_script).toContain("box(100.00, 80.00, 10.00)");
    expect(r.value.cadquery_script).toContain("hole(6.35");
    expect(r.value.cadquery_script).toContain("cutBlind(-5.00)");
    expect(r.value.cadquery_script).toContain("chamfer(1.00)");
    expect(r.value.features_modeled).toBe(3);
    expect(r.value.features_skipped).toHaveLength(0);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("generates cylindrical part (shaft)", () => {
    const input: BlueprintAnalysis = {
      part_name: "Drive Shaft",
      material: "4140 Steel",
      units: "mm",
      overall_dimensions: { length: 150, width: 40, height: 40 },
      part_type: "cylindrical",
      outer_diameter: 40,
      features: [
        { type: "keyway", dimensions: { width_mm: 8, depth_mm: 4, length_mm: 30 }, position: { x: 0, y: 20 } },
        { type: "groove", dimensions: { width_mm: 3, depth_mm: 2, diameter_mm: 40 }, position: { x: 60, y: 0 } },
        { type: "thread", dimensions: { diameter_mm: 24, pitch_mm: 3, depth_mm: 20 }, position: { x: -60, y: 0 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("cylinder(150.00, 20.00)");
    expect(r.value.cadquery_script).toContain("keyway");
    expect(r.value.cadquery_script).toContain("M24");
    expect(r.value.features_modeled).toBe(3);
  });

  it("handles bracket with counterbore and step", () => {
    const input: BlueprintAnalysis = {
      part_name: "L-Bracket",
      material: "A36 Steel",
      units: "inch",
      overall_dimensions: { length: 4, width: 3, height: 0.5 },
      part_type: "prismatic",
      features: [
        { type: "counterbore", dimensions: { diameter_mm: 0.25, bore_diameter_mm: 0.5, bore_depth_mm: 0.15 }, position: { x: 0.5, y: 0.5 } },
        { type: "step", dimensions: { length_mm: 2, width_mm: 3, depth_mm: 0.25 }, position: { x: 1, y: 0 } },
      ],
    };
    const r = engine.convert(input);
    // Inch→mm conversion: 4" = 101.6mm
    expect(r.value.cadquery_script).toContain("box(101.60, 76.20, 12.70)");
    expect(r.value.cadquery_script).toContain("cboreHole");
    expect(r.value.bounding_box.x).toBeCloseTo(101.6, 1);
  });

  it("handles boss feature", () => {
    const input: BlueprintAnalysis = {
      units: "mm",
      overall_dimensions: { length: 60, width: 60, height: 8 },
      part_type: "prismatic",
      features: [
        { type: "boss", dimensions: { diameter_mm: 20, height_mm: 5 }, position: { x: 0, y: 0 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("circle(10.00)");
    expect(r.value.cadquery_script).toContain("extrude(5.00)");
    expect(r.value.features_modeled).toBe(1);
  });

  it("skips unsupported features gracefully", () => {
    const input: BlueprintAnalysis = {
      units: "mm",
      overall_dimensions: { length: 50, width: 50, height: 10 },
      part_type: "prismatic",
      features: [
        { type: "hole", dimensions: { diameter_mm: 5 } },
        { type: "face", dimensions: {} },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.features_modeled).toBe(2); // hole + face (face is no-op but counted)
    expect(r.value.estimated_mass_kg).toBeGreaterThan(0);
  });

  it("estimates mass for steel", () => {
    const input: BlueprintAnalysis = {
      material: "Steel",
      units: "mm",
      overall_dimensions: { length: 100, width: 100, height: 10 },
      part_type: "prismatic",
      features: [],
    };
    const r = engine.convert(input);
    // 100×100×10mm steel block = 100cm³ × 7.85g/cm³ = 785g = 0.785kg
    expect(r.value.estimated_mass_kg).toBeCloseTo(0.785, 2);
  });

  // ── Complex/Industry Feature Tests ──

  it("generates aerospace thin-wall pocket with rib and shell", () => {
    const input: BlueprintAnalysis = {
      part_name: "Aerospace Bracket",
      material: "Ti-6Al-4V",
      units: "mm",
      overall_dimensions: { length: 120, width: 80, height: 25 },
      part_type: "prismatic",
      features: [
        { type: "thin_wall_pocket", dimensions: { length_mm: 60, width_mm: 40, depth_mm: 20, wall_thickness_mm: 1.2 } },
        { type: "lightening_pocket", dimensions: { length_mm: 30, width_mm: 25, depth_mm: 18, wall_thickness_mm: 1.5 }, position: { x: 30, y: 0 } },
        { type: "rib", dimensions: { length_mm: 80, height_mm: 20, thickness_mm: 2 }, position: { x: 0, y: 0 } },
        { type: "shell", dimensions: { wall_thickness_mm: 3 } },
        { type: "chamfer", dimensions: { size_mm: 0.5 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("thin_wall_pocket");
    expect(r.value.cadquery_script).toContain("wall=1.20mm");
    expect(r.value.cadquery_script).toContain("rib:");
    expect(r.value.cadquery_script).toContain("shell(-3.00)");
    expect(r.value.features_modeled).toBe(5);
  });

  it("generates mold features (draft, ejector, cooling, parting line)", () => {
    const input: BlueprintAnalysis = {
      part_name: "Injection Mold Core",
      material: "H13 Tool Steel",
      units: "mm",
      overall_dimensions: { length: 200, width: 150, height: 80 },
      part_type: "prismatic",
      features: [
        { type: "draft", dimensions: { draft_angle_deg: 3 } },
        { type: "ejector_pin_hole", dimensions: { diameter_mm: 6, depth_mm: 50 }, count: 4, pattern: "rectangular", pattern_spacing: 60 },
        { type: "cooling_channel", dimensions: { diameter_mm: 10, depth_mm: 60 }, position: { x: 40, y: 30 } },
        { type: "parting_line_step", dimensions: { depth_mm: 0.3 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("Draft angle: 3.0");
    expect(r.value.cadquery_script).toContain("Ejector pin");
    expect(r.value.cadquery_script).toContain("cooling_channel");
    expect(r.value.cadquery_script).toContain("Parting line");
    expect(r.value.features_modeled).toBe(4);
  });

  it("generates automotive/engine features (valve seat, oil passage, taper, bore)", () => {
    const input: BlueprintAnalysis = {
      part_name: "Cylinder Head",
      material: "A356 Aluminum",
      units: "mm",
      overall_dimensions: { length: 300, width: 200, height: 100 },
      part_type: "prismatic",
      features: [
        { type: "valve_seat", dimensions: { diameter_mm: 34, width_mm: 2.5 }, position: { x: 50, y: 50 } },
        { type: "oil_passage", dimensions: { diameter_mm: 4, length_mm: 80 }, position: { x: -50, y: 0 } },
        { type: "bore_internal", dimensions: { diameter_mm: 82, depth_mm: 60 }, position: { x: 0, y: 0 } },
        { type: "taper", dimensions: { taper_angle_deg: 7, length_mm: 25, diameter_start_mm: 30 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("Valve seat");
    expect(r.value.cadquery_script).toContain("oil_passage");
    expect(r.value.cadquery_script).toContain("Internal bore");
    expect(r.value.cadquery_script).toContain("Taper:");
    expect(r.value.features_modeled).toBe(4);
  });

  it("generates complex geometry (loft, sweep, revolve, helix, mirror)", () => {
    const input: BlueprintAnalysis = {
      units: "mm",
      overall_dimensions: { length: 80, width: 60, height: 40 },
      part_type: "prismatic",
      features: [
        { type: "loft", dimensions: { bottom_width_mm: 40, top_width_mm: 20, height_mm: 30 } },
        { type: "sweep", dimensions: { radius_mm: 4, path_radius_mm: 25 } },
        { type: "revolve", dimensions: { width_mm: 8, height_mm: 15, angle_deg: 180 } },
        { type: "helix", dimensions: { radius_mm: 10, pitch_mm: 4, height_mm: 20 } },
        { type: "mirror", dimensions: {} },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("Loft:");
    expect(r.value.cadquery_script).toContain(".loft()");
    expect(r.value.cadquery_script).toContain("Sweep:");
    expect(r.value.cadquery_script).toContain(".sweep(");
    expect(r.value.cadquery_script).toContain("revolve(");
    expect(r.value.cadquery_script).toContain("makeHelix");
    expect(r.value.cadquery_script).toContain('mirror("YZ")');
    expect(r.value.features_modeled).toBe(5);
  });

  it("generates specialty features (dovetail, t-slot, o-ring, undercut, scallop)", () => {
    const input: BlueprintAnalysis = {
      units: "mm",
      overall_dimensions: { length: 100, width: 60, height: 20 },
      part_type: "prismatic",
      features: [
        { type: "dovetail", dimensions: { width_mm: 12, depth_mm: 6 } },
        { type: "t_slot", dimensions: { width_mm: 16, depth_mm: 12, neck_width_mm: 8 } },
        { type: "o_ring_groove", dimensions: { groove_id_mm: 40, width_mm: 3, depth_mm: 2 } },
        { type: "undercut", dimensions: { width_mm: 8, depth_mm: 4 } },
        { type: "scallop", dimensions: { radius_mm: 6 }, count: 8 },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("Dovetail:");
    expect(r.value.cadquery_script).toContain("T-slot:");
    expect(r.value.cadquery_script).toContain("O-ring groove");
    expect(r.value.cadquery_script).toContain("Undercut:");
    expect(r.value.cadquery_script).toContain("Scallop pattern");
    expect(r.value.features_modeled).toBe(5);
  });

  it("generates medical features (bone screw, micro-feature, spherical radius)", () => {
    const input: BlueprintAnalysis = {
      part_name: "Bone Plate",
      material: "Ti-6Al-4V ELI",
      units: "mm",
      overall_dimensions: { length: 50, width: 12, height: 3 },
      part_type: "prismatic",
      features: [
        { type: "bone_screw_thread", dimensions: { diameter_mm: 3.5, pitch_mm: 1.25, length_mm: 8 }, count: 4, pattern: "linear", pattern_spacing: 10 },
        { type: "micro_feature", dimensions: { size_mm: 0.3 }, position: { x: 0, y: 0 } },
        { type: "spherical_radius", dimensions: { radius_mm: 6 }, position: { x: 20, y: 0 } },
        { type: "compound_angle_face", dimensions: { angle_a_deg: 12, angle_b_deg: 5, depth_mm: 1.5 } },
      ],
    };
    const r = engine.convert(input);
    expect(r.value.cadquery_script).toContain("Bone screw");
    expect(r.value.cadquery_script).toContain("micro_feature");
    expect(r.value.cadquery_script).toContain("Spherical radius");
    expect(r.value.cadquery_script).toContain("Compound angle");
    expect(r.value.features_modeled).toBe(4);
  });
});
