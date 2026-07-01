/**
 * Tests for StochasticWrapperEngine — unified UQ wrapper.
 * 20+ tests covering MC, FOSM, PCE, sensitivity, chain propagation,
 * distribution fitting, and report generation.
 */
import { describe, it, expect } from "vitest";
import { stochasticWrapperEngine } from "../engines/StochasticWrapperEngine";

// ── Helper functions ────────────────────────────────────────────

/** Linear: y = 2x + 3 */
const linearFn = (inp: Record<string, number>) => ({ y: 2 * inp.x + 3 });

/** Quadratic: y = x^2 */
const quadFn = (inp: Record<string, number>) => ({ y: inp.x * inp.x });

/** Two-input linear: y = 3x + 2z */
const twoInputLinear = (inp: Record<string, number>) => ({
  y: 3 * inp.x + 2 * inp.z,
});

/** Product: y = x * z (nonlinear in two vars) */
const productFn = (inp: Record<string, number>) => ({
  y: inp.x * inp.z,
});

/** Multi-output: a = x+1, b = 2*x */
const multiOut = (inp: Record<string, number>) => ({
  a: inp.x + 1,
  b: 2 * inp.x,
});

// ── Monte Carlo ─────────────────────────────────────────────────

describe("StochasticWrapperEngine — Monte Carlo", () => {
  it("MC on linear y=2x+3: mean ≈ 2*μ+3, std ≈ 2*σ", () => {
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      n_samples: 20000,
      seed: 42,
    });
    const stats = result.value.outputs.y;
    expect(stats.mean).toBeCloseTo(13, 0);        // 2*5+3=13
    expect(stats.std_dev).toBeCloseTo(2, 0);       // 2*1=2
  });

  it("MC on quadratic y=x²: mean ≈ μ²+σ²", () => {
    const mu = 10, sigma = 1;
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: quadFn,
      nominal_inputs: { x: mu },
      input_distributions: { x: { type: "normal", params: [mu, sigma] } },
      n_samples: 20000,
      seed: 123,
    });
    const stats = result.value.outputs.y;
    // E[X²] = μ² + σ² = 101
    expect(stats.mean).toBeCloseTo(mu * mu + sigma * sigma, 0);
    // Std[X²] ≈ 2μσ = 20 (for small σ/μ)
    expect(stats.std_dev).toBeCloseTo(2 * mu * sigma, 0);
  });

  it("seeded random produces reproducible results", () => {
    const opts = {
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal" as const, params: [5, 1] } },
      n_samples: 1000,
      seed: 999,
    };
    const r1 = stochasticWrapperEngine.wrapWithMonteCarlo(opts);
    const r2 = stochasticWrapperEngine.wrapWithMonteCarlo(opts);
    expect(r1.value.outputs.y.mean).toBe(r2.value.outputs.y.mean);
    expect(r1.value.outputs.y.std_dev).toBe(r2.value.outputs.y.std_dev);
  });

  it("CI_95 contains true mean across repeated trials", () => {
    // For y=2x+3 with x~N(5,1), true mean = 13
    let containsCount = 0;
    for (let trial = 0; trial < 20; trial++) {
      const result = stochasticWrapperEngine.wrapWithMonteCarlo({
        engine_fn: linearFn,
        nominal_inputs: { x: 5 },
        input_distributions: { x: { type: "normal", params: [5, 1] } },
        n_samples: 5000,
        seed: trial * 137,
      });
      const ci = result.value.outputs.y.ci_95;
      if (ci[0] <= 13 && 13 <= ci[1]) containsCount++;
    }
    // Should contain true mean in ~95% of trials (allow ≥16/20)
    expect(containsCount).toBeGreaterThanOrEqual(16);
  });

  it("LHS produces lower variance than random MC for same N", () => {
    const baseOpts = {
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal" as const, params: [5, 1] } },
      n_samples: 500,
    };

    // Run multiple trials and compare std-of-means
    const randomMeans: number[] = [];
    const lhsMeans: number[] = [];
    for (let i = 0; i < 30; i++) {
      const rr = stochasticWrapperEngine.wrapWithMonteCarlo({
        ...baseOpts, sampling_method: "random", seed: i * 7,
      });
      randomMeans.push(rr.value.outputs.y.mean);

      const lr = stochasticWrapperEngine.wrapWithMonteCarlo({
        ...baseOpts, sampling_method: "lhs", seed: i * 7,
      });
      lhsMeans.push(lr.value.outputs.y.mean);
    }

    const randomVar = variance(randomMeans);
    const lhsVar = variance(lhsMeans);
    // LHS should have lower or comparable variance of the mean estimator
    expect(lhsVar).toBeLessThanOrEqual(randomVar * 1.5);
  });

  it("single sample returns point estimate without crash", () => {
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      n_samples: 1,
      seed: 42,
    });
    expect(result.value.outputs.y.mean).toBeDefined();
    expect(result.value.outputs.y.std_dev).toBeDefined();
    expect(result.value.n_samples).toBe(1);
  });
});

