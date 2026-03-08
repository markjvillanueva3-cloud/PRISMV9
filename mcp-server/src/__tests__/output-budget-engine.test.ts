import { describe, it, expect } from "vitest";
import { OutputBudgetEngine } from "../engines/OutputBudgetEngine.js";

describe("OutputBudgetEngine", () => {
  const budget = new OutputBudgetEngine();

  describe("enforce", () => {
    it("passes small data through unchanged", () => {
      const data = { a: 1, b: "hello" };
      expect(budget.enforce(data)).toEqual(data);
    });

    it("truncates arrays to maxArrayItems", () => {
      const data = Array.from({ length: 50 }, (_, i) => i);
      const result = budget.enforce(data, { maxArrayItems: 5 }) as unknown[];
      expect(result.length).toBe(6); // 5 items + truncation marker
      expect(result[5]).toContain("truncated");
    });

    it("limits object depth", () => {
      const data = { a: { b: { c: { d: { e: "deep" } } } } };
      const result = budget.enforce(data, { maxDepth: 2 }) as Record<string, Record<string, unknown>>;
      expect(result.a.b).toContain("[Object(");
    });

    it("respects maxChars limit", () => {
      const data = "x".repeat(10000);
      const result = budget.enforceString(data, { maxChars: 500 });
      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe("filterFields", () => {
    it("keeps only specified fields", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = budget.filterFields(obj, ["a", "c"]);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("ignores missing fields", () => {
      const obj = { a: 1, b: 2 };
      const result = budget.filterFields(obj, ["a", "z"]);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe("dropFieldsFrom", () => {
    it("removes specified fields", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = budget.dropFieldsFrom(obj, ["b"]);
      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("summarizeArray", () => {
    it("returns all items for small arrays", () => {
      const result = budget.summarizeArray([1, 2, 3], 3);
      expect(result.items).toEqual([1, 2, 3]);
      expect(result.showing).toContain("all");
    });

    it("keeps first/last for large arrays", () => {
      const arr = Array.from({ length: 100 }, (_, i) => i);
      const result = budget.summarizeArray(arr, 2);
      expect(result.items).toEqual([0, 1, 98, 99]);
      expect(result.total).toBe(100);
      expect(result.showing).toContain("first 2");
    });
  });

  describe("estimateTokens", () => {
    it("estimates ~4 chars per token", () => {
      const tokens = budget.estimateTokens("a".repeat(400));
      expect(tokens).toBe(100);
    });
  });

  describe("exceedsBudget", () => {
    it("returns true when over budget", () => {
      expect(budget.exceedsBudget("x".repeat(4000), 500)).toBe(true);
    });

    it("returns false when under budget", () => {
      expect(budget.exceedsBudget("hello", 500)).toBe(false);
    });
  });

  describe("preset", () => {
    it("returns compact preset", () => {
      const p = budget.preset("compact");
      expect(p.maxChars).toBe(1500);
      expect(p.maxArrayItems).toBe(3);
    });

    it("returns normal preset", () => {
      const p = budget.preset("normal");
      expect(p.maxChars).toBe(5000);
    });

    it("returns verbose preset", () => {
      const p = budget.preset("verbose");
      expect(p.maxChars).toBe(20000);
    });
  });
});
