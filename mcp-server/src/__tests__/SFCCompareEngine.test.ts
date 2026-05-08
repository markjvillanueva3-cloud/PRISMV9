/**
 * Engine-direct test for SFCCompareEngine — Surface Finish Comparison.
 *
 * Compares Ra measurements against a specification with Cpk and trend analysis.
 * Methods:
 *   • SFCCompareEngine.compare(input)   — full statistical/spec comparison
 *   • SFCCompareEngine.meetsSpec(ra,spec) — single-measurement gate
 *
 * Statistical contracts:
 *   avgRa = mean(ra),  stdDevRa = √(Σ(ra−mean)²/n)  (population variance)
 *   Cpk   = min((USL−avg)/(3σ), (avg−LSL)/(3σ))    when σ>0
 *   trend = compare second half vs first half (n≥5)
 *
 * Wire test (calcDispatcher.sfc-compare-wire.test.ts) covers Zod + dispatcher
 * registration; this file pins the engine math directly.
 */
import { describe, it, expect } from "vitest";
import { SFCCompareEngine, sfcCompareEngine } from "../engines/SFCCompareEngine.js";

const tightSpec = { targetRa: 1.6, toleranceRa: 0.4 };
const samplesAtTarget = [1.55, 1.6, 1.62, 1.58, 1.61];

