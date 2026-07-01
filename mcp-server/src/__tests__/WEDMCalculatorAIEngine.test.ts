/**
 * WEDMCalculatorAIEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-WEDM-CUTTIME-FABRICATION).
 *
 * The engine/algo/formula audit (iter 8) found `calculatePassParameters` hardcoded
 * `pathLength = 100; // placeholder`, so EVERY passes[].cutting_time_min and the shipped
 * predicted_cycle_time_min were computed from a fabricated 100mm path -- a real fabricated-output
 * defect feeding WEDM quotes. Fix: accept an optional, additive `cut_length_mm`; when supplied the
 * cut/cycle time is REAL; when omitted it falls back to a NAMED default and is flagged as a
 * low-confidence ESTIMATE (warning + cycle_time_confidence lowered) -- it never silently fabricates.
 *
 * cutting_time = pathLength / feed, and feed depends only on thickness/material/pass (NOT cut length),
 * so cutting_time scales EXACTLY linearly with cut_length_mm -- the load-bearing R9 invariant here.
 */
import { describe, it, expect } from "vitest";

import { wedmCalculatorAIEngine } from "../engines/WEDMCalculatorAIEngine.js";
import type { WEDMCalcInput } from "../engines/WEDMCalculatorAIEngine.js";

function input(extra: Partial<WEDMCalcInput> = {}): WEDMCalcInput {
  return {
    material: { name: "D2 cold-work tool steel", iso_group: "P", hardness_hrc: 58 },
    thickness_mm: 25,
    target_ra_um: 1.6,
    priority: "balanced",
    ...extra,
  };
}

const hasEstimateWarning = (r: { warnings: string[] }) =>
  r.warnings.some((w) => /ESTIMATE/i.test(w) && /cut_length_mm/.test(w));

describe("WEDMCalculatorAIEngine cut-time fabrication fix", () => {
  it("flags an ESTIMATE (warning + low confidence) when cut_length_mm is omitted", async () => {
    const r = await wedmCalculatorAIEngine.calculate(input());
    expect(r.cycle_time_confidence).toBe(0.35);
    expect(hasEstimateWarning(r)).toBe(true);
    expect(r.predicted_cycle_time_min).toBeGreaterThan(0);
  });

  it("reports HIGH confidence + NO estimate warning when cut_length_mm is supplied", async () => {
    const r = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 500 }));
    expect(r.cycle_time_confidence).toBe(0.85);
    expect(hasEstimateWarning(r)).toBe(false);
  });

  it("uses the REAL cut length: cutting_time scales linearly with cut_length_mm (the fix)", async () => {
    const r100 = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 100 }));
    const r500 = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 500 }));
    expect(r100.passes.length).toBe(r500.passes.length);
    // feed is identical for identical inputs, so cutting_time(500) == 5 * cutting_time(100) per pass.
    for (let i = 0; i < r100.passes.length; i++) {
      expect(r500.passes[i].cutting_time_min).toBeCloseTo(5 * r100.passes[i].cutting_time_min, 1);
    }
  });

  it("a longer real cut yields a strictly longer predicted cycle time", async () => {
    const r500 = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 500 }));
    const r1000 = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 1000 }));
    expect(r1000.predicted_cycle_time_min).toBeGreaterThan(r500.predicted_cycle_time_min);
  });

  it("a supplied 500mm cut produces a LONGER cycle time than the 100mm-default estimate", async () => {
    const rDefault = await wedmCalculatorAIEngine.calculate(input());
    const r500 = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 500 }));
    // default fallback assumes 100mm; a real 500mm cut must be longer (proves the fallback is not used when supplied)
    expect(r500.predicted_cycle_time_min).toBeGreaterThan(rDefault.predicted_cycle_time_min);
  });

  it("treats cut_length_mm <= 0 as absent (estimate path) -- never divides by a bad length", async () => {
    const rZero = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 0 }));
    const rNeg = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: -50 }));
    for (const r of [rZero, rNeg]) {
      expect(r.cycle_time_confidence).toBe(0.35);
      expect(hasEstimateWarning(r)).toBe(true);
      expect(r.predicted_cycle_time_min).toBeGreaterThan(0);
      expect(Number.isFinite(r.predicted_cycle_time_min)).toBe(true);
    }
  });

  it("the 0/negative cut_length matches the default-omitted estimate (both use the fallback)", async () => {
    const rDefault = await wedmCalculatorAIEngine.calculate(input());
    const rZero = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 0 }));
    expect(rZero.predicted_cycle_time_min).toBeCloseTo(rDefault.predicted_cycle_time_min, 5);
  });

  it("every pass cutting_time is finite and positive for a real cut length", async () => {
    const r = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 250 }));
    expect(r.passes.length).toBeGreaterThan(0);
    for (const p of r.passes) {
      expect(Number.isFinite(p.cutting_time_min)).toBe(true);
      expect(p.cutting_time_min).toBeGreaterThan(0);
    }
  });

  it("predicted_cycle_time_min equals sum(cutting) + threading + dwell (consistent aggregate)", async () => {
    const r = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 300 }));
    const sumCutting = r.passes.reduce((s, p) => s + p.cutting_time_min, 0);
    // estimateCycleTime adds threadingTime (0.75) + 0.5 dwell to the summed cutting time.
    expect(r.predicted_cycle_time_min).toBeCloseTo(Math.round((sumCutting + 0.75 + 0.5) * 100) / 100, 1);
  });

  it("does not regress other WEDM outputs (passes, wire, ra still populated)", async () => {
    const r = await wedmCalculatorAIEngine.calculate(input({ cut_length_mm: 400 }));
    expect(r.wire_type.length).toBeGreaterThan(0);
    expect(r.num_passes).toBe(r.passes.length);
    expect(r.predicted_ra_um).toBeGreaterThan(0);
    expect(r.wire_consumption_m).toBeGreaterThanOrEqual(0);
  });
});
