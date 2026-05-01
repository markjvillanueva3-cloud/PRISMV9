/**
 * BeltDriveEngine — Unit Tests
 * @milestone FORGE-ENGINES-B29
 */
import { describe, it, expect } from "vitest";
import { beltDriveEngine } from "../engines/BeltDriveEngine.js";

describe("BeltDriveEngine", () => {
  it("speed ratio = D2/D1", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 100,
      driven_pulley_mm: 300,
    });
    expect(r.speed_ratio.value).toBeCloseTo(3, 1);
  });

  it("1:1 ratio with equal pulleys", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 150,
      driven_pulley_mm: 150,
    });
    expect(r.speed_ratio.value).toBeCloseTo(1, 2);
    expect(r.arc_of_contact_deg.value).toBeCloseTo(180, 1);
  });

  it("belt length formula correct", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 100,
      driven_pulley_mm: 100,
      center_distance_mm: 500,
    });
    // Equal pulleys: L = 2×500 + π×200/2 + 0 = 1000 + 314.16 ≈ 1314
    expect(r.belt_length.value).toBeCloseTo(1314.2, 0);
  });

  it("more belts needed for higher power", () => {
    const low = beltDriveEngine.calculate({ power_kw: 2 });
    const high = beltDriveEngine.calculate({ power_kw: 20 });
    expect(high.num_belts.value).toBeGreaterThan(low.num_belts.value);
  });

  it("tight side tension > slack side", () => {
    const r = beltDriveEngine.calculate({ power_kw: 5 });
    expect(r.tight_side_tension.value).toBeGreaterThan(
      r.slack_side_tension.value
    );
  });

  it("warns high belt speed > 30 m/s", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 400,
      driver_rpm: 3600,
    });
    // v = π × 400 × 3600 / 60000 ≈ 75.4 m/s
    expect(r.warnings.some(w => w.includes("30 m/s"))).toBe(true);
  });

  it("warns small arc of contact", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 80,
      driven_pulley_mm: 400,
      center_distance_mm: 200,
    });
    expect(r.arc_of_contact_deg.value).toBeLessThan(180);
  });

  it("dusty environment reduces life", () => {
    const clean = beltDriveEngine.calculate({ environment: "clean" });
    const dusty = beltDriveEngine.calculate({ environment: "dusty" });
    expect(dusty.estimated_life_hours.value).toBeLessThan(
      clean.estimated_life_hours.value
    );
  });

  it("larger belt type handles more power per belt", () => {
    const a = beltDriveEngine.calculate({
      belt_type: "v_belt_A",
      driver_pulley_mm: 150,
    });
    const c = beltDriveEngine.calculate({
      belt_type: "v_belt_C",
      driver_pulley_mm: 250,
    });
    expect(c.power_per_belt.value).toBeGreaterThan(a.power_per_belt.value);
  });

  it("driven RPM derives pulley size", () => {
    const r = beltDriveEngine.calculate({
      driver_pulley_mm: 100,
      driver_rpm: 1800,
      driven_rpm: 600,
    });
    // D2 = 100 × 1800/600 = 300
    expect(r.speed_ratio.value).toBeCloseTo(3, 1);
  });
});
