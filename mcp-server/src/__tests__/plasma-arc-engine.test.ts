/**
 * PlasmaArcEngine — Unit Tests
 * @milestone FORGE-ENGINES-B35
 */
import { describe, it, expect } from "vitest";
import { plasmaArcEngine } from "../engines/PlasmaArcEngine.js";

describe("PlasmaArcEngine", () => {
  it("thicker material needs more current", () => {
    const thin = plasmaArcEngine.calculate({ thickness_mm: 6 });
    const thick = plasmaArcEngine.calculate({ thickness_mm: 25 });
    expect(thick.cutting_current.value).toBeGreaterThan(
      thin.cutting_current.value
    );
  });

  it("thicker material cuts slower", () => {
    const thin = plasmaArcEngine.calculate({ thickness_mm: 6 });
    const thick = plasmaArcEngine.calculate({ thickness_mm: 25 });
    expect(thick.cut_speed.value).toBeLessThan(thin.cut_speed.value);
  });

  it("aluminum cuts faster than steel", () => {
    const steel = plasmaArcEngine.calculate({ material: "mild_steel" });
    const alum = plasmaArcEngine.calculate({ material: "aluminum" });
    expect(alum.cut_speed.value).toBeGreaterThan(steel.cut_speed.value);
  });

  it("kerf width increases with thickness", () => {
    const thin = plasmaArcEngine.calculate({ thickness_mm: 3 });
    const thick = plasmaArcEngine.calculate({ thickness_mm: 30 });
    expect(thick.kerf_width.value).toBeGreaterThan(thin.kerf_width.value);
  });

  it("fine quality cuts slower than production", () => {
    const prod = plasmaArcEngine.calculate({ cut_quality: "production" });
    const fine = plasmaArcEngine.calculate({ cut_quality: "fine" });
    expect(fine.cut_speed.value).toBeLessThan(prod.cut_speed.value);
  });

  it("cost per meter > 0", () => {
    const r = plasmaArcEngine.calculate({});
    expect(r.cost_per_meter.value).toBeGreaterThan(0);
  });

  it("warns insufficient power source", () => {
    const r = plasmaArcEngine.calculate({
      thickness_mm: 50,
      power_source_amps: 45,
    });
    expect(r.warnings.some(w => w.includes("insufficient"))).toBe(true);
  });

  it("recommends oxygen for mild steel", () => {
    const r = plasmaArcEngine.calculate({ material: "mild_steel" });
    expect(r.gas_recommendation.unit).toBe("oxygen");
  });

  it("pierce time increases with thickness", () => {
    const thin = plasmaArcEngine.calculate({ thickness_mm: 3 });
    const thick = plasmaArcEngine.calculate({ thickness_mm: 30 });
    expect(thick.pierce_time.value).toBeGreaterThan(thin.pierce_time.value);
  });

  it("heat input > 0", () => {
    const r = plasmaArcEngine.calculate({});
    expect(r.heat_input.value).toBeGreaterThan(0);
  });
});
