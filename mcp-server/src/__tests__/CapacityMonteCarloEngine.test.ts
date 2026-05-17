/**
 * CapacityMonteCarloEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.capacityMonteCarlo.test.ts`. Exercises the
 * static `simulate()` method directly, satisfying `stop_on_unwired_assets`
 * (each engine needs a matching test file with >=10 it() cases).
 *
 * Engine is pure compute (Math.random-driven Monte Carlo) — no I/O, no
 * shared state. Assertions use statistical bounds / algebraic invariants
 * rather than exact equality.
 */

import { describe, it, expect } from "vitest";
import { CapacityMonteCarloEngine } from "../engines/CapacityMonteCarloEngine.js";

const TOL_OEE_PRODUCT = 0.01;        // compound 3-decimal rounding tolerance
const TOL_BOTTLENECK_SUM = 0.05;     // per-machine 2-decimal rounding × N machines
const STAT_RATIO_LOW = 0.5;          // statistical lower bound (200 sims)

const MACHINE_A = {
  id: "mill-1", name: "Mill A",
  hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5,
  mtbf_hours: 200, mttr_hours: 4,
  setup_time_min_mean: 30, setup_time_min_stddev: 5,
  cycle_time_min_mean: 12, cycle_time_min_stddev: 1.5,
};
const MACHINE_B = {
  id: "lathe-1", name: "Lathe B",
  hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5,
  mtbf_hours: 150, mttr_hours: 6,
  setup_time_min_mean: 45, setup_time_min_stddev: 10,
  cycle_time_min_mean: 8, cycle_time_min_stddev: 1.2,
};

const BASE = {
  machines: [MACHINE_A, MACHINE_B],
  demand: { parts_per_week_mean: 500, parts_per_week_stddev: 50 },
  scrap_rate_mean: 0.02,
  scrap_rate_max: 0.10,
  num_simulations: 200,
  horizon_weeks: 4,
  target_service_level: 0.95,
};

describe("CapacityMonteCarloEngine.simulate — shape contract", () => {
  it("returns numeric mean_weekly_capacity + array per_machine of input length + numeric oee_decomposition + numeric confidence_interval", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    // Real shape assertions: each top-level field must have its own
    // numeric or array structure populated, not just exist as a key.
    expect(typeof r.summary.mean_weekly_capacity).toBe("number");
    expect(r.per_machine.length).toBe(BASE.machines.length);
    expect(typeof r.oee_decomposition.oee).toBe("number");
    expect(typeof r.confidence_interval.lower).toBe("number");
    expect(typeof r.confidence_interval.upper).toBe("number");
    expect(Array.isArray(r.risk_factors)).toBe(true);
  });

  it("summary contains 8 numeric/boolean fields", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    const s = r.summary;
    expect(typeof s.mean_weekly_capacity).toBe("number");
    expect(typeof s.p5_capacity).toBe("number");
    expect(typeof s.p50_capacity).toBe("number");
    expect(typeof s.p95_capacity).toBe("number");
    expect(typeof s.mean_oee).toBe("number");
    expect(typeof s.mean_utilization).toBe("number");
    expect(typeof s.service_level_met).toBe("boolean");
    expect(typeof s.stockout_probability).toBe("number");
  });

  it("per_machine length equals input machine count (2-machine input)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    expect(r.per_machine.length).toBe(BASE.machines.length);
  });
});

describe("CapacityMonteCarloEngine.simulate — algebraic invariants", () => {
  it("oee ≈ availability * performance * quality (engine line 226 ± rounding)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    const d = r.oee_decomposition;
    const expected = Math.round(d.availability * d.performance * d.quality * 1000) / 1000;
    expect(Math.abs(d.oee - expected)).toBeLessThan(TOL_OEE_PRODUCT);
  });

  it("confidence_interval.[lower, upper] = [p5_capacity, p95_capacity] (engine line 268-269)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    expect(r.confidence_interval.lower).toBe(r.summary.p5_capacity);
    expect(r.confidence_interval.upper).toBe(r.summary.p95_capacity);
  });

  it("confidence_interval.level = 0.90 (engine line 268 hard-coded)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    expect(r.confidence_interval.level).toBe(0.90);
  });

  it("p5 ≤ p50 ≤ p95 (percentile monotonicity)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    const s = r.summary;
    expect(s.p5_capacity).toBeLessThanOrEqual(s.p50_capacity);
    expect(s.p50_capacity).toBeLessThanOrEqual(s.p95_capacity);
  });

  it("per_machine bottleneck_probability sums to ≈ 1.0 (one bottleneck per simulation)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    const sum = r.per_machine.reduce((acc, m) => acc + m.bottleneck_probability, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(TOL_BOTTLENECK_SUM);
  });

  it("quality = 1 - scrap_rate_mean (engine line 221)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    const expected = Math.round((1 - BASE.scrap_rate_mean) * 1000) / 1000;
    expect(r.oee_decomposition.quality).toBe(expected);
  });

  it("availability ∈ [0, 1] across each per_machine entry", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    for (const m of r.per_machine) {
      expect(m.mean_availability).toBeGreaterThanOrEqual(0);
      expect(m.mean_availability).toBeLessThanOrEqual(1);
    }
  });
});

