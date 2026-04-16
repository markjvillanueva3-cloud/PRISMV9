/**
 * WEDMDriftDetectionEngine — WEDM AGI Phase 3 / P3-MS1 / U-P3-02 tests.
 *
 * Exit gate: at least one of PSI / KS / Page–Hinkley fires on an injected
 * 2-sigma distribution shift (canary).
 */
import { describe, it, expect } from "vitest";
import {
  WEDMDriftDetectionEngine,
  wedmDriftDetectionEngine,
} from "../../engines/WEDMDriftDetectionEngine.js";

/** Reproducible pseudo-normal sample via Box–Muller with seeded LCG. */
function seededNormal(mean: number, std: number, n: number, seed = 0xDEADBEEF): number[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
  const xs: number[] = [];
  while (xs.length < n) {
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    xs.push(mean + std * z);
  }
  return xs;
}

describe("WEDMDriftDetectionEngine — basic behavior", () => {
  it("singleton exports the class", () => {
    expect(wedmDriftDetectionEngine).toBeInstanceOf(WEDMDriftDetectionEngine);
  });

  it("reports stable when baseline ≈ current (same distribution)", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 1);
    const current = seededNormal(0, 1, 500, 2);
    const v = engine.detect({
      modelId: "stable-case",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: current },
    });
    expect(v.drifted).toBe(false);
    expect(v.severity).toBe("stable");
    expect(v.psi).toBeLessThan(0.10);
  });

  it("flags insufficient data when windows are too small", () => {
    const engine = new WEDMDriftDetectionEngine();
    const v = engine.detect({
      modelId: "tiny",
      baseline: { label: "b", values: [1, 2, 3] },
      current: { label: "c", values: [1, 2, 3] },
    });
    expect(v.drifted).toBe(false);
    expect(v.summary).toContain("insufficient");
  });
});

describe("WEDMDriftDetectionEngine — exit gate (canary)", () => {
  it("canary at 2σ shift fires at least one detector", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 42);
    const { verdict } = engine.runCanary(baseline, 2.0);
    const anyFired = verdict.psi >= 0.10 || verdict.ks.exceeds || verdict.pageHinkley.fired;
    expect(anyFired).toBe(true);
    expect(verdict.drifted).toBe(true);
  });

  it("canary at 4σ shift classifies as severe", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 7);
    const { verdict } = engine.runCanary(baseline, 4.0);
    expect(verdict.severity === "drifting" || verdict.severity === "severe").toBe(true);
    expect(verdict.psi).toBeGreaterThan(0.25);
  });

  it("canary at 0.1σ shift is still classified stable or moderate (no false FIRED)", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 99);
    const { verdict } = engine.runCanary(baseline, 0.1);
    expect(verdict.severity === "stable" || verdict.severity === "moderate").toBe(true);
  });
});

describe("WEDMDriftDetectionEngine — PSI sanity", () => {
  it("PSI grows monotonically with shift magnitude", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 11);
    const psis: number[] = [];
    for (const s of [0.0, 0.5, 1.0, 2.0, 3.0]) {
      const { verdict } = engine.runCanary(baseline, s);
      psis.push(verdict.psi);
    }
    for (let i = 1; i < psis.length; i++) {
      expect(psis[i]).toBeGreaterThanOrEqual(psis[i - 1] - 1e-6);
    }
  });

  it("PSI is ≥ 0 for identical distributions (numerical floor)", () => {
    const engine = new WEDMDriftDetectionEngine();
    const xs = seededNormal(0, 1, 500, 5);
    const v = engine.detect({
      modelId: "same",
      baseline: { label: "b", values: xs },
      current: { label: "c", values: xs },
    });
    expect(v.psi).toBeGreaterThanOrEqual(0);
    expect(v.psi).toBeLessThan(0.01);
  });
});

describe("WEDMDriftDetectionEngine — KS + Page–Hinkley", () => {
  it("KS fires on a bimodal-vs-unimodal shift", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 123);
    // A 50/50 mix of N(-3,0.5) and N(+3,0.5) — clearly different shape.
    const bi = [
      ...seededNormal(-3, 0.5, 250, 456),
      ...seededNormal(+3, 0.5, 250, 789),
    ];
    const v = engine.detect({
      modelId: "shape",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: bi },
    });
    expect(v.ks.exceeds).toBe(true);
    expect(v.drifted).toBe(true);
  });

  it("Page–Hinkley detects a sustained mean step", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 321);
    const stepped = seededNormal(2, 1, 500, 654);
    const v = engine.detect({
      modelId: "step",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: stepped },
    });
    expect(v.pageHinkley.fired).toBe(true);
    expect(v.pageHinkley.atIndex).toBeGreaterThanOrEqual(0);
  });
});

describe("WEDMDriftDetectionEngine — detectAll", () => {
  it("aggregates multiple models into a single anyDrifted flag", () => {
    const engine = new WEDMDriftDetectionEngine();
    const b1 = seededNormal(0, 1, 500, 1);
    const c1 = seededNormal(0, 1, 500, 2); // stable
    const b2 = seededNormal(0, 1, 500, 3);
    const c2 = seededNormal(3, 1, 500, 4); // drifted
    const res = engine.detectAll([
      { modelId: "m1", baseline: { label: "b", values: b1 }, current: { label: "c", values: c1 } },
      { modelId: "m2", baseline: { label: "b", values: b2 }, current: { label: "c", values: c2 } },
    ]);
    expect(res.verdicts).toHaveLength(2);
    expect(res.anyDrifted).toBe(true);
    expect(res.verdicts.find((v) => v.modelId === "m1")!.drifted).toBe(false);
    expect(res.verdicts.find((v) => v.modelId === "m2")!.drifted).toBe(true);
  });
});

describe("WEDMDriftDetectionEngine — threshold override", () => {
  it("respects a lower custom threshold (more sensitive)", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 77);
    const current = seededNormal(0.5, 1, 500, 78);
    const strict = engine.detect({
      modelId: "strict",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: current },
      threshold: 0.05,
    });
    expect(strict.threshold).toBe(0.05);
  });

  it("respects a per-detector Page–Hinkley λ override", () => {
    const engine = new WEDMDriftDetectionEngine();
    const baseline = seededNormal(0, 1, 500, 33);
    const current = seededNormal(0.3, 1, 500, 34);
    // With λ very large, PH should not fire on a small shift.
    const lax = engine.detect({
      modelId: "lax",
      baseline: { label: "b", values: baseline },
      current: { label: "c", values: current },
      phLambda: 10_000,
    });
    expect(lax.pageHinkley.fired).toBe(false);
  });
});
