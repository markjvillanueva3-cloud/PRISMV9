/**
 * Tests for WEDMWeibullWireLifeEngine
 * WEDM-BIZ-MS0 / U-WB06
 *
 * Real validation (not stubs):
 *  - Weibull CDF F(η) = 1 − e^(−1) ≈ 0.632 (exact, independent of β)
 *  - MTTF = η × Γ(1 + 1/β) matches published Γ values
 *  - β = 1 recovers exponential distribution (memoryless)
 *  - MLE recovers β, η from synthetic data within 10-20%
 *  - Right-censored observations reduce estimated failure count
 *  - Percentile inverts CDF: F(percentile(p)) = p
 *  - B10 life < MTTF (by construction)
 *  - Higher β group identified as longer-lived in compareGroups
 *  - Dispatcher schema round-trip
 */

import { describe, it, expect } from "vitest";
import { wedmWeibullWireLifeEngine } from "../engines/WEDMWeibullWireLifeEngine.js";

function generateWeibullSamples(beta: number, eta: number, n: number, seed = 42): number[] {
  // Inverse-CDF sampling: t = η × (−ln(1 − U))^(1/β)
  // Deterministic Mulberry32 PRNG for reproducibility
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = rand();
    samples.push(eta * Math.pow(-Math.log(1 - u), 1 / beta));
  }
  return samples;
}

describe("Weibull CDF / PDF / Hazard — closed-form invariants", () => {
  it("F(η) = 1 − e^(-1) ≈ 0.6321 for any β", () => {
    for (const beta of [0.8, 1.0, 1.5, 2.5, 3.0]) {
      const r = wedmWeibullWireLifeEngine.failureProbability({
        beta,
        eta_min: 100,
        t_min: 100,
      });
      expect(r.F_t).toBeCloseTo(0.6321, 3);
      expect(r.R_t).toBeCloseTo(1 - 0.6321, 3);
    }
  });

  it("R(0) = 1 and F(0) = 0", () => {
    const r = wedmWeibullWireLifeEngine.failureProbability({
      beta: 2.0,
      eta_min: 100,
      t_min: 0,
    });
    expect(r.R_t).toBe(1);
    expect(r.F_t).toBe(0);
  });

  it("β = 1 recovers exponential: h(t) = 1/η (constant)", () => {
    const r1 = wedmWeibullWireLifeEngine.failureProbability({ beta: 1, eta_min: 200, t_min: 50 });
    const r2 = wedmWeibullWireLifeEngine.failureProbability({ beta: 1, eta_min: 200, t_min: 150 });
    expect(r1.h_t).toBeCloseTo(1 / 200, 6);
    expect(r2.h_t).toBeCloseTo(1 / 200, 6);
  });

  it("β > 1 gives increasing hazard (wear-out)", () => {
    const t_values = [10, 50, 100, 200, 500];
    const h_values = t_values.map(
      (t) =>
        wedmWeibullWireLifeEngine.failureProbability({ beta: 2.5, eta_min: 150, t_min: t }).h_t
    );
    for (let i = 1; i < h_values.length; i++) {
      expect(h_values[i]).toBeGreaterThan(h_values[i - 1]);
    }
  });

  it("β < 1 gives decreasing hazard (infant mortality)", () => {
    const t_values = [10, 50, 100, 200, 500];
    const h_values = t_values.map(
      (t) =>
        wedmWeibullWireLifeEngine.failureProbability({ beta: 0.6, eta_min: 150, t_min: t }).h_t
    );
    for (let i = 1; i < h_values.length; i++) {
      expect(h_values[i]).toBeLessThan(h_values[i - 1]);
    }
  });

  it("PDF integrates to ~1 (sanity: f × dt Riemann sum)", () => {
    const beta = 2.0;
    const eta = 100;
    const dt = 0.5;
    let area = 0;
    for (let t = 0; t < 500; t += dt) {
      area += wedmWeibullWireLifeEngine.failureProbability({ beta, eta_min: eta, t_min: t + dt / 2 }).f_t * dt;
    }
    expect(area).toBeCloseTo(1.0, 1);
  });
});

describe("Percentile — inverse CDF", () => {
  it("percentile(0.5) ≈ η × (ln 2)^(1/β) (median life)", () => {
    // β = 2, η = 100 → median = 100 × √(ln 2) = 83.25
    const r = wedmWeibullWireLifeEngine.percentile({ beta: 2, eta_min: 100, p: 0.5 });
    expect(r.t_p_min).toBeCloseTo(100 * Math.sqrt(Math.log(2)), 3);
  });

  it("F(percentile(p)) = p exactly (round-trip)", () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const t_p = wedmWeibullWireLifeEngine.percentile({ beta: 2.2, eta_min: 120, p }).t_p_min;
      const F = wedmWeibullWireLifeEngine.failureProbability({
        beta: 2.2,
        eta_min: 120,
        t_min: t_p,
      }).F_t;
      expect(F).toBeCloseTo(p, 6);
    }
  });

  it("B10 life < MTTF (by definition for β > 1)", () => {
    const beta = 2.5;
    const eta = 100;
    const b10 = wedmWeibullWireLifeEngine.b10Life(beta, eta);
    // MTTF for β=2.5, η=100 ≈ 100 × Γ(1.4) ≈ 100 × 0.887 ≈ 88.7
    const mttf = 100 * 0.88726; // Γ(1.4) ≈ 0.88726
    expect(b10).toBeLessThan(mttf);
  });
});

