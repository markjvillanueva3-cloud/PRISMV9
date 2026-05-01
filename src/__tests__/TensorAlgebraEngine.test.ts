/**
 * TensorAlgebraEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P1-U04
 */
import { describe, it, expect } from "vitest";
import { TensorAlgebraEngine, type Voigt6 } from "../engines/TensorAlgebraEngine.js";

// ============================================================================
// VOIGT CONVERSION
// ============================================================================

describe("TensorAlgebraEngine — Voigt Conversion", () => {
  it("round-trips stress tensor through Voigt", () => {
    const T = [[100, 30, 10], [30, 200, 20], [10, 20, 300]];
    const v = TensorAlgebraEngine.toVoigt(T);
    expect(v).toEqual([100, 200, 300, 20, 10, 30]);
    const T2 = TensorAlgebraEngine.fromVoigt(v);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(T2[i][j]).toBeCloseTo(T[i][j]);
  });

  it("strain Voigt doubles off-diagonals", () => {
    const eps = [[0.01, 0.005, 0], [0.005, 0.02, 0.003], [0, 0.003, 0.03]];
    const v = TensorAlgebraEngine.toVoigt(eps, true);
    expect(v[3]).toBeCloseTo(0.006); // 2 * 0.003
    expect(v[5]).toBeCloseTo(0.01);  // 2 * 0.005
  });

  it("strain fromVoigt halves off-diagonals", () => {
    const v: Voigt6 = [0.01, 0.02, 0.03, 0.006, 0, 0.01];
    const eps = TensorAlgebraEngine.fromVoigt(v, true);
    expect(eps[1][2]).toBeCloseTo(0.003); // 0.006/2
    expect(eps[0][1]).toBeCloseTo(0.005); // 0.01/2
  });
});

// ============================================================================
// TENSOR ROTATION
// ============================================================================

describe("TensorAlgebraEngine — Rotation", () => {
  it("rotation by identity preserves tensor", () => {
    const T = [[100, 30, 0], [30, 200, 0], [0, 0, 50]];
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const T2 = TensorAlgebraEngine.rotateTensor(T, I);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(T2[i][j]).toBeCloseTo(T[i][j]);
  });

  it("rotation preserves trace (I1)", () => {
    const T = [[100, 30, 10], [30, 200, 20], [10, 20, 300]];
    const Q = TensorAlgebraEngine.eulerRotation(Math.PI / 6, Math.PI / 4, Math.PI / 3);
    const T2 = TensorAlgebraEngine.rotateTensor(T, Q);
    const trace1 = T[0][0] + T[1][1] + T[2][2];
    const trace2 = T2[0][0] + T2[1][1] + T2[2][2];
    expect(trace2).toBeCloseTo(trace1, 8);
  });

  it("rotation preserves von Mises stress", () => {
    const T = [[100, 30, 10], [30, 200, 20], [10, 20, 300]];
    const Q = TensorAlgebraEngine.eulerRotation(0.5, 0.3, 0.7);
    const T2 = TensorAlgebraEngine.rotateTensor(T, Q);
    const vm1 = TensorAlgebraEngine.invariants(T).vonMises;
    const vm2 = TensorAlgebraEngine.invariants(T2).vonMises;
    expect(vm2).toBeCloseTo(vm1, 6);
  });
});

// ============================================================================
// INVARIANTS
// ============================================================================

describe("TensorAlgebraEngine — Invariants", () => {
  it("uniaxial tension: sigma_11 = 100 MPa", () => {
    const sigma = [[100, 0, 0], [0, 0, 0], [0, 0, 0]];
    const inv = TensorAlgebraEngine.invariants(sigma);
    expect(inv.I1).toBeCloseTo(100);
    expect(inv.vonMises).toBeCloseTo(100, 6); // uniaxial: sigma_eq = sigma
    expect(inv.hydrostaticPressure).toBeCloseTo(100 / 3, 6);
  });

  it("hydrostatic stress: all normal equal", () => {
    const p = 150;
    const sigma = [[p, 0, 0], [0, p, 0], [0, 0, p]];
    const inv = TensorAlgebraEngine.invariants(sigma);
    expect(inv.I1).toBeCloseTo(3 * p);
    expect(inv.vonMises).toBeCloseTo(0, 8); // no deviatoric component
    expect(inv.J2).toBeCloseTo(0, 8);
    expect(inv.hydrostaticPressure).toBeCloseTo(p);
  });

  it("pure shear: sigma_12 = tau", () => {
    const tau = 50;
    const sigma = [[0, tau, 0], [tau, 0, 0], [0, 0, 0]];
    const inv = TensorAlgebraEngine.invariants(sigma);
    expect(inv.vonMises).toBeCloseTo(tau * Math.sqrt(3), 6);
    expect(inv.I1).toBeCloseTo(0);
  });

  it("accepts Voigt input", () => {
    const v: Voigt6 = [100, 200, 300, 0, 0, 0];
    const inv = TensorAlgebraEngine.invariants(v);
    expect(inv.I1).toBeCloseTo(600);
  });

  it("I3 = det for known matrix", () => {
    const sigma = [[2, 0, 0], [0, 3, 0], [0, 0, 5]];
    const inv = TensorAlgebraEngine.invariants(sigma);
    expect(inv.I3).toBeCloseTo(30, 8); // 2*3*5
  });
});

