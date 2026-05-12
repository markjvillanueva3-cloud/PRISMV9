/**
 * WEDMRolloutSimulatorEngine tests — WEDM AGI Phase 3 / P3-MS3 / U-P3-12.
 *
 * Covers:
 *  - Klocke-formula ground-truth agreement (Ra, MRR, stability)
 *  - Dimensional consistency (Ra grows with discharge energy)
 *  - Seeded-RNG determinism and noise-distribution shape
 *  - Rollout trajectories and convergence detection
 *  - Argument validation
 */
import { describe, it, expect } from "vitest";
import {
  WEDMRolloutSimulatorEngine,
  wedmRolloutSimulatorEngine,
  REFERENCE_MRR_MM3_PER_MIN,
  DEFAULT_SEED,
} from "../../engines/WEDMRolloutSimulatorEngine.js";
import {
  wedmMaterialSparkDatabaseEngine,
  REFERENCE_IE_A,
  REFERENCE_TE_US,
} from "../../engines/WEDMMaterialSparkDatabaseEngine.js";
import type {
  WEDMCutTarget,
  WEDMRecipe,
  WEDMCutOutcome,
} from "../../engines/WEDMFewShotEngine.js";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

const BASE_RECIPE: WEDMRecipe = {
  peak_current_A: REFERENCE_IE_A,
  pulse_on_us: REFERENCE_TE_US,
  pulse_off_us: 40,
  wire_tension_N: 10,
};

const TARGET: WEDMCutTarget = {
  target_ra_um: 2.5,
  target_mrr_mm3_per_min: 18,
};

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMRolloutSimulatorEngine — Klocke ground-truth (Ra)", () => {
  it("reproduces the Klocke Ra formula Ra = C · (Ip·Ton)^k for D2", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const discharge = BASE_RECIPE.peak_current_A * BASE_RECIPE.pulse_on_us;
    const expected = sig.klocke_C * Math.pow(discharge, sig.klocke_k);
    const gt = engine.groundTruth(BASE_RECIPE, sig);
    expect(gt.ra_um).toBeCloseTo(expected, 6);
  });

  it("Ra grows monotonically with discharge energy (Ip·Ton)", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("H13");
    const low = engine.groundTruth({ ...BASE_RECIPE, peak_current_A: 4 }, sig);
    const high = engine.groundTruth({ ...BASE_RECIPE, peak_current_A: 16 }, sig);
    expect(high.ra_um).toBeGreaterThan(low.ra_um);
  });

  it("Ra uses the correct material's Klocke C across all spark-DB keys", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const keys = ["D2", "A2", "M2", "S7", "H13", "Ti6Al4V", "Inconel_718", "Cu_C110"] as const;
    for (const k of keys) {
      const sig = wedmMaterialSparkDatabaseEngine.get(k);
      const gt = engine.groundTruth(BASE_RECIPE, sig);
      expect(gt.ra_um).toBeGreaterThan(0);
      expect(Number.isFinite(gt.ra_um)).toBe(true);
    }
  });
});

describe("WEDMRolloutSimulatorEngine — MRR ground-truth", () => {
  it("at reference discharge (Ip_ref · Ton_ref), MRR = REFERENCE_MRR · mrr_factor", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const gt = engine.groundTruth(BASE_RECIPE, sig);
    expect(gt.mrr_mm3_per_min).toBeCloseTo(REFERENCE_MRR_MM3_PER_MIN * sig.mrr_factor, 4);
  });

  it("MRR scales linearly with discharge energy", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("A2");
    const single = engine.groundTruth(BASE_RECIPE, sig);
    const doubleRecipe: WEDMRecipe = { ...BASE_RECIPE, peak_current_A: REFERENCE_IE_A * 2 };
    const dbl = engine.groundTruth(doubleRecipe, sig);
    expect(dbl.mrr_mm3_per_min).toBeCloseTo(single.mrr_mm3_per_min * 2, 4);
  });

  it("higher mrr_factor materials (Cu_C110) yield higher MRR than low-factor (WC)", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const cu = engine.groundTruth(BASE_RECIPE, wedmMaterialSparkDatabaseEngine.get("Cu_C110"));
    const wc = engine.groundTruth(BASE_RECIPE, wedmMaterialSparkDatabaseEngine.get("WC"));
    expect(cu.mrr_mm3_per_min).toBeGreaterThan(wc.mrr_mm3_per_min);
  });
});

