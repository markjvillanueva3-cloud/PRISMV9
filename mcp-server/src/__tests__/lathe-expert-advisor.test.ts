/**
 * LatheExpertAdvisorEngine Tests — LLM-INTEL-11
 *
 * Tests for expert-level machinist guidance:
 *   1. Material-specific strategies
 *   2. Difficult geometry handling
 *   3. Operation expertise
 *   4. Tooling selection
 *   5. Pitfall identification
 *   6. Process optimization
 *   7. Scenario advice
 *
 * @module __tests__/lathe-expert-advisor.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheExpertAdvisorEngine,
  latheExpertAdvisorEngine,
  type MaterialCategory,
  type LatheOperation,
  type DifficultGeometry,
} from "../engines/LatheExpertAdvisorEngine.js";

// ============================================================================
// TESTS
// ============================================================================

describe("LatheExpertAdvisorEngine", () => {
  const engine = latheExpertAdvisorEngine;

  describe("getMaterialStrategy", () => {
    it("should return strategy for mild steel", () => {
      const result = engine.getMaterialStrategy("mild_steel");

      expect(result.material_category).toBe("mild_steel");
      expect(result.iso_group).toBe("P");
      expect(result.cutting_speed_range.optimal).toBeGreaterThan(0);
      expect(result.recommended_inserts.length).toBeGreaterThan(0);
    });

    it("should return strategy for stainless steel", () => {
      const result = engine.getMaterialStrategy("stainless_steel");

      expect(result.iso_group).toBe("M");
      expect(result.expert_tips.some(t => t.toLowerCase().includes("dwell"))).toBe(true);
      expect(result.key_challenges.some(c => c.toLowerCase().includes("work harden"))).toBe(true);
    });

    it("should return strategy for hardened steel", () => {
      const result = engine.getMaterialStrategy("hardened_steel");

      expect(result.iso_group).toBe("H");
      expect(result.recommended_inserts.some(i => i.grade_family.includes("CB"))).toBe(true); // CBN
      expect(result.coolant_strategy.toLowerCase()).toContain("dry");
    });

    it("should return strategy for aluminum", () => {
      const result = engine.getMaterialStrategy("aluminum");

      expect(result.iso_group).toBe("N");
      expect(result.cutting_speed_range.optimal).toBeGreaterThan(500); // Fast!
      expect(result.expert_tips.some(t => t.toLowerCase().includes("fast"))).toBe(true);
    });

    it("should return strategy for titanium", () => {
      const result = engine.getMaterialStrategy("titanium");

      expect(result.iso_group).toBe("S");
      expect(result.cutting_speed_range.optimal).toBeLessThan(100); // Slow!
      expect(result.coolant_strategy.toLowerCase()).toContain("high pressure");
    });

    it("should return strategy for superalloy", () => {
      const result = engine.getMaterialStrategy("superalloy");

      expect(result.iso_group).toBe("S");
      expect(result.cutting_speed_range.optimal).toBeLessThan(50); // Very slow
      expect(result.key_challenges.some(c => c.toLowerCase().includes("notch"))).toBe(true);
    });

    it("should include common mistakes for each material", () => {
      const materials: MaterialCategory[] = ["mild_steel", "stainless_steel", "aluminum", "titanium"];

      materials.forEach(mat => {
        const result = engine.getMaterialStrategy(mat);
        expect(result.common_mistakes.length).toBeGreaterThan(0);
      });
    });

    it("should throw for unknown material", () => {
      expect(() => engine.getMaterialStrategy("unobtainium" as MaterialCategory)).toThrow();
    });
  });

  describe("getGeometryAdvice", () => {
    it("should return advice for thin wall", () => {
      const result = engine.getGeometryAdvice("thin_wall");

      expect(result.geometry_type).toBe("thin_wall");
      expect(result.critical_factors.length).toBeGreaterThan(0);
      expect(result.setup_requirements.some(r => r.toLowerCase().includes("soft jaw"))).toBe(true);
    });

    it("should return advice for deep bore", () => {
      const result = engine.getGeometryAdvice("deep_bore");

      // Anti-vibration mentioned in setup_requirements or tooling_recommendations
      const hasAntiVibration =
        result.setup_requirements.some(r => r.toLowerCase().includes("anti-vibration")) ||
        result.tooling_recommendations.some(t => t.toLowerCase().includes("anti-vibration"));
      expect(hasAntiVibration).toBe(true);
      expect(result.tooling_recommendations.some(t => t.toLowerCase().includes("damped"))).toBe(true);
    });

    it("should return advice for long shaft", () => {
      const result = engine.getGeometryAdvice("long_shaft");

      expect(result.setup_requirements.some(r => r.toLowerCase().includes("tailstock"))).toBe(true);
      expect(result.quality_risks.some(r => r.toLowerCase().includes("whip"))).toBe(true);
    });

    it("should return advice for interrupted cut", () => {
      const result = engine.getGeometryAdvice("interrupted_cut");

      expect(result.tooling_recommendations.some(t => t.toLowerCase().includes("tough"))).toBe(true);
      expect(result.parameter_guidelines.some(p => p.parameter.toLowerCase().includes("speed"))).toBe(true);
    });

    it("should include process sequence", () => {
      const geometries: DifficultGeometry[] = ["thin_wall", "deep_bore", "long_shaft"];

      geometries.forEach(geom => {
        const result = engine.getGeometryAdvice(geom);
        expect(result.process_sequence.length).toBeGreaterThan(0);
      });
    });

    it("should throw for unknown geometry", () => {
      expect(() => engine.getGeometryAdvice("impossible_shape" as DifficultGeometry)).toThrow();
    });
  });

  describe("getOperationExpertise", () => {
    it("should return expertise for threading", () => {
      const result = engine.getOperationExpertise("threading");

      expect(result.operation).toBe("threading");
      expect(result.critical_success_factors.some(f => f.toLowerCase().includes("infeed"))).toBe(true);
      expect(result.common_pitfalls.length).toBeGreaterThan(0);
    });

    it("should return expertise for grooving", () => {
      const result = engine.getOperationExpertise("grooving");

      expect(result.pro_tips.some(t => t.toLowerCase().includes("coolant"))).toBe(true);
      expect(result.common_pitfalls.some(p => p.mistake.toLowerCase().includes("chip"))).toBe(true);
    });

    it("should return expertise for parting", () => {
      const result = engine.getOperationExpertise("parting");

      expect(result.pro_tips.some(t => t.toLowerCase().includes("center height"))).toBe(true);
      expect(result.setup_checklist.some(c => c.toLowerCase().includes("blade"))).toBe(true);
    });

    it("should return expertise for boring", () => {
      const result = engine.getOperationExpertise("boring");

      expect(result.critical_success_factors.some(f => f.toLowerCase().includes("rigidity"))).toBe(true);
      expect(result.troubleshooting_guide.length).toBeGreaterThan(0);
    });

    it("should include parameter sweet spots", () => {
      const operations: LatheOperation[] = ["roughing", "finishing", "threading", "parting"];

      operations.forEach(op => {
        const result = engine.getOperationExpertise(op);
        expect(result.parameter_sweet_spots.length).toBeGreaterThan(0);
      });
    });

    it("should include troubleshooting guide", () => {
      const result = engine.getOperationExpertise("threading");

      expect(result.troubleshooting_guide.length).toBeGreaterThan(0);
      expect(result.troubleshooting_guide[0].symptom).toBeTruthy();
      expect(result.troubleshooting_guide[0].likely_causes.length).toBeGreaterThan(0);
    });

    it("should throw for unknown operation", () => {
      expect(() => engine.getOperationExpertise("laser_cutting" as LatheOperation)).toThrow();
    });
  });

  describe("selectTooling", () => {
    it("should select tooling for roughing steel", () => {
      const result = engine.selectTooling("roughing", "mild_steel");

      expect(result.operation).toBe("roughing");
      expect(result.material).toBe("mild_steel");
      expect(result.recommended_tools.length).toBeGreaterThan(0);
      expect(result.holder_recommendations.length).toBeGreaterThan(0);
    });

    it("should select CBN for finishing hardened steel", () => {
      const result = engine.selectTooling("finishing", "hardened_steel");

      expect(result.recommended_tools.some(t =>
        t.grade_recommendation.includes("CB") || t.tool_type.toLowerCase().includes("cbn")
      )).toBe(true);
    });

    it("should select PCD for aluminum production", () => {
      const result = engine.selectTooling("finishing", "aluminum");

      expect(result.recommended_tools.some(t =>
        t.grade_recommendation.includes("PCD") || t.grade_recommendation.includes("CD")
      )).toBe(true);
    });

    it("should select tougher grade for interrupted cuts", () => {
      const result = engine.selectTooling("roughing", "alloy_steel", {
        interrupted_cut: true,
      });

      expect(result.recommended_tools.some(t =>
        t.why_selected.toLowerCase().includes("tough") ||
        t.grade_recommendation.toLowerCase().includes("35")
      )).toBe(true);
    });

    it("should recommend boring bar for internal operations", () => {
      const result = engine.selectTooling("roughing", "mild_steel", {
        internal: true,
      });

      expect(result.recommended_tools.some(t =>
        t.tool_type.toLowerCase().includes("boring")
      )).toBe(true);
      expect(result.holder_recommendations.some(r =>
        r.toLowerCase().includes("bar") || r.toLowerCase().includes("anti-vibration")
      )).toBe(true);
    });

    it("should include alternatives", () => {
      const result = engine.selectTooling("roughing", "stainless_steel");

      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("identifyPitfalls", () => {
    it("should identify pitfalls for threading", () => {
      const result = engine.identifyPitfalls("threading");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].mistake).toBeTruthy();
      expect(result[0].prevention).toBeTruthy();
    });

    it("should include material-specific pitfalls", () => {
      const result = engine.identifyPitfalls("roughing", "stainless_steel");

      expect(result.some(p =>
        p.mistake.toLowerCase().includes("dwell") ||
        p.mistake.toLowerCase().includes("slow") ||
        p.mistake.toLowerCase().includes("work harden")
      )).toBe(true);
    });

    it("should identify pitfalls for parting", () => {
      const result = engine.identifyPitfalls("parting");

      expect(result.some(p => p.mistake.toLowerCase().includes("center"))).toBe(true);
    });

    it("should identify pitfalls for boring", () => {
      const result = engine.identifyPitfalls("boring");

      expect(result.some(p =>
        p.mistake.toLowerCase().includes("overhang") ||
        p.mistake.toLowerCase().includes("bar")
      )).toBe(true);
    });
  });

  describe("optimizeProcess", () => {
    it("should identify when speed is too high", () => {
      const result = engine.optimizeProcess(
        {
          operation: "roughing",
          material: "mild_steel",
          speed_m_min: 400,  // Too high for steel
          feed_mm_rev: 0.25,
          doc_mm: 2,
        },
        {}
      );

      expect(result.current_issues.some(i => i.toLowerCase().includes("speed"))).toBe(true);
      expect(result.parameter_recommendations.some(p => p.parameter === "cutting_speed")).toBe(true);
    });

    it("should suggest speed increase when too low", () => {
      const result = engine.optimizeProcess(
        {
          operation: "roughing",
          material: "mild_steel",
          speed_m_min: 100,  // Below optimal
          feed_mm_rev: 0.25,
          doc_mm: 2,
        },
        { improve_cycle_time: true }
      );

      expect(result.current_issues.some(i => i.toLowerCase().includes("below"))).toBe(true);
      expect(result.cycle_time_improvements.length).toBeGreaterThan(0);
    });

    it("should suggest chatter reduction strategies", () => {
      const result = engine.optimizeProcess(
        {
          operation: "roughing",
          material: "stainless_steel",
          speed_m_min: 140,
          feed_mm_rev: 0.2,
          doc_mm: 3,
        },
        { reduce_chatter: true }
      );

      expect(result.optimization_opportunities.some(o =>
        o.area.toLowerCase().includes("chatter")
      )).toBe(true);
    });

    it("should suggest finish improvements", () => {
      const result = engine.optimizeProcess(
        {
          operation: "finishing",
          material: "mild_steel",
          speed_m_min: 250,
          feed_mm_rev: 0.3,  // High for finishing
          doc_mm: 0.5,
        },
        { improve_finish: true }
      );

      expect(result.optimization_opportunities.some(o =>
        o.area.toLowerCase().includes("finish")
      )).toBe(true);
    });

    it("should include quality improvements", () => {
      const result = engine.optimizeProcess(
        {
          operation: "finishing",
          material: "mild_steel",
          speed_m_min: 250,
          feed_mm_rev: 0.1,
          doc_mm: 0.3,
        },
        {}
      );

      expect(result.quality_improvements.length).toBeGreaterThan(0);
    });

    it("should include cost reduction ideas", () => {
      const result = engine.optimizeProcess(
        {
          operation: "roughing",
          material: "mild_steel",
          speed_m_min: 200,
          feed_mm_rev: 0.25,
          doc_mm: 2,
        },
        {}
      );

      expect(result.cost_reduction_ideas.length).toBeGreaterThan(0);
    });
  });

  describe("getScenarioAdvice", () => {
    it("should combine material and operation advice", () => {
      const result = engine.getScenarioAdvice(
        "stainless_steel",
        "threading"
      );

      expect(result.material_strategy.material_category).toBe("stainless_steel");
      expect(result.operation_expertise.operation).toBe("threading");
      expect(result.combined_recommendations.length).toBeGreaterThan(0);
    });

    it("should include geometry advice when provided", () => {
      const result = engine.getScenarioAdvice(
        "mild_steel",
        "boring",
        "deep_bore"
      );

      expect(result.geometry_advice).toBeDefined();
      expect(result.geometry_advice?.geometry_type).toBe("deep_bore");
    });

    it("should prioritize warnings", () => {
      const result = engine.getScenarioAdvice(
        "titanium",
        "roughing"
      );

      expect(result.priority_warnings.length).toBeGreaterThan(0);
    });

    it("should combine recommendations from all sources", () => {
      const result = engine.getScenarioAdvice(
        "hardened_steel",
        "finishing",
        "thin_wall"
      );

      // Should have material tips
      expect(result.combined_recommendations.some(r =>
        r.toLowerCase().includes("cbn") || r.toLowerCase().includes("ceramic")
      )).toBe(true);

      // Should have geometry warnings
      expect(result.priority_warnings.some(w =>
        w.toLowerCase().includes("deform") || w.toLowerCase().includes("chuck")
      )).toBe(true);
    });

    it("should work for all material/operation combinations", () => {
      const materials: MaterialCategory[] = ["mild_steel", "stainless_steel", "aluminum"];
      const operations: LatheOperation[] = ["roughing", "finishing", "threading"];

      materials.forEach(mat => {
        operations.forEach(op => {
          const result = engine.getScenarioAdvice(mat, op);
          expect(result.material_strategy).toBeDefined();
          expect(result.operation_expertise).toBeDefined();
          expect(result.combined_recommendations.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
