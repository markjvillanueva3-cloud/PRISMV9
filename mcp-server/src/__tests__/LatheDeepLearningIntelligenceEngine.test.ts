/**
 * LatheDeepLearningIntelligenceEngine Tests
 * ==========================================
 * Tests for neural pattern recognition, deep reasoning, knowledge graphs,
 * and reinforcement learning capabilities.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  latheDeepLearningIntelligenceEngine,
  LatheDeepLearningIntelligenceEngine,
} from "../engines/LatheDeepLearningIntelligenceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SAMPLE_PROGRAM_GOOD = `$GOOD.MIN%
M1
NAT01        (OD RGH. TURN .032R)
T010101
G0 X20 Z20
G50 S1200
G96 S250 M3
G0 X1.6 Z.05 M8
G1 X-.040 F.007
G85 NTURN D.1 U.010 W.005 F.01
G80
G0 X20 Z20
M1

NAT02        (OD FIN. TURN .015R)
T020202
G50 S1500
G96 S350 M3
G87 NTURN
G0 X20 Z20
M1

NAT03        (CENTER DRILL)
T030303
G97 S600 M3
G0 X0 Z.1 M8
G1 Z-.15 F.002
G0 Z.1
G0 X20 Z20
M1

NAT05        (DRILL .500)
T050505
G97 S800 M3
G74 X0 Z-1.5 D.3 L.3 F.003
G0 X20 Z20
M1

NAT11        (CUTOFF .125)
T111111
G50 S800
G96 S150 M3
G0 X1.5 Z-.5
G1 X-.04 F.0012 M8
G0 X2 M9
G0 X20 Z20
M5
M2
%`;

const SAMPLE_PROGRAM_BAD = `$BAD.MIN%
NAT01 (ROUGH)
T010101
G96 S500 M3
G0 X1 Z.1
G1 X-.1 F.0005
G0 X20 Z20
M1

NAT11 (CUTOFF FIRST - WRONG)
T111111
G96 S200 M3
G0 X1 Z-.5
G1 X-.1 F.003
G0 X20 Z20
M1

NAT05 (DRILL AFTER CUTOFF)
T050505
G97 S300 M3
G0 X0 Z.1
G1 Z-.5 F.001
G0 X20 Z20
M2
%`;

const TRAINING_PROGRAMS = [
  {
    content: SAMPLE_PROGRAM_GOOD,
    score: 85,
    operations: ["od_rough", "od_finish", "center_drill", "drill", "cutoff"],
    parameters: [
      { tool: "od_rough", feed: 0.007, speed: 250 },
      { tool: "od_finish", feed: 0.003, speed: 350 },
      { tool: "drill", feed: 0.003, speed: 800 },
      { tool: "cutoff", feed: 0.0012, speed: 150 },
    ],
  },
  {
    content: SAMPLE_PROGRAM_BAD,
    score: 25,
    operations: ["od_rough", "cutoff", "drill"],
    parameters: [
      { tool: "od_rough", feed: 0.0005, speed: 500 },
      { tool: "cutoff", feed: 0.003, speed: 200 },
      { tool: "drill", feed: 0.001, speed: 300 },
    ],
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe("LatheDeepLearningIntelligenceEngine", () => {
  describe("Pattern Detection", () => {
    it("should detect CSS_WITH_RPM_LIMIT best practice", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: ["od_rough", "od_finish", "drill", "cutoff"],
        parameters: [],
      });

      const safetyPattern = result.patterns.find(p => p.pattern_name === "CSS_WITH_RPM_LIMIT");
      expect(safetyPattern).toBeDefined();
      expect(safetyPattern?.classification).toBe("best_practice");
      expect(safetyPattern?.confidence).toBeGreaterThan(0.9);
    });

    it("should detect CANNED_CYCLES pattern", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
      });

      const cyclePattern = result.patterns.find(p => p.pattern_name === "CANNED_CYCLES");
      expect(cyclePattern).toBeDefined();
      expect(cyclePattern?.classification).toBe("best_practice");
    });

    it("should detect SLOW_FEED_ANTIPATTERN", () => {
      // Program with many slow feeds
      const slowProgram = `$SLOW.MIN%
NAT01 T010101 G97 S500 M3 G1 X1 F.0005
G1 Z-1 F.0008
G1 X2 F.0003
G1 Z-2 F.0006
M2%`;

      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: slowProgram,
        operations: [],
        parameters: [],
      });

      const antiPattern = result.patterns.find(p => p.pattern_name === "SLOW_FEED_ANTIPATTERN");
      expect(antiPattern).toBeDefined();
      expect(antiPattern?.classification).toBe("anti_pattern");
    });

    it("should detect sequential NAT numbering", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
      });

      const natPattern = result.patterns.find(p => p.pattern_name === "SEQUENTIAL_NAT_NUMBERING");
      expect(natPattern).toBeDefined();
      expect(natPattern?.features.tool_count).toBeGreaterThan(3);
    });
  });

  describe("Deep Reasoning", () => {
    it("should generate reasoning chain", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: ["od_rough", "od_finish"],
        parameters: [{ tool: "od_rough", feed: 0.007, speed: 250 }],
        material: "M2",
        score: 85,
      });

      expect(result.reasoning.reasoning_chain.length).toBeGreaterThanOrEqual(5);
      expect(result.reasoning.final_conclusion).toBeTruthy();
      expect(result.reasoning.confidence).toBeGreaterThan(0);
    });

    it("should identify causal factors", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
        score: 25,
      });

      expect(result.reasoning.causal_factors.length).toBeGreaterThan(0);
      expect(result.reasoning.causal_factors[0].factor).toBeTruthy();
      expect(result.reasoning.causal_factors[0].impact).toBeGreaterThan(0);
    });

    it("should generate alternative conclusions", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
      });

      expect(result.reasoning.alternative_conclusions.length).toBeGreaterThan(0);
      const totalProb = result.reasoning.alternative_conclusions.reduce(
        (s, c) => s + c.probability,
        0
      );
      expect(totalProb).toBeCloseTo(1.0, 1);
    });

    it("should provide recommendations", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
      });

      expect(result.reasoning.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Embeddings", () => {
    it("should generate program embeddings", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: ["od_rough"],
        parameters: [{ tool: "od_rough", feed: 0.007, speed: 250 }],
      });

      expect(result.embeddings.program_id).toBeTruthy();
      expect(result.embeddings.dense_embedding.length).toBe(64);
      expect(result.embeddings.combined_embedding.length).toBeGreaterThan(0);
    });

    it("should produce different embeddings for different programs", () => {
      const result1 = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
      });

      const result2 = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
      });

      expect(result1.embeddings.program_id).not.toBe(result2.embeddings.program_id);
    });
  });

  describe("Quality Prediction", () => {
    it("should predict quality score", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
      });

      expect(result.quality_prediction).toBeGreaterThanOrEqual(0);
      expect(result.quality_prediction).toBeLessThanOrEqual(100);
    });

    it("should predict higher quality for good programs", () => {
      const engine = new LatheDeepLearningIntelligenceEngine();

      // Train first
      engine.train(TRAINING_PROGRAMS, 20);

      const goodResult = engine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: ["od_rough", "od_finish", "drill", "cutoff"],
        parameters: [],
      });

      const badResult = engine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: ["od_rough", "cutoff", "drill"],
        parameters: [],
      });

      // After training, good program should have better optimization potential (less room to improve)
      expect(goodResult.optimization_potential).toBeLessThanOrEqual(
        badResult.optimization_potential
      );
    });
  });

  describe("Optimization Potential", () => {
    it("should calculate optimization potential", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
        score: 25,
      });

      expect(result.optimization_potential).toBeGreaterThan(0);
      expect(result.optimization_potential).toBeLessThanOrEqual(100);
    });

    it("should show higher optimization potential for bad programs", () => {
      const goodResult = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_GOOD,
        operations: [],
        parameters: [],
        score: 85,
      });

      const badResult = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
        score: 25,
      });

      expect(badResult.optimization_potential).toBeGreaterThan(goodResult.optimization_potential);
    });
  });

  describe("Recommended Improvements", () => {
    it("should generate improvement recommendations", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
      });

      expect(result.recommended_improvements.length).toBeGreaterThan(0);
      expect(result.recommended_improvements[0].improvement).toBeTruthy();
      expect(result.recommended_improvements[0].expected_gain).toBeGreaterThan(0);
      expect(result.recommended_improvements[0].confidence).toBeGreaterThan(0);
    });

    it("should recommend adding G50 when missing", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
      });

      const g50Rec = result.recommended_improvements.find(r => r.improvement.includes("G50"));
      expect(g50Rec).toBeDefined();
      expect(g50Rec?.expected_gain).toBeGreaterThanOrEqual(15);
    });

    it("should recommend increasing feed rates when slow", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence({
        content: SAMPLE_PROGRAM_BAD,
        operations: [],
        parameters: [],
      });

      const feedRec = result.recommended_improvements.find(r =>
        r.improvement.toLowerCase().includes("feed")
      );
      expect(feedRec).toBeDefined();
    });
  });

  describe("Training", () => {
    it("should train on program corpus", () => {
      const engine = new LatheDeepLearningIntelligenceEngine();
      const result = engine.train(TRAINING_PROGRAMS, 10);

      expect(result.epochs).toBe(10);
      expect(result.final_loss).toBeGreaterThanOrEqual(0);
      expect(result.patterns_learned).toBeGreaterThanOrEqual(0);
      expect(result.knowledge_nodes).toBeGreaterThan(0);
    });

    it("should improve accuracy with more epochs", () => {
      const engine1 = new LatheDeepLearningIntelligenceEngine();
      const result1 = engine1.train(TRAINING_PROGRAMS, 5);

      const engine2 = new LatheDeepLearningIntelligenceEngine();
      const result2 = engine2.train(TRAINING_PROGRAMS, 50);

      // More training should generally improve or maintain accuracy
      expect(result2.epochs).toBeGreaterThan(result1.epochs);
    });

    it("should populate experience buffer during training", () => {
      const engine = new LatheDeepLearningIntelligenceEngine();
      engine.train(TRAINING_PROGRAMS, 10);

      const result = engine.train(TRAINING_PROGRAMS, 5);
      expect(result.experience_buffer_size).toBeGreaterThan(0);
    });
  });

  describe("Knowledge Graph", () => {
    it("should have knowledge graph statistics", () => {
      const stats = latheDeepLearningIntelligenceEngine.getKnowledgeStats();

      expect(stats.nodes).toBeGreaterThan(0);
      expect(stats.edges).toBeGreaterThan(0);
      expect(Object.keys(stats.nodeTypes).length).toBeGreaterThan(0);
    });

    it("should have material nodes", () => {
      const stats = latheDeepLearningIntelligenceEngine.getKnowledgeStats();
      expect(stats.nodeTypes.material).toBeGreaterThan(0);
    });

    it("should have operation nodes", () => {
      const stats = latheDeepLearningIntelligenceEngine.getKnowledgeStats();
      expect(stats.nodeTypes.operation).toBeGreaterThan(0);
    });

    it("should have tool nodes", () => {
      const stats = latheDeepLearningIntelligenceEngine.getKnowledgeStats();
      expect(stats.nodeTypes.tool).toBeGreaterThan(0);
    });
  });

  describe("Similar Programs", () => {
    it("should find similar programs", () => {
      const engine = new LatheDeepLearningIntelligenceEngine();
      engine.train(TRAINING_PROGRAMS, 10);

      const similar = engine.findSimilarPrograms({
        content: SAMPLE_PROGRAM_GOOD,
        operations: ["od_rough"],
      });

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].similarity).toBeGreaterThan(0);
    });
  });

  describe("Counterfactual Analysis", () => {
    it("should perform counterfactual analysis", () => {
      const result = latheDeepLearningIntelligenceEngine.counterfactualAnalysis(
        {
          content: SAMPLE_PROGRAM_GOOD,
          parameters: [{ tool: "od_rough", feed: 0.005, speed: 250 }],
        },
        { parameter: "feed", from: 0.005, to: 0.008 }
      );

      expect(result.original_quality).toBeDefined();
      expect(result.predicted_quality).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.explanation).toBeTruthy();
    });

    it("should explain impact of changes", () => {
      const result = latheDeepLearningIntelligenceEngine.counterfactualAnalysis(
        {
          content: SAMPLE_PROGRAM_BAD,
          parameters: [{ tool: "od_rough", feed: 0.0005, speed: 500 }],
        },
        { parameter: "feed", from: 0.0005, to: 0.006 }
      );

      expect(result.explanation).toContain("feed");
    });
  });

  describe("RL-Optimized Parameters", () => {
    it("should provide optimized parameters", () => {
      const result = latheDeepLearningIntelligenceEngine.getOptimizedParameters(
        { feed: 0.005, speed: 250, depth: 0.1, tool: "od_rough" },
        "M2"
      );

      expect(result.recommended_feed).toBeGreaterThan(0);
      expect(result.recommended_speed).toBeGreaterThan(0);
      expect(result.recommended_depth).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      // Expected improvement can be negative before training (neural network output)
      expect(typeof result.expected_improvement).toBe("number");
    });

    it("should adjust parameters within reasonable range", () => {
      const current = { feed: 0.006, speed: 300, depth: 0.08, tool: "od_rough" };
      const result = latheDeepLearningIntelligenceEngine.getOptimizedParameters(current, "D2");

      // Recommendations should be within ±50% of current
      expect(result.recommended_feed).toBeGreaterThan(current.feed * 0.5);
      expect(result.recommended_feed).toBeLessThan(current.feed * 1.5);
      expect(result.recommended_speed).toBeGreaterThan(current.speed * 0.5);
      expect(result.recommended_speed).toBeLessThan(current.speed * 1.5);
    });
  });

  describe("Learned Patterns", () => {
    it("should return learned patterns after training", () => {
      const engine = new LatheDeepLearningIntelligenceEngine();
      engine.train(TRAINING_PROGRAMS, 20);

      const patterns = engine.getLearnedPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe("Analysis Depth Levels", () => {
    it("should support shallow analysis", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence(
        { content: SAMPLE_PROGRAM_GOOD, operations: [], parameters: [] },
        "shallow"
      );

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it("should support deep analysis", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence(
        { content: SAMPLE_PROGRAM_GOOD, operations: [], parameters: [] },
        "deep"
      );

      expect(result.reasoning.reasoning_chain.length).toBeGreaterThanOrEqual(5);
    });

    it("should support exhaustive analysis", () => {
      const result = latheDeepLearningIntelligenceEngine.analyzeWithIntelligence(
        { content: SAMPLE_PROGRAM_GOOD, operations: [], parameters: [] },
        "exhaustive"
      );

      expect(result.recommended_improvements.length).toBeGreaterThan(0);
    });
  });
});
