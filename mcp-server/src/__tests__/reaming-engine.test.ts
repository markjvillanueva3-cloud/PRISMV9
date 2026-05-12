/**
 * Tests for ReamingEngine
 */
import { describe, it, expect } from "vitest";
import { ReamingEngine } from "../engines/ReamingEngine.js";

describe("ReamingEngine", () => {
  const engine = new ReamingEngine();

  // ── Full Calculation ──────────────────────────────────────────

  it("calculates reaming params for 10mm H7 bore in steel", () => {
    const r = engine.calculate({
      bore_diameter_mm: 10,
      bore_depth_mm: 20,
      tolerance_class: "H7",
      material_iso_group: "P",
      material_hardness_hrc: 25,
    });
    expect(r.cutting_speed.value).toBeGreaterThan(5);
    expect(r.cutting_speed.value).toBeLessThan(60);
    expect(r.rpm.value).toBeGreaterThan(0);
    expect(r.feed_per_rev.value).toBeGreaterThan(0.05);
    expect(r.feed_per_rev.value).toBeLessThan(0.5);
    expect(r.stock_allowance.value).toBeGreaterThan(0.05);
    expect(r.stock_allowance.value).toBeLessThan(0.5);
    expect(r.pre_bore_diameter.value).toBeLessThan(10);
    expect(r.pre_bore_diameter.value).toBeGreaterThan(9);
    expect(r.predicted_ra.value).toBeLessThan(2);
    expect(r.torque.value).toBeGreaterThan(0);
    expect(r.thrust_force.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.warnings.length).toBe(0);
  });

  it("calculates for aluminum bore", () => {
    const r = engine.calculate({
      bore_diameter_mm: 20,
      bore_depth_mm: 30,
      material_iso_group: "N",
    });
    // Aluminum should have higher cutting speed
    expect(r.cutting_speed.value).toBeGreaterThan(20);
    expect(r.predicted_ra.value).toBeLessThan(1.5);
  });

  it("calculates for titanium with hardness", () => {
    const r = engine.calculate({
      bore_diameter_mm: 12,
      bore_depth_mm: 25,
      material_iso_group: "S",
      material_hardness_hrc: 36,
    });
    // Titanium = low speed
    expect(r.cutting_speed.value).toBeLessThan(20);
    expect(r.reamer.material).toBe("carbide");
  });

  // ── Tolerance Handling ────────────────────────────────────────

  it("reduces feed for H6 tolerance", () => {
    const h7 = engine.calculate({
      bore_diameter_mm: 15,
      bore_depth_mm: 20,
      tolerance_class: "H7",
      material_iso_group: "P",
    });
    const h6 = engine.calculate({
      bore_diameter_mm: 15,
      bore_depth_mm: 20,
      tolerance_class: "H6",
      material_iso_group: "P",
    });
    expect(h6.feed_per_rev.value).toBeLessThan(h7.feed_per_rev.value);
    expect(h6.warnings).toContain(
      "H6 tolerance — reduced feed for precision"
    );
  });

  // ── Warnings ──────────────────────────────────────────────────

  it("warns on high L/D ratio", () => {
    const r = engine.calculate({
      bore_diameter_mm: 8,
      bore_depth_mm: 40, // L/D = 5
      material_iso_group: "P",
    });
    expect(
      r.warnings.some(w => w.includes("L/D"))
    ).toBe(true);
  });

  it("warns on dry reaming", () => {
    const r = engine.calculate({
      bore_diameter_mm: 10,
      bore_depth_mm: 15,
      coolant: "dry",
      material_iso_group: "P",
    });
    expect(
      r.warnings.some(w => w.includes("Dry"))
    ).toBe(true);
    expect(r.predicted_ra.value).toBeGreaterThan(0.8);
  });

  it("warns on high hardness", () => {
    const r = engine.calculate({
      bore_diameter_mm: 10,
      bore_depth_mm: 15,
      material_iso_group: "H",
      material_hardness_hrc: 50,
    });
    expect(
      r.warnings.some(w => w.includes("hardness"))
    ).toBe(true);
  });

  // ── Blind Hole ────────────────────────────────────────────────

  it("adjusts for blind hole", () => {
    const through = engine.calculate({
      bore_diameter_mm: 12,
      bore_depth_mm: 20,
      blind_hole: false,
      material_iso_group: "P",
    });
    const blind = engine.calculate({
      bore_diameter_mm: 12,
      bore_depth_mm: 20,
      blind_hole: true,
      material_iso_group: "P",
    });
    expect(blind.feed_per_rev.value).toBeLessThan(
      through.feed_per_rev.value
    );
    expect(blind.reamer.helix_angle_deg).toBeGreaterThan(0);
  });

  // ── Stock Allowance ───────────────────────────────────────────

  it("calculates stock allowance", () => {
    const r = engine.stockAllowance({
      bore_diameter_mm: 20,
      tolerance_class: "H7",
    });
    expect(r.stock_per_side.value).toBeGreaterThan(0.1);
    expect(r.stock_per_side.value).toBeLessThan(0.4);
    expect(r.pre_bore_diameter.value).toBeLessThan(20);
    expect(r.tolerance_range.min).toBe(20);
    expect(r.tolerance_range.max).toBeGreaterThan(20);
  });

  it("carbide reamer needs less stock", () => {
    const hss = engine.stockAllowance({
      bore_diameter_mm: 15,
      reamer_material: "cobalt_hss",
    });
    const carb = engine.stockAllowance({
      bore_diameter_mm: 15,
      reamer_material: "carbide",
    });
    expect(carb.stock_per_side.value).toBeLessThan(
      hss.stock_per_side.value
    );
  });

  // ── Forces ────────────────────────────────────────────────────

  it("calculates reaming forces", () => {
    const r = engine.force({
      bore_diameter_mm: 16,
      bore_depth_mm: 25,
      material_iso_group: "P",
      material_hardness_hrc: 28,
    });
    expect(r.torque.value).toBeGreaterThan(0);
    expect(r.thrust_force.value).toBeGreaterThan(0);
    expect(r.power.value).toBeGreaterThan(0);
    expect(r.power.unit).toBe("kW");
  });

  // ── Surface Finish ────────────────────────────────────────────

  it("predicts surface finish", () => {
    const ra = engine.surfaceFinish({
      bore_diameter_mm: 20,
      reamer_material: "carbide",
      tolerance_class: "H7",
      coolant: "flood",
    });
    expect(ra.value).toBeLessThan(1.0);
    expect(ra.unit).toContain("μm");
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue with all required fields", () => {
    const r = engine.calculate({
      bore_diameter_mm: 10,
      bore_depth_mm: 20,
      material_iso_group: "P",
    });
    for (const key of [
      "cutting_speed", "rpm", "feed_per_rev", "feed_rate",
      "stock_allowance", "pre_bore_diameter", "predicted_ra",
      "torque", "thrust_force", "cycle_time",
    ] as const) {
      const av = r[key];
      expect(av.value).toBeDefined();
      expect(av.unit).toBeDefined();
      expect(typeof av.uncertainty).toBe("number");
      expect(av.source.length).toBeGreaterThan(0);
    }
  });

  it("exports singleton", async () => {
    const { reamingEngine } = await import(
      "../engines/ReamingEngine.js"
    );
    expect(reamingEngine).toBeInstanceOf(ReamingEngine);
  });
});
