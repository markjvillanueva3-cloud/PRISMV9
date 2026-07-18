/**
 * SpindleBearingLoadEngine — Unit Tests
 * @milestone FORGE-ENGINES-B21
 */
import { describe, it, expect } from "vitest";
import {
  spindleBearingLoadEngine,
} from "../engines/SpindleBearingLoadEngine.js";

describe("SpindleBearingLoadEngine", () => {
  it("calculates L10 life in hours", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      radial_force_n: 500,
      axial_force_n: 200,
    });
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });

  it("higher load = shorter life", () => {
    const light = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      radial_force_n: 300,
      axial_force_n: 100,
    });
    const heavy = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      radial_force_n: 2000,
      axial_force_n: 1000,
    });
    expect(heavy.l10_life_hours.value).toBeLessThan(
      light.l10_life_hours.value
    );
  });

  it("calculates DN value correctly", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 12000,
      bore_mm: 70,
    });
    expect(r.dn_value.value).toBe(840000);
  });

  it("roller bearings have higher load capacity", () => {
    const ball = spindleBearingLoadEngine.calculate({
      spindle_rpm: 5000,
      bearing_type: "angular_contact",
      bore_mm: 50,
      radial_force_n: 1000,
    });
    const roller = spindleBearingLoadEngine.calculate({
      spindle_rpm: 5000,
      bearing_type: "cylindrical_roller",
      bore_mm: 50,
      radial_force_n: 1000,
    });
    expect(roller.l10_life_hours.value).toBeGreaterThan(
      ball.l10_life_hours.value
    );
  });

  it("oil-air has higher DN limit than grease", () => {
    const grease = spindleBearingLoadEngine.calculate({
      spindle_rpm: 10000,
      lubrication: "grease",
    });
    const oilAir = spindleBearingLoadEngine.calculate({
      spindle_rpm: 10000,
      lubrication: "oil_air",
    });
    expect(oilAir.dn_limit.value).toBeGreaterThan(
      grease.dn_limit.value
    );
  });

  it("heavy preload at high speed warns", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 20000,
      preload_class: "heavy",
    });
    expect(
      r.warnings.some(w => w.includes("preload"))
    ).toBe(true);
  });

  it("preload force increases with class", () => {
    const light = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      preload_class: "light",
    });
    const heavy = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      preload_class: "heavy",
    });
    expect(heavy.preload_force.value).toBeGreaterThan(
      light.preload_force.value
    );
  });

  it("warns DN exceeds limit", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 25000,
      bore_mm: 70,
      lubrication: "grease",
    });
    expect(
      r.warnings.some(w => w.includes("DN value"))
    ).toBe(true);
  });

  it("static safety factor calculated", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      radial_force_n: 500,
    });
    expect(r.static_safety_factor.value).toBeGreaterThan(0);
  });

  it("adjusted life uses a_ISO factor", () => {
    const r = spindleBearingLoadEngine.calculate({
      spindle_rpm: 8000,
      bore_mm: 50,
      radial_force_n: 2000,
      axial_force_n: 800,
    });
    // adjusted_life = L10 × a_ISO, both should be > 0
    expect(r.adjusted_life_hours.value).toBeGreaterThan(0);
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });
});
