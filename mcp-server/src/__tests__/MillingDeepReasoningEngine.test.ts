/**
 * Tests for MillingDeepReasoningEngine
 * Validates Opus-level reasoning for milling decisions.
 */
import { describe, it, expect } from "vitest";
import {
  MillingDeepReasoningEngine,
  millingDeepReasoningEngine,
  type MillingContext,
  type ReasoningMode,
} from "../engines/MillingDeepReasoningEngine.js";

describe("MillingDeepReasoningEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingDeepReasoningEngine).toBeDefined();
      expect(millingDeepReasoningEngine).toBeInstanceOf(MillingDeepReasoningEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingDeepReasoningEngine();
      expect(engine).toBeInstanceOf(MillingDeepReasoningEngine);
    });
  });

  // ============================================================================
  // REASON METHOD
  // ============================================================================

  describe("reason()", () => {
    it("returns complete reasoning result", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingDeepReasoningEngine.reason(
        "What speed and feed should I use?",
        context,
        "analytical"
      );

      expect(result.query).toBe("What speed and feed should I use?");
      expect(result.mode).toBe("analytical");
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.physics_validation).toBeDefined();
    });

    it("builds multi-step reasoning chain", () => {
      const context: MillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        operation: "finishing",
      };

      const result = millingDeepReasoningEngine.reason(
        "How should I approach this hard material?",
        context,
        "analytical"
      );

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(4);

      // Each step should have required fields
      for (const step of result.reasoning_chain) {
        expect(step.step_number).toBeGreaterThan(0);
        expect(step.question).toBeDefined();
        expect(step.reasoning).toBeDefined();
        expect(step.conclusion).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it("gathers relevant evidence for D2 tool steel", () => {
      const context: MillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 60,
      };

      const result = millingDeepReasoningEngine.reason(
        "What parameters for D2?",
        context,
        "analytical"
      );

      expect(result.evidence_summary.length).toBeGreaterThan(0);
      expect(result.evidence_summary.some(e =>
        e.content.toLowerCase().includes("d2") ||
        e.content.toLowerCase().includes("hard")
      )).toBe(true);
    });

    it("validates with physics", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        tool_diameter_mm: 10,
        depth_mm: 30, // Deep cut
      };

      const result = millingDeepReasoningEngine.reason(
        "Is this depth OK?",
        context,
        "analytical"
      );

      expect(result.physics_validation).toBeDefined();
      expect(typeof result.physics_validation.kienzle_check).toBe("boolean");
      expect(typeof result.physics_validation.taylor_check).toBe("boolean");
      expect(typeof result.physics_validation.deflection_check).toBe("boolean");

      // Deep cut with small tool should trigger deflection warning
      expect(result.physics_validation.warnings.length).toBeGreaterThan(0);
    });

    it("generates counterfactuals in comparative mode", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
        tool_type: "endmill",
      };

      const result = millingDeepReasoningEngine.reason(
        "Should I use trochoidal clearing?",
        context,
        "comparative"
      );

      expect(result.counterfactuals.length).toBeGreaterThan(0);
      expect(result.counterfactuals[0].scenario).toBeDefined();
      expect(result.counterfactuals[0].delta).toBeDefined();
      expect(result.counterfactuals[0].recommendation).toBeDefined();
    });

    it("handles thin wall context", () => {
      const context: MillingContext = {
        material: "6061 Aluminum",
        material_iso: "N",
        is_thin_wall: true,
        operation: "finishing",
      };

      const result = millingDeepReasoningEngine.reason(
        "How to machine this thin wall?",
        context,
        "analytical"
      );

      expect(result.evidence_summary.some(e =>
        e.content.toLowerCase().includes("thin wall")
      )).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8); // Should have high confidence for specific case
    });

    it("handles 5-axis context", () => {
      const context: MillingContext = {
        material: "Titanium",
        material_iso: "S",
        is_5_axis: true,
        operation: "finishing",
      };

      const result = millingDeepReasoningEngine.reason(
        "5-axis finishing approach?",
        context,
        "analytical"
      );

      expect(result.recommendations.some(r =>
        r.toLowerCase().includes("collision") || r.toLowerCase().includes("reach")
      )).toBe(true);
    });
  });

  // ============================================================================
  // QUICK REASON METHOD
  // ============================================================================

  describe("quickReason()", () => {
    it("returns quick answer for simple query", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingDeepReasoningEngine.quickReason(
        "What parameters?",
        context
      );

      expect(result.answer).toBeDefined();
      expect(result.answer.length).toBeGreaterThan(10);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.evidence).toBeDefined();
    });

    it("provides material-specific quick answer", () => {
      const context: MillingContext = {
        material_iso: "H",
        hardness_hrc: 55,
      };

      const result = millingDeepReasoningEngine.quickReason(
        "Quick recommendation?",
        context
      );

      expect(result.answer.toLowerCase()).toMatch(/hard|reduce|cbn|ceramic/);
    });

    it("provides operation-specific quick answer", () => {
      const context: MillingContext = {
        operation: "roughing",
      };

      const result = millingDeepReasoningEngine.quickReason(
        "How to rough?",
        context
      );

      expect(result.answer.toLowerCase()).toMatch(/chip|load|mrr|rough/);
    });
  });

  // ============================================================================
  // EXPLAIN DECISION METHOD
  // ============================================================================

  describe("explainDecision()", () => {
    it("explains a milling decision", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingDeepReasoningEngine.explainDecision(
        "Use trochoidal clearing at 3000 RPM",
        context
      );

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(50);
      expect(result.supporting_evidence).toBeDefined();
      expect(result.alternative_decisions).toBeDefined();
      expect(result.risk_assessment).toBeDefined();
    });

    it("generates alternatives to carbide", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
      };

      const result = millingDeepReasoningEngine.explainDecision(
        "Use carbide endmill",
        context
      );

      expect(result.alternative_decisions.length).toBeGreaterThan(0);
      expect(result.alternative_decisions.some(a =>
        a.toLowerCase().includes("hss") || a.toLowerCase().includes("ceramic")
      )).toBe(true);
    });

    it("assesses risk for hardened steel", () => {
      const context: MillingContext = {
        material_iso: "H",
        hardness_hrc: 55,
      };

      const result = millingDeepReasoningEngine.explainDecision(
        "Standard carbide parameters",
        context
      );

      expect(result.risk_assessment).toMatch(/high|medium/i);
    });
  });

  // ============================================================================
  // REASONING MODES
  // ============================================================================

  describe("reasoning modes", () => {
    const context: MillingContext = {
      material: "4140 Steel",
      material_iso: "P",
      operation: "roughing",
    };

    it("supports analytical mode", () => {
      const result = millingDeepReasoningEngine.reason(
        "Analyze parameters",
        context,
        "analytical"
      );
      expect(result.mode).toBe("analytical");
    });

    it("supports comparative mode with counterfactuals", () => {
      const result = millingDeepReasoningEngine.reason(
        "Compare strategies",
        context,
        "comparative"
      );
      expect(result.mode).toBe("comparative");
      expect(result.counterfactuals.length).toBeGreaterThan(0);
    });

    it("supports diagnostic mode", () => {
      const result = millingDeepReasoningEngine.reason(
        "Why did tool break?",
        context,
        "diagnostic"
      );
      expect(result.mode).toBe("diagnostic");
    });

    it("supports predictive mode", () => {
      const result = millingDeepReasoningEngine.reason(
        "Predict tool life",
        context,
        "predictive"
      );
      expect(result.mode).toBe("predictive");
    });

    it("supports creative mode with counterfactuals", () => {
      const result = millingDeepReasoningEngine.reason(
        "Novel approach?",
        context,
        "creative"
      );
      expect(result.mode).toBe("creative");
      expect(result.counterfactuals.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // EVIDENCE HANDLING
  // ============================================================================

  describe("evidence handling", () => {
    it("weights evidence by relevance", () => {
      const context: MillingContext = {
        material: "D2",
        material_iso: "H",
        is_thin_wall: true,
      };

      const result = millingDeepReasoningEngine.reason(
        "Parameters for D2 thin wall?",
        context,
        "analytical"
      );

      // Evidence should be sorted by relevance
      expect(result.evidence_summary.length).toBeGreaterThan(0);
      if (result.evidence_summary.length > 1) {
        expect(result.evidence_summary[0].weight).toBeGreaterThanOrEqual(
          result.evidence_summary[result.evidence_summary.length - 1].weight
        );
      }
    });

    it("includes evidence source in summary", () => {
      const context: MillingContext = {
        material: "D2",
        material_iso: "H",
      };

      const result = millingDeepReasoningEngine.reason(
        "D2 parameters?",
        context,
        "analytical"
      );

      for (const evidence of result.evidence_summary) {
        expect(evidence.source).toBeDefined();
        expect(evidence.type).toBeDefined();
        expect(evidence.confidence).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // PHYSICS VALIDATION
  // ============================================================================

  describe("physics validation", () => {
    it("validates high aspect ratio", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        tool_diameter_mm: 2,  // Tool < 3mm triggers check
        depth_mm: 15,         // Depth > 10mm triggers check
      };

      const result = millingDeepReasoningEngine.reason(
        "Is this OK?",
        context,
        "analytical"
      );

      expect(result.physics_validation.deflection_check).toBe(false);
      expect(result.physics_validation.warnings.length).toBeGreaterThan(0);
    });

    it("validates extreme hardness", () => {
      const context: MillingContext = {
        material_iso: "H",
        hardness_hrc: 65,
      };

      const result = millingDeepReasoningEngine.reason(
        "Can I machine this?",
        context,
        "analytical"
      );

      expect(result.physics_validation.taylor_check).toBe(false);
      expect(result.physics_validation.warnings.some(w =>
        w.toLowerCase().includes("tool life") || w.toLowerCase().includes("hardness")
      )).toBe(true);
    });

    it("passes validation for normal conditions", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        tool_diameter_mm: 10,
        depth_mm: 5,
        hardness_hrc: 30,
      };

      const result = millingDeepReasoningEngine.reason(
        "Standard parameters?",
        context,
        "analytical"
      );

      expect(result.physics_validation.kienzle_check).toBe(true);
      expect(result.physics_validation.taylor_check).toBe(true);
      expect(result.physics_validation.deflection_check).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty context", () => {
      const context: MillingContext = {};

      const result = millingDeepReasoningEngine.reason(
        "What should I do?",
        context,
        "analytical"
      );

      expect(result.conclusion).toBeDefined();
      expect(result.caveats.length).toBeGreaterThan(0); // Should have caveats about missing context
    });

    it("handles unknown material", () => {
      const context: MillingContext = {
        material: "Unobtanium",
      };

      const result = millingDeepReasoningEngine.reason(
        "How to machine this?",
        context,
        "analytical"
      );

      expect(result.conclusion).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for unknown
    });

    it("handles all context fields populated", () => {
      const context: MillingContext = {
        material: "D2 Tool Steel",
        material_iso: "H",
        hardness_hrc: 58,
        operation: "finishing",
        tool_type: "ball",
        tool_diameter_mm: 6,
        machine: "Haas VF-2",
        controller: "Haas NGC",
        customer: "FONTANA",
        tolerance_mm: 0.01,
        surface_finish_ra: 0.8,
        depth_mm: 10,
        width_mm: 50,
        is_thin_wall: false,
        is_5_axis: false,
      };

      const result = millingDeepReasoningEngine.reason(
        "Complete recommendation?",
        context,
        "analytical"
      );

      expect(result.confidence).toBeGreaterThan(0.85); // Higher confidence with full context
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("completes reasoning in reasonable time", () => {
      const context: MillingContext = {
        material: "4140 Steel",
        material_iso: "P",
        operation: "roughing",
      };

      const start = Date.now();
      const result = millingDeepReasoningEngine.reason(
        "Full analysis please",
        context,
        "comparative"
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500); // Should complete in <500ms
      expect(result.reasoning_chain.length).toBeGreaterThan(3);
    });
  });
});
