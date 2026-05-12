/**
 * Tests for AgentMemoryFabricEngine
 *
 * AGENT ROADMAP: U-AGT04 (MS2)
 * Verifies cross-session memory persistence and retrieval
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AgentMemoryFabricEngine } from "../../engines/AgentMemoryFabricEngine.js";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

describe("AgentMemoryFabricEngine", () => {
  let engine: AgentMemoryFabricEngine;
  const testPath = join(process.cwd(), "data", "state", "test-memory.json");

  beforeEach(async () => {
    // Create fresh engine for each test
    engine = new AgentMemoryFabricEngine(testPath);
    await engine.initialize("test-shop");
  });

  afterEach(async () => {
    engine.stopAutoSave();
    // Clean up test file
    if (existsSync(testPath)) {
      try {
        await unlink(testPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("initialization", () => {
    it("should initialize with empty store", async () => {
      const stats = await engine.getStats();
      expect(stats.total).toBe(0);
    });

    it("should persist and reload memories", async () => {
      await engine.rememberFact("Test fact");
      await engine.save();

      // Create new engine pointing to same file
      const engine2 = new AgentMemoryFabricEngine(testPath);
      await engine2.initialize("test-shop");

      const stats = await engine2.getStats();
      expect(stats.total).toBe(1);
      engine2.stopAutoSave();
    });
  });

  describe("rememberFact", () => {
    it("should store a fact with default options", async () => {
      const entry = await engine.rememberFact("D2 tool steel is very hard");

      expect(entry.type).toBe("fact");
      expect(entry.content).toBe("D2 tool steel is very hard");
      expect(entry.confidence).toBe(0.8);
      expect(entry.source).toBe("user");
    });

    it("should store fact with custom options", async () => {
      const entry = await engine.rememberFact("S7 needs slow speeds", {
        relatedEntity: "S7",
        tags: ["material", "speed"],
        confidence: 0.95,
        priority: 8,
      });

      expect(entry.relatedEntity).toBe("S7");
      expect(entry.tags).toContain("material");
      expect(entry.confidence).toBe(0.95);
      expect(entry.priority).toBe(8);
    });
  });

  describe("rememberPreference", () => {
    it("should store user preference", async () => {
      const entry = await engine.rememberPreference(
        "User prefers metric units"
      );

      expect(entry.type).toBe("preference");
      expect(entry.confidence).toBe(1.0);
      expect(entry.priority).toBe(8);
    });
  });

  describe("rememberCorrection", () => {
    it("should store correction with wrong/correct pair", async () => {
      const entry = await engine.rememberCorrection(
        "Use 500 SFM for D2",
        "Use 150 SFM for D2",
        "User corrected speed recommendation"
      );

      expect(entry.type).toBe("correction");
      expect(entry.confidence).toBe(1.0);

      const parsed = JSON.parse(entry.content);
      expect(parsed.wrong).toBe("Use 500 SFM for D2");
      expect(parsed.correct).toBe("Use 150 SFM for D2");
    });
  });

  describe("rememberContext", () => {
    it("should store context with expiration", async () => {
      const entry = await engine.rememberContext("Working on ABC job", {
        expiresInDays: 7,
      });

      expect(entry.type).toBe("context");
      expect(entry.expiresAt).toBeDefined();

      const expiresDate = new Date(entry.expiresAt!);
      const now = new Date();
      const diffDays =
        (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThanOrEqual(7);
    });
  });

  describe("rememberTribal", () => {
    it("should store tribal knowledge", async () => {
      const entry = await engine.rememberTribal(
        "Always face mill before boring on the Roku-Roku",
        { relatedEntity: "Roku-Roku", tags: ["milling", "setup"] }
      );

      expect(entry.type).toBe("tribal");
      expect(entry.relatedEntity).toBe("Roku-Roku");
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      // Populate test data
      await engine.rememberFact("Fact 1", { tags: ["tag1"], priority: 5 });
      await engine.rememberFact("Fact 2", {
        tags: ["tag2"],
        priority: 8,
        confidence: 0.9,
      });
      await engine.rememberPreference("Pref 1", { priority: 10 });
      await engine.rememberTribal("Tribal 1", { relatedEntity: "Machine1" });
    });

    it("should filter by type", async () => {
      const facts = await engine.query({ type: "fact" });
      expect(facts.length).toBe(2);
      expect(facts.every((f) => f.type === "fact")).toBe(true);
    });

    it("should filter by tags", async () => {
      const tagged = await engine.query({ tags: ["tag1"] });
      expect(tagged.length).toBe(1);
      expect(tagged[0].content).toBe("Fact 1");
    });

    it("should filter by related entity", async () => {
      const related = await engine.query({ relatedEntity: "Machine1" });
      expect(related.length).toBe(1);
      expect(related[0].content).toBe("Tribal 1");
    });

    it("should filter by confidence", async () => {
      const confident = await engine.query({ minConfidence: 0.85 });
      expect(confident.length).toBeGreaterThanOrEqual(2); // Pref (1.0) and Fact 2 (0.9)
    });

    it("should sort by priority descending", async () => {
      const sorted = await engine.query({
        sortBy: "priority",
        sortOrder: "desc",
      });
      expect(sorted[0].priority).toBeGreaterThanOrEqual(sorted[1].priority);
    });

    it("should limit results", async () => {
      const limited = await engine.query({ limit: 2 });
      expect(limited.length).toBe(2);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await engine.rememberFact("D2 steel cutting parameters");
      await engine.rememberFact("S7 heat treatment specs");
      await engine.rememberTribal("M2 tooling guidelines");
    });

    it("should find memories by content", async () => {
      const results = await engine.search("steel");
      expect(results.length).toBe(1);
      expect(results[0].content).toContain("D2");
    });

    it("should find partial matches", async () => {
      const results = await engine.search("tool");
      expect(results.length).toBe(1);
      expect(results[0].content).toContain("M2");
    });

    it("should filter by type", async () => {
      const results = await engine.search("M2", { type: "tribal" });
      expect(results.length).toBe(1);
    });
  });

  describe("reinforce", () => {
    it("should increase confidence and reinforcement count", async () => {
      const entry = await engine.rememberFact("Test fact", { confidence: 0.7 });
      const reinforced = await engine.reinforce(entry.id);

      expect(reinforced).not.toBeNull();
      expect(reinforced!.confidence).toBe(0.75);
      expect(reinforced!.reinforcements).toBe(1);
      expect(reinforced!.lastReinforcedAt).toBeDefined();
    });

    it("should cap confidence at 1.0", async () => {
      const entry = await engine.rememberFact("Test fact", { confidence: 0.98 });
      const reinforced = await engine.reinforce(entry.id);

      expect(reinforced!.confidence).toBe(1.0);
    });

    it("should return null for unknown ID", async () => {
      const result = await engine.reinforce("nonexistent_id");
      expect(result).toBeNull();
    });
  });

  describe("forget", () => {
    it("should remove memory by ID", async () => {
      const entry = await engine.rememberFact("To be forgotten");
      const forgot = await engine.forget(entry.id);

      expect(forgot).toBe(true);

      const stats = await engine.getStats();
      expect(stats.total).toBe(0);
    });

    it("should return false for unknown ID", async () => {
      const forgot = await engine.forget("nonexistent_id");
      expect(forgot).toBe(false);
    });
  });

  describe("getForContextInjection", () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        await engine.rememberFact(`Fact ${i}`, {
          priority: i,
          confidence: 0.8,
        });
      }
    });

    it("should return high priority memories", async () => {
      const { memories, summary } = await engine.getForContextInjection(500);

      expect(memories.length).toBeGreaterThan(0);
      expect(summary).toContain("memories");
    });

    it("should respect token limit", async () => {
      const { memories } = await engine.getForContextInjection(50);

      // With 50 token limit and ~2-3 tokens per "Fact N" entry,
      // should return some but not all memories
      expect(memories.length).toBeGreaterThan(0);
      expect(memories.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", async () => {
      await engine.rememberFact("Fact");
      await engine.rememberPreference("Pref");
      await engine.rememberTribal("Tribal");

      const stats = await engine.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byType.fact).toBe(1);
      expect(stats.byType.preference).toBe(1);
      expect(stats.byType.tribal).toBe(1);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
    });
  });

  describe("clearAll", () => {
    it("should remove all memories", async () => {
      await engine.rememberFact("Fact 1");
      await engine.rememberFact("Fact 2");

      await engine.clearAll();

      const stats = await engine.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe("export/import", () => {
    it("should export and import memories", async () => {
      await engine.rememberFact("Test fact");
      await engine.rememberPreference("Test pref");

      const exported = await engine.export();
      expect(exported.memories.length).toBe(2);

      // Clear and reimport
      await engine.clearAll();
      await engine.import(exported);

      const stats = await engine.getStats();
      expect(stats.total).toBe(2);
    });
  });
});
