/**
 * Tests for TapDrillEngine
 */
import { describe, it, expect } from "vitest";
import { TapDrillEngine } from "../engines/TapDrillEngine.js";

describe("TapDrillEngine", () => {
  const engine = new TapDrillEngine();

  it("calculates M10 tap drill at 75%", () => {
    const r = engine.calculate({
      thread_size: "M10",
      thread_percentage: 75,
    });
    // M10x1.5: drill = 10 - 0.75 × 1.5 = 8.875
    expect(r.tap_drill_size.value).toBeCloseTo(8.88, 1);
    expect(r.major_diameter.value).toBe(10);
    expect(r.pitch.value).toBe(1.5);
    expect(r.thread_percentage.value).toBe(75);
  });

  it("calculates M6 coarse tap drill", () => {
    const r = engine.calculate({ thread_size: "M6" });
    // M6x1.0: drill = 6 - 0.75 × 1.0 = 5.25
    expect(r.tap_drill_size.value).toBeCloseTo(5.25, 1);
    expect(r.pitch.value).toBe(1.0);
  });

  it("parses metric fine thread", () => {
    const r = engine.calculate({
      thread_size: "M10x1.0",
    });
    expect(r.major_diameter.value).toBe(10);
    expect(r.pitch.value).toBe(1.0);
    // drill = 10 - 0.75 × 1.0 = 9.25
    expect(r.tap_drill_size.value).toBeCloseTo(9.25, 1);
  });

  it("parses UNC thread", () => {
    const r = engine.calculate({
      thread_size: "3/8-16",
    });
    expect(r.major_diameter.value).toBeCloseTo(9.525, 1);
    expect(r.pitch.value).toBeCloseTo(1.5875, 2);
    expect(r.tap_drill_size.value).toBeGreaterThan(0);
  });

  it("higher thread % = smaller drill", () => {
    const t65 = engine.calculate({
      thread_size: "M10",
      thread_percentage: 65,
    });
    const t85 = engine.calculate({
      thread_size: "M10",
      thread_percentage: 85,
    });
    expect(t85.tap_drill_size.value).toBeLessThan(
      t65.tap_drill_size.value
    );
  });

  it("calculates thread depth", () => {
    const r = engine.calculate({ thread_size: "M10" });
    // H = 1.5 × 0.866 = 1.299
    expect(r.thread_depth.value).toBeCloseTo(1.299, 1);
  });

  it("adjusts tapping speed by material", () => {
    const steel = engine.calculate({
      thread_size: "M10",
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      thread_size: "M10",
      material_iso_group: "N",
    });
    expect(alu.tapping_speed.value).toBeGreaterThan(
      steel.tapping_speed.value
    );
  });

  it("estimates tapping torque", () => {
    const r = engine.calculate({
      thread_size: "M10",
      material_iso_group: "P",
    });
    expect(r.tapping_torque.value).toBeGreaterThan(0);
    expect(r.tapping_torque.unit).toBe("Nm");
  });

  it("recommends form tap for aluminum", () => {
    const r = engine.calculate({
      thread_size: "M8",
      material_iso_group: "N",
    });
    expect(r.tap_type).toBe("form");
  });

  it("warns on high thread percentage", () => {
    const r = engine.calculate({
      thread_size: "M10",
      thread_percentage: 90,
    });
    expect(
      r.warnings.some(w => w.includes("torque"))
    ).toBe(true);
  });

  it("warns on blind hole", () => {
    const r = engine.calculate({
      thread_size: "M10",
      is_blind_hole: true,
    });
    expect(
      r.warnings.some(w => w.includes("Blind"))
    ).toBe(true);
  });

  it("warns on difficult material", () => {
    const r = engine.calculate({
      thread_size: "M10",
      material_iso_group: "S",
    });
    expect(
      r.warnings.some(w => w.includes("Difficult"))
    ).toBe(true);
  });

  it("handles unknown thread gracefully", () => {
    const r = engine.calculate({
      thread_size: "UNKNOWN",
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.tap_drill_size.value).toBeGreaterThan(0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({ thread_size: "M10" });
    for (const key of [
      "tap_drill_size", "major_diameter", "pitch",
      "thread_depth", "tapping_speed", "tapping_torque",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { tapDrillEngine } = await import(
      "../engines/TapDrillEngine.js"
    );
    expect(tapDrillEngine).toBeInstanceOf(TapDrillEngine);
  });
});
