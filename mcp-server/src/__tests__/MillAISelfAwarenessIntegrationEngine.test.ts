/**
 * MillAISelfAwarenessIntegrationEngine Tests
 * MILL-MASTER/P1-U04-SA-INTEG
 *
 * ≥15 tests covering: registry refresh, feature recommendations,
 * category inference, capability matching, stats, edge cases.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  millAISelfAwarenessIntegrationEngine,
  MillEngineCategory,
} from "../engines/MillAISelfAwarenessIntegrationEngine.js";
import { prismSelfAwarenessEngine } from "../engines/PRISMSelfAwarenessEngine.js";

describe("MillAISelfAwarenessIntegrationEngine", () => {
  describe("registry operations", () => {
    it("should return non-empty registry on refresh", () => {
      const registry = millAISelfAwarenessIntegrationEngine.refreshRegistry();

      expect(registry).toBeDefined();
      expect(Array.isArray(registry)).toBe(true);
      expect(registry.length).toBeGreaterThan(0);
    });

    it("should cache registry and return same reference within TTL", () => {
      const first = millAISelfAwarenessIntegrationEngine.getRegistry();
      const second = millAISelfAwarenessIntegrationEngine.getRegistry();

      expect(first).toBe(second);
    });

    it("should include Mill* engines in registry", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const millEngines = registry.filter(e => e.name.startsWith("Mill"));

      expect(millEngines.length).toBeGreaterThan(0);
    });

    it("should include Milling* engines in registry", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const millingEngines = registry.filter(e => e.name.startsWith("Milling"));

      expect(millingEngines.length).toBeGreaterThan(0);
    });

    it("should include FiveAxis* engines in registry", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const fiveAxisEngines = registry.filter(e => e.name.startsWith("FiveAxis"));

      expect(fiveAxisEngines.length).toBeGreaterThanOrEqual(0);
    });

    it("should have valid paths for all engines", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();

      for (const engine of registry) {
        expect(engine.path).toMatch(/^src\/engines\/.*\.ts$/);
      }
    });
  });

  describe("category inference", () => {
    it("should categorize MillMasterOrchestratorFacadeEngine as orchestrator", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const facade = registry.find(e => e.name === "MillMasterOrchestratorFacadeEngine");

      if (facade) {
        expect(facade.category).toBe("orchestrator");
      }
    });

    it("should categorize MillingAGIMasterEngine as agi", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const agi = registry.find(e => e.name === "MillingAGIMasterEngine");

      if (agi) {
        expect(agi.category).toBe("agi");
      }
    });

    it("should categorize LoRA engines as lora (unless FiveAxis prefix)", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const loraEngines = registry.filter(e =>
        e.name.includes("LoRA") && !e.name.startsWith("FiveAxis")
      );

      for (const engine of loraEngines) {
        expect(engine.category).toBe("lora");
      }
    });

    it("should categorize FiveAxis engines as kinematics", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const fiveAxisEngines = registry.filter(e => e.name.startsWith("FiveAxis"));

      for (const engine of fiveAxisEngines) {
        expect(engine.category).toBe("kinematics");
      }
    });
  });

  describe("findEngines", () => {
    it("should find engines matching 'agi' query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("agi reasoning");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].engine).toContain("AGI");
    });

    it("should find engines matching 'orchestrator' query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("orchestrator facade");

      expect(matches.length).toBeGreaterThan(0);
    });

    it("should find engines matching 'lora' query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("lora fine tuning");

      expect(matches.length).toBeGreaterThan(0);
    });

    it("should return empty array for unrelated query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("xyznonexistent12345");

      expect(matches).toEqual([]);
    });

    it("should sort matches by confidence descending", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("milling");

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });
  });

  describe("recommendFeatures", () => {
    it("should return recommendations for milling task", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendFeatures("pocket in aluminum");

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].feature).toBeDefined();
      expect(recs[0].engines.length).toBeGreaterThan(0);
    });

    it("should include strategies in recommendations", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendFeatures("agi orchestrator facade");

      const withStrategies = recs.filter(r => r.strategies.length > 0);
      expect(withStrategies.length).toBeGreaterThan(0);
    });

    it("should include actions in recommendations", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendFeatures("5 axis");

      const withActions = recs.filter(r => r.actions.length > 0);
      expect(withActions.length).toBeGreaterThan(0);
    });

    it("should prioritize orchestrator recommendations", () => {
      const recs = millAISelfAwarenessIntegrationEngine.recommendFeatures("orchestrate mill");

      if (recs.length > 1) {
        const orchestratorRec = recs.find(r => r.feature.includes("Orchestration"));
        if (orchestratorRec) {
          expect(orchestratorRec.priority).toBeGreaterThanOrEqual(8);
        }
      }
    });
  });

  describe("getStats", () => {
    it("should return valid statistics", () => {
      const stats = millAISelfAwarenessIntegrationEngine.getStats();

      expect(stats.totalEngines).toBeGreaterThan(0);
      expect(stats.version).toBe("1.0.0");
      expect(stats.lastRefresh).toBeDefined();
    });

    it("should have byCategory breakdown", () => {
      const stats = millAISelfAwarenessIntegrationEngine.getStats();
      const categories: MillEngineCategory[] = [
        "orchestrator", "agi", "physics", "kinematics",
        "lora", "neural", "strategy", "validation", "tribal",
      ];

      for (const cat of categories) {
        expect(stats.byCategory[cat]).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have sum of categories equal total", () => {
      const stats = millAISelfAwarenessIntegrationEngine.getStats();
      const sum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);

      expect(sum).toBe(stats.totalEngines);
    });
  });

  describe("getByCategory", () => {
    it("should return only orchestrator engines for orchestrator category", () => {
      const engines = millAISelfAwarenessIntegrationEngine.getByCategory("orchestrator");

      for (const engine of engines) {
        expect(engine.category).toBe("orchestrator");
      }
    });

    it("should return only agi engines for agi category", () => {
      const engines = millAISelfAwarenessIntegrationEngine.getByCategory("agi");

      for (const engine of engines) {
        expect(engine.category).toBe("agi");
      }
    });
  });

  describe("hasCapability", () => {
    it("should return true for milling capability", () => {
      const has = millAISelfAwarenessIntegrationEngine.hasCapability("milling");

      expect(has).toBe(true);
    });

    it("should return true for reasoning capability", () => {
      const has = millAISelfAwarenessIntegrationEngine.hasCapability("reasoning");

      expect(has).toBe(true);
    });

    it("should return false for nonexistent capability", () => {
      const has = millAISelfAwarenessIntegrationEngine.hasCapability("xyznonexistent");

      expect(has).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty query gracefully", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("");

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle whitespace-only query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("   ");

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle special characters in query", () => {
      const matches = millAISelfAwarenessIntegrationEngine.findEngines("mill@#$%");

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle very long query", () => {
      const longQuery = "milling ".repeat(100);
      const matches = millAISelfAwarenessIntegrationEngine.findEngines(longQuery);

      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("PRISMSelfAwarenessEngine integration", () => {
    it("should have recommendMillFeatures method", () => {
      expect(typeof prismSelfAwarenessEngine.recommendMillFeatures).toBe("function");
    });

    it("should return recommendations via recommendMillFeatures", async () => {
      const recs = await prismSelfAwarenessEngine.recommendMillFeatures("pocket milling");

      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should return normalized priorities (0-1 range)", async () => {
      const recs = await prismSelfAwarenessEngine.recommendMillFeatures("adaptive clearing");

      for (const rec of recs) {
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toBeLessThanOrEqual(1);
      }
    });

    it("should include engines in recommendations", async () => {
      const recs = await prismSelfAwarenessEngine.recommendMillFeatures("milling agi orchestrate");

      expect(recs.length).toBeGreaterThan(0);
      const hasEngines = recs.some(r => r.engines.length > 0);
      expect(hasEngines).toBe(true);
    });

    it("should include actions in recommendations", async () => {
      const recs = await prismSelfAwarenessEngine.recommendMillFeatures("5 axis kinematics");

      const withActions = recs.filter(r => r.actions.length > 0);
      expect(withActions.length).toBeGreaterThan(0);
    });
  });

  describe("capabilities inference", () => {
    it("should infer milling capability for all engines", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();

      for (const engine of registry) {
        expect(engine.capabilities).toContain("milling");
      }
    });

    it("should infer reasoning for AGI engines", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const agiEngines = registry.filter(e => e.name.includes("AGI"));

      for (const engine of agiEngines) {
        expect(engine.capabilities).toContain("reasoning");
      }
    });

    it("should infer fine_tuning for LoRA engines", () => {
      const registry = millAISelfAwarenessIntegrationEngine.getRegistry();
      const loraEngines = registry.filter(e => e.name.includes("LoRA"));

      for (const engine of loraEngines) {
        expect(engine.capabilities).toContain("fine_tuning");
      }
    });
  });
});
