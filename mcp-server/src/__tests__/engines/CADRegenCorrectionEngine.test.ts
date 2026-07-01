/**
 * Tests for CADRegenCorrectionEngine -- the Stage-6 CORRECT + CONVERGE
 * controller of the closed-loop CAD replication methodology.
 *
 * Real reference-value / algebraic-invariant assertions (R9): every test
 * encodes WHY the control behavior matters. Covers happy convergence, the
 * three correction methods (proportional / inverse-monotonic / secant), the
 * trust-region + hard-bound clamps, plateau + max-iteration + uncorrectable
 * verdicts, adversarial degenerate inputs (div-by-zero, NaN), the
 * applyToTemplate round-trip back to GENERATE, and a full runClosedLoop E2E
 * with an injected deterministic evaluator that actually converges.
 */

import { describe, it, expect } from "vitest";
import {
  CADRegenCorrectionEngine,
  cadRegenCorrectionEngine,
  DEFAULT_CORRECTION_CONFIG,
  type CorrectionParam,
} from "../../engines/CADRegenCorrectionEngine.js";
import type {
  ComparisonResult,
  MetricComparison,
} from "../../engines/CADGeometryComparisonEngine.js";

// --- test helpers ----------------------------------------------------------

function metric(
  name: string,
  original: number,
  generated: number,
  threshold = 5,
): MetricComparison {
  const delta = generated - original;
  const deltaPercent =
    original !== 0 ? (delta / Math.abs(original)) * 100 : generated === 0 ? 0 : 100;
  return {
    metric: name,
    original,
    generated,
    delta,
    deltaPercent,
    threshold,
    passed: Number.isFinite(deltaPercent) && Math.abs(deltaPercent) <= threshold,
    details: "",
  };
}

function compare(metrics: MetricComparison[], overallPassed?: boolean): ComparisonResult {
  const passed = metrics.filter((m) => m.passed).length;
  const passRate = metrics.length ? passed / metrics.length : 1;
  return {
    originalFile: "ref.step",
    generatedFile: "gen.step",
    timestamp: "2026-06-10T00:00:00Z",
    overallPassed: overallPassed ?? metrics.every((m) => m.passed),
    passRate,
    metrics,
    originalMetrics: {},
    generatedMetrics: {},
    topologySimilarity: 1,
    recommendations: [],
    comparisonTimeMs: 0,
  } as unknown as ComparisonResult;
}

const param = (over: Partial<CorrectionParam> & { name: string; value: number }): CorrectionParam => ({
  influences: [],
  ...over,
});

// ---------------------------------------------------------------------------

