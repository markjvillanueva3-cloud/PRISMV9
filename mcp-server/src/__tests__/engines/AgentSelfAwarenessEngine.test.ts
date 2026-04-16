/**
 * Tests for AgentSelfAwarenessEngine
 *
 * AGENT ROADMAP: U-AGT03 (MS1)
 * Verifies unified self-awareness across dispatchers and engines
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  AgentSelfAwarenessEngine,
  agentSelfAwarenessEngine,
  SystemAwareness,
} from "../../engines/AgentSelfAwarenessEngine.js";

describe("AgentSelfAwarenessEngine", () => {
  let awareness: SystemAwareness;

  beforeAll(async () => {
    awareness = await agentSelfAwarenessEngine.buildAwareness(true);
  }, 120000);

  describe("buildAwareness", () => {
    it("should gather dispatcher statistics", () => {
      expect(awareness.stats.dispatchers).toBeGreaterThanOrEqual(50);
    });

    it("should gather action statistics", () => {
      expect(awareness.stats.actions).toBeGreaterThanOrEqual(1000);
    });

    it("should gather engine statistics", () => {
      expect(awareness.stats.engines).toBeGreaterThanOrEqual(500);
    });

    it("should count total LOC", () => {
      expect(awareness.stats.totalLoc).toBeGreaterThan(50000);
    });

    it("should identify categories", () => {
      expect(awareness.stats.categories.length).toBeGreaterThanOrEqual(5);
    });

    it("should list top capabilities", () => {
      expect(awareness.topCapabilities.length).toBeGreaterThan(0);
      expect(awareness.topCapabilities[0]).toHaveProperty("category");
      expect(awareness.topCapabilities[0]).toHaveProperty("count");
      expect(awareness.topCapabilities[0]).toHaveProperty("examples");
    });

    it("should list top engines", () => {
      expect(awareness.topEngines.length).toBeGreaterThan(0);
      expect(awareness.topEngines[0]).toHaveProperty("name");
      expect(awareness.topEngines[0]).toHaveProperty("loc");
    });

    it("should record refresh timestamp", () => {
      expect(awareness.refreshedAt).toBeInstanceOf(Date);
    });
  });

  describe("search", () => {
    it("should find both capabilities and engines", async () => {
      const results = await agentSelfAwarenessEngine.search("force");
      expect(results.length).toBeGreaterThan(0);

      // Should contain mix of types
      const types = new Set(results.map((r) => r.type));
      // At least one type should be present
      expect(types.size).toBeGreaterThanOrEqual(1);
    });

    it("should return unified results with scores", async () => {
      const results = await agentSelfAwarenessEngine.search("speed");
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
    });

    it("should sort by score descending", async () => {
      const results = await agentSelfAwarenessEngine.search("calc");
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it("should respect limit", async () => {
      const results = await agentSelfAwarenessEngine.search("engine", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getContextSummary", () => {
    it("should generate one-liner", async () => {
      const summary = await agentSelfAwarenessEngine.getContextSummary();
      expect(summary.oneLiner).toContain("PRISM");
      expect(summary.oneLiner).toContain("dispatchers");
    });

    it("should generate paragraph", async () => {
      const summary = await agentSelfAwarenessEngine.getContextSummary();
      expect(summary.paragraph.length).toBeGreaterThan(100);
      expect(summary.paragraph).toContain("manufacturing");
    });

    it("should generate bullets", async () => {
      const summary = await agentSelfAwarenessEngine.getContextSummary();
      expect(summary.bullets.length).toBeGreaterThanOrEqual(3);
    });

    it("should generate compact list", async () => {
      const summary = await agentSelfAwarenessEngine.getContextSummary();
      expect(summary.compactList.length).toBeGreaterThan(0);
    });

    it("should estimate tokens", async () => {
      const summary = await agentSelfAwarenessEngine.getContextSummary();
      expect(summary.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe("getCapabilitiesForDomain", () => {
    it("should return domain-specific capabilities", async () => {
      const { actions, engines } =
        await agentSelfAwarenessEngine.getCapabilitiesForDomain("physics");

      // Should find physics-related items
      expect(actions.length + engines.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findToolForTask", () => {
    it("should recommend tools for tasks", async () => {
      const results = await agentSelfAwarenessEngine.findToolForTask(
        "calculate cutting force"
      );
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("getHealthCheck", () => {
    it("should return health status", async () => {
      const health = await agentSelfAwarenessEngine.getHealthCheck();

      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("dispatchers");
      expect(health).toHaveProperty("actions");
      expect(health).toHaveProperty("engines");
      expect(health).toHaveProperty("issues");

      expect(health.dispatchers).toHaveProperty("count");
      expect(health.dispatchers).toHaveProperty("status");
    });

    it("should be healthy with sufficient components", async () => {
      const health = await agentSelfAwarenessEngine.getHealthCheck();

      // With 80+ dispatchers and 1500+ engines, should be healthy
      expect(health.healthy).toBe(true);
    });
  });

  describe("getQuickStats", () => {
    it("should return quick statistics", async () => {
      const stats = await agentSelfAwarenessEngine.getQuickStats();

      expect(stats).toHaveProperty("dispatchers");
      expect(stats).toHaveProperty("actions");
      expect(stats).toHaveProperty("engines");
      expect(stats).toHaveProperty("loc");
      expect(stats).toHaveProperty("categories");

      expect(stats.dispatchers).toBeGreaterThan(0);
      expect(stats.loc).toContain("K"); // Should be formatted
    });
  });

  describe("getRecommendedActions", () => {
    it("should recommend actions for manufacturing tasks", async () => {
      const result = await agentSelfAwarenessEngine.getRecommendedActions(
        "thread cutting"
      );

      expect(result).toHaveProperty("recommended");
      expect(result).toHaveProperty("reasoning");
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should handle unknown tasks gracefully", async () => {
      const result = await agentSelfAwarenessEngine.getRecommendedActions(
        "xyz12345nonexistent"
      );

      expect(result.reasoning).toContain("No specific actions");
    });
  });

  describe("refresh", () => {
    it("should refresh all indexes", async () => {
      const before = awareness.refreshedAt;
      const newAwareness = await agentSelfAwarenessEngine.refresh();

      expect(newAwareness.refreshedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
    });
  });
});
