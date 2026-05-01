/**
 * ValveSizingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B39
 */
import { describe, it, expect } from "vitest";
import { valveSizingEngine } from "../engines/ValveSizingEngine.js";

describe("ValveSizingEngine", () => {
  it("Cv > 0 with defaults", () => {
    const r = valveSizingEngine.calculate({});
    expect(r.cv_required.value).toBeGreaterThan(0);
  });

  it("Kv ≈ Cv × 0.865", () => {
    const r = valveSizingEngine.calculate({});
    const ratio = r.kv_required.value / r.cv_required.value;
    expect(ratio).toBeCloseTo(0.865, 2);
  });

  it("higher flow needs higher Cv", () => {
    const low = valveSizingEngine.calculate({ flow_rate: 10 });
    const high = valveSizingEngine.calculate({ flow_rate: 100 });
    expect(high.cv_required.value).toBeGreaterThan(low.cv_required.value);
  });

  it("pressure drop matches input", () => {
    const r = valveSizingEngine.calculate({
      inlet_pressure_bar: 10,
      outlet_pressure_bar: 6,
    });
    expect(r.pressure_drop.value).toBeCloseTo(4.0, 1);
  });

  it("gas flow produces valid Cv", () => {
    const r = valveSizingEngine.calculate({
      fluid: "air",
      flow_rate: 500,
      inlet_pressure_bar: 7,
      outlet_pressure_bar: 5,
    });
    expect(r.cv_required.value).toBeGreaterThan(0);
  });

  it("warns cavitation with low sigma", () => {
    const r = valveSizingEngine.calculate({
      fluid: "water",
      inlet_pressure_bar: 2,
      outlet_pressure_bar: 0.5,
      temperature_c: 80,
    });
    // sigma = (P1 - Pv) / dP = (2 - 0.03) / 1.5 ≈ 1.3 < 2
    expect(r.warnings.some(w => w.includes("avitation"))).toBe(true);
  });

  it("recommended size > 0", () => {
    const r = valveSizingEngine.calculate({});
    expect(r.recommended_size.value).toBeGreaterThan(0);
  });

  it("valve opening between 0 and 100", () => {
    const r = valveSizingEngine.calculate({});
    expect(r.valve_opening_pct.value).toBeGreaterThan(0);
    expect(r.valve_opening_pct.value).toBeLessThanOrEqual(100);
  });

  it("noise level > 0 for flowing valve", () => {
    const r = valveSizingEngine.calculate({});
    expect(r.noise_level.value).toBeGreaterThan(0);
  });

  it("velocity > 0", () => {
    const r = valveSizingEngine.calculate({});
    expect(r.velocity.value).toBeGreaterThan(0);
  });
});
