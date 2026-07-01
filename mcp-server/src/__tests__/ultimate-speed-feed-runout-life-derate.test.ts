/**
 * Runout / TIR tool-life DERATE wiring (U-OSC-RUNOUT-LIFE-DERATE, FIX-3)
 * =====================================================================
 * Before this fix, UltimateSpeedFeedEngine computed `runout.life_reduction_pct` and printed a
 * warning ("TIR reduces tool life by ~40%") but the headline `tool_life.life_minutes` AND
 * `tool_life.cost_per_part` reported the UN-derated life -- the number contradicted the warning.
 * The advisory `runout_impact.*` fields moved; the load-bearing life/cost did not.
 *
 * FIX-3 folds the runout derate into `toolLife` itself (a single multiplicative factor applied
 * once, before any consumer), so ALL tool-life consumers agree:
 *   tool_life.life_minutes (headline) · tool_life.cost_per_part · three-zone wear · Monte-Carlo CV.
 *
 * R9 intent (these FAIL if the derate is reverted):
 *  1. Runout LOWERS the headline tool_life (not just the advisory field).
 *  2. The derated life is SELF-CONSISTENT with the reported life_reduction_pct (warning == number).
 *  3. cost_per_part RISES with runout -- proves the ordering fix: costPerPart is computed BEFORE
 *     the original runout block, so a higher cost proves it now sees the derated life.
 *  4. Derate is CONSERVATIVE-bounded: life stays strictly positive (reduction capped at 80%).
 *  5. Backward-compatible: no TIR inputs == no derate == deterministic undegraded baseline.
 */

import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

// Shared cut + economics. cutting_time_per_part_min:1 makes floor(life/cycle)=floor(life), so a
// derated (shorter) life strictly lowers floor(life) and thus strictly raises cost/part -- a
// rounding-robust way to prove costPerPart consumed the derated life.
const CUT = {
  material: "steel" as const,
  tool_diameter_mm: 12,
  flutes: 4,
  cut_type: "roughing" as const,
  tool_cost_usd: 1000,
  cutting_time_per_part_min: 1,
};
// Realistic-but-meaningful TIR: ~27um RSS over ~0.1mm fz -> ~11% life reduction.
const TIR = { spindle_runout_mm: 0.010, holder_runout_mm: 0.015, tool_runout_mm: 0.020 };

describe("runout tool-life derate (U-OSC-RUNOUT-LIFE-DERATE / FIX-3)", () => {
  const base = ultimateSpeedFeedEngine.calculate({ ...CUT });
  const withRunout = ultimateSpeedFeedEngine.calculate({ ...CUT, ...TIR });

  it("a meaningful runout reduction is actually reported (guards the rest of the suite)", () => {
    expect(withRunout.runout_impact!.total_tir_mm.value).toBeGreaterThan(0.02);
    expect(withRunout.runout_impact!.life_reduction_pct.value).toBeGreaterThan(2);
    expect(withRunout.runout_impact!.life_reduction_pct.value).toBeLessThanOrEqual(80);
    // The min(Taylor,wear,thermal) core is identical between the two calls (runout does not touch
    // Vc/Taylor/wear/thermal), so any life delta is the derate alone.
    expect(withRunout.cutting_speed.value).toBeCloseTo(base.cutting_speed.value, 6);
  });

  it("derate LOWERS the headline tool_life (not just the advisory runout_impact field)", () => {
    expect(withRunout.tool_life.life_minutes.value).toBeLessThan(base.tool_life.life_minutes.value);
  });

  it("derated life is SELF-CONSISTENT with reported life_reduction_pct (warning == number)", () => {
    const ratio = withRunout.tool_life.life_minutes.value / base.tool_life.life_minutes.value;
    const expectedFactor = 1 - withRunout.runout_impact!.life_reduction_pct.value / 100;
    // toBeCloseTo(.,1) = within 0.05; on revert ratio==1.0 is ~0.11 off -> fails.
    expect(ratio).toBeCloseTo(expectedFactor, 1);
    expect(ratio).toBeLessThan(0.97); // strictly below 1 -> derate is live
  });

  it("cost_per_part RISES with runout -- proves costPerPart sees the derated life (ordering fix)", () => {
    const baseCost = base.tool_life.cost_per_part!.value;
    const runoutCost = withRunout.tool_life.cost_per_part!.value;
    expect(baseCost).toBeGreaterThan(0);
    expect(runoutCost).toBeGreaterThan(baseCost);
  });

  it("derate is conservative-bounded: life stays strictly positive at extreme TIR (factor >= 0.2)", () => {
    const extreme = ultimateSpeedFeedEngine.calculate({
      ...CUT,
      spindle_runout_mm: 0.05, holder_runout_mm: 0.05, tool_runout_mm: 0.05,
    });
    expect(extreme.runout_impact!.life_reduction_pct.value).toBeLessThanOrEqual(80);
    expect(extreme.tool_life.life_minutes.value).toBeGreaterThan(0);
    // factor floored at 0.2 (80% cap), so the derated life never collapses below ~20% of base.
    expect(extreme.tool_life.life_minutes.value).toBeGreaterThanOrEqual(base.tool_life.life_minutes.value * 0.19);
  });

  it("backward-compatible: identical no-TIR inputs are deterministic + undegraded (no-op derate path)", () => {
    const base2 = ultimateSpeedFeedEngine.calculate({ ...CUT });
    expect(base.tool_life.life_minutes.value).toBeGreaterThan(0);
    // No-TIR path applies factor 1 (no derate) and is deterministic across identical calls...
    expect(base.tool_life.life_minutes.value).toBe(base2.tool_life.life_minutes.value);
    // ...and is strictly higher than the same cut WITH runout (proves the no-op leaves life intact).
    expect(base.tool_life.life_minutes.value).toBeGreaterThan(withRunout.tool_life.life_minutes.value);
  });
});
