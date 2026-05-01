import { describe, it, expect } from "vitest";
import { SessionReplayEngine } from "../engines/SessionReplayEngine.js";

describe("SessionReplayEngine", () => {
  const engine = new SessionReplayEngine();

  describe("getReplayContext", () => {
    it("returns replay context with recent commits", () => {
      const ctx = engine.getReplayContext(3);
      expect(ctx).toHaveProperty("lastCommit");
      expect(ctx).toHaveProperty("recentCommits");
      expect(ctx).toHaveProperty("modifiedFiles");
      expect(ctx).toHaveProperty("activeArea");
      expect(ctx).toHaveProperty("summary");
      expect(ctx).toHaveProperty("suggestedNextSteps");
    });

    it("lastCommit has hash and message", () => {
      const ctx = engine.getReplayContext(1);
      expect(ctx.lastCommit.hash).toBeTruthy();
      expect(ctx.lastCommit.message).toBeTruthy();
    });

    it("recentCommits respects maxCommits", () => {
      const ctx = engine.getReplayContext(2);
      expect(ctx.recentCommits.length).toBeLessThanOrEqual(2);
    });

    it("summary is a non-empty string", () => {
      const ctx = engine.getReplayContext();
      expect(typeof ctx.summary).toBe("string");
      expect(ctx.summary.length).toBeGreaterThan(10);
    });
  });

  describe("getResumeLine", () => {
    it("returns a compact one-liner", () => {
      const line = engine.getResumeLine();
      expect(typeof line).toBe("string");
      expect(line.length).toBeGreaterThan(10);
      expect(line.length).toBeLessThan(500);
    });
  });

  describe("getWorkingSet", () => {
    it("returns working set info", () => {
      const ws = engine.getWorkingSet();
      expect(ws).toHaveProperty("staged");
      expect(ws).toHaveProperty("modified");
      expect(ws).toHaveProperty("untracked");
      expect(ws).toHaveProperty("hasUncommittedWork");
      expect(Array.isArray(ws.staged)).toBe(true);
      expect(Array.isArray(ws.modified)).toBe(true);
    });
  });

  describe("getDiffSummary", () => {
    it("returns a diff summary string", () => {
      const diff = engine.getDiffSummary();
      expect(typeof diff).toBe("string");
    });
  });
});
