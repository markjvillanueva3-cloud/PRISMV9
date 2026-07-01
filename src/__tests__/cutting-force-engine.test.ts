/**
 * CuttingForceEngine — Unit Tests
 * @milestone FORGE-ENGINES-B18
 */
import { describe, it, expect } from "vitest";
import { cuttingForceEngine } from "../engines/CuttingForceEngine.js";

describe("CuttingForceEngine", () => {
  it("calculates tangential force for steel turning", () => {
    const r = cuttingForceEngine.calculate({
      operation: "turning",
      material_type: "steel",
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    expect(r.tangential_force.value).toBeGreaterThan(0);
    expect(r.radial_force.value).toBeGreaterThan(0);
    expect(r.axial_force.value).toBeGreaterThan(0);
  });

  it("resultant > tangential", () => {
    const r = cuttingForceEngine.calculate({
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    expect(r.resultant_force.value).toBeGreaterThan(
      r.tangential_force.value
    );
  });

  it("aluminum has lower forces than steel", () => {
    const steel = cuttingForceEngine.calculate({
      material_type: "steel",
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    const alum = cuttingForceEngine.calculate({
      material_type: "aluminum",
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    expect(alum.tangential_force.value).toBeLessThan(
      steel.tangential_force.value
    );
  });

  it("force increases with DOC", () => {
    const light = cuttingForceEngine.calculate({
      depth_of_cut_mm: 1,
      feed_mm: 0.2,
    });
    const heavy = cuttingForceEngine.calculate({
      depth_of_cut_mm: 3,
      feed_mm: 0.2,
    });
    expect(heavy.tangential_force.value).toBeGreaterThan(
      light.tangential_force.value
    );
  });

  it("calculates power consumption", () => {
    const r = cuttingForceEngine.calculate({
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
      cutting_speed_mpm: 200,
    });
    expect(r.power.value).toBeGreaterThan(0);
  });

  it("calculates torque", () => {
    const r = cuttingForceEngine.calculate({
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    expect(r.torque.value).toBeGreaterThan(0);
  });

  it("drilling has zero radial force", () => {
    const r = cuttingForceEngine.calculate({
      operation: "drilling",
      depth_of_cut_mm: 5,
      feed_mm: 0.15,
    });
    expect(r.radial_force.value).toBe(0);
  });

  it("warns thin chip rubbing", () => {
    const r = cuttingForceEngine.calculate({
      depth_of_cut_mm: 0.5,
      feed_mm: 0.01,
    });
    expect(
      r.warnings.some(w => w.includes("rubbing"))
    ).toBe(true);
  });

  it("specific cutting force uses Kienzle model", () => {
    const r = cuttingForceEngine.calculate({
      material_type: "steel",
      depth_of_cut_mm: 2,
      feed_mm: 0.2,
    });
    // Kc should be > Kc1.1 for thin chips (h < 1mm)
    expect(r.specific_cutting_force.value).toBeGreaterThan(1800);
  });
});
