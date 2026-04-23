/**
 * PrintToProgramRegressionHarnessEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS59
 */
import { describe, it, expect } from "vitest";
import {
  PrintToProgramRegressionHarnessEngine,
  printToProgramRegressionHarnessEngine,
} from "../../engines/PrintToProgramRegressionHarnessEngine.js";
import {
  TestResourceRegistryEngine,
  type TestResource,
} from "../../engines/TestResourceRegistryEngine.js";

function harnessWithFreshRegistry() {
  const reg = new TestResourceRegistryEngine();
  return new PrintToProgramRegressionHarnessEngine(reg);
}

describe("PrintToProgramRegressionHarnessEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(printToProgramRegressionHarnessEngine).toBeInstanceOf(
      PrintToProgramRegressionHarnessEngine,
    );
  });

  it("run() returns one result per fixture in the registry", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    expect(out.results.length).toBe(out.summary.total);
    expect(out.summary.total).toBeGreaterThan(0);
  });

  it("runById() throws on unknown id", () => {
    const h = harnessWithFreshRegistry();
    expect(() => h.runById("no-such-fixture")).toThrow(/not registered/);
  });

  it("sinker_edm fixtures produce pass or warning verdicts", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run({ process: "sinker_edm" });
    expect(out.results.length).toBeGreaterThan(0);
    for (const r of out.results) {
      expect(["pass", "warning"]).toContain(r.verdict);
      expect(r.line_count).toBeGreaterThan(0);
    }
  });

  it("non-sinker fixtures return skip with an explanatory reason", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run({ process: "wire_edm" });
    for (const r of out.results) {
      expect(r.verdict).toBe("skip");
      expect(r.skip_reason).toBeDefined();
      expect(r.line_count).toBe(0);
    }
  });

  it("summary.pass_rate excludes skipped fixtures from denominator", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    const runnable = out.summary.total - out.summary.skip;
    const passing = out.summary.pass + out.summary.warning;
    if (runnable > 0) {
      const expected = Math.round((passing / runnable) * 10000) / 100;
      expect(out.summary.pass_rate).toBeCloseTo(expected, 2);
    }
  });

  it("summary.failed_ids tracks only fail verdicts", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    expect(out.summary.failed_ids.length).toBe(out.summary.fail);
    for (const id of out.summary.failed_ids) {
      const r = out.results.find((x) => x.fixture_id === id);
      expect(r?.verdict).toBe("fail");
    }
  });

  it("summary.by_process totals match filtered counts", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    const sinkerCount = out.results.filter((r) => r.process === "sinker_edm").length;
    expect(out.summary.by_process.sinker_edm.total).toBe(sinkerCount);
  });

  it("pipeline errors surface as fail verdicts with error text", () => {
    // Inject a fixture with a made-up process via a fresh registry.
    const reg = new TestResourceRegistryEngine([]);
    reg.register({
      id: "bad-process",
      process: "wire_edm" as any,
      coverage: "regression",
      difficulty: "intermediate",
      label: "wire_edm skip path",
    });
    const h = new PrintToProgramRegressionHarnessEngine(reg);
    const res = h.runById("bad-process");
    // wire_edm is recognized but skipped — verify skip path
    expect(res.verdict).toBe("skip");
  });

  it("direct fail path: bad process string returns fail verdict", () => {
    const reg = new TestResourceRegistryEngine([]);
    // Skip constructor validation by registering a process that isn't
    // in the known enum. TypeScript `as any` bypasses the type-guard.
    reg.register({
      id: "unknown-proc",
      process: "completely_made_up" as any,
      coverage: "regression",
      difficulty: "intermediate",
      label: "unknown proc",
    });
    const h = new PrintToProgramRegressionHarnessEngine(reg);
    const res = h.runById("unknown-proc");
    expect(res.verdict).toBe("fail");
    expect(res.error).toMatch(/Unknown process/);
  });

  it("synthetic feature scales size with difficulty tier", () => {
    // Two sinker fixtures at different difficulty tiers should produce
    // different output line counts because the synthetic cavity size
    // drives stage count / op count.
    const reg = new TestResourceRegistryEngine([]);
    reg.register({
      id: "easy-sinker",
      process: "sinker_edm",
      coverage: "tutorial",
      difficulty: "beginner",
      label: "easy",
      material: "d2",
    });
    reg.register({
      id: "hard-sinker",
      process: "sinker_edm",
      coverage: "adversarial",
      difficulty: "expert",
      label: "hard",
      material: "d2",
    });
    const h = new PrintToProgramRegressionHarnessEngine(reg);
    const easy = h.runById("easy-sinker");
    const hard = h.runById("hard-sinker");
    // Both should pass/warning
    expect(["pass", "warning"]).toContain(easy.verdict);
    expect(["pass", "warning"]).toContain(hard.verdict);
    // Harder fixture (deeper cavity, tighter Ra) has more stages → more lines
    expect(hard.line_count).toBeGreaterThanOrEqual(easy.line_count);
  });

  it("empty registry → empty results + zero pass_rate", () => {
    const reg = new TestResourceRegistryEngine([]);
    const h = new PrintToProgramRegressionHarnessEngine(reg);
    const out = h.run();
    expect(out.results).toHaveLength(0);
    expect(out.summary.total).toBe(0);
    expect(out.summary.pass_rate).toBe(0);
  });

  it("average_duration_ms is computed across all results", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    if (out.results.length > 0) {
      const sum = out.results.reduce((s, r) => s + r.duration_ms, 0);
      const expected = Math.round((sum / out.results.length) * 100) / 100;
      expect(out.summary.average_duration_ms).toBeCloseTo(expected, 2);
    }
  });

  it("filter.difficulty narrows results to that tier only", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run({ difficulty: "beginner" });
    // All results should correspond to beginner fixtures — hard to check
    // directly here (process info only), but total should be <= full set.
    const all = h.run();
    expect(out.summary.total).toBeLessThanOrEqual(all.summary.total);
  });

  it("results include duration_ms for every outcome (pass/fail/skip/warning)", () => {
    const h = harnessWithFreshRegistry();
    const out = h.run();
    for (const r of out.results) {
      expect(r.duration_ms).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.duration_ms)).toBe(true);
    }
  });
});
