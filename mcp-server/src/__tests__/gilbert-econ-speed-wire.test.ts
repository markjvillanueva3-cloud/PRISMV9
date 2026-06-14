/**
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-GILBERT
 *
 * Engine-surface contract test for the GilbertEconomicSpeedEngine wire into
 * prism_calc:gilbert_econ_speed_compute / _compare_vc / _stats.
 *
 * Verifies Gilbert (1950) minimum-cost cutting velocity invariants:
 *   - Vc_min_time > Vc_min_cost when tool cost > 0 (tool cost penalty pushes
 *     the economic optimum DOWN from the pure time-minimizer)
 *   - Taylor invariant T = (K_T / Vc)^(1/n) holds for returned tool lives
 *   - cost_per_part_at_min_cost <= cost_per_part_at_min_time (the whole point
 *     of Gilbert's optimization — min-cost beats min-time on $/part)
 *   - Input validation throws on n ∉ (0,1), K_T <= 0, M <= 0
 *   - compareVc tolerance band: ±5% returns "at"; outside returns "below"/"above"
 *   - getStats returns the engine's formula + reference inventory
 *
 * Sister to [[reference_iter3_misattribution_2026_05_20]] — this wire ships
 * full inference (not just introspection) because the engine is pure-math
 * Gilbert/Taylor with no NN random-init.
 */
import { describe, it, expect } from "vitest";
import { gilbertEconomicSpeedEngine } from "../engines/GilbertEconomicSpeedEngine.js";

// Canonical lathe carbide-on-steel scenario (Shaw §20 example values)
const STEEL_CARBIDE_INPUT = {
  K_T: 250,           // m/min @ 1 min life (Taylor C)
  n: 0.25,            // Taylor exponent for carbide (typical 0.15-0.35)
  machining_cost_per_sec_usd: 0.025, // $90/hr labor+overhead = $0.025/sec
  tool_change_time_sec: 60,          // 1 min tool change
  tool_cost_per_edge_usd: 5.0,       // $5 per indexable insert edge
  cut_length_mm: 200,
  f_mm_rev: 0.25,
  diameter_mm: 50,
};

