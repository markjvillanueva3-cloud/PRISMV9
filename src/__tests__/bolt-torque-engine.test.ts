/**
 * BoltTorqueEngine — Unit Tests
 * @milestone FORGE-ENGINES-B31
 */
import { describe, it, expect } from "vitest";
import { boltTorqueEngine } from "../engines/BoltTorqueEngine.js";

describe("BoltTorqueEngine", () => {
  it("torque = K × F × d", () => {
    const r = boltTorqueEngine.calculate({
      bolt_size_mm: 12,
      bolt_grade: "8.8",
      nut_factor_k: 0.20,
      preload_pct: 75,
    });
    expect(r.tightening_torque.value).toBeGreaterThan(0);
    expect(r.tightening_torque.unit).toBe("N·m");
  });

  it("higher grade → higher clamp load", () => {
    const g88 = boltTorqueEngine.calculate({ bolt_grade: "8.8" });
    const g109 = boltTorqueEngine.calculate({ bolt_grade: "10.9" });
    expect(g109.clamp_load_per_bolt.value).toBeGreaterThan(
      g88.clamp_load_per_bolt.value
    );
  });

  it("total clamp = bolts × per bolt", () => {
    const r = boltTorqueEngine.calculate({ num_bolts: 6 });
    expect(r.total_clamp_load.value).toBeCloseTo(
      r.clamp_load_per_bolt.value * 6, -1
    );
  });

  it("lubricated reduces torque", () => {
    const dry = boltTorqueEngine.calculate({ lubricated: false });
    const lube = boltTorqueEngine.calculate({ lubricated: true });
    expect(lube.tightening_torque.value).toBeLessThan(
      dry.tightening_torque.value
    );
  });

  it("utilization < 1 at 75% preload", () => {
    const r = boltTorqueEngine.calculate({ preload_pct: 75 });
    expect(r.utilization.value).toBeLessThan(1);
  });

  it("warns over 90% utilization", () => {
    const r = boltTorqueEngine.calculate({ preload_pct: 95 });
    expect(r.warnings.some(w => w.includes("90%"))).toBe(true);
  });

  it("aluminum clamp changes load introduction factor", () => {
    const steel = boltTorqueEngine.calculate({ clamp_material: "steel" });
    const alum = boltTorqueEngine.calculate({ clamp_material: "aluminum" });
    expect(alum.load_introduction_factor.value).not.toBe(
      steel.load_introduction_factor.value
    );
  });

  it("thermal load changes with differential temp", () => {
    const r = boltTorqueEngine.calculate({
      bolt_temp_c: 20,
      clamp_temp_c: 100,
      clamp_material: "aluminum",
      ambient_temp_c: 20,
    });
    expect(r.thermal_load_change.value).not.toBe(0);
  });

  it("separation force > preload", () => {
    const r = boltTorqueEngine.calculate({});
    expect(r.separation_force.value).toBeGreaterThan(
      r.clamp_load_per_bolt.value
    );
  });

  it("larger bolt → more clamp load", () => {
    const m8 = boltTorqueEngine.calculate({ bolt_size_mm: 8 });
    const m20 = boltTorqueEngine.calculate({ bolt_size_mm: 20 });
    expect(m20.clamp_load_per_bolt.value).toBeGreaterThan(
      m8.clamp_load_per_bolt.value
    );
  });
});
