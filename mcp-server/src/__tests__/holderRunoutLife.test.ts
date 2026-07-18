/**
 * OSCAR-SFC-9AXIS-MS0/U-OSC-HOLDER-RUNOUT-LIFE -- holder/total-runout tool-life derate.
 *
 * Makes the previously-INERT tool_holder runout move the recommendation's TOOL LIFE: the
 * core engine already computes runout_impact.life_reduction_pct (RSS of spindle+holder+tool
 * TIR vs chip load) but only WARNED -- it never folded it into tool_life.life_minutes. This
 * applies the existing model's reduction to the recommendation life (REUSE, not a fork).
 * SAFE direction (only reduces life; engine caps reduction at 80% -> >=20% floor).
 * Affects tool_life only; speed/feed unchanged (runout is a wear effect).
 *
 * R15: round-trips THROUGH speedFeedNineAxisOrchestratorEngine.run().
 */
import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

function rec(holder: Record<string, unknown>): {
  vc: number; feed: number; life: number; warnings: string[];
} {
  const input: any = {
    material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
    tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", tool_cost_usd: 60 },
    toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
    machine: { rigidity: "medium", max_rpm: 12000 },
    tool_holder: holder,
    optimize_for: "balanced",
  };
  const out = speedFeedNineAxisOrchestratorEngine.run(input);
  const r = out.recommendation;
  return { vc: r.cutting_speed_mpm, feed: r.feed_rate_mmmin, life: r.tool_life_min, warnings: out.warnings ?? [] };
}

describe("holder-runout tool-life derate (U-OSC-HOLDER-RUNOUT-LIFE)", () => {
  it("higher runout shortens tool life: explicit 30um TIR < 1um TIR", () => {
    const hi = rec({ type: "shrink_fit", runout_tir_um: 30 });
    const lo = rec({ type: "shrink_fit", runout_tir_um: 1 });
    expect(hi.life).toBeLessThan(lo.life);
    expect(hi.warnings.some(w => /runout.*tool.life|tool-life derate/i.test(w))).toBe(true);
  });

  it("holder TYPE drives it: mill_chuck (15um) gives shorter life than shrink_fit (3um)", () => {
    expect(rec({ type: "mill_chuck" }).life).toBeLessThan(rec({ type: "shrink_fit" }).life);
    expect(rec({ type: "er_collet" }).life).toBeLessThan(rec({ type: "hsk_a63" }).life); // 12um < 3um
  });

  it("monotonic: life decreases as runout_tir_um increases", () => {
    const l1 = rec({ type: "shrink_fit", runout_tir_um: 1 }).life;
    const l10 = rec({ type: "shrink_fit", runout_tir_um: 10 }).life;
    const l30 = rec({ type: "shrink_fit", runout_tir_um: 30 }).life;
    expect(l10).toBeLessThanOrEqual(l1);
    expect(l30).toBeLessThan(l10);
  });

  it("REGRESSION GUARD: a precision holder (shrink_fit ~3um) barely reduces life (>90% retained)", () => {
    const precision = rec({ type: "shrink_fit" }).life;
    const minimal = rec({ type: "shrink_fit", runout_tir_um: 0.5 }).life; // near-zero runout reference
    expect(precision).toBeGreaterThan(minimal * 0.9);  // precision holder loses <10% life
  });

  it("BOUNDED: even extreme runout (200um) floors tool life at >=20% (engine 80% cap), never zero/negative", () => {
    const extreme = rec({ type: "shrink_fit", runout_tir_um: 200 }).life;
    const ref = rec({ type: "shrink_fit", runout_tir_um: 0.5 }).life;
    expect(extreme).toBeGreaterThan(0);
    expect(extreme).toBeGreaterThanOrEqual(ref * 0.19);  // >= ~20% floor, not zeroed
  });

  it("runout derate affects LIFE only -- cutting speed + feed unchanged (it is a wear effect)", () => {
    const hi = rec({ type: "mill_chuck", runout_tir_um: 30 });
    const lo = rec({ type: "shrink_fit", runout_tir_um: 1 });
    expect(hi.vc).toBeCloseTo(lo.vc, 1);     // speed untouched by runout
    expect(hi.feed).toBeCloseTo(lo.feed, 0); // feed untouched (runout is not a chip-load constraint)
    expect(hi.life).toBeLessThan(lo.life);   // life IS reduced
  });

  it("ADVERSARIAL: NaN runout_tir_um -> falls back to type table, no crash, finite life", () => {
    const r = rec({ type: "shrink_fit", runout_tir_um: NaN });
    expect(Number.isFinite(r.life)).toBe(true);
    expect(r.life).toBeGreaterThan(0);
  });
});
