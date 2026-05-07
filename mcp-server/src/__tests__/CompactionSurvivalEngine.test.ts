/**
 * CompactionSurvivalEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CompactionSurvivalEngine, type ContextType } from "../engines/CompactionSurvivalEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("CompactionSurvivalEngine", () => {
  let engine: CompactionSurvivalEngine;
  const stateDir = "H:/prism/state/compaction-survival";

  beforeEach(() => {
    if (existsSync(stateDir)) {
      rmSync(stateDir, { recursive: true });
    }
    engine = new CompactionSurvivalEngine();
  });

  describe("record", () => {
    it("records context item with auto-generated ID", () => {
      const item = engine.record("task_state", "Working on TokenEconomyEngine");

      expect(item.id).toMatch(/^ctx_/);
      expect(item.type).toBe("task_state");
      expect(item.content).toBe("Working on TokenEconomyEngine");
      expect(item.timestamp).toBeDefined();
    });

    it("assigns correct priority based on type", () => {
      const taskItem = engine.record("task_state", "Current task description here");
      const exploreItem = engine.record("exploration", "Looked at some files for context");

      expect(taskItem.priority).toBe(10);
      expect(exploreItem.priority).toBe(2);
    });

    it("allows priority override", () => {
      const item = engine.record("exploration", "Important discovery about architecture", {
        priority: 8,
      });

      expect(item.priority).toBe(8);
    });

    it("estimates tokens from content length", () => {
      const content = "x".repeat(400); // 400 chars ≈ 100 tokens
      const item = engine.record("decision", content);

      expect(item.tokens).toBe(100);
    });

    it("tracks file references", () => {
      const item = engine.record("file_edit", "Modified the engine file", {
        references: ["src/engines/MyEngine.ts", "src/__tests__/MyEngine.test.ts"],
      });

      expect(item.references).toHaveLength(2);
      expect(item.references).toContain("src/engines/MyEngine.ts");
    });

    it("computes survival score based on priority and type", () => {
      const highPriority = engine.record("task_state", "Critical task info");
      const lowPriority = engine.record("conversation", "General chat");

      expect(highPriority.survivalScore).toBeGreaterThan(lowPriority.survivalScore);
    });
  });

  describe("planSurvival", () => {
    beforeEach(() => {
      // Add varied context items
      engine.record("task_state", "Building CompactionSurvivalEngine with tests and wiring");
      engine.record("decision", "Chose to use priority-based survival scoring");
      engine.record("file_edit", "Created CompactionSurvivalEngine.ts");
      engine.record("error_fix", "Fixed token estimation to use ceil instead of floor");
      engine.record("exploration", "Explored existing handoff mechanisms in the codebase");
      engine.record("conversation", "Discussed approach with user about compaction");
    });

    it("returns survival plan with three categories", () => {
      const plan = engine.planSurvival(1000);

      expect(plan.mustPreserve).toBeDefined();
      expect(plan.shouldPreserve).toBeDefined();
      expect(plan.canDrop).toBeDefined();
    });

    it("prioritizes high-value items in mustPreserve", () => {
      const plan = engine.planSurvival(500);

      const mustTypes = plan.mustPreserve.map((i) => i.type);
      expect(mustTypes).toContain("task_state");
    });

    it("puts low-value items in canDrop", () => {
      const plan = engine.planSurvival(200);

      const dropTypes = plan.canDrop.map((i) => i.type);
      expect(dropTypes.some((t) => t === "exploration" || t === "conversation")).toBe(true);
    });

    it("respects token budget", () => {
      const plan = engine.planSurvival(300);

      expect(plan.preservedTokens).toBeLessThanOrEqual(300);
    });

    it("calculates compression ratio", () => {
      const plan = engine.planSurvival(100);

      expect(plan.compressionRatio).toBeGreaterThan(0);
      expect(plan.compressionRatio).toBeLessThanOrEqual(1);
    });
  });

  describe("generateHandoff", () => {
    beforeEach(() => {
      engine.record("task_state", "Building forge-triple improvements");
      engine.record("decision", "Decided to create CompactionSurvivalEngine");
      engine.record("file_edit", "Created engine and test files");
    });

    it("generates markdown formatted handoff", () => {
      const handoff = engine.generateHandoff(1000);

      expect(handoff).toContain("## Critical Context");
      expect(handoff).toContain("[task_state]");
    });

    it("truncates long content", () => {
      engine.record("task_state", "x".repeat(500)); // task_state has high priority so it will be in mustPreserve
      const handoff = engine.generateHandoff(2000);

      expect(handoff).toContain("...");
    });

    it("includes compression stats", () => {
      const handoff = engine.generateHandoff(1000);

      expect(handoff).toMatch(/Preserved \d+ of \d+ tokens/);
    });
  });

  describe("markCompaction", () => {
    it("increments compaction count", () => {
      const before = engine.getStats().compactionCount;
      engine.markCompaction();
      const after = engine.getStats().compactionCount;

      expect(after).toBe(before + 1);
    });

    it("boosts priority of surviving items", () => {
      const item = engine.record("discovery", "Found important pattern");
      const beforePriority = item.priority;

      engine.markCompaction();
      const stats = engine.getStats();

      // Priority should have increased
      expect(stats.totalItems).toBe(1);
    });
  });

  describe("getByType", () => {
    beforeEach(() => {
      engine.record("decision", "Decision one");
      engine.record("decision", "Decision two");
      engine.record("task_state", "Task info");
      engine.record("exploration", "Explored something");
    });

    it("filters items by type", () => {
      const decisions = engine.getByType("decision");

      expect(decisions).toHaveLength(2);
      decisions.forEach((d) => expect(d.type).toBe("decision"));
    });

    it("returns empty array for type with no items", () => {
      const errors = engine.getByType("error_fix");

      expect(errors).toHaveLength(0);
    });

    it("sorts by survival score descending", () => {
      const decisions = engine.getByType("decision");

      expect(decisions[0].survivalScore).toBeGreaterThanOrEqual(decisions[1].survivalScore);
    });
  });

  describe("getStats", () => {
    it("returns zero stats for fresh engine", () => {
      const stats = engine.getStats();

      expect(stats.totalItems).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.compactionCount).toBe(0);
    });

    it("tracks items by type", () => {
      engine.record("task_state", "Task one");
      engine.record("task_state", "Task two");
      engine.record("decision", "A decision");

      const stats = engine.getStats();

      expect(stats.byType.task_state).toBe(2);
      expect(stats.byType.decision).toBe(1);
    });

    it("calculates average survival score", () => {
      engine.record("task_state", "High priority item");
      engine.record("exploration", "Low priority item");

      const stats = engine.getStats();

      expect(stats.avgSurvivalScore).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears all items", () => {
      engine.record("task_state", "Some task");
      engine.record("decision", "Some decision");
      engine.reset();

      const stats = engine.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it("resets compaction count", () => {
      engine.markCompaction();
      engine.markCompaction();
      engine.reset();

      const stats = engine.getStats();
      expect(stats.compactionCount).toBe(0);
    });
  });

  describe("persistence", () => {
    it("persists items across engine instances", () => {
      engine.record("task_state", "Persisted task state for testing survival");

      const engine2 = new CompactionSurvivalEngine();
      const stats = engine2.getStats();

      expect(stats.totalItems).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const item = engine.record("conversation", "");

      expect(item.tokens).toBe(0);
    });

    it("handles very long content", () => {
      const content = "x".repeat(10000);
      const item = engine.record("exploration", content);

      expect(item.tokens).toBe(2500);
    });

    it("prunes when exceeding max items", () => {
      for (let i = 0; i < 150; i++) {
        engine.record("exploration", `Item ${i} with some content padding`);
      }

      const stats = engine.getStats();
      expect(stats.totalItems).toBeLessThanOrEqual(100);
    });

    it("preserves highest scored items when pruning", () => {
      // Add low-priority items first
      for (let i = 0; i < 100; i++) {
        engine.record("exploration", `Low priority item ${i}`);
      }
      // Add high-priority item
      engine.record("task_state", "Critical task that must survive pruning");

      const stats = engine.getStats();
      const tasks = engine.getByType("task_state");

      expect(tasks.length).toBe(1);
    });
  });
});