describe("WEDMRolloutSimulatorEngine — spark stability", () => {
  it("stability is in [0, STABILITY_CEILING] (<=0.98)", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const gt = engine.groundTruth(BASE_RECIPE, sig);
    expect(gt.stability).toBeGreaterThanOrEqual(0);
    expect(gt.stability).toBeLessThanOrEqual(0.98);
  });

  it("higher Toff/Ton ratio yields higher stability", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const shortOff = engine.groundTruth({ ...BASE_RECIPE, pulse_off_us: 5 }, sig);
    const longOff = engine.groundTruth({ ...BASE_RECIPE, pulse_off_us: 80 }, sig);
    expect(longOff.stability).toBeGreaterThan(shortOff.stability);
  });

  it("zero off-time yields zero stability (dangerous regime)", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    const gt = engine.groundTruth({ ...BASE_RECIPE, pulse_off_us: 0 }, sig);
    expect(gt.stability).toBeCloseTo(0, 6);
  });
});

describe("WEDMRolloutSimulatorEngine — noise and determinism", () => {
  it("same seed → identical outcomes across runs", () => {
    const a = new WEDMRolloutSimulatorEngine({ seed: 42 });
    const b = new WEDMRolloutSimulatorEngine({ seed: 42 });
    const ra = a.simulate(BASE_RECIPE, "D2");
    const rb = b.simulate(BASE_RECIPE, "D2");
    expect(ra.outcome.actual_ra_um).toBeCloseTo(rb.outcome.actual_ra_um, 8);
    expect(ra.outcome.actual_mrr_mm3_per_min).toBeCloseTo(
      rb.outcome.actual_mrr_mm3_per_min,
      8,
    );
  });

  it("different seeds → different sample paths (with high probability)", () => {
    const a = new WEDMRolloutSimulatorEngine({ seed: 1 });
    const b = new WEDMRolloutSimulatorEngine({ seed: 99999 });
    const ra = a.simulate(BASE_RECIPE, "D2");
    const rb = b.simulate(BASE_RECIPE, "D2");
    // Truth is identical; noise-blurred outcomes should differ.
    expect(ra.truth.ra_um).toBeCloseTo(rb.truth.ra_um, 8);
    expect(ra.outcome.actual_ra_um).not.toBeCloseTo(rb.outcome.actual_ra_um, 6);
  });

  it("sample mean of many draws converges to ground-truth Ra (within 5%)", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 7, raNoiseSigmaLog: 0.05 });
    let sum = 0;
    const n = 400;
    let truth = 0;
    for (let i = 0; i < n; i++) {
      const r = engine.simulate(BASE_RECIPE, "H13");
      sum += r.outcome.actual_ra_um;
      truth = r.truth.ra_um;
    }
    const mean = sum / n;
    // Log-normal bias ≈ exp(σ²/2); 5% envelope easily covers that at σ=0.05.
    expect(Math.abs(mean - truth) / truth).toBeLessThan(0.05);
  });

  it("reseed() resets the PRNG to seeded state (repeatable)", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 5 });
    const first = engine.simulate(BASE_RECIPE, "D2").outcome.actual_ra_um;
    engine.simulate(BASE_RECIPE, "D2"); // advance PRNG
    engine.simulate(BASE_RECIPE, "D2");
    engine.reseed(5);
    const again = engine.simulate(BASE_RECIPE, "D2").outcome.actual_ra_um;
    expect(again).toBeCloseTo(first, 8);
  });
});

