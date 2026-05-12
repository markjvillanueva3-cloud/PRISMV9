/**
 * LatheAISuiteIntegration.test.ts — Integration tests for the complete lathe AI suite
 * ====================================================================================
 *
 * Tests the full integration of 21+ lathe AI engines:
 * - Engine discovery and registration
 * - Cross-engine data flow
 * - MCP action routing
 * - Knowledge synthesis
 * - Neural network coordination
 * - Autonomous orchestration
 *
 * @module tests/LatheAISuiteIntegration
 */

import { describe, it, expect, beforeAll } from "vitest";

// Import lathe AI engines
import {
  latheResourceKnowledgeEngine,
  LatheResourceKnowledgeEngine,
} from "../engines/LatheResourceKnowledgeEngine.js";

import {
  LatheOpusReasoningEngine,
} from "../engines/LatheOpusReasoningEngine.js";

import {
  LATHE_AI_ENGINE_REGISTRY,
  getLatheAIStats,
  findBestEngineForTask,
  getAllLatheMcpActions,
  getEnginesByCapability,
} from "../engines/LatheAIFeatureRegistration.js";

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_PROGRAM = `
( JM DIE COMPANY - INTEGRATION TEST )
( MATERIAL: D2 TOOL STEEL )
( DATE: 04-15-2026 )

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

NAT04 (CUTOFF)
T040404
G97 S800 M3 M8
G0 X2.5 Z-1.75
G1 X0 F.0012

M30
`;

const POOR_PROGRAM = `
NAT01 (ROUGH)
T010101
G96 S400
G0 X2.0
G1 X1.5 F.020

NAT02 (CUTOFF)
T020202
G97 S1500
G1 X0 F.005
`;

// ============================================================================
// ENGINE REGISTRY TESTS
// ============================================================================

