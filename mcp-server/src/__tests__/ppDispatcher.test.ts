/**
 * PostProcessor Dispatcher Tests
 * ==============================
 * Tests for the prism_pp dispatcher covering all 89 actions across 16 categories.
 *
 * @module __tests__/ppDispatcher.test
 * @milestone PP-DISPATCHER, PP-WIRE-MS1, PP-TRIBAL-ACTIVATION, PP-WIRE-MS5-7
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Import the schemas for validation testing
import { PP_ACTION_SCHEMAS } from "../schemas/ppActionSchemas.js";

describe("ppDispatcher", () => {
  describe("Schema validation", () => {
    it("should have 89 action schemas defined", () => {
      const actionCount = Object.keys(PP_ACTION_SCHEMAS).length;
      expect(actionCount).toBe(89);
    });

    it("should have all generate actions", () => {
      const generateActions = [
        "pp_generate_gcode",
        "pp_generate_header",
        "pp_generate_safe_start",
        "pp_generate_tool_change",
        "pp_generate_canned_cycle",
        "pp_generate_subroutine",
      ];
      generateActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all analyze actions", () => {
      const analyzeActions = [
        "pp_analyze_cps",
        "pp_analyze_gcode",
        "pp_analyze_safety",
        "pp_analyze_optimization",
        "pp_analyze_controller_fit",
        "pp_analyze_complexity",
      ];
      analyzeActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all optimize actions", () => {
      const optimizeActions = [
        "pp_optimize_feed",
        "pp_optimize_motion",
        "pp_optimize_cycle_time",
        "pp_optimize_tool_life",
        "pp_optimize_surface_finish",
        "pp_optimize_energy",
      ];
      optimizeActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all validate actions", () => {
      const validateActions = [
        "pp_validate_program",
        "pp_validate_limits",
        "pp_validate_collisions",
        "pp_validate_forces",
        "pp_validate_thermal",
        "pp_validate_syntax",
      ];
      validateActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all physics actions", () => {
      const physicsActions = [
        "pp_physics_forces",
        "pp_physics_thermal",
        "pp_physics_deflection",
        "pp_physics_stability",
        "pp_physics_surface",
        "pp_physics_wear",
      ];
      physicsActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all neural actions", () => {
      const neuralActions = [
        "pp_neural_predict",
        "pp_neural_classify",
        "pp_neural_optimize",
        "pp_neural_anomaly",
        "pp_neural_learn",
      ];
      neuralActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all tribal actions", () => {
      const tribalActions = [
        "pp_tribal_query",
        "pp_tribal_apply",
        "pp_tribal_suggest",
        "pp_tribal_validate",
        "pp_tribal_contribute",
      ];
      tribalActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all controller actions", () => {
      const controllerActions = [
        "pp_controller_capabilities",
        "pp_controller_translate",
        "pp_controller_optimize",
        "pp_controller_validate",
        "pp_controller_recommend",
      ];
      controllerActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });

    it("should have all kinematics actions", () => {
      const kinematicsActions = [
        "pp_kinematics_analyze",
        "pp_kinematics_transform",
        "pp_kinematics_limits",
        "pp_kinematics_singularity",
        "pp_kinematics_optimize",
      ];
      kinematicsActions.forEach(action => {
        expect(PP_ACTION_SCHEMAS[action]).toBeDefined();
      });
    });
  });

  describe("Schema validation - pp_generate_tool_change", () => {
    it("should accept valid tool change params", () => {
      const schema = PP_ACTION_SCHEMAS.pp_generate_tool_change;
      const validParams = {
        toolNumber: 1,
        rpm: 10000,
        coolant: "flood",
        controller: "fanuc",
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should reject tool change without required toolNumber", () => {
      const schema = PP_ACTION_SCHEMAS.pp_generate_tool_change;
      const invalidParams = {
        rpm: 10000,
        coolant: "flood",
      };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("should reject invalid tool number", () => {
      const schema = PP_ACTION_SCHEMAS.pp_generate_tool_change;
      const invalidParams = {
        toolNumber: 0, // must be >= 1
        rpm: 10000,
      };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("Schema validation - pp_analyze_gcode", () => {
    it("should accept valid G-code analysis params", () => {
      const schema = PP_ACTION_SCHEMAS.pp_analyze_gcode;
      const validParams = {
        gcode: "G0 X0 Y0\nG1 Z-10 F100",
        controller: "fanuc",
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should reject empty G-code", () => {
      const schema = PP_ACTION_SCHEMAS.pp_analyze_gcode;
      const invalidParams = {
        gcode: "",
        controller: "fanuc",
      };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("Schema validation - pp_physics_forces", () => {
    it("should accept valid physics force params", () => {
      const schema = PP_ACTION_SCHEMAS.pp_physics_forces;
      const validParams = {
        depthOfCut: 2,
        feed: 0.1,
        cuttingSpeed: 150,
        material: { isoGroup: "P", kc1_1: 1800 },
        tool: { diameter: 10, approachAngle: 90 },
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should reject negative depth of cut", () => {
      const schema = PP_ACTION_SCHEMAS.pp_physics_forces;
      const invalidParams = {
        depthOfCut: -1,
        feed: 0.1,
        cuttingSpeed: 150,
      };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("Schema validation - pp_controller_capabilities", () => {
    it("should accept valid controller", () => {
      const schema = PP_ACTION_SCHEMAS.pp_controller_capabilities;
      const validParams = { controller: "fanuc" };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should reject invalid controller", () => {
      const schema = PP_ACTION_SCHEMAS.pp_controller_capabilities;
      const invalidParams = { controller: "invalid_controller" };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("Schema validation - pp_kinematics_transform", () => {
    it("should accept valid kinematics transform params", () => {
      const schema = PP_ACTION_SCHEMAS.pp_kinematics_transform;
      const validParams = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 20, z: -5, a: 45 },
        ],
        mode: "rtcp",
        toolLength: 100,
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should accept empty points array", () => {
      const schema = PP_ACTION_SCHEMAS.pp_kinematics_transform;
      const validParams = {
        points: [],
        mode: "tcpm",
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema validation - pp_tribal_contribute", () => {
    it("should accept valid tribal contribution", () => {
      const schema = PP_ACTION_SCHEMAS.pp_tribal_contribute;
      const validParams = {
        tip: "Always cancel cutter comp before tool change on Fanuc controllers",
        controller: "fanuc",
        category: "safety",
        source: "shop_floor_experience",
      };
      const result = schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it("should reject tip that is too short", () => {
      const schema = PP_ACTION_SCHEMAS.pp_tribal_contribute;
      const invalidParams = {
        tip: "Short", // less than 10 chars
        controller: "fanuc",
      };
      const result = schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe("Category coverage", () => {
    it("should have correct action prefix distribution", () => {
      const actions = Object.keys(PP_ACTION_SCHEMAS);

      const generateCount = actions.filter(a => a.startsWith("pp_generate_")).length;
      const analyzeCount = actions.filter(a => a.startsWith("pp_analyze_")).length;
      const optimizeCount = actions.filter(a => a.startsWith("pp_optimize_")).length;
      const validateCount = actions.filter(a => a.startsWith("pp_validate_")).length;
      const physicsCount = actions.filter(a => a.startsWith("pp_physics_")).length;
      const neuralCount = actions.filter(a => a.startsWith("pp_neural_")).length;
      const tribalCount = actions.filter(a => a.startsWith("pp_tribal_")).length;
      const controllerCount = actions.filter(a => a.startsWith("pp_controller_")).length;
      const kinematicsCount = actions.filter(a => a.startsWith("pp_kinematics_")).length;

      expect(generateCount).toBe(6);
      expect(analyzeCount).toBe(6);
      expect(optimizeCount).toBe(6);
      expect(validateCount).toBe(6);
      expect(physicsCount).toBe(6);
      expect(neuralCount).toBe(5);
      expect(tribalCount).toBe(10); // 5 original + 5 pp_tribal_active_*
      expect(controllerCount).toBe(5);
      expect(kinematicsCount).toBe(5);

      // Total for these 9 categories should be 55
      const total = generateCount + analyzeCount + optimizeCount + validateCount +
                   physicsCount + neuralCount + tribalCount + controllerCount + kinematicsCount;
      expect(total).toBe(55);
    });

    it("should have correct PP-WIRE-MS1 categories", () => {
      const actions = Object.keys(PP_ACTION_SCHEMAS);

      const strategyCount = actions.filter(a => a.startsWith("pp_strategy_")).length;
      const troubleshootCount = actions.filter(a => a.startsWith("pp_troubleshoot_")).length;
      const formulaCount = actions.filter(a => a.startsWith("pp_formula_")).length;
      const learningCount = actions.filter(a => a.startsWith("pp_learning_")).length;
      const graphCount = actions.filter(a => a.startsWith("pp_graph_")).length;

      expect(strategyCount).toBe(5);
      expect(troubleshootCount).toBe(4);
      expect(formulaCount).toBe(5);
      expect(learningCount).toBe(6);
      expect(graphCount).toBe(5);

      // Total PP-WIRE additions: 25
      const wireTotal = strategyCount + troubleshootCount + formulaCount + learningCount + graphCount;
      expect(wireTotal).toBe(25);
    });
  });
});
