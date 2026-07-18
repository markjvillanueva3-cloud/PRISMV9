import { describe, it, expect } from "vitest";
import { CADSheetMetalEngine, cadSheetMetalEngine } from "../engines/CADSheetMetalEngine.js";

const eng = new CADSheetMetalEngine();
// helper: access delegated-result fields (result is a union; tests narrow by op)
const res = (r: { result: unknown }) => r.result as Record<string, any>;

describe("CADSheetMetalEngine — composes BendAllowanceEngine + FlatPatternEngine onto the cad surface", () => {
  // ---- happy path: real reference values from the delegated engines (R9) ----
  it("bend_allowance: BA = (pi/180)*complement*(R+K*t); 90deg R3 t2 K0.5 -> 2*pi ~= 6.283", () => {
    const r = eng.bendAllowance({ material: "mild_steel", thickness_mm: 2, bend_angle_deg: 90, inside_radius_mm: 3, k_factor: 0.5, bend_method: "air_bend" });
    expect(r.success).toBe(true);
    expect(res(r).bend_allowance_mm).toBeCloseTo(6.283, 2); // (pi/2)*4 = 2pi
  });

  it("bend_allowance: delegation carries the full BendAllowanceResult (BD reference value + k_factor)", () => {
    const r = res(eng.bendAllowance({ material: "mild_steel", thickness_mm: 2, bend_angle_deg: 90, inside_radius_mm: 3, k_factor: 0.5, bend_method: "air_bend" }));
    // BD = 2*OSSB - BA = 2*((R+t)*tan45) - 2pi = 2*5 - 6.283 = 3.717
    expect(r.bend_deduction_mm).toBeCloseTo(3.717, 2);
    expect(r.k_factor_used).toBe(0.5);
  });

  it("flat_pattern: developed length = sum(legs) - sum(BD); [50,30,50] @90,90 R2 t2 K0.5 -> ~123.4", () => {
    const r = eng.flatPattern({ material: "mild_steel", thickness_mm: 2, bend_radius_mm: 2, leg_lengths_mm: [50, 30, 50], bend_angles_deg: [90, 90], k_factor_override: 0.5 });
    expect(r.success).toBe(true);
    expect(res(r).total_flat_length.value).toBeCloseTo(123.4, 1); // 130 - 2*3.288
  });

  it("flat_pattern: delegation carries num_bends + k_factor AtomicValues", () => {
    const r = res(eng.flatPattern({ material: "mild_steel", thickness_mm: 2, bend_radius_mm: 2, leg_lengths_mm: [50, 30, 50], bend_angles_deg: [90, 90], k_factor_override: 0.5 }));
    expect(r.num_bends.value).toBe(2);
    expect(r.k_factor.value).toBeCloseTo(0.5, 6);
  });

  // ---- failure modes (>=3) ----
  it("bend_allowance: missing thickness/radius -> structured failure (no delegate)", () => {
    expect(eng.bendAllowance({ bend_angle_deg: 90, inside_radius_mm: 3 }).success).toBe(false);
    expect(eng.bendAllowance({ thickness_mm: 2, bend_angle_deg: 90 }).success).toBe(false);
  });

  it("bend_allowance: thickness<=0 or angle out of (0,180) -> failure", () => {
    expect(eng.bendAllowance({ thickness_mm: 0, bend_angle_deg: 90, inside_radius_mm: 3 }).success).toBe(false);
    expect(eng.bendAllowance({ thickness_mm: 2, bend_angle_deg: 200, inside_radius_mm: 3 }).success).toBe(false);
  });

  it("flat_pattern: non-positive leg -> structured failure", () => {
    expect(eng.flatPattern({ leg_lengths_mm: [50, -30, 50], bend_angles_deg: [90, 90] }).success).toBe(false);
  });

  it("flat_pattern: <2 legs or omitted -> failure (never silently use engine defaults; scrutiny P2 fix)", () => {
    expect(eng.flatPattern({ bend_angles_deg: [90] }).success).toBe(false);       // no legs
    expect(eng.flatPattern({ leg_lengths_mm: [50] }).success).toBe(false);        // 1 leg, no bend
  });

  it("flat_pattern: non-positive thickness / negative radius -> failure (no nonsense length; scrutiny P2 fix)", () => {
    expect(eng.flatPattern({ leg_lengths_mm: [50, 50], bend_angles_deg: [90], thickness_mm: -2 }).success).toBe(false);
    expect(eng.flatPattern({ leg_lengths_mm: [50, 50], bend_angles_deg: [90], bend_radius_mm: -1 }).success).toBe(false);
    expect(eng.flatPattern({ leg_lengths_mm: [50, 50], bend_angles_deg: [90], thickness_mm: 2 }).success).toBe(true);
  });

  it("apply: unknown op -> structured failure naming valid ops", () => {
    const r = eng.apply({ op: "hem" });
    expect(r.success).toBe(false);
    expect(r.notes[0]).toMatch(/bend_allowance\|flat_pattern/);
  });

  // ---- adversarial (>=2): NaN / Infinity ----
  it("NaN / Infinity -> structured failure, never throws", () => {
    expect(eng.bendAllowance({ thickness_mm: NaN, bend_angle_deg: 90, inside_radius_mm: 3 }).success).toBe(false);
    expect(eng.bendAllowance({ thickness_mm: 2, bend_angle_deg: Infinity, inside_radius_mm: 3 }).success).toBe(false);
    expect(eng.flatPattern({ leg_lengths_mm: [50, NaN], bend_angles_deg: [90] }).success).toBe(false);
  });

  // ---- dispatcher entrypoint round-trip (R15) ----
  it("apply(): routes bend_allowance/flat_pattern by op (+ operation/type aliases)", () => {
    expect(cadSheetMetalEngine.apply({ op: "bend_allowance", thickness_mm: 2, bend_angle_deg: 90, inside_radius_mm: 3, k_factor: 0.5 }).success).toBe(true);
    expect(cadSheetMetalEngine.apply({ operation: "flat_pattern", leg_lengths_mm: [50, 50], bend_angles_deg: [90], k_factor_override: 0.5 }).success).toBe(true);
    expect(cadSheetMetalEngine.apply({ type: "bend_allowance", thickness_mm: 2, bend_angle_deg: 90, inside_radius_mm: 3 }).op).toBe("bend_allowance");
  });
});
