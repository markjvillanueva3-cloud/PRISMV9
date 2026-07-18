/**
 * ScrewJackEngine — Unit Tests
 * @milestone FORGE-ENGINES-B49
 */
import { describe, it, expect } from "vitest";
import { screwJackEngine } from "../engines/ScrewJackEngine.js";

describe("ScrewJackEngine", () => {
  it("torque to raise > 0", () => {
    const r = screwJackEngine.calculate({});
    expect(r.torque_raise.value).toBeGreaterThan(0);
  });

  it("torque to lower > 0 (self-locking)", () => {
    const r = screwJackEngine.calculate({
      thread_friction: 0.15, num_starts: 1,
    });
    expect(r.torque_lower.value).toBeGreaterThan(0);
  });

  it("raise torque > lower torque when self-locking", () => {
    const r = screwJackEngine.calculate({
      thread_friction: 0.15, num_starts: 1,
    });
    expect(r.torque_raise.value).toBeGreaterThan(
      r.torque_lower.value
    );
  });

  it("efficiency between 0 and 100%", () => {
    const r = screwJackEngine.calculate({});
    expect(r.efficiency.value).toBeGreaterThan(0);
    expect(r.efficiency.value).toBeLessThan(100);
  });

  it("single-start with friction is self-locking", () => {
    const r = screwJackEngine.calculate({
      num_starts: 1, thread_friction: 0.15,
    });
    expect(r.self_locking.value).toBe(1);
  });

  it("higher load increases torque", () => {
    const lo = screwJackEngine.calculate({ load_n: 10000 });
    const hi = screwJackEngine.calculate({ load_n: 100000 });
    expect(hi.torque_raise.value).toBeGreaterThan(
      lo.torque_raise.value
    );
  });

  it("lead angle > 0", () => {
    const r = screwJackEngine.calculate({});
    expect(r.lead_angle.value).toBeGreaterThan(0);
  });

  it("screw stress > 0", () => {
    const r = screwJackEngine.calculate({});
    expect(r.screw_stress.value).toBeGreaterThan(0);
  });

  it("buckling load > 0", () => {
    const r = screwJackEngine.calculate({});
    expect(r.buckling_load.value).toBeGreaterThan(0);
  });

  it("warns not self-locking multi-start", () => {
    const r = screwJackEngine.calculate({
      num_starts: 4, thread_friction: 0.05,
    });
    expect(r.warnings.some(w =>
      w.includes("self-locking") || w.includes("back-drive")
    )).toBe(true);
  });
});
