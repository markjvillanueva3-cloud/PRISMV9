/**
 * HM-KC-MS5 Retract Policy + Transition Schema Tests
 *
 * Tests for U-HKC29 (Retract Policy Schemas) and Transition Schemas.
 * All tests validate specific values, ranges, and parsing behavior.
 *
 * @milestone HM-KC-MS5/U-HKC29
 */

import { describe, it, expect } from "vitest";
import {
  fullRetractSchema,
  minimalRetractSchema,
  noRetractSchema,
  clearancePlaneRetractSchema,
  conditionalRetractSchema,
  smartRetractSchema,
  RETRACT_SCHEMA_MAP,
  RETRACT_METADATA,
  RETRACT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/linking/retractSchemas.js";

import {
  directTransitionSchema,
  arcTransitionSchema,
  viaClearanceTransitionSchema,
  gapHandlingSchema,
  TRANSITION_SCHEMA_MAP,
  TRANSITION_METADATA,
  TRANSITION_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/linking/transitionSchemas.js";

// =============================================================================
// Retract Policy Schemas
// =============================================================================

describe("U-HKC29: Retract Policy Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 6 retract policy types", () => {
      expect(Object.keys(RETRACT_SCHEMA_MAP).length).toBe(6);
    });

    it("has metadata for all 6 policies", () => {
      expect(Object.keys(RETRACT_METADATA).length).toBe(6);
    });

    it("schema map keys match metadata keys", () => {
      const schemaKeys = Object.keys(RETRACT_SCHEMA_MAP).sort();
      const metaKeys = Object.keys(RETRACT_METADATA).sort();
      expect(schemaKeys).toEqual(metaKeys);
    });

    it("total param count is 29", () => {
      expect(RETRACT_TOTAL_PARAM_COUNT).toBe(29);
    });

    it("contains all expected policy names", () => {
      const expected = [
        "full_retract",
        "minimal_retract",
        "no_retract",
        "clearance_plane_retract",
        "conditional_retract",
        "smart_retract",
      ];
      for (const name of expected) {
        expect(RETRACT_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Full Retract schema", () => {
    it("parses valid input with defaults", () => {
      const result = fullRetractSchema.parse({
        retract_height: 50,
        retract_feed: 5000,
      });
      expect(result.retract_height).toBe(50);
      expect(result.rapid_retract).toBe(true);
      expect(result.orient_on_retract).toBe(false);
      expect(result.coolant_off_on_retract).toBe(false);
    });

    it("rejects negative retract_height", () => {
      expect(() =>
        fullRetractSchema.parse({ retract_height: -10, retract_feed: 5000 }),
      ).toThrow();
    });
  });

  describe("Minimal Retract schema", () => {
    it("enforces retract_distance range 0.5..100", () => {
      expect(() =>
        minimalRetractSchema.parse({
          retract_distance: 0.1,
          above_stock: 5,
        }),
      ).toThrow();
      expect(() =>
        minimalRetractSchema.parse({
          retract_distance: 150,
          above_stock: 5,
        }),
      ).toThrow();
    });

    it("applies defaults for retract_distance and safety_offset", () => {
      const result = minimalRetractSchema.parse({ above_stock: 3 });
      expect(result.retract_distance).toBe(2);
      expect(result.safety_offset).toBe(1);
      expect(result.collision_check).toBe(true);
    });

    it("has paramCount 5 in metadata", () => {
      expect(RETRACT_METADATA.minimal_retract.paramCount).toBe(5);
    });
  });

  describe("No Retract (Stay Down) schema", () => {
    it("parses valid stay-down config", () => {
      const result = noRetractSchema.parse({
        max_traverse_distance: 200,
        gap_threshold: 5,
        min_cut_length: 10,
        link_feed: 3000,
        collision_clearance: 2,
      });
      expect(result.gap_threshold).toBe(5);
      expect(result.link_feed).toBe(3000);
    });

    it("gap_threshold is DFM-critical in metadata", () => {
      expect(RETRACT_METADATA.no_retract.dfmCriticalParams).toContain("gap_threshold");
    });
  });

  describe("Clearance Plane Retract schema", () => {
    it("has 4 params per metadata", () => {
      expect(RETRACT_METADATA.clearance_plane_retract.paramCount).toBe(4);
    });

    it("defaults incremental to false", () => {
      const result = clearancePlaneRetractSchema.parse({
        clearance_z: 100,
        approach_clearance: 10,
      });
      expect(result.incremental).toBe(false);
      expect(result.rapid_from_clearance).toBe(true);
    });
  });

  describe("Conditional Retract schema", () => {
    it("defaults retract_on_tool_change and retract_on_operation_change to true", () => {
      const result = conditionalRetractSchema.parse({
        retract_if_gap_exceeds: 25,
        retract_if_depth_changes: true,
        retract_on_direction_change: false,
      });
      expect(result.retract_on_tool_change).toBe(true);
      expect(result.retract_on_operation_change).toBe(true);
    });
  });

  describe("Smart Retract schema", () => {
    it("optimization_mode accepts exactly fastest/safest/balanced", () => {
      for (const mode of ["fastest", "safest", "balanced"] as const) {
        const result = smartRetractSchema.parse({
          optimization_mode: mode,
          fixture_clearance: 10,
          max_link_height: 200,
        });
        expect(result.optimization_mode).toBe(mode);
      }
    });

    it("rejects invalid optimization_mode", () => {
      expect(() =>
        smartRetractSchema.parse({
          optimization_mode: "aggressive",
          fixture_clearance: 10,
          max_link_height: 200,
        }),
      ).toThrow();
    });

    it("defaults to balanced mode", () => {
      const result = smartRetractSchema.parse({
        fixture_clearance: 10,
        max_link_height: 200,
      });
      expect(result.optimization_mode).toBe("balanced");
      expect(result.avoid_fixtures).toBe(true);
      expect(result.estimate_time_savings).toBe(true);
    });
  });

  describe("All setters use correct namespace", () => {
    it("all AC Python setters start with hm.linking.retract.", () => {
      for (const [key, meta] of Object.entries(RETRACT_METADATA)) {
        expect(meta.acPythonSetter).toBe(`hm.linking.retract.${key}`);
      }
    });
  });
});

// =============================================================================
// Transition Schemas
// =============================================================================

describe("U-HKC29: Transition Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 4 transition types", () => {
      expect(Object.keys(TRANSITION_SCHEMA_MAP).length).toBe(4);
    });

    it("has metadata for all 4 transitions", () => {
      expect(Object.keys(TRANSITION_METADATA).length).toBe(4);
    });

    it("schema map keys match metadata keys", () => {
      const schemaKeys = Object.keys(TRANSITION_SCHEMA_MAP).sort();
      const metaKeys = Object.keys(TRANSITION_METADATA).sort();
      expect(schemaKeys).toEqual(metaKeys);
    });

    it("total param count is 18", () => {
      expect(TRANSITION_TOTAL_PARAM_COUNT).toBe(18);
    });

    it("contains all expected transition names", () => {
      const expected = ["direct", "arc", "via_clearance", "gap_handling"];
      for (const name of expected) {
        expect(TRANSITION_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Direct Transition schema", () => {
    it("feed_mode accepts rapid/cutting/reduced", () => {
      for (const mode of ["rapid", "cutting", "reduced"] as const) {
        const result = directTransitionSchema.parse({
          feed_mode: mode,
          max_direct_distance: 100,
        });
        expect(result.feed_mode).toBe(mode);
      }
    });

    it("defaults collision_check to true and abort_if_collision to true", () => {
      const result = directTransitionSchema.parse({
        feed_mode: "rapid",
        max_direct_distance: 50,
      });
      expect(result.collision_check).toBe(true);
      expect(result.abort_if_collision).toBe(true);
    });
  });

  describe("Arc Transition schema", () => {
    it("parses valid arc config with defaults", () => {
      const result = arcTransitionSchema.parse({
        arc_radius: 25,
        arc_plane: "auto",
      });
      expect(result.arc_radius).toBe(25);
      expect(result.tangent_entry).toBe(true);
      expect(result.tangent_exit).toBe(true);
      expect(result.arc_height).toBe(0);
    });

    it("rejects arc_radius below 0.1", () => {
      expect(() =>
        arcTransitionSchema.parse({ arc_radius: 0.05, arc_plane: "xy" }),
      ).toThrow();
    });

    it("arc_plane accepts xy/xz/yz/auto", () => {
      for (const plane of ["xy", "xz", "yz", "auto"] as const) {
        const result = arcTransitionSchema.parse({
          arc_radius: 10,
          arc_plane: plane,
        });
        expect(result.arc_plane).toBe(plane);
      }
    });
  });

  describe("Via Clearance Transition schema", () => {
    it("parses valid config", () => {
      const result = viaClearanceTransitionSchema.parse({
        clearance_height: 80,
        approach_feed: 3000,
        retract_feed: 5000,
      });
      expect(result.clearance_height).toBe(80);
      expect(result.optimize_path).toBe(true);
    });

    it("has paramCount 4 in metadata", () => {
      expect(TRANSITION_METADATA.via_clearance.paramCount).toBe(4);
    });
  });

  describe("Gap Handling schema", () => {
    it("gap_threshold validates range 0.1..100", () => {
      // Valid
      const result = gapHandlingSchema.parse({
        gap_action: "bridge",
        gap_threshold: 5,
        bridge_feed: 2000,
        min_bridge_length: 1,
        gap_detection_mode: "auto",
      });
      expect(result.gap_threshold).toBe(5);

      // Below min
      expect(() =>
        gapHandlingSchema.parse({
          gap_action: "bridge",
          gap_threshold: 0.05,
          bridge_feed: 2000,
          min_bridge_length: 1,
          gap_detection_mode: "auto",
        }),
      ).toThrow();

      // Above max
      expect(() =>
        gapHandlingSchema.parse({
          gap_action: "bridge",
          gap_threshold: 150,
          bridge_feed: 2000,
          min_bridge_length: 1,
          gap_detection_mode: "auto",
        }),
      ).toThrow();
    });

    it("gap_action accepts keep_contact/retract/skip/bridge", () => {
      for (const action of ["keep_contact", "retract", "skip", "bridge"] as const) {
        const result = gapHandlingSchema.parse({
          gap_action: action,
          gap_threshold: 10,
          bridge_feed: 2000,
          min_bridge_length: 1,
          gap_detection_mode: "auto",
        });
        expect(result.gap_action).toBe(action);
      }
    });

    it("gap_threshold is DFM-critical in metadata", () => {
      expect(TRANSITION_METADATA.gap_handling.dfmCriticalParams).toContain("gap_threshold");
    });
  });

  describe("All setters use correct namespace", () => {
    it("all AC Python setters start with hm.linking.transition.", () => {
      for (const [key, meta] of Object.entries(TRANSITION_METADATA)) {
        expect(meta.acPythonSetter).toBe(`hm.linking.transition.${key}`);
      }
    });
  });

  describe("Combined totals", () => {
    it("retract + transition = 29 + 18 = 47 total params", () => {
      expect(RETRACT_TOTAL_PARAM_COUNT + TRANSITION_TOTAL_PARAM_COUNT).toBe(47);
    });
  });
});
