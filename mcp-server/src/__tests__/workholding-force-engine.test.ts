/**
 * Tests for WorkholdingForceEngine
 */
import { describe, it, expect } from "vitest";
import {
  WorkholdingForceEngine,
} from "../engines/WorkholdingForceEngine.js";

describe("WorkholdingForceEngine", () => {
  const engine = new WorkholdingForceEngine();

  // ── Clamp Force ─────────────────────────────────────────────

  it("calculates vise clamping force", () => {
    const r = engine.clampForce({
      cutting_force_n: 500,
      workholding_type: "vise",
    });
    // F = 500 × 2.0 / 0.15 ≈ 6667N
    expect(r.required_force.value).toBeGreaterThan(6000);
    expect(r.force_per_clamp.value).toBeGreaterThan(0);
    expect(r.friction_coefficient.value).toBe(0.15);
    expect(r.safety_factor.value).toBe(2.0);
    expect(r.torque_nm.value).toBeGreaterThan(0);
  });

  it("distributes force across multiple clamps", () => {
    const r = engine.clampForce({
      cutting_force_n: 500,
      workholding_type: "fixture_plate",
      num_clamps: 4,
    });
    expect(r.force_per_clamp.value).toBeLessThan(
      r.required_force.value
    );
    expect(r.force_per_clamp.value).toBeCloseTo(
      r.required_force.value / 4, -1
    );
  });

  it("uses custom friction and SF", () => {
    const r = engine.clampForce({
      cutting_force_n: 1000,
      friction_coefficient: 0.30,
      safety_factor: 3.0,
    });
    // F = 1000 × 3.0 / 0.30 = 10000
    expect(r.required_force.value).toBe(10000);
  });

  it("warns on high force for vacuum", () => {
    const r = engine.clampForce({
      cutting_force_n: 600,
      workholding_type: "vacuum",
    });
    expect(
      r.warnings.some(w => w.includes("vacuum"))
    ).toBe(true);
  });

  it("warns on high force for magnetic", () => {
    const r = engine.clampForce({
      cutting_force_n: 1500,
      workholding_type: "magnetic",
    });
    expect(
      r.warnings.some(w => w.includes("magnetic"))
    ).toBe(true);
  });

  // ── Chuck Force ─────────────────────────────────────────────

  it("calculates 3-jaw chuck force", () => {
    const r = engine.chuckForce({
      cutting_force_tangential_n: 500,
      workpiece_diameter_mm: 50,
      rpm: 2000,
      workpiece_mass_kg: 2,
    });
    expect(r.required_grip_force.value).toBeGreaterThan(0);
    expect(r.centrifugal_force.value).toBeGreaterThan(0);
    expect(r.total_required.value).toBeGreaterThan(
      r.required_grip_force.value
    );
    expect(r.force_per_jaw.value).toBeGreaterThan(0);
    expect(r.max_safe_rpm.value).toBeGreaterThan(0);
  });

  it("centrifugal force increases with RPM", () => {
    const slow = engine.chuckForce({
      cutting_force_tangential_n: 500,
      workpiece_diameter_mm: 50,
      rpm: 1000,
      workpiece_mass_kg: 2,
    });
    const fast = engine.chuckForce({
      cutting_force_tangential_n: 500,
      workpiece_diameter_mm: 50,
      rpm: 4000,
      workpiece_mass_kg: 2,
    });
    expect(fast.centrifugal_force.value).toBeGreaterThan(
      slow.centrifugal_force.value
    );
  });

  it("warns on high RPM approaching limit", () => {
    const r = engine.chuckForce({
      cutting_force_tangential_n: 200,
      workpiece_diameter_mm: 100,
      rpm: 8000,
      workpiece_mass_kg: 5,
    });
    expect(
      r.warnings.some(w => w.includes("RPM") ||
        w.includes("Centrifugal"))
    ).toBe(true);
  });

  it("warns on large workpiece in 3-jaw", () => {
    const r = engine.chuckForce({
      cutting_force_tangential_n: 500,
      workpiece_diameter_mm: 250,
      rpm: 500,
      workpiece_mass_kg: 20,
    });
    expect(
      r.warnings.some(w => w.includes("6-jaw"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.clampForce({
      cutting_force_n: 500,
    });
    for (const key of [
      "required_force", "force_per_clamp",
      "friction_coefficient", "safety_factor", "torque_nm",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { workholdingForceEngine } = await import(
      "../engines/WorkholdingForceEngine.js"
    );
    expect(workholdingForceEngine).toBeInstanceOf(
      WorkholdingForceEngine
    );
  });
});
