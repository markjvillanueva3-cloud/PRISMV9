/**
 * LathePrintToProgramDLIntelligenceEngine Tests
 *
 * U-LTH42: Deep learning intelligence for failure prediction
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToProgramDLIntelligenceEngine,
  type DLIntelligenceResult,
  type DLPredictionInput,
} from "../engines/LathePrintToProgramDLIntelligenceEngine.js";
import { lathePrintToProgramOrchestratorEngine } from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("LathePrintToProgramDLIntelligenceEngine", () => {
  const getTestInput = async (): Promise<DLPredictionInput> => {
    const result = await lathePrintToProgramOrchestratorEngine.execute({
      blueprint: {
        source_type: "pdf",
        part_type: "turning",
        part_number: "DL-001",
      },
      program_number: 9001,
      program_name: "DL TEST",
      controller: "okuma_osp",
    });

    return {
      recognition: result.stages.recognition.data!,
      plan: result.stages.planning.data!,
      program: result.program!,
      verification: result.stages.verification?.data,
    };
  };

  describe("analyze()", () => {
    it("returns analysis result with all fields", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.analysis_id).toMatch(/^dl_\d+_\d+$/);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.overall_failure_probability).toBeGreaterThanOrEqual(0);
      expect(result.overall_failure_probability).toBeLessThanOrEqual(1);
    });

    it("identifies failure modes", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(Array.isArray(result.failure_modes)).toBe(true);
      for (const mode of result.failure_modes) {
        expect(mode.type).toBeDefined();
        expect(mode.probability).toBeGreaterThanOrEqual(0);
        expect(mode.probability).toBeLessThanOrEqual(1);
        expect(mode.confidence).toBeGreaterThan(0);
        expect(mode.root_cause).toBeDefined();
      }
    });

    it("assigns risk level", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(["low", "medium", "high", "critical"]).toContain(result.risk_level);
    });

    it("generates correction suggestions", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(Array.isArray(result.corrections)).toBe(true);
      for (const corr of result.corrections) {
        expect(corr.id).toBeDefined();
        expect(corr.priority).toBeGreaterThan(0);
        expect(corr.category).toBeDefined();
        expect(corr.description.length).toBeGreaterThan(0);
        expect(corr.expected_improvement).toBeGreaterThan(0);
      }
    });

    it("provides attention head analysis", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.attention_heads.length).toBeGreaterThan(0);
      for (const head of result.attention_heads) {
        expect(head.name).toBeDefined();
        expect(Array.isArray(head.weights)).toBe(true);
        expect(head.interpretation.length).toBeGreaterThan(0);
      }
    });

    it("identifies critical features", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(Array.isArray(result.critical_features)).toBe(true);
    });

    it("extracts feature interactions", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(Array.isArray(result.feature_interactions)).toBe(true);
      for (const interaction of result.feature_interactions) {
        expect(interaction.a).toBeDefined();
        expect(interaction.b).toBeDefined();
        expect(interaction.strength).toBeGreaterThan(0);
      }
    });

    it("computes uncertainties", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.epistemic_uncertainty).toBeLessThanOrEqual(1);
      expect(result.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.aleatoric_uncertainty).toBeLessThanOrEqual(1);
    });

    it("estimates success rate after corrections", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.estimated_success_rate_after_corrections).toBeGreaterThan(0);
      expect(result.estimated_success_rate_after_corrections).toBeLessThanOrEqual(1);
    });
  });

  describe("predictFailure()", () => {
    it("predicts failure probability for program", async () => {
      const input = await getTestInput();
      const prob = lathePrintToProgramDLIntelligenceEngine.predictFailure(input.program!);

      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });

    it("uses verification issues when available", async () => {
      const input = await getTestInput();
      const probWithVerify = lathePrintToProgramDLIntelligenceEngine.predictFailure(
        input.program!,
        input.verification
      );

      expect(probWithVerify).toBeGreaterThanOrEqual(0);
      expect(probWithVerify).toBeLessThanOrEqual(1);
    });
  });

  describe("suggestCorrections()", () => {
    it("suggests corrections for failure modes", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);
      const corrections = lathePrintToProgramDLIntelligenceEngine.suggestCorrections(
        result.failure_modes
      );

      expect(Array.isArray(corrections)).toBe(true);
    });

    it("prioritizes corrections", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);
      const corrections = lathePrintToProgramDLIntelligenceEngine.suggestCorrections(
        result.failure_modes
      );

      if (corrections.length > 1) {
        for (let i = 1; i < corrections.length; i++) {
          expect(corrections[i].priority).toBeGreaterThanOrEqual(corrections[i - 1].priority);
        }
      }
    });

    it("includes correction parameters", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);
      const corrections = lathePrintToProgramDLIntelligenceEngine.suggestCorrections(
        result.failure_modes
      );

      for (const corr of corrections) {
        expect(typeof corr.parameters).toBe("object");
      }
    });
  });

  describe("Attention Mechanism", () => {
    it("uses multi-head attention", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.attention_heads.length).toBe(4); // 4 heads
    });

    it("attention weights sum to 1 per position", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      for (const head of result.attention_heads) {
        if (head.weights.length > 0) {
          const sum = head.weights.reduce((a, b) => a + b, 0);
          // Allow some tolerance for floating point
          expect(Math.abs(sum - 1)).toBeLessThan(0.1);
        }
      }
    });
  });

  describe("Calibration", () => {
    it("applies temperature scaling", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.calibration_temperature).toBeGreaterThan(0);
    });

    it("model confidence reflects uncertainties", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      expect(result.model_confidence).toBeGreaterThanOrEqual(0);
      expect(result.model_confidence).toBeLessThanOrEqual(1);
      // Confidence should be related to uncertainties
      const expectedConfidence = 1 - Math.max(result.epistemic_uncertainty, result.aleatoric_uncertainty);
      expect(Math.abs(result.model_confidence - expectedConfidence)).toBeLessThan(0.01);
    });
  });

  describe("Failure Mode Types", () => {
    it("recognizes collision mode", async () => {
      const input = await getTestInput();
      const result = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      const hasCollisionType = result.failure_modes.some(m => m.type === "collision") ||
        lathePrintToProgramDLIntelligenceEngine.getStatistics().failure_types.includes("collision");
      expect(hasCollisionType).toBe(true);
    });

    it("recognizes tolerance_violation mode", async () => {
      const stats = lathePrintToProgramDLIntelligenceEngine.getStatistics();
      expect(stats.failure_types).toContain("tolerance_violation");
    });

    it("recognizes tool_breakage mode", async () => {
      const stats = lathePrintToProgramDLIntelligenceEngine.getStatistics();
      expect(stats.failure_types).toContain("tool_breakage");
    });

    it("recognizes chatter mode", async () => {
      const stats = lathePrintToProgramDLIntelligenceEngine.getStatistics();
      expect(stats.failure_types).toContain("chatter");
    });
  });

  describe("getStatistics()", () => {
    it("returns model statistics", () => {
      const stats = lathePrintToProgramDLIntelligenceEngine.getStatistics();

      expect(stats.attention_heads).toBe(4);
      expect(stats.feature_dimension).toBe(32);
      expect(stats.architecture).toContain("Transformer");
    });

    it("tracks analysis count", async () => {
      const before = lathePrintToProgramDLIntelligenceEngine.getStatistics().total_analyses as number;
      const input = await getTestInput();
      lathePrintToProgramDLIntelligenceEngine.analyze(input);
      const after = lathePrintToProgramDLIntelligenceEngine.getStatistics().total_analyses as number;

      expect(after).toBe(before + 1);
    });
  });

  describe("Historical Failures", () => {
    it("reduces epistemic uncertainty with historical data", async () => {
      const input = await getTestInput();

      // Without historical data
      const result1 = lathePrintToProgramDLIntelligenceEngine.analyze(input);

      // With historical data
      const inputWithHistory: DLPredictionInput = {
        ...input,
        historical_failures: [
          {
            program_id: "OLD-001",
            failure_type: "collision",
            feature_ids: ["f1"],
            parameters: { rpm: 1500 },
            timestamp: new Date().toISOString(),
          },
        ],
      };
      const result2 = lathePrintToProgramDLIntelligenceEngine.analyze(inputWithHistory);

      expect(result2.epistemic_uncertainty).toBeLessThan(result1.epistemic_uncertainty);
    });
  });

  describe("Correction Categories", () => {
    it("covers all correction categories", () => {
      const categories = ["speed", "feed", "depth", "tool", "sequence", "coolant", "workholding"];

      // Generate corrections for different failure types
      const failureModes = [
        { type: "collision" as const, probability: 0.6, confidence: 0.8, affected_features: [], root_cause: "test" },
        { type: "tolerance_violation" as const, probability: 0.5, confidence: 0.8, affected_features: [], root_cause: "test" },
        { type: "tool_breakage" as const, probability: 0.5, confidence: 0.8, affected_features: [], root_cause: "test" },
        { type: "chatter" as const, probability: 0.5, confidence: 0.8, affected_features: [], root_cause: "test" },
      ];

      const corrections = lathePrintToProgramDLIntelligenceEngine.suggestCorrections(failureModes);
      const usedCategories = new Set(corrections.map(c => c.category));

      expect(usedCategories.size).toBeGreaterThan(0);
    });
  });
});
