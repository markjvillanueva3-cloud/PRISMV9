/**
 * KalmanFilter (algorithms) -- covariance-update correctness, incl. the row-21 fix.
 *
 * Row 21 of the verified SFC fix-plan (SFC-ROWS-VERIFY-BATCH2-2026-07-01.md): the
 * covariance update built (I - KH) from ONLY the k=0 term K[row][0]*H[0][col] --
 * exact for a single sensor (m=1) but silently dropping sensors 2..m in
 * multi-sensor fusion, corrupting P (the state update used the full matMul and was
 * unaffected). Fixed to the full KH = matMul(K, H).
 *
 * Reference values below are HAND-DERIVED (shown per test) so a revert to the
 * truncated KH fails the m=2 cases while every m=1 case stays byte-identical.
 */
import { describe, it, expect } from "vitest";
import { KalmanFilter, type KalmanFilterInput } from "../algorithms/KalmanFilter.js";

const kf = new KalmanFilter();

/** Scalar (n=1) single-sensor baseline: F=1, H=1, Q=0.01, R=1, x0=0, P0=1, z=[1]. */
const scalar1: KalmanFilterInput = {
  n_states: 1, n_measurements: 1,
  F: [1], H: [1], Q: [0.01], R: [1], x0: [0], P0: [1],
  measurements: [[1]],
};

/** Dual identical sensors (n=1, m=2) on the same scalar: H=[1,1]^T, R=I2. */
const dual2: KalmanFilterInput = {
  n_states: 1, n_measurements: 2,
  F: [1], H: [1, 1], Q: [0.01], R: [1, 0, 0, 1], x0: [0], P0: [1],
  measurements: [[1, 1]],
};

describe("KalmanFilter -- m=1 single-sensor references (unchanged by the row-21 fix)", () => {
  // PPred = 1.01; S = 1.01 + 1 = 2.01; K = 1.01/2.01 = 0.5024876;
  // x = K*1 = 0.5024876; P = (1 - K)*PPred = 0.4975124*1.01 = 0.5024876.
  it("scalar update: state estimate matches the hand-derived 0.502488", () => {
    const r = kf.calculate(scalar1);
    expect(r.final_state[0]).toBeCloseTo(0.502488, 5);
  });

  it("scalar update: posterior covariance matches the hand-derived 0.502488", () => {
    const r = kf.calculate(scalar1);
    expect(r.final_covariance_diag[0]).toBeCloseTo(0.502488, 5);
  });

  it("repeated consistent measurements shrink covariance monotonically", () => {
    const r = kf.calculate({ ...scalar1, measurements: [[1], [1], [1], [1]] });
    const cov = r.states.map((s) => s.P_diag[0]);
    for (let i = 1; i < cov.length; i++) expect(cov[i]).toBeLessThan(cov[i - 1]);
  });
});

describe("KalmanFilter -- m=2 dual-sensor fusion (row-21 covariance fix)", () => {
  // Hand derivation: PPred = 1.01; S = [[2.01, 1.01], [1.01, 2.01]]; det = 3.02;
  // K = PPred*Ht*Sinv = [1.01/3.02, 1.01/3.02] = [0.3344371, 0.3344371];
  // KH = K[0]*H[0] + K[1]*H[1] = 0.6688742 (full product);
  // P = (1 - 0.6688742)*1.01 = 0.3344371.
  // The PRE-FIX truncated KH kept only K[0][0]*H[0][0] = 0.3344 -> P = 0.6722 (2x wrong).
  it("posterior covariance uses the FULL K*H product: 0.334437 (the truncated-KH 0.672219 must fail)", () => {
    const r = kf.calculate(dual2);
    expect(r.final_covariance_diag[0]).toBeCloseTo(0.334437, 5);
    expect(r.final_covariance_diag[0]).toBeLessThan(0.5); // excludes the 0.6722 bug by a wide margin
  });

  it("state estimate from dual agreeing sensors matches the hand-derived 0.668874", () => {
    const r = kf.calculate(dual2);
    expect(r.final_state[0]).toBeCloseTo(0.668874, 5);
  });

  it("fusion invariant: a second agreeing sensor TIGHTENS covariance vs one sensor (bug made it looser)", () => {
    const one = kf.calculate(scalar1).final_covariance_diag[0]; // 0.5025
    const two = kf.calculate(dual2).final_covariance_diag[0];   // 0.3344 correct; 0.6722 buggy
    expect(two).toBeLessThan(one);
  });

  it("m=2 innovations carry both sensor residuals per step", () => {
    const r = kf.calculate(dual2);
    expect(r.innovations).toHaveLength(1);
    expect(r.innovations[0]).toHaveLength(2);
    expect(r.innovations[0][0]).toBeCloseTo(1, 10); // z - H*xPred = 1 - 0
    expect(r.innovations[0][1]).toBeCloseTo(1, 10);
  });
});

describe("KalmanFilter -- validation + adversarial", () => {
  it("rejects a wrong-length measurement matrix H", () => {
    const v = kf.validate({ ...dual2, H: [1] }); // m*n = 2 expected
    expect(v.valid).toBe(false);
    expect(v.issues.some((i) => i.field === "H")).toBe(true);
  });

  it("rejects zero state dimension", () => {
    const v = kf.validate({ ...scalar1, n_states: 0 });
    expect(v.valid).toBe(false);
  });

  it("rejects empty measurement sequence", () => {
    const v = kf.validate({ ...scalar1, measurements: [] });
    expect(v.valid).toBe(false);
  });

  it("adversarial: NaN measurement does not throw and emits one state per timestep", () => {
    const r = kf.calculate({ ...scalar1, measurements: [[NaN], [1]] });
    expect(r.states).toHaveLength(2);
  });
});
