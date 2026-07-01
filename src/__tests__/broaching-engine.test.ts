/**
 * Tests for BroachingEngine
 */
import { describe, it, expect } from "vitest";
import { BroachingEngine } from "../engines/BroachingEngine.js";

describe("BroachingEngine", () => {
  const engine = new BroachingEngine();

  it("calculates keyway broaching in steel", () => {
    const r = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 30,
      cut_depth_mm: 4,
      cut_width_mm: 8,
      material_iso_group: "P",
      material_hardness_hrc: 28,
    });
    expect(r.cutting_force.value).toBeGreaterThan(100);
    expect(r.pull_force.value).toBeGreaterThanOrEqual(
      r.cutting_force.value
    );
    expect(r.cutting_speed.value).toBeGreaterThan(2);
    expect(r.cutting_speed.value).toBeLessThan(20);
    expect(r.rise_per_tooth.value).toBeGreaterThan(0.02);
    expect(r.rise_per_tooth.value).toBeLessThan(0.15);
    expect(r.number_of_cutting_teeth.value).toBeGreaterThan(10);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.power.value).toBeGreaterThan(0);
    expect(r.minimum_tonnage.value).toBeGreaterThan(0);
  });

  it("calculates for aluminum with higher speed", () => {
    const steel = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 25,
      cut_depth_mm: 3,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 25,
      cut_depth_mm: 3,
      material_iso_group: "N",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
    expect(alu.cutting_force.value).toBeLessThan(
      steel.cutting_force.value
    );
  });

  it("selects pull broach for long keyway", () => {
    const r = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 120,
      cut_depth_mm: 5,
      material_iso_group: "P",
    });
    expect(r.broach_type).toBe("pull");
  });

  it("selects push broach for short keyway", () => {
    const r = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 30,
      cut_depth_mm: 3,
      material_iso_group: "P",
    });
    expect(r.broach_type).toBe("push");
  });

  it("reduces rise for high hardness", () => {
    const soft = engine.calculate({
      profile_type: "spline",
      cut_length_mm: 40,
      cut_depth_mm: 5,
      material_iso_group: "P",
      material_hardness_hrc: 25,
    });
    const hard = engine.calculate({
      profile_type: "spline",
      cut_length_mm: 40,
      cut_depth_mm: 5,
      material_iso_group: "P",
      material_hardness_hrc: 50,
    });
    expect(hard.rise_per_tooth.value).toBeLessThan(
      soft.rise_per_tooth.value
    );
  });

  it("warns on dry broaching", () => {
    const r = engine.calculate({
      profile_type: "keyway",
      cut_length_mm: 25,
      cut_depth_mm: 3,
      coolant: "dry",
      material_iso_group: "P",
    });
    expect(r.warnings.some(w => w.includes("Dry"))).toBe(true);
  });

  // ── Keyway Lookup ─────────────────────────────────────────────

  it("looks up ANSI B17.1 keyway for 20mm bore", () => {
    const r = engine.keyway({
      bore_diameter_mm: 20,
      bore_length_mm: 25,
      material_iso_group: "P",
    });
    expect(r.keyway_width.value).toBe(6);
    expect(r.keyway_depth.value).toBe(3.5);
    expect(r.cutting_force.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("looks up keyway for 48mm bore", () => {
    const r = engine.keyway({
      bore_diameter_mm: 48,
      bore_length_mm: 40,
    });
    expect(r.keyway_width.value).toBe(14);
    expect(r.keyway_depth.value).toBe(5.5);
  });

  it("warns for non-standard bore size", () => {
    const r = engine.keyway({
      bore_diameter_mm: 4,
      bore_length_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("No ANSI"))
    ).toBe(true);
  });

  it("accepts custom keyway dimensions", () => {
    const r = engine.keyway({
      bore_diameter_mm: 25,
      bore_length_mm: 30,
      keyway_width_mm: 7,
      keyway_depth_mm: 3.5,
    });
    expect(r.keyway_width.value).toBe(7);
    expect(r.keyway_depth.value).toBe(3.5);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      profile_type: "hex",
      cut_length_mm: 20,
      cut_depth_mm: 5,
      material_iso_group: "K",
    });
    for (const key of [
      "cutting_force", "pull_force", "cutting_speed",
      "rise_per_tooth", "cycle_time", "power",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { broachingEngine } = await import(
      "../engines/BroachingEngine.js"
    );
    expect(broachingEngine).toBeInstanceOf(BroachingEngine);
  });
});
