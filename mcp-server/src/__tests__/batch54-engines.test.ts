/**
 * Batch 54 — StampingDie, WireDrawing, RollingMill
 * @milestone FORGE-ENGINES-BATCH54
 */
import { describe, it, expect } from "vitest";
import { stampingDieEngine } from "../engines/StampingDieEngine.js";
import { wireDrawingEngine } from "../engines/WireDrawingEngine.js";
import { rollingMillEngine } from "../engines/RollingMillEngine.js";

// ── StampingDieEngine ──────────────────────────────────────────────
describe("StampingDieEngine", () => {
  const base = { sheet_thickness_mm: 2, cut_perimeter_mm: 300 };

  it("cutting force > 0", () => {
    const r = stampingDieEngine.calculate(base);
    expect(r.cutting_force_kN.value).toBeGreaterThan(0);
  });

  it("total force > cutting force", () => {
    const r = stampingDieEngine.calculate(base);
    expect(r.total_force_kN.value).toBeGreaterThan(
      r.cutting_force_kN.value
    );
  });

  it("thicker sheet needs more force", () => {
    const thin = stampingDieEngine.calculate({
      ...base, sheet_thickness_mm: 1,
    });
    const thick = stampingDieEngine.calculate({
      ...base, sheet_thickness_mm: 5,
    });
    expect(thick.cutting_force_kN.value).toBeGreaterThan(
      thin.cutting_force_kN.value
    );
  });

  it("die clearance > 0", () => {
    const r = stampingDieEngine.calculate(base);
    expect(r.die_clearance_mm.value).toBeGreaterThan(0);
  });

  it("energy per stroke > 0", () => {
    const r = stampingDieEngine.calculate(base);
    expect(r.energy_per_stroke_J.value).toBeGreaterThan(0);
  });

  it("stainless needs more force than aluminum", () => {
    const alu = stampingDieEngine.calculate({
      ...base, sheet_material: "aluminum_5052" as const,
    });
    const ss = stampingDieEngine.calculate({
      ...base, sheet_material: "stainless_304" as const,
    });
    expect(ss.cutting_force_kN.value).toBeGreaterThan(
      alu.cutting_force_kN.value
    );
  });

  it("recommendations is array", () => {
    const r = stampingDieEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── WireDrawingEngine ──────────────────────────────────────────────
describe("WireDrawingEngine", () => {
  const base = {
    initial_diameter_mm: 10,
    final_diameter_mm: 5,
  };

  it("total reduction > 0", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.total_reduction_pct.value).toBeGreaterThan(0);
  });

  it("number of passes ≥ 1", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.number_of_passes.value).toBeGreaterThanOrEqual(1);
  });

  it("drawing force > 0", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.drawing_force_kN.value).toBeGreaterThan(0);
  });

  it("larger reduction needs more passes", () => {
    const small = wireDrawingEngine.calculate({
      ...base, final_diameter_mm: 8,
    });
    const big = wireDrawingEngine.calculate({
      ...base, final_diameter_mm: 2,
    });
    expect(big.number_of_passes.value).toBeGreaterThan(
      small.number_of_passes.value
    );
  });

  it("safety factor > 0", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("drawing power > 0", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.drawing_power_kW.value).toBeGreaterThan(0);
  });

  it("exit speed > 0", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(r.exit_speed_m_min.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = wireDrawingEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── RollingMillEngine ──────────────────────────────────────────────
describe("RollingMillEngine", () => {
  const base = {
    entry_thickness_mm: 5,
    exit_thickness_mm: 3,
    strip_width_mm: 300,
    roll_diameter_mm: 500,
  };

  it("roll force > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.roll_force_kN.value).toBeGreaterThan(0);
  });

  it("reduction matches input", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.reduction_pct.value).toBeCloseTo(40, 0);
  });

  it("higher reduction needs more force", () => {
    const lo = rollingMillEngine.calculate({
      ...base, exit_thickness_mm: 4.5,
    });
    const hi = rollingMillEngine.calculate({
      ...base, exit_thickness_mm: 2,
    });
    expect(hi.roll_force_kN.value).toBeGreaterThan(
      lo.roll_force_kN.value
    );
  });

  it("contact length > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.contact_length_mm.value).toBeGreaterThan(0);
  });

  it("rolling power > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.rolling_power_kW.value).toBeGreaterThan(0);
  });

  it("exit speed > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.exit_speed_m_min.value).toBeGreaterThan(0);
  });

  it("max reduction > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.max_reduction_pct.value).toBeGreaterThan(0);
  });

  it("mean flow stress > 0", () => {
    const r = rollingMillEngine.calculate(base);
    expect(r.mean_flow_stress_MPa.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = rollingMillEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
