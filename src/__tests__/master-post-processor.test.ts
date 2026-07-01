import { describe, it, expect } from "vitest";
import { masterPostProcessorEngine } from "../engines/MasterPostProcessorEngine.js";
import { postProcessorGeneratorEngine } from "../engines/PostProcessorGeneratorEngine.js";
import type { CamToolpathSegment, MasterPostConfig } from "../engines/MasterPostProcessorEngine.js";

describe("MasterPostProcessorEngine", () => {
  const basicSegment: CamToolpathSegment = {
    source_cam: "hypermill",
    intent: "rough_3d",
    moves: [
      { type: "rapid", x: 0, y: 0, z: 50 },
      { type: "rapid", x: 10, y: 10, z: 5 },
      { type: "feed", x: 10, y: 10, z: -5, feed: 1000 },
      { type: "feed", x: 50, y: 10, z: -5, feed: 2000 },
      { type: "feed", x: 50, y: 50, z: -5, feed: 2000 },
    ],
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    spindle_rpm: 8000,
    feed_rate_mmmin: 2000,
    coolant: "flood",
    work_offset: "G54",
    material_iso: "P",
  };

  const baseConfig: MasterPostConfig = {
    controller: "fanuc",
    program_number: 1001,
    safe_start_block: true,
    use_canned_cycles: true,
    line_numbers: false,
  };

  it("processes a single segment for Fanuc", () => {
    const result = masterPostProcessorEngine.process([basicSegment], baseConfig);
    expect(result.gcode).toContain("PRISM MasterPostProcessor");
    expect(result.gcode).toContain("G90");
    expect(result.segments_processed).toBe(1);
    expect(result.cam_sources_used).toContain("hypermill");
    expect(result.line_count).toBeGreaterThan(5);
  });

  it("processes for all 6 controllers", () => {
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const;
    for (const ctrl of controllers) {
      const result = masterPostProcessorEngine.process([basicSegment], { ...baseConfig, controller: ctrl });
      expect(result.gcode.length).toBeGreaterThan(50);
      expect(result.warnings).toBeDefined();
    }
  });

  it("handles mixed CAM sources", () => {
    const fusionSegment: CamToolpathSegment = {
      ...basicSegment,
      source_cam: "fusion360",
      intent: "finish_3d",
      tool_number: 2,
    };
    const result = masterPostProcessorEngine.process(
      [basicSegment, fusionSegment],
      baseConfig,
    );
    expect(result.segments_processed).toBe(2);
    expect(result.cam_sources_used).toContain("hypermill");
    expect(result.cam_sources_used).toContain("fusion360");
    expect(result.gcode).toContain("SEGMENT 1");
    expect(result.gcode).toContain("SEGMENT 2");
  });

  it("applies cross-CAM features", () => {
    const result = masterPostProcessorEngine.process([basicSegment], {
      ...baseConfig,
      enable_cross_cam_features: true,
      cross_cam_features: {
        solidcam_chip_thinning: true,
        hypermill_collision_check: true,
      },
    });
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
    expect(result.gcode).toContain("SOLIDCAM");
  });

  it("applies feed optimization", () => {
    const result = masterPostProcessorEngine.process([basicSegment], {
      ...baseConfig,
      enable_feed_optimization: true,
    });
    expect(result.feed_optimization_stats).toBeDefined();
    expect(result.enhancements_applied).toContain("feed_optimization");
  });

  it("adds line numbers when requested", () => {
    const result = masterPostProcessorEngine.process([basicSegment], {
      ...baseConfig,
      line_numbers: true,
    });
    expect(result.gcode).toMatch(/N10\s/);
    expect(result.gcode).toMatch(/N20\s/);
  });

  it("generates Heidenhain format", () => {
    const result = masterPostProcessorEngine.process([basicSegment], {
      ...baseConfig,
      controller: "heidenhain",
    });
    expect(result.gcode).toContain("BEGIN PGM");
    expect(result.gcode).toContain("END PGM");
    expect(result.gcode).toContain("TOOL CALL");
  });

  it("injects HSM smoothing", () => {
    const result = masterPostProcessorEngine.process([basicSegment], {
      ...baseConfig,
      controller: "haas",
      enable_hsm: true,
      smoothing_mode: "finish",
    });
    expect(result.gcode).toContain("G187");
    expect(result.machine_specific_features).toContain("HSM: G187");
  });

  it("handles TSC coolant override", () => {
    const tscSegment = { ...basicSegment, coolant: "tsc" as const };
    const result = masterPostProcessorEngine.process([tscSegment], {
      ...baseConfig,
      controller: "haas",
    });
    expect(result.gcode).toContain("M88");
  });

  it("compareControllers returns results for all 6", () => {
    const results = masterPostProcessorEngine.compareControllers(
      [basicSegment],
      baseConfig,
    );
    expect(results).toHaveLength(6);
    for (const r of results) {
      expect(r.result.gcode.length).toBeGreaterThan(0);
    }
  });

  it("getPostTemplates returns templates", () => {
    const templates = masterPostProcessorEngine.getPostTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(6);
    expect(templates.some(t => t.controller === "haas")).toBe(true);
    expect(templates.some(t => t.controller === "siemens")).toBe(true);
  });

  it("getMachineFeatures returns features for each controller", () => {
    const features = masterPostProcessorEngine.getMachineFeatures("haas");
    expect(features.hsm?.code).toBe("G187");
    expect(features.tsc?.on).toBe("M88");
    expect(features.fiveAxis?.tcp).toBe("G234");
  });

  it("listCrossCamFeatures returns 5 features", () => {
    const features = masterPostProcessorEngine.listCrossCamFeatures();
    expect(features).toHaveLength(5);
    expect(features.some(f => f.source_cam === "solidcam")).toBe(true);
    expect(features.some(f => f.source_cam === "hypermill")).toBe(true);
  });

  it("stats returns correct counts", () => {
    const s = masterPostProcessorEngine.stats();
    expect(s.controllers).toBe(6);
    expect(s.post_templates).toBeGreaterThanOrEqual(6);
    expect(s.cross_cam_features).toBe(5);
    expect(s.sub_engines).toBe(5);
  });
});