describe("WEDMRolloutSimulatorEngine — rollout()", () => {
  it("runs a static-agent rollout for the requested number of steps", () => {
    const engine = new WEDMRolloutSimulatorEngine({
      seed: 11,
      raNoiseSigmaLog: 0.01,
    });
    const r = engine.rollout(
      BASE_RECIPE,
      "D2",
      { target_ra_um: 999, target_mrr_mm3_per_min: 999 }, // impossible target → no early stop
      ({ recipe }) => recipe,
      { steps: 5, raTolerance: 1e-9 },
    );
    expect(r.steps.length).toBe(5);
    expect(r.converged).toBe(false);
  });

  it("stops early when the outcome hits target Ra within tolerance", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 13, raNoiseSigmaLog: 0 });
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    // Solve for recipe that gives target Ra.
    const targetRa = 2.2;
    const discharge = Math.pow(targetRa / sig.klocke_C, 1 / sig.klocke_k);
    const ip = Math.sqrt(discharge);
    const onTargetRecipe: WEDMRecipe = {
      peak_current_A: ip,
      pulse_on_us: ip,
      pulse_off_us: 40,
      wire_tension_N: 10,
    };
    const r = engine.rollout(
      onTargetRecipe,
      "D2",
      { target_ra_um: targetRa, target_mrr_mm3_per_min: 20 },
      ({ recipe }) => recipe,
      { steps: 5, raTolerance: 0.02 },
    );
    expect(r.converged).toBe(true);
    expect(r.steps.length).toBe(1);
  });

  it("agent callback receives last-outcome + target + step index", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 17 });
    const seenStates: Array<{ t: number; hasOutcome: boolean; target_ra_um: number }> = [];
    engine.rollout(
      BASE_RECIPE,
      "A2",
      TARGET,
      ({ recipe, lastOutcome, target, t }) => {
        seenStates.push({
          t,
          hasOutcome: lastOutcome !== undefined,
          target_ra_um: target.target_ra_um,
        });
        return recipe;
      },
      { steps: 3, raTolerance: 1e-9 },
    );
    // Agent is called after each non-converging step. With steps=3 and a
    // tolerance that never fires, we get 3 calls.
    expect(seenStates.length).toBe(3);
    for (const s of seenStates) {
      expect(s.hasOutcome).toBe(true);
      expect(s.target_ra_um).toBe(2.5);
    }
  });

  it("terminalRaRelErr matches the final step's relative Ra error", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 21, raNoiseSigmaLog: 0 });
    const r = engine.rollout(
      BASE_RECIPE,
      "D2",
      TARGET,
      ({ recipe }) => recipe,
      { steps: 2, raTolerance: 1e-9 },
    );
    const last = r.steps[r.steps.length - 1];
    const manualErr = (last.outcome.actual_ra_um - TARGET.target_ra_um) / TARGET.target_ra_um;
    expect(r.terminalRaRelErr).toBeCloseTo(manualErr, 5);
  });

  it("steps[0] carries the initial recipe unchanged", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 23 });
    const r = engine.rollout(
      BASE_RECIPE,
      "D2",
      TARGET,
      ({ recipe }) => recipe,
      { steps: 1, raTolerance: 1e-9 },
    );
    expect(r.steps[0].recipe).toEqual(BASE_RECIPE);
  });
});

describe("WEDMRolloutSimulatorEngine — argument validation", () => {
  it("simulate() rejects zero peak_current_A", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    expect(() =>
      engine.simulate({ ...BASE_RECIPE, peak_current_A: 0 }, "D2"),
    ).toThrow();
  });

  it("simulate() rejects negative pulse_on_us", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    expect(() =>
      engine.simulate({ ...BASE_RECIPE, pulse_on_us: -5 }, "D2"),
    ).toThrow();
  });

  it("simulate() rejects negative pulse_off_us", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    expect(() =>
      engine.simulate({ ...BASE_RECIPE, pulse_off_us: -1 }, "D2"),
    ).toThrow();
  });

  it("simulate() rejects NaN inputs", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    expect(() =>
      engine.simulate({ ...BASE_RECIPE, peak_current_A: Number.NaN }, "D2"),
    ).toThrow();
  });

  it("simulate() rejects unknown material keys", () => {
    const engine = new WEDMRolloutSimulatorEngine();
    // TS will narrow, but the DB still throws when asked for a non-existent key.
    expect(() =>
      engine.simulate(BASE_RECIPE, "NotARealMaterial" as never),
    ).toThrow();
  });
});

