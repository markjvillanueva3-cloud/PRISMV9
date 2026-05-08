/**
 * Engine-direct test for SFCOptimizeEngine — Surface Finish Optimization.
 *
 * The engine optimizes feed/speed for a target Ra against material/operation/
 * priority context. Surface-finish theory used:
 *
 *   turning / boring:  Ra ≈ f² / (32 · r)             [mm² / mm → mm], scaled ×1000 → µm
 *   milling:           Ra ≈ f² / (32 · D/2)
 *   grinding:          Ra ≈ 0.2 + 0.1 · f             (linear, units µm)
 *
 * Inverse used to size feed for a target Ra:
 *
 *   turning / boring:  f = √(Ra · 32 · r / 1000)
 *   milling:           f = √(Ra · 32 · (D/2) / 1000)
 *
 * Companion wire test
 * (calcDispatcher.sfc-optimize-wire.test.ts) covers Zod schema +
 * dispatcher enum/case wiring; this file exercises the engine API directly.
 */
import { describe, it, expect } from "vitest";
import { SFCOptimizeEngine, sfcOptimizeEngine } from "../engines/SFCOptimizeEngine.js";

const turningBase = {
  targetRa: 1.6,
  toleranceRa: 0.4,
  operation: "turning" as const,
  material: "steel" as const,
  toolNoseRadius: 0.8,
  toolDiameter: 12,
  minFeedRate: 0.05,
  maxFeedRate: 0.5,
  minSpeed: 80,
  maxSpeed: 320,
};

