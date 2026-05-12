/**
 * CuttingFluidLifecycleEngine Tests
 * Tests Monod bacterial growth, concentration decay, tramp oil, pH drift,
 * and replacement interval optimization.
 */
import { describe, it, expect } from "vitest";
import {
  cuttingFluidLifecycleEngine,
  CuttingFluidLifecycleEngine,
} from "../engines/CuttingFluidLifecycleEngine.js";
import type { CoolantLifecycleInput } from "../engines/CuttingFluidLifecycleEngine.js";

const engine = cuttingFluidLifecycleEngine;

// ── Monod growth rate ───────────────────────────────────────────────────
describe("monodGrowthRate", () => {
  it("returns 0 for zero substrate", () => {
    expect(engine.monodGrowthRate(0.3, 0, 3)).toBe(0);
  });

  it("approaches µ_max at high substrate", () => {
    const mu = engine.monodGrowthRate(0.3, 100, 3);
    expect(mu).toBeCloseTo(0.3, 1);
  });

  it("returns µ_max/2 at substrate = K_s", () => {
    const mu = engine.monodGrowthRate(0.3, 3, 3);
    expect(mu).toBeCloseTo(0.15, 5);
  });

  it("increases monotonically with substrate", () => {
    const m1 = engine.monodGrowthRate(0.3, 1, 3);
    const m2 = engine.monodGrowthRate(0.3, 5, 3);
    const m3 = engine.monodGrowthRate(0.3, 20, 3);
    expect(m2).toBeGreaterThan(m1);
    expect(m3).toBeGreaterThan(m2);
  });
});

// ── Bacteria step ───────────────────────────────────────────────────────
describe("bacteriaStep", () => {
  it("grows when growth > death", () => {
    const next = engine.bacteriaStep(1000, 0.3, 0.05, 1);
    expect(next).toBeGreaterThan(1000);
  });

  it("declines when death > growth", () => {
    const next = engine.bacteriaStep(1000, 0.01, 0.3, 1);
    expect(next).toBeLessThan(1000);
  });

  it("clamps to 0 minimum", () => {
    const next = engine.bacteriaStep(10, 0.0, 5.0, 1);
    expect(next).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 1e9 maximum", () => {
    const next = engine.bacteriaStep(9e8, 0.5, 0, 1);
    expect(next).toBeLessThanOrEqual(1e9);
  });
});

// ── Concentration step ──────────────────────────────────────────────────
describe("concentrationStep", () => {
  it("decays concentration over time", () => {
    const { concentration } = engine.concentrationStep(8, 0.015, 0.008, 200, 8, 1);
    expect(concentration).toBeLessThan(8);
  });

  it("triggers makeup when below 90% target", () => {
    const { concentration, makeup_L } = engine.concentrationStep(5, 0.1, 0.1, 200, 8, 1);
    // 5 * exp(-0.2) ≈ 4.09, which is < 8*0.9=7.2 → makeup triggers
    expect(makeup_L).toBeGreaterThan(0);
    expect(concentration).toBeCloseTo(8, 0); // restored to target
  });

  it("no makeup when concentration is healthy", () => {
    const { makeup_L } = engine.concentrationStep(8, 0.001, 0.001, 200, 8, 1);
    expect(makeup_L).toBe(0);
  });
});

// ── Tramp oil step ──────────────────────────────────────────────────────
describe("trampOilStep", () => {
  it("accumulates without skimmer", () => {
    const next = engine.trampOilStep(0, 1.0, 200, 16, false, 1);
    expect(next).toBeGreaterThan(0);
  });

  it("skimmer reduces oil level", () => {
    const withSkimmer = engine.trampOilStep(2.0, 0.5, 200, 16, true, 1);
    const noSkimmer = engine.trampOilStep(2.0, 0.5, 200, 16, false, 1);
    expect(withSkimmer).toBeLessThan(noSkimmer);
  });

  it("never goes negative", () => {
    const next = engine.trampOilStep(0, 0, 200, 16, true, 1);
    expect(next).toBeGreaterThanOrEqual(0);
  });
});

