import { describe, it, expect } from "vitest";
import { IncrementalReadEngine } from "../engines/IncrementalReadEngine.js";

describe("IncrementalReadEngine", () => {

  describe("record and getState", () => {
    it("tracks reads", () => {
      const engine = new IncrementalReadEngine();
      engine.record("a.ts", 0, 100, 500);
      const state = engine.getState("a.ts");
      expect(state.ranges.length).toBe(1);
      expect(state.totalLinesRead).toBe(100);
      expect(state.coveragePercent).toBe(20);
    });

    it("normalizes paths", () => {
      const engine = new IncrementalReadEngine();
      engine.record("src\\engines\\a.ts", 0, 50);
      const state = engine.getState("src/engines/a.ts");
      expect(state.ranges.length).toBe(1);
    });

    it("accumulates coverage", () => {
      const engine = new IncrementalReadEngine();
      engine.setFileSize("a.ts", 200);
      engine.record("a.ts", 0, 100);
      engine.record("a.ts", 100, 100);
      const state = engine.getState("a.ts");
      expect(state.coveragePercent).toBe(100);
    });
  });

  describe("advise", () => {
    it("suggests full read for new small files", () => {
      const engine = new IncrementalReadEngine();
      engine.setFileSize("small.ts", 50);
      const advice = engine.advise("small.ts");
      expect(advice.action).toBe("full-read");
    });

    it("suggests grep for new large files", () => {
      const engine = new IncrementalReadEngine();
      engine.setFileSize("big.ts", 1000);
      const advice = engine.advise("big.ts");
      expect(advice.action).toBe("grep");
    });

    it("suggests skip for recently read files", () => {
      const engine = new IncrementalReadEngine();
      engine.record("recent.ts", 0, 100);
      const advice = engine.advise("recent.ts");
      expect(advice.action).toBe("skip");
      expect(advice.estimatedTokens).toBe(0);
    });

    it("suggests incremental for partially read files", () => {
      const engine = new IncrementalReadEngine();
      engine.setFileSize("partial.ts", 500);
      // Simulate a read that happened a while ago
      const ranges = (engine as unknown as { reads: Map<string, Array<{ offset: number; limit: number; timestamp: number }>> }).reads;
      ranges.set("partial.ts", [{ offset: 0, limit: 100, timestamp: Date.now() - 60000 }]);
      const advice = engine.advise("partial.ts");
      expect(advice.action).toBe("incremental");
      expect(advice.offset).toBe(100);
    });
  });

  describe("oneLiner", () => {
    it("reports never read", () => {
      const engine = new IncrementalReadEngine();
      expect(engine.oneLiner("unknown.ts")).toBe("Never read");
    });

    it("reports coverage", () => {
      const engine = new IncrementalReadEngine();
      engine.setFileSize("a.ts", 200);
      engine.record("a.ts", 0, 100);
      const line = engine.oneLiner("a.ts");
      expect(line).toContain("50%");
      expect(line).toContain("covered");
    });
  });

  describe("reset", () => {
    it("clears all data", () => {
      const engine = new IncrementalReadEngine();
      engine.record("a.ts", 0, 100);
      engine.reset();
      expect(engine.oneLiner("a.ts")).toBe("Never read");
    });
  });
});