describe("PostProcessorGeneratorEngine", () => {
  it("generates a post for Haas UMC-750", () => {
    const post = postProcessorGeneratorEngine.generate({
      controller: "haas",
      manufacturer: "Haas",
      model: "UMC-750SS",
      axis_count: 5,
      taper: "CAT40",
      max_rpm: 15000,
      max_feed: 15000,
      tool_capacity: 40,
      has_tsc: true,
      has_probing: true,
      has_ssv: true,
      rotary: { primary: "A", secondary: "C", range: 120 },
    });

    expect(post.id).toBe("haas-umc-750ss-haas");
    expect(post.controller).toBe("haas");
    expect(post.safe_start).toContain("G90");
    expect(post.coolant_codes.tsc.on).toBe("M88");
    expect(post.five_axis_control?.tcp_on).toBe("G234");
    expect(post.hsm_control).toBeDefined();
    expect(post.ssv_control?.on).toBe("G10");
    expect(post.probing_cycles).toBeDefined();
    expect(post.feature_count).toBeGreaterThan(10);
    expect(post.warnings).toHaveLength(0);
  });

  it("generates for all 6 controllers", () => {
    const controllers = ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"] as const;
    for (const ctrl of controllers) {
      const post = postProcessorGeneratorEngine.generate({
        controller: ctrl,
        manufacturer: "Test",
        model: "TestMachine",
        axis_count: 3,
        taper: "CAT40",
        max_rpm: 10000,
        max_feed: 10000,
        tool_capacity: 20,
        has_tsc: false,
        has_probing: false,
      });
      expect(post.controller).toBe(ctrl);
      expect(post.safe_start.length).toBeGreaterThan(5);
      expect(post.canned_cycles.drill).toBeDefined();
    }
  });

  it("warns for 5-axis without rotary config", () => {
    const post = postProcessorGeneratorEngine.generate({
      controller: "fanuc",
      manufacturer: "Test",
      model: "5AX",
      axis_count: 5,
      taper: "HSK-A63",
      max_rpm: 20000,
      max_feed: 15000,
      tool_capacity: 60,
      has_tsc: true,
      has_probing: true,
    });
    expect(post.five_axis_control).toBeDefined();
    expect(post.warnings.some(w => w.includes("rotary"))).toBe(true);
  });

  it("compareControllers returns feature matrix", () => {
    const comparison = postProcessorGeneratorEngine.compareControllers();
    expect(comparison.controllers).toHaveLength(6);
    expect(comparison.features.length).toBeGreaterThan(5);
    expect(comparison.recommendations.length).toBeGreaterThan(0);
  });

  it("generates from template", () => {
    const post = postProcessorGeneratorEngine.generateFromTemplate("haas-umc-5ax");
    expect(post).not.toBeNull();
    expect(post!.controller).toBe("haas");
  });

  it("returns null for unknown template", () => {
    const post = postProcessorGeneratorEngine.generateFromTemplate("nonexistent");
    expect(post).toBeNull();
  });

  it("includes cross-CAM features when specified", () => {
    const post = postProcessorGeneratorEngine.generate({
      controller: "haas",
      manufacturer: "Haas",
      model: "UMC-500",
      axis_count: 5,
      taper: "CAT40",
      max_rpm: 15000,
      max_feed: 15000,
      tool_capacity: 40,
      has_tsc: true,
      has_probing: true,
      feature_sources: [
        { cam: "solidcam", features: ["chip_thinning", "iMachining"] },
        { cam: "hypermill", features: ["collision"] },
      ],
    });
    expect(post.cross_cam_features).toContain("solidcam:chip_thinning");
    expect(post.cross_cam_features).toContain("hypermill:collision");
    expect(post.master_config.cross_cam_features?.solidcam_chip_thinning).toBe(true);
    expect(post.master_config.cross_cam_features?.hypermill_collision_check).toBe(true);
  });

  it("stats returns correct counts", () => {
    const s = postProcessorGeneratorEngine.stats();
    expect(s.controllers).toBe(6);
    expect(s.canned_cycle_types).toBe(7);
    expect(s.feature_categories).toBe(11);
  });
});
