/**
 * SwissBarProductionEngine — per-engine tests (MS6b / U-LPS24)
 */
import { describe, it, expect } from "vitest";
import { swissBarProductionEngine } from "../engines/SwissBarProductionEngine.js";
import type { BarFeederDialect } from "../engines/SwissBarProductionEngine.js";

const DIALECTS: BarFeederDialect[] = ["citizen", "star", "tsugami", "mazak", "dmg_mori"];

function base() {
  return {
    dialect: "citizen" as const,
    bar_length_mm: 3000,
    grip_length_mm: 50,
    part_length_mm: 25,
    cutoff_width_mm: 3,
    facing_stock_mm: 0.5,
    batch_quantity: 200,
    magazine_capacity: 12,
    cycle_time_s: 45,
  };
}

describe("SwissBarProductionEngine", () => {
  it("parts-per-bar formula: 3m bar, 25mm part, 3mm cutoff → ~103 parts", () => {
    const r = swissBarProductionEngine.plan(base());
    // stride = 25 + 3 + 0.5 = 28.5 mm; usable = 3000 - 50 = 2950 → 103 parts.
    expect(r.stride_mm).toBe(28.5);
    expect(r.parts_per_bar).toBe(103);
  });

  it("remnant is usable when it exceeds one full stride", () => {
    const r = swissBarProductionEngine.plan({
      ...base(),
      bar_length_mm: 3000,
      part_length_mm: 100,
      cutoff_width_mm: 5,
      facing_stock_mm: 0,
    });
    // stride = 105 mm; usable = 2950 → 28 parts, remnant = 2950 - 28·105 = 10 mm (not usable).
    expect(r.parts_per_bar).toBe(28);
    expect(r.remnant_usable_for_one_more).toBe(false);
  });

  it("bars_required = ceil(batch / parts_per_bar)", () => {
    const r = swissBarProductionEngine.plan(base());
    expect(r.bars_required).toBe(Math.ceil(200 / r.parts_per_bar));
  });

  it("magazine_reload_needed when bars_required > magazine_capacity", () => {
    const r = swissBarProductionEngine.plan({ ...base(), batch_quantity: 5000, magazine_capacity: 12 });
    expect(r.magazine_reload_needed).toBe(true);
    expect(r.warnings.some(w => /reload/.test(w))).toBe(true);
  });

  it("no reload needed when bars ≤ magazine", () => {
    const r = swissBarProductionEngine.plan({ ...base(), batch_quantity: 100, magazine_capacity: 12 });
    expect(r.magazine_reload_needed).toBe(false);
  });

  it.each(DIALECTS)("dialect %s supplies correct bar-feed M-code", (dialect) => {
    const r = swissBarProductionEngine.plan({ ...base(), dialect });
    expect(r.mcodes.bar_feed).toMatch(/^M\d+/);
    expect(r.mcodes.bar_pull).toMatch(/^M\d+/);
    expect(r.mcodes.bar_end_check).toMatch(/^M\d+/);
  });

  it("Citizen uses M82 / M83 / M67", () => {
    const r = swissBarProductionEngine.plan({ ...base(), dialect: "citizen" });
    expect(r.mcodes.bar_feed).toBe("M82");
    expect(r.mcodes.bar_pull).toBe("M83");
    expect(r.mcodes.bar_end_check).toBe("M67");
  });

  it("Star uses M220 / M221 / M230", () => {
    const r = swissBarProductionEngine.plan({ ...base(), dialect: "star" });
    expect(r.mcodes.bar_feed).toBe("M220");
    expect(r.mcodes.bar_pull).toBe("M221");
    expect(r.mcodes.bar_end_check).toBe("M230");
  });

  it("bar_end_strategy=skip_signal emits G31", () => {
    const r = swissBarProductionEngine.plan({ ...base(), bar_end_strategy: "skip_signal" });
    expect(r.bar_end_detection_lines.some(l => l.startsWith("G31"))).toBe(true);
  });

  it("bar_end_strategy=overtravel does not emit G31", () => {
    const r = swissBarProductionEngine.plan({ ...base(), bar_end_strategy: "overtravel" });
    expect(r.bar_end_detection_lines.some(l => l.startsWith("G31"))).toBe(false);
    expect(r.bar_end_detection_lines.some(l => /overtravel/i.test(l))).toBe(true);
  });

  it("bar_end_strategy=feeder_signal emits the dialect bar-end M-code", () => {
    const r = swissBarProductionEngine.plan({
      ...base(),
      dialect: "star",
      bar_end_strategy: "feeder_signal",
    });
    expect(r.bar_end_detection_lines.some(l => l.includes("M230"))).toBe(true);
  });

  it("generic dialect respects custom_mcodes override", () => {
    const r = swissBarProductionEngine.plan({
      ...base(),
      dialect: "generic",
      custom_mcodes: { bar_feed: "M111", bar_pull: "M112", bar_end_check: "M113" },
    });
    expect(r.mcodes.bar_feed).toBe("M111");
    expect(r.mcodes.bar_pull).toBe("M112");
    expect(r.mcodes.bar_end_check).toBe("M113");
  });

  it("warns when bar is too short for grip + one part + cutoff", () => {
    const r = swissBarProductionEngine.plan({ ...base(), bar_length_mm: 70 });
    expect(r.warnings.some(w => /too short/.test(w))).toBe(true);
  });

  it("parts_per_bar=0 when part exceeds usable bar length", () => {
    const r = swissBarProductionEngine.plan({
      ...base(),
      bar_length_mm: 100,
      part_length_mm: 80,
    });
    expect(r.parts_per_bar).toBe(0);
    expect(r.warnings.some(w => /parts_per_bar is 0/.test(w))).toBe(true);
  });

  it("run_time_s = bars · (parts · cycle + change)", () => {
    const r = swissBarProductionEngine.plan({ ...base(), bar_change_time_s: 30 });
    const expected = r.bars_required * (r.parts_per_bar * 45 + 30);
    expect(r.run_time_s).toBeCloseTo(expected, 1);
  });
});
