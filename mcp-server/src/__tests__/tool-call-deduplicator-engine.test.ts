import { describe, it, expect } from "vitest";
import { ToolCallDeduplicatorEngine } from "../engines/ToolCallDeduplicatorEngine.js";

describe("ToolCallDeduplicatorEngine", () => {

  describe("check and record", () => {
    it("detects exact duplicates", () => {
      const engine = new ToolCallDeduplicatorEngine();
      const params = { file_path: "src/index.ts" };
      engine.record("Read", params);
      const result = engine.check("Read", params);
      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain("Exact duplicate");
    });

    it("allows different tool calls", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Read", { file_path: "a.ts" });
      const result = engine.check("Read", { file_path: "b.ts" });
      expect(result.isDuplicate).toBe(false);
    });

    it("allows different tools same params", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Read", { file_path: "a.ts" });
      const result = engine.check("Grep", { file_path: "a.ts" });
      expect(result.isDuplicate).toBe(false);
    });

    it("detects near-duplicates", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Grep", { pattern: "export class FooEngine", path: "src/" });
      // Very similar pattern
      const result = engine.check("Grep", { pattern: "export class FooEngine", path: "src/" });
      expect(result.isDuplicate).toBe(true);
    });

    it("reports age of duplicate", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Read", { file_path: "a.ts" });
      const result = engine.check("Read", { file_path: "a.ts" });
      expect(result.age).toBeDefined();
      expect(result.age!).toBeLessThan(5);
    });
  });

  describe("stats", () => {
    it("tracks recorded calls", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Read", { file_path: "a.ts" });
      engine.record("Grep", { pattern: "foo" });
      engine.record("Read", { file_path: "b.ts" });
      const s = engine.stats();
      expect(s.totalRecorded).toBe(3);
      expect(s.uniqueTools).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears all records", () => {
      const engine = new ToolCallDeduplicatorEngine();
      engine.record("Read", { file_path: "a.ts" });
      engine.reset();
      const result = engine.check("Read", { file_path: "a.ts" });
      expect(result.isDuplicate).toBe(false);
    });
  });
});
