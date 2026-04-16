/**
 * VibrationIsolationEngine — Unit Tests
 * @milestone FORGE-ENGINES-B50
 */
import { describe, it, expect } from "vitest";
import { vibrationIsolationEngine } from "../engines/VibrationIsolationEngine.js";

describe("VibrationIsolationEngine", () => {
  it("natural frequency > 0", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.natural_frequency.value).toBeGreaterThan(0);
  });

  it("frequency ratio > 0", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.frequency_ratio.value).toBeGreaterThan(0);
  });

  it("transmissibility > 0", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.transmissibility.value).toBeGreaterThan(0);
  });

  it("good isolation when frequency ratio > √2", () => {
    const r = vibrationIsolationEngine.calculate({
      disturbing_frequency_hz: 50,
      mount_stiffness_n_mm: 10,
      machine_mass_kg: 1000,
    });
    if (r.frequency_ratio.value > 1.414) {
      expect(r.isolation_efficiency.value).toBeGreaterThan(0);
    }
  });

  it("softer mounts give better isolation", () => {
    const stiff = vibrationIsolationEngine.calculate({
      mount_stiffness_n_mm: 200,
    });
    const soft = vibrationIsolationEngine.calculate({
      mount_stiffness_n_mm: 20,
    });
    expect(soft.isolation_efficiency.value).toBeGreaterThan(
      stiff.isolation_efficiency.value
    );
  });

  it("static deflection > 0", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.static_deflection.value).toBeGreaterThan(0);
  });

  it("transmitted force ≤ disturbing force when isolating", () => {
    const r = vibrationIsolationEngine.calculate({
      disturbing_frequency_hz: 50,
      mount_stiffness_n_mm: 5,
      machine_mass_kg: 500,
      disturbing_force_n: 1000,
    });
    if (r.frequency_ratio.value > 1.5) {
      expect(r.transmitted_force.value).toBeLessThan(1000);
    }
  });

  it("resonance amplification > 1", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.resonance_amplification.value).toBeGreaterThan(1);
  });

  it("mount load > 0", () => {
    const r = vibrationIsolationEngine.calculate({});
    expect(r.mount_load.value).toBeGreaterThan(0);
  });

  it("warns when not isolating", () => {
    const r = vibrationIsolationEngine.calculate({
      disturbing_frequency_hz: 10,
      mount_stiffness_n_mm: 500,
      machine_mass_kg: 100,
    });
    expect(r.warnings.some(w =>
      w.includes("NOT") || w.includes("resonance")
    )).toBe(true);
  });
});
