/**
 * BarFeederEngine — Unit Tests
 * @milestone FORGE-ENGINES-B21
 */
import { describe, it, expect } from "vitest";
import { barFeederEngine } from "../engines/BarFeederEngine.js";

describe("BarFeederEngine", () => {
  it("calculates parts per bar", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      bar_length_mm: 3000,
    });
    expect(r.parts_per_bar.value).toBeGreaterThan(0);
    expect(r.parts_per_bar.value).toBeLessThan(60);
  });

  it("longer parts = fewer per bar", () => {
    const short = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 30,
    });
    const long = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 100,
    });
    expect(long.parts_per_bar.value).toBeLessThan(
      short.parts_per_bar.value
    );
  });

  it("remnant >= minimum", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      remnant_min_mm: 150,
    });
    expect(r.remnant_length.value).toBeGreaterThanOrEqual(150);
  });

  it("material utilization < 100%", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
    });
    expect(r.material_utilization.value).toBeLessThan(100);
    expect(r.material_utilization.value).toBeGreaterThan(0);
  });

  it("magazine feeder has faster bar change", () => {
    const long = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      feeder_type: "long",
    });
    const mag = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      feeder_type: "magazine",
    });
    expect(mag.bar_change_time.value).toBeLessThan(
      long.bar_change_time.value
    );
  });

  it("calculates parts per shift", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      cycle_time_sec: 45,
      shift_hours: 8,
    });
    expect(r.parts_per_shift.value).toBeGreaterThan(0);
  });

  it("warns high waste percentage", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 800,
      bar_length_mm: 1500,
    });
    expect(
      r.warnings.some(w => w.includes("Waste") || w.includes("parts per bar"))
    ).toBe(true);
  });

  it("warns bar whip at high RPM with small diameter", () => {
    const r = barFeederEngine.calculate({
      bar_diameter_mm: 10,
      part_length_mm: 30,
      spindle_rpm: 100000,
    });
    expect(
      r.warnings.some(w => w.includes("whip"))
    ).toBe(true);
  });

  it("Swiss machine has smaller minimum remnant", () => {
    const lathe = barFeederEngine.calculate({
      bar_diameter_mm: 20,
      part_length_mm: 40,
      machine_type: "cnc_lathe",
    });
    const swiss = barFeederEngine.calculate({
      bar_diameter_mm: 20,
      part_length_mm: 40,
      machine_type: "swiss",
    });
    expect(swiss.parts_per_bar.value).toBeGreaterThanOrEqual(
      lathe.parts_per_bar.value
    );
  });

  it("cutoff width reduces parts per bar", () => {
    const thin = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      cutoff_width_mm: 1,
    });
    const thick = barFeederEngine.calculate({
      bar_diameter_mm: 25,
      part_length_mm: 50,
      cutoff_width_mm: 6,
    });
    expect(thick.parts_per_bar.value).toBeLessThanOrEqual(
      thin.parts_per_bar.value
    );
  });
});
