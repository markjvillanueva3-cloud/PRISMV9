/**
 * AutonomousAIOrchestrationEngine Tests
 * Self-reliant AI orchestration across skills, hooks, engines, algorithms
 */
import { describe, it, expect } from "vitest";
import { AutonomousAIOrchestrationEngine, autonomousAIOrchestration, autonomousAIOrchestrationDispatch } from "../engines/AutonomousAIOrchestrationEngine.js";

describe("AutonomousAIOrchestrationEngine", () => {
  const engine = new AutonomousAIOrchestrationEngine();

  describe("selectAlgorithms", () => {
    it("returns array of algorithms for optimization intent", () => {
      const result = engine.selectAlgorithms("optimize cutting parameters");
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns algorithms with name and confidence properties", () => {
      const result = engine.selectAlgorithms("machine learning prediction");
      result.forEach(alg => {
        expect(typeof alg.name).toBe("string");
        expect(typeof alg.confidence).toBe("number");
        expect(alg.confidence).toBeGreaterThanOrEqual(0);
        expect(alg.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("returns empty array for empty intent", () => {
      const result = engine.selectAlgorithms("");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("returns algorithms with purpose property", () => {
      const result = engine.selectAlgorithms("genetic optimization search");
      result.forEach(alg => {
        expect(typeof alg.purpose).toBe("string");
      });
    });
  });

  describe("selectFormulas", () => {
    it("returns array of formulas for force calculation", () => {
      const result = engine.selectFormulas("calculate cutting force");
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns formulas with name and equation properties", () => {
      const result = engine.selectFormulas("speed and feed calculation");
      result.forEach(f => {
        expect(typeof f.name).toBe("string");
        expect(typeof f.equation).toBe("string");
      });
    });

    it("returns empty array for generic intent", () => {
      const result = engine.selectFormulas("do something random xyz");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("planKnowledgeUtilization", () => {
    it("returns plan with sources array", () => {
      const result = engine.planKnowledgeUtilization({
        intent: "optimize lathe turning",
        knowledgeSources: ["tribal_knowledge", "vendor_catalogs"]
      });
      expect(Array.isArray(result.sources)).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it("includes relevance ranking in sources", () => {
      const result = engine.planKnowledgeUtilization({
        intent: "learn about milling strategies"
      });
      result.sources.forEach((s: any) => {
        expect(typeof s.relevance).toBe("number");
        expect(s.relevance).toBeGreaterThanOrEqual(0);
        expect(s.relevance).toBeLessThanOrEqual(1);
      });
    });

    it("returns plan with confidenceBoost as number", () => {
      const result = engine.planKnowledgeUtilization({ intent: "fixture design" });
      expect(typeof result.confidenceBoost).toBe("number");
      expect(result.confidenceBoost).toBeGreaterThanOrEqual(0);
    });
  });

  describe("queryMITCourses", () => {
    it("returns array of courses for machining topic", async () => {
      const result = await engine.queryMITCourses("machining");
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns courses with title and courseId", async () => {
      const result = await engine.queryMITCourses("manufacturing");
      result.forEach(c => {
        expect(typeof c.title).toBe("string");
        expect(typeof c.courseId).toBe("string");
      });
    });

    it("returns empty array for nonexistent topic", async () => {
      const result = await engine.queryMITCourses("quantum_entanglement_machining_xyz123");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe("queryVendorCatalogs", () => {
    it("returns array for carbide insert query", async () => {
      const result = await engine.queryVendorCatalogs("carbide insert");
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns entries with vendor and product", async () => {
      const result = await engine.queryVendorCatalogs("end mill");
      result.forEach(e => {
        expect(typeof e.vendor).toBe("string");
        expect(typeof e.product).toBe("string");
      });
    });

    it("returns empty array for nonsense query", async () => {
      const result = await engine.queryVendorCatalogs("xyzzy123nonsense");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe("getExecutionHistory", () => {
    it("returns array of execution results", () => {
      const history = engine.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("history entries have taskId and success status", () => {
      const history = engine.getExecutionHistory();
      history.forEach(h => {
        expect(typeof h.taskId).toBe("string");
        expect(typeof h.success).toBe("boolean");
      });
    });
  });

  describe("getLearningStats", () => {
    it("returns patterns count as non-negative number", () => {
      const stats = engine.getLearningStats();
      expect(typeof stats.patterns).toBe("number");
      expect(stats.patterns).toBeGreaterThanOrEqual(0);
    });

    it("returns avgScore between 0 and 1", () => {
      const stats = engine.getLearningStats();
      expect(typeof stats.avgScore).toBe("number");
      expect(stats.avgScore).toBeGreaterThanOrEqual(0);
      expect(stats.avgScore).toBeLessThanOrEqual(1);
    });
  });

  describe("getSummary", () => {
    it("returns summary containing AutonomousAIOrchestrationEngine", () => {
      const summary = engine.getSummary();
      expect(typeof summary).toBe("string");
      expect(summary).toContain("AutonomousAIOrchestrationEngine");
    });

    it("summary includes capability counts", () => {
      const summary = engine.getSummary();
      expect(summary).toContain("skills");
      expect(summary).toContain("hooks");
    });

    it("summary includes execution count", () => {
      const summary = engine.getSummary();
      expect(summary).toContain("Executions:");
    });
  });

  describe("singleton instance", () => {
    it("exports working singleton of correct type", () => {
      expect(autonomousAIOrchestration).toBeInstanceOf(AutonomousAIOrchestrationEngine);
      const stats = autonomousAIOrchestration.getLearningStats();
      expect(typeof stats.patterns).toBe("number");
    });
  });

  describe("dispatch function", () => {
    it("dispatches ai_select_algorithms returning array", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_select_algorithms", { intent: "optimize" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("dispatches ai_select_formulas returning array", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_select_formulas", { intent: "calculate" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("dispatches ai_knowledge_plan with sources", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_knowledge_plan", { intent: "learn" }) as any;
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it("dispatches ai_orchestration_history returning array", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_orchestration_history", {});
      expect(Array.isArray(result)).toBe(true);
    });

    it("dispatches ai_orchestration_stats with patterns count", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_orchestration_stats", {}) as any;
      expect(typeof result.patterns).toBe("number");
    });

    it("dispatches ai_orchestration_summary returning string", async () => {
      const result = await autonomousAIOrchestrationDispatch("ai_orchestration_summary", {});
      expect(typeof result).toBe("string");
      expect((result as string).length).toBeGreaterThan(0);
    });

    it("throws descriptive error on unknown action", async () => {
      await expect(autonomousAIOrchestrationDispatch("invalid_action_xyz", {}))
        .rejects.toThrow("Unknown autonomous AI action: invalid_action_xyz");
    });
  });
});