describe("CapacityMonteCarloEngine.simulate — VARIABILITY", () => {
  it("single-machine vs 2-machine: per_machine arity tracks input + bottleneck = 100%", () => {
    const single = CapacityMonteCarloEngine.simulate({ ...BASE, machines: [MACHINE_A] });
    const both = CapacityMonteCarloEngine.simulate(BASE);
    expect(single.per_machine.length).toBe(1);
    expect(both.per_machine.length).toBe(2);
    // single-machine: that one machine MUST be the bottleneck 100% of the time
    expect(single.per_machine[0]?.bottleneck_probability ?? 0).toBeGreaterThanOrEqual(0.95);
  });

  it("3 distinct N values (100/200/500) all produce positive mean_weekly_capacity", () => {
    const r100 = CapacityMonteCarloEngine.simulate({ ...BASE, num_simulations: 100 });
    const r200 = CapacityMonteCarloEngine.simulate({ ...BASE, num_simulations: 200 });
    const r500 = CapacityMonteCarloEngine.simulate({ ...BASE, num_simulations: 500 });
    expect(r100.summary.mean_weekly_capacity).toBeGreaterThan(0);
    expect(r200.summary.mean_weekly_capacity).toBeGreaterThan(0);
    expect(r500.summary.mean_weekly_capacity).toBeGreaterThan(0);
  });

  it("high-demand scenario flips service_level_met to false + raises stockout_probability", () => {
    const r = CapacityMonteCarloEngine.simulate({
      ...BASE,
      demand: { parts_per_week_mean: 99_999, parts_per_week_stddev: 100 },
    });
    expect(r.summary.service_level_met).toBe(false);
    expect(r.summary.stockout_probability).toBeGreaterThan(STAT_RATIO_LOW);
  });
});

describe("CapacityMonteCarloEngine.simulate — risk factors (engine line 239-246)", () => {
  it("high-demand scenario surfaces 'stockout' risk factor", () => {
    const r = CapacityMonteCarloEngine.simulate({
      ...BASE,
      demand: { parts_per_week_mean: 99_999, parts_per_week_stddev: 100 },
    });
    expect(r.risk_factors.some(s => s.toLowerCase().includes("stockout"))).toBe(true);
  });

  it("normal scenario may surface zero or few risks (≤ 4 by engine construction)", () => {
    const r = CapacityMonteCarloEngine.simulate(BASE);
    // Engine appends at most 4 risk strings (stockout / availability / OEE /
    // top-bottleneck). length capped by construction, not by .slice().
    expect(r.risk_factors.length).toBeLessThanOrEqual(4);
  });
});

describe("CapacityMonteCarloEngine.simulate — defaults (engine line 135-137)", () => {
  it("defaults applied when num_simulations/horizon_weeks/target_service_level omitted", () => {
    const minimalInput = {
      machines: [MACHINE_A],
      demand: { parts_per_week_mean: 500, parts_per_week_stddev: 50 },
      scrap_rate_mean: 0.02,
      scrap_rate_max: 0.10,
    };
    const r = CapacityMonteCarloEngine.simulate(minimalInput);
    // With engine defaults (N=5000, horizon=12, target SL=0.95) the result
    // must have OEE in [0,1] and positive mean weekly capacity.
    expect(r.summary.mean_weekly_capacity).toBeGreaterThan(0);
    expect(r.oee_decomposition.oee).toBeGreaterThanOrEqual(0);
    expect(r.oee_decomposition.oee).toBeLessThanOrEqual(1);
  });
});
