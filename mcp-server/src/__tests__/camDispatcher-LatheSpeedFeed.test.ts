/**
 * Integration tests for Lathe Speed/Feed Calculator dispatcher actions
 * LATHE-MASTER U-LTH10 — Phase P1 dispatcher wiring
 *
 * Actions: lathe_sf_calculate, lathe_sf_advise, lathe_sf_whatif,
 *          lathe_sf_cite_sources, lathe_sf_explain
 *
 * Exit conditions: 5 actions callable via MCP, Schemas pass, >=8 integration tests
 */
import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { LatheSpeedFeedCalculatorFacadeEngine } from "../engines/LatheSpeedFeedCalculatorFacadeEngine.js";
import { LatheSpeedFeedDeepLearningAdvisorEngine } from "../engines/LatheSpeedFeedDeepLearningAdvisorEngine.js";
import { LatheSpeedFeedReasoningBridgeEngine } from "../engines/LatheSpeedFeedReasoningBridgeEngine.js";
import { LatheSpeedFeedGuardHook } from "../hooks/LatheSpeedFeedGuardHook.js";
import { ACTION_LATHE_SF_SCHEMAS } from "../schemas/latheSpeedFeedActionSchemas.js";

describe("camDispatcher — Lathe Speed/Feed Actions", () => {
  describe("action registration", () => {
    it("includes lathe_sf_calculate in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_calculate");
    });

    it("includes lathe_sf_advise in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_advise");
    });

    it("includes lathe_sf_whatif in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_whatif");
    });

    it("includes lathe_sf_cite_sources in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_cite_sources");
    });

    it("includes lathe_sf_explain in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_explain");
    });

    it("includes lathe_sf_full in ACTIONS list", () => {
      expect(ACTIONS).toContain("lathe_sf_full");
    });
  });

  describe("schema validation", () => {
    it("lathe_sf_calculate schema parses valid input", () => {
      const input = {
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing", coolant: "flood" },
      };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_calculate.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_advise schema parses valid input", () => {
      const input = {
        material: "4140",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
        seed: 42,
      };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_advise.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_whatif schema parses valid input", () => {
      const input = {
        base_input: {
          material: "4140",
          tool: { type: "turning_insert" },
          operation: { type: "roughing" },
        },
        scenarios: [{ type: "change_strategy", params: { strategy: "aggressive" } }],
      };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_whatif.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_cite_sources schema parses valid input", () => {
      const input = { material: "alloy_steel", include_formulas: true };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_cite_sources.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_explain schema parses valid input", () => {
      const input = { material: "4140", target_audience: "machinist" };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_explain.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_full schema parses valid input", () => {
      const input = {
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing", coolant: "flood" },
        strategy: "balanced",
        workpiece: { diameter_mm: 50 },
        include_whatif: true,
        include_dl_advice: true,
        include_explanation: true,
        include_citations: true,
        target_audience: "machinist",
      };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_full.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("lathe_sf_full schema requires material", () => {
      const input = {
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      };
      const result = ACTION_LATHE_SF_SCHEMAS.lathe_sf_full.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("lathe_sf_calculate engine integration", () => {
    it("returns successful result for valid AISI material", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing", coolant: "flood" },
      });

      expect(result.success).toBe(true);
      expect(result.recommendation.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.recommendation.rpm).toBeGreaterThan(0);
      expect(result.recommendation.feed_mm_rev).toBeGreaterThan(0);
    });

    it("includes confidence and reasoning", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "alloy_steel",
        tool: { type: "turning_insert" },
        operation: { type: "finishing" },
        strategy: "balanced",
      });

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });

  describe("lathe_sf_advise engine integration", () => {
    it("returns DL-advised recommendation with feature importance", () => {
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise({
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing" },
        seed: 42,
      });

      expect(result.success).toBe(true);
      expect(result.influential_features.length).toBeGreaterThanOrEqual(3);
      expect(result.neural_reasoning.length).toBeGreaterThan(0);
    });

    it("produces deterministic output with same seed", () => {
      const result1 = LatheSpeedFeedDeepLearningAdvisorEngine.advise({
        material: "4140",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
        seed: 12345,
      });
      const result2 = LatheSpeedFeedDeepLearningAdvisorEngine.advise({
        material: "4140",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
        seed: 12345,
      });

      expect(result1.recommendation.cutting_speed_m_min).toBe(
        result2.recommendation.cutting_speed_m_min
      );
    });
  });

  describe("lathe_sf_whatif engine integration", () => {
    it("analyzes what-if scenarios", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze({
        base_input: {
          material: "4140",
          tool: { type: "turning_insert", nose_radius_mm: 0.8 },
          operation: { type: "roughing", coolant: "flood" },
        },
        scenarios: [
          { type: "change_strategy", params: { strategy: "aggressive" } },
          { type: "change_coolant", params: { coolant: "dry" } },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.scenarios.length).toBe(2);
      expect(result.baseline).toBeDefined();
    });

    it("includes sensitivity analysis when requested", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze({
        base_input: {
          material: "4140",
          tool: { type: "turning_insert" },
          operation: { type: "roughing" },
        },
        scenarios: [{ type: "increase_speed" }],
        include_sensitivity: true,
      });

      expect(result.sensitivity).toBeDefined();
      expect(result.sensitivity!.length).toBeGreaterThan(0);
    });

    it("includes causal chain when requested", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze({
        base_input: {
          material: "4140",
          tool: { type: "turning_insert" },
          operation: { type: "roughing" },
        },
        scenarios: [{ type: "decrease_feed" }],
        include_causal_chain: true,
      });

      expect(result.causal_chain).toBeDefined();
      expect(result.causal_chain!.length).toBeGreaterThan(0);
    });
  });

  describe("lathe_sf_cite_sources equivalent", () => {
    it("returns sources for material calculation", () => {
      const calcResult = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "alloy_steel",
        tool: { type: "turning_insert" },
        operation: { type: "roughing" },
      });

      expect(calcResult.sources.length).toBeGreaterThan(0);
      expect(calcResult.sources.some(s => s.name === "CANONICAL_MATERIAL_DB")).toBe(true);
    });
  });

  describe("lathe_sf_explain equivalent", () => {
    it("includes reasoning steps in calculation", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "finishing" },
      });

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some(r => r.step.includes("Material"))).toBe(true);
      expect(result.reasoning.some(r => r.step.includes("speed"))).toBe(true);
    });
  });

  describe("lathe_sf_full pipeline integration", () => {
    it("full pipeline produces valid guarded recommendation", () => {
      // Step 1: Base calculation
      const baseResult = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing", coolant: "flood" },
        strategy: "balanced",
        workpiece: { diameter_mm: 50 },
      });
      expect(baseResult.success).toBe(true);

      // Step 2: DL Advisor
      const dlResult = LatheSpeedFeedDeepLearningAdvisorEngine.advise({
        material: "4140",
        tool: { type: "turning_insert", nose_radius_mm: 0.8 },
        operation: { type: "roughing" },
        seed: 42,
      });
      expect(dlResult.success).toBe(true);

      // Step 3: Guard hook validation
      const guardResult = LatheSpeedFeedGuardHook.validate({
        recommendation: baseResult.recommendation,
        material_iso_group: "P",
        operation_type: "roughing",
      });
      expect(guardResult.passed).toBe(true);
      expect(guardResult.safety_score).toBeGreaterThanOrEqual(0.8);
    });

    it("full pipeline with what-if analysis", () => {
      const whatifResult = LatheSpeedFeedReasoningBridgeEngine.analyze({
        base_input: {
          material: "4140",
          tool: { type: "turning_insert", nose_radius_mm: 0.8 },
          operation: { type: "roughing", coolant: "flood" },
        },
        scenarios: [
          { type: "change_strategy", params: { strategy: "aggressive" } },
          { type: "increase_speed" },
        ],
        include_sensitivity: true,
      });

      expect(whatifResult.success).toBe(true);
      expect(whatifResult.scenarios.length).toBe(2);
      expect(whatifResult.baseline).toBeDefined();
      expect(whatifResult.sensitivity).toBeDefined();
    });

    it("guard hook catches out-of-band parameters", () => {
      const guardResult = LatheSpeedFeedGuardHook.validate({
        recommendation: {
          cutting_speed_m_min: 500, // Too high for ISO H
          rpm: 3000,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 2.0,
        },
        material_iso_group: "H",
      });

      expect(guardResult.violations.length).toBeGreaterThan(0);
      expect(guardResult.violations.some(v => v.code === "VC_ABOVE_ISO_RANGE")).toBe(true);
      expect(guardResult.adjusted_recommendation).toBeDefined();
    });

    it("pipeline handles superalloy materials correctly", () => {
      const result = LatheSpeedFeedCalculatorFacadeEngine.calculate({
        material: "inconel_718",
        tool: { type: "turning_insert", nose_radius_mm: 0.4 },
        operation: { type: "finishing", coolant: "high_pressure" },
        strategy: "conservative",
      });

      expect(result.success).toBe(true);
      // Superalloys should have lower speeds
      expect(result.recommendation.cutting_speed_m_min).toBeLessThan(100);

      const guardResult = LatheSpeedFeedGuardHook.validate({
        recommendation: result.recommendation,
        material_iso_group: "S",
        operation_type: "finishing",
      });
      expect(guardResult.passed).toBe(true);
    });
  });
});
