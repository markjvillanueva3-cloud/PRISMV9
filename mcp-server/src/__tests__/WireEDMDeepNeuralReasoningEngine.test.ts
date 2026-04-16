/**
 * WireEDMDeepNeuralReasoningEngine Tests
 *
 * Tests deep neural reasoning for Wire EDM:
 * - Knowledge graph queries
 * - Attention mechanisms
 * - Physics constraint validation
 * - E-code family selection
 * - Material embeddings
 *
 * @module __tests__/WireEDMDeepNeuralReasoningEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMDeepNeuralReasoningEngine,
  WireEDMDeepNeuralReasoningEngine,
  type NeuralReasoningInput,
} from "../engines/WireEDMDeepNeuralReasoningEngine.js";

describe("WireEDMDeepNeuralReasoningEngine", () => {
  let engine: WireEDMDeepNeuralReasoningEngine;

  beforeEach(() => {
    engine = new WireEDMDeepNeuralReasoningEngine();
  });

  // ============================================================================
  // REASONING TESTS
  // ============================================================================

  describe("reason", () => {
    it("performs standard reasoning for D2 at 25mm", async () => {
      const input: NeuralReasoningInput = {
        question: "What parameters for D2 at 25mm targeting Ra 0.8µm?",
        context: {
          material: "D2",
          thickness_mm: 25,
          target_ra_um: 0.8,
        },
      };

      const result = await engine.reason(input);

      expect(result.query).toBe(input.question);
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.final_answer.recommendation).toBeTruthy();
      expect(result.final_answer.confidence).toBeGreaterThan(0);
    });

    it("generates reasoning chain with multiple steps", async () => {
      const result = await engine.reason({
        question: "What E-code family for 30mm steel?",
        context: { material: "D2", thickness_mm: 30 },
      });

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(5);

      const operations = result.reasoning_chain.map(s => s.operation);
      expect(operations).toContain("attention");
      expect(operations).toContain("lookup");
      expect(operations).toContain("constraint");
      expect(operations).toContain("synthesis");
    });

    it("performs deep reasoning when requested", async () => {
      const result = await engine.reason({
        question: "Deep analysis for thick carbide section",
        context: {
          material: "tungsten_carbide",
          thickness_mm: 60,
          target_ra_um: 0.4,
        },
        reasoning_depth: "deep",
      });

      const hasDeepAnalysis = result.reasoning_chain.some(
        s => s.step_id === "deep_analysis"
      );
      expect(hasDeepAnalysis).toBe(true);
    });

    it("includes physics validation", async () => {
      const result = await engine.reason({
        question: "Parameters for S7 at 50mm",
        context: { material: "S7", thickness_mm: 50 },
      });

      expect(result.physics_validation.length).toBeGreaterThan(0);
      expect(result.physics_validation[0].constraint).toBeTruthy();
      expect(typeof result.physics_validation[0].satisfied).toBe("boolean");
    });

    it("includes supporting evidence", async () => {
      const result = await engine.reason({
        question: "What parameters for A2?",
        context: { material: "A2", thickness_mm: 25 },
      });

      expect(result.supporting_evidence.length).toBeGreaterThan(0);
      expect(result.supporting_evidence[0].source).toBeTruthy();
      expect(result.supporting_evidence[0].relevance).toBeGreaterThan(0);
    });

    it("generates alternative approaches", async () => {
      const result = await engine.reason({
        question: "Best approach for fine finish",
        context: {
          material: "D2",
          thickness_mm: 25,
          target_ra_um: 0.2,
        },
      });

      expect(result.alternative_approaches.length).toBeGreaterThan(0);
      expect(result.alternative_approaches[0].approach).toBeTruthy();
      expect(result.alternative_approaches[0].trade_offs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ATTENTION MECHANISM TESTS
  // ============================================================================

  describe("attention mechanism", () => {
    it("reasoning chain includes attention step", async () => {
      const result = await engine.reason({
        question: "Parameters for D2",
        context: { material: "D2", thickness_mm: 25 },
      });

      const attentionStep = result.reasoning_chain.find(
        s => s.operation === "attention" && s.step_id === "attention"
      );

      expect(attentionStep).toBeDefined();
      expect(attentionStep!.output_state).toHaveProperty("attention_output");
    });

    it("attention focuses on relevant features", async () => {
      const result = await engine.reason({
        question: "Parameters for thick section",
        context: { material: "D2", thickness_mm: 80 },
      });

      const attentionStep = result.reasoning_chain.find(
        s => s.operation === "attention" && s.step_id === "attention"
      );

      expect(attentionStep!.reasoning).toContain("focus");
    });
  });

  // ============================================================================
  // KNOWLEDGE GRAPH TESTS
  // ============================================================================

  describe("knowledge graph", () => {
    it("queries graph for material and E-code nodes", async () => {
      const result = await engine.reason({
        question: "E-code for D2",
        context: { material: "D2", thickness_mm: 25 },
      });

      const graphStep = result.reasoning_chain.find(
        s => s.operation === "lookup"
      );

      expect(graphStep).toBeDefined();
      expect(graphStep!.reasoning).toContain("nodes");
    });
  });

  // ============================================================================
  // PHYSICS CONSTRAINT TESTS
  // ============================================================================

  describe("physics constraints", () => {
    it("validates Ra achievability", async () => {
      const result = await engine.reason({
        question: "Can we achieve Ra 0.1µm?",
        context: { material: "D2", target_ra_um: 0.1 },
      });

      const raConstraint = result.physics_validation.find(
        c => c.constraint.toLowerCase().includes("ra")
      );

      expect(raConstraint).toBeDefined();
    });

    it("validates thickness limits", async () => {
      const result = await engine.reason({
        question: "Can we cut 200mm?",
        context: { material: "D2", thickness_mm: 200 },
      });

      const thicknessConstraint = result.physics_validation.find(
        c => c.constraint.toLowerCase().includes("thickness")
      );

      expect(thicknessConstraint).toBeDefined();
      expect(thicknessConstraint!.satisfied).toBe(true);
    });

    it("validates pass count for target Ra", async () => {
      const result = await engine.reason({
        question: "How many passes for Ra 0.3µm?",
        context: { target_ra_um: 0.3 },
      });

      const passConstraint = result.physics_validation.find(
        c => c.constraint.toLowerCase().includes("passes")
      );

      expect(passConstraint).toBeDefined();
    });

    it("assesses wire deflection risk for thick sections", async () => {
      const result = await engine.reason({
        question: "Risk for 100mm section",
        context: { thickness_mm: 100 },
      });

      const deflectionConstraint = result.physics_validation.find(
        c => c.constraint.toLowerCase().includes("deflection")
      );

      expect(deflectionConstraint).toBeDefined();
    });
  });

  // ============================================================================
  // E-CODE FAMILY TESTS
  // ============================================================================

  describe("getECodeForThickness", () => {
    it("returns correct family for thin sections (1-3mm)", () => {
      const result = engine.getECodeForThickness(2);

      expect(result.family).toBe("E100x_thin");
      expect(result.roughing_code).toBe("1006");
    });

    it("returns correct family for medium sections (10-25mm)", () => {
      const result = engine.getECodeForThickness(15);

      expect(result.family).toBe("E103x_standard");
      expect(result.roughing_code).toBe("1036");
    });

    it("returns correct family for thick sections (50-100mm)", () => {
      const result = engine.getECodeForThickness(75);

      expect(result.family).toBe("E105x_very_thick");
      expect(result.roughing_code).toBe("1056");
    });

    it("includes skim codes", () => {
      const result = engine.getECodeForThickness(25);

      expect(result.skim_codes.length).toBeGreaterThan(0);
      expect(result.skim_codes[0]).toMatch(/^E\d+$/);
    });

    it("includes expected Ra for 5 passes", () => {
      const result = engine.getECodeForThickness(25);

      expect(result.expected_ra_5pass).toBeGreaterThan(0);
      expect(result.expected_ra_5pass).toBeLessThan(5);  // Should be fine finish
    });

    it("defaults to standard for out-of-range thickness", () => {
      const result = engine.getECodeForThickness(500);

      expect(result.family).toBe("E103x_standard");
    });
  });

  // ============================================================================
  // MATERIAL EMBEDDING TESTS
  // ============================================================================

  describe("getMaterialEmbedding", () => {
    it("returns embedding for D2", () => {
      const embedding = engine.getMaterialEmbedding("D2");

      expect(embedding.length).toBe(8);
      expect(embedding[0]).toBeCloseTo(0.85, 2);  // conductivity_factor
    });

    it("returns embedding for tungsten_carbide", () => {
      const embedding = engine.getMaterialEmbedding("tungsten_carbide");

      expect(embedding.length).toBe(8);
      expect(embedding[0]).toBeCloseTo(0.45, 2);  // Low conductivity
    });

    it("returns embedding for graphite", () => {
      const embedding = engine.getMaterialEmbedding("graphite");

      expect(embedding[0]).toBeCloseTo(1.20, 2);  // High conductivity
    });

    it("defaults to D2 for unknown materials", () => {
      const embedding = engine.getMaterialEmbedding("unknown_alloy");

      expect(embedding.length).toBe(8);
      expect(embedding[0]).toBeCloseTo(0.85, 2);  // D2 conductivity
    });
  });

  // ============================================================================
  // FINAL ANSWER TESTS
  // ============================================================================

  describe("final answer", () => {
    it("includes E-code family recommendation", async () => {
      const result = await engine.reason({
        question: "What E-codes for 30mm D2?",
        context: { material: "D2", thickness_mm: 30 },
      });

      expect(result.final_answer.recommendation).toContain("E10");
    });

    it("includes predicted parameters", async () => {
      const result = await engine.reason({
        question: "Parameters for A2",
        context: { material: "A2", thickness_mm: 25 },
      });

      expect(result.final_answer.parameters.num_passes).toBeGreaterThan(0);
      expect(result.final_answer.parameters.predicted_ra_um).toBeGreaterThan(0);
    });

    it("includes confidence score", async () => {
      const result = await engine.reason({
        question: "What settings?",
        context: { material: "D2" },
      });

      expect(result.final_answer.confidence).toBeGreaterThan(0);
      expect(result.final_answer.confidence).toBeLessThanOrEqual(1);
    });

    it("includes uncertainty range", async () => {
      const result = await engine.reason({
        question: "Ra prediction",
        context: { material: "D2", thickness_mm: 25 },
      });

      expect(result.final_answer.uncertainty[0]).toBeLessThan(result.final_answer.uncertainty[1]);
    });
  });

  // ============================================================================
  // STATUS TESTS
  // ============================================================================

  describe("getStatus", () => {
    it("returns engine status", () => {
      const status = engine.getStatus();

      expect(status.knowledge_sources.length).toBeGreaterThan(0);
      expect(status.materials_supported).toBeGreaterThan(0);
      expect(status.ecode_families).toBeGreaterThan(0);
      expect(status.physics_constraints).toBeGreaterThan(0);
      expect(status.research_papers).toBeGreaterThan(0);
    });

    it("lists research sources", () => {
      const status = engine.getStatus();

      expect(status.knowledge_sources.some(s => s.includes("Springer"))).toBe(true);
      expect(status.knowledge_sources.some(s => s.includes("Makino"))).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMDeepNeuralReasoningEngine).toBeDefined();
      expect(wireEDMDeepNeuralReasoningEngine).toBeInstanceOf(
        WireEDMDeepNeuralReasoningEngine
      );
    });
  });

  // ============================================================================
  // MATERIAL COVERAGE TESTS
  // ============================================================================

  describe("material coverage", () => {
    const materials = ["D2", "A2", "S7", "M2", "H13", "tungsten_carbide", "graphite"];

    for (const material of materials) {
      it(`reasons about ${material}`, async () => {
        const result = await engine.reason({
          question: `Parameters for ${material}`,
          context: { material, thickness_mm: 25 },
        });

        expect(result.final_answer.recommendation).toBeTruthy();
        expect(result.final_answer.confidence).toBeGreaterThan(0);
      });
    }
  });

  // ============================================================================
  // THICKNESS RANGE TESTS
  // ============================================================================

  describe("thickness ranges", () => {
    const thicknesses = [1, 5, 10, 25, 50, 75, 100];

    for (const thickness of thicknesses) {
      it(`handles ${thickness}mm thickness`, async () => {
        const result = await engine.reason({
          question: `Settings for ${thickness}mm`,
          context: { thickness_mm: thickness },
        });

        expect(result.final_answer.parameters.num_passes).toBeGreaterThan(0);
      });
    }
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles missing context gracefully", async () => {
      const result = await engine.reason({
        question: "What settings should I use?",
        context: {},
      });

      expect(result.final_answer).toBeDefined();
    });

    it("handles very fine Ra target", async () => {
      const result = await engine.reason({
        question: "Can we achieve mirror finish?",
        context: { target_ra_um: 0.1 },
      });

      expect(result.alternative_approaches.some(
        a => a.approach.toLowerCase().includes("hybrid")
      )).toBe(true);
    });

    it("handles extreme thickness", async () => {
      const result = await engine.reason({
        question: "Settings for 150mm",
        context: { thickness_mm: 150 },
      });

      expect(result.physics_validation.some(
        c => c.constraint.includes("deflection")
      )).toBe(true);
    });
  });
});
