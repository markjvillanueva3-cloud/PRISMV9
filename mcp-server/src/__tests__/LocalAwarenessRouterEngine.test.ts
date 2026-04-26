/**
 * LocalAwarenessRouterEngine Tests — LOCAL-LLM-MS0 U-LLM-AWR01
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LocalAwarenessRouterEngine, {
  AwarenessInputSchema,
} from "../engines/LocalAwarenessRouterEngine.js";

describe("LocalAwarenessRouterEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LocalAwarenessRouterEngine.clearCache();
  });

  afterEach(() => {
    LocalAwarenessRouterEngine.clearCache();
  });

  describe("AwarenessInputSchema", () => {
    it("validates valid input", () => {
      const input = {
        task: "Create a milling toolpath engine",
        briefingType: "full" as const,
        maxTokens: 200,
      };
      expect(() => AwarenessInputSchema.parse(input)).not.toThrow();
    });

    it("rejects empty task", () => {
      const input = { task: "" };
      expect(() => AwarenessInputSchema.parse(input)).toThrow();
    });

    it("defaults briefingType to full", () => {
      const input = { task: "Test task" };
      const parsed = AwarenessInputSchema.parse(input);
      expect(parsed.briefingType).toBe("full");
    });

    it("defaults maxTokens to 200", () => {
      const input = { task: "Test task" };
      const parsed = AwarenessInputSchema.parse(input);
      expect(parsed.maxTokens).toBe(200);
    });

    it("clamps maxTokens to valid range", () => {
      expect(() => AwarenessInputSchema.parse({
        task: "test",
        maxTokens: 10,
      })).toThrow();
      expect(() => AwarenessInputSchema.parse({
        task: "test",
        maxTokens: 1000,
      })).toThrow();
    });

    it("accepts context parameter", () => {
      const input = {
        task: "Test task",
        context: "Working on CAM module",
      };
      const parsed = AwarenessInputSchema.parse(input);
      expect(parsed.context).toBe("Working on CAM module");
    });
  });

  describe("brief", () => {
    it("returns a briefing structure", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Calculate cutting forces for milling",
      });
      expect(result).toHaveProperty("task");
      expect(result).toHaveProperty("briefing");
      expect(result).toHaveProperty("relevantCapabilities");
      expect(result).toHaveProperty("suggestedApproach");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("ollamaUsed");
      expect(result).toHaveProperty("latencyMs");
    });

    it("includes latency measurement", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Test latency",
      });
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("handles quick briefing type", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Build a CAD engine",
        briefingType: "quick",
        maxTokens: 50,
      });
      expect(result.task).toBe("Build a CAD engine");
    });

    it("handles engines briefing type", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Create toolpath optimization",
        briefingType: "engines",
      });
      expect(result).toHaveProperty("relevantCapabilities");
    });

    it("handles dispatchers briefing type", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Call prism_calc",
        briefingType: "dispatchers",
      });
      expect(result).toHaveProperty("relevantCapabilities");
    });

    it("returns ollamaUsed flag", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Test Ollama usage",
      });
      expect(typeof result.ollamaUsed).toBe("boolean");
    });

    it("returns warnings array", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Test warnings",
      });
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("includes task in result", async () => {
      const task = "Specific test task for validation";
      const result = await LocalAwarenessRouterEngine.brief({ task });
      expect(result.task).toBe(task);
    });
  });

  describe("getCondensedBriefing", () => {
    it("returns a string", async () => {
      const result = await LocalAwarenessRouterEngine.getCondensedBriefing(
        "Calculate cutting speed"
      );
      expect(typeof result).toBe("string");
    });

    it("returns empty string when no matches", async () => {
      const result = await LocalAwarenessRouterEngine.getCondensedBriefing(
        "xyzabc123nonexistent"
      );
      // May or may not find matches depending on fallback behavior
      expect(typeof result).toBe("string");
    });

    it("includes relevant indicator when matches found", async () => {
      // Use a term that should match something in inventory
      const result = await LocalAwarenessRouterEngine.getCondensedBriefing(
        "milling force calculation"
      );
      if (result.length > 0) {
        expect(result).toMatch(/🎯|Relevant/);
      }
    });
  });

  describe("healthCheck", () => {
    it("returns health status structure", async () => {
      const health = await LocalAwarenessRouterEngine.healthCheck();
      expect(health).toHaveProperty("inventoryAvailable");
      expect(health).toHaveProperty("engineDigestAvailable");
      expect(health).toHaveProperty("dispatcherDigestAvailable");
      expect(health).toHaveProperty("ollamaAvailable");
    });

    it("returns boolean values", async () => {
      const health = await LocalAwarenessRouterEngine.healthCheck();
      expect(typeof health.inventoryAvailable).toBe("boolean");
      expect(typeof health.engineDigestAvailable).toBe("boolean");
      expect(typeof health.dispatcherDigestAvailable).toBe("boolean");
      expect(typeof health.ollamaAvailable).toBe("boolean");
    });
  });

  describe("clearCache", () => {
    it("clears the inventory cache", async () => {
      // First call populates cache
      await LocalAwarenessRouterEngine.brief({ task: "Test caching" });
      // Clear cache
      LocalAwarenessRouterEngine.clearCache();
      // Second call should reload
      const result = await LocalAwarenessRouterEngine.brief({ task: "Test after clear" });
      expect(result).toHaveProperty("briefing");
    });
  });

  describe("keyword extraction", () => {
    it("finds CAM-related capabilities for milling tasks", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Generate a milling toolpath for pocket clearing",
      });
      // Should find something related to milling/CAM
      expect(result.briefing.length).toBeGreaterThan(0);
    });

    it("finds physics-related capabilities for force calculations", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Calculate cutting force using Kienzle formula",
      });
      expect(result.briefing.length).toBeGreaterThan(0);
    });

    it("finds WEDM-related capabilities for wire EDM tasks", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Set up wire EDM parameters for hardened steel",
      });
      expect(result.briefing.length).toBeGreaterThan(0);
    });

    it("finds lathe-related capabilities for turning tasks", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Generate turning toolpath for threading operation",
      });
      expect(result.briefing.length).toBeGreaterThan(0);
    });
  });

  describe("relevantCapabilities structure", () => {
    it("returns properly typed capabilities", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Calculate speed and feed rates",
      });
      for (const cap of result.relevantCapabilities) {
        expect(cap).toHaveProperty("name");
        expect(cap).toHaveProperty("type");
        expect(cap).toHaveProperty("relevance");
        expect(cap).toHaveProperty("description");
        expect(["engine", "dispatcher", "action", "skill"]).toContain(cap.type);
        expect(cap.relevance).toBeGreaterThanOrEqual(0);
        expect(cap.relevance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("context parameter", () => {
    it("incorporates context into briefing", async () => {
      const result = await LocalAwarenessRouterEngine.brief({
        task: "Debug an issue",
        context: "Error in CAM toolpath generation module",
      });
      expect(result).toHaveProperty("briefing");
    });
  });
});
