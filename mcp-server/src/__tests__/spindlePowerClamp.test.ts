/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-SPINDLE-POWER-CLAMP -- spindle/machine power achievability clamp.
 *
 * Makes the previously-INERT `spindle.hp` axis move the recommendation: when the required
 * cutting power P = Fc x Vc / 60000 exceeds the LIMITING of machine vs spindle rated power
 * (x drivetrain efficiency), feed/fz/MRR are derated so the recommended cut is ACHIEVABLE.
 * Only engages when a power input is supplied (preserves prior behaviour otherwise).
 * SAFE direction only (never raises feed); speed/RPM untouched (power caps chip load).
 *
 * R15: round-trips THROUGH speedFeedNineAxisOrchestratorEngine.run().
 */
import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

// Heavy steel roughing cut -> high required power, so low-power spindles are exercised.
function cut(extra: Record<string, unknown>): {
  vc: number; rpm: number; feed: number; fz: number; mrr: number; warnings: string[];
} {
  const input: any = {
    material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
    tooling: { tool_diameter_mm: 20, flutes: 4, tool_material: "carbide", tool_cost_usd: 60 },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 12, radial_depth_mm: 16 },
    coolant: { type: "flood" },
    machine: { rigidity: "medium", max_rpm: 10000 },
    optimize_for: "balanced",
    ...extra,
  };
  const out = speedFeedNineAxisOrchestratorEngine.run(input);
  const r = out.recommendation;
  return {
    vc: r.cutting_speed_mpm, rpm: r.spindle_rpm, feed: r.feed_rate_mmmin,
    fz: r.feed_per_tooth_mm, mrr: r.mrr_cm3min, warnings: out.warnings ?? [],
  };
}

describe("spindle-power clamp (U-OSC-SPINDLE-POWER-CLAMP)", () => {
  // ---- REGRESSION GUARD: no power input -> no clamp ----
  it("REGRESSION GUARD: no spindle/machine power supplied -> recommendation unchanged", () => {
    const none = cut({});                                   // no power fields
    const big = cut({ spindle: { hp: 100 } });              // 100hp ~ 75kW, never binds
    expect(none.feed).toBeCloseTo(big.feed, 0);             // absent-power == over-spec power
    expect(none.warnings.some(w => /spindle-power/i.test(w))).toBe(false);
  });

  it("a generously-powered spindle (50hp) does NOT derate the cut", () => {
    const big = cut({ spindle: { hp: 100 } });
    expect(cut({ spindle: { hp: 50 } }).feed).toBeCloseTo(big.feed, 0); // 50hp*0.7457*0.85 ~ 31.7kW adequate
  });

  // ---- POSITIVE CLAMP: an underpowered spindle derates ----
  it("a low-power spindle (5hp) HARD-derates feed/MRR on a heavy steel cut", () => {
    const big = cut({ spindle: { hp: 100 } }).feed;
    const small = cut({ spindle: { hp: 5 } });              // 5hp -> ~3.2kW available
    expect(small.feed).toBeLessThan(big);
    expect(small.mrr).toBeLessThan(cut({ spindle: { hp: 100 } }).mrr);
    expect(small.warnings.some(w => /spindle-power/i.test(w))).toBe(true);
  });

  it("monotonic: feed(5hp) < feed(15hp) < feed(50hp) on the same heavy cut", () => {
    const f5 = cut({ spindle: { hp: 5 } }).feed;
    const f15 = cut({ spindle: { hp: 15 } }).feed;
    const f50 = cut({ spindle: { hp: 50 } }).feed;
    expect(f5).toBeLessThan(f15);
    expect(f15).toBeLessThanOrEqual(f50);
  });

  it("machine.power_kw also drives the clamp (low rated machine derates)", () => {
    const big = cut({ machine: { rigidity: "medium", max_rpm: 10000, power_kw: 50 } }).feed;
    const small = cut({ machine: { rigidity: "medium", max_rpm: 10000, power_kw: 3 } }).feed;
    expect(small).toBeLessThan(big);
  });

  it("LIMITING element: a strong machine + weak spindle is clamped by the spindle", () => {
    // machine 50kW but spindle 5hp(~3.2kW) -> spindle limits.
    const limited = cut({ machine: { rigidity: "medium", max_rpm: 10000, power_kw: 50 }, spindle: { hp: 5 } }).feed;
    const unlimited = cut({ machine: { rigidity: "medium", max_rpm: 10000, power_kw: 50 }, spindle: { hp: 100 } }).feed;
    expect(limited).toBeLessThan(unlimited);
  });

  // ---- power derate touches chip-load only, never speed ----
  it("derate reduces feed/fz/MRR but leaves cutting speed + RPM unchanged", () => {
    const big = cut({ spindle: { hp: 100 } });
    const small = cut({ spindle: { hp: 5 } });
    expect(small.vc).toBeCloseTo(big.vc, 1);    // speed untouched
    expect(small.rpm).toBeCloseTo(big.rpm, 0);  // rpm untouched
    expect(small.fz).toBeLessThan(big.fz);      // chip load reduced
  });

  // ---- ADVERSARIAL ----
  it("ADVERSARIAL: NaN spindle.hp -> guard skips, no crash, no spurious derate", () => {
    const r = cut({ spindle: { hp: NaN } });
    expect(Number.isFinite(r.feed)).toBe(true);
    expect(r.warnings.some(w => /spindle-power/i.test(w))).toBe(false);
  });

  it("ADVERSARIAL: zero/negative power -> filtered out, no clamp, no divide-by-zero", () => {
    expect(Number.isFinite(cut({ spindle: { hp: 0 } }).feed)).toBe(true);
    expect(Number.isFinite(cut({ machine: { rigidity: "medium", max_rpm: 10000, power_kw: -5 } }).feed)).toBe(true);
  });

  // ---- composes with workholding without crash/NaN ----
  it("composes with the workholding derate (both constraints) without NaN", () => {
    const r = cut({ spindle: { hp: 5 }, workholding: { type: "vacuum" } });
    expect(Number.isFinite(r.feed)).toBe(true);
    expect(r.feed).toBeGreaterThan(0);
    expect(r.fz).toBeGreaterThan(0);
  });

  // ---- MODE COVERAGE: the clamp runs in ALL 3 modes, not just prism_optimized ----
  // (the default cut() helper exercises only prism_optimized; these assert the clamp
  //  also derates in aggressive_rush -- where feed carries controller_smoothing_factor --
  //  and cost_batch, and that the named mode actually engaged.)
  function modeRec(mode: string, hp: number) {
    const input: any = {
      material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
      tooling: { tool_diameter_mm: 20, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 12, radial_depth_mm: 16 },
      machine: { rigidity: "medium", max_rpm: 10000 },
      spindle: { hp },
      mode,
    };
    return speedFeedNineAxisOrchestratorEngine.run(input).recommendation;
  }

  it("clamp engages + derates in aggressive_rush mode (feed carries controller smoothing)", () => {
    const big = modeRec("aggressive_rush", 100);
    const small = modeRec("aggressive_rush", 5);
    expect(small.mode).toBe("aggressive_rush");                       // mode actually engaged
    expect(small.feed_rate_mmmin).toBeLessThan(big.feed_rate_mmmin);  // clamp derates in this mode
    expect(Number.isFinite(small.feed_rate_mmmin)).toBe(true);
  });

  it("clamp engages + derates in cost_batch mode", () => {
    const big = modeRec("cost_batch", 100);
    const small = modeRec("cost_batch", 5);
    expect(small.mode).toBe("cost_batch");
    expect(small.feed_rate_mmmin).toBeLessThan(big.feed_rate_mmmin);
  });
});
