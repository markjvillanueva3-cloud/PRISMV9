/**
 * VibrationDampeningEngine — Unit Tests
 * @milestone FORGE-ENGINES-B23
 */
import { describe, it, expect } from "vitest";
import {
  vibrationDampeningEngine,
} from "../engines/VibrationDampeningEngine.js";

describe("VibrationDampeningEngine", () => {
  it("calculates L/D ratio", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 100,
    });
    expect(r.ld_ratio.value).toBe(4);
  });

  it("steel bar at 4:1 is at critical limit", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 100,
      bar_material: "steel",
    });
    expect(r.critical_ld.value).toBe(4);
    expect(r.ld_ok.value).toBe(1);
  });

  it("steel bar exceeding 4:1 warns", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 20,
      bar_length_mm: 120,
      bar_material: "steel",
    });
    expect(r.ld_ok.value).toBe(0);
    expect(
      r.warnings.some(w => w.includes("L/D"))
    ).toBe(true);
  });

  it("dampened carbide allows highest L/D", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 20,
      bar_length_mm: 180,
      bar_material: "dampened_carbide",
    });
    expect(r.critical_ld.value).toBe(10);
  });

  it("dampened bars have higher stiffness multiplier", () => {
    const steel = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      bar_material: "steel",
    });
    const dampened = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      bar_material: "dampened_steel",
    });
    expect(dampened.stiffness_improvement.value).toBeGreaterThan(
      steel.stiffness_improvement.value
    );
  });

  it("chatter-free DOC increases with dampening", () => {
    const steel = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      bar_material: "steel",
      current_doc_mm: 1,
    });
    const dampened = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      bar_material: "dampened_carbide",
      current_doc_mm: 1,
    });
    expect(dampened.chatter_free_doc.value).toBeGreaterThan(
      steel.chatter_free_doc.value
    );
  });

  it("process damping effective at low speed", () => {
    const low = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      cutting_speed_mpm: 50,
    });
    const high = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 75,
      cutting_speed_mpm: 200,
    });
    expect(low.process_damping_effective.value).toBe(1);
    expect(high.process_damping_effective.value).toBe(0);
  });

  it("tuned mass damper has mass ratio ~3%", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 100,
      damper_type: "tuned_mass",
    });
    expect(r.optimal_mass_ratio.value).toBeCloseTo(0.03, 2);
  });

  it("optimal damping ratio calculated from Den Hartog", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 25,
      bar_length_mm: 100,
      damper_type: "tuned_mass",
    });
    // ζ = √(3×0.03/(8×1.03)) ≈ 0.104
    expect(r.optimal_damping_ratio.value).toBeGreaterThan(0.05);
    expect(r.optimal_damping_ratio.value).toBeLessThan(0.2);
  });

  it("warns extreme L/D > 10", () => {
    const r = vibrationDampeningEngine.calculate({
      bar_diameter_mm: 16,
      bar_length_mm: 200,
      bar_material: "dampened_carbide",
    });
    expect(
      r.warnings.some(w => w.includes("extreme"))
    ).toBe(true);
  });
});
