import { describe, it, expect } from "vitest";
import { AdaptiveToolpathRouterEngine } from "../engines/AdaptiveToolpathRouterEngine.js";

const engine = new AdaptiveToolpathRouterEngine();

describe("AdaptiveToolpathRouterEngine", () => {
  it("routes pocket roughing in P20 steel to adaptive or TGAR", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "roughing",
      material_iso_group: "P",
      feature_depth_mm: 15,
      feature_width_mm: 50,
      tool_diameter_mm: 12,
      pocket_dims: { length_mm: 80, width_mm: 50, depth_mm: 15 },
    });

    expect(["cam_adaptive", "TGAR", "VCER", "MEGM"]).toContain(result.selected_algorithm);
    expect(result.toolpath_segments.length).toBeGreaterThan(5);
    expect(result.segment_count).toBe(result.toolpath_segments.length);
    expect(result.selection_reason.length).toBeGreaterThan(10);
  });

  it("routes hardened steel roughing to TGAR", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "roughing",
      material_iso_group: "H",
      material_hardness_hrc: 52,
      feature_depth_mm: 10,
      feature_width_mm: 40,
      tool_diameter_mm: 8,
      pocket_dims: { length_mm: 60, width_mm: 40, depth_mm: 10 },
    });

    expect(result.selected_algorithm).toBe("TGAR");
    expect(result.selection_reason).toMatch(/thermal|heat/i);
  });

  it("routes thin-wall finishing to HRAF", () => {
    const result = engine.route({
      feature_type: "thin_wall",
      operation: "finishing",
      material_iso_group: "P",
      wall_thickness_mm: 2,
      feature_depth_mm: 20,
      tool_diameter_mm: 6,
    });

    expect(result.selected_algorithm).toBe("HRAF");
    expect(result.selection_reason).toMatch(/vibration|harmonic/i);
  });

  it("routes deep cavity finishing to PTDC or HRAF", () => {
    const result = engine.route({
      feature_type: "deep_cavity",
      operation: "finishing",
      material_iso_group: "P",
      feature_depth_mm: 60,
      wall_thickness_mm: 20, // thick wall = no vibration concern
      tool_diameter_mm: 6,
      tool_length_mm: 80,
    });

    // PTDC for deflection or HRAF if vibration detected from L/D
    expect(["PTDC", "HRAF"]).toContain(result.selected_algorithm);
    expect(result.selection_reason).toMatch(/deflection|vibration|harmonic/i);
  });

  it("routes large hole in Inconel to helical milling", () => {
    const result = engine.route({
      feature_type: "through_hole",
      operation: "drilling",
      material_iso_group: "S",
      feature_diameter_mm: 25,
      feature_depth_mm: 15,
      tool_diameter_mm: 16,
    });

    expect(result.selected_algorithm).toBe("helical_drill");
    expect(result.toolpath_segments.length).toBeGreaterThan(3);
  });

  it("routes small hole in aluminum to canned drilling", () => {
    const result = engine.route({
      feature_type: "through_hole",
      operation: "drilling",
      material_iso_group: "N",
      feature_diameter_mm: 5,
      feature_depth_mm: 10,
      tool_diameter_mm: 5,
    });

    expect(result.selected_algorithm).toBe("cam_drill");
  });

  it("routes deep pocket with chip concern to VCER", () => {
    const result = engine.route({
      feature_type: "pocket_deep",
      operation: "roughing",
      material_iso_group: "P",
      feature_depth_mm: 60,
      feature_width_mm: 30,
      tool_diameter_mm: 10,
      pocket_dims: { length_mm: 50, width_mm: 30, depth_mm: 60 },
    });

    expect(result.selected_algorithm).toBe("VCER");
    expect(result.selection_reason).toMatch(/chip/i);
  });

  it("generates continuous XYZ toolpath segments", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "roughing",
      material_iso_group: "P",
      feature_depth_mm: 10,
      feature_width_mm: 40,
      tool_diameter_mm: 10,
      pocket_dims: { length_mm: 60, width_mm: 40, depth_mm: 10 },
    });

    // Every segment has x, y, z coordinates
    for (const seg of result.toolpath_segments) {
      expect(typeof seg.x).toBe("number");
      expect(typeof seg.y).toBe("number");
      expect(typeof seg.z).toBe("number");
      expect(seg.feed_mmmin).toBeGreaterThan(0);
      expect(seg.rpm).toBeGreaterThan(0);
      expect(["rapid", "feed", "arc_cw", "arc_ccw", "plunge", "retract"]).toContain(seg.type);
    }

    // Should start with rapid approach and end with retract
    expect(result.toolpath_segments[0].type).toBe("rapid");
    const last = result.toolpath_segments[result.toolpath_segments.length - 1];
    expect(last.type).toBe("retract");
    expect(last.z).toBeGreaterThan(0); // above workpiece
  });

  it("provides physics summary with reasonable values", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "roughing",
      material_iso_group: "P",
      feature_depth_mm: 15,
      tool_diameter_mm: 10,
      pocket_dims: { length_mm: 50, width_mm: 30, depth_mm: 15 },
    });

    expect(result.physics_summary.total_distance_mm).toBeGreaterThan(0);
    expect(result.physics_summary.max_feed_mmmin).toBeGreaterThan(0);
    expect(result.physics_summary.avg_feed_mmmin).toBeGreaterThan(0);
    expect(result.physics_summary.depth_passes).toBeGreaterThanOrEqual(1);
    expect(result.estimated_cycle_time_s).toBeGreaterThan(0);
  });

  it("provides alternatives when available", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "roughing",
      material_iso_group: "S",
      material_hardness_hrc: 35,
      feature_depth_mm: 30,
      tool_diameter_mm: 10,
      pocket_dims: { length_mm: 60, width_mm: 40, depth_mm: 30 },
    });

    // Superalloy pocket should match multiple rules
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0].algorithm).toBeDefined();
    expect(result.alternatives[0].reason.length).toBeGreaterThan(5);
  });

  it("warns on high L/D ratio", () => {
    const result = engine.route({
      feature_type: "pocket_rectangular",
      operation: "finishing",
      material_iso_group: "P",
      feature_depth_mm: 40,
      tool_diameter_mm: 6,
      tool_length_mm: 50,
    });

    expect(result.warnings.some((w) => /L\/D/i.test(w))).toBe(true);
  });

  it("lists all 34 available algorithms (6 novel + 12 ext + 6 cross-CAM + 10 standard)", () => {
    const algos = engine.listAlgorithms();
    expect(algos.length).toBeGreaterThanOrEqual(34);
    // Novel 6
    expect(algos.some((a) => a.id === "TGAR")).toBe(true);
    expect(algos.some((a) => a.id === "HRAF")).toBe(true);
    expect(algos.some((a) => a.id === "VCER")).toBe(true);
    // Extended 12
    expect(algos.some((a) => a.id === "RSMP")).toBe(true);
    expect(algos.some((a) => a.id === "WHAP")).toBe(true);
    expect(algos.some((a) => a.id === "BOPA")).toBe(true);
    expect(algos.some((a) => a.id === "DPLS")).toBe(true);
    // Cross-CAM 6
    expect(algos.some((a) => a.id === "AMEF")).toBe(true);
    expect(algos.some((a) => a.id === "MACS")).toBe(true);
    expect(algos.some((a) => a.id === "EAPR")).toBe(true);
    // Standard
    expect(algos.some((a) => a.id === "cam_adaptive")).toBe(true);
    expect(algos.some((a) => a.id === "helical_drill")).toBe(true);
  });

  it("routes aerospace structural finishing to RSMP or vibration-aware", () => {
    const result = engine.route({
      feature_type: "aerospace_structural",
      operation: "finishing",
      material_iso_group: "S",
      feature_depth_mm: 20,
      tool_diameter_mm: 10,
      tool_length_mm: 30, // short tool = no vibration concern
      wall_thickness_mm: 20, // thick wall
    });
    // RSMP for stress or HRAF if vibration detected
    expect(["RSMP", "HRAF", "PTDC"]).toContain(result.selected_algorithm);
  });

  it("routes sheet nesting to SNWF", () => {
    const result = engine.route({
      feature_type: "sheet_metal",
      operation: "roughing",
      material_iso_group: "P",
      feature_depth_mm: 3,
      tool_diameter_mm: 10,
    });
    expect(result.selected_algorithm).toBe("SNWF");
  });

  it("routes face milling correctly", () => {
    const result = engine.route({
      feature_type: "face",
      operation: "facing",
      material_iso_group: "K",
      feature_width_mm: 100,
      tool_diameter_mm: 50,
      pocket_dims: { length_mm: 150, width_mm: 100, depth_mm: 2 },
    });

    expect(result.selected_algorithm).toBe("cam_face");
    expect(result.toolpath_segments.length).toBeGreaterThan(2);
  });
});
