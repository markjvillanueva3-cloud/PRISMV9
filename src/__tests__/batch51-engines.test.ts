/**
 * Batch 51 — SheetMetalNesting, HydraulicPress, CentrifugalPump
 * @milestone FORGE-ENGINES-BATCH51
 */
import { describe, it, expect } from "vitest";
import { sheetMetalNestingEngine } from "../engines/SheetMetalNestingEngine.js";
import { hydraulicPressEngine } from "../engines/HydraulicPressEngine.js";
import { centrifugalPumpEngine } from "../engines/CentrifugalPumpEngine.js";

// ── SheetMetalNestingEngine ────────────────────────────────────────
describe("SheetMetalNestingEngine", () => {
  const base = {
    parts: [
      { id: "A", length_mm: 200, width_mm: 100, quantity: 10 },
      { id: "B", length_mm: 150, width_mm: 80, quantity: 8 },
    ],
    sheet_length_mm: 2500,
    sheet_width_mm: 1250,
    sheet_thickness_mm: 2,
  };

  it("sheets required ≥ 1", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(r.sheets_required.value).toBeGreaterThanOrEqual(1);
  });

  it("utilization between 0 and 100", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(r.material_utilization_pct.value).toBeGreaterThan(0);
    expect(r.material_utilization_pct.value).toBeLessThanOrEqual(100);
  });

  it("scrap + utilization ≈ 100", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(r.scrap_pct.value + r.material_utilization_pct.value).toBeCloseTo(100, 0);
  });

  it("more parts need more sheets", () => {
    const big = {
      ...base,
      parts: [{ id: "X", length_mm: 500, width_mm: 400, quantity: 50 }],
    };
    const r = sheetMetalNestingEngine.calculate(big);
    expect(r.sheets_required.value).toBeGreaterThan(1);
  });

  it("material cost > 0", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(r.material_cost.value).toBeGreaterThan(0);
  });

  it("parts per sheet > 0", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(r.parts_per_sheet.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = sheetMetalNestingEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── HydraulicPressEngine ───────────────────────────────────────────
describe("HydraulicPressEngine", () => {
  const base = { required_force_kN: 500 };

  it("press capacity ≥ required force", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.press_capacity_kN.value).toBeGreaterThanOrEqual(500);
  });

  it("cylinder bore > 0", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.cylinder_bore_mm.value).toBeGreaterThan(0);
  });

  it("cycle time > 0", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.cycle_time_s.value).toBeGreaterThan(0);
  });

  it("higher force needs larger bore", () => {
    const lo = hydraulicPressEngine.calculate({ required_force_kN: 100 });
    const hi = hydraulicPressEngine.calculate({ required_force_kN: 1000 });
    expect(hi.cylinder_bore_mm.value).toBeGreaterThan(lo.cylinder_bore_mm.value);
  });

  it("energy per stroke > 0", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.energy_per_stroke_kJ.value).toBeGreaterThan(0);
  });

  it("pump power > 0", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.pump_power_kW.value).toBeGreaterThan(0);
  });

  it("strokes per min > 0", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(r.strokes_per_min.value).toBeGreaterThan(0);
  });

  it("coining needs more capacity than bending", () => {
    const bend = hydraulicPressEngine.calculate({ ...base, operation: "bending" as const });
    const coin = hydraulicPressEngine.calculate({ ...base, operation: "coining" as const });
    expect(coin.press_capacity_kN.value).toBeGreaterThan(bend.press_capacity_kN.value);
  });

  it("recommendations is array", () => {
    const r = hydraulicPressEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── CentrifugalPumpEngine ──────────────────────────────────────────
describe("CentrifugalPumpEngine", () => {
  const base = { flow_rate_m3_h: 50, total_head_m: 30 };

  it("hydraulic power > 0", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.hydraulic_power_kW.value).toBeGreaterThan(0);
  });

  it("shaft power > hydraulic power", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.shaft_power_kW.value).toBeGreaterThan(r.hydraulic_power_kW.value);
  });

  it("motor power ≥ shaft power", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.motor_power_kW.value).toBeGreaterThanOrEqual(r.shaft_power_kW.value);
  });

  it("efficiency between 40-90%", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.pump_efficiency_pct.value).toBeGreaterThan(40);
    expect(r.pump_efficiency_pct.value).toBeLessThanOrEqual(90);
  });

  it("more flow needs more power", () => {
    const lo = centrifugalPumpEngine.calculate({ ...base, flow_rate_m3_h: 10 });
    const hi = centrifugalPumpEngine.calculate({ ...base, flow_rate_m3_h: 200 });
    expect(hi.shaft_power_kW.value).toBeGreaterThan(lo.shaft_power_kW.value);
  });

  it("NPSH available is finite", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(Number.isFinite(r.npsh_available_m.value)).toBe(true);
  });

  it("specific speed > 0", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.specific_speed.value).toBeGreaterThan(0);
  });

  it("impeller diameter > 0", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(r.impeller_diameter_mm.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = centrifugalPumpEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
