/**
 * SteadyRestPlacementEngine deflection correctness -- U-LW-STEADYREST-DEFL
 * =======================================================================
 * whiskey, 2026-07-04. Found by the broad lathe-hardening audit (wf_1ead4d4d-ee3, P1).
 * SteadyRestPlacementEngine.place() computed the unsupported deflection as
 *   F*a*(L-a)^2/(3EIL) * ((2La-a^2)/L^2)
 * which is DIMENSIONLESS (one power of `a` short + a spurious factor): N*m^3/(N*m^3) x
 * (m^2/m^2). The subsequent *1e6 produced a meaningless "um" number that mis-fired the
 * "exceeds limit -> add steady rest" gate -- 3x OVER at short spans, and FLIPPING to
 * UNDER-report past ~1.5 m, silently suppressing the steady-rest recommendation for the
 * exact slender bars that need support (whip / chatter / part-throw hazard).
 * Fix: the Roark simply-supported point-load deflection at the load point,
 *   delta = F*a^2*(L-a)^2/(3*E*I*L)   [meters], which at a=L/2 reduces to F*L^3/(48EI).
 */

import { describe, it, expect } from "vitest";
import { steadyRestPlacementEngine, type SteadyRestInput } from "../engines/SteadyRestPlacementEngine.js";

const baseInput = (o: Partial<SteadyRestInput> = {}): SteadyRestInput => ({
  workpiece_length_mm: 500,
  workpiece_diameter_mm: 50,
  workpiece_mass_kg: 5,
  material_E_GPa: 200,            // steel
  chuck_to_tailstock_mm: 500,     // L = 0.5 m
  cutting_force_radial_N: 500,
  cutting_position_mm: 250,       // a = L/2
  spindle_rpm: 1000,
  length_to_diameter_ratio: 6,    // numSupports=0 -> deflWith maxSpan = L
  max_deflection_um: 10,
  steady_rest_type: "roller" as SteadyRestInput["steady_rest_type"],
  ...o,
});

describe("SteadyRestPlacementEngine -- deflection-without-support is a real length", () => {
  it("ALGEBRAIC INVARIANT: at a=L/2 with no supports, deflection_without == deflection_with (both F*L^3/48EI)", () => {
    const r = steadyRestPlacementEngine.place(baseInput({ cutting_position_mm: 250 }));
    // Corrected form F*a^2*(L-a)^2/(3EIL) at a=L/2 == the sibling mid-span F*L^3/(48EI).
    expect(r.deflection_without_um).toBeCloseTo(r.deflection_with_um, 1);
  });

  it("REFERENCE VALUE: L=0.5m a=0.25m d=50mm steel F=500N -> ~21.2 um (was a dimensionless ~64)", () => {
    const r = steadyRestPlacementEngine.place(baseInput());
    // I = pi*d^4/64 = 3.068e-7 m^4 -> delta = 2.12e-5 m = 21.2 um.
    expect(r.deflection_without_um).toBeCloseTo(21.2, 0);
    expect(r.deflection_without_um).toBeGreaterThan(0);
    expect(Number.isFinite(r.deflection_without_um)).toBe(true);
  });

  it("PHYSICAL SCALING: deflection is linear in radial cutting force", () => {
    const r1 = steadyRestPlacementEngine.place(baseInput({ cutting_force_radial_N: 500 }));
    const r2 = steadyRestPlacementEngine.place(baseInput({ cutting_force_radial_N: 1000 }));
    expect(r2.deflection_without_um).toBeCloseTo(2 * r1.deflection_without_um, 1);
  });

  it("GATE FIRES: a slender bar exceeding the tolerance now triggers the steady-rest recommendation", () => {
    const r = steadyRestPlacementEngine.place(baseInput({
      chuck_to_tailstock_mm: 600, cutting_position_mm: 300, workpiece_diameter_mm: 40,
      max_deflection_um: 5, length_to_diameter_ratio: 6, // numSupports=0 -> tests the deflWithout gate
    }));
    expect(r.deflection_without_um).toBeGreaterThan(5);
    expect(r.recommendations.some(x => /steady rest/i.test(x))).toBe(true);
  });
});
