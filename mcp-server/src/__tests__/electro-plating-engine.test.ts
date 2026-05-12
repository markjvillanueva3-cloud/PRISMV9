/**
 * ElectroPlatingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B42
 * Updated to match batch-105 ElectroplatingEngine interface
 */
import { describe, it, expect } from "vitest";
import { electroplatingEngine } from "../engines/ElectroPlatingEngine.js";

describe("ElectroPlatingEngine", () => {
  it("plating time > 0", () => {
    const r = electroplatingEngine.calculate({});
    expect(r.plating_time_min.value).toBeGreaterThan(0);
  });

  it("thicker plating takes longer", () => {
    const thin = electroplatingEngine.calculate({ target_thickness_um: 5 });
    const thick = electroplatingEngine.calculate({ target_thickness_um: 50 });
    expect(thick.plating_time_min.value).toBeGreaterThan(thin.plating_time_min.value);
  });

  it("chrome has low current efficiency", () => {
    const chrome = electroplatingEngine.calculate({ metal: "chrome_hard" });
    const nickel = electroplatingEngine.calculate({ metal: "nickel" });
    expect(chrome.current_efficiency_pct.value).toBeLessThan(
      nickel.current_efficiency_pct.value
    );
  });

  it("chrome takes longer than nickel for same thickness", () => {
    const chrome = electroplatingEngine.calculate({
      metal: "chrome_hard", target_thickness_um: 25,
    });
    const nickel = electroplatingEngine.calculate({
      metal: "nickel", target_thickness_um: 25,
    });
    expect(chrome.plating_time_min.value).toBeGreaterThan(
      nickel.plating_time_min.value
    );
  });

  it("larger area needs more current", () => {
    const small = electroplatingEngine.calculate({ surface_area_dm2: 1 });
    const large = electroplatingEngine.calculate({ surface_area_dm2: 10 });
    expect(large.current_A.value).toBeGreaterThan(
      small.current_A.value
    );
  });

  it("recommendations array present", () => {
    const r = electroplatingEngine.calculate({
      metal: "chrome_hard",
    });
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it("metal consumption > 0", () => {
    const r = electroplatingEngine.calculate({});
    expect(r.metal_consumption_g.value).toBeGreaterThan(0);
  });

  it("cost — energy > 0", () => {
    const r = electroplatingEngine.calculate({});
    expect(r.energy_kWh.value).toBeGreaterThan(0);
  });

  it("deposition rate > 0", () => {
    const r = electroplatingEngine.calculate({});
    expect(r.deposition_rate_um_min.value).toBeGreaterThan(0);
  });

  it("throwing power between 0 and 100", () => {
    const r = electroplatingEngine.calculate({});
    expect(r.throwing_power_pct.value).toBeGreaterThanOrEqual(0);
    expect(r.throwing_power_pct.value).toBeLessThanOrEqual(100);
  });
});
