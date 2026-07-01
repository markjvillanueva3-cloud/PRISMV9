/**
 * HeatExchangerEngine — Unit Tests
 * @milestone FORGE-ENGINES-B40
 */
import { describe, it, expect } from "vitest";
import { heatExchangerEngine } from "../engines/HeatExchangerEngine.js";

describe("HeatExchangerEngine", () => {
  it("LMTD > 0 with defaults", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.lmtd.value).toBeGreaterThan(0);
  });

  it("required area > 0", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.required_area.value).toBeGreaterThan(0);
  });

  it("higher duty needs more area", () => {
    const small = heatExchangerEngine.calculate({ duty_kw: 50 });
    const large = heatExchangerEngine.calculate({ duty_kw: 500 });
    expect(large.required_area.value).toBeGreaterThan(
      small.required_area.value
    );
  });

  it("steam/water has higher U than oil/oil", () => {
    const steam = heatExchangerEngine.calculate({
      hot_fluid: "steam", cold_fluid: "water",
    });
    const oil = heatExchangerEngine.calculate({
      hot_fluid: "oil", cold_fluid: "oil",
    });
    expect(steam.overall_u.value).toBeGreaterThan(oil.overall_u.value);
  });

  it("counterflow has higher LMTD than parallel", () => {
    const cf = heatExchangerEngine.calculate({ flow_arrangement: "counterflow" });
    const pf = heatExchangerEngine.calculate({ flow_arrangement: "parallel" });
    expect(cf.lmtd.value).toBeGreaterThanOrEqual(pf.lmtd.value);
  });

  it("effectiveness between 0 and 1", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.effectiveness.value).toBeGreaterThan(0);
    expect(r.effectiveness.value).toBeLessThanOrEqual(1);
  });

  it("flow rates > 0", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.hot_flow_rate.value).toBeGreaterThan(0);
    expect(r.cold_flow_rate.value).toBeGreaterThan(0);
  });

  it("NTU > 0", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.ntu.value).toBeGreaterThan(0);
  });

  it("correction factor ≤ 1", () => {
    const r = heatExchangerEngine.calculate({});
    expect(r.correction_factor.value).toBeLessThanOrEqual(1);
  });

  it("warns close temperature approach", () => {
    const r = heatExchangerEngine.calculate({
      hot_inlet_c: 50, hot_outlet_c: 22,
      cold_inlet_c: 20, cold_outlet_c: 48,
    });
    expect(r.warnings.some(w => w.includes("approach"))).toBe(true);
  });
});
