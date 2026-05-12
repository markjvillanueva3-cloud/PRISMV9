import { describe, it, expect } from "vitest";
import { latheChuckJawSetupEngine } from "../engines/LatheChuckJawSetupEngine.js";

const BASE = {
  part_od_mm: 40,
  part_od_tol_mm: 0.05,
  clamp_force_kn: 10,
  jaw_mass_kg: 0.8,
  jaw_centroid_radius_mm: 60,
  chuck_rated_max_rpm: 4500,
  operating_rpm: 2000,
};

describe("LatheChuckJawSetupEngine", () => {
  it("computes bore <= part_od (springback pushes bore below or equal after rounding)", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.bore_diameter_mm).toBeLessThanOrEqual(BASE.part_od_mm);
    expect(r.bore_diameter_mm).toBeGreaterThan(BASE.part_od_mm - 0.5);
  });

  it("springback is positive for non-zero clamp", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.springback_mm).toBeGreaterThan(0);
  });

  it("min_grip_length >= 3mm", () => {
    const r = latheChuckJawSetupEngine.compute({ ...BASE, part_od_mm: 5 });
    expect(r.min_grip_length_mm).toBeGreaterThanOrEqual(3);
  });

  it("grip length scales with 0.2 × part_od for large OD", () => {
    const r = latheChuckJawSetupEngine.compute({ ...BASE, part_od_mm: 100 });
    expect(r.min_grip_length_mm).toBeCloseTo(20, 1);
  });

  it("recommended_grip_length > min", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.recommended_grip_length_mm).toBeGreaterThan(r.min_grip_length_mm);
  });

  it("step_face_depth_mm present when step_required", () => {
    const r = latheChuckJawSetupEngine.compute({ ...BASE, step_required: true, step_z_mm: 5 });
    expect(r.step_face_depth_mm).toBeGreaterThan(0);
  });

  it("no step_face_depth when step_required false", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.step_face_depth_mm).toBeUndefined();
  });

  it("operating_rpm_safe true when rpm below balance limit", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.operating_rpm_safe).toBe(true);
  });

  it("operating_rpm_safe false at extreme rpm", () => {
    const r = latheChuckJawSetupEngine.compute({ ...BASE, operating_rpm: 100000 });
    expect(r.operating_rpm_safe).toBe(false);
    expect(r.warnings.some((w) => /exceeds/i.test(w))).toBe(true);
  });

  it("max_safe_rpm_balance > 0", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    expect(r.max_safe_rpm_balance).toBeGreaterThan(0);
  });

  it("heavier jaw lowers max balance RPM", () => {
    const light = latheChuckJawSetupEngine.compute({ ...BASE, jaw_mass_kg: 0.5 });
    const heavy = latheChuckJawSetupEngine.compute({ ...BASE, jaw_mass_kg: 2.0 });
    expect(heavy.max_safe_rpm_balance).toBeLessThan(light.max_safe_rpm_balance);
  });

  it("warns when master pressure not used", () => {
    const r = latheChuckJawSetupEngine.compute({ ...BASE, use_master_pressure: false });
    expect(r.warnings.some((w) => /master pressure/i.test(w))).toBe(true);
  });

  it("custom jaw modulus changes springback", () => {
    const soft = latheChuckJawSetupEngine.compute({ ...BASE, jaw_modulus_mpa: 70000 });
    const hard = latheChuckJawSetupEngine.compute({ ...BASE, jaw_modulus_mpa: 210000 });
    expect(soft.springback_mm).toBeGreaterThan(hard.springback_mm);
  });

  it("reasoning mentions springback, grip, and rpm", () => {
    const r = latheChuckJawSetupEngine.compute(BASE);
    const text = r.reasoning.join(" ");
    expect(text.toLowerCase()).toMatch(/spring/);
    expect(text.toLowerCase()).toMatch(/grip/);
    expect(text.toLowerCase()).toMatch(/rpm/);
  });

  it("getStats returns reference citation", () => {
    const s = latheChuckJawSetupEngine.getStats();
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
