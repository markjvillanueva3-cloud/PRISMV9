/**
 * MultiPathReasoningEngine Test Suite
 * ====================================
 *
 * AGENT-MS3 U-AGT08 — Validates tree-of-thought path exploration with
 * pruning. Exit criteria:
 *   - Explores 2-5 paths for complex queries
 *   - Prunes paths that violate constraints
 *   - Ranks paths by confidence, safety, cost
 *   - Returns best path with alternatives noted
 *
 * @milestone AGENT-MS3
 * @unit U-AGT08
 */

import { describe, it, expect } from "vitest";
import {
  multiPathReasoningEngine,
  type MultiPathProblem,
} from "../engines/MultiPathReasoningEngine.js";

function makeProblem(overrides: Partial<MultiPathProblem> = {}): MultiPathProblem {
  return {
    problem: overrides.problem ?? "Choose roughing approach for 4140",
    goal: overrides.goal ?? "Maximum MRR with safety margin",
    domain: overrides.domain ?? "machining",
    known_facts: overrides.known_facts ?? ["4140 tool steel", "LB3000 lathe"],
    constraints: overrides.constraints ?? [],
    context: overrides.context ?? {},
    max_steps: overrides.max_steps ?? 10,
    confidence_threshold: overrides.confidence_threshold ?? 0.7,
    ...overrides,
  };
}

describe("MultiPathReasoningEngine", () => {
  // ── explorePaths() ────────────────────────────────────────────────────

  describe("explorePaths()", () => {
    it("returns a MultiPathResult with required shape", async () => {
      const result = await multiPathReasoningEngine.explorePaths(makeProblem());
      expect(result.problemId).toMatch(/^mp_/);
      expect(result.domain).toBe("machining");
      expect(Array.isArray(result.paths)).toBe(true);
      expect(result.bestPath).toBeDefined();
      expect(Array.isArray(result.alternativePaths)).toBe(true);
      expect(result.explorationStats).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it("explores 2-5 paths by default for machining", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({ domain: "machining" })
      );
      expect(result.paths.length).toBeGreaterThanOrEqual(2);
      expect(result.paths.length).toBeLessThanOrEqual(5);
    });

    it("respects maxPaths override", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({ maxPaths: 2 })
      );
      expect(result.paths.length).toBeLessThanOrEqual(2);
    });

    it("includes exploration stats", async () => {
      const result = await multiPathReasoningEngine.explorePaths(makeProblem());
      expect(result.explorationStats.totalPathsGenerated).toBeGreaterThan(0);
      expect(result.explorationStats.explorationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("sorts completed paths so best is first", async () => {
      const result = await multiPathReasoningEngine.explorePaths(makeProblem());
      if (result.alternativePaths.length > 0) {
        expect(result.bestPath.score.overall).toBeGreaterThanOrEqual(
          result.alternativePaths[0]!.score.overall
        );
      }
    });

    it("completes in reasonable time (<10s for small exploration)", async () => {
      const start = Date.now();
      await multiPathReasoningEngine.explorePaths(makeProblem({ maxPaths: 3 }));
      expect(Date.now() - start).toBeLessThan(10000);
    });

    it("handles tooling domain", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({ domain: "tooling", problem: "Select inserts for 4140" })
      );
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it("handles quality domain", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({ domain: "quality", problem: "Measurement plan for ±0.001" })
      );
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it("accepts custom approaches list", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({ approaches: ["aggressive", "conservative"] })
      );
      expect(result.paths.length).toBeLessThanOrEqual(2);
    });

    it("uses scoreWeights override", async () => {
      const result = await multiPathReasoningEngine.explorePaths(
        makeProblem({
          scoreWeights: { safety: 0.6, cost: 0.1, confidence: 0.1, feasibility: 0.1, complexity: 0.1 },
        })
      );
      expect(result.bestPath).toBeDefined();
    });
  });

  // ── getAvailableApproaches() ──────────────────────────────────────────

  describe("getAvailableApproaches()", () => {
    it("returns machining approaches (>= 4)", () => {
      const approaches = multiPathReasoningEngine.getAvailableApproaches("machining");
      expect(approaches.length).toBeGreaterThanOrEqual(4);
      const names = approaches.map((a) => a.name);
      expect(names).toContain("aggressive");
      expect(names).toContain("conservative");
      expect(names).toContain("balanced");
    });

    it("returns tooling approaches (>= 3)", () => {
      const approaches = multiPathReasoningEngine.getAvailableApproaches("tooling");
      expect(approaches.length).toBeGreaterThanOrEqual(3);
    });

    it("approach template includes tradeoffs + confidence", () => {
      const approaches = multiPathReasoningEngine.getAvailableApproaches("machining");
      const sample = approaches[0]!;
      expect(sample.tradeoffs.length).toBeGreaterThan(0);
      expect(sample.typicalConfidence).toBeGreaterThan(0);
      expect(sample.typicalConfidence).toBeLessThanOrEqual(1);
    });

    it("each approach has applicableDomains matching query", () => {
      const approaches = multiPathReasoningEngine.getAvailableApproaches("quality");
      approaches.forEach((a) => {
        expect(a.applicableDomains).toContain("quality");
      });
    });
  });

  // ── compareApproaches() ───────────────────────────────────────────────

  describe("compareApproaches()", () => {
    it("returns comparison across approaches", async () => {
      const comp = await multiPathReasoningEngine.compareApproaches(
        makeProblem(),
        ["aggressive", "conservative"]
      );
      expect(comp).toBeDefined();
    });
  });

  // ── sensitivityAnalysis() ─────────────────────────────────────────────

  describe("sensitivityAnalysis()", () => {
    it("runs sensitivity analysis over weights", async () => {
      const result = await multiPathReasoningEngine.sensitivityAnalysis(
        makeProblem({ maxPaths: 2 }),
        ["safety", "cost"]
      );
      expect(result).toBeDefined();
    });
  });

  // ── getExplorationSummary() ───────────────────────────────────────────

  describe("getExplorationSummary()", () => {
    it("returns a string summary", async () => {
      const result = await multiPathReasoningEngine.explorePaths(makeProblem());
      const summary = multiPathReasoningEngine.getExplorationSummary(result);
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