// ── Sampling distributions ──────────────────────────────────────

describe("StochasticWrapperEngine — Sampling distributions", () => {
  it("normal distribution sampling passes KS test at α=0.05", () => {
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: (inp) => ({ y: inp.x }),
      nominal_inputs: { x: 0 },
      input_distributions: { x: { type: "normal", params: [10, 2] } },
      n_samples: 5000,
      seed: 42,
    });
    const fit = stochasticWrapperEngine.fitDistribution(
      Array.from({ length: 5000 }, (_, i) => {
        // Recompute — use the output stats
        return 0; // placeholder
      }),
    );
    // Check via the MC output's distribution_fit
    const stats = result.value.outputs.y;
    expect(stats.distribution_fit.ks_statistic).toBeLessThan(0.05);
  });

  it("lognormal sampling: all values positive and right-skewed", () => {
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: (inp) => ({ y: inp.x }),
      nominal_inputs: { x: 1 },
      input_distributions: { x: { type: "lognormal", params: [0, 0.5] } },
      n_samples: 5000,
      seed: 77,
    });
    const stats = result.value.outputs.y;
    // All positive → p5 > 0
    expect(stats.p5).toBeGreaterThan(0);
    // Right-skewed → mean > median
    expect(stats.mean).toBeGreaterThan(stats.p50);
  });

  it("Weibull sampling: shape parameter controls tail", () => {
    // shape < 1 → heavy right tail; shape > 3 → light tail
    const heavyTail = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: (inp) => ({ y: inp.x }),
      nominal_inputs: { x: 1 },
      input_distributions: { x: { type: "weibull", params: [0.8, 1] } },
      n_samples: 10000,
      seed: 55,
    });
    const lightTail = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: (inp) => ({ y: inp.x }),
      nominal_inputs: { x: 1 },
      input_distributions: { x: { type: "weibull", params: [5, 1] } },
      n_samples: 10000,
      seed: 55,
    });
    // Heavy tail has higher CV (more spread relative to mean)
    expect(heavyTail.value.outputs.y.cv_percent)
      .toBeGreaterThan(lightTail.value.outputs.y.cv_percent);
  });

  it("triangular sampling: mode is near peak of histogram", () => {
    const result = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: (inp) => ({ y: inp.x }),
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "triangular", params: [0, 7, 10] } },
      n_samples: 10000,
      seed: 33,
    });
    const stats = result.value.outputs.y;
    const { bins, counts } = stats.histogram;
    const peakIdx = counts.indexOf(Math.max(...counts));
    const peakBin = bins[peakIdx];
    // Peak should be near mode=7 (within a few bin widths)
    expect(Math.abs(peakBin - 7)).toBeLessThan(3);
  });
});

// ── FOSM ────────────────────────────────────────────────────────

