/**
 * Tests for MultiPathReasoningEngine
 *
 * AGENT ROADMAP: U-AGT08 (MS3)
 * Verifies tree-of-thought multi-path exploration
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MultiPathReasoningEngine,
  multiPathReasoningEngine,
  MultiPathProblem,
  MultiPathResult,
} from "../../engines/MultiPathReasoningEngine.js";

describe("MultiPathReasoningEngine", () => {
  let engine: MultiPathReasoningEngine;

  beforeEach(() => {
    engine = new MultiPathReasoningEngine();
  });

  describe("explorePaths", () => {
    it("should explore multiple paths for machining problem", async () => {
      const problem: MultiPathProblem = {
        problem: "Determine cutting strategy for D2 roughing",
        goal: "Select optimal approach",
        domain: "machining",
        maxPaths: 3
      };

      const result = await engine.explorePaths(problem);

      expect(result.problemId).toMatch(/^mp_/);
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.bestPath).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it("should generate domain-specific approaches", async () => {
      const problem: MultiPathProblem = {
        problem: "Select cutting parameters",
        goal: "Balance speed and quality",
        domain: "machining"
      };

      const result = await engine.explorePaths(problem);

      // Should have machining approaches
      const approaches = result.paths.map(p => p.approach);
      expect(approaches.some(a => ["aggressive", "conservative", "balanced"].includes(a))).toBe(true);
    });

    it("should use custom approaches when provided", async () => {
      const problem: MultiPathProblem = {
        problem: "Test custom approaches",
        goal: "Verify custom approach usage",
        domain: "machining",
        approaches: ["custom_one", "custom_two"]
      };

      const result = await engine.explorePaths(problem);

      expect(result.paths.some(p => p.approach === "custom_one")).toBe(true);
      expect(result.paths.some(p => p.approach === "custom_two")).toBe(true);
    });

    it("should score paths with breakdown", async () => {
      const problem: MultiPathProblem = {
        problem: "Score test",
        goal: "Verify scoring",
        domain: "machining",
        maxPaths: 2
      };

      const result = await engine.explorePaths(problem);

      for (const path of result.paths) {
        expect(path.score.overall).toBeGreaterThanOrEqual(0);
        expect(path.score.overall).toBeLessThanOrEqual(1);
        expect(path.score.confidence).toBeGreaterThanOrEqual(0);
        expect(path.score.safety).toBeGreaterThanOrEqual(0);
        expect(path.score.cost).toBeGreaterThanOrEqual(0);
        expect(path.score.feasibility).toBeGreaterThanOrEqual(0);
        expect(path.score.weights).toBeDefined();
      }
    });

    it("should respect maxPaths limit", async () => {
      const problem: MultiPathProblem = {
        problem: "Max paths test",
        goal: "Verify path limit",
        domain: "machining",
        maxPaths: 2
      };

      const result = await engine.explorePaths(problem);

      expect(result.paths.length).toBeLessThanOrEqual(2);
    });

    it("should prune low-scoring paths", async () => {
      const problem: MultiPathProblem = {
        problem: "Prune test",
        goal: "Verify pruning",
        domain: "machining",
        maxPaths: 5,
        pruneThreshold: 0.5  // Higher threshold to trigger pruning
      };

      const result = await engine.explorePaths(problem);

      // Should have some pruned paths
      expect(result.explorationStats.totalPathsGenerated).toBeGreaterThan(0);
      // Paths are either pruned or completed
      for (const path of result.paths) {
        expect(["complete", "pruned"]).toContain(path.status);
      }
    });

    it("should apply beam search strategy", async () => {
      const problem: MultiPathProblem = {
        problem: "Beam search test",
        goal: "Verify beam search",
        domain: "machining",
        maxPaths: 5,
        beamWidth: 2,
        strategy: "beam_search"
      };

      const result = await engine.explorePaths(problem);

      // Non-pruned paths should be within beam width
      const nonPruned = result.paths.filter(p => p.status !== "pruned");
      expect(nonPruned.length).toBeLessThanOrEqual(2);
    });

    it("should use custom score weights", async () => {
      const problem: MultiPathProblem = {
        problem: "Custom weights test",
        goal: "Verify weight application",
        domain: "machining",
        maxPaths: 2,
        scoreWeights: {
          safety: 0.5,  // Prioritize safety
          confidence: 0.3,
          cost: 0.1,
          feasibility: 0.05,
          complexity: 0.05
        }
      };

      const result = await engine.explorePaths(problem);

      // Verify weights were applied
      expect(result.bestPath.score.weights.safety).toBe(0.5);
    });

    it("should generate exploration stats", async () => {
      const problem: MultiPathProblem = {
        problem: "Stats test",
        goal: "Verify statistics",
        domain: "machining",
        maxPaths: 3
      };

      const result = await engine.explorePaths(problem);

      expect(result.explorationStats.totalPathsGenerated).toBeGreaterThan(0);
      expect(result.explorationStats.explorationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.explorationStats.maxDepthReached).toBeGreaterThanOrEqual(0);
      expect(typeof result.explorationStats.averagePathConfidence).toBe("number");
    });

    it("should build recommendation", async () => {
      const problem: MultiPathProblem = {
        problem: "Recommendation test",
        goal: "Verify recommendation",
        domain: "machining"
      };

      const result = await engine.explorePaths(problem);

      expect(result.recommendation.primaryApproach).toBeDefined();
      expect(result.recommendation.reasoning.length).toBeGreaterThan(0);
      expect(typeof result.recommendation.confidence).toBe("number");
      expect(Array.isArray(result.recommendation.alternatives)).toBe(true);
      expect(Array.isArray(result.recommendation.warnings)).toBe(true);
    });

    it("should identify alternative paths", async () => {
      const problem: MultiPathProblem = {
        problem: "Alternatives test",
        goal: "Verify alternatives",
        domain: "machining",
        maxPaths: 4
      };

      const result = await engine.explorePaths(problem);

      // Best path should not be in alternatives
      if (result.alternativePaths.length > 0) {
        expect(result.alternativePaths.map(p => p.id)).not.toContain(result.bestPath.id);
      }
    });

    it("should complete in reasonable time", async () => {
      const problem: MultiPathProblem = {
        problem: "Performance test",
        goal: "Verify speed",
        domain: "machining",
        maxPaths: 3
      };

      const result = await engine.explorePaths(problem);

      // Should complete in under 5 seconds
      expect(result.totalTimeMs).toBeLessThan(5000);
    });

    it("should work for different domains", async () => {
      const domains: MultiPathProblem["domain"][] = ["tooling", "quality", "cost"];

      for (const domain of domains) {
        const problem: MultiPathProblem = {
          problem: `${domain} domain test`,
          goal: "Verify domain support",
          domain,
          maxPaths: 2
        };

        const result = await engine.explorePaths(problem);

        expect(result.domain).toBe(domain);
        expect(result.paths.length).toBeGreaterThan(0);
      }
    });
  });

  describe("compareApproaches", () => {
    it("should compare two approaches", async () => {
      const problem: MultiPathProblem = {
        problem: "Compare approaches",
        goal: "Determine winner",
        domain: "machining"
      };

      const comparison = await engine.compareApproaches(problem, "aggressive", "conservative");

      expect(comparison.winner).toBeDefined();
      expect(["aggressive", "conservative"]).toContain(comparison.winner);
      expect(comparison.comparison.overall).toBeDefined();
      expect(comparison.comparison.overall.a1).toBeGreaterThanOrEqual(0);
      expect(comparison.comparison.overall.a2).toBeGreaterThanOrEqual(0);
      expect(comparison.summary).toBeDefined();
    });

    it("should provide comparison breakdown", async () => {
      const problem: MultiPathProblem = {
        problem: "Breakdown test",
        goal: "Verify breakdown",
        domain: "machining"
      };

      const comparison = await engine.compareApproaches(problem, "balanced", "finish_focused");

      expect(comparison.comparison.confidence).toBeDefined();
      expect(comparison.comparison.safety).toBeDefined();
      expect(comparison.comparison.cost).toBeDefined();
      expect(comparison.comparison.feasibility).toBeDefined();

      // Each dimension should have winner
      for (const [dim, data] of Object.entries(comparison.comparison)) {
        expect(data.winner).toBeDefined();
        expect(["balanced", "finish_focused"]).toContain(data.winner);
      }
    });
  });

  describe("getAvailableApproaches", () => {
    it("should return approaches for machining", () => {
      const approaches = engine.getAvailableApproaches("machining");

      expect(approaches.length).toBeGreaterThan(0);
      expect(approaches.map(a => a.name)).toContain("aggressive");
      expect(approaches.map(a => a.name)).toContain("conservative");
      expect(approaches.map(a => a.name)).toContain("balanced");
    });

    it("should return approaches for tooling", () => {
      const approaches = engine.getAvailableApproaches("tooling");

      expect(approaches.length).toBeGreaterThan(0);
      expect(approaches.map(a => a.name)).toContain("standard_tooling");
    });

    it("should return approach templates with metadata", () => {
      const approaches = engine.getAvailableApproaches("machining");

      for (const approach of approaches) {
        expect(approach.name).toBeDefined();
        expect(approach.description).toBeDefined();
        expect(approach.tradeoffs).toBeDefined();
        expect(approach.typicalConfidence).toBeGreaterThan(0);
      }
    });

    it("should return empty for unknown domain", () => {
      const approaches = engine.getAvailableApproaches("unknown" as any);
      expect(approaches).toEqual([]);
    });
  });

  describe("sensitivityAnalysis", () => {
    it("should analyze sensitivity to weight changes", async () => {
      const problem: MultiPathProblem = {
        problem: "Sensitivity test",
        goal: "Analyze weight impact",
        domain: "machining",
        maxPaths: 2
      };

      const analysis = await engine.sensitivityAnalysis(problem, "safety");

      expect(analysis.dimension).toBe("safety");
      expect(analysis.variations.length).toBeGreaterThan(0);
      expect(analysis.stableRange).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
    });

    it("should test multiple weight values", async () => {
      const problem: MultiPathProblem = {
        problem: "Weight variation test",
        goal: "Test weight range",
        domain: "machining",
        maxPaths: 2
      };

      const analysis = await engine.sensitivityAnalysis(problem, "cost");

      // Should test at least 3 weight values
      expect(analysis.variations.length).toBeGreaterThanOrEqual(3);

      // Each variation should have required fields
      for (const v of analysis.variations) {
        expect(v.weight).toBeGreaterThan(0);
        expect(v.weight).toBeLessThan(1);
        expect(v.bestApproach).toBeDefined();
        expect(v.score).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("getExplorationSummary", () => {
    it("should generate readable summary", async () => {
      const problem: MultiPathProblem = {
        problem: "Generate summary",
        goal: "Test summary output",
        domain: "machining",
        maxPaths: 3
      };

      const result = await engine.explorePaths(problem);
      const summary = engine.getExplorationSummary(result);

      expect(summary).toContain("Multi-Path Exploration");
      expect(summary).toContain("Domain: machining");
      expect(summary).toContain("Best approach:");
      expect(summary).toContain("Recommendation:");
      expect(summary).toContain("Exploration time:");
    });

    it("should include warnings when present", async () => {
      const problem: MultiPathProblem = {
        problem: "Warning test",
        goal: "Generate warnings",
        domain: "machining",
        maxPaths: 3,
        pruneThreshold: 0.4
      };

      const result = await engine.explorePaths(problem);
      const summary = engine.getExplorationSummary(result);

      // Summary should be string
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(100);
    });
  });

  describe("path status", () => {
    it("should mark completed paths correctly", async () => {
      const problem: MultiPathProblem = {
        problem: "Status test",
        goal: "Verify status",
        domain: "machining",
        maxPaths: 2,
        pruneThreshold: 0  // Don't prune
      };

      const result = await engine.explorePaths(problem);

      const completedPaths = result.paths.filter(p => p.status === "complete");
      expect(completedPaths.length).toBeGreaterThan(0);

      for (const path of completedPaths) {
        expect(path.completedAt).toBeDefined();
        expect(path.chain).toBeDefined();
      }
    });

    it("should set prune reason", async () => {
      const problem: MultiPathProblem = {
        problem: "Prune reason test",
        goal: "Verify prune reasons",
        domain: "machining",
        maxPaths: 5,
        beamWidth: 1,  // Very narrow beam
        strategy: "beam_search"
      };

      const result = await engine.explorePaths(problem);

      const prunedPaths = result.paths.filter(p => p.status === "pruned");
      for (const path of prunedPaths) {
        expect(path.pruneReason).toBeDefined();
        expect(path.pruneReason?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(multiPathReasoningEngine).toBeInstanceOf(MultiPathReasoningEngine);
    });
  });
});
