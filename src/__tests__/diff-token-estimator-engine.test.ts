import { describe, it, expect } from "vitest";
import { DiffTokenEstimatorEngine } from "../engines/DiffTokenEstimatorEngine.js";

describe("DiffTokenEstimatorEngine", () => {
  const engine = new DiffTokenEstimatorEngine();

  describe("estimateLastCommits", () => {
    it("estimates token cost of last commit", () => {
      const est = engine.estimateLastCommits(1);
      expect(est).toHaveProperty("totalTokens");
      expect(est).toHaveProperty("additions");
      expect(est).toHaveProperty("deletions");
      expect(est).toHaveProperty("filesChanged");
      expect(est).toHaveProperty("recommendation");
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    });

    it("estimates multiple commits", () => {
      const est = engine.estimateLastCommits(3);
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe("estimateUncommitted", () => {
    it("returns estimate for uncommitted changes", () => {
      const est = engine.estimateUncommitted();
      expect(est).toHaveProperty("totalTokens");
      expect(est).toHaveProperty("recommendation");
      expect(["inline", "summarize", "skip"]).toContain(est.recommendation);
    });
  });

  describe("estimateStaged", () => {
    it("returns estimate for staged changes", () => {
      const est = engine.estimateStaged();
      expect(est).toHaveProperty("totalTokens");
    });
  });

  describe("getCompactSummary", () => {
    it("returns compact string", () => {
      const est = engine.estimateLastCommits(1);
      const summary = engine.getCompactSummary(est);
      expect(typeof summary).toBe("string");
      expect(summary).toContain("files");
      expect(summary).toContain("tokens");
    });
  });

  describe("estimateBetween", () => {
    it("estimates between refs", () => {
      const est = engine.estimateBetween("HEAD~2", "HEAD");
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
      expect(est.perFile).toBeDefined();
      if (est.filesChanged > 0) {
        expect(est.perFile[0]).toHaveProperty("file");
        expect(est.perFile[0]).toHaveProperty("tokens");
      }
    });
  });
});