describe("U-WIRE-BACKLOG-SF-GILBERT — gilbert_econ_speed engine surface", () => {
  it("compute: returns Vc_min_cost > 0 and Vc_min_time > 0", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    expect(r.Vc_min_cost).toBeGreaterThan(0);
    expect(r.Vc_min_time).toBeGreaterThan(0);
  });

  it("compute: Vc_min_time > Vc_min_cost when tool cost > 0 (Gilbert ordering invariant)", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    // Tool cost penalizes high Vc (shorter life → more changes + more inserts),
    // so the cost-minimizer sits BELOW the time-minimizer.
    expect(r.Vc_min_time).toBeGreaterThan(r.Vc_min_cost);
  });

  it("compute: Taylor invariant — T_min_cost · Vc_min_cost^(1/n) ≈ K_T^(1/n)", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    // T = (K_T/Vc)^(1/n)  →  Vc · T^n = K_T
    const lhs = r.Vc_min_cost * Math.pow(r.T_min_cost_min, STEEL_CARBIDE_INPUT.n);
    const rhs = STEEL_CARBIDE_INPUT.K_T;
    // Engine rounds to 2 decimals; allow 1% tolerance for the round-trip.
    expect(Math.abs(lhs - rhs) / rhs).toBeLessThan(0.01);
  });

  it("compute: cost_per_part_at_min_cost is the per-part cost minimizer (Gilbert optimality)", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    // Both cost values exist because cut_length / feed / diameter were supplied.
    // Whole point of Gilbert: min-cost Vc beats min-time Vc on $/part.
    const cMinCost = r.cost_per_part_at_min_cost_usd ?? Number.POSITIVE_INFINITY;
    const cMinTime = r.cost_per_part_at_min_time_usd ?? Number.NEGATIVE_INFINITY;
    expect(cMinCost).toBeGreaterThan(0);
    expect(cMinTime).toBeGreaterThan(0);
    expect(cMinCost).toBeLessThanOrEqual(cMinTime);
  });

  it("compute: hi_e_range bounds are ordered (min, max)", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    expect(r.hi_e_range_m_min[0]).toBeLessThanOrEqual(r.hi_e_range_m_min[1]);
  });

  it("compute: RPM derived from Vc and diameter via RPM = 1000·Vc/(π·D)", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    const expectedRpmMinCost = Math.round((1000 * r.Vc_min_cost) / (Math.PI * STEEL_CARBIDE_INPUT.diameter_mm));
    expect(r.rpm_at_min_cost).toBe(expectedRpmMinCost);
  });

  it("compute: throws on n <= 0", () => {
    expect(() => gilbertEconomicSpeedEngine.compute({ ...STEEL_CARBIDE_INPUT, n: 0 }))
      .toThrow(/K_T > 0 and 0 < n < 1 required/);
  });

  it("compute: throws on n >= 1", () => {
    expect(() => gilbertEconomicSpeedEngine.compute({ ...STEEL_CARBIDE_INPUT, n: 1 }))
      .toThrow(/K_T > 0 and 0 < n < 1 required/);
  });

  it("compute: throws on K_T <= 0", () => {
    expect(() => gilbertEconomicSpeedEngine.compute({ ...STEEL_CARBIDE_INPUT, K_T: 0 }))
      .toThrow(/K_T > 0 and 0 < n < 1 required/);
  });

  it("compute: throws on machining_cost_per_sec_usd <= 0", () => {
    expect(() => gilbertEconomicSpeedEngine.compute({ ...STEEL_CARBIDE_INPUT, machining_cost_per_sec_usd: 0 }))
      .toThrow(/machining_cost_per_sec_usd must be > 0/);
  });

  it("compareVc: candidate equal to Vc_min_cost returns 'at'", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    const cmp = gilbertEconomicSpeedEngine.compareVc(r.Vc_min_cost, STEEL_CARBIDE_INPUT);
    expect(cmp.relative).toBe("at");
    expect(cmp.ratio).toBeCloseTo(1, 1);
  });

  it("compareVc: candidate at 50% of Vc_min_cost returns 'below'", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    const cmp = gilbertEconomicSpeedEngine.compareVc(r.Vc_min_cost * 0.5, STEEL_CARBIDE_INPUT);
    expect(cmp.relative).toBe("below");
    expect(cmp.ratio).toBeLessThan(1);
  });

  it("compareVc: candidate at 150% of Vc_min_cost returns 'above'", () => {
    const r = gilbertEconomicSpeedEngine.compute(STEEL_CARBIDE_INPUT);
    const cmp = gilbertEconomicSpeedEngine.compareVc(r.Vc_min_cost * 1.5, STEEL_CARBIDE_INPUT);
    expect(cmp.relative).toBe("above");
    expect(cmp.ratio).toBeGreaterThan(1);
  });

  it("getStats: returns 3 Gilbert/Taylor formulas + 3 canonical references", () => {
    const s = gilbertEconomicSpeedEngine.getStats();
    expect(Array.isArray(s.formulas)).toBe(true);
    expect(Array.isArray(s.references)).toBe(true);
    expect(s.formulas.length).toBe(3);
    expect(s.references.length).toBe(3);
    // Refs must include all three canonical sources
    const refsJoined = s.references.join(" | ");
    expect(refsJoined).toMatch(/Gilbert.*1950/i);
    expect(refsJoined).toMatch(/Shaw/i);
    expect(refsJoined).toMatch(/Armarego/i);
  });

  it("revenue path: max-profit Vc lies within Hi-E band when revenue supplied", () => {
    const r = gilbertEconomicSpeedEngine.compute({
      ...STEEL_CARBIDE_INPUT,
      revenue_per_part_usd: 50.0,
    });
    // Both fields are populated together (revenue path is all-or-nothing).
    // The sweep is bounded by [Vc_min_cost, Vc_min_time], so the best
    // sample is guaranteed to lie inside that closed band.
    const vcMaxProfit = r.Vc_max_profit ?? Number.NaN;
    const profitPerHour = r.profit_per_hour_usd ?? Number.NaN;
    expect(Number.isFinite(vcMaxProfit)).toBe(true);
    expect(Number.isFinite(profitPerHour)).toBe(true);
    expect(vcMaxProfit).toBeGreaterThanOrEqual(r.hi_e_range_m_min[0]);
    expect(vcMaxProfit).toBeLessThanOrEqual(r.hi_e_range_m_min[1]);
  });
});
