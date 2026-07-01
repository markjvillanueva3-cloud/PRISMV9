/**
 * CraneLoadEngine — Unit Tests
 * @milestone FORGE-ENGINES-B34
 */
import { describe, it, expect } from "vitest";
import { craneLoadEngine } from "../engines/CraneLoadEngine.js";

describe("CraneLoadEngine", () => {
  it("total load includes dynamic factor", () => {
    const r = craneLoadEngine.calculate({ load_weight_kg: 1000 });
    expect(r.total_load.value).toBeGreaterThan(1000);
  });

  it("more sling legs reduces tension per leg", () => {
    const two = craneLoadEngine.calculate({ num_sling_legs: 2 });
    const four = craneLoadEngine.calculate({ num_sling_legs: 4 });
    expect(four.sling_tension_per_leg.value).toBeLessThan(
      two.sling_tension_per_leg.value
    );
  });

  it("steeper sling angle increases tension", () => {
    const steep = craneLoadEngine.calculate({ sling_angle_deg: 30 });
    const wide = craneLoadEngine.calculate({ sling_angle_deg: 60 });
    expect(steep.sling_tension_per_leg.value).toBeGreaterThan(
      wide.sling_tension_per_leg.value
    );
  });

  it("warns overload when exceeding capacity", () => {
    const r = craneLoadEngine.calculate({
      load_weight_kg: 6000,
      crane_capacity_kg: 5000,
    });
    expect(r.warnings.some(w => w.includes("exceeds"))).toBe(true);
  });

  it("wire rope SF calculated", () => {
    const r = craneLoadEngine.calculate({});
    expect(r.wire_rope_safety_factor.value).toBeGreaterThan(0);
  });

  it("heavier duty class increases dynamic factor", () => {
    const m1 = craneLoadEngine.calculate({ duty_class: "M1" });
    const m7 = craneLoadEngine.calculate({ duty_class: "M7" });
    expect(m7.dynamic_factor.value).toBeGreaterThan(m1.dynamic_factor.value);
  });

  it("utilization < 1 when within capacity", () => {
    const r = craneLoadEngine.calculate({
      load_weight_kg: 2000,
      crane_capacity_kg: 10000,
    });
    expect(r.utilization.value).toBeLessThan(1);
  });

  it("feasible with normal load", () => {
    const r = craneLoadEngine.calculate({
      load_weight_kg: 1000,
      crane_capacity_kg: 5000,
    });
    expect(r.crane_feasible.unit).toBe("PASS");
  });

  it("warns single-leg sling", () => {
    const r = craneLoadEngine.calculate({ num_sling_legs: 1 });
    expect(r.warnings.some(w => w.includes("Single-leg"))).toBe(true);
  });

  it("stronger rope grade increases breaking force", () => {
    const low = craneLoadEngine.calculate({ wire_rope_grade: "1570" });
    const high = craneLoadEngine.calculate({ wire_rope_grade: "1960" });
    expect(high.wire_rope_breaking_force.value).toBeGreaterThan(
      low.wire_rope_breaking_force.value
    );
  });
});
