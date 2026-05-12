/**
 * MillingReasoningDefaultEngine Tests — MILL-AGI-P0/U-P0.2-01
 *
 * Tests the 5-step reasoning chain: gather → hypothesize → validate → justify → commit
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MillingReasoningDefaultEngine,
  type ReasoningContext,
  type ReasoningResult,
} from "../engines/MillingReasoningDefaultEngine.js";
import { millingReasoningTraceLedgerEngine } from "../engines/MillingReasoningTraceLedgerEngine.js";

describe("MillingReasoningDefaultEngine", () => {
  beforeEach(() => {
    millingReasoningTraceLedgerEngine.resetForTests();
  });

  describe("executeWithReasoning", () => {
    it("should execute 5-step reasoning chain successfully", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "P-steel",
        tool: {
          diameter: 10,
          type: "endmill",
          flutes: 4,
        },
        parameters: { ap: 2, fz: 0.1, Vc: 150 },
        objective: "maximize MRR",
      };

      const mockExecutor = vi.fn().mockResolvedValue({
        Fc: 450,
        Ft: 180,
        unit: "N",
      });

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        mockExecutor,
        { ap: 2, fz: 0.1 },
      );

      expect(result.success).toBe(true);
      expect(result.reasoning_trace.steps.length).toBeGreaterThanOrEqual(5);
      expect(result.reasoning_trace.awareness_consulted).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockExecutor).toHaveBeenCalled();
    });

    it("should produce steps with required properties", async () => {
      const context: ReasoningContext = {
        operation: "calculateToolLife",
        material: "M-stainless",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateToolLife",
        context,
        async () => ({ life_min: 45 }),
        {},
      );

      for (const step of result.reasoning_trace.steps) {
        expect(step).toHaveProperty("step_number");
        expect(step).toHaveProperty("question");
        expect(step).toHaveProperty("reasoning");
        expect(step).toHaveProperty("evidence_sources");
        expect(step).toHaveProperty("conclusion");
        expect(step).toHaveProperty("confidence");
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should include formulas cited in trace", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "P-steel",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 500 }),
        {},
      );

      expect(result.reasoning_trace.formulas_cited.length).toBeGreaterThan(0);
      expect(result.reasoning_trace.formulas_cited).toContain("kienzle-tangential");
    });

    it("should include provenance metadata", async () => {
      const context: ReasoningContext = {
        operation: "calculateStability",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateStability",
        context,
        async () => ({ stable: true }),
        {},
      );

      expect(result._provenance).toBeDefined();
      expect(result._provenance.engine).toBe("MillingReasoningDefaultEngine");
      expect(result._provenance.version).toBeDefined();
      expect(result._provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should include awareness metadata", async () => {
      const context: ReasoningContext = {
        operation: "calculateSurfaceFinish",
        material: "aluminum",
        objective: "surface quality",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateSurfaceFinish",
        context,
        async () => ({ Ra: 1.6 }),
        {},
      );

      expect(result._awareness).toBeDefined();
      expect(result._awareness?.top_matches).toBeDefined();
      expect(result._awareness?.suggestions).toBeDefined();
    });

    it("should handle executor errors gracefully", async () => {
      const context: ReasoningContext = {
        operation: "calculateForces",
      };

      const failingExecutor = vi.fn().mockRejectedValue(new Error("Physics calculation failed"));

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateForces",
        context,
        failingExecutor,
        {},
      );

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.warnings.some(w => w.includes("Physics calculation failed"))).toBe(true);
    });

    it("should track tribal tips used", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "aluminum",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 200 }),
        {},
      );

      expect(result.reasoning_trace.tribal_tips_used).toBeGreaterThanOrEqual(0);
    });

    it("should return reasoning metadata", async () => {
      const context: ReasoningContext = {
        operation: "calculateDeflection",
        tool: { diameter: 6, type: "endmill" },
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateDeflection",
        context,
        async () => ({ deflection_mm: 0.015 }),
        {},
      );

      expect(result._reasoning).toBeDefined();
      expect(result._reasoning?.hypotheses_count).toBeGreaterThan(0);
      expect(result._reasoning?.proof_chain_length).toBeGreaterThan(0);
    });
  });

  describe("validateReasoningDepth", () => {
    it("should return true for sufficient reasoning depth", () => {
      const steps = [
        { step_number: 1, question: "Q1", reasoning: "R1", evidence_sources: [], conclusion: "C1", confidence: 0.9 },
        { step_number: 2, question: "Q2", reasoning: "R2", evidence_sources: [], conclusion: "C2", confidence: 0.8 },
        { step_number: 3, question: "Q3", reasoning: "R3", evidence_sources: [], conclusion: "C3", confidence: 0.85 },
      ];

      expect(MillingReasoningDefaultEngine.validateReasoningDepth(steps)).toBe(true);
    });

    it("should return false for insufficient reasoning depth", () => {
      const steps = [
        { step_number: 1, question: "Q1", reasoning: "R1", evidence_sources: [], conclusion: "C1", confidence: 0.9 },
        { step_number: 2, question: "Q2", reasoning: "R2", evidence_sources: [], conclusion: "C2", confidence: 0.8 },
      ];

      expect(MillingReasoningDefaultEngine.validateReasoningDepth(steps)).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("should return engine configuration", () => {
      const config = MillingReasoningDefaultEngine.getConfig();

      expect(config.version).toBeDefined();
      expect(config.minSteps).toBe(3);
      expect(config.targetSteps).toBe(5);
      expect(config.confidenceThreshold).toBe(0.65);
      expect(config.safetyThreshold).toBe(0.70);
    });
  });

  describe("context handling", () => {
    it("should handle titanium-specific suggestions", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "titanium Ti-6Al-4V",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 800 }),
        {},
      );

      expect(result._awareness?.suggestions?.some(
        s => s.toLowerCase().includes("titanium") || s.toLowerCase().includes("coolant"),
      )).toBe(true);
    });

    it("should handle micro-milling context", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        tool: { diameter: 0.3, type: "micro-endmill" },
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 5 }),
        {},
      );

      expect(result._awareness?.suggestions?.some(
        s => s.toLowerCase().includes("micro") || s.toLowerCase().includes("size effect"),
      )).toBe(true);
    });

    it("should handle surface finish objective", async () => {
      const context: ReasoningContext = {
        operation: "calculateSurfaceFinish",
        objective: "best surface quality",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateSurfaceFinish",
        context,
        async () => ({ Ra: 0.8 }),
        {},
      );

      expect(result._awareness?.suggestions?.some(
        s => s.toLowerCase().includes("finish") || s.toLowerCase().includes("surface"),
      )).toBe(true);
    });
  });

  describe("hypothesis generation", () => {
    it("should generate multiple hypotheses", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "steel",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 400 }),
        {},
      );

      expect(result._reasoning?.hypotheses_count).toBeGreaterThanOrEqual(2);
    });

    it("should always include conservative fallback hypothesis", async () => {
      const context: ReasoningContext = {
        operation: "calculateThermal",
      };

      const result = await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateThermal",
        context,
        async () => ({ temp_C: 450 }),
        {},
      );

      // The conservative hypothesis ensures we always have a safe fallback
      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("trace logging", () => {
    it("should log trace to ledger", async () => {
      const context: ReasoningContext = {
        operation: "calculateMillingForces",
        material: "P-steel",
      };

      await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateMillingForces",
        context,
        async () => ({ Fc: 500 }),
        {},
      );

      const traces = millingReasoningTraceLedgerEngine.getRecent(10);
      expect(traces.length).toBeGreaterThan(0);
      expect(traces[traces.length - 1].action).toBe("calculateMillingForces");
    });

    it("should include reasoning steps in trace", async () => {
      const context: ReasoningContext = {
        operation: "calculateDeflection",
      };

      await MillingReasoningDefaultEngine.executeWithReasoning(
        "calculateDeflection",
        context,
        async () => ({ delta: 0.02 }),
        {},
      );

      const traces = millingReasoningTraceLedgerEngine.getRecent(10);
      const lastTrace = traces[traces.length - 1];
      expect(lastTrace.reasoning_steps).toBeDefined();
      expect(lastTrace.reasoning_steps?.length).toBeGreaterThanOrEqual(3);
    });
  });
});
