/**
 * LatheAIOrchestrationIntegration.test.ts — Full orchestration integration tests
 * ================================================================================
 *
 * Tests the complete lathe AI orchestration pipeline with all engines.
 *
 * @module tests/LatheAIOrchestrationIntegration
 */

import { describe, it, expect, beforeAll } from "vitest";

import {
  latheUnifiedAIOrchestrator,
  orchestrateLatheAI,
} from "../engines/LatheUnifiedAIOrchestrator.js";

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_PROGRAM = `
( JM DIE COMPANY - ORCHESTRATION TEST )
( MATERIAL: D2 TOOL STEEL )
NAT01 (FACE)
T010101
G50 S3500
G96 S250 M3 M8
G0 X2.5 Z0.1
G1 X0 Z0 F.008
G0 X2.5 Z0.1

NAT02 (OD ROUGH)
T020202
G50 S3000
G96 S200 M3 M8
G71 U0.100 R0.020
G71 P100 Q200 U0.010 W0.005 F.010
N100 G0 X0.750
G1 Z0
X1.000 Z-0.125
Z-1.500
N200 X2.500

NAT03 (OD FINISH)
T030303
G50 S4000
G96 S300 M3 M8
G70 P100 Q200

M30
`;

const POOR_PROGRAM = `
NAT01 (ROUGH)
T010101
G96 S400
G0 X2.0
G1 X1.5 F.020
`;

// ============================================================================
// ORCHESTRATION TESTS
// ============================================================================

describe("LatheAIOrchestrationIntegration", () => {
  describe("Unified Orchestrator", () => {
    it("should get orchestrator instance", () => {
      expect(latheUnifiedAIOrchestrator).toBeDefined();
    });

    it("should report orchestrator stats", () => {
      const stats = latheUnifiedAIOrchestrator.getStats();

      expect(stats.registered_engines).toBeGreaterThan(10);
      expect(stats.task_types.length).toBeGreaterThan(5);
      expect(stats.capabilities.length).toBeGreaterThan(10);
    });

    it("should find engine for capability", () => {
      const engine = latheUnifiedAIOrchestrator.findEngineForCapability("mistake_detection");
      expect(engine).toBeDefined();
      expect(engine?.id).toBe("lathe-resource-knowledge");
    });

    it("should get engines with capability", () => {
      const engines = latheUnifiedAIOrchestrator.getEnginesWithCapability("neural_prediction");
      expect(engines.length).toBeGreaterThan(0);
    });
  });

  describe("Program Analysis", () => {
    it("should analyze program with orchestration", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM, material: "D2" }
      );

      expect(result.task_type).toBe("analyze_program");
      expect(result.engines_used.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("should detect issues in poor program", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: POOR_PROGRAM }
      );

      expect(result.results).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should include reasoning chain", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "deep", explain_reasoning: true }
      );

      expect(result.reasoning_chain.length).toBeGreaterThan(0);

      for (const step of result.reasoning_chain) {
        expect(step.engine).toBeDefined();
        expect(step.action).toBeDefined();
        expect(step.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Program Optimization", () => {
    it("should optimize poor program", async () => {
      const result = await orchestrateLatheAI(
        "optimize_program",
        { program: POOR_PROGRAM, material: "D2" }
      );

      expect(result.task_type).toBe("optimize_program");
      expect(result.engines_used).toContain("lathe-program-optimizer");
    });

    it("should use multiple engines for optimization", async () => {
      const result = await orchestrateLatheAI(
        "optimize_program",
        { program: SAMPLE_PROGRAM },
        { depth: "deep" }
      );

      expect(result.engines_used.length).toBeGreaterThan(1);
    });
  });

  describe("Parameter Recommendations", () => {
    it("should recommend parameters for material", async () => {
      const result = await orchestrateLatheAI(
        "recommend_parameters",
        { material: "D2", operation: "od_rough" }
      );

      expect(result.task_type).toBe("recommend_parameters");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should use knowledge graph for recommendations", async () => {
      const result = await orchestrateLatheAI(
        "recommend_parameters",
        { material: "4140", operation: "od_finish" }
      );

      expect(result.engines_used.length).toBeGreaterThan(0);
    });
  });

  describe("Issue Diagnosis", () => {
    it("should diagnose symptoms", async () => {
      const result = await orchestrateLatheAI(
        "diagnose_issue",
        { symptoms: ["chatter marks", "poor surface finish"] }
      );

      expect(result.task_type).toBe("diagnose_issue");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Outcome Prediction", () => {
    it("should predict outcomes", async () => {
      const result = await orchestrateLatheAI(
        "predict_outcome",
        {
          material: "D2",
          operation: "od_rough",
          parameters: { vc: 150, feed: 0.12, doc: 2.0 }
        }
      );

      expect(result.task_type).toBe("predict_outcome");
    });
  });

  describe("Knowledge Extraction", () => {
    it("should extract knowledge", async () => {
      const result = await orchestrateLatheAI(
        "extract_knowledge",
        { material: "D2" }
      );

      expect(result.task_type).toBe("extract_knowledge");
      expect(result.engines_used).toContain("lathe-jmdie-knowledge");
    });
  });

  describe("Depth Modes", () => {
    it("should execute quick mode faster", async () => {
      const quickStart = Date.now();
      await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "quick" }
      );
      const quickTime = Date.now() - quickStart;

      const deepStart = Date.now();
      await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "deep" }
      );
      const deepTime = Date.now() - deepStart;

      // Quick should use fewer engines
      expect(quickTime).toBeLessThanOrEqual(deepTime + 100); // Allow some variance
    });

    it("should use more engines in deep mode", async () => {
      const quickResult = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "quick" }
      );

      const deepResult = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "deep" }
      );

      expect(deepResult.engines_used.length).toBeGreaterThanOrEqual(
        quickResult.engines_used.length
      );
    });
  });

  describe("Result Synthesis", () => {
    it("should synthesize results from multiple engines", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM },
        { depth: "standard" }
      );

      expect(result.results.synthesis).toBeDefined();
      expect((result.results.synthesis as any).engines_count).toBeGreaterThan(0);
    });

    it("should calculate combined confidence", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM }
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty program", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: "" }
      );

      expect(result).toBeDefined();
      expect(result.task_type).toBe("analyze_program");
    });

    it("should handle unknown material", async () => {
      const result = await orchestrateLatheAI(
        "recommend_parameters",
        { material: "UNKNOWN_XYZ", operation: "od_rough" }
      );

      expect(result).toBeDefined();
    });

    it("should handle missing input gracefully", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        {}
      );

      expect(result).toBeDefined();
    });
  });

  describe("Execution Time Tracking", () => {
    it("should track execution time", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM }
      );

      // Execution can be < 1ms, so check it's a number >= 0
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(typeof result.execution_time_ms).toBe("number");
    });

    it("should track per-engine duration", async () => {
      const result = await orchestrateLatheAI(
        "analyze_program",
        { program: SAMPLE_PROGRAM }
      );

      for (const step of result.reasoning_chain) {
        expect(step.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
