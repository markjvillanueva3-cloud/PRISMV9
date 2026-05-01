/**
 * HM-KC-MS5 U-HKC30: Entry Method + Stay-Down / KeepDown Schema Tests
 *
 * Validates all entry method and stay-down/keepdown schemas for correct
 * parameter counts, defaults, ranges, DFM flags, enum values, and AC Python
 * setter namespaces.
 */

import { describe, it, expect } from "vitest";
import {
  rampEntrySchema,
  helicalEntrySchema,
  plungeEntrySchema,
  preDrillEntrySchema,
  tangentialEntrySchema,
  directEntrySchema,
  ENTRY_METHOD_SCHEMA_MAP,
  ENTRY_METHOD_METADATA,
  ENTRY_METHOD_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/linking/entryMethodSchemas.js";
import {
  stayDownBasicSchema,
  stayDownOptimizedSchema,
  keepDownModeSchema,
  collisionAvoidanceLinkingSchema,
  cycleTimeOptimizerSchema,
  STAY_DOWN_SCHEMA_MAP,
  STAY_DOWN_METADATA,
  STAY_DOWN_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/linking/stayDownSchemas.js";

// =============================================================================
// Entry Method Schemas
// =============================================================================

describe("Entry Method Schemas", () => {
  describe("schema map completeness", () => {
    it("contains exactly 6 entry method types", () => {
      const keys = Object.keys(ENTRY_METHOD_SCHEMA_MAP);
      expect(keys).toHaveLength(6);
      expect(keys).toContain("ramp");
      expect(keys).toContain("helical");
      expect(keys).toContain("plunge");
      expect(keys).toContain("pre_drill");
      expect(keys).toContain("tangential");
      expect(keys).toContain("direct");
    });

    it("has 37 total parameters across all entry schemas", () => {
      expect(ENTRY_METHOD_TOTAL_PARAM_COUNT).toBe(37);
    });
  });

  describe("rampEntrySchema", () => {
    it("validates ramp_angle range 0.5..45", () => {
      expect(() =>
        rampEntrySchema.parse({
          ramp_angle: 0.4,
          ramp_length: 20,
          ramp_direction: "zigzag",
          max_depth_per_ramp: 1,
          overlap: 0.5,
          ramp_feed: 200,
          center_or_edge: "center",
        })
      ).toThrow();

      expect(() =>
        rampEntrySchema.parse({
          ramp_angle: 46,
          ramp_length: 20,
          ramp_direction: "zigzag",
          max_depth_per_ramp: 1,
          overlap: 0.5,
          ramp_feed: 200,
          center_or_edge: "center",
        })
      ).toThrow();

      const valid = rampEntrySchema.parse({
        ramp_angle: 3,
        ramp_length: 20,
        ramp_direction: "zigzag",
        max_depth_per_ramp: 1,
        overlap: 0.5,
        ramp_feed: 200,
        center_or_edge: "center",
      });
      expect(valid.ramp_angle).toBe(3);
    });

    it("accepts all ramp_direction enum values", () => {
      for (const dir of ["along_cut", "zigzag", "one_way"] as const) {
        const result = rampEntrySchema.parse({
          ramp_angle: 5,
          ramp_length: 10,
          ramp_direction: dir,
          max_depth_per_ramp: 2,
          overlap: 0.5,
          ramp_feed: 300,
          center_or_edge: "edge",
        });
        expect(result.ramp_direction).toBe(dir);
      }
    });

    it("allows ramp_width as optional", () => {
      const withoutWidth = rampEntrySchema.parse({
        ramp_angle: 5,
        ramp_length: 10,
        ramp_direction: "zigzag",
        max_depth_per_ramp: 2,
        overlap: 0.5,
        ramp_feed: 300,
        center_or_edge: "center",
      });
      expect(withoutWidth.ramp_width).toBeUndefined();

      const withWidth = rampEntrySchema.parse({
        ramp_angle: 5,
        ramp_length: 10,
        ramp_direction: "zigzag",
        max_depth_per_ramp: 2,
        overlap: 0.5,
        ramp_feed: 300,
        ramp_width: 8,
        center_or_edge: "center",
      });
      expect(withWidth.ramp_width).toBe(8);
    });

    it("has ramp_angle as DFM-critical", () => {
      expect(ENTRY_METHOD_METADATA.ramp.dfmCriticalParams).toContain("ramp_angle");
    });
  });

  describe("helicalEntrySchema", () => {
    it("has helix_diameter as DFM-critical", () => {
      expect(ENTRY_METHOD_METADATA.helical.dfmCriticalParams).toContain("helix_diameter");
    });

    it("validates helix_angle range 0.5..15", () => {
      expect(() =>
        helicalEntrySchema.parse({
          helix_diameter: 10,
          helix_angle: 0.4,
          revolutions: 3,
          direction: "auto",
          center_offset: 0,
          plunge_per_rev: 0.5,
          min_helix_diameter: 3,
          variable_helix: false,
        })
      ).toThrow();

      expect(() =>
        helicalEntrySchema.parse({
          helix_diameter: 10,
          helix_angle: 16,
          revolutions: 3,
          direction: "auto",
          center_offset: 0,
          plunge_per_rev: 0.5,
          min_helix_diameter: 3,
          variable_helix: false,
        })
      ).toThrow();
    });

    it("validates revolutions range 0.5..20", () => {
      const valid = helicalEntrySchema.parse({
        helix_diameter: 10,
        helix_angle: 3,
        revolutions: 5,
        direction: "cw",
        center_offset: 0,
        plunge_per_rev: 0.5,
        min_helix_diameter: 3,
        variable_helix: false,
      });
      expect(valid.revolutions).toBe(5);

      expect(() =>
        helicalEntrySchema.parse({
          helix_diameter: 10,
          helix_angle: 3,
          revolutions: 0.3,
          direction: "cw",
          center_offset: 0,
          plunge_per_rev: 0.5,
          min_helix_diameter: 3,
          variable_helix: false,
        })
      ).toThrow();
    });

    it("accepts direction enum values cw/ccw/auto", () => {
      for (const dir of ["cw", "ccw", "auto"] as const) {
        const result = helicalEntrySchema.parse({
          helix_diameter: 10,
          helix_angle: 3,
          revolutions: 3,
          direction: dir,
          center_offset: 0,
          plunge_per_rev: 0.5,
          min_helix_diameter: 3,
          variable_helix: false,
        });
        expect(result.direction).toBe(dir);
      }
    });
  });

  describe("plungeEntrySchema", () => {
    it("has require_center_cutting as DFM-critical", () => {
      expect(ENTRY_METHOD_METADATA.plunge.dfmCriticalParams).toContain("require_center_cutting");
    });

    it("has plunge_feed as DFM-critical", () => {
      expect(ENTRY_METHOD_METADATA.plunge.dfmCriticalParams).toContain("plunge_feed");
    });

    it("parses valid plunge entry data", () => {
      const result = plungeEntrySchema.parse({
        plunge_feed: 100,
        require_center_cutting: true,
        retract_between: 2,
        plunge_depth: 5,
        overlap: 0.5,
        spiral_plunge: false,
      });
      expect(result.plunge_feed).toBe(100);
      expect(result.require_center_cutting).toBe(true);
      expect(result.spiral_plunge).toBe(false);
    });
  });

  describe("preDrillEntrySchema", () => {
    it("defaults approach_from_hole to true", () => {
      const result = preDrillEntrySchema.parse({
        pre_drill_diameter: 6,
        pre_drill_depth: 20,
        alignment_tolerance: 0.1,
        use_existing_hole: false,
      });
      expect(result.approach_from_hole).toBe(true);
    });

    it("allows pre_drill_tool as optional", () => {
      const result = preDrillEntrySchema.parse({
        pre_drill_diameter: 6,
        pre_drill_depth: 20,
        alignment_tolerance: 0.1,
        use_existing_hole: true,
      });
      expect(result.pre_drill_tool).toBeUndefined();
    });
  });

  describe("tangentialEntrySchema", () => {
    it("defaults smooth_transition to true and z_ramp to false", () => {
      const result = tangentialEntrySchema.parse({
        approach_radius: 10,
        approach_angle: 90,
        approach_feed: 500,
      });
      expect(result.smooth_transition).toBe(true);
      expect(result.z_ramp).toBe(false);
    });
  });

  describe("directEntrySchema", () => {
    it("defaults approach_clearance to 2, collision_check to true, decelerate_before_cut to true", () => {
      const result = directEntrySchema.parse({
        approach_feed: 1000,
      });
      expect(result.approach_clearance).toBe(2);
      expect(result.collision_check).toBe(true);
      expect(result.decelerate_before_cut).toBe(true);
    });
  });

  describe("AC Python setter namespaces", () => {
    it("all setters use hm.linking.entry.* namespace", () => {
      for (const [key, meta] of Object.entries(ENTRY_METHOD_METADATA)) {
        expect(meta.acPythonSetter).toBe(`hm.linking.entry.${key}`);
      }
    });
  });
});

// =============================================================================
// Stay-Down / KeepDown Schemas
// =============================================================================

describe("Stay-Down / KeepDown Schemas", () => {
  describe("schema map completeness", () => {
    it("contains exactly 5 stay-down profile types", () => {
      const keys = Object.keys(STAY_DOWN_SCHEMA_MAP);
      expect(keys).toHaveLength(5);
      expect(keys).toContain("basic");
      expect(keys).toContain("optimized");
      expect(keys).toContain("keepdown");
      expect(keys).toContain("collision_avoidance");
      expect(keys).toContain("cycle_time");
    });

    it("has 29 total parameters across all stay-down schemas", () => {
      expect(STAY_DOWN_TOTAL_PARAM_COUNT).toBe(29);
    });
  });

  describe("stayDownBasicSchema", () => {
    it("defaults enabled to false", () => {
      const result = stayDownBasicSchema.parse({
        max_distance: 500,
        gap_threshold: 5,
        min_cut_length: 2,
        link_feed: 1000,
        link_height: 1,
      });
      expect(result.enabled).toBe(false);
    });

    it("validates gap_threshold range 0.1..100", () => {
      expect(() =>
        stayDownBasicSchema.parse({
          enabled: true,
          max_distance: 500,
          gap_threshold: 0.05,
          min_cut_length: 2,
          link_feed: 1000,
          link_height: 1,
        })
      ).toThrow();

      expect(() =>
        stayDownBasicSchema.parse({
          enabled: true,
          max_distance: 500,
          gap_threshold: 101,
          min_cut_length: 2,
          link_feed: 1000,
          link_height: 1,
        })
      ).toThrow();

      const valid = stayDownBasicSchema.parse({
        max_distance: 500,
        gap_threshold: 5,
        min_cut_length: 2,
        link_feed: 1000,
        link_height: 1,
      });
      expect(valid.gap_threshold).toBe(5);
    });

    it("validates max_distance range 0..10000", () => {
      expect(() =>
        stayDownBasicSchema.parse({
          max_distance: -1,
          gap_threshold: 5,
          min_cut_length: 2,
          link_feed: 1000,
          link_height: 1,
        })
      ).toThrow();

      expect(() =>
        stayDownBasicSchema.parse({
          max_distance: 10001,
          gap_threshold: 5,
          min_cut_length: 2,
          link_feed: 1000,
          link_height: 1,
        })
      ).toThrow();
    });

    it("has gap_threshold as DFM-critical", () => {
      expect(STAY_DOWN_METADATA.basic.dfmCriticalParams).toContain("gap_threshold");
    });
  });

  describe("stayDownOptimizedSchema", () => {
    it("defaults time_vs_safety to 0.5 and avoid_thin_walls to true", () => {
      const result = stayDownOptimizedSchema.parse({
        optimization_level: "basic",
        min_wall_thickness: 1,
        retract_for_corners: true,
        corner_angle_threshold: 60,
        cycle_time_savings_pct: 15,
      });
      expect(result.time_vs_safety).toBe(0.5);
      expect(result.avoid_thin_walls).toBe(true);
    });

    it("accepts all optimization_level enum values", () => {
      for (const level of ["none", "basic", "aggressive"] as const) {
        const result = stayDownOptimizedSchema.parse({
          optimization_level: level,
          min_wall_thickness: 1,
          retract_for_corners: false,
          corner_angle_threshold: 90,
          cycle_time_savings_pct: 0,
        });
        expect(result.optimization_level).toBe(level);
      }
    });
  });

  describe("keepDownModeSchema", () => {
    it("defaults apply_to_finishing=false, apply_to_roughing=true, link_in_rapid=false", () => {
      const result = keepDownModeSchema.parse({
        keepdown_height: 2,
        keepdown_clearance: 1,
        keepdown_feed: 2000,
      });
      expect(result.apply_to_finishing).toBe(false);
      expect(result.apply_to_roughing).toBe(true);
      expect(result.link_in_rapid).toBe(false);
    });

    it("validates keepdown_height range 0..100", () => {
      expect(() =>
        keepDownModeSchema.parse({
          keepdown_height: 101,
          keepdown_clearance: 1,
          keepdown_feed: 2000,
        })
      ).toThrow();
    });
  });

  describe("collisionAvoidanceLinkingSchema", () => {
    it("validates fixture_clearance range 1..100", () => {
      expect(() =>
        collisionAvoidanceLinkingSchema.parse({
          fixture_clearance: 0.5,
          shank_clearance: 2,
        })
      ).toThrow();

      expect(() =>
        collisionAvoidanceLinkingSchema.parse({
          fixture_clearance: 101,
          shank_clearance: 2,
        })
      ).toThrow();

      const valid = collisionAvoidanceLinkingSchema.parse({
        fixture_clearance: 5,
        shank_clearance: 2,
      });
      expect(valid.fixture_clearance).toBe(5);
    });

    it("defaults clamp_avoidance=true, holder_check=true, simulation_verify=false", () => {
      const result = collisionAvoidanceLinkingSchema.parse({
        fixture_clearance: 5,
        shank_clearance: 2,
      });
      expect(result.clamp_avoidance).toBe(true);
      expect(result.holder_check).toBe(true);
      expect(result.simulation_verify).toBe(false);
    });

    it("has fixture_clearance as DFM-critical", () => {
      expect(STAY_DOWN_METADATA.collision_avoidance.dfmCriticalParams).toContain("fixture_clearance");
    });
  });

  describe("cycleTimeOptimizerSchema", () => {
    it("defaults all boolean optimizations to true", () => {
      const result = cycleTimeOptimizerSchema.parse({
        estimated_savings_pct: 12,
      });
      expect(result.optimize_retracts).toBe(true);
      expect(result.optimize_transitions).toBe(true);
      expect(result.merge_similar_heights).toBe(true);
      expect(result.rapid_traverse_optimization).toBe(true);
    });

    it("validates estimated_savings_pct range 0..100", () => {
      expect(() =>
        cycleTimeOptimizerSchema.parse({
          estimated_savings_pct: 101,
        })
      ).toThrow();
    });
  });

  describe("AC Python setter namespaces", () => {
    it("all setters use hm.linking.staydown.* namespace", () => {
      for (const [key, meta] of Object.entries(STAY_DOWN_METADATA)) {
        expect(meta.acPythonSetter).toBe(`hm.linking.staydown.${key}`);
      }
    });
  });
});
