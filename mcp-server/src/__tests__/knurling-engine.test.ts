/**
 * Tests for KnurlingEngine
 */
import { describe, it, expect } from "vitest";
import {
  KnurlingEngine,
} from "../engines/KnurlingEngine.js";

describe("KnurlingEngine", () => {
  const engine = new KnurlingEngine();

  // ── Knurl Calc ────────────────────────────────────────────────

  it("calculates diamond knurl on 20mm bar", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 15,
      material_iso_group: "P",
    });
    expect(r.pitch.value).toBeGreaterThan(0);
    expect(r.blank_diameter.value).toBeLessThan(20);
    expect(r.finished_od.value).toBeGreaterThan(20);
    expect(r.tooth_depth.value).toBeGreaterThan(0);
    expect(r.cutting_speed.value).toBe(20);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.radial_force.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.pattern).toBe("diamond");
    expect(r.method).toBe("form");
  });

  it("cut knurling keeps blank = workpiece diameter", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 25,
      knurl_length_mm: 10,
      method: "cut",
    });
    expect(r.blank_diameter.value).toBe(25);
    expect(r.finished_od.value).toBe(25);
  });

  it("form knurling reduces blank diameter", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 25,
      knurl_length_mm: 10,
      pitch_mm: 1.0,
      method: "form",
    });
    // Blank = 25 - 0.5 × 1.0 = 24.5
    expect(r.blank_diameter.value).toBeCloseTo(24.5, 1);
    // Finished = 25 + 0.5 × 1.0 = 25.5
    expect(r.finished_od.value).toBeCloseTo(25.5, 1);
  });

  it("tooth depth is half the pitch", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      pitch_mm: 1.2,
    });
    expect(r.tooth_depth.value).toBeCloseTo(0.6, 2);
  });

  it("uses custom pitch", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      pitch_mm: 0.8,
    });
    expect(r.pitch.value).toBe(0.8);
  });

  it("selects standard pitch automatically", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 30,
      knurl_length_mm: 15,
    });
    // Should be one of the DIN 82 standard pitches
    const stdPitches = [0.5, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0];
    expect(stdPitches).toContain(r.pitch.value);
  });

  it("higher speed for aluminum", () => {
    const steel = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      material_iso_group: "P",
    });
    const alu = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      material_iso_group: "N",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("higher force for harder material", () => {
    const steel = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      pitch_mm: 1.0,
      material_iso_group: "P",
    });
    const hard = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
      pitch_mm: 1.0,
      material_iso_group: "H",
    });
    expect(hard.radial_force.value).toBeGreaterThan(
      steel.radial_force.value
    );
  });

  it("warns on small diameter form knurling", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 8,
      knurl_length_mm: 5,
      method: "form",
    });
    expect(
      r.warnings.some(w => w.includes("cut knurling"))
    ).toBe(true);
  });

  it("warns on high radial force", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 30,
      knurl_length_mm: 25,
      pitch_mm: 2.0,
      material_iso_group: "H",
    });
    expect(
      r.warnings.some(w => w.includes("radial force"))
    ).toBe(true);
  });

  it("warns on long knurl relative to diameter", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 10,
      knurl_length_mm: 20,
      method: "form",
    });
    expect(
      r.warnings.some(w => w.includes("deflection"))
    ).toBe(true);
  });

  // ── Blank Diameter ────────────────────────────────────────────

  it("calculates blank diameter for form knurling", () => {
    const r = engine.blankDiameter({
      finished_diameter_mm: 25,
      pitch_mm: 1.0,
      method: "form",
    });
    expect(r.blank_diameter.value).toBeCloseTo(24.5, 1);
    expect(r.material_displacement.value).toBe(0.5);
  });

  it("no displacement for cut knurling", () => {
    const r = engine.blankDiameter({
      finished_diameter_mm: 25,
      pitch_mm: 1.0,
      method: "cut",
    });
    expect(r.blank_diameter.value).toBe(25);
    expect(r.material_displacement.value).toBe(0);
  });

  it("reports circumference divisions", () => {
    const r = engine.blankDiameter({
      finished_diameter_mm: 25,
      pitch_mm: 1.0,
    });
    // π × 25 / 1.0 ≈ 78.5
    expect(r.circumference_divisions.value).toBeCloseTo(78.5, 0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.knurl({
      workpiece_diameter_mm: 20,
      knurl_length_mm: 10,
    });
    for (const key of [
      "pitch", "blank_diameter", "finished_od",
      "tooth_depth", "cutting_speed", "spindle_rpm",
      "feed_rate", "radial_force", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { knurlingEngine } = await import(
      "../engines/KnurlingEngine.js"
    );
    expect(knurlingEngine).toBeInstanceOf(KnurlingEngine);
  });
});
