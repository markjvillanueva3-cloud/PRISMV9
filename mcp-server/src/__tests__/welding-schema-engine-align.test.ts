/**
 * Welding dispatcher schema<->engine realignment guard (slot:bravo 2026-06-19,
 * U-FE-SPECIALTY-WELDING-CONTRACT).
 *
 * The 3 welding actions used by the SPA welding page were dead-on-arrival at the dispatcher
 * round-trip: their schemas validated param names/enums the engines never read, so a valid
 * call either 400'd (enum mismatch) or fed the engine garbage -> NaN. This guard proves the
 * realigned schemas now (a) ACCEPT each engine's real {Input} convention through the dispatcher's
 * own validateActionParams, (b) let the real engine compute finite reference values, and
 * (c) REJECT the old/invalid enum names (so the realignment can't silently regress).
 *
 * Round-trips the dispatcher's actual validator + the actual engines -- no mocks.
 */
import { describe, expect, it } from "vitest";

import { validateActionParams } from "../utils/dispatcherMiddleware.js";
import { WELDING_JOINING_ACTION_SCHEMAS } from "../schemas/weldingJoiningActionSchemas.js";
import { weldingEngine } from "../engines/WeldingEngine.js";
import { weldStrengthEngine } from "../engines/WeldStrengthEngine.js";
import { weldDistortionEngine } from "../engines/WeldDistortionEngine.js";

function validate(action: string, params: Record<string, unknown>) {
  return validateActionParams(action, params, WELDING_JOINING_ACTION_SCHEMAS);
}

describe("welding_calculate schema<->engine alignment", () => {
  const engineParams = {
    process: "gmaw",
    voltage_V: 25,
    current_A: 200,
    travel_speed_mm_min: 300,
    plate_thickness_mm: 10,
  };

  it("accepts the engine WeldingInput convention through the dispatcher validator", () => {
    const v = validate("welding_calculate", engineParams);
    expect(v.valid).toBe(true);
  });

  it("computes a hand-verifiable heat input (gmaw eta=0.85 -> 0.85 kJ/mm)", () => {
    // HI = (eta*V*I)/(v_mm/min/60)/1000 = (0.85*25*200)/(300/60)/1000 = 4250/5/1000 = 0.85
    const r = weldingEngine.calculate(engineParams as any);
    expect(r.heat_input_kJ_mm.value).toBeCloseTo(0.85, 2);
    expect(Number.isFinite(r.haz_width_mm.value)).toBe(true);
    expect(r.haz_width_mm.value).toBeGreaterThan(0);
  });

  it("REJECTS the old public process enum (mig) now that the schema is engine-aligned", () => {
    const v = validate("welding_calculate", { ...engineParams, process: "mig" });
    expect(v.valid).toBe(false);
    expect(v.errorMessage).toMatch(/process/);
  });

  it("REJECTS a nonsense process value", () => {
    const v = validate("welding_calculate", { ...engineParams, process: "banana" });
    expect(v.valid).toBe(false);
  });
});

describe("weld_strength_calculate schema<->engine alignment", () => {
  const engineParams = {
    weld_type: "butt_full",
    electrode: "E70",
    leg_size_mm: 6,
    weld_length_mm: 100,
    plate_thickness_mm: 10,
    force_n: 50000,
  };

  it("accepts the engine WeldStrengthInput weld_type enum (butt_full) -- was rejected before", () => {
    const v = validate("weld_strength_calculate", engineParams);
    expect(v.valid).toBe(true);
  });

  it("computes the butt_full E70 allowable_stress = 0.60 x 482 = 289 MPa (AWS D1.1)", () => {
    const r = weldStrengthEngine.calculate(engineParams as any);
    // BUTT_ALLOW_FACTOR 0.60 x ELECTRODE_UTS.E70 482 = 289.2 -> r0 = 289. The [280,320] window
    // FAILS if the fillet branch (0.30x482=145) ran instead -- proves weld_type drove the path.
    expect(r.allowable_stress.value).toBeGreaterThan(280);
    expect(r.allowable_stress.value).toBeLessThan(320);
  });

  it("REJECTS the old schema weld_type enum value (groove) absent from the engine", () => {
    const v = validate("weld_strength_calculate", { ...engineParams, weld_type: "groove" });
    expect(v.valid).toBe(false);
    expect(v.errorMessage).toMatch(/weld_type/);
  });
});

describe("weld_distortion_calculate schema<->engine alignment", () => {
  const engineParams = {
    joint_type: "fillet_t",
    plate_thickness_mm: 10,
    weld_length_mm: 300,
    heat_input_kj_mm: 1.2,
    material: "mild_steel",
  };

  it("accepts the engine WeldDistortionInput joint_type (was validated as weld_type before)", () => {
    const v = validate("weld_distortion_calculate", engineParams);
    expect(v.valid).toBe(true);
  });

  it("computes hand-verifiable fillet_t distortion (Masubuchi/Okerblom)", () => {
    // fillet_t, leg default 6, t=10, free restraint (Rf=1): Aw=0.5*6*6=18.
    // transverse = Ct(0.15)*Aw/t = 0.15*18/10 = 0.27 mm; angular = Ca(0.025)*HI*1000/t^2 =
    // 0.025*1.2*1000/100 = 0.30 deg.
    const r = weldDistortionEngine.calculate(engineParams as any);
    expect(r.transverse_shrinkage.value).toBeCloseTo(0.27, 2);
    expect(r.angular_distortion.value).toBeCloseTo(0.3, 2);
    expect(r.carbon_equivalent.value).toBeGreaterThan(0);
  });

  it("REJECTS a joint_type the engine does not model (plain 'fillet', no _t/_lap)", () => {
    const v = validate("weld_distortion_calculate", { ...engineParams, joint_type: "fillet" });
    expect(v.valid).toBe(false);
    expect(v.errorMessage).toMatch(/joint_type/);
  });
});