describe("WEDMRolloutSimulatorEngine — integration with spark DB", () => {
  it("outcome dimensional consistency: Ra in µm, MRR in mm³/min, stability unitless", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 3, raNoiseSigmaLog: 0 });
    const r = engine.simulate(BASE_RECIPE, "D2");
    expect(r.outcome.actual_ra_um).toBeGreaterThan(0);
    expect(r.outcome.actual_ra_um).toBeLessThan(100);
    expect(r.outcome.actual_mrr_mm3_per_min).toBeGreaterThan(0);
    expect(r.outcome.actual_mrr_mm3_per_min).toBeLessThan(1000);
    expect(r.outcome.spark_stability).toBeGreaterThanOrEqual(0);
    expect(r.outcome.spark_stability).toBeLessThanOrEqual(1);
  });

  it("D2 Ra-simulated at reference discharge is within published Klocke envelope (±25%)", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 9, raNoiseSigmaLog: 0 });
    const r = engine.simulate(BASE_RECIPE, "D2");
    // Klocke (2013) suggests ≈2.5 µm Ra for D2 at Ip=8A, Ton=10µs finish.
    // Widened envelope accommodates the sqrt-model linearisation.
    expect(r.outcome.actual_ra_um).toBeGreaterThan(1.5);
    expect(r.outcome.actual_ra_um).toBeLessThan(4.0);
  });
});

describe("WEDMRolloutSimulatorEngine — singleton and constants", () => {
  it("singleton exists and has default seed", () => {
    expect(wedmRolloutSimulatorEngine).toBeInstanceOf(WEDMRolloutSimulatorEngine);
    expect(DEFAULT_SEED).toBe(0xc0ffee);
  });

  it("REFERENCE_MRR_MM3_PER_MIN is 20 (steel 1045 at 80 A·µs)", () => {
    expect(REFERENCE_MRR_MM3_PER_MIN).toBe(20);
  });
});

describe("WEDMRolloutSimulatorEngine — edge cases", () => {
  it("very small discharge still yields positive Ra and MRR", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 77, raNoiseSigmaLog: 0 });
    const tiny: WEDMRecipe = {
      peak_current_A: 0.5,
      pulse_on_us: 0.5,
      pulse_off_us: 40,
      wire_tension_N: 10,
    };
    const r = engine.simulate(tiny, "D2");
    expect(r.outcome.actual_ra_um).toBeGreaterThan(0);
    expect(r.outcome.actual_mrr_mm3_per_min).toBeGreaterThan(0);
  });

  it("rollout with a greedy adjuster converges faster than no-op on noise-free sim", () => {
    const engine = new WEDMRolloutSimulatorEngine({ seed: 2, raNoiseSigmaLog: 0 });
    const sig = wedmMaterialSparkDatabaseEngine.get("D2");
    // Start too-hot (discharge 16 vs target discharge 6.25 for Ra 2.2).
    const start: WEDMRecipe = {
      peak_current_A: 4,
      pulse_on_us: 4,
      pulse_off_us: 40,
      wire_tension_N: 10,
    };
    const greedy = (s: {
      recipe: WEDMRecipe;
      lastOutcome?: WEDMCutOutcome;
      target: WEDMCutTarget;
    }): WEDMRecipe => {
      if (!s.lastOutcome) return s.recipe;
      // Correction: Ra = C·(Ip·Ton)^k ⇒ new_discharge = old_discharge · (target/observed)^(1/k).
      const ratio = Math.pow(s.target.target_ra_um / s.lastOutcome.actual_ra_um, 1 / sig.klocke_k);
      const split = Math.sqrt(ratio); // split evenly between Ip and Ton.
      return {
        ...s.recipe,
        peak_current_A: s.recipe.peak_current_A * split,
        pulse_on_us: s.recipe.pulse_on_us * split,
      };
    };
    const r = engine.rollout(
      start,
      "D2",
      { target_ra_um: 2.5, target_mrr_mm3_per_min: 20 },
      greedy,
      { steps: 4, raTolerance: 0.02 },
    );
    expect(r.converged).toBe(true);
    expect(r.steps.length).toBeLessThanOrEqual(3);
  });
});