describe("CADRegenCorrectionEngine", () => {
  describe("DEFAULT_CORRECTION_CONFIG", () => {
    it("ships sane defaults", () => {
      expect(DEFAULT_CORRECTION_CONFIG.maxIterations).toBe(12);
      expect(DEFAULT_CORRECTION_CONFIG.method).toBe("auto");
      expect(DEFAULT_CORRECTION_CONFIG.passRateTarget).toBe(1.0);
      expect(DEFAULT_CORRECTION_CONFIG.maxStepFraction).toBeCloseTo(0.5, 5);
    });
  });

  describe("correct() -- convergence detection", () => {
    it("returns converged with zero corrections when overallPassed is true", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 1000)], true),
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
      });
      expect(res.status).toBe("converged");
      expect(res.corrections).toHaveLength(0);
      expect(res.maxDeltaPercent).toBeCloseTo(0, 5);
    });

    it("returns converged when all metrics pass and passRate meets target", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 1010), metric("vol", 500, 505)]),
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
      });
      // both within 5% threshold -> passRate 1.0 -> converged
      expect(res.passRate).toBeCloseTo(1.0, 5);
      expect(res.status).toBe("converged");
    });
  });

  describe("correct() -- proportional correction", () => {
    it("scales the param by original/generated for a monotone-positive metric", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 800)]), // -20%, fails
        params: [param({ name: "r", value: 10, influences: ["bbox"], monotonicity: 1 })],
        config: { maxStepFraction: 10, method: "proportional" }, // disable trust-region clamp
      });
      expect(res.status).toBe("iterate");
      expect(res.corrections).toHaveLength(1);
      // ratio = 1000/800 = 1.25 -> 10 * 1.25 = 12.5
      expect(res.corrections[0].newValue).toBeCloseTo(12.5, 5);
      expect(res.corrections[0].drivenByMetric).toBe("bbox");
      expect(res.corrections[0].method).toBe("proportional");
      expect(res.correctedParams[0].value).toBeCloseTo(12.5, 5);
    });

    it("moves the param the OTHER way for an inverse (monotonicity -1) metric", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("gap", 1000, 800)]),
        params: [param({ name: "feed", value: 10, influences: ["gap"], monotonicity: -1 })],
        config: { maxStepFraction: 10, method: "proportional" },
      });
      // ratio 1.25, inverse -> 10 / 1.25 = 8
      expect(res.corrections[0].newValue).toBeCloseTo(8, 5);
    });
  });

  describe("correct() -- trust region + hard bounds", () => {
    it("limits a huge step to maxStepFraction of the current value", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 100)]), // ratio 10x
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
        config: { maxStepFraction: 0.5, method: "proportional" },
      });
      // raw target 100; step clamped to +-50% of 10 -> 15
      expect(res.corrections[0].newValue).toBeCloseTo(15, 5);
      expect(res.corrections[0].stepLimited).toBe(true);
    });

    it("clamps to a hard upper bound and flags clampedToBound", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 800)]), // wants 12.5
        params: [param({ name: "r", value: 10, influences: ["bbox"], max: 11, min: 1 })],
        config: { maxStepFraction: 10, method: "proportional" },
      });
      expect(res.corrections[0].newValue).toBeCloseTo(11, 5);
      expect(res.corrections[0].clampedToBound).toBe(true);
    });
  });

  describe("correct() -- coordinate descent (largest delta first, one param per step)", () => {
    it("corrects the largest-delta metric first and does not reuse a param", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([
          metric("height", 100, 90), // -10%
          metric("bbox", 1000, 500), // -50% (larger)
        ]),
        // r influences BOTH; h influences only height
        params: [
          param({ name: "r", value: 10, influences: ["bbox", "height"] }),
          param({ name: "h", value: 20, influences: ["height"] }),
        ],
        config: { maxStepFraction: 10, method: "proportional" },
      });
      expect(res.status).toBe("iterate");
      expect(res.corrections).toHaveLength(2);
      const byName = Object.fromEntries(res.corrections.map((c) => [c.name, c]));
      // bbox is the larger delta, so r is consumed by bbox; height falls to h
      expect(byName.r.drivenByMetric).toBe("bbox");
      expect(byName.h.drivenByMetric).toBe("height");
    });
  });

  describe("correct() -- non-correctable + stop verdicts", () => {
    it("reports no-correctable-params when a failing metric has no influencing param", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("topology", 1.0, 0.79, 5)]), // fails, ~21% off
        params: [param({ name: "r", value: 10, influences: ["bbox"] })], // does NOT influence topology
      });
      expect(res.status).toBe("no-correctable-params");
      expect(res.uncorrectableMetrics).toContain("topology");
      expect(res.corrections).toHaveLength(0);
    });

    it("returns max-iterations once the iteration cap is exceeded", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 500)]),
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
        iteration: 12,
        config: { maxIterations: 12 },
      });
      expect(res.status).toBe("max-iterations");
      expect(res.corrections).toHaveLength(0);
    });

    it("declares plateau when improvement stalls below epsilon for patience iterations", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 100, 149.5)]), // 49.5% off, fails
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
        iteration: 3,
        previousMaxDeltaPercent: 50, // improvement (50 -> 49.5)/50 = 1% < 2% epsilon
        stagnantIterations: 1, // +1 this iter -> 2 >= patience 2
        config: { plateauEpsilon: 0.02, plateauPatience: 2 },
      });
      expect(res.status).toBe("plateau");
      expect(res.improvedFraction).toBeCloseTo(0.01, 5);
      expect(res.corrections).toHaveLength(0);
    });
  });

  describe("correct() -- secant method", () => {
    it("uses two distinct history samples to take a slope-based step", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("m", 100, 96, 2)]), // -4% fails the 2% threshold
        params: [param({ name: "r", value: 12, influences: ["m"] })],
        history: [
          { params: { r: 10 }, metrics: { m: 80 } },
          { params: { r: 12 }, metrics: { m: 96 } },
        ],
        config: { method: "secant", maxStepFraction: 10 },
      });
      // slope = (96-80)/(12-10) = 8 ; step = (100-96)/8 = 0.5 ; r -> 12.5
      expect(res.corrections[0].method).toBe("secant");
      expect(res.corrections[0].newValue).toBeCloseTo(12.5, 5);
    });

    it("method 'auto' selects secant when >=2 distinct history samples exist", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("m", 100, 96, 2)]),
        params: [param({ name: "r", value: 12, influences: ["m"] })],
        history: [
          { params: { r: 10 }, metrics: { m: 80 } },
          { params: { r: 12 }, metrics: { m: 96 } },
        ],
        config: { method: "auto", maxStepFraction: 10 },
      });
      // auto -> secant (slope 8, step 0.5) -> 12.5, NOT the proportional 12.5-by-ratio path
      expect(res.corrections[0].method).toBe("secant");
      expect(res.corrections[0].newValue).toBeCloseTo(12.5, 5);
    });

    it("falls back to proportional when there is insufficient distinct history", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("m", 100, 80)]),
        params: [param({ name: "r", value: 10, influences: ["m"] })],
        history: [{ params: { r: 10 }, metrics: { m: 80 } }], // only one sample
        config: { method: "auto", maxStepFraction: 10 },
      });
      expect(res.corrections[0].method).toBe("proportional");
      expect(res.corrections[0].newValue).toBeCloseTo(12.5, 5);
    });
  });

  describe("correct() -- adversarial / degenerate inputs", () => {
    it("does not produce NaN when the generated metric value is zero (div-by-zero guard)", () => {
      const eng = new CADRegenCorrectionEngine();
      const res = eng.correct({
        compareResult: compare([metric("bbox", 1000, 0)]),
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
        config: { method: "proportional" },
      });
      // cannot compute a proportional step from generated=0 -> no correction
      expect(res.corrections).toHaveLength(0);
      expect(res.status).toBe("no-correctable-params");
      expect(Number.isNaN(res.maxDeltaPercent)).toBe(false);
    });

    it("skips a metric with a non-finite value without throwing or emitting NaN", () => {
      const eng = new CADRegenCorrectionEngine();
      const m = metric("bbox", 1000, 1000);
      // force a failing, non-finite generated value
      (m as { generated: number }).generated = Number.NaN;
      (m as { passed: boolean }).passed = false;
      const res = eng.correct({
        compareResult: compare([m]),
        params: [param({ name: "r", value: 10, influences: ["bbox"] })],
      });
      expect(res.corrections).toHaveLength(0);
      expect(Number.isFinite(res.maxDeltaPercent)).toBe(true);
    });

    it("throws TypeError on structurally invalid input", () => {
      const eng = new CADRegenCorrectionEngine();
      // @ts-expect-error -- intentional bad input
      expect(() => eng.correct(null)).toThrow(TypeError);
      // @ts-expect-error -- missing metrics array
      expect(() => eng.correct({ compareResult: {}, params: [] })).toThrow(TypeError);
      expect(() =>
        // @ts-expect-error -- params not an array
        eng.correct({ compareResult: compare([metric("b", 1, 1)]), params: "no" }),
      ).toThrow(TypeError);
    });
  });

  describe("applyToTemplate()", () => {
    const opTemplate = [
      { kind: "feature_revolve", args: { profile: "disk", radius: 8 } },
      { kind: "feature_loft", args: { chordRoot: 18, twist: 0 } },
    ] as unknown as Parameters<CADRegenCorrectionEngine["applyToTemplate"]>[0];

    it("writes the corrected value into op.args[argKey] via param lineage, without mutating the input", () => {
      const eng = new CADRegenCorrectionEngine();
      const lineage: CorrectionParam[] = [
        { name: "radius_op0", value: 8, influences: ["bbox"], opIndex: 0, argKey: "radius" },
      ];
      const corrections = [
        {
          name: "radius_op0",
          oldValue: 8,
          newValue: 10,
          drivenByMetric: "bbox",
          currentDeltaPercent: -20,
          method: "proportional" as const,
          clampedToBound: false,
          stepLimited: false,
        },
      ];
      const out = eng.applyToTemplate(opTemplate, corrections, lineage);
      expect(out[0].args.radius).toBe(10);
      // input untouched (pure)
      expect((opTemplate[0] as { args: { radius: number } }).args.radius).toBe(8);
    });

    it("ignores corrections whose opIndex is out of range", () => {
      const eng = new CADRegenCorrectionEngine();
      const lineage: CorrectionParam[] = [
        { name: "ghost", value: 1, influences: [], opIndex: 99, argKey: "radius" },
      ];
      const corrections = [
        {
          name: "ghost",
          oldValue: 1,
          newValue: 2,
          drivenByMetric: "bbox",
          currentDeltaPercent: 0,
          method: "proportional" as const,
          clampedToBound: false,
          stepLimited: false,
        },
      ];
      const out = eng.applyToTemplate(opTemplate, corrections, lineage);
      // nothing changed, no throw
      expect(out[0].args.radius).toBe(8);
      expect(out).toHaveLength(2);
    });
  });

  describe("runClosedLoop() -- full GENERATE->COMPARE->CORRECT E2E", () => {
    it("converges a monotone candidate to the reference within the iteration cap", async () => {
      const eng = new CADRegenCorrectionEngine();
      // deterministic evaluator: bbox = radius * 100, reference bbox = 1000 -> target radius 10
      const evaluate = (params: CorrectionParam[]): ComparisonResult => {
        const r = params.find((p) => p.name === "r")!.value;
        const gen = r * 100;
        return compare([metric("bbox", 1000, gen, 5)]);
      };
      const res = await eng.runClosedLoop({
        initialParams: [param({ name: "r", value: 5, influences: ["bbox"] })],
        evaluate,
        config: { maxStepFraction: 0.5, method: "proportional", maxIterations: 12 },
      });
      expect(res.converged).toBe(true);
      expect(res.status).toBe("converged");
      expect(res.finalParams.find((p) => p.name === "r")!.value).toBeCloseTo(10, 1);
      expect(res.finalComparison?.overallPassed).toBe(true);
      // trajectory should record each generate+compare iteration
      expect(res.trajectory.length).toBeGreaterThanOrEqual(2);
      expect(res.trajectory[res.trajectory.length - 1].status).toBe("converged");
    });

    it("stops at PLATEAU when the candidate never responds to corrections", async () => {
      const eng = new CADRegenCorrectionEngine();
      // evaluator IGNORES params -> metric never improves -> plateau
      const evaluate = (): ComparisonResult => compare([metric("bbox", 1000, 500, 5)]);
      const res = await eng.runClosedLoop({
        initialParams: [param({ name: "r", value: 10, influences: ["bbox"] })],
        evaluate,
        config: { plateauEpsilon: 0.02, plateauPatience: 2, maxIterations: 12 },
      });
      expect(res.status).toBe("plateau");
      expect(res.converged).toBe(false);
      // patience 2 honored exactly: iter1 (baseline) + 2 measured non-progress iters
      // = plateau on the 3rd iteration. Pins the off-by-one: pre-incrementing the
      // stagnation counter in the loop would trip plateau at iteration 2.
      expect(res.iterations).toBe(3);
    });

    it("returns max-iterations when convergence needs more steps than the cap", async () => {
      const eng = new CADRegenCorrectionEngine();
      const evaluate = (params: CorrectionParam[]): ComparisonResult => {
        const r = params.find((p) => p.name === "r")!.value;
        return compare([metric("bbox", 1000, r * 100, 5)]);
      };
      const res = await eng.runClosedLoop({
        initialParams: [param({ name: "r", value: 1, influences: ["bbox"] })], // far away
        evaluate,
        config: { maxStepFraction: 0.5, maxIterations: 2 }, // too few steps to reach 10
      });
      expect(res.status).toBe("max-iterations");
      expect(res.converged).toBe(false);
      expect(res.iterations).toBe(2);
    });

    it("invokes the onIteration callback once per iteration", async () => {
      const eng = new CADRegenCorrectionEngine();
      const seen: number[] = [];
      const evaluate = (params: CorrectionParam[]): ComparisonResult =>
        compare([metric("bbox", 1000, params[0].value * 100, 5)]);
      await eng.runClosedLoop({
        initialParams: [param({ name: "r", value: 5, influences: ["bbox"] })],
        evaluate,
        config: { maxStepFraction: 0.5 },
        onIteration: (step) => seen.push(step.iteration),
      });
      expect(seen.length).toBeGreaterThanOrEqual(2);
      expect(seen[0]).toBe(1);
    });

    it("throws TypeError on missing evaluate or bad initialParams", async () => {
      const eng = new CADRegenCorrectionEngine();
      // @ts-expect-error -- no evaluate
      await expect(eng.runClosedLoop({ initialParams: [] })).rejects.toThrow(TypeError);
      await expect(
        // @ts-expect-error -- initialParams not array
        eng.runClosedLoop({ initialParams: "x", evaluate: () => compare([]) }),
      ).rejects.toThrow(TypeError);
    });
  });

  describe("paramsFromTemplate() + getStats()", () => {
    it("builds lineage-carrying params from a reverse template via a metric->params map", () => {
      const eng = new CADRegenCorrectionEngine();
      const template = {
        name: "t",
        category: "turned_part",
        confidence: 0.9,
        params: [
          { name: "radius_op0", value: 8, opIndex: 0, argKey: "radius" },
          { name: "twist_op1", value: 0, opIndex: 1, argKey: "twist" },
        ],
        opTemplate: [],
        opKindHistogram: {},
        skippedOps: 0,
      } as unknown as Parameters<CADRegenCorrectionEngine["paramsFromTemplate"]>[0];
      const out = eng.paramsFromTemplate(template, { bbox: ["radius_op0"] });
      const r = out.find((p) => p.name === "radius_op0")!;
      expect(r.influences).toEqual(["bbox"]);
      expect(r.opIndex).toBe(0);
      expect(r.argKey).toBe("radius");
      // a param not referenced in the map has no influences
      expect(out.find((p) => p.name === "twist_op1")!.influences).toEqual([]);
    });

    it("tracks engine counters across calls", () => {
      const eng = new CADRegenCorrectionEngine();
      const before = eng.getStats().totalCorrectCalls;
      eng.correct({
        compareResult: compare([metric("bbox", 1000, 1000)], true),
        params: [],
      });
      expect(eng.getStats().totalCorrectCalls).toBe(before + 1);
    });
  });

  describe("singleton export", () => {
    it("exports a ready-to-use singleton", () => {
      expect(cadRegenCorrectionEngine).toBeInstanceOf(CADRegenCorrectionEngine);
    });
  });
});
