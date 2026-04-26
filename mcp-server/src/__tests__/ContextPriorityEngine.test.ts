/**
 * ContextPriorityEngine Tests — Intelligent context injection prioritization
 *
 * @module ContextPriorityEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ContextPriorityEngine,
  ContextItem,
  TaskClassification,
  contextPriorityEngine,
} from "../engines/ContextPriorityEngine.js";

describe("ContextPriorityEngine", () => {
  let engine: ContextPriorityEngine;

  beforeEach(() => {
    engine = new ContextPriorityEngine();
  });

  describe("classifyTask", () => {
    it("should classify machining domain from keywords", () => {
      const result = engine.classifyTask("optimize cnc toolpath for milling operation with multiple passes and detailed geometry requirements for precision");
      expect(result.primaryDomain).toBe("machining");
      expect(result.taskType).toBe("optimize");
      expect(result.urgency).toBe("standard");
      expect(result.complexity).toBe("moderate"); // > 100 chars, no "simple"/"quick"/"complex"/"comprehensive" keywords
    });

    it("should classify cad domain", () => {
      const result = engine.classifyTask("create a solid model with step export");
      expect(result.primaryDomain).toBe("cad");
      expect(result.taskType).toBe("build");
    });

    it("should classify ai domain", () => {
      const result = engine.classifyTask("train neural network for inference");
      expect(result.primaryDomain).toBe("ai");
      // secondaryDomains may be empty or have matches depending on exact keywords
      expect(Array.isArray(result.secondaryDomains)).toBe(true);
    });

    it("should classify infrastructure domain", () => {
      const result = engine.classifyTask("wire new dispatcher with schema");
      expect(result.primaryDomain).toBe("infrastructure");
      expect(result.taskType).toBe("wire");
    });

    it("should classify build task type", () => {
      const result = engine.classifyTask("create new engine for feature");
      expect(result.taskType).toBe("build");
      expect(result.primaryDomain).toBe("cad"); // "feature" matches cad domain
    });

    it("should classify debug task type", () => {
      const result = engine.classifyTask("fix bug in failing test");
      expect(result.taskType).toBe("debug");
    });

    it("should classify analyze task type", () => {
      const result = engine.classifyTask("audit code for review");
      expect(result.taskType).toBe("analyze");
    });

    it("should detect urgent complexity", () => {
      const result = engine.classifyTask("urgent fix now asap");
      expect(result.urgency).toBe("immediate");
    });

    it("should detect background urgency", () => {
      const result = engine.classifyTask("when you can, do this background task");
      expect(result.urgency).toBe("background");
    });

    it("should detect complex tasks by keyword", () => {
      const result = engine.classifyTask("complex comprehensive task");
      expect(result.complexity).toBe("complex");
    });

    it("should detect complex tasks by length", () => {
      const result = engine.classifyTask("task " + "x".repeat(500));
      expect(result.complexity).toBe("complex");
    });

    it("should detect simple tasks", () => {
      const result = engine.classifyTask("simple quick fix");
      expect(result.complexity).toBe("simple");
    });

    it("should identify secondary domains", () => {
      const result = engine.classifyTask("create cad model with neural network ml optimization");
      expect(result.primaryDomain).toBe("cad");
      expect(result.secondaryDomains).toContain("ai");
    });

    it("should return general domain when no keywords match", () => {
      const result = engine.classifyTask("do something random");
      expect(result.primaryDomain).toBe("general");
      expect(result.secondaryDomains).toEqual([]);
    });
  });

  describe("computeRelevance", () => {
    const baseItem: ContextItem = {
      id: "test-item",
      category: "domain",
      tokens: 100,
      relevanceScore: 0.8,
      content: "test content",
      decayFactor: 1.0,
    };

    const classification: TaskClassification = {
      primaryDomain: "machining",
      secondaryDomains: ["physics"],
      taskType: "build",
      urgency: "standard",
      complexity: "moderate",
    };

    it("should boost relevance for matching domain items", () => {
      const machiningItem = { ...baseItem, id: "machining-guide" };
      const score = engine.computeRelevance(machiningItem, classification);
      expect(score).toBe(1.0); // 0.8 * 1.5 = 1.2, clamped to 1.0
    });

    it("should reduce relevance for non-matching domain items", () => {
      const webItem = { ...baseItem, id: "web-guide" };
      const score = engine.computeRelevance(webItem, classification);
      expect(score).toBeCloseTo(0.24, 2); // 0.8 * 0.3 = 0.24
    });

    it("should boost core category items", () => {
      const coreItem: ContextItem = { ...baseItem, category: "core", id: "core-item" };
      const score = engine.computeRelevance(coreItem, classification);
      expect(score).toBeCloseTo(0.96, 2); // 0.8 * 1.2 = 0.96
    });

    it("should apply decay for recently injected items", () => {
      const item: ContextItem = { ...baseItem, id: "decay-test", category: "core" };
      const freshScore = engine.computeRelevance(item, classification);
      expect(freshScore).toBeCloseTo(0.96, 2);

      // Simulate injection by planning
      engine.planInjections("test", [item], 1000);

      const decayedScore = engine.computeRelevance(item, classification);
      expect(decayedScore).toBeLessThan(freshScore);
      expect(decayedScore).toBeCloseTo(0, 1); // Immediately after injection, decay is near 0
    });

    it("should clamp relevance to maximum 1.0", () => {
      const highItem = { ...baseItem, relevanceScore: 2.0, id: "machining-high" };
      const score = engine.computeRelevance(highItem, classification);
      expect(score).toBe(1.0);
    });

    it("should clamp relevance to minimum 0", () => {
      const lowItem = { ...baseItem, relevanceScore: -0.5 };
      const score = engine.computeRelevance(lowItem, classification);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should match secondary domains", () => {
      const physicsItem = { ...baseItem, id: "physics-constants" };
      const score = engine.computeRelevance(physicsItem, classification);
      expect(score).toBe(1.0); // physics in secondary domains, gets 1.5x boost
    });
  });

  describe("planInjections", () => {
    const items: ContextItem[] = [
      { id: "high-relevance", category: "core", tokens: 100, relevanceScore: 0.9, content: "high", decayFactor: 1.0 },
      { id: "medium-relevance", category: "domain", tokens: 200, relevanceScore: 0.5, content: "medium", decayFactor: 1.0 },
      { id: "low-relevance", category: "reference", tokens: 150, relevanceScore: 0.05, content: "low", decayFactor: 1.0 },
    ];

    it("should include high relevance items first", () => {
      const plan = engine.planInjections("build new feature", items, 500);
      expect(plan.items[0].id).toBe("high-relevance");
      expect(plan.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should respect token budget", () => {
      const plan = engine.planInjections("build new feature", items, 150);
      expect(plan.totalTokens).toBeLessThanOrEqual(150);
      expect(plan.items.length).toBe(1);
      expect(plan.items[0].tokens).toBe(100);
    });

    it("should skip low relevance items (below 0.1 threshold)", () => {
      const plan = engine.planInjections("build new feature", items, 1000);
      const skippedIds = plan.skipped.map(s => s.id);
      expect(skippedIds).toContain("low-relevance");
      const skippedLow = plan.skipped.find(s => s.id === "low-relevance");
      expect(skippedLow?.reason).toBe("low relevance");
    });

    it("should track budget-exceeded skips", () => {
      const plan = engine.planInjections("test", items, 100);
      const budgetSkips = plan.skipped.filter(s => s.reason === "budget exceeded");
      expect(budgetSkips.length).toBeGreaterThan(0);
    });

    it("should return task classification with plan", () => {
      const plan = engine.planInjections("fix bug in cnc milling code", items, 500);
      expect(plan.classification.taskType).toBe("debug");
      expect(plan.classification.primaryDomain).toBe("machining"); // cnc and milling are machining keywords
    });

    it("should increment turn counter", () => {
      const initialStats = engine.stats();
      expect(initialStats.currentTurn).toBe(0);
      engine.planInjections("test", items, 500);
      const afterStats = engine.stats();
      expect(afterStats.currentTurn).toBe(1);
    });

    it("should update injection history size", () => {
      engine.planInjections("test", items, 500);
      const stats = engine.stats();
      expect(stats.historySize).toBe(2); // high and medium, not low
    });

    it("should handle empty items array", () => {
      const plan = engine.planInjections("test", [], 500);
      expect(plan.items).toHaveLength(0);
      expect(plan.totalTokens).toBe(0);
      expect(plan.skipped).toHaveLength(0);
    });

    it("should handle zero budget", () => {
      const plan = engine.planInjections("test", items, 0);
      expect(plan.items).toHaveLength(0);
      expect(plan.totalTokens).toBe(0);
      // Items with relevance >= 0.1 should be skipped for budget
      expect(plan.skipped.filter(s => s.reason === "budget exceeded").length).toBe(2);
    });

    it("should calculate correct total tokens", () => {
      const plan = engine.planInjections("test", items, 1000);
      const expectedTokens = plan.items.reduce((sum, item) => sum + item.tokens, 0);
      expect(plan.totalTokens).toBe(expectedTokens);
    });
  });

  describe("generateCompressedRecall", () => {
    it("should return empty string for unknown items", () => {
      const recall = engine.generateCompressedRecall("unknown-item");
      expect(recall).toBe("");
    });

    it("should return recall string with turn number for injected items", () => {
      const items: ContextItem[] = [
        { id: "test-item", category: "core", tokens: 100, relevanceScore: 0.9, content: "test", decayFactor: 1.0 },
      ];
      engine.planInjections("test", items, 500);
      const recall = engine.generateCompressedRecall("test-item");
      expect(recall).toBe("[Recall: test-item from turn 1]");
    });

    it("should track multiple injection turns", () => {
      const items: ContextItem[] = [
        { id: "item-a", category: "core", tokens: 100, relevanceScore: 0.9, content: "a", decayFactor: 1.0 },
      ];
      engine.planInjections("test1", items, 500);
      engine.planInjections("test2", items, 500);
      engine.planInjections("test3", items, 500);
      const recall = engine.generateCompressedRecall("item-a");
      expect(recall).toBe("[Recall: item-a from turn 3]");
    });
  });

  describe("resetHistory", () => {
    it("should clear injection history and turn counter", () => {
      const items: ContextItem[] = [
        { id: "test-item", category: "core", tokens: 100, relevanceScore: 0.9, content: "test", decayFactor: 1.0 },
      ];
      engine.planInjections("test", items, 500);
      engine.planInjections("test2", items, 500);
      expect(engine.stats().historySize).toBe(1);
      expect(engine.stats().currentTurn).toBe(2);

      engine.resetHistory();

      expect(engine.stats().historySize).toBe(0);
      expect(engine.stats().currentTurn).toBe(0);
    });

    it("should allow fresh injections after reset", () => {
      const items: ContextItem[] = [
        { id: "test-item", category: "core", tokens: 100, relevanceScore: 0.9, content: "test", decayFactor: 1.0 },
      ];
      engine.planInjections("test", items, 500);
      engine.resetHistory();
      engine.planInjections("test", items, 500);
      expect(engine.stats().currentTurn).toBe(1);
      expect(engine.generateCompressedRecall("test-item")).toBe("[Recall: test-item from turn 1]");
    });
  });

  describe("stats", () => {
    it("should return initial stats", () => {
      const stats = engine.stats();
      expect(stats.historySize).toBe(0);
      expect(stats.currentTurn).toBe(0);
    });

    it("should return updated stats after operations", () => {
      const items: ContextItem[] = [
        { id: "a", category: "core", tokens: 50, relevanceScore: 0.9, content: "a", decayFactor: 1.0 },
        { id: "b", category: "core", tokens: 50, relevanceScore: 0.8, content: "b", decayFactor: 1.0 },
      ];
      engine.planInjections("test", items, 500);
      const stats = engine.stats();
      expect(stats.historySize).toBe(2);
      expect(stats.currentTurn).toBe(1);
    });
  });

  describe("singleton export", () => {
    it("should export a working singleton instance", () => {
      const result = contextPriorityEngine.classifyTask("random words here");
      expect(result.primaryDomain).toBe("general");
      expect(result.taskType).toBe("other");
    });
  });
});