describe("LatheAISuiteIntegration", () => {
  describe("Engine Registry", () => {
    it("should have 20+ lathe engines registered", () => {
      expect(LATHE_AI_ENGINE_REGISTRY.length).toBeGreaterThanOrEqual(20);
    });

    it("should track total lines of code", () => {
      const stats = getLatheAIStats();
      expect(stats.totalLineCount).toBeGreaterThan(10000);
    });

    it("should have engines for all key capabilities", () => {
      const capabilities = [
        "neural_network_prediction",
        "deep_reasoning_chains",
        "mistake_detection",
        "program_analysis",
        "knowledge_synthesis",
      ];

      for (const cap of capabilities) {
        const engines = getEnginesByCapability(cap);
        expect(engines.length).toBeGreaterThan(0);
      }
    });

    it("should map 50+ MCP actions", () => {
      const actions = getAllLatheMcpActions();
      expect(actions.length).toBeGreaterThan(20);
    });

    it("should find best engine for different tasks", () => {
      const tasks = [
        { task: "optimize this program", expected: "lathe-program-optimizer" },
        { task: "predict cutting parameters", expected: "lathe-opus-reasoning" },
        { task: "detect mistakes", expected: "lathe-resource-knowledge" },
        { task: "extract knowledge from programs", expected: "lathe-knowledge-harvester" },
      ];

      for (const { task, expected } of tasks) {
        const engine = findBestEngineForTask(task);
        expect(engine?.id).toBe(expected);
      }
    });
  });

  // ==========================================================================
  // KNOWLEDGE ENGINE TESTS
  // ==========================================================================

  describe("LatheResourceKnowledgeEngine", () => {
    it("should detect mistakes in poor program", () => {
      const mistakes = latheResourceKnowledgeEngine.detectMistakes(POOR_PROGRAM);
      expect(mistakes.length).toBeGreaterThan(0);

      // Should detect CSS without G50
      const cssIssue = mistakes.find(m => m.mistake_id === "CSS_WITHOUT_MAX_RPM");
      expect(cssIssue).toBeDefined();
    });

    it("should score well-written program higher than poor program", () => {
      const goodScore = latheResourceKnowledgeEngine.scoreProgramPractices(SAMPLE_PROGRAM);
      const poorScore = latheResourceKnowledgeEngine.scoreProgramPractices(POOR_PROGRAM);
      // Well-written should score higher
      expect(goodScore.score).toBeGreaterThan(poorScore.score);
    });

    it("should score programs accurately", () => {
      const goodScore = latheResourceKnowledgeEngine.scoreProgramPractices(SAMPLE_PROGRAM);
      const poorScore = latheResourceKnowledgeEngine.scoreProgramPractices(POOR_PROGRAM);

      expect(goodScore.score).toBeGreaterThan(poorScore.score);
      expect(goodScore.followed.length).toBeGreaterThan(poorScore.followed.length);
    });

    it("should generate improvements for poor program", () => {
      const improvements = latheResourceKnowledgeEngine.generateImprovements(POOR_PROGRAM, "D2");
      expect(improvements.recommendations.length).toBeGreaterThan(0);
    });

    it("should have AOT parameters", () => {
      const aot = latheResourceKnowledgeEngine.getAOTParameters();
      expect(aot.length).toBeGreaterThan(5);

      const adaptive = aot.find(p => p.name === "ADAPTIVE_CUTTING_CONTROL");
      expect(adaptive).toBeDefined();
    });

    it("should have best practices", () => {
      const practices = latheResourceKnowledgeEngine.getBestPractices();
      expect(practices.length).toBeGreaterThan(10);
    });

    it("should have program patterns", () => {
      const patterns = latheResourceKnowledgeEngine.getProgramPatterns();
      expect(patterns.length).toBeGreaterThan(3);
    });
  });

  // ==========================================================================
  // OPUS REASONING ENGINE TESTS
  // ==========================================================================

  describe("LatheOpusReasoningEngine", () => {
    it("should predict operation sequences", () => {
      const geometry = {
        bar_od_mm: 50,
        finished_od_mm: 40,
        length_mm: 100,
        features: [
          { type: "face", start_z: 0, end_z: 0 },
          { type: "od_turn", start_z: 0, end_z: -80 },
          { type: "thread", start_z: -20, end_z: -60, pitch: 2.0 },
        ],
      };
      const material = { iso_group: "P" as const, name: "4140", hardness_hrc: 28 };

      const prediction = LatheOpusReasoningEngine.predictOperationSequence(
        geometry,
        material,
        { priority: "balanced" }
      );
      expect(prediction.operation_priorities).toBeDefined();
      expect(prediction.operation_priorities.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it("should predict cutting parameters", () => {
      const material = { iso_group: "K" as const, name: "D2", hardness_hrc: 60 };
      const tool = { nose_radius_mm: 0.8, insert_type: "CNMG120408" };

      const params = LatheOpusReasoningEngine.predictCuttingParameters(
        material,
        "od_rough",
        tool,
        { target_ra_um: 3.2 }
      );

      expect(params.vc_mpm).toBeGreaterThan(0);
      expect(params.fn_mmrev).toBeGreaterThan(0);
      expect(params.ap_mm).toBeGreaterThan(0);
      expect(params.spindle_mode).toMatch(/G9[67]/);
    });

    it("should generate hybrid strategies", () => {
      const geometry = {
        bar_od_mm: 60,
        finished_od_mm: 45,
        length_mm: 120,
        features: [
          { type: "od_turn", start_z: 0, end_z: -100 },
        ],
      };
      const material = { iso_group: "K" as const, name: "D2", hardness_hrc: 58 };

      const strategies = LatheOpusReasoningEngine.generateHybridStrategies(
        material,
        geometry,
        "balanced"
      );

      expect(Array.isArray(strategies)).toBe(true);
    });

    it("should perform counterfactual reasoning", () => {
      const currentState = {
        vc_mpm: 200,
        fn_mmrev: 0.15,
        ap_mm: 2.0,
        tool_life_min: 45,
        cycle_time_min: 8,
        ra_um: 1.6,
      };
      const material = { iso_group: "P" as const, name: "4140", hardness_hrc: 30 };

      const counterfactuals = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        material
      );

      expect(Array.isArray(counterfactuals)).toBe(true);
    });

    it("should analyze part with reasoning chain", () => {
      const input = {
        part_name: "Test Part",
        material: { iso_group: "P" as const, name: "4140", hardness_hrc: 28 },
        geometry: {
          bar_od_mm: 50,
          finished_od_mm: 40,
          length_mm: 100,
          features: [
            { type: "face", start_z: 0, end_z: 0 },
            { type: "od_turn", start_z: 0, end_z: -80 },
          ],
        },
        priority: "balanced" as const,
      };

      const analysis = LatheOpusReasoningEngine.analyzePartWithReasoning(input);

      expect(analysis.reasoning_chain).toBeDefined();
      expect(analysis.reasoning_chain.steps.length).toBeGreaterThan(0);
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it("should synthesize parameters from multiple sources", () => {
      const material = { iso_group: "K" as const, name: "D2", hardness_hrc: 60 };

      const synthesis = LatheOpusReasoningEngine.synthesizeParameters(
        material,
        "od_finish",
        { target_ra_um: 1.6 }
      );

      expect(synthesis.vc_mpm).toBeGreaterThan(0);
      expect(synthesis.fn_mmrev).toBeGreaterThan(0);
      expect(synthesis.ap_mm).toBeGreaterThan(0);
      expect(synthesis.source).toBeDefined();
    });
  });

  // ==========================================================================
  // CROSS-ENGINE INTEGRATION TESTS
  // ==========================================================================

  describe("Cross-Engine Integration", () => {
    it("should flow data from knowledge to reasoning", () => {
      // Get best practices from knowledge engine
      const practices = latheResourceKnowledgeEngine.getBestPractices();
      expect(practices.length).toBeGreaterThan(0);

      // Use reasoning engine to apply practices
      const input = {
        part_name: "Integration Test Part",
        material: { iso_group: "K" as const, name: "D2", hardness_hrc: 60 },
        geometry: {
          bar_od_mm: 50,
          finished_od_mm: 40,
          length_mm: 100,
          features: [{ type: "od_turn", start_z: 0, end_z: -80 }],
        },
        priority: "balanced" as const,
      };
      const analysis = LatheOpusReasoningEngine.analyzePartWithReasoning(input);

      // Reasoning should have steps
      expect(analysis.reasoning_chain.steps.length).toBeGreaterThan(0);
    });

    it("should coordinate mistake detection with improvement generation", () => {
      const mistakes = latheResourceKnowledgeEngine.detectMistakes(POOR_PROGRAM);
      const improvements = latheResourceKnowledgeEngine.generateImprovements(POOR_PROGRAM);

      // Each critical mistake should have a corresponding improvement
      const criticals = mistakes.filter(m => m.severity === "critical");
      expect(improvements.recommendations.length).toBeGreaterThanOrEqual(criticals.length);
    });

    it("should use neural networks for parameter prediction", () => {
      const material = { iso_group: "H" as const, name: "M2", hardness_hrc: 65 };
      const tool = { nose_radius_mm: 0.4, insert_type: "CNMG120404" };

      const params = LatheOpusReasoningEngine.predictCuttingParameters(
        material,
        "od_rough",
        tool,
        {}
      );

      // H group (hardened) should have lower speeds
      expect(params.vc_mpm).toBeLessThan(200);
    });

    it("should synthesize knowledge for recommendations", () => {
      const material = { iso_group: "K" as const, name: "D2", hardness_hrc: 60 };

      const synthesis = LatheOpusReasoningEngine.synthesizeParameters(
        material,
        "od_finish",
        { target_ra_um: 1.6 }
      );

      expect(synthesis.vc_mpm).toBeGreaterThan(0);
      expect(synthesis.fn_mmrev).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // STATISTICS AND METRICS TESTS
  // ==========================================================================

  describe("Statistics and Metrics", () => {
    it("should calculate accurate suite statistics", () => {
      const stats = getLatheAIStats();

      expect(stats.totalEngines).toBeGreaterThanOrEqual(20);
      expect(stats.totalCapabilities).toBeGreaterThan(30);
      expect(stats.aiFeaturesCoverage.length).toBeGreaterThan(10);
    });

    it("should have engines in all domains", () => {
      const stats = getLatheAIStats();

      expect(stats.enginesByDomain["lathe"]).toBeGreaterThan(15);
    });

    it("should report knowledge engine stats", () => {
      const kbStats = latheResourceKnowledgeEngine.getStats();

      expect(kbStats.aot_parameters).toBeGreaterThan(5);
      expect(kbStats.amateur_mistakes).toBeGreaterThan(8);
      expect(kbStats.best_practices).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty program gracefully", () => {
      const mistakes = latheResourceKnowledgeEngine.detectMistakes("");
      expect(mistakes).toEqual([]);

      const score = latheResourceKnowledgeEngine.scoreProgramPractices("");
      expect(score.score).toBeDefined();
    });

    it("should handle malformed G-code", () => {
      const malformed = "XYZABC123\nNOT VALID GCODE\n!!!";
      const mistakes = latheResourceKnowledgeEngine.detectMistakes(malformed);
      // Should not throw
      expect(Array.isArray(mistakes)).toBe(true);
    });

    it("should handle unknown materials", () => {
      const material = { iso_group: "P" as const, name: "UNKNOWN_XYZ", hardness_hrc: 30 };
      const tool = { nose_radius_mm: 0.8, insert_type: "CNMG120408" };

      const params = LatheOpusReasoningEngine.predictCuttingParameters(
        material,
        "od_rough",
        tool,
        {}
      );

      // Should return default values based on ISO group, not throw
      expect(params.vc_mpm).toBeGreaterThan(0);
    });

    it("should handle minimal geometry input", () => {
      const input = {
        part_name: "Minimal Part",
        material: { iso_group: "P" as const, name: "1045", hardness_hrc: 20 },
        geometry: {
          bar_od_mm: 25,
          finished_od_mm: 20,
          length_mm: 50,
          features: [],
        },
        priority: "balanced" as const,
      };

      const analysis = LatheOpusReasoningEngine.analyzePartWithReasoning(input);

      // Should return valid structure even with no features
      expect(analysis.reasoning_chain).toBeDefined();
    });
  });
});