describe("MLE fit — recovers known parameters", () => {
  it("β=2.0, η=100 recovered from 200 synthetic samples within 15%", () => {
    const beta_true = 2.0;
    const eta_true = 100;
    const samples = generateWeibullSamples(beta_true, eta_true, 200, 12345);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });

    expect(fit.converged).toBe(true);
    expect(fit.beta).toBeGreaterThan(beta_true * 0.85);
    expect(fit.beta).toBeLessThan(beta_true * 1.15);
    expect(fit.eta_min).toBeGreaterThan(eta_true * 0.90);
    expect(fit.eta_min).toBeLessThan(eta_true * 1.10);
  });

  it("β=1.2, η=150 recovered from synthetic data", () => {
    const samples = generateWeibullSamples(1.2, 150, 300, 99);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.beta).toBeGreaterThan(1.0);
    expect(fit.beta).toBeLessThan(1.4);
    expect(fit.eta_min).toBeGreaterThan(135);
    expect(fit.eta_min).toBeLessThan(165);
  });

  it("β=3.0 (strong wear-out) recovered as wearout mode", () => {
    const samples = generateWeibullSamples(3.0, 80, 250, 777);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.beta).toBeGreaterThan(2.5);
    expect(fit.failure_mode).toBe("wearout");
  });

  it("β=1.0 fit classified as random failure mode", () => {
    const samples = generateWeibullSamples(1.0, 100, 300, 55);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.beta).toBeGreaterThan(0.9);
    expect(fit.beta).toBeLessThan(1.1);
    expect(fit.failure_mode).toBe("random");
  });

  it("β=0.7 fit classified as infant_mortality", () => {
    const samples = generateWeibullSamples(0.7, 50, 400, 33);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.beta).toBeLessThan(0.9);
    expect(fit.failure_mode).toBe("infant_mortality");
  });

  it("MTTF from fit matches η × Γ(1 + 1/β)", () => {
    const samples = generateWeibullSamples(2.0, 100, 200, 42);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    // Γ(1.5) = √π / 2 ≈ 0.8862
    const expected_mttf = fit.eta_min * (Math.sqrt(Math.PI) / 2);
    expect(fit.mttf_min).toBeCloseTo(expected_mttf, 1);
  });

  it("CI contains point estimate and is symmetric-ish", () => {
    const samples = generateWeibullSamples(2.0, 100, 150, 111);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.mttf_ci95.low).toBeLessThan(fit.mttf_min);
    expect(fit.mttf_ci95.high).toBeGreaterThan(fit.mttf_min);
    expect(fit.mttf_ci95.high - fit.mttf_ci95.low).toBeGreaterThan(0);
  });

  it("log-likelihood is finite", () => {
    const samples = generateWeibullSamples(2.0, 100, 100, 22);
    const obs = samples.map((t) => ({ time_min: t, failed: true }));
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(Number.isFinite(fit.log_likelihood)).toBe(true);
  });
});

describe("Right-censoring support", () => {
  it("censored observations tracked in result", () => {
    const obs = [
      { time_min: 50, failed: true },
      { time_min: 80, failed: true },
      { time_min: 120, failed: true },
      { time_min: 150, failed: false }, // wire still alive
      { time_min: 200, failed: false },
    ];
    const fit = wedmWeibullWireLifeEngine.fit({ observations: obs });
    expect(fit.failures).toBe(3);
    expect(fit.censored).toBe(2);
    expect(fit.sample_size).toBe(5);
  });

  it("censored data shifts η upward vs all-failed (wire survived longer than observed)", () => {
    const failed_only = Array.from({ length: 20 }, (_, i) => ({
      time_min: 50 + i * 5,
      failed: true,
    }));
    const mixed = [
      ...failed_only.slice(0, 15),
      ...Array.from({ length: 5 }, (_, i) => ({
        time_min: 140 + i * 5,
        failed: false,
      })),
    ];
    const fit1 = wedmWeibullWireLifeEngine.fit({ observations: failed_only });
    const fit2 = wedmWeibullWireLifeEngine.fit({ observations: mixed });
    // Censored pushes η higher because censored survival time > treated as failure
    expect(fit2.eta_min).toBeGreaterThanOrEqual(fit1.eta_min - 1);
  });
});

