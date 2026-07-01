import { describe, it, expect } from "vitest";
import { FileAccessPatternEngine } from "../engines/FileAccessPatternEngine.js";

describe("FileAccessPatternEngine", () => {

  describe("record and profile", () => {
    it("tracks file accesses", () => {
      const engine = new FileAccessPatternEngine();
      engine.record("src/index.ts", "read");
      engine.record("src/index.ts", "edit");
      const p = engine.profile("src/index.ts");
      expect(p.readCount).toBe(1);
      expect(p.editCount).toBe(1);
      expect(p.totalAccess).toBe(2);
    });

    it("normalizes paths", () => {
      const engine = new FileAccessPatternEngine();
      engine.record("src\\engines\\index.ts", "read");
      const p = engine.profile("src/engines/index.ts");
      expect(p.readCount).toBe(1);
    });

    it("detects hot files", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 6; i++) engine.record("hot.ts", "read");
      const p = engine.profile("hot.ts");
      expect(p.isHot).toBe(true);
    });

    it("detects read-without-edit", () => {
      const engine = new FileAccessPatternEngine();
      engine.record("readonly.ts", "read");
      engine.record("readonly.ts", "read");
      const p = engine.profile("readonly.ts");
      expect(p.readWithoutEdit).toBe(true);
    });
  });

  describe("hotFiles", () => {
    it("returns files sorted by access count", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 10; i++) engine.record("very-hot.ts", "read");
      for (let i = 0; i < 5; i++) engine.record("warm.ts", "read");
      engine.record("cold.ts", "read");
      const hot = engine.hotFiles();
      expect(hot.length).toBe(2);
      expect(hot[0].file).toContain("very-hot");
    });
  });

  describe("insights", () => {
    it("detects read waste", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 4; i++) engine.record("wasted.ts", "read");
      const insights = engine.insights();
      expect(insights.some(i => i.type === "read-waste")).toBe(true);
    });

    it("detects re-read pattern", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 5; i++) engine.record("reread.ts", "read");
      const insights = engine.insights();
      expect(insights.some(i => i.type === "re-read")).toBe(true);
    });

    it("detects edit-heavy files", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 4; i++) engine.record("edited.ts", "edit");
      const insights = engine.insights();
      expect(insights.some(i => i.type === "edit-heavy")).toBe(true);
    });
  });

  describe("totalWaste", () => {
    it("sums savings estimates", () => {
      const engine = new FileAccessPatternEngine();
      for (let i = 0; i < 5; i++) engine.record("a.ts", "read");
      for (let i = 0; i < 4; i++) engine.record("b.ts", "read");
      expect(engine.totalWaste()).toBeGreaterThan(0);
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const engine = new FileAccessPatternEngine();
      engine.record("a.ts", "read");
      engine.record("b.ts", "edit");
      const line = engine.oneLiner();
      expect(line).toContain("2 accesses");
      expect(line).toContain("2 files");
    });
  });

  describe("reset", () => {
    it("clears all data", () => {
      const engine = new FileAccessPatternEngine();
      engine.record("a.ts", "read");
      engine.reset();
      expect(engine.oneLiner()).toContain("0 accesses");
    });
  });
});
