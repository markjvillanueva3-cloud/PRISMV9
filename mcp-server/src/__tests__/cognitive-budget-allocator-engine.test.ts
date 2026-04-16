/**
 * Tests for CognitiveBudgetAllocatorEngine (Phase 0.18 U-AGI12)
 */

import { describe, it, expect } from "vitest";
import {
  CognitiveBudgetAllocatorEngine,
  cognitiveBudgetAllocatorEngine,
} from "../engines/CognitiveBudgetAllocatorEngine.js";

describe("CognitiveBudgetAllocatorEngine", () => {
  const engine = new CognitiveBudgetAllocatorEngine();

  describe("validation", () => {
    it("throws on missing kind", () => {
      expect(() => engine.allocate({} as { kind: "read" })).toThrow(/kind/);
    });

    it("throws on unknown kind", () => {
      expect(() => engine.allocate({ kind: "teleport" } as unknown as { kind: "read" })).toThrow(/Unknown kind/);
    });

    it("rejects negative expectedDependents", () => {
      expect(() => engine.allocate({ kind: "edit", expectedDependents: -1 })).toThrow(/non-negative/);
    });
  });

  describe("depth classification", () => {
    it("shallow for base chat/read", () => {
      expect(engine.allocate({ kind: "chat" }).depth).toBe("shallow");
      expect(engine.allocate({ kind: "read" }).depth).toBe("shallow");
    });

    it("medium for refactor base", () => {
      expect(engine.allocate({ kind: "refactor" }).depth).toBe("medium");
    });

    it("escalates to deep with critical-file + high risk", () => {
      const a = engine.allocate({
        kind: "edit",
        riskLevel: "high",
        touchesCriticalFile: true,
      });
      expect(a.depth).toBe("deep");
    });

    it("classify() returns the tier thresholds", () => {
      expect(engine.classify(2)).toBe("shallow");
      expect(engine.classify(3)).toBe("medium");
      expect(engine.classify(5.9)).toBe("medium");
      expect(engine.classify(6)).toBe("deep");
    });
  });

  describe("depth features", () => {
    it("critical file adds the critical-file boost", () => {
      const plain = engine.allocate({ kind: "edit" }).score;
      const critical = engine.allocate({ kind: "edit", touchesCriticalFile: true }).score;
      expect(critical).toBeGreaterThan(plain);
    });

    it("dependent count adds capped boost", () => {
      const few = engine.allocate({ kind: "edit", expectedDependents: 5 }).score;
      const many = engine.allocate({ kind: "edit", expectedDependents: 500 }).score;
      expect(many).toBeGreaterThanOrEqual(few);
      expect(many - engine.allocate({ kind: "edit" }).score).toBeLessThanOrEqual(3);
    });

    it("previous failure raises score", () => {
      const a = engine.allocate({ kind: "edit" }).score;
      const b = engine.allocate({ kind: "edit", hasPreviousFailure: true }).score;
      expect(b).toBeGreaterThan(a);
    });

    it("user-urgent lowers score (pulls toward shallow)", () => {
      const a = engine.allocate({ kind: "analysis" }).score;
      const b = engine.allocate({ kind: "analysis", userUrgent: true }).score;
      expect(b).toBeLessThan(a);
    });

    it("risk tier adds escalating boost", () => {
      const lowS = engine.allocate({ kind: "edit", riskLevel: "low" }).score;
      const medS = engine.allocate({ kind: "edit", riskLevel: "medium" }).score;
      const highS = engine.allocate({ kind: "edit", riskLevel: "high" }).score;
      const critS = engine.allocate({ kind: "edit", riskLevel: "critical" }).score;
      expect(lowS).toBeLessThanOrEqual(medS);
      expect(medS).toBeLessThan(highS);
      expect(highS).toBeLessThan(critS);
    });
  });

  describe("output shape", () => {
    it("includes rationale entries for every contributing feature", () => {
      const a = engine.allocate({
        kind: "edit",
        riskLevel: "high",
        touchesCriticalFile: true,
        expectedDependents: 3,
        hasPreviousFailure: true,
        userUrgent: true,
      });
      expect(a.rationale.join(" ")).toContain("base(edit)");
      expect(a.rationale.join(" ")).toContain("risk(high)");
      expect(a.rationale.join(" ")).toContain("critical-file");
      expect(a.rationale.join(" ")).toContain("dependent");
      expect(a.rationale.join(" ")).toContain("prior-failure");
      expect(a.rationale.join(" ")).toContain("user-urgent");
    });

    it("tokens scale with depth", () => {
      expect(engine.allocate({ kind: "chat" }).maxTokens).toBe(500);
      expect(engine.allocate({ kind: "refactor" }).maxTokens).toBeGreaterThanOrEqual(2000);
      expect(
        engine.allocate({ kind: "refactor", riskLevel: "critical" }).maxTokens
      ).toBeGreaterThanOrEqual(8000);
    });

    it("respects a supplied tokenEstimate when it exceeds the floor", () => {
      const a = engine.allocate({ kind: "chat", tokenEstimate: 1500 });
      expect(a.maxTokens).toBe(1500);
    });

    it("allowSimulation is off for shallow, on for medium/deep", () => {
      expect(engine.allocate({ kind: "chat" }).allowSimulation).toBe(false);
      expect(engine.allocate({ kind: "refactor" }).allowSimulation).toBe(true);
    });

    it("allowMultiAgent only on deep", () => {
      expect(engine.allocate({ kind: "refactor" }).allowMultiAgent).toBe(false);
      expect(
        engine.allocate({
          kind: "create",
          riskLevel: "critical",
          touchesCriticalFile: true,
        }).allowMultiAgent
      ).toBe(true);
    });

    it("score is rounded to two decimals", () => {
      const a = engine.allocate({ kind: "edit", expectedDependents: 7 });
      const decimals = (a.score.toString().split(".")[1] ?? "").length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(cognitiveBudgetAllocatorEngine.allocate({ kind: "chat" }).depth).toBe("shallow");
    });
  });
});
