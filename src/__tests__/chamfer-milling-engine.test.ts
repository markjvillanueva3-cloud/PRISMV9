/**
 * Tests for ChamferMillingEngine
 */
import { describe, it, expect } from "vitest";
import { ChamferMillingEngine } from "../engines/ChamferMillingEngine.js";

describe("ChamferMillingEngine", () => {
  const engine = new ChamferMillingEngine();

  // ── Chamfer Calculation ─────────────────────────────────────

  it("calculates 45° chamfer from width", () => {
    const r = engine.calculate({
      chamfer_width_mm: 1.0,
      tool_diameter_mm: 10,
      num_flutes: 3,
      material_iso_group: "P",
    });
    // 45° → depth = width / tan(45°) = 1.0
    expect(r.chamfer_width.value).toBe(1.0);
    expect(r.chamfer_depth.value).toBeCloseTo(1.0, 2);
    expect(r.effective_diameter.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.programmed_feed.value).toBeGreaterThan(0);
    expect(r.chip_load.value).toBe(0.04);
  });

  it("calculates chamfer from depth", () => {
    const r = engine.calculate({
      chamfer_depth_mm: 0.5,
      chamfer_angle_deg: 30,
      tool_diameter_mm: 10,
      num_flutes: 2,
    });
    // width = 0.5 × tan(30°) ≈ 0.289
    expect(r.chamfer_width.value).toBeCloseTo(0.289, 2);
    expect(r.chamfer_depth.value).toBe(0.5);
  });

  it("defaults to 0.5mm × 45° chamfer", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10,
      num_flutes: 3,
    });
    expect(r.chamfer_width.value).toBe(0.5);
    expect(r.chamfer_depth.value).toBeCloseTo(0.5, 2);
  });

  it("adjusts speed for material", () => {
    const steel = engine.calculate({
      chamfer_width_mm: 0.5,
      tool_diameter_mm: 10,
      num_flutes: 3,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      chamfer_width_mm: 0.5,
      tool_diameter_mm: 10,
      num_flutes: 3,
      material_iso_group: "N",
    });
    expect(alu.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  it("warns on wide chamfer", () => {
    const r = engine.calculate({
      chamfer_width_mm: 5,
      tool_diameter_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("40%"))
    ).toBe(true);
  });

  it("warns on angle/tool mismatch", () => {
    const r = engine.calculate({
      chamfer_width_mm: 0.5,
      chamfer_angle_deg: 30,
      tool_diameter_mm: 10,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("included-angle"))
    ).toBe(true);
  });

  it("warns on deep chamfer", () => {
    const r = engine.calculate({
      chamfer_depth_mm: 4,
      tool_diameter_mm: 16,
      num_flutes: 3,
    });
    expect(
      r.warnings.some(w => w.includes("Deep chamfer"))
    ).toBe(true);
  });

  // ── Back Chamfer ────────────────────────────────────────────

  it("calculates back chamfer", () => {
    const r = engine.calculate({
      chamfer_width_mm: 0.5,
      tool_diameter_mm: 12,
      num_flutes: 1,
      is_back_chamfer: true,
    });
    expect(r.axial_offset.value).toBeGreaterThan(0);
  });

  it("warns on undersized back chamfer tool", () => {
    const r = engine.calculate({
      chamfer_width_mm: 5,
      tool_diameter_mm: 10,
      num_flutes: 1,
      is_back_chamfer: true,
    });
    expect(
      r.warnings.some(w => w.includes("rigidity"))
    ).toBe(true);
  });

  // ── Spec Parsing ────────────────────────────────────────────

  it("parses C0.5 chamfer spec", () => {
    const r = engine.parseSpec({ edge_spec: "C0.5" });
    expect(r.width.value).toBe(0.5);
    expect(r.angle.value).toBe(45);
    expect(r.depth.value).toBeCloseTo(0.5, 2);
    expect(r.leg_a.value).toBe(0.5);
  });

  it("parses 1.0x30° spec", () => {
    const r = engine.parseSpec({ edge_spec: "1.0x30°" });
    expect(r.width.value).toBe(1.0);
    expect(r.angle.value).toBe(30);
    // depth = 1.0 / tan(30°) ≈ 1.732
    expect(r.depth.value).toBeCloseTo(1.732, 2);
  });

  it("parses 0.5×45 spec (no degree sign)", () => {
    const r = engine.parseSpec({ edge_spec: "0.5×45" });
    expect(r.width.value).toBe(0.5);
    expect(r.angle.value).toBe(45);
  });

  it("falls back to default on bad spec", () => {
    const r = engine.parseSpec({ edge_spec: "unknown" });
    expect(r.width.value).toBe(0.5);
    expect(r.angle.value).toBe(45);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      chamfer_width_mm: 1,
      tool_diameter_mm: 10,
      num_flutes: 3,
    });
    for (const key of [
      "chamfer_width", "chamfer_depth",
      "effective_diameter", "spindle_rpm",
      "programmed_feed", "chip_load", "axial_offset",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { chamferMillingEngine } = await import(
      "../engines/ChamferMillingEngine.js"
    );
    expect(chamferMillingEngine).toBeInstanceOf(
      ChamferMillingEngine
    );
  });
});
