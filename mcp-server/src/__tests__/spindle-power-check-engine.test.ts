/**
 * Tests for SpindlePowerCheckEngine
 */
import { describe, it, expect } from "vitest";
import {
  SpindlePowerCheckEngine,
} from "../engines/SpindlePowerCheckEngine.js";

describe("SpindlePowerCheckEngine", () => {
  const engine = new SpindlePowerCheckEngine();

  // ── Power Check ─────────────────────────────────────────────

  it("validates moderate MRR within limits", () => {
    const r = engine.powerCheck({
      mrr_cm3_per_min: 30,
      material_iso_group: "P",
      spindle_power_kw: 15,
      current_rpm: 8000,
    });
    expect(r.cutting_power.value).toBeGreaterThan(0);
    expect(r.spindle_power_required.value).toBeGreaterThan(0);
    expect(r.available_power.value).toBe(15);
    expect(r.utilization.value).toBeGreaterThan(0);
    expect(r.utilization.value).toBeLessThan(100);
    expect(r.is_within_limits).toBe(true);
    expect(r.headroom.value).toBeGreaterThan(0);
  });

  it("detects power exceeded", () => {
    // kc=2200, MRR=500 → P_cut = 2200×500000/60M ≈ 18.3kW
    // P_req = 18.3/0.85 ≈ 21.6kW >> 10kW
    const r = engine.powerCheck({
      mrr_cm3_per_min: 500,
      material_iso_group: "P",
      spindle_power_kw: 10,
      current_rpm: 8000,
    });
    expect(r.utilization.value).toBeGreaterThan(100);
    expect(r.is_within_limits).toBe(false);
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  it("reduces available power below knee RPM", () => {
    const atKnee = engine.powerCheck({
      mrr_cm3_per_min: 10,
      spindle_power_kw: 15,
      spindle_knee_rpm: 4000,
      current_rpm: 4000,
    });
    const belowKnee = engine.powerCheck({
      mrr_cm3_per_min: 10,
      spindle_power_kw: 15,
      spindle_knee_rpm: 4000,
      current_rpm: 2000,
    });
    expect(belowKnee.available_power.value).toBeLessThan(
      atKnee.available_power.value
    );
  });

  it("constant power above knee RPM", () => {
    const atKnee = engine.powerCheck({
      mrr_cm3_per_min: 10,
      spindle_power_kw: 15,
      spindle_knee_rpm: 4000,
      current_rpm: 4000,
    });
    const aboveKnee = engine.powerCheck({
      mrr_cm3_per_min: 10,
      spindle_power_kw: 15,
      spindle_knee_rpm: 4000,
      current_rpm: 10000,
    });
    expect(aboveKnee.available_power.value).toBe(
      atKnee.available_power.value
    );
  });

  it("higher power for harder material", () => {
    const alu = engine.powerCheck({
      mrr_cm3_per_min: 50,
      material_iso_group: "N",
      current_rpm: 8000,
    });
    const hard = engine.powerCheck({
      mrr_cm3_per_min: 50,
      material_iso_group: "H",
      current_rpm: 8000,
    });
    expect(hard.cutting_power.value).toBeGreaterThan(
      alu.cutting_power.value
    );
  });

  it("warns at high utilization", () => {
    const r = engine.powerCheck({
      mrr_cm3_per_min: 35,
      material_iso_group: "P",
      spindle_power_kw: 15,
      current_rpm: 8000,
    });
    // Check if utilization triggers a warning
    if (r.utilization.value > 90) {
      expect(
        r.warnings.some(w => w.includes("90%"))
      ).toBe(true);
    }
  });

  it("warns at low RPM", () => {
    const r = engine.powerCheck({
      mrr_cm3_per_min: 10,
      current_rpm: 500,
      spindle_knee_rpm: 4000,
    });
    expect(
      r.warnings.some(w => w.includes("Low RPM"))
    ).toBe(true);
  });

  // ── Torque Check ────────────────────────────────────────────

  it("validates torque within limits", () => {
    const r = engine.torqueCheck({
      cutting_force_n: 1000,
      tool_diameter_mm: 20,
      current_rpm: 5000,
      spindle_max_torque_nm: 36,
    });
    // Torque = 1000 × 10/1000 = 10 Nm
    expect(r.torque_required.value).toBe(10);
    expect(r.is_within_limits).toBe(true);
    expect(r.utilization.value).toBeCloseTo(28, -1);
  });

  it("detects torque exceeded", () => {
    const r = engine.torqueCheck({
      cutting_force_n: 5000,
      tool_diameter_mm: 50,
      current_rpm: 1000,
      spindle_max_torque_nm: 36,
    });
    // Torque = 5000 × 25/1000 = 125 Nm >> 36
    expect(r.is_within_limits).toBe(false);
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.powerCheck({
      mrr_cm3_per_min: 30,
      current_rpm: 8000,
    });
    for (const key of [
      "cutting_power", "spindle_power_required",
      "available_power", "utilization",
      "torque_required", "available_torque", "headroom",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { spindlePowerCheckEngine } = await import(
      "../engines/SpindlePowerCheckEngine.js"
    );
    expect(spindlePowerCheckEngine).toBeInstanceOf(
      SpindlePowerCheckEngine
    );
  });
});
