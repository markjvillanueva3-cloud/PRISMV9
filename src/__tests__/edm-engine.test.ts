/**
 * Tests for EDMEngine
 */
import { describe, it, expect } from "vitest";
import { EDMEngine } from "../engines/EDMEngine.js";

describe("EDMEngine", () => {
  const engine = new EDMEngine();

  // ── Wire EDM ────────────────────────────────────────────────

  it("calculates wire EDM for 50mm steel", () => {
    const r = engine.wireEDM({
      workpiece_thickness_mm: 50,
      material_iso_group: "P",
    });
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.wire_feed.value).toBeGreaterThan(0);
    expect(r.wire_tension.value).toBeGreaterThan(0);
    expect(r.spark_gap.value).toBeGreaterThan(0);
    expect(r.kerf_width.value).toBeGreaterThan(0.25);
    expect(r.flushing_pressure.value).toBeGreaterThan(0);
    expect(r.predicted_ra.value).toBeCloseTo(3.2, 0);
    expect(r.power_setting).toContain("rough");
  });

  it("improves finish with skim cuts", () => {
    const rough = engine.wireEDM({
      workpiece_thickness_mm: 50,
      num_cuts: 1,
    });
    const skim = engine.wireEDM({
      workpiece_thickness_mm: 50,
      num_cuts: 3,
    });
    expect(skim.predicted_ra.value).toBeLessThan(
      rough.predicted_ra.value
    );
  });

  it("narrower spark gap for skim cuts", () => {
    const rough = engine.wireEDM({
      workpiece_thickness_mm: 50,
      num_cuts: 1,
    });
    const skim = engine.wireEDM({
      workpiece_thickness_mm: 50,
      num_cuts: 3,
    });
    expect(skim.spark_gap.value).toBeLessThan(
      rough.spark_gap.value
    );
  });

  it("warns on thick workpiece", () => {
    const r = engine.wireEDM({
      workpiece_thickness_mm: 400,
    });
    expect(
      r.warnings.some(w => w.includes("300mm"))
    ).toBe(true);
  });

  it("warns when fine finish needs more cuts", () => {
    const r = engine.wireEDM({
      workpiece_thickness_mm: 50,
      target_ra_um: 0.1,
      num_cuts: 2,
    });
    expect(
      r.warnings.some(w => w.includes("4+ cuts"))
    ).toBe(true);
  });

  // ── Sinker EDM ──────────────────────────────────────────────

  it("calculates sinker EDM with graphite", () => {
    const r = engine.sinkerEDM({
      cavity_depth_mm: 20,
      material_iso_group: "P",
      electrode_material: "graphite",
    });
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.electrode_wear_ratio.value).toBe(0.1);
    expect(r.spark_gap.value).toBeGreaterThan(0);
    expect(r.num_electrodes.value).toBeGreaterThanOrEqual(4);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("graphite has lower wear than copper", () => {
    const graphite = engine.sinkerEDM({
      cavity_depth_mm: 20,
      electrode_material: "graphite",
    });
    const copper = engine.sinkerEDM({
      cavity_depth_mm: 20,
      electrode_material: "copper",
    });
    expect(graphite.electrode_wear_ratio.value).toBeLessThan(
      copper.electrode_wear_ratio.value
    );
  });

  it("lower MRR for finer finish", () => {
    const rough = engine.sinkerEDM({
      cavity_depth_mm: 20,
      target_ra_um: 6.3,
    });
    const fine = engine.sinkerEDM({
      cavity_depth_mm: 20,
      target_ra_um: 0.4,
    });
    expect(fine.mrr.value).toBeLessThan(rough.mrr.value);
  });

  it("warns on deep cavity", () => {
    const r = engine.sinkerEDM({
      cavity_depth_mm: 60,
    });
    expect(
      r.warnings.some(w => w.includes("Deep"))
    ).toBe(true);
  });

  it("warns graphite on aluminum", () => {
    const r = engine.sinkerEDM({
      cavity_depth_mm: 10,
      material_iso_group: "N",
      electrode_material: "graphite",
    });
    expect(
      r.warnings.some(w => w.includes("carbon"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format for wire", () => {
    const r = engine.wireEDM({
      workpiece_thickness_mm: 50,
    });
    for (const key of [
      "cutting_speed", "wire_feed", "wire_tension",
      "spark_gap", "kerf_width", "predicted_ra",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
    }
  });

  it("exports singleton", async () => {
    const { edmEngine } = await import(
      "../engines/EDMEngine.js"
    );
    expect(edmEngine).toBeInstanceOf(EDMEngine);
  });
});
