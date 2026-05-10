/**
 * ScientificReasoningEngine.test.ts
 *
 * Tests dimensional algebra (multiply / divide / power), dimensional
 * consistency check, unit-to-dimension lookup, and validateFormula
 * across canonical and unknown formula ids. No mocks. All assertions
 * are exact-numeric or exact-string.
 *
 * SI base dimensions (matches src/engines/ScientificReasoningEngine.ts):
 *   L = length, M = mass, T = time, I = current, Θ = temperature,
 *   N = amount, J = luminous intensity.
 */
import { describe, it, expect } from "vitest";
import {
  scientificReasoningEngine,
  type Dimension,
  type PhysicalQuantity,
} from "../engines/ScientificReasoningEngine.js";

// ----------------------------------------------------------------------------
// Reference dimensions (no magic numbers in assertions)
// ----------------------------------------------------------------------------
const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
const FORCE_DIM: Dimension       = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
const LENGTH_DIM: Dimension      = { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
const TIME_DIM: Dimension        = { L: 0, M: 0, T: 1, I: 0, Θ: 0, N: 0, J: 0 };
const VELOCITY_DIM: Dimension    = { L: 1, M: 0, T: -1, I: 0, Θ: 0, N: 0, J: 0 };
const ENERGY_DIM: Dimension      = { L: 2, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
const POWER_DIM: Dimension       = { L: 2, M: 1, T: -3, I: 0, Θ: 0, N: 0, J: 0 };
const AREA_DIM: Dimension        = { L: 2, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
const PRESSURE_DIM: Dimension    = { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };

function pq(value: number, unit: string, dimension: Dimension): PhysicalQuantity {
  return { value, unit, dimension };
}

/** Normalize signed zeros (`-0` → `+0`) so toEqual against canonical
 *  Dimension records doesn't false-fail. JavaScript spec: `(-2) * 0 = -0`,
 *  and vitest `toEqual` uses Object.is which treats -0 ≠ +0. */
function normZero(d: Dimension): Dimension {
  return { L: d.L + 0, M: d.M + 0, T: d.T + 0, I: d.I + 0, Θ: d.Θ + 0, N: d.N + 0, J: d.J + 0 };
}

describe("ScientificReasoningEngine — dimensional algebra", () => {
  it("multiplyDimensions: Force × Length = Energy [M·L²·T⁻²]", () => {
    expect(scientificReasoningEngine.multiplyDimensions(FORCE_DIM, LENGTH_DIM)).toEqual(ENERGY_DIM);
  });

  it("divideDimensions: Length / Time = Velocity [L·T⁻¹]", () => {
    expect(scientificReasoningEngine.divideDimensions(LENGTH_DIM, TIME_DIM)).toEqual(VELOCITY_DIM);
  });

  it("powerDimension: Length² = Area [L²]", () => {
    expect(scientificReasoningEngine.powerDimension(LENGTH_DIM, 2)).toEqual(AREA_DIM);
  });

  it("multiplyDimensions identity: Dimensionless × Force = Force", () => {
    expect(scientificReasoningEngine.multiplyDimensions(DIMENSIONLESS, FORCE_DIM)).toEqual(FORCE_DIM);
  });

  it("divideDimensions self-inverse: Force / Force = Dimensionless", () => {
    expect(scientificReasoningEngine.divideDimensions(FORCE_DIM, FORCE_DIM)).toEqual(DIMENSIONLESS);
  });

  it("powerDimension to 0 ⇒ Dimensionless for both Force and Power inputs", () => {
    expect(normZero(scientificReasoningEngine.powerDimension(FORCE_DIM, 0))).toEqual(DIMENSIONLESS);
    expect(normZero(scientificReasoningEngine.powerDimension(POWER_DIM, 0))).toEqual(DIMENSIONLESS);
  });

  it("powerDimension to -1 negates every exponent (Velocity⁻¹ = Slowness)", () => {
    const r = scientificReasoningEngine.powerDimension(VELOCITY_DIM, -1);
    expect(normZero(r)).toEqual({ L: -1, M: 0, T: 1, I: 0, Θ: 0, N: 0, J: 0 });
  });
});

describe("ScientificReasoningEngine — checkDimensionalConsistency", () => {
  it("matching Force == Force ⇒ valid:true, both side dimensions echo Force", () => {
    const lhs = pq(100, "N", FORCE_DIM);
    const rhs = pq(50, "N", FORCE_DIM);
    const r = scientificReasoningEngine.checkDimensionalConsistency(lhs, rhs);
    expect(r.valid).toBe(true);
    expect(r.left_dimension).toEqual(FORCE_DIM);
    expect(r.right_dimension).toEqual(FORCE_DIM);
  });

  it("Force vs Length mismatch ⇒ valid:false, mismatch lists Mass and Time axes", () => {
    const lhs = pq(100, "N", FORCE_DIM);
    const rhs = pq(0.05, "m", LENGTH_DIM);
    const r = scientificReasoningEngine.checkDimensionalConsistency(lhs, rhs);
    expect(r.valid).toBe(false);
    // describeMismatch lists "Mass: 1 vs 0" and "Time: -2 vs 0"
    expect(r.mismatch).toContain("Mass: 1 vs 0");
    expect(r.mismatch).toContain("Time: -2 vs 0");
    expect(r.left_dimension).toEqual(FORCE_DIM);
    expect(r.right_dimension).toEqual(LENGTH_DIM);
  });

  it("same dimension different magnitude/unit ⇒ valid:true (engine compares dimensions only)", () => {
    const lhs = pq(1000, "mm", LENGTH_DIM);
    const rhs = pq(1, "m", LENGTH_DIM);
    const r = scientificReasoningEngine.checkDimensionalConsistency(lhs, rhs);
    expect(r.valid).toBe(true);
    expect(r.left_dimension).toEqual(LENGTH_DIM);
  });
});

describe("ScientificReasoningEngine — getDimension", () => {
  it("'N' ⇒ Force [L:1, M:1, T:-2]", () => {
    expect(scientificReasoningEngine.getDimension("N")).toEqual(FORCE_DIM);
  });

  it("'m' ⇒ Length [L:1]", () => {
    expect(scientificReasoningEngine.getDimension("m")).toEqual(LENGTH_DIM);
  });

  it("unknown unit ⇒ DIMENSIONLESS (all-zero) fallback", () => {
    expect(scientificReasoningEngine.getDimension("__no_such_unit__")).toEqual(DIMENSIONLESS);
  });
});

describe("ScientificReasoningEngine — validateFormula", () => {
  it("unknown formulaId ⇒ valid:false, confidence 0, recommendations include 'Verify formula'", () => {
    const r = scientificReasoningEngine.validateFormula(
      "totally-not-a-formula",
      {},
      pq(100, "N", FORCE_DIM)
    );
    expect(r.valid).toBe(false);
    expect(r.confidence).toBe(0);
    expect(r.formula).toBe("Unknown");
    expect(r.recommendations).toContain("Verify formula against literature");
  });

  it("kienzle_force with correct Force output ⇒ dimensional_check.valid:true, formula_id echoed", () => {
    const r = scientificReasoningEngine.validateFormula(
      "kienzle_force",
      { kc: pq(1800, "N/mm²", PRESSURE_DIM),
        b:  pq(2.5,  "mm",    LENGTH_DIM),
        h:  pq(0.1,  "mm",    LENGTH_DIM) },
      pq(450, "N", FORCE_DIM)
    );
    expect(r.formula_id).toBe("kienzle_force");
    expect(r.dimensional_check.valid).toBe(true);
    expect(r.dimensional_check.left_dimension).toEqual(FORCE_DIM);
    expect(r.dimensional_check.right_dimension).toEqual(FORCE_DIM);
  });

  it("kienzle_force with WRONG output dimension (Length) ⇒ dimensional_check.valid:false", () => {
    const r = scientificReasoningEngine.validateFormula(
      "kienzle_force",
      { kc: pq(1800, "N/mm²", PRESSURE_DIM) },
      pq(0.05, "m", LENGTH_DIM)
    );
    expect(r.dimensional_check.valid).toBe(false);
    expect(r.dimensional_check.left_dimension).toEqual(LENGTH_DIM);
    expect(r.dimensional_check.right_dimension).toEqual(FORCE_DIM);
  });

  it("deflection_cantilever with correct Length output ⇒ dimensional_check.valid:true", () => {
    const r = scientificReasoningEngine.validateFormula(
      "deflection_cantilever",
      { F: pq(100, "N", FORCE_DIM), L: pq(50, "mm", LENGTH_DIM) },
      pq(0.02, "mm", LENGTH_DIM)
    );
    expect(r.dimensional_check.valid).toBe(true);
    expect(r.dimensional_check.right_dimension).toEqual(LENGTH_DIM);
  });

  it("power_cutting with correct Power output ⇒ dimensional_check.valid:true", () => {
    const r = scientificReasoningEngine.validateFormula(
      "power_cutting",
      { F: pq(450, "N", FORCE_DIM), V: pq(200, "m/min", VELOCITY_DIM) },
      pq(1500, "W", POWER_DIM)
    );
    expect(r.dimensional_check.valid).toBe(true);
    expect(r.dimensional_check.right_dimension).toEqual(POWER_DIM);
  });
});
