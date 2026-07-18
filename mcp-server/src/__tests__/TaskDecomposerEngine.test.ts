/**
 * TaskDecomposerEngine tests — U-HAGI04.
 */
import { describe, it, expect } from "vitest";
import { TaskDecomposerEngine } from "../engines/TaskDecomposerEngine.js";

describe("TaskDecomposerEngine.decompose", () => {
  it("numeric pattern '100 CVs' produces 100 sub-tasks (capped at max)", () => {
    const r = TaskDecomposerEngine.decompose("Write 100 CVs for these jobs");
    expect(r.pattern).toBe("enumerate-each-of-N");
    expect(r.subtasks).toHaveLength(100);
    expect(r.subtasks[0].index).toBe(0);
    expect(r.subtasks[99].index).toBe(99);
  });

  it("numeric pattern respects user-supplied maxSubtasks cap (boundary)", () => {
    const r = TaskDecomposerEngine.decompose("Generate 500 quotes for customers", { maxSubtasks: 10 });
    expect(r.subtasks.length).toBeLessThanOrEqual(10);
  });

  it("literal-list pattern 'covering A, B, C, D' decomposes into 4", () => {
    const r = TaskDecomposerEngine.decompose("Build modules covering: alpha, beta, gamma, delta");
    expect(r.pattern).toBe("literal-list");
    expect(r.subtasks).toHaveLength(4);
    expect(r.subtasks.map((s) => s.description)).toEqual(["alpha", "beta", "gamma", "delta"]);
  });

  it("'for each' without enumerable count returns clarification verdict", () => {
    const r = TaskDecomposerEngine.decompose("For each customer write a tailored quote");
    expect(r.pattern).toBe("clarification-needed");
    expect(r.clarification).toContain("enumerable");
    expect(r.subtasks).toHaveLength(0);
  });

  it("'batch transform' is a single-subtask batch operation", () => {
    const r = TaskDecomposerEngine.decompose("Batch transform all quote sheets into the new schema");
    expect(r.pattern).toBe("batch-transform");
    expect(r.subtasks).toHaveLength(1);
  });

  it("fan-out without enumerable target returns clarification", () => {
    const r = TaskDecomposerEngine.decompose("Run in parallel across our database queries");
    expect(r.pattern).toBe("clarification-needed");
    expect(r.clarification).toContain("enumerable");
  });

  it("unrecognized pattern → atomic single-task fallback", () => {
    const r = TaskDecomposerEngine.decompose("Calculate the Kienzle force for the spindle setup");
    expect(r.pattern).toBe("atomic");
    expect(r.subtasks).toHaveLength(1);
  });

  it("rejects empty prompt (failure mode)", () => {
    expect(() => TaskDecomposerEngine.decompose("")).toThrow();
    expect(() => TaskDecomposerEngine.decompose("   ")).toThrow();
  });

  it("rejects non-string prompt (adversarial)", () => {
    expect(() => TaskDecomposerEngine.decompose(null as never)).toThrow();
    expect(() => TaskDecomposerEngine.decompose(42 as never)).toThrow();
  });

  it("rejects maxSubtasks=0 or negative or NaN (adversarial)", () => {
    expect(() => TaskDecomposerEngine.decompose("100 CVs", { maxSubtasks: 0 })).toThrow();
    expect(() => TaskDecomposerEngine.decompose("100 CVs", { maxSubtasks: -1 })).toThrow();
    expect(() => TaskDecomposerEngine.decompose("100 CVs", { maxSubtasks: NaN })).toThrow();
  });
});

describe("TaskDecomposerEngine.cap", () => {
  it("caps a result's subtask list at maxN", () => {
    const r = TaskDecomposerEngine.decompose("100 CVs needed");
    const capped = TaskDecomposerEngine.cap(r, 5);
    expect(capped.subtasks).toHaveLength(5);
    expect(capped.pattern).toBe("enumerate-each-of-N");
  });

  it("returns the same result if subtask count is already below cap", () => {
    const r = TaskDecomposerEngine.decompose("Kienzle force calc");
    const capped = TaskDecomposerEngine.cap(r, 100);
    expect(capped.subtasks).toHaveLength(1);
  });

  it("throws on negative cap (boundary)", () => {
    const r = TaskDecomposerEngine.decompose("atomic task");
    expect(() => TaskDecomposerEngine.cap(r, -1)).toThrow();
  });
});

describe("TaskDecomposerEngine.validate", () => {
  it("round-trips a valid sub-task", () => {
    const t = TaskDecomposerEngine.validate({ index: 0, description: "x", origin_pattern: "atomic" });
    expect(t.index).toBe(0);
  });

  it("rejects unknown origin_pattern", () => {
    expect(() => TaskDecomposerEngine.validate({ index: 0, description: "x", origin_pattern: "bogus" })).toThrow();
  });
});
