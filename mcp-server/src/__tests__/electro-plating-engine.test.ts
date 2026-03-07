/**
 * ElectroPlatingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B42
 */
import { describe, it, expect } from "vitest";
import { electroPlatingEngine } from "../engines/ElectroPlatingEngine.js";

describe("ElectroPlatingEngine", () => {
  it("plating time > 0", () => {
    const r = electroPlatingEngine.calculate({});
    expect(r.plating_time.value).toBeGreaterThan(0);
  });

  it("thicker plating takes longer", () => {
    const thin = electroPlatingEngine.calculate({ target_thickness_um: 5 });
    const thick = electroPlatingEngine.calculate({ target_thickness_um: 50 });
    expect(thick.plating_time.value).toBeGreaterThan(thin.plating_time.value);
  });

  it("chrome has low cathode efficiency", () => {
    const chrome = electroPlatingEngine.calculate({ plating_type: "chrome_hard" });
    const nickel = electroPlatingEngine.calculate({ plating_type: "nickel" });
    expect(chrome.cathode_efficiency.value).toBeLessThan(
      nickel.cathode_efficiency.value
    );
  });

  it("chrome takes longer than nickel for same thickness", () => {
    const chrome = electroPlatingEngine.calculate({
      plating_type: "chrome_hard", target_thickness_um: 25,
    });
    const nickel = electroPlatingEngine.calculate({
      plating_type: "nickel", target_thickness_um: 25,
    });
    expect(chrome.plating_time.value).toBeGreaterThan(
      nickel.plating_time.value
    );
  });

  it("larger area needs more current", () => {
    const small = electroPlatingEngine.calculate({ part_area_dm2: 1 });
    const large = electroPlatingEngine.calculate({ part_area_dm2: 10 });
    expect(large.total_current.value).toBeGreaterThan(
      small.total_current.value
    );
  });

  it("warns hydrogen embrittlement for chrome on steel", () => {
    const r = electroPlatingEngine.calculate({
      plating_type: "chrome_hard",
      substrate: "steel",
    });
    expect(r.hydrogen_risk.unit).toBe("high");
    expect(r.bake_required.unit).toContain("YES");
  });

  it("warns cadmium toxicity", () => {
    const r = electroPlatingEngine.calculate({ plating_type: "cadmium" });
    expect(r.warnings.some(w => w.includes("toxic"))).toBe(true);
  });

  it("cost per part > 0", () => {
    const r = electroPlatingEngine.calculate({});
    expect(r.cost_per_part.value).toBeGreaterThan(0);
  });

  it("metal deposited > 0", () => {
    const r = electroPlatingEngine.calculate({});
    expect(r.metal_deposited.value).toBeGreaterThan(0);
  });

  it("throwing power between 1 and 10", () => {
    const r = electroPlatingEngine.calculate({});
    expect(r.throwing_power.value).toBeGreaterThanOrEqual(1);
    expect(r.throwing_power.value).toBeLessThanOrEqual(10);
  });
});
