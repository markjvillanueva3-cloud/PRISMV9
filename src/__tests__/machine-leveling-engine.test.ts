/**
 * MachineLevelingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B27
 */
import { describe, it, expect } from "vitest";
import {
  machineLevelingEngine,
} from "../engines/MachineLevelingEngine.js";

describe("MachineLevelingEngine", () => {
  it("calculates max tilt in arc-seconds", () => {
    const r = machineLevelingEngine.calculate({});
    expect(r.max_tilt_arcsec.value).toBeGreaterThan(0);
  });

  it("tighter accuracy needs less tilt", () => {
    const loose = machineLevelingEngine.calculate({
      required_accuracy_mm: 0.050,
    });
    const tight = machineLevelingEngine.calculate({
      required_accuracy_mm: 0.005,
    });
    expect(tight.max_tilt_arcsec.value).toBeLessThan(
      loose.max_tilt_arcsec.value
    );
  });

  it("larger machine needs more mounts", () => {
    const small = machineLevelingEngine.calculate({
      machine_length_mm: 1000,
      machine_width_mm: 800,
    });
    const large = machineLevelingEngine.calculate({
      machine_length_mm: 4000,
      machine_width_mm: 2500,
    });
    expect(large.mount_count.value).toBeGreaterThan(
      small.mount_count.value
    );
  });

  it("heavier machine needs thicker foundation", () => {
    const light = machineLevelingEngine.calculate({
      machine_mass_kg: 2000,
    });
    const heavy = machineLevelingEngine.calculate({
      machine_mass_kg: 15000,
    });
    expect(heavy.foundation_thickness.value).toBeGreaterThan(
      light.foundation_thickness.value
    );
  });

  it("heavy vibration requires isolation", () => {
    const r = machineLevelingEngine.calculate({
      nearby_vibration: "heavy",
    });
    expect(r.isolation_needed.value).toBe(1);
  });

  it("no vibration standard machine no isolation", () => {
    const r = machineLevelingEngine.calculate({
      machine_class: "standard",
      nearby_vibration: "none",
    });
    expect(r.isolation_needed.value).toBe(0);
  });

  it("ultraprecision has shortest recheck interval", () => {
    const std = machineLevelingEngine.calculate({
      machine_class: "standard",
    });
    const ultra = machineLevelingEngine.calculate({
      machine_class: "ultraprecision",
    });
    expect(ultra.recheck_interval.value).toBeLessThan(
      std.recheck_interval.value
    );
  });

  it("warns suspended floor", () => {
    const r = machineLevelingEngine.calculate({
      floor_type: "suspended",
    });
    expect(
      r.warnings.some(w => w.includes("Suspended") ||
        w.includes("suspended"))
    ).toBe(true);
  });

  it("geometric error calculated", () => {
    const r = machineLevelingEngine.calculate({});
    expect(r.geometric_error.value).toBeGreaterThan(0);
  });

  it("foundation mass > machine mass", () => {
    const r = machineLevelingEngine.calculate({
      machine_mass_kg: 5000,
    });
    expect(r.foundation_mass.value).toBeGreaterThan(5000);
  });
});
