/**
 * HM-KC-MS3 U-HKC19: 3D Core Cycle Parameter Schemas — Tests
 *
 * Validates schema map completeness, parameter counts, DFM-critical metadata,
 * AC Python setter naming, and Zod range validation for all 4 3D cycle families.
 */

import { describe, it, expect } from "vitest";
import {
  THREE_D_CORE_SCHEMA_MAP,
  THREE_D_CORE_METADATA,
  THREE_D_CORE_TOTAL_PARAM_COUNT,
  zLevelSchema,
  parallelSchema,
  scallopSchema,
  pencilSchema,
} from "../schemas/hypermill/cam/threeDCoreSchemas.js";
import type { ThreeDCoreMeta, ThreeDCoreType } from "../schemas/hypermill/cam/threeDCoreSchemas.js";

describe("HM-KC-MS3 U-HKC19: 3D Core Cycle Parameter Schemas", () => {
  // ── Schema Map ──────────────────────────────────────────────────────────

  it("schema map contains exactly 4 cycle types", () => {
    const keys = Object.keys(THREE_D_CORE_SCHEMA_MAP);
    expect(keys).toHaveLength(4);
    expect(keys).toContain("z_level");
    expect(keys).toContain("parallel");
    expect(keys).toContain("scallop");
    expect(keys).toContain("pencil");
  });

  // ── Total Param Count ───────────────────────────────────────────────────

  it("total parameter count across all cycles is >= 200", () => {
    expect(THREE_D_CORE_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(200);
    // Exact expected: 65 + 55 + 45 + 35 = 200
    expect(THREE_D_CORE_TOTAL_PARAM_COUNT).toBe(200);
  });

  // ── Z-Level stepdown range validation ───────────────────────────────────

  it("z_level stepdown validates range 0.01..100", () => {
    const validBase = {
      spindle_speed: 8000,
      feed_rate: 3000,
      plunge_feed: 1000,
      finishing_feed: 2000,
      coolant_mode: "flood" as const,
      surface_tolerance: 0.01,
      clearance_plane: 50,
      retract_height: 5,
      feed_height: 2,
      top_surface: 0,
      bottom_surface: -30,
      boundary_mode: "silhouette" as const,
      boundary_offset: 1,
      tool_comp: "computer" as const,
      comp_direction: "left" as const,
      rest_source: "from_previous" as const,
      // Z-level specific required fields
      stepdown: 0.5,
      stepdown_mode: "constant" as const,
      wall_finish_allowance: 0.05,
      floor_finish_allowance: 0.05,
      direction: "climb" as const,
      corner_radius: 0.5,
      area_selection: "all" as const,
      helix_diameter_pct: 50,
      ramp_angle: 5,
      slice_overlap: 1,
      merge_tolerance: 0.01,
      link_type: "retract" as const,
      link_height: 5,
      link_max_distance: 50,
      approach_type: "tangent" as const,
      approach_distance: 3,
      retract_type: "tangent" as const,
      retract_distance: 3,
      open_contour_extension: 2,
      min_contour_length: 1,
      roughing_stepover: 5,
      island_offset: 2,
      smoothing_tolerance: 0.01,
      arc_fitting_tolerance: 0.01,
      trochoidal_stepover: 1,
      trochoidal_diameter: 10,
    };

    // Valid stepdown = 0.5
    const validResult = zLevelSchema.safeParse(validBase);
    expect(validResult.success).toBe(true);

    // Below minimum: 0.005 < 0.01
    const tooSmall = zLevelSchema.safeParse({ ...validBase, stepdown: 0.005 });
    expect(tooSmall.success).toBe(false);

    // Above maximum: 150 > 100
    const tooLarge = zLevelSchema.safeParse({ ...validBase, stepdown: 150 });
    expect(tooLarge.success).toBe(false);
  });

  // ── Parallel stepover requires value ────────────────────────────────────

  it("parallel stepover is required (no default)", () => {
    const shape = parallelSchema.shape;
    // stepover should not have a default — it's required
    expect(shape.stepover).toBeDefined();

    // Parse without stepover should fail
    const result = parallelSchema.safeParse({
      spindle_speed: 10000,
      feed_rate: 5000,
      plunge_feed: 1500,
      finishing_feed: 4000,
      coolant_mode: "mist",
      surface_tolerance: 0.005,
      clearance_plane: 50,
      retract_height: 5,
      feed_height: 2,
      top_surface: 0,
      bottom_surface: -20,
      boundary_mode: "silhouette",
      boundary_offset: 0.5,
      tool_comp: "computer",
      comp_direction: "left",
      rest_source: "from_previous",
      // Missing stepover intentionally
      stepover_mode: "constant",
      angle_mode: "fixed",
      overlap_distance: 2,
      path_extension: 3,
      link_type: "retract",
      link_height: 5,
      cusp_height: 0.01,
      scallop_height_target: 0.01,
      approach_type: "tangent",
      approach_distance: 3,
      retract_type_pass: "tangent",
      retract_distance: 3,
      second_cutting_angle: 90,
      path_sorting: "optimized",
      max_pass_length: 500,
      min_pass_length: 1,
      smoothing_tolerance: 0.01,
      rest_roughing_tool_dia: 20,
      lead_in_angle: 15,
      lead_out_angle: 15,
    });
    expect(result.success).toBe(false);
  });

  // ── Scallop cusp_height_target range ────────────────────────────────────

  it("scallop cusp_height_target validates range 0.001..0.5", () => {
    const baseScallop = {
      spindle_speed: 12000,
      feed_rate: 4000,
      plunge_feed: 1200,
      finishing_feed: 3500,
      coolant_mode: "through_tool" as const,
      surface_tolerance: 0.005,
      clearance_plane: 50,
      retract_height: 5,
      feed_height: 2,
      top_surface: 0,
      bottom_surface: -25,
      boundary_mode: "silhouette" as const,
      boundary_offset: 0.5,
      tool_comp: "computer" as const,
      comp_direction: "left" as const,
      rest_source: "ipw" as const,
      // Scallop specific
      cusp_height_target: 0.01,
      cusp_mode: "constant" as const,
      min_stepover: 0.1,
      max_stepover: 10,
      curvature_factor: 1,
      spiral_start: "center" as const,
      overlap_pct: 10,
      smoothing_tolerance: 0.01,
      steep_limit: 75,
      shallow_limit: 10,
      link_type: "retract" as const,
      link_height: 5,
      approach_type: "tangent" as const,
      retract_type: "tangent" as const,
      approach_distance: 3,
      retract_distance: 3,
      offset_mode: "from_surface" as const,
    };

    // Valid
    const valid = scallopSchema.safeParse(baseScallop);
    expect(valid.success).toBe(true);

    // Too small: 0.0001 < 0.001
    const tooSmall = scallopSchema.safeParse({ ...baseScallop, cusp_height_target: 0.0001 });
    expect(tooSmall.success).toBe(false);

    // Too large: 0.8 > 0.5
    const tooLarge = scallopSchema.safeParse({ ...baseScallop, cusp_height_target: 0.8 });
    expect(tooLarge.success).toBe(false);
  });

  // ── All setters contain "hm.3d." ────────────────────────────────────────

  it("all AC Python setters contain 'hm.3d.'", () => {
    const types = Object.keys(THREE_D_CORE_METADATA) as ThreeDCoreType[];
    expect(types.length).toBe(4);

    for (const type of types) {
      const meta = THREE_D_CORE_METADATA[type];
      expect(meta.acPythonSetter).toContain("hm.3d.");
      expect(meta.acPythonSetter).toBe(`hm.3d.${type}`);
    }
  });

  // ── DFM-critical metadata ──────────────────────────────────────────────

  it("z_level has stepdown as DFM-critical", () => {
    const meta = THREE_D_CORE_METADATA.z_level;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("stepdown");
  });

  it("parallel has stepover as DFM-critical", () => {
    const meta = THREE_D_CORE_METADATA.parallel;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("stepover");
  });

  it("scallop has cusp_height_target as DFM-critical", () => {
    const meta = THREE_D_CORE_METADATA.scallop;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("cusp_height_target");
  });

  it("pencil has corner_radius_detect as DFM-critical", () => {
    const meta = THREE_D_CORE_METADATA.pencil;
    expect(meta.dfmCriticalParams).toBeDefined();
    expect(meta.dfmCriticalParams).toContain("corner_radius_detect");
  });

  // ── Individual param counts match metadata ─────────────────────────────

  it("metadata param counts are z_level=65, parallel=55, scallop=45, pencil=35", () => {
    expect(THREE_D_CORE_METADATA.z_level.paramCount).toBe(65);
    expect(THREE_D_CORE_METADATA.parallel.paramCount).toBe(55);
    expect(THREE_D_CORE_METADATA.scallop.paramCount).toBe(45);
    expect(THREE_D_CORE_METADATA.pencil.paramCount).toBe(35);
  });
});
