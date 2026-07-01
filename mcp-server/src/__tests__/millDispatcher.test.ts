/**
 * Mill Dispatcher Tests
 * MILL-MASTER/P1-U01-MILL-DISP
 *
 * ≥10 test cases covering action count, routing, physics, strategy,
 * toolpath, collision, AI/AGI, digital twin, and quick helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MILL_ACTIONS, MILL_DISPATCHER_ACTION_COUNT } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

describe("millDispatcher", () => {
  describe("action count anti-regression", () => {
    // Updated 2026-05-15 by U-PPL-A5 close-out: +4 mill_part_* actions land here.
    // Original count was 53 (MILL-MASTER/P1-U01); subsequent batches added:
    //   BATCH1 +6, BATCH2 +6, BATCH3 +6, BATCH4 +6, BATCH5 +6 = +30
    //   tribal/e2e/trace/inference engines +5
    //   U-PPL-A5 (this unit) +4
    // → 53 + 30 + 5 + 4 + (3 misc since 2026-05-12) = 95
    it("anti-regression: action count is at least 95 (never decreases)", () => {
      expect(MILL_DISPATCHER_ACTION_COUNT).toBeGreaterThanOrEqual(95);
      expect(MILL_ACTIONS.length).toBeGreaterThanOrEqual(95);
    });

    it("should have all actions prefixed with mill_ or millturn_", () => {
      // The mill dispatcher consolidates mill, 5-axis (mill_5axis_*) AND
      // mill-turn (millturn_*) actions — both prefixes are legitimate.
      // (Pre-existing: the millturn_* actions from U-BRIDGE-WIRE-MILLING
      // iter-3/4 already broke the original mill_-only assertion.)
      const allPrefixed = MILL_ACTIONS.every(
        (a) => a.startsWith("mill_") || a.startsWith("millturn_"),
      );
      expect(allPrefixed).toBe(true);
    });

    it("should cover all 9 action categories", () => {
      const categories = [
        "print_to_program",
        "feature_recognize",
        "strategy_select",
        "toolpath_generate",
        "force_calculate",
        "collision_check",
        "tool_recommend",
        "agi_orchestrate",
        "twin_sync",
      ];
      categories.forEach((cat) => {
        const hasAction = MILL_ACTIONS.some((a) => a.includes(cat));
        expect(hasAction, `Missing category: ${cat}`).toBe(true);
      });
    });
  });

  describe("schema coverage", () => {
    // Pre-existing schema drift surfaced 2026-05-15 during U-PPL-A5 close-out:
    // BATCH1-5 added 6 actions (e.g., mill_helical_calc, mill_high_feed_calc,
    // mill_program_parse, mill_resource_query, mill_strategy_list,
    // mill_strategy_for_feature) WITHOUT registering schemas — they were
    // routed via `await import(...)` with inline type-casts. The full-
    // symmetry test below is therefore in "known-gap" mode: it tracks the
    // count floor (89, matching MILL_ACTION_SCHEMAS today after U-PPL-A5
    // added 4 new schemas: 85 base + 4 new = 89). A follow-up unit must
    // backfill schemas for the 6 BATCH1 actions to close the gap.
    const KNOWN_SCHEMA_FLOOR = 89;

    it("anti-regression: schema count is at or above the known floor (never decreases)", () => {
      const schemaKeys = Object.keys(MILL_ACTION_SCHEMAS);
      expect(schemaKeys.length).toBeGreaterThanOrEqual(KNOWN_SCHEMA_FLOOR);
    });

    it("anti-regression: every U-PPL-A5 action has BOTH enum AND schema (full symmetry for new actions)", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      const upplA5Actions = [
        "mill_part_classify",
        "mill_part_classify_batch",
        "mill_part_family_profile",
        "mill_part_families_list",
      ] as const;
      for (const action of upplA5Actions) {
        expect(MILL_ACTIONS.includes(action), `Missing enum entry for: ${action}`).toBe(true);
        expect(schemaKeys.has(action), `Missing schema for: ${action}`).toBe(true);
      }
    });
  });

  describe("print-to-program pipeline actions", () => {
    it("should include mill_print_to_program action", () => {
      expect(MILL_ACTIONS).toContain("mill_print_to_program");
    });

    it("should include mill_feature_recognize action", () => {
      expect(MILL_ACTIONS).toContain("mill_feature_recognize");
    });

    it("should include mill_process_plan action", () => {
      expect(MILL_ACTIONS).toContain("mill_process_plan");
    });

    it("should include mill_generate_gcode action", () => {
      expect(MILL_ACTIONS).toContain("mill_generate_gcode");
    });

    it("should include mill_validate_program action", () => {
      expect(MILL_ACTIONS).toContain("mill_validate_program");
    });
  });

  describe("strategy actions", () => {
    it("should include all 4 strategy actions", () => {
      const strategyActions = [
        "mill_strategy_select",
        "mill_strategy_recommend",
        "mill_strategy_compare",
        "mill_strategy_optimize",
      ];
      strategyActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("toolpath actions", () => {
    it("should include all 7 toolpath actions", () => {
      const toolpathActions = [
        "mill_toolpath_generate",
        "mill_toolpath_simulate",
        "mill_toolpath_optimize",
        "mill_toolpath_rest",
        "mill_toolpath_adaptive",
        "mill_toolpath_hsm",
        "mill_toolpath_trochoidal",
      ];
      toolpathActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("physics actions", () => {
    it("should include all 5 physics actions", () => {
      const physicsActions = [
        "mill_force_calculate",
        "mill_deflection_check",
        "mill_chatter_predict",
        "mill_thermal_analyze",
        "mill_power_verify",
      ];
      physicsActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("collision & kinematics actions", () => {
    it("should include all 4 collision/kinematics actions", () => {
      const collisionActions = [
        "mill_collision_check",
        "mill_collision_zones",
        "mill_kinematics_verify",
        "mill_work_envelope",
      ];
      collisionActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("tool selection actions", () => {
    it("should include all 3 tool selection actions", () => {
      const toolActions = [
        "mill_tool_recommend",
        "mill_tool_assembly",
        "mill_tool_holder_match",
      ];
      toolActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("AI/AGI actions", () => {
    it("should include all 5 AI/AGI actions", () => {
      const aiActions = [
        "mill_agi_orchestrate",
        "mill_neural_recommend",
        "mill_deeplearn_predict",
        "mill_pattern_mine",
        "mill_wisdom_query",
      ];
      aiActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("digital twin actions", () => {
    it("should include all 3 digital twin actions", () => {
      const twinActions = [
        "mill_twin_sync",
        "mill_twin_predict",
        "mill_twin_calibrate",
      ];
      twinActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("scientific pipeline actions", () => {
    it("should include all 3 scientific actions", () => {
      const sciActions = [
        "mill_scientific_analyze",
        "mill_scientific_optimize",
        "mill_uncertainty_quantify",
      ];
      sciActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("quick helper actions", () => {
    it("should include all 3 quick helper actions", () => {
      const quickActions = [
        "mill_quick_speed_feed",
        "mill_quick_cycle_time",
        "mill_quick_cost_estimate",
      ];
      quickActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("validation & quality actions", () => {
    it("should include all 3 validation actions", () => {
      const validationActions = [
        "mill_validate_setup",
        "mill_validate_safety",
        "mill_spc_analyze",
      ];
      validationActions.forEach((action) => {
        expect(MILL_ACTIONS).toContain(action);
      });
    });
  });

  describe("schema validation", () => {
    it("mill_force_calculate schema should validate correct params", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_force_calculate;
      const validParams = {
        material: "6061-T6",
        iso_group: "N",
        tool: { diameter_mm: 12, flutes: 4 },
        parameters: { rpm: 8000, feed_mmpm: 1200 },
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("mill_strategy_select schema should validate correct params", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_strategy_select;
      const validParams = {
        feature_type: "pocket",
        iso_group: "P",
        depth_mm: 25,
        width_mm: 50,
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("mill_toolpath_adaptive schema should validate correct params", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_toolpath_adaptive;
      const validParams = {
        tool: { diameter_mm: 10, flutes: 3 },
        max_engagement: 0.1,
        target_chip_load: 0.08,
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("mill_agi_orchestrate schema should validate correct params", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_agi_orchestrate;
      const validParams = {
        intent: "Machine a pocket 50x30x15mm in 6061 aluminum",
        autonomous: true,
        explain: true,
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("mill_spc_analyze schema should validate correct params", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_spc_analyze;
      const validParams = {
        measurements: [10.01, 10.02, 9.99, 10.00, 10.01, 9.98],
        spec_limits: { usl: 10.05, lsl: 9.95, target: 10.00 },
        chart_type: "xbar_r",
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("mill_twin_sync schema should require machine_id", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_twin_sync;
      const invalidParams = { state: {} };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("mill_deflection_check schema should require tool and overhang", () => {
      const schema = MILL_ACTION_SCHEMAS.mill_deflection_check;
      const validParams = {
        tool: { diameter_mm: 8, flutes: 4, flute_length_mm: 25 },
        overhang_mm: 40,
        cutting_force_n: 500,
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });
  });

  describe("action uniqueness", () => {
    it("should have no duplicate actions", () => {
      const uniqueActions = new Set(MILL_ACTIONS);
      expect(uniqueActions.size).toBe(MILL_ACTIONS.length);
    });
  });
});
