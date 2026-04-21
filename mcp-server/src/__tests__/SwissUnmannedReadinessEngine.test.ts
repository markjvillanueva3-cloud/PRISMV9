/**
 * SwissUnmannedReadinessEngine — per-engine tests (MS6b / U-LPS25)
 */
import { describe, it, expect } from "vitest";
import { swissUnmannedReadinessEngine } from "../engines/SwissUnmannedReadinessEngine.js";

function greenBase() {
  // Deliberately generous numbers — every factor passes with ≥ 20 % margin.
  return {
    batch_quantity: 100,
    cycle_time_s: 30,              // batch duration 50 min = 0.833 h
    chip_volume_mm3_per_part: 200,
    conveyor_rate_mm3_s: 50,       // need ~6.67/s, have 50 → 650% margin
    coolant_filter_life_h: 10,     // need 0.83 h
    coolant_temperature_c: 25,
    coolant_max_temperature_c: 38,
    bars_required: 2,
    magazine_capacity: 12,
    bin_capacity_parts: 500,
    part_weight_g: 50,
    bin_max_load_kg: 50,
    tool_life_min: 120,
    available_inserts: 4,          // 4 × 120 min / 0.5 min per part = 960 parts capacity
  };
}

describe("SwissUnmannedReadinessEngine", () => {
  it("GREEN verdict when all 5 factors pass with ≥20% margin", () => {
    const r = swissUnmannedReadinessEngine.assess(greenBase());
    expect(r.verdict).toBe("GREEN");
    expect(r.factors.every(f => f.pass)).toBe(true);
  });

  it("returns 5 factor reports in order", () => {
    const r = swissUnmannedReadinessEngine.assess(greenBase());
    expect(r.factors.map(f => f.factor)).toEqual([
      "chip_evacuation",
      "coolant_health",
      "bar_magazine",
      "part_catcher",
      "tool_life",
    ]);
  });

  it("YELLOW when exactly one (non-critical) factor fails within 50% deficit", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      conveyor_rate_mm3_s: 5, // need 6.67/s, 5/s short by ~25% → YELLOW not RED
    });
    expect(r.verdict).toBe("YELLOW");
  });

  it("RED when ≥2 factors fail (mild deficits)", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      conveyor_rate_mm3_s: 5,       // 25% short (chip)
      coolant_filter_life_h: 0.5,   // below 0.833 h (coolant)
    });
    expect(r.verdict).toBe("RED");
  });

  it("RED when any critical factor (bar_magazine) fails", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      bars_required: 20, // exceeds magazine capacity
    });
    expect(r.verdict).toBe("RED");
    expect(r.factors.find(f => f.factor === "bar_magazine")!.pass).toBe(false);
  });

  it("RED when any critical factor (part_catcher) fails", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      bin_capacity_parts: 5, // overflow
    });
    expect(r.verdict).toBe("RED");
    expect(r.factors.find(f => f.factor === "part_catcher")!.pass).toBe(false);
  });

  it("flags severe deficit (>50% short) as RED even for non-critical factor", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      tool_life_min: 1, // grossly undersized
      available_inserts: 1,
    });
    expect(r.verdict).toBe("RED");
  });

  it("coolant health factor fails when temperature exceeds max", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      coolant_temperature_c: 45,
      coolant_max_temperature_c: 40,
    });
    expect(r.factors.find(f => f.factor === "coolant_health")!.pass).toBe(false);
  });

  it("coolant health factor fails when filter life < batch duration", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      coolant_filter_life_h: 0.1, // batch needs 0.833 h
    });
    expect(r.factors.find(f => f.factor === "coolant_health")!.pass).toBe(false);
  });

  it("tool life factor accounts for multiple available inserts", () => {
    const base = greenBase();
    const many = swissUnmannedReadinessEngine.assess({ ...base, available_inserts: 10 });
    const few = swissUnmannedReadinessEngine.assess({ ...base, available_inserts: 1 });
    expect(many.factors.find(f => f.factor === "tool_life")!.margin_pct)
      .toBeGreaterThan(few.factors.find(f => f.factor === "tool_life")!.margin_pct);
  });

  it("YELLOW when a factor passes but margin < 20%", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      magazine_capacity: 2, // needs 2, has exactly 2 → 0% margin
    });
    expect(r.verdict).toBe("YELLOW");
  });

  it("batch_duration_h correct (batch · cycle / 3600)", () => {
    const r = swissUnmannedReadinessEngine.assess(greenBase());
    expect(r.batch_duration_h).toBeCloseTo((100 * 30) / 3600, 2);
  });

  it("reasons array explains the verdict", () => {
    const red = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      bars_required: 20,
    });
    expect(red.reasons.some(r => /Critical/.test(r))).toBe(true);
    const green = swissUnmannedReadinessEngine.assess(greenBase());
    expect(green.reasons.some(r => /lights-out approved/.test(r))).toBe(true);
  });

  it("part catcher fails on weight even if count fits", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      part_weight_g: 5000, // 100 parts × 5kg = 500kg > 50kg bin
    });
    expect(r.factors.find(f => f.factor === "part_catcher")!.pass).toBe(false);
    expect(r.verdict).toBe("RED");
  });

  it("margin_pct is negative when factor fails", () => {
    const r = swissUnmannedReadinessEngine.assess({
      ...greenBase(),
      bars_required: 20, // magazine 12 < 20
    });
    const bar = r.factors.find(f => f.factor === "bar_magazine")!;
    expect(bar.margin_pct).toBeLessThan(0);
  });
});
