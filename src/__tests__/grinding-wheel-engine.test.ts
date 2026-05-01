/**
 * Tests for GrindingWheelEngine
 */
import { describe, it, expect } from "vitest";
import { GrindingWheelEngine } from "../engines/GrindingWheelEngine.js";

describe("GrindingWheelEngine", () => {
  const engine = new GrindingWheelEngine();

  it("calculates surface grinding parameters", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "P",
      material_hardness_hrc: 45,
    });
    expect(r.wheel_speed.value).toBe(30);
    expect(r.wheel_rpm.value).toBeGreaterThan(0);
    expect(r.table_speed.value).toBe(15);
    expect(r.depth_of_cut.value).toBe(0.02);
    expect(r.grinding_power.value).toBeGreaterThan(0);
    expect(r.recommended_grade).toContain("WA");
    expect(r.recommended_grit).toBe(60);
    expect(r.dressing_interval.value).toBeGreaterThan(0);
  });

  it("selects CBN for hardened steel", () => {
    const r = engine.calculate({
      operation: "cylindrical_od",
      wheel_diameter_mm: 300,
      material_iso_group: "H",
      material_hardness_hrc: 62,
    });
    expect(r.recommended_grade).toContain("CBN");
    expect(r.g_ratio.value).toBe(5000);
  });

  it("selects SiC for aluminum", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "N",
    });
    expect(r.recommended_grade).toContain("C");
  });

  it("selects SG ceramic for superalloy", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "S",
    });
    expect(r.recommended_grade).toContain("SG");
  });

  it("softer grade for harder material", () => {
    const soft = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "P",
      material_hardness_hrc: 30,
    });
    const hard = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "P",
      material_hardness_hrc: 62,
    });
    // Grade format: "WA46-M5-V" vs "WA80-H5-V"
    // Extract grade letter after the dash
    const softGrade = soft.recommended_grade.split("-")[1].charAt(0);
    const hardGrade = hard.recommended_grade.split("-")[1].charAt(0);
    // Hard material gets softer grade (earlier letter)
    expect(hardGrade.charCodeAt(0)).toBeLessThan(
      softGrade.charCodeAt(0)
    );
  });

  it("detects high burn risk", () => {
    // thermalLoad = u(60) × doc(0.5) × speed(30) = 900 > 800
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "H",
      depth_of_cut_mm: 0.5,
      table_speed_mpm: 30,
    });
    expect(r.burn_risk).toBe("high");
    expect(
      r.warnings.some(w => w.includes("burn"))
    ).toBe(true);
  });

  it("low burn risk at light DOC", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      material_iso_group: "N",
      depth_of_cut_mm: 0.005,
    });
    expect(r.burn_risk).toBe("low");
  });

  it("calculates creep-feed parameters", () => {
    const r = engine.calculate({
      operation: "creep_feed",
      wheel_diameter_mm: 300,
      material_iso_group: "P",
    });
    expect(r.depth_of_cut.value).toBe(1.0);
    expect(r.table_speed.value).toBe(0.3);
    expect(r.wheel_speed.value).toBe(25);
  });

  it("warns on deep conventional cut", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
      depth_of_cut_mm: 0.1,
    });
    expect(
      r.warnings.some(w => w.includes("creep-feed"))
    ).toBe(true);
  });

  // ── Wheel Spec Parsing ──────────────────────────────────────

  it("parses standard wheel spec", () => {
    const r = engine.parseWheelSpec("WA60-K5-V");
    expect(r).not.toBeNull();
    expect(r!.abrasive).toBe("WA");
    expect(r!.grit).toBe(60);
    expect(r!.grade).toBe("K");
    expect(r!.structure).toBe(5);
    expect(r!.bond).toBe("V");
  });

  it("parses spaced wheel spec", () => {
    const r = engine.parseWheelSpec("GC 80 J 6 V");
    expect(r).not.toBeNull();
    expect(r!.abrasive).toBe("GC");
    expect(r!.grit).toBe(80);
  });

  it("returns null for invalid spec", () => {
    const r = engine.parseWheelSpec("invalid");
    expect(r).toBeNull();
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      operation: "surface",
      wheel_diameter_mm: 200,
    });
    for (const key of [
      "wheel_speed", "wheel_rpm", "table_speed",
      "depth_of_cut", "specific_energy", "grinding_power",
      "dressing_interval", "g_ratio",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { grindingWheelEngine } = await import(
      "../engines/GrindingWheelEngine.js"
    );
    expect(grindingWheelEngine).toBeInstanceOf(
      GrindingWheelEngine
    );
  });
});
