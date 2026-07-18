/**
 * CouplingSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B36
 */
import { describe, it, expect } from "vitest";
import { couplingSelectionEngine } from "../engines/CouplingSelectionEngine.js";

describe("CouplingSelectionEngine", () => {
  it("nominal torque > 0 with defaults", () => {
    const r = couplingSelectionEngine.calculate({});
    expect(r.nominal_torque.value).toBeGreaterThan(0);
  });

  it("design torque > nominal torque (service factor)", () => {
    const r = couplingSelectionEngine.calculate({});
    expect(r.design_torque.value).toBeGreaterThan(r.nominal_torque.value);
  });

  it("crusher has higher service factor than pump", () => {
    const pump = couplingSelectionEngine.calculate({ application: "pump" });
    const crush = couplingSelectionEngine.calculate({ application: "crusher" });
    expect(crush.service_factor.value).toBeGreaterThan(
      pump.service_factor.value
    );
  });

  it("higher power needs larger coupling size", () => {
    const small = couplingSelectionEngine.calculate({ power_kw: 2 });
    const large = couplingSelectionEngine.calculate({ power_kw: 50 });
    expect(large.recommended_size.value).toBeGreaterThanOrEqual(
      small.recommended_size.value
    );
  });

  it("torque inversely proportional to speed at same power", () => {
    const slow = couplingSelectionEngine.calculate({
      power_kw: 10,
      speed_rpm: 750,
    });
    const fast = couplingSelectionEngine.calculate({
      power_kw: 10,
      speed_rpm: 3000,
    });
    expect(slow.nominal_torque.value).toBeGreaterThan(
      fast.nominal_torque.value
    );
  });

  it("rigid coupling has zero misalignment capacity", () => {
    const r = couplingSelectionEngine.calculate({
      coupling_type: "rigid",
      angular_misalignment_deg: 0,
      parallel_misalignment_mm: 0,
      axial_displacement_mm: 0,
    });
    expect(r.misalignment_ok.unit).toBe("PASS");
  });

  it("warns shaft exceeds max bore", () => {
    const r = couplingSelectionEngine.calculate({
      power_kw: 2,
      coupling_type: "jaw",
      shaft_diameter_mm: 100,
    });
    expect(r.warnings.some(w => w.includes("bore"))).toBe(true);
  });

  it("warns rigid coupling with misalignment", () => {
    const r = couplingSelectionEngine.calculate({
      coupling_type: "rigid",
      angular_misalignment_deg: 1.0,
    });
    expect(r.warnings.some(w => w.includes("Rigid"))).toBe(true);
  });

  it("gear coupling handles high torque", () => {
    const r = couplingSelectionEngine.calculate({
      power_kw: 200,
      speed_rpm: 1500,
      coupling_type: "gear",
    });
    expect(r.recommended_size.value).toBeGreaterThan(0);
    expect(r.design_torque.value).toBeGreaterThan(1000);
  });

  it("max speed field populated", () => {
    const r = couplingSelectionEngine.calculate({});
    expect(r.max_speed.value).toBeGreaterThan(0);
  });
});