// ============================================================================
// DECOMPOSITION
// ============================================================================

describe("TensorAlgebraEngine — Decomposition", () => {
  it("hydrostatic + deviatoric = original", () => {
    const sigma = [[100, 30, 10], [30, 200, 20], [10, 20, 300]];
    const { hydrostatic, deviatoric } = TensorAlgebraEngine.decompose(sigma);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(hydrostatic[i][j] + deviatoric[i][j]).toBeCloseTo(sigma[i][j], 10);
  });

  it("deviatoric is traceless", () => {
    const sigma = [[100, 30, 0], [30, 200, 0], [0, 0, 50]];
    const { deviatoric } = TensorAlgebraEngine.decompose(sigma);
    const trace = deviatoric[0][0] + deviatoric[1][1] + deviatoric[2][2];
    expect(trace).toBeCloseTo(0, 10);
  });

  it("hydrostatic is spherical", () => {
    const sigma = [[100, 30, 0], [30, 200, 0], [0, 0, 50]];
    const { hydrostatic } = TensorAlgebraEngine.decompose(sigma);
    expect(hydrostatic[0][0]).toBeCloseTo(hydrostatic[1][1]);
    expect(hydrostatic[1][1]).toBeCloseTo(hydrostatic[2][2]);
    expect(hydrostatic[0][1]).toBeCloseTo(0);
  });
});

// ============================================================================
// PRINCIPAL STRESSES
// ============================================================================

describe("TensorAlgebraEngine — Principal Stresses", () => {
  it("diagonal tensor: principals = diagonal entries", () => {
    const sigma = [[300, 0, 0], [0, 100, 0], [0, 0, 200]];
    const p = TensorAlgebraEngine.principalStresses(sigma);
    expect(p.values[0]).toBeCloseTo(300, 6);
    expect(p.values[1]).toBeCloseTo(200, 6);
    expect(p.values[2]).toBeCloseTo(100, 6);
  });

  it("2D stress state: sigma_12 = 50, sigma_11=100, sigma_22=200", () => {
    const sigma = [[100, 50, 0], [50, 200, 0], [0, 0, 0]];
    const p = TensorAlgebraEngine.principalStresses(sigma);
    // Analytical: (150 ± sqrt(2500+2500)) = 150 ± 50*sqrt(2) ≈ 220.7, 79.3
    expect(p.values[0]).toBeCloseTo(150 + 50 * Math.sqrt(2), 4);
    expect(p.values[2]).toBeCloseTo(0, 6); // sigma_33 = 0
  });

  it("hydrostatic: all principals equal", () => {
    const sigma = [[100, 0, 0], [0, 100, 0], [0, 0, 100]];
    const p = TensorAlgebraEngine.principalStresses(sigma);
    for (const v of p.values) expect(v).toBeCloseTo(100, 6);
  });

  it("principal directions are unit vectors", () => {
    const sigma = [[100, 30, 10], [30, 200, 20], [10, 20, 300]];
    const p = TensorAlgebraEngine.principalStresses(sigma);
    for (let j = 0; j < 3; j++) {
      let norm = 0;
      for (let i = 0; i < 3; i++) norm += p.directions[i][j] ** 2;
      expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
    }
  });
});

// ============================================================================
// STIFFNESS TENSOR
// ============================================================================

describe("TensorAlgebraEngine — Stiffness", () => {
  it("isotropic stiffness for steel (E=200GPa, nu=0.3)", () => {
    const C = TensorAlgebraEngine.isotropicStiffness(200e9, 0.3);
    expect(C.length).toBe(6);
    expect(C[0].length).toBe(6);
    // C11 = lambda + 2*mu for isotropic
    const lambda = 200e9 * 0.3 / (1.3 * 0.4);
    const mu = 200e9 / 2.6;
    expect(C[0][0]).toBeCloseTo(lambda + 2 * mu, -3);
    expect(C[3][3]).toBeCloseTo(mu, -3);
  });

  it("compliance is inverse of stiffness", () => {
    const C = TensorAlgebraEngine.isotropicStiffness(200e9, 0.3);
    const S = TensorAlgebraEngine.isotropicCompliance(200e9, 0.3);
    // C * S should be identity (6×6)
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) sum += C[i][k] * S[k][j];
        expect(sum).toBeCloseTo(i === j ? 1 : 0, 4);
      }
  });

  it("uniaxial stress → strain", () => {
    const E = 200e9, nu = 0.3;
    const S = TensorAlgebraEngine.isotropicCompliance(E, nu);
    const sigma: Voigt6 = [100e6, 0, 0, 0, 0, 0]; // 100 MPa uniaxial
    const eps = TensorAlgebraEngine.strainFromStress(S, sigma);
    expect(eps[0]).toBeCloseTo(100e6 / E, 10); // axial strain
    expect(eps[1]).toBeCloseTo(-nu * 100e6 / E, 10); // lateral contraction
  });

  it("throws on invalid Poisson ratio", () => {
    expect(() => TensorAlgebraEngine.isotropicStiffness(200e9, 0.5)).toThrow("Poisson");
    expect(() => TensorAlgebraEngine.isotropicStiffness(200e9, -1.1)).toThrow("Poisson");
  });

  it("throws on non-positive Young's modulus", () => {
    expect(() => TensorAlgebraEngine.isotropicStiffness(-1, 0.3)).toThrow("Young");
  });
});
