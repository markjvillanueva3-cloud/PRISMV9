import { describe, it, expect } from "vitest";
import { toolLifeExtensionRecommenderEngine as eng } from "../engines/ToolLifeExtensionRecommenderEngine.js";

/**
 * UNIT-0012 ToolLifeExtensionRecommenderEngine -- Taylor reference values.
 * 1045 is ISO P -> CANONICAL_TAYLOR n = 0.25. At low n the Taylor exponent 1/n=4 makes a small
 * Vc cut buy a large life gain -- the real physics.
 *   speed_reduction 20%: T x (1/(1-0.20))^(1/0.25) = 1.25^4 = 2.4414
 *   coating k=1.2:       T x 1.2^4 = 2.0736, at ZERO productivity cost -> ranks first
 *   life uncertainty:    rel = (C_cv 8 / 100)/n 0.25 = 0.32  (1/n-amplified Taylor scatter)
 */
describe("ToolLifeExtensionRecommenderEngine.recommend -- Taylor reference values (1045, n=0.25)", () => {
  it("speed_reduction 20% -> life x2.44 (Taylor), throughput -20%, uncertainty ~+/-0.78", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, baseline_life_min: 30, levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }] });
    expect(r.iso_taylor_n).toBeCloseTo(0.25, 4);
    const lever = r.ranked_levers.find((l) => l.type === "speed_reduction")!;
    expect(lever.life_multiplier).toBeCloseTo(2.4414, 3);
    expect(lever.resulting_life_min).toBeCloseTo(73.2, 1); // 30 * 2.4414
    expect(lever.productivity_cost_pct).toBe(20);
    expect(lever.life_multiplier_uncertainty).toBeCloseTo(2.4414 * 0.32, 2); // ~0.78
  });

  it("coating_upgrade k=1.2 -> life x2.07 at ZERO productivity cost", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "coating_upgrade", vc_multiplier: 1.2 }] });
    const lever = r.ranked_levers.find((l) => l.type === "coating_upgrade")!;
    expect(lever.life_multiplier).toBeCloseTo(2.0736, 3); // 1.2^4
    expect(lever.productivity_cost_pct).toBe(0);
  });

  it("ranks the zero-cost coating lever ABOVE the speed-trade lever (best = free life)", () => {
    const r = eng.recommend({
      material: "1045", current_vc_m_min: 200, baseline_life_min: 30,
      levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }, { type: "coating_upgrade", vc_multiplier: 1.2 }],
    });
    expect(r.best?.type).toBe("coating_upgrade");
    expect(r.ranked_levers[0].type).toBe("coating_upgrade"); // zero-cost life gain wins
    // speed_reduction still present + ranked second
    expect(r.ranked_levers[1].type).toBe("speed_reduction");
  });

  it("every valid extension lever has life_multiplier > 1 (it EXTENDS life)", () => {
    const r = eng.recommend({
      material: "1045", current_vc_m_min: 200,
      levers: [{ type: "speed_reduction", vc_reduction_pct: 10 }, { type: "speed_reduction", vc_reduction_pct: 30 }, { type: "coating_upgrade", vc_multiplier: 1.1 }],
    });
    for (const l of r.ranked_levers) expect(l.life_multiplier).toBeGreaterThan(1);
    // 10% cut: (1/0.9)^4 = 1.5242
    expect(r.ranked_levers.find((l) => /10%/.test(l.detail))?.life_multiplier).toBeCloseTo(1.5242, 3);
  });
});

describe("ToolLifeExtensionRecommenderEngine.recommend -- edge cases (never throws)", () => {
  it("stainless (316, ISO M, n=0.20) gives a LARGER multiplier than P for the same Vc cut (lower n)", () => {
    const p = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }] });
    const m = eng.recommend({ material: "316", current_vc_m_min: 200, levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }] });
    // 316 n=0.20 -> 1/n=5 -> 1.25^5 = 3.0518 > 1045's 1.25^4 = 2.4414
    expect(m.ranked_levers[0].life_multiplier).toBeGreaterThan(p.ranked_levers[0].life_multiplier);
    expect(m.ranked_levers[0].life_multiplier).toBeCloseTo(3.0518, 2);
  });

  it("invalid speed_reduction (0% or >90%) is skipped with a warning, never throws", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "speed_reduction", vc_reduction_pct: 0 }, { type: "speed_reduction", vc_reduction_pct: 95 }] });
    expect(r.ranked_levers).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("coating vc_multiplier <= 1 is not an extension -> skipped with a warning", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "coating_upgrade", vc_multiplier: 0.9 }] });
    expect(r.ranked_levers).toHaveLength(0);
    expect(r.warnings.some((w) => /must be > 1/.test(w))).toBe(true);
  });

  it("empty lever list -> empty ranking, best null, no crash", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [] });
    expect(r.ranked_levers).toHaveLength(0);
    expect(r.best).toBeNull();
  });

  it("resulting_life_min is null when no baseline is provided", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "coating_upgrade", vc_multiplier: 1.2 }] });
    expect(r.ranked_levers[0].resulting_life_min).toBeNull();
  });

  it("a large speed cut buys dramatic life at low n: 50% cut on 1045 (n=0.25) -> x16 (Taylor 2^4)", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "speed_reduction", vc_reduction_pct: 50 }] });
    expect(r.ranked_levers[0].life_multiplier).toBeCloseTo(16, 2); // (1/0.5)^(1/0.25) = 2^4
    expect(r.ranked_levers[0].productivity_cost_pct).toBe(50);
  });

  it("life_gain_per_cost ranks the cheaper-per-life lever higher (20% cut = 7.21 gain/cost)", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "speed_reduction", vc_reduction_pct: 20 }] });
    // gain=(2.4414-1)=1.4414 per 0.20 fractional cost -> 7.207
    expect(r.ranked_levers[0].life_gain_per_cost).toBeCloseTo(7.207, 2);
  });

  it("note names the deferred levers (coolant/cryo/refinish/Weibull) -- honest scope, not fabricated", () => {
    const r = eng.recommend({ material: "1045", current_vc_m_min: 200, levers: [{ type: "coating_upgrade", vc_multiplier: 1.2 }] });
    expect(r.note).toMatch(/coolant|cryo|refinish|Weibull/i);
    expect(r.source).toMatch(/Taylor/i);
  });
});
