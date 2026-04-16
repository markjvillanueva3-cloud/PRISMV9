/**
 * PipingPressureEngine — Unit Tests
 * @milestone FORGE-ENGINES-B34
 */
import { describe, it, expect } from "vitest";
import { pipingPressureEngine } from "../engines/PipingPressureEngine.js";

describe("PipingPressureEngine", () => {
  it("velocity = Q/A", () => {
    const r = pipingPressureEngine.calculate({
      flow_rate_lpm: 100,
      pipe_inner_dia_mm: 50,
    });
    // A = π/4 × 0.05² ≈ 0.001963 m², Q = 100/60000 ≈ 0.001667
    // v ≈ 0.849 m/s
    expect(r.velocity.value).toBeCloseTo(0.85, 1);
  });

  it("Reynolds number > 0", () => {
    const r = pipingPressureEngine.calculate({});
    expect(r.reynolds_number.value).toBeGreaterThan(0);
  });

  it("larger pipe reduces velocity", () => {
    const small = pipingPressureEngine.calculate({ pipe_inner_dia_mm: 25 });
    const large = pipingPressureEngine.calculate({ pipe_inner_dia_mm: 100 });
    expect(large.velocity.value).toBeLessThan(small.velocity.value);
  });

  it("longer pipe increases friction loss", () => {
    const short = pipingPressureEngine.calculate({ pipe_length_m: 10 });
    const long = pipingPressureEngine.calculate({ pipe_length_m: 100 });
    expect(long.friction_loss.value).toBeGreaterThan(
      short.friction_loss.value
    );
  });

  it("globe valves add significant minor loss", () => {
    const none = pipingPressureEngine.calculate({ num_valves_globe: 0 });
    const two = pipingPressureEngine.calculate({ num_valves_globe: 2 });
    expect(two.minor_loss.value).toBeGreaterThan(none.minor_loss.value);
  });

  it("elevation change adds pressure", () => {
    const flat = pipingPressureEngine.calculate({ elevation_change_m: 0 });
    const up = pipingPressureEngine.calculate({ elevation_change_m: 10 });
    expect(up.total_pressure_drop.value).toBeGreaterThan(
      flat.total_pressure_drop.value
    );
  });

  it("hydraulic oil has higher friction than water", () => {
    const water = pipingPressureEngine.calculate({ fluid: "water" });
    const oil = pipingPressureEngine.calculate({ fluid: "oil_hydraulic" });
    expect(oil.friction_loss.value).toBeGreaterThan(
      water.friction_loss.value
    );
  });

  it("wall thickness from Barlow formula > 0", () => {
    const r = pipingPressureEngine.calculate({});
    expect(r.min_wall_thickness.value).toBeGreaterThan(0);
  });

  it("warns high velocity > 3 m/s for water", () => {
    const r = pipingPressureEngine.calculate({
      flow_rate_lpm: 500,
      pipe_inner_dia_mm: 40,
      fluid: "water",
    });
    expect(r.warnings.some(w => w.includes("erosion"))).toBe(true);
  });

  it("total drop = friction + minor + elevation", () => {
    const r = pipingPressureEngine.calculate({
      pipe_length_m: 50,
      elevation_change_m: 5,
      num_elbows_90: 4,
    });
    const sum = r.friction_loss.value + r.minor_loss.value + r.elevation_loss.value;
    expect(r.total_pressure_drop.value).toBeCloseTo(sum, 2);
  });
});