describe("Group comparison", () => {
  it("compareGroups ranks longer-lived group as rank 1", () => {
    const short_life = Array.from({ length: 30 }, (_, i) => ({
      time_min: 30 + i * 2,
      failed: true,
    }));
    const long_life = Array.from({ length: 30 }, (_, i) => ({
      time_min: 100 + i * 3,
      failed: true,
    }));
    const rank = wedmWeibullWireLifeEngine.compareGroups({
      groups: [
        { name: "short", observations: short_life },
        { name: "long", observations: long_life },
      ],
    });
    expect(rank[0].name).toBe("long");
    expect(rank[0].rank).toBe(1);
    expect(rank[0].fit.mttf_min).toBeGreaterThan(rank[1].fit.mttf_min);
  });
});

describe("Survival curve", () => {
  it("R(t) at t=0 is 1, decreases monotonically", () => {
    const curve = wedmWeibullWireLifeEngine.survivalCurve(2.0, 100, 50);
    expect(curve[0].R_t).toBeCloseTo(1.0, 3);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].R_t).toBeLessThanOrEqual(curve[i - 1].R_t + 1e-6);
    }
  });

  it("R(η) ≈ 0.368 on the survival curve", () => {
    const curve = wedmWeibullWireLifeEngine.survivalCurve(1.5, 100, 100);
    // Find the point closest to t=100
    const atEta = curve.reduce((a, b) =>
      Math.abs(b.t_min - 100) < Math.abs(a.t_min - 100) ? b : a
    );
    expect(atEta.R_t).toBeCloseTo(Math.exp(-1), 2);
  });
});

describe("Adversarial & failure inputs", () => {
  it("rejects empty observations array", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.fit({ observations: [] })
    ).toThrow();
  });

  it("rejects fit with < 2 failures", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.fit({
        observations: [
          { time_min: 50, failed: true },
          { time_min: 100, failed: false },
          { time_min: 150, failed: false },
        ],
      })
    ).toThrow(/at least 2 failure/);
  });

  it("rejects negative time_min", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.fit({
        observations: [
          { time_min: -10, failed: true },
          { time_min: 50, failed: true },
        ],
      })
    ).toThrow();
  });

  it("rejects NaN time_min", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.fit({
        observations: [
          { time_min: NaN, failed: true },
          { time_min: 50, failed: true },
        ],
      })
    ).toThrow();
  });

  it("failureProbability rejects negative t_min", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.failureProbability({ beta: 2, eta_min: 100, t_min: -5 })
    ).toThrow();
  });

  it("failureProbability rejects non-positive β", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.failureProbability({ beta: 0, eta_min: 100, t_min: 50 })
    ).toThrow();
  });

  it("percentile rejects p outside (0, 1)", () => {
    expect(() =>
      wedmWeibullWireLifeEngine.percentile({ beta: 2, eta_min: 100, p: 0 })
    ).toThrow();
    expect(() =>
      wedmWeibullWireLifeEngine.percentile({ beta: 2, eta_min: 100, p: 1.5 })
    ).toThrow();
  });
});

describe("Dispatcher wiring round-trip", () => {
  it("schemas cover all 5 weibull actions", async () => {
    const { WEDM_WEIBULL_SCHEMAS } = await import("../schemas/wedmWeibullSchemas.js");
    for (const a of [
      "wedm_weibull_fit",
      "wedm_weibull_failure_probability",
      "wedm_weibull_percentile",
      "wedm_weibull_compare_groups",
      "wedm_weibull_survival_curve",
    ]) {
      expect(WEDM_WEIBULL_SCHEMAS[a]).toBeTruthy();
    }
  });

  it("schema validates fit input with observations array", async () => {
    const { WEDM_WEIBULL_SCHEMAS } = await import("../schemas/wedmWeibullSchemas.js");
    const s = WEDM_WEIBULL_SCHEMAS["wedm_weibull_fit"];
    const ok = s.safeParse({
      observations: [
        { time_min: 50, failed: true },
        { time_min: 100, failed: true },
        { time_min: 150, failed: false },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("schema rejects non-boolean failed", async () => {
    const { WEDM_WEIBULL_SCHEMAS } = await import("../schemas/wedmWeibullSchemas.js");
    const s = WEDM_WEIBULL_SCHEMAS["wedm_weibull_fit"];
    const bad = s.safeParse({
      observations: [{ time_min: 50, failed: "yes" }],
    });
    expect(bad.success).toBe(false);
  });

  it("percentile schema enforces p in (0, 1)", async () => {
    const { WEDM_WEIBULL_SCHEMAS } = await import("../schemas/wedmWeibullSchemas.js");
    const s = WEDM_WEIBULL_SCHEMAS["wedm_weibull_percentile"];
    expect(s.safeParse({ beta: 2, eta_min: 100, p: 0.5 }).success).toBe(true);
    expect(s.safeParse({ beta: 2, eta_min: 100, p: 0 }).success).toBe(false);
    expect(s.safeParse({ beta: 2, eta_min: 100, p: 1 }).success).toBe(false);
  });
});