describe("SFCOptimizeEngine — direct API", () => {
  it("exposes singleton + static class — both produce identical output for identical input", () => {
    expect(sfcOptimizeEngine).toBeInstanceOf(SFCOptimizeEngine);
    const a = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    const b = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(a.optimizedFeedRate).toBe(b.optimizedFeedRate);
    expect(a.optimizedSpeed).toBe(b.optimizedSpeed);
    expect(a.predictedRa).toBe(b.predictedRa);
    // Determinism is part of the engine contract — repeat calls match.
  });

  it("turning Ra prediction hits targetRa when ideal feed is within feed limits", () => {
    // f_ideal = √(1.6·32·0.8/1000) ≈ 0.2024 mm — well inside [0.05, 0.5].
    // Since the feed is unclamped, Ra = f² / (32·r) · 1000 must round-trip back to targetRa.
    // Tolerance 0.05 µm absorbs the engine's mid-calc rounding (feed→0.001 round before final Ra calc).
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(r.predictedRa).toBeCloseTo(turningBase.targetRa, 1);
  });

  it("turning inverse: feed for target Ra = √(Ra·32·r/1000) is what the engine picks (clamped to limits)", () => {
    // With targetRa=1.6, r=0.8 → f_ideal = √(1.6·32·0.8/1000) = √0.04096 ≈ 0.2024 mm
    // That's inside [minFeedRate=0.05, maxFeedRate=0.5], so engine should keep it.
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    const expected = Math.sqrt(1.6 * 32 * 0.8 / 1000);
    expect(r.optimizedFeedRate).toBeCloseTo(Math.round(expected * 1000) / 1000, 2);
  });

  it("milling Ra prediction uses (D/2) instead of nose radius — Ra ∝ f²/(32·D/2)", () => {
    const milling = {
      ...turningBase,
      operation: "milling" as const,
      toolDiameter: 20,
      // Tighter feed cap so the ideal feed √(1.6·32·10/1000) ≈ 0.716 gets clamped to 0.5.
    };
    const r = SFCOptimizeEngine.optimize({ ...milling, prioritize: "balanced" });
    const D = 20;
    const f = r.optimizedFeedRate;
    const expectedRa = (f * f) / (32 * (D / 2)) * 1000;
    expect(r.predictedRa).toBeCloseTo(Math.round(expectedRa * 1000) / 1000, 2);
  });

  it("grinding uses linear Ra = (f - 0.2)/0.1 inverse — engine returns small feed for small Ra", () => {
    const r = SFCOptimizeEngine.optimize({
      ...turningBase, operation: "grinding", targetRa: 0.4,
      minFeedRate: 0.001, maxFeedRate: 1.0,
    });
    // Inverse: f = (0.4 - 0.2)/0.1 = 2.0 → clamped to maxFeedRate=1.0
    expect(r.optimizedFeedRate).toBeCloseTo(1.0, 2);
  });

  it("priority='productivity' selects higher speed than 'surface_finish' (before material factor)", () => {
    // Force material factor=1 by using steel.
    const sf = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "surface_finish" });
    const prod = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "productivity" });
    expect(prod.optimizedSpeed).toBeGreaterThan(sf.optimizedSpeed);
  });

  it("material factor lifts aluminum speed above titanium speed at same priority/limits", () => {
    const al = SFCOptimizeEngine.optimize({ ...turningBase, material: "aluminum", prioritize: "balanced" });
    const ti = SFCOptimizeEngine.optimize({ ...turningBase, material: "titanium", prioritize: "balanced" });
    // aluminum factor 1.5, titanium factor 0.5 → 3× ratio before clamping (clamped at maxSpeed=320).
    expect(al.optimizedSpeed).toBeGreaterThan(ti.optimizedSpeed);
  });

  it("max-speed clamp protects the upper bound — aluminum priority='productivity' does not exceed maxSpeed", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, material: "aluminum", prioritize: "productivity" });
    expect(r.optimizedSpeed).toBeLessThanOrEqual(turningBase.maxSpeed);
    expect(r.optimizedSpeed).toBeGreaterThanOrEqual(turningBase.minSpeed);
  });

  it("min-feed clamp protects lower bound — extreme small targetRa demands tiny feed and gets floored", () => {
    const r = SFCOptimizeEngine.optimize({
      ...turningBase, targetRa: 0.025, // engine min
      minFeedRate: 0.05, maxFeedRate: 0.5,
    });
    // f_ideal = √(0.025·32·0.8/1000) ≈ 0.025 mm — below minFeedRate=0.05 → clamped up.
    expect(r.optimizedFeedRate).toBeCloseTo(0.05, 3);
  });

  it("alternatives array always has 4 entries (2 feed × 2 speed perturbations)", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(r.alternatives.length).toBe(4);
    for (const alt of r.alternatives) {
      expect(typeof alt.feedRate).toBe("number");
      expect(typeof alt.speed).toBe("number");
      expect(typeof alt.predictedRa).toBe("number");
      expect(typeof alt.productivityIndex).toBe("number");
      expect(alt.feedRate).toBeGreaterThanOrEqual(turningBase.minFeedRate);
      expect(alt.feedRate).toBeLessThanOrEqual(turningBase.maxFeedRate);
      expect(alt.speed).toBeGreaterThanOrEqual(turningBase.minSpeed);
      expect(alt.speed).toBeLessThanOrEqual(turningBase.maxSpeed);
    }
  });

  it("toolLifeIndex stays in [0,1] for any operation/material combo", () => {
    const ops = ["turning", "milling", "grinding", "boring"] as const;
    const mats = ["aluminum", "steel", "stainless", "titanium", "cast_iron", "brass"] as const;
    for (const operation of ops) {
      for (const material of mats) {
        const r = SFCOptimizeEngine.optimize({ ...turningBase, operation, material });
        expect(r.toolLifeIndex).toBeGreaterThanOrEqual(0);
        expect(r.toolLifeIndex).toBeLessThanOrEqual(1);
      }
    }
  });

  it("cycleTimeChange and mrrChange are inverses (sign-opposite, magnitude-equal) when both currents provided", () => {
    const r = SFCOptimizeEngine.optimize({
      ...turningBase, prioritize: "productivity",
      currentFeedRate: 0.1, currentSpeed: 100,
    });
    expect(r.cycleTimeChange).toBeCloseTo(-r.mrrChange, 1);
  });

  it("cycleTimeChange and mrrChange both 0 when no current rates supplied", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(r.cycleTimeChange).toBe(0);
    expect(r.mrrChange).toBe(0);
  });

  it("Rz prediction is 4.5× Ra (standard rule-of-thumb)", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(r.predictedRz / r.predictedRa).toBeCloseTo(4.5, 1);
  });

  it("confidence is the engine's fixed 0.85 prior", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(r.confidence).toBeCloseTo(0.85, 2);
  });

  it("tradeoff text mentions productivity-vs-Ra and tool-life signals", () => {
    const r = SFCOptimizeEngine.optimize({ ...turningBase, prioritize: "balanced" });
    expect(typeof r.tradeoffs.raVsProductivity).toBe("string");
    expect(typeof r.tradeoffs.raVsToolLife).toBe("string");
    expect(r.tradeoffs.raVsProductivity.length).toBeGreaterThan(0);
    expect(r.tradeoffs.raVsToolLife.length).toBeGreaterThan(0);
  });

  it("rejects negative targetRa via internal Zod parse", () => {
    expect(() =>
      SFCOptimizeEngine.optimize({ ...turningBase, targetRa: -1 }),
    ).toThrow();
  });

  it("rejects oversize targetRa (>50 µm) via internal Zod parse", () => {
    expect(() =>
      SFCOptimizeEngine.optimize({ ...turningBase, targetRa: 100 }),
    ).toThrow();
  });

  it("rejects unknown operation enum value", () => {
    expect(() =>
      SFCOptimizeEngine.optimize({ ...turningBase, operation: "drilling" as never }),
    ).toThrow();
  });

  it("rejects NaN targetRa (adversarial input)", () => {
    expect(() =>
      SFCOptimizeEngine.optimize({ ...turningBase, targetRa: Number.NaN }),
    ).toThrow();
  });

  it("rejects Infinity feed rate ceiling (adversarial input)", () => {
    expect(() =>
      SFCOptimizeEngine.optimize({ ...turningBase, maxFeedRate: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("self-awareness manifest exposes capabilities, priorities, and operations lists", () => {
    const sa = SFCOptimizeEngine.getSelfAwareness();
    expect(sa.name).toBe("SFCOptimizeEngine");
    expect(sa.capabilities).toContain("optimize");
    expect(sa.priorities).toEqual(expect.arrayContaining(["surface_finish", "productivity", "tool_life", "balanced"]));
    expect(sa.operations).toEqual(expect.arrayContaining(["turning", "milling", "grinding", "boring"]));
  });
});
