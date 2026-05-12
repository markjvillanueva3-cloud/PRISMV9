/**
 * FluidCouplingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B50
 */
import { describe, it, expect } from "vitest";
import { fluidCouplingEngine } from "../engines/FluidCouplingEngine.js";

describe("FluidCouplingEngine", () => {
  it("transmitted torque > 0", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.transmitted_torque.value).toBeGreaterThan(0);
  });

  it("output speed < input speed (slip)", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.output_speed.value).toBeLessThan(1500);
  });

  it("efficiency < 100%", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.efficiency.value).toBeLessThan(100);
    expect(r.efficiency.value).toBeGreaterThan(0);
  });

  it("more slip reduces efficiency", () => {
    const lo = fluidCouplingEngine.calculate({ slip_pct: 2 });
    const hi = fluidCouplingEngine.calculate({ slip_pct: 8 });
    expect(hi.efficiency.value).toBeLessThan(lo.efficiency.value);
  });

  it("heat generated > 0", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.heat_generated.value).toBeGreaterThan(0);
  });

  it("more slip generates more heat", () => {
    const lo = fluidCouplingEngine.calculate({ slip_pct: 1 });
    const hi = fluidCouplingEngine.calculate({ slip_pct: 5 });
    expect(hi.heat_generated.value).toBeGreaterThan(
      lo.heat_generated.value
    );
  });

  it("stall torque > rated torque", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.stall_torque.value).toBeGreaterThan(
      r.transmitted_torque.value
    );
  });

  it("fluid volume > 0", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.fluid_volume.value).toBeGreaterThan(0);
  });

  it("thermal capacity > 0", () => {
    const r = fluidCouplingEngine.calculate({});
    expect(r.thermal_capacity.value).toBeGreaterThan(0);
  });

  it("warns high slip", () => {
    const r = fluidCouplingEngine.calculate({ slip_pct: 8 });
    expect(r.warnings.some(w =>
      w.includes("lip") || w.includes("heat")
    )).toBe(true);
  });
});
