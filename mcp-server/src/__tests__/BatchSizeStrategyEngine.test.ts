import { describe, it, expect } from "vitest";
import { batchSizeStrategyEngine } from "../engines/BatchSizeStrategyEngine.js";

const FEAT = { type: "pocket", volume_cm3: 50, tolerance_mm: 0.05, required_Ra_um: 1.6 };
const MAT = { group: "steel", kc1_1_n_mm2: 1800, mc: 0.25, taylor_C: 300, taylor_n: 0.25 };
const TOOL = { diameter_mm: 12, flute_count: 4, cost_usd: 30, expected_life_parts: 80 };
const MACH = { rate_usd_hr: 85, spindle_power_kw: 15, has_probing: true, pallet_changer: true, tool_magazine_capacity: 40 };

describe("BatchSizeStrategyEngine", () => {
  it("qty=1 → prototype tier", () => {
    const r = batchSizeStrategyEngine.recommend(1, FEAT, MAT, TOOL, MACH);
    expect(r.tier).toBe("prototype");
  });

  it("qty=25 → small_batch tier", () => {
    const r = batchSizeStrategyEngine.recommend(25, FEAT, MAT, TOOL, MACH);
    expect(r.tier).toBe("small_batch");
  });

  it("qty=250 → production tier", () => {
    const r = batchSizeStrategyEngine.recommend(250, FEAT, MAT, TOOL, MACH);
    expect(r.tier).toBe("production");
  });

  it("qty=5000 → long_run tier", () => {
    const r = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, MACH);
    expect(r.tier).toBe("long_run");
  });

  it("prototype safety_factor = 1.5×", () => {
    const r = batchSizeStrategyEngine.recommend(1, FEAT, MAT, TOOL, MACH);
    expect(r.adjusted_params.safety_factor).toBeCloseTo(1.5, 1);
  });

  it("long_run safety_factor ≤ 1.0", () => {
    const r = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, MACH);
    expect(r.adjusted_params.safety_factor).toBeLessThanOrEqual(1.0);
  });

  it("prototype → sister_tool NOT required", () => {
    const r = batchSizeStrategyEngine.recommend(3, FEAT, MAT, TOOL, MACH);
    expect(r.sister_tool_required).toBe(false);
  });

  it("production → sister_tool required", () => {
    const r = batchSizeStrategyEngine.recommend(200, FEAT, MAT, TOOL, MACH);
    expect(r.sister_tool_required).toBe(true);
  });

  it("long_run requires pallet_changer for lights_out", () => {
    const r1 = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, { ...MACH, pallet_changer: true });
    const r2 = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, { ...MACH, pallet_changer: false });
    expect(r1.lights_out_capable).toBe(true);
    expect(r2.lights_out_capable).toBe(false);
  });

  it("min_cpk_target monotonic by tier severity", () => {
    const proto = batchSizeStrategyEngine.recommend(1, FEAT, MAT, TOOL, MACH);
    const lr = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, MACH);
    expect(lr.min_cpk_target).toBeGreaterThanOrEqual(proto.min_cpk_target);
  });

  it("adjustParameters() divides limits by safety factor", () => {
    const base = { Vc_m_min: 200, fz_mm: 0.1, ap_mm: 5, ae_mm: 3 };
    const prod = batchSizeStrategyEngine.adjustParameters(base, 100);
    const proto = batchSizeStrategyEngine.adjustParameters(base, 1);
    expect(proto.Vc_m_min).toBeLessThan(prod.Vc_m_min);
  });

  it("adjustParameters() rationale populated", () => {
    const base = { Vc_m_min: 200, fz_mm: 0.1, ap_mm: 5, ae_mm: 3 };
    const r = batchSizeStrategyEngine.adjustParameters(base, 10);
    expect(r.rationale.length).toBeGreaterThan(0);
  });

  it("costBreakdown() scales with batchSize", () => {
    const params = { Vc_m_min: 150, fz_mm: 0.08, ap_mm: 3, ae_mm: 2 };
    const small = batchSizeStrategyEngine.costBreakdown("s1", 10, params, FEAT, TOOL, MACH);
    const big = batchSizeStrategyEngine.costBreakdown("s1", 1000, params, FEAT, TOOL, MACH);
    expect(big.total_batch_cost_usd).toBeGreaterThan(small.total_batch_cost_usd);
  });

  it("costBreakdown() has per-part + total components", () => {
    const params = { Vc_m_min: 150, fz_mm: 0.08, ap_mm: 3, ae_mm: 2 };
    const r = batchSizeStrategyEngine.costBreakdown("s1", 100, params, FEAT, TOOL, MACH);
    expect(r.per_part_cost_usd).toBeGreaterThan(0);
    expect(r.components.machining_usd).toBeGreaterThan(0);
    expect(r.components.tool_amortization_usd).toBeGreaterThanOrEqual(0);
  });

  it("recommendations include expected strategy keywords", () => {
    const proto = batchSizeStrategyEngine.recommend(1, FEAT, MAT, TOOL, MACH);
    const lr = batchSizeStrategyEngine.recommend(5000, FEAT, MAT, TOOL, MACH);
    expect(proto.recommended_strategies.length).toBeGreaterThan(0);
    expect(lr.recommended_strategies.length).toBeGreaterThan(0);
  });

  it("single-part prototype emits warning", () => {
    const r = batchSizeStrategyEngine.recommend(1, FEAT, MAT, TOOL, MACH);
    expect(r.warnings.some(w => /single|prototype|scrap/i.test(w))).toBe(true);
  });
});
