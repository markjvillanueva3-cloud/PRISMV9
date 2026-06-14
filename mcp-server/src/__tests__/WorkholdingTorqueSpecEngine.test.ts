import { describe, it, expect } from "vitest";
import {
  workholdingTorqueSpecEngine as eng,
  WorkholdingTorqueSpecEngine,
  type WorkholdingTorqueInput,
} from "../engines/WorkholdingTorqueSpecEngine.js";

function nominal(o: Partial<WorkholdingTorqueInput> = {}): WorkholdingTorqueInput {
  return {
    fixture_id: "JMDIE-FIX-001",
    n_clamps: 4,
    bolt_diameter_mm: 12,
    friction: "steel_smooth",
    lubrication: "dry",
    cutting_force_lateral_n: 500,
    cutting_force_vertical_n: 200,
    part_weight_kg: 10,
    ...o,
  };
}

describe("WorkholdingTorqueSpecEngine", () => {
  it("exports a singleton with compute()", () => {
    expect(eng).toBeInstanceOf(WorkholdingTorqueSpecEngine);
    expect(typeof eng.compute).toBe("function");
  });

  it("throws on missing inputs", () => {
    expect(() => eng.compute({} as WorkholdingTorqueInput)).toThrow(/fixture_id \+ positive n_clamps \+ bolt_diameter_mm/);
  });

  it("throws on zero clamps", () => {
    expect(() => eng.compute(nominal({ n_clamps: 0 }))).toThrow(/positive n_clamps/);
  });

  it("computes correct hold force (lateral wins when F_lat/μ > F_vert+W)", () => {
    // F_lat=500, μ=0.15 → 500/0.15 = 3333N
    // F_vert+W = 200 + 98.1 = 298.1N
    // max=3333, × sf=2 = 6666N
    const r = eng.compute(nominal());
    expect(r.required_hold_force_n.value).toBeCloseTo(6666.7, 0);
  });

  it("per-clamp force = required / n_clamps", () => {
    const r = eng.compute(nominal());
    expect(r.per_clamp_force_n.value).toBeCloseTo(1666.7, 0);
  });

  it("torque = K × F × D (dry K=0.20, D=12mm=0.012m)", () => {
    const r = eng.compute(nominal());
    // T = 0.20 × 1666.7 × 0.012 = 4.0 N·m
    expect(r.per_clamp_torque_nm.value).toBeCloseTo(4.0, 1);
  });

  it("ft·lb conversion: N·m × 0.737562", () => {
    const r = eng.compute(nominal());
    expect(r.per_clamp_torque_ftlb.value).toBeCloseTo(r.per_clamp_torque_nm.value * 0.737562, 2);
  });

  it("grit friction (μ=0.30) halves required hold force vs smooth (μ=0.15)", () => {
    const smooth = eng.compute(nominal({ friction: "steel_smooth" }));
    const grit = eng.compute(nominal({ friction: "steel_grit" }));
    expect(grit.required_hold_force_n.value).toBeCloseTo(smooth.required_hold_force_n.value / 2, 0);
  });

  it("lubricated bolt (K=0.15) reduces torque vs dry (K=0.20) by 25%", () => {
    const dry = eng.compute(nominal({ lubrication: "dry" }));
    const lub = eng.compute(nominal({ lubrication: "lubricated" }));
    expect(lub.per_clamp_torque_nm.value).toBeCloseTo(dry.per_clamp_torque_nm.value * 0.75, 1);
  });

  it("anti-seize (K=0.10) reduces torque vs dry by 50%", () => {
    const dry = eng.compute(nominal({ lubrication: "dry" }));
    const as = eng.compute(nominal({ lubrication: "anti_seize" }));
    expect(as.per_clamp_torque_nm.value).toBeCloseTo(dry.per_clamp_torque_nm.value * 0.5, 1);
  });

  it("vertical case wins when F_vert + W > F_lat / μ", () => {
    const r = eng.compute(nominal({
      cutting_force_lateral_n: 50,    // small
      cutting_force_vertical_n: 5000, // large
      part_weight_kg: 100,
    }));
    // F_lat/μ = 50/0.15 = 333N
    // F_vert+W = 5000 + 981 = 5981N
    // × sf=2 = 11962N
    expect(r.required_hold_force_n.value).toBeCloseTo(11962.0, 0);
  });

  it("custom safety_factor scales required hold force linearly", () => {
    const sf2 = eng.compute(nominal({ safety_factor: 2.0 }));
    const sf3 = eng.compute(nominal({ safety_factor: 3.0 }));
    expect(sf3.required_hold_force_n.value).toBeCloseTo(sf2.required_hold_force_n.value * 1.5, 0);
  });

  it("warns on sf < 1.5 (below ASME B5.59 minimum)", () => {
    const r = eng.compute(nominal({ safety_factor: 1.0 }));
    expect(r.warnings.some(w => /B5\.59|1\.5|minimum/i.test(w))).toBe(true);
  });

  it("warns when per-clamp force exceeds typical bolt yield", () => {
    const r = eng.compute(nominal({
      cutting_force_lateral_n: 50000,
      friction: "steel_smooth",  // μ=0.15 → huge required force
      n_clamps: 2,
    }));
    expect(r.warnings.some(w => /yield|bolt/i.test(w))).toBe(true);
  });

  it("works for soft jaws (μ=0.40) — most aggressive friction class", () => {
    const r = eng.compute(nominal({ friction: "soft_jaws" }));
    // F_lat/μ = 500/0.40 = 1250N, × sf=2 = 2500N
    expect(r.required_hold_force_n.value).toBeCloseTo(2500, 0);
  });

  it("source cites ASME B5.59 + Shigley + ISO 898-1", () => {
    const r = eng.compute(nominal());
    expect(r.source).toMatch(/ASME B5\.59|Shigley|ISO 898/);
  });
});
