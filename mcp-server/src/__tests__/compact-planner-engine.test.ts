import { describe, it, expect } from "vitest";
import { CompactPlannerEngine } from "../engines/CompactPlannerEngine.js";
import type { ContentItem } from "../engines/CompactPlannerEngine.js";

describe("CompactPlannerEngine", () => {
  const engine = new CompactPlannerEngine();

  const makeItems = (): ContentItem[] => [
    { category: "active-task", summary: "Fix bug in router", tokens: 200, priority: 1, age: 5 },
    { category: "user-preference", summary: "User wants TypeScript", tokens: 50, priority: 1, age: 30 },
    { category: "decision", summary: "Chose vitest over jest", tokens: 100, priority: 2, age: 20 },
    { category: "file-state", summary: "index.ts has 2400 lines", tokens: 300, priority: 3, age: 15 },
    { category: "tool-result", summary: "Grep found 50 matches", tokens: 800, priority: 5, age: 10 },
    { category: "stale", summary: "Old build output", tokens: 500, priority: 5, age: 60 },
    { category: "exploration", summary: "Explored src/engines/", tokens: 400, priority: 4, age: 25 },
  ];

  describe("plan", () => {
    it("keeps high-priority items first", () => {
      const items = makeItems();
      const plan = engine.plan(items, 500);
      expect(plan.keep.some(i => i.category === "active-task")).toBe(true);
      expect(plan.keep.some(i => i.category === "user-preference")).toBe(true);
    });

    it("drops low-priority items when over budget", () => {
      const items = makeItems();
      const plan = engine.plan(items, 500);
      expect(plan.drop.some(i => i.category === "tool-result")).toBe(true);
      expect(plan.drop.some(i => i.category === "stale")).toBe(true);
    });

    it("always keeps priority-1 items", () => {
      const items = makeItems();
      const plan = engine.plan(items, 100); // very tight budget
      expect(plan.keep.filter(i => i.priority === 1).length).toBe(2);
    });

    it("calculates savings correctly", () => {
      const items = makeItems();
      const plan = engine.plan(items, 500);
      expect(plan.tokensBefore).toBe(2350);
      expect(plan.tokensAfter).toBeLessThanOrEqual(500 + 250); // +250 for forced priority-1
      expect(plan.savings).toBeGreaterThan(0);
      expect(plan.savingsPercent).toBeGreaterThan(0);
    });

    it("generates notes for dropped high-priority items", () => {
      const items: ContentItem[] = [
        { category: "active-task", summary: "Task 1", tokens: 5000, priority: 1, age: 1 },
        { category: "decision", summary: "Critical decision", tokens: 5000, priority: 2, age: 1 },
      ];
      const plan = engine.plan(items, 6000);
      expect(plan.preservationNotes.some(n => n.includes("WARNING"))).toBe(true);
    });
  });

  describe("categorize", () => {
    it("detects active tasks", () => {
      expect(engine.categorize("This is a TODO item")).toBe("active-task");
    });

    it("detects errors", () => {
      expect(engine.categorize("Build failed with error")).toBe("error-context");
    });

    it("detects decisions", () => {
      expect(engine.categorize("We decided to use Zod")).toBe("decision");
    });

    it("detects user preferences", () => {
      expect(engine.categorize("User wants dark mode")).toBe("user-preference");
    });

    it("defaults to tool-result", () => {
      expect(engine.categorize("some random content")).toBe("tool-result");
    });
  });

  describe("estimateCapacity", () => {
    it("calculates item count from token budget", () => {
      expect(engine.estimateCapacity(3000, 150)).toBe(20);
    });
  });

  describe("preservationSummary", () => {
    it("generates readable summary", () => {
      const items = makeItems();
      const plan = engine.plan(items, 500);
      const summary = engine.preservationSummary(plan);
      expect(summary).toContain("Compact:");
      expect(summary).toContain("Keep:");
    });
  });

  describe("oneLiner", () => {
    it("produces compact summary", () => {
      const items = makeItems();
      const line = engine.oneLiner(items, 500);
      expect(line).toContain("Keep");
      expect(line).toContain("reduction");
    });
  });
});
