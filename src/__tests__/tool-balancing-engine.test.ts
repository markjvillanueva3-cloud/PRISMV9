/**
 * Tests for ToolBalancingEngine
 */
import { describe, it, expect } from "vitest";
import { ToolBalancingEngine } from "../engines/ToolBalancingEngine.js";

describe("ToolBalancingEngine", () => {
  const engine = new ToolBalancingEngine();

  // ── Balance Calculation ───────────────────────────────────────

  it("calculates G2.5 balance for 20k RPM", () => {
    const r = engine.calculate({
      rpm: 20000,
      tool_mass_kg: 0.5,
      holder_mass_kg: 1.2,
    });
    expect(r.balance_grade).toBe("G2.5");
    expect(r.permissible_unbalance.value).toBeGreaterThan(0);
    expect(r.permissible_eccentricity.value).toBeGreaterThan(0);
    expect(r.is_balanced).toBe(true); // no measurement given
  });

  it("selects G6.3 for moderate RPM", () => {
    const r = engine.calculate({
      rpm: 8000,
      tool_mass_kg: 0.8,
      holder_mass_kg: 1.5,
    });
    expect(r.balance_grade).toBe("G6.3");
  });

  it("selects G1 for very high RPM", () => {
    const r = engine.calculate({
      rpm: 35000,
      tool_mass_kg: 0.2,
      holder_mass_kg: 0.8,
    });
    expect(r.balance_grade).toBe("G1");
  });

  it("allows custom balance grade", () => {
    const r = engine.calculate({
      rpm: 10000,
      tool_mass_kg: 1.0,
      balance_grade: "G0.4",
    });
    expect(r.balance_grade).toBe("G0.4");
    // Tighter grade = lower permissible unbalance
    const r2 = engine.calculate({
      rpm: 10000,
      tool_mass_kg: 1.0,
      balance_grade: "G16",
    });
    expect(r.permissible_unbalance.value).toBeLessThan(
      r2.permissible_unbalance.value
    );
  });

  it("detects unbalanced assembly", () => {
    const r = engine.calculate({
      rpm: 20000,
      tool_mass_kg: 0.5,
      holder_mass_kg: 1.0,
      measured_unbalance_gmm: 100,
    });
    expect(r.is_balanced).toBe(false);
    expect(r.centrifugal_force_at_rpm.value).toBeGreaterThan(0);
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  it("confirms balanced assembly", () => {
    const r = engine.calculate({
      rpm: 5000,
      tool_mass_kg: 2.0,
      measured_unbalance_gmm: 5,
      balance_grade: "G16",
    });
    expect(r.is_balanced).toBe(true);
  });

  it("warns on heavy assembly at high RPM", () => {
    const r = engine.calculate({
      rpm: 15000,
      tool_mass_kg: 5,
      holder_mass_kg: 12,
    });
    expect(
      r.warnings.some(w => w.includes("Heavy"))
    ).toBe(true);
  });

  // ── Correction ────────────────────────────────────────────────

  it("calculates correction mass", () => {
    const r = engine.correction({
      measured_unbalance_gmm: 50,
      permissible_unbalance_gmm: 10,
      correction_radius_mm: 20,
      unbalance_angle_deg: 90,
    });
    expect(r.correction_mass.value).toBe(2); // 40/20
    expect(r.correction_angle.value).toBe(270); // 90+180
    expect(r.alternative_masses.length).toBeGreaterThan(0);
  });

  it("returns zero correction when balanced", () => {
    const r = engine.correction({
      measured_unbalance_gmm: 5,
      permissible_unbalance_gmm: 10,
      correction_radius_mm: 20,
    });
    expect(r.correction_mass.value).toBe(0);
  });

  // ── Force Analysis ────────────────────────────────────────────

  it("calculates centrifugal force from unbalance", () => {
    const r = engine.forceAnalysis({
      unbalance_gmm: 20,
      rpm: 15000,
    });
    expect(r.centrifugal_force.value).toBeGreaterThan(0);
    expect(r.bearing_load_increase.value).toBeGreaterThan(0);
    expect(r.vibration_amplitude.value).toBeGreaterThan(0);
  });

  it("identifies unsafe force for spindle", () => {
    const r = engine.forceAnalysis({
      unbalance_gmm: 200,
      rpm: 30000,
      spindle_max_force_n: 30,
    });
    expect(r.safe_for_spindle).toBe(false);
  });

  // ── Grade Recommendation ──────────────────────────────────────

  it("recommends G1 for grinding", () => {
    const r = engine.recommendGrade({
      rpm: 5000,
      application: "precision grinding",
    });
    expect(r.grade).toBe("G1");
  });

  it("recommends G2.5 for finishing", () => {
    const r = engine.recommendGrade({
      rpm: 18000,
      application: "finish milling",
    });
    expect(r.grade).toBe("G2.5");
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      rpm: 10000,
      tool_mass_kg: 1.0,
    });
    for (const key of [
      "permissible_unbalance",
      "permissible_eccentricity",
      "centrifugal_force_at_rpm",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { toolBalancingEngine } = await import(
      "../engines/ToolBalancingEngine.js"
    );
    expect(toolBalancingEngine).toBeInstanceOf(
      ToolBalancingEngine
    );
  });
});