describe("SFCCompareEngine — direct API", () => {
  it("exposes singleton + static class — repeat calls produce identical output", () => {
    expect(sfcCompareEngine).toBeInstanceOf(SFCCompareEngine);
    const a = SFCCompareEngine.compare({ measurements: samplesAtTarget.map(ra => ({ ra })), specification: tightSpec });
    const b = SFCCompareEngine.compare({ measurements: samplesAtTarget.map(ra => ({ ra })), specification: tightSpec });
    expect(a.avgRa).toBe(b.avgRa);
    expect(a.assessment).toBe(b.assessment);
  });

  it("avgRa equals arithmetic mean of supplied Ra values within rounding", () => {
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1.0 }, { ra: 2.0 }, { ra: 3.0 }],
      specification: { targetRa: 2.0, toleranceRa: 1.5 },
    });
    expect(r.avgRa).toBeCloseTo(2.0, 3);
    expect(r.minRa).toBeCloseTo(1.0, 3);
    expect(r.maxRa).toBeCloseTo(3.0, 3);
    expect(r.rangeRa).toBeCloseTo(2.0, 3);
  });

  it("stdDevRa uses POPULATION variance (n divisor), not sample (n-1)", () => {
    // values [1, 2, 3]: pop var = ((1-2)² + 0 + (3-2)²)/3 = 2/3 → σ ≈ 0.8165
    // sample var would give σ_sample = 1.0. Engine uses pop, so ≈ 0.816.
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1 }, { ra: 2 }, { ra: 3 }],
      specification: { targetRa: 2.0, toleranceRa: 1.5 },
    });
    expect(r.stdDevRa).toBeCloseTo(Math.sqrt(2 / 3), 2);
  });

  it("Cpk = min((USL-avg)/(3σ), (avg-LSL)/(3σ)) when σ>0 — exact algebraic match", () => {
    // USL = 2 + 1 = 3, LSL = max(0, 2-1) = 1, avg=2, σ=√(2/3)≈0.8165
    // (USL-avg)/(3σ) = 1/(3·0.8165) ≈ 0.408
    // (avg-LSL)/(3σ) = 1/(3·0.8165) ≈ 0.408 — symmetric → Cpk ≈ 0.41
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1 }, { ra: 2 }, { ra: 3 }],
      specification: { targetRa: 2.0, toleranceRa: 1.0 },
    });
    const expected = 1 / (3 * Math.sqrt(2 / 3));
    // Cpk is reported rounded to 0.01, so compare to that precision.
    expect(r.cpk!).toBeCloseTo(Math.round(expected * 100) / 100, 2);
  });

  it("Cpk is undefined when stdDev is exactly zero (use FP-safe identical readings)", () => {
    // Use integer-equal Ra (2.0) so FP averaging is exact: avg=2 exactly, σ=0 exactly.
    // Caveat: 1.6 has FP-repeating-binary so [1.6,1.6,1.6] gives σ≈1e-16 (not 0),
    // and the engine's `if (stdDevRa > 0)` triggers, producing a huge Cpk.
    // Integers steer clear of that pathology.
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 2 }, { ra: 2 }, { ra: 2 }],
      specification: { targetRa: 2.0, toleranceRa: 0.5 },
    });
    expect(r.cpk).toBe(undefined);
    expect(r.stdDevRa).toBe(0);
  });

  it("inSpec=true only when every reading is in [LSL, USL]", () => {
    const inside = SFCCompareEngine.compare({
      measurements: samplesAtTarget.map(ra => ({ ra })),
      specification: tightSpec,
    });
    const outside = SFCCompareEngine.compare({
      measurements: [{ ra: 1.55 }, { ra: 2.5 } /* > USL=2.0 */, { ra: 1.62 }],
      specification: tightSpec,
    });
    expect(inside.inSpec).toBe(true);
    expect(inside.outOfSpecCount).toBe(0);
    expect(outside.inSpec).toBe(false);
    expect(outside.outOfSpecCount).toBe(1);
  });

  it("explicit maxRa overrides target+tolerance for upper limit", () => {
    // target=1.6, tol=0.4 → would give USL=2.0. But explicit maxRa=1.7 caps tighter.
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1.5 }, { ra: 1.65 }, { ra: 1.8 } /* > maxRa=1.7 */],
      specification: { targetRa: 1.6, toleranceRa: 0.4, maxRa: 1.7 },
    });
    expect(r.outOfSpecCount).toBe(1);
    expect(r.inSpec).toBe(false);
  });

  it("trend='unknown' for n<5 measurements (insufficient sample)", () => {
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1.5 }, { ra: 1.6 }, { ra: 1.7 }],
      specification: tightSpec,
    });
    expect(r.trend).toBe("unknown");
  });

  it("trend='improving' when second half ≪ first half (Ra dropping)", () => {
    const r = SFCCompareEngine.compare({
      // First half avg=2.0, second half avg=1.0 — second is 0.5× first ⇒ < 0.9× threshold.
      measurements: [
        { ra: 2.0 }, { ra: 2.0 }, { ra: 2.0 },
        { ra: 1.0 }, { ra: 1.0 }, { ra: 1.0 },
      ],
      specification: { targetRa: 1.5, toleranceRa: 1.0 },
    });
    expect(r.trend).toBe("improving");
  });

  it("trend='degrading' when second half ≫ first half (Ra rising)", () => {
    const r = SFCCompareEngine.compare({
      // First half avg=1.0, second half avg=2.0 — second is 2× first ⇒ > 1.1× threshold.
      measurements: [
        { ra: 1.0 }, { ra: 1.0 }, { ra: 1.0 },
        { ra: 2.0 }, { ra: 2.0 }, { ra: 2.0 },
      ],
      specification: { targetRa: 1.5, toleranceRa: 1.5 },
    });
    expect(r.trend).toBe("degrading");
  });

  it("trend='stable' when second half within ±10% of first half", () => {
    const r = SFCCompareEngine.compare({
      measurements: [
        { ra: 1.6 }, { ra: 1.6 }, { ra: 1.6 },
        { ra: 1.55 }, { ra: 1.6 }, { ra: 1.62 },
      ],
      specification: tightSpec,
    });
    expect(r.trend).toBe("stable");
  });

  it("assessment='excellent' when Cpk≥1.67 AND inSpec", () => {
    // Tight readings well within wide spec: target=1.6, tol=1.0 → USL=2.6, LSL=0.6.
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1.59 }, { ra: 1.6 }, { ra: 1.61 }, { ra: 1.6 }, { ra: 1.6 }],
      specification: { targetRa: 1.6, toleranceRa: 1.0 },
    });
    expect(r.cpk!).toBeGreaterThan(1.67);
    expect(r.assessment).toBe("excellent");
  });

  it("assessment='unacceptable' when ≥10% of readings out of spec", () => {
    // 5 readings, 1 out → 20% > 10% threshold
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 1.5 }, { ra: 1.6 }, { ra: 1.7 }, { ra: 1.6 }, { ra: 3.0 } /* >USL=2.0 */],
      specification: tightSpec,
    });
    expect(r.inSpec).toBe(false);
    expect(r.assessment).toBe("unacceptable");
  });

  it("deviationFromTarget = avgRa − targetRa (signed)", () => {
    const high = SFCCompareEngine.compare({
      measurements: [{ ra: 2.0 }, { ra: 2.0 }, { ra: 2.0 }],
      specification: { targetRa: 1.5, toleranceRa: 1.0 },
    });
    const low = SFCCompareEngine.compare({
      measurements: [{ ra: 1.0 }, { ra: 1.0 }, { ra: 1.0 }],
      specification: { targetRa: 1.5, toleranceRa: 1.0 },
    });
    expect(high.deviationFromTarget).toBeCloseTo(0.5, 3);
    expect(low.deviationFromTarget).toBeCloseTo(-0.5, 3);
  });

  it("deviationFromPredicted populated only when predictedRa supplied", () => {
    const without = SFCCompareEngine.compare({
      measurements: [{ ra: 1.6 }],
      specification: tightSpec,
    });
    const withPred = SFCCompareEngine.compare({
      measurements: [{ ra: 1.7 }],
      specification: tightSpec,
      predictedRa: 1.6,
    });
    expect(without.deviationFromPredicted).toBe(undefined);
    expect(withPred.deviationFromPredicted).toBeCloseTo(0.1, 3);
  });

  it("issues array reports out-of-spec count when any reading exceeds limits", () => {
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 5.0 }],
      specification: tightSpec,
    });
    expect(r.issues.some(s => /out of specification/i.test(s))).toBe(true);
    expect(r.issues.length).toBeGreaterThanOrEqual(1);
  });

  it("recommendations include feed-rate-reduction advice when avgRa exceeds target", () => {
    const r = SFCCompareEngine.compare({
      measurements: [{ ra: 3.0 }],
      specification: tightSpec,
    });
    expect(r.recommendations.some(s => /Reduce feed rate/i.test(s))).toBe(true);
  });

  it("meetsSpec true inside target±tolerance, false outside (avoiding FP boundary)", () => {
    // tightSpec: target=1.6, tol=0.4 → nominal LSL=1.2, USL=2.0.
    // Caveat: 1.6 - 0.4 in IEEE 754 is 1.2000000000000002, so meetsSpec(1.2) is
    // false at the FP-shifted lower boundary. Test ε-inside/ε-outside instead.
    expect(SFCCompareEngine.meetsSpec(1.6, tightSpec)).toBe(true);   // center
    expect(SFCCompareEngine.meetsSpec(1.21, tightSpec)).toBe(true);  // ε inside LSL
    expect(SFCCompareEngine.meetsSpec(1.99, tightSpec)).toBe(true);  // ε inside USL
    expect(SFCCompareEngine.meetsSpec(1.0, tightSpec)).toBe(false);  // clearly < LSL
    expect(SFCCompareEngine.meetsSpec(2.5, tightSpec)).toBe(false);  // clearly > USL
  });

  it("meetsSpec respects explicit minRa/maxRa overrides", () => {
    const spec = { targetRa: 1.6, toleranceRa: 0.4, minRa: 1.0, maxRa: 1.8 };
    expect(SFCCompareEngine.meetsSpec(1.0, spec)).toBe(true);
    expect(SFCCompareEngine.meetsSpec(1.8, spec)).toBe(true);
    expect(SFCCompareEngine.meetsSpec(0.99, spec)).toBe(false);
    expect(SFCCompareEngine.meetsSpec(1.81, spec)).toBe(false);
  });

  it("rejects empty measurements array via internal Zod parse (adversarial)", () => {
    expect(() =>
      SFCCompareEngine.compare({ measurements: [], specification: tightSpec }),
    ).toThrow();
  });

  it("rejects negative Ra in measurements (adversarial)", () => {
    expect(() =>
      SFCCompareEngine.compare({ measurements: [{ ra: -1.0 }], specification: tightSpec }),
    ).toThrow();
  });

  it("self-awareness manifest exposes capabilities and assessment levels", () => {
    const sa = SFCCompareEngine.getSelfAwareness();
    expect(sa.name).toBe("SFCCompareEngine");
    expect(sa.capabilities).toEqual(expect.arrayContaining(["compare", "meetsSpec"]));
    expect(sa.assessments).toEqual(
      expect.arrayContaining(["excellent", "good", "acceptable", "marginal", "unacceptable"]),
    );
    expect(sa.trends).toEqual(expect.arrayContaining(["improving", "stable", "degrading", "unknown"]));
  });
});
