/**
 * Tests for KeyseatCutterEngine
 */
import { describe, it, expect } from "vitest";
import { KeyseatCutterEngine } from "../engines/KeyseatCutterEngine.js";

describe("KeyseatCutterEngine", () => {
  const engine = new KeyseatCutterEngine();

  // ── Parallel Key ────────────────────────────────────────────

  it("selects key for 25mm shaft", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 25,
    });
    // 22-30mm range: 8×7 key
    expect(r.key_width.value).toBe(8);
    expect(r.key_height.value).toBe(7);
    expect(r.shaft_depth.value).toBeGreaterThan(0);
    expect(r.hub_depth.value).toBeGreaterThan(0);
    expect(r.cutter_diameter.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.standard).toContain("DIN");
  });

  it("selects key for 50mm shaft", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 50,
    });
    // 50-58mm range: 16×10 key
    expect(r.key_width.value).toBe(16);
    expect(r.key_height.value).toBe(10);
  });

  it("allows custom key dimensions", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 30,
      key_width_mm: 10,
      key_height_mm: 8,
    });
    expect(r.key_width.value).toBe(10);
    expect(r.key_height.value).toBe(8);
    expect(r.standard).toContain("Custom");
  });

  it("returns correct fit tolerance", () => {
    const normal = engine.calculate({
      shaft_diameter_mm: 25,
      fit_class: "normal",
    });
    const close = engine.calculate({
      shaft_diameter_mm: 25,
      fit_class: "close",
    });
    expect(normal.slot_tolerance.value).toBeGreaterThan(
      close.slot_tolerance.value
    );
  });

  it("warns on small shaft below DIN range", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 4,
    });
    expect(
      r.warnings.some(w => w.includes("below"))
    ).toBe(true);
  });

  it("warns on large shaft above DIN range", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 150,
    });
    expect(
      r.warnings.some(w => w.includes("above"))
    ).toBe(true);
  });

  it("adjusts speed for material", () => {
    const steel = engine.calculate({
      shaft_diameter_mm: 25,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      shaft_diameter_mm: 25,
      material_iso_group: "N",
    });
    expect(alu.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  // ── Woodruff Key ────────────────────────────────────────────

  it("auto-selects Woodruff key for shaft", () => {
    const r = engine.woodruff({
      shaft_diameter_mm: 30,
    });
    expect(r.key_number).toBeTruthy();
    expect(r.cutter_diameter.value).toBeGreaterThan(0);
    expect(r.cutter_width.value).toBeGreaterThan(0);
    expect(r.slot_depth.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
  });

  it("uses specified Woodruff key number", () => {
    const r = engine.woodruff({
      shaft_diameter_mm: 30,
      key_number: "505",
    });
    expect(r.key_number).toBe("505");
    expect(r.cutter_diameter.value).toBe(31.75);
    expect(r.cutter_width.value).toBe(3.97);
  });

  it("warns on oversized Woodruff cutter", () => {
    const r = engine.woodruff({
      shaft_diameter_mm: 20,
      key_number: "810",
    });
    expect(
      r.warnings.some(w => w.includes("clearance"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      shaft_diameter_mm: 25,
    });
    for (const key of [
      "key_width", "key_height", "shaft_depth",
      "hub_depth", "cutter_diameter", "spindle_rpm",
      "feed_rate", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { keyseatCutterEngine } = await import(
      "../engines/KeyseatCutterEngine.js"
    );
    expect(keyseatCutterEngine).toBeInstanceOf(
      KeyseatCutterEngine
    );
  });
});