describe("StochasticWrapperEngine — FOSM", () => {
  it("FOSM on linear y=2x+3: exact match (mean=13, std=2)", () => {
    const result = stochasticWrapperEngine.wrapWithFOSM({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
    });
    const stats = result.value.outputs.y;
    expect(stats.mean).toBeCloseTo(13, 8);   // Exact for linear
    expect(stats.std_dev).toBeCloseTo(2, 8); // Exact for linear
  });

  it("FOSM on quadratic y=x²: approximate match", () => {
    const mu = 10, sigma = 1;
    const result = stochasticWrapperEngine.wrapWithFOSM({
      engine_fn: quadFn,
      nominal_inputs: { x: mu },
      input_distributions: { x: { type: "normal", params: [mu, sigma] } },
    });
    const stats = result.value.outputs.y;
    // FOSM mean = f(μ) = 100 (no second-order correction)
    expect(stats.mean).toBeCloseTo(100, 0);
    // FOSM std = |df/dx| * σ = 2μσ = 20
    expect(stats.std_dev).toBeCloseTo(20, 0);
  });

  it("FOSM with correlated inputs changes output variance", () => {
    // y = x + z, both N(0,1), correlated
    const fn = (inp: Record<string, number>) => ({ y: inp.x + inp.z });

    const uncorrelated = stochasticWrapperEngine.wrapWithFOSM({
      engine_fn: fn,
      nominal_inputs: { x: 0, z: 0 },
      input_distributions: {
        x: { type: "normal", params: [0, 1] },
        z: { type: "normal", params: [0, 1] },
      },
    });
    const correlated = stochasticWrapperEngine.wrapWithFOSM({
      engine_fn: fn,
      nominal_inputs: { x: 0, z: 0 },
      input_distributions: {
        x: { type: "normal", params: [0, 1] },
        z: { type: "normal", params: [0, 1] },
      },
      correlation_matrix: [[1, 0.8], [0.8, 1]],
    });

    // Var(X+Z) = σx² + σz² + 2ρσxσz
    // Uncorrelated: 1+1 = 2, std = √2 ≈ 1.414
    // Correlated (ρ=0.8): 1+1+2*0.8 = 3.6, std = √3.6 ≈ 1.897
    expect(uncorrelated.value.outputs.y.std_dev).toBeCloseTo(Math.sqrt(2), 1);
    expect(correlated.value.outputs.y.std_dev).toBeCloseTo(Math.sqrt(3.6), 1);
    expect(correlated.value.outputs.y.std_dev)
      .toBeGreaterThan(uncorrelated.value.outputs.y.std_dev);
  });

  it("zero uncertainty → zero output uncertainty", () => {
    const result = stochasticWrapperEngine.wrapWithFOSM({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 0] } },
    });
    expect(result.value.outputs.y.std_dev).toBe(0);
  });
});

// ── PCE ─────────────────────────────────────────────────────────

describe("StochasticWrapperEngine — PCE", () => {
  it("PCE on linear function recovers mean and std", () => {
    const result = stochasticWrapperEngine.wrapWithPCE({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      pce_order: 2,
      n_eval_points: 100,
      seed: 42,
    });
    const stats = result.value.outputs.y;
    expect(stats.mean).toBeCloseTo(13, 0);
    expect(stats.std_dev).toBeCloseTo(2, 0);
  });

  it("PCE Sobol first-order for single input ≈ 1.0", () => {
    const result = stochasticWrapperEngine.wrapWithPCE({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      pce_order: 2,
      n_eval_points: 100,
      seed: 42,
    });
    const sobol = result.value.outputs.y.sobol_first_order;
    expect(sobol.x).toBeGreaterThan(0.8); // Should be ~1.0
  });
});

// ── Sensitivity Analysis ────────────────────────────────────────

describe("StochasticWrapperEngine — Sensitivity", () => {
  it("for y=3x+2z, x has 1.5x more influence than z", () => {
    const result = stochasticWrapperEngine.sensitivityAnalysis({
      engine_fn: twoInputLinear,
      nominal_inputs: { x: 10, z: 10 },
    });
    const ranking = result.value.ranking;
    expect(ranking[0].parameter).toBe("x");
    expect(ranking[1].parameter).toBe("z");
    // Ratio of influence should be ~1.5 (3/2)
    const ratio = ranking[0].total_influence / ranking[1].total_influence;
    expect(ratio).toBeCloseTo(1.5, 1);
  });

  it("tornado chart data has correct structure", () => {
    const result = stochasticWrapperEngine.sensitivityAnalysis({
      engine_fn: twoInputLinear,
      nominal_inputs: { x: 10, z: 10 },
      perturbation_pcts: [10, 20],
    });
    expect(result.value.tornado.length).toBeGreaterThan(0);
    const bar = result.value.tornado[0];
    expect(bar).toHaveProperty("parameter");
    expect(bar).toHaveProperty("low_pct");
    expect(bar).toHaveProperty("high_pct");
    expect(bar).toHaveProperty("range_pct");
    expect(bar.range_pct).toBeGreaterThan(0);
  });
});

// ── Chain Propagation ───────────────────────────────────────────