// ── pH from bacteria ────────────────────────────────────────────────────
describe("pHFromBacteria", () => {
  it("stays near initial with low bacteria", () => {
    const pH = engine.pHFromBacteria(9.2, 100, 0.6);
    expect(pH).toBeGreaterThan(9.0);
  });

  it("drops significantly with high bacteria", () => {
    const pH = engine.pHFromBacteria(9.2, 1e6, 0.6);
    expect(pH).toBeLessThan(9.0);
  });

  it("higher buffer capacity resists pH drop", () => {
    const pHLow = engine.pHFromBacteria(9.2, 1e5, 0.4);
    const pHHigh = engine.pHFromBacteria(9.2, 1e5, 0.8);
    expect(pHHigh).toBeGreaterThan(pHLow);
  });

  it("clamps to minimum pH 4.0", () => {
    const pH = engine.pHFromBacteria(9.0, 1e9, 0.1);
    expect(pH).toBeGreaterThanOrEqual(4.0);
  });
});

// ── Health classification ───────────────────────────────────────────────
describe("classifyHealth", () => {
  it("good when all params in range", () => {
    expect(engine.classifyHealth(7, 6, 10, 500, 0.5, 3, 9.0)).toBe("good");
  });

  it("acceptable for minor deviations", () => {
    expect(engine.classifyHealth(5.5, 6, 10, 5e4, 1, 3, 8.8)).toBe("acceptable");
  });

  it("warning for moderate issues", () => {
    // conc low (+1), bacteria moderate (+2), tramp ok (0), pH ok (0) = 3 → warning
    expect(engine.classifyHealth(5, 6, 10, 2e5, 1, 3, 9.0)).toBe("warning");
  });

  it("critical for severe degradation", () => {
    expect(engine.classifyHealth(3, 6, 10, 2e6, 5, 3, 7.0)).toBe("critical");
  });

  it("critical when pH drops below 7.5", () => {
    // pH<7.5 alone = +3, bacteria 2e6 = +3 → critical
    expect(engine.classifyHealth(7, 6, 10, 2e6, 0, 3, 7.0)).toBe("critical");
  });
});

