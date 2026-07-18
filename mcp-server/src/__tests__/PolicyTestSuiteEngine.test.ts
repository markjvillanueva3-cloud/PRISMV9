/**
 * PolicyTestSuiteEngine tests — U-HAGI09.
 */
import { describe, it, expect } from "vitest";
import { PolicyTestSuiteEngine, type PolicyCase } from "../engines/PolicyTestSuiteEngine.js";

const C = (over: Partial<PolicyCase>): PolicyCase => ({
  id: "c1", category: "edge-case", description: "x", input: null, expectedVerdict: "block",
  ...over,
});

describe("PolicyTestSuiteEngine.run — happy paths", () => {
  it("passes when runner returns expected verdict", async () => {
    const cases = [C({ id: "p1", expectedVerdict: "block" })];
    const { results, summary } = await PolicyTestSuiteEngine.run(cases, () => "block");
    expect(results[0].passed).toBe(true);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.passRate).toBe(1);
  });

  it("fails when runner returns wrong verdict", async () => {
    const cases = [C({ id: "p2", expectedVerdict: "block" })];
    const { results, summary } = await PolicyTestSuiteEngine.run(cases, () => "allow");
    expect(results[0].passed).toBe(false);
    expect(summary.failed).toBe(1);
  });

  it("handles async runner correctly", async () => {
    const cases = [C({ id: "async", expectedVerdict: "warn" })];
    const { summary } = await PolicyTestSuiteEngine.run(cases, async () => "warn");
    expect(summary.passed).toBe(1);
  });

  it("catches errors from runner without aborting the run", async () => {
    const cases = [C({ id: "e1" }), C({ id: "e2", expectedVerdict: "allow" })];
    let count = 0;
    const { results, summary } = await PolicyTestSuiteEngine.run(cases, () => {
      count++;
      if (count === 1) throw new Error("boom");
      return "allow";
    });
    expect(results[0].actual).toBe("error");
    expect(results[0].errorMsg).toContain("boom");
    expect(results[1].passed).toBe(true);
    expect(summary.errors).toBe(1);
    expect(summary.passed).toBe(1);
  });
});

describe("PolicyTestSuiteEngine.run — failure modes", () => {
  it("rejects non-array cases", async () => {
    await expect(PolicyTestSuiteEngine.run("not array" as never, () => "block")).rejects.toThrow();
  });

  it("rejects non-function runner", async () => {
    await expect(PolicyTestSuiteEngine.run([], null as never)).rejects.toThrow();
  });

  it("rejects an invalid case (missing required field)", async () => {
    const bad = { id: "x", category: "edge-case" } as never;
    await expect(PolicyTestSuiteEngine.run([bad], () => "block")).rejects.toThrow();
  });

  it("rejects unknown category in case (adversarial)", async () => {
    const bad = { ...C({}), category: "bogus" } as never;
    await expect(PolicyTestSuiteEngine.run([bad], () => "block")).rejects.toThrow();
  });

  it("rejects unknown expectedVerdict in case (adversarial)", async () => {
    const bad = { ...C({}), expectedVerdict: "explode" } as never;
    await expect(PolicyTestSuiteEngine.run([bad], () => "block")).rejects.toThrow();
  });
});

describe("PolicyTestSuiteEngine.summarize", () => {
  it("rolls up by category correctly across 4 categories", () => {
    const results = [
      { id: "1", category: "forbidden-action" as const, expected: "block" as const, actual: "block" as const, passed: true },
      { id: "2", category: "forbidden-action" as const, expected: "block" as const, actual: "allow" as const, passed: false },
      { id: "3", category: "edge-case" as const,        expected: "block" as const, actual: "block" as const, passed: true },
      { id: "4", category: "jailbreak" as const,        expected: "block" as const, actual: "error" as const, passed: false, errorMsg: "x" },
      { id: "5", category: "robustness" as const,       expected: "warn"  as const, actual: "warn"  as const, passed: true },
    ];
    const s = PolicyTestSuiteEngine.summarize(results);
    expect(s.totalCases).toBe(5);
    expect(s.passed).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.errors).toBe(1);
    expect(s.passRate).toBeCloseTo(0.6, 3);
    expect(s.byCategory["forbidden-action"].total).toBe(2);
    expect(s.byCategory["forbidden-action"].failed).toBe(1);
    expect(s.byCategory["jailbreak"].errors).toBe(1);
  });

  it("returns 0 passRate on empty results", () => {
    const s = PolicyTestSuiteEngine.summarize([]);
    expect(s.totalCases).toBe(0);
    expect(s.passRate).toBe(0);
  });
});

describe("PolicyTestSuiteEngine.renderMarkdown", () => {
  it("renders summary + failure list", () => {
    const results = [
      { id: "f1", category: "forbidden-action" as const, expected: "block" as const, actual: "allow" as const, passed: false },
    ];
    const summary = PolicyTestSuiteEngine.summarize(results);
    const md = PolicyTestSuiteEngine.renderMarkdown(summary, results);
    expect(md).toContain("# Policy Test Suite Summary");
    expect(md).toContain("## Failures");
    expect(md).toContain("f1");
    expect(md).toContain("expected=block actual=allow");
  });

  it("handles empty results gracefully", () => {
    const md = PolicyTestSuiteEngine.renderMarkdown(PolicyTestSuiteEngine.summarize([]));
    expect(md).toContain("Total: 0");
  });
});

describe("PolicyTestSuiteEngine.validateCase", () => {
  it("rejects oversize description (boundary)", () => {
    expect(() => PolicyTestSuiteEngine.validateCase({ ...C({}), description: "x".repeat(501) })).toThrow();
  });

  it("rejects empty id (failure)", () => {
    expect(() => PolicyTestSuiteEngine.validateCase({ ...C({}), id: "" })).toThrow();
  });
});