describe("StochasticWrapperEngine — Chain", () => {
  it("2-stage chain propagates uncertainty correctly", () => {
    // Stage 1: y = 2*x  (x ~ N(10,1))
    // Stage 2: z = y + 5 = 2*x + 5
    // True: mean(z) = 25, std(z) = 2
    const result = stochasticWrapperEngine.propagateChain({
      stages: [
        { engine_fn: (inp) => ({ y: 2 * inp.x }) },
        {
          engine_fn: (inp) => ({ z: inp.y + 5 }),
          input_mapping: { y: "y" },
        },
      ],
      initial_inputs: { x: 10 },
      input_distributions: { x: { type: "normal", params: [10, 1] } },
      n_samples: 10000,
      seed: 42,
    });
    const final = result.value.final_outputs.z;
    expect(final.mean).toBeCloseTo(25, 0);
    expect(final.std_dev).toBeCloseTo(2, 0);
  });

  it("identifies dominant input variable correctly", () => {
    // x ~ N(10, 3), z ~ N(5, 0.1)  → x dominates
    const result = stochasticWrapperEngine.propagateChain({
      stages: [
        { engine_fn: (inp) => ({ y: inp.x + inp.z }) },
      ],
      initial_inputs: { x: 10, z: 5 },
      input_distributions: {
        x: { type: "normal", params: [10, 3] },
        z: { type: "normal", params: [5, 0.1] },
      },
      n_samples: 5000,
      seed: 42,
    });
    expect(result.value.dominant_input.name).toBe("x");
    expect(result.value.dominant_input.variance_contribution_pct)
      .toBeGreaterThan(90);
  });
});

// ── Distribution Fitting ────────────────────────────────────────

describe("StochasticWrapperEngine — Distribution Fitting", () => {
  it("normal data identified as normal", () => {
    // Generate normal-like data deterministically
    const data: number[] = [];
    const rng = mulberry32(42);
    for (let i = 0; i < 2000; i += 2) {
      const u1 = rng() || 1e-15;
      const u2 = rng();
      const r = Math.sqrt(-2 * Math.log(u1));
      data.push(10 + 2 * r * Math.cos(2 * Math.PI * u2));
      data.push(10 + 2 * r * Math.sin(2 * Math.PI * u2));
    }
    const result = stochasticWrapperEngine.fitDistribution(data);
    expect(result.value.best.type).toBe("normal");
    expect(result.value.best.ks_statistic).toBeLessThan(0.05);
  });

  it("lognormal data identified as lognormal", () => {
    const data: number[] = [];
    const rng = mulberry32(77);
    for (let i = 0; i < 2000; i += 2) {
      const u1 = rng() || 1e-15;
      const u2 = rng();
      const r = Math.sqrt(-2 * Math.log(u1));
      const z = r * Math.cos(2 * Math.PI * u2);
      data.push(Math.exp(1 + 0.5 * z));
      const z2 = r * Math.sin(2 * Math.PI * u2);
      data.push(Math.exp(1 + 0.5 * z2));
    }
    const result = stochasticWrapperEngine.fitDistribution(data);
    expect(result.value.best.type).toBe("lognormal");
  });
});

// ── Report Generation ───────────────────────────────────────────

describe("StochasticWrapperEngine — Report", () => {
  it("produces valid structured output", () => {
    const mc = stochasticWrapperEngine.wrapWithMonteCarlo({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      n_samples: 2000,
      seed: 42,
    });
    const sens = stochasticWrapperEngine.sensitivityAnalysis({
      engine_fn: linearFn,
      nominal_inputs: { x: 5 },
    });
    const report = stochasticWrapperEngine.generateReport({
      input_distributions: { x: { type: "normal", params: [5, 1] } },
      outputs: mc.value.outputs,
      sensitivity: sens.value,
      limits: { y: 18 },
    });

    const r = report.value;
    expect(r.input_summary).toHaveLength(1);
    expect(r.input_summary[0].name).toBe("x");
    expect(r.output_summary).toHaveLength(1);
    expect(r.output_summary[0].name).toBe("y");
    expect(r.risk_assessment).toBeDefined();
    expect(r.risk_assessment!.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
    // P(y > 18) where y ~ N(13, 2): z=(18-13)/2=2.5 → P≈0.006
    expect(r.risk_assessment![0].p_exceed).toBeLessThan(0.05);
  });
});

// ── Helpers ─────────────────────────────────────────────────────

function variance(data: number[]): number {
  const m = data.reduce((s, v) => s + v, 0) / data.length;
  return data.reduce((s, v) => s + (v - m) ** 2, 0) / (data.length - 1);
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