// ── Full simulation ─────────────────────────────────────────────────────
describe("simulate", () => {
  const baseInput: CoolantLifecycleInput = {
    initial_concentration_pct: 8,
    sump_volume_L: 200,
    coolant_type: "semisynthetic",
    horizon_days: 30,
  };

  it("returns complete result structure", () => {
    const result = engine.simulate(baseInput);
    expect(result.daily_states).toHaveLength(30);
    expect(result.optimal_change_interval_days).toBeGreaterThan(0);
    expect(result.total_cost_per_day).toBeGreaterThan(0);
    expect(result.formula).toContain("Monod");
    expect(result.formula).toContain("TCO");
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("bacteria grow over time without biocide", () => {
    const result = engine.simulate({ ...baseInput, biocide_applied: false, horizon_days: 60 });
    const day1 = result.daily_states[0];
    const day60 = result.daily_states[59];
    expect(day60.bacteria_cfu_mL).toBeGreaterThan(day1.bacteria_cfu_mL);
  });

  it("biocide suppresses bacterial growth", () => {
    const noBio = engine.simulate({ ...baseInput, biocide_applied: false, horizon_days: 60 });
    const withBio = engine.simulate({ ...baseInput, biocide_applied: true, horizon_days: 60 });
    const noBioLast = noBio.daily_states[59].bacteria_cfu_mL;
    const withBioLast = withBio.daily_states[59].bacteria_cfu_mL;
    expect(withBioLast).toBeLessThan(noBioLast);
  });

  it("tramp oil accumulates without skimmer", () => {
    const result = engine.simulate({
      ...baseInput, tramp_oil_rate_mL_hr: 2, skimmer_present: false,
    });
    const last = result.daily_states[result.daily_states.length - 1];
    expect(last.tramp_oil_pct).toBeGreaterThan(0);
  });

  it("skimmer reduces tramp oil accumulation", () => {
    const noSkim = engine.simulate({
      ...baseInput, tramp_oil_rate_mL_hr: 2, skimmer_present: false,
    });
    const withSkim = engine.simulate({
      ...baseInput, tramp_oil_rate_mL_hr: 2, skimmer_present: true,
    });
    const noSkimOil = noSkim.daily_states[29].tramp_oil_pct;
    const withSkimOil = withSkim.daily_states[29].tramp_oil_pct;
    expect(withSkimOil).toBeLessThan(noSkimOil);
  });

  it("high temperature accelerates degradation", () => {
    const cool = engine.simulate({ ...baseInput, ambient_temp_C: 18, horizon_days: 60 });
    const hot = engine.simulate({ ...baseInput, ambient_temp_C: 35, horizon_days: 60 });
    const coolBac = cool.daily_states[59].bacteria_cfu_mL;
    const hotBac = hot.daily_states[59].bacteria_cfu_mL;
    expect(hotBac).toBeGreaterThan(coolBac);
  });

  it("warns on hard water", () => {
    const result = engine.simulate({ ...baseInput, water_hardness_ppm: 400 });
    expect(result.warnings.some(w => w.includes("Hard water"))).toBe(true);
  });

  it("warns on soft water", () => {
    const result = engine.simulate({ ...baseInput, water_hardness_ppm: 30 });
    expect(result.warnings.some(w => w.includes("Soft water"))).toBe(true);
  });

  it("warns on high tramp oil without skimmer", () => {
    const result = engine.simulate({
      ...baseInput, tramp_oil_rate_mL_hr: 3, skimmer_present: false,
    });
    expect(result.warnings.some(w => w.includes("skimmer"))).toBe(true);
  });

  it("works for all 4 coolant types", () => {
    const types = ["semisynthetic", "synthetic", "soluble_oil", "straight_oil"] as const;
    for (const ct of types) {
      const result = engine.simulate({ ...baseInput, coolant_type: ct });
      expect(result.daily_states.length).toBe(30);
      expect(result.optimal_change_interval_days).toBeGreaterThan(0);
    }
  });

  it("synthetic degrades slower than soluble oil", () => {
    const syn = engine.simulate({
      ...baseInput, coolant_type: "synthetic", horizon_days: 60,
    });
    const sol = engine.simulate({
      ...baseInput, coolant_type: "soluble_oil", horizon_days: 60,
    });
    const synBac = syn.daily_states[59].bacteria_cfu_mL;
    const solBac = sol.daily_states[59].bacteria_cfu_mL;
    expect(synBac).toBeLessThan(solBac);
  });

  it("pH drops as bacteria grow", () => {
    const result = engine.simulate({ ...baseInput, horizon_days: 90 });
    const firstPH = result.daily_states[0].pH;
    const lastPH = result.daily_states[89].pH;
    expect(lastPH).toBeLessThanOrEqual(firstPH);
  });

  it("daily states have monotonically increasing day numbers", () => {
    const result = engine.simulate(baseInput);
    for (let i = 1; i < result.daily_states.length; i++) {
      expect(result.daily_states[i].day).toBe(result.daily_states[i - 1].day + 1);
    }
  });

  it("cost breakdown sums approximately to total", () => {
    const result = engine.simulate(baseInput);
    const sum = result.fluid_cost_per_day + result.disposal_cost_per_day + result.downtime_cost_per_day;
    expect(result.total_cost_per_day).toBeCloseTo(sum, 0);
  });

  it("makeup volume is reasonable", () => {
    const result = engine.simulate(baseInput);
    // Should not need more than 10% of sump volume per day
    expect(result.makeup_volume_L_per_day).toBeLessThan(baseInput.sump_volume_L * 0.1);
  });
});

// ── Module exports ──────────────────────────────────────────────────────
describe("module exports", () => {
  it("exports singleton instance", () => {
    expect(cuttingFluidLifecycleEngine).toBeInstanceOf(CuttingFluidLifecycleEngine);
  });
});
