import { describe, it, expect } from "vitest";
import {
  cpkPredictionGateEngine,
  CpkPredictionGateEngine,
  MIN_ACCEPTABLE_CPK,
  IDEAL_CPK,
  computeCpk,
  type CandidatePrediction,
} from "../engines/CpkPredictionGateEngine.js";

const TOL = 0.05;

const C_IDEAL: CandidatePrediction = {
  strategy_id: "ideal_process",
  predicted_mean_error_mm: 0,
  predicted_stddev_mm: 0.006,
};

const C_ACCEPTABLE: CandidatePrediction = {
  strategy_id: "ok_process",
  predicted_mean_error_mm: 0,
  predicted_stddev_mm: 0.0115,
};

const C_REJECTED: CandidatePrediction = {
  strategy_id: "bad_process",
  predicted_mean_error_mm: 0.01,
  predicted_stddev_mm: 0.02,
};

describe("CpkPredictionGateEngine", () => {
  it("exports a singleton", () => {
    expect(cpkPredictionGateEngine).toBeInstanceOf(CpkPredictionGateEngine);
  });

  it("exposes MIN_ACCEPTABLE and IDEAL thresholds", () => {
    expect(MIN_ACCEPTABLE_CPK).toBe(1.33);
    expect(IDEAL_CPK).toBe(2.0);
    expect(cpkPredictionGateEngine.MIN_ACCEPTABLE).toBe(1.33);
    expect(cpkPredictionGateEngine.IDEAL).toBe(2.0);
  });

  it("computeCpk: centered process gives symmetric Cpk", () => {
    // USL=0.05, LSL=-0.05, σ=0.01, μ=0 → Cpk = 0.05/0.03 ≈ 1.667
    const cpk = computeCpk(0, 0.01, -0.05, 0.05);
    expect(cpk).toBeCloseTo(5 / 3, 2);
  });

  it("computeCpk: offset reduces the smaller side", () => {
    // μ=0.02, USL=0.05, LSL=-0.05, σ=0.005 → lower side: (0.02+0.05)/0.015=4.67, upper: (0.05-0.02)/0.015=2
    const cpk = computeCpk(0.02, 0.005, -0.05, 0.05);
    expect(cpk).toBeCloseTo(2, 2);
  });

  it("computeCpk returns 0 for σ≤0", () => {
    expect(computeCpk(0, 0, -0.05, 0.05)).toBe(0);
    expect(computeCpk(0, -0.01, -0.05, 0.05)).toBe(0);
  });

  it("computeCpk returns 0 for non-finite inputs", () => {
    expect(computeCpk(NaN, 0.01, -0.05, 0.05)).toBe(0);
    expect(computeCpk(0, NaN, -0.05, 0.05)).toBe(0);
  });

  it("gate classifies ideal candidate", () => {
    const r = cpkPredictionGateEngine.gate([C_IDEAL], TOL);
    expect(r.decisions[0].status).toBe("ideal");
    expect(r.ideal).toHaveLength(1);
  });

  it("gate classifies acceptable candidate", () => {
    const r = cpkPredictionGateEngine.gate([C_ACCEPTABLE], TOL);
    expect(r.decisions[0].status).toBe("acceptable");
  });

  it("gate rejects low-Cpk candidate", () => {
    const r = cpkPredictionGateEngine.gate([C_REJECTED], TOL);
    expect(r.decisions[0].status).toBe("rejected");
    expect(r.rejected).toHaveLength(1);
  });

  it("gate buckets: accepted = ideal + acceptable, rejected separate", () => {
    const r = cpkPredictionGateEngine.gate([C_IDEAL, C_ACCEPTABLE, C_REJECTED], TOL);
    expect(r.accepted).toHaveLength(2);
    expect(r.rejected).toHaveLength(1);
    expect(r.ideal).toHaveLength(1);
  });

  it("gate includes reason text", () => {
    const r = cpkPredictionGateEngine.gate([C_IDEAL], TOL);
    expect(r.decisions[0].reason).toContain("Cpk");
    expect(r.decisions[0].reason).toContain("ideal");
  });

  it("gate rounds Cpk to 3 decimals", () => {
    const r = cpkPredictionGateEngine.gate([C_IDEAL], TOL);
    const c = r.decisions[0].cpk;
    expect(Math.round(c * 1000)).toBe(c * 1000);
  });

  it("gate threshold fields echoed in result", () => {
    const r = cpkPredictionGateEngine.gate([C_IDEAL], TOL, 1.5, 2.5);
    expect(r.min_cpk_threshold).toBe(1.5);
    expect(r.ideal_threshold).toBe(2.5);
  });

  it("gate throws on invalid tolerance", () => {
    expect(() => cpkPredictionGateEngine.gate([C_IDEAL], 0)).toThrow();
    expect(() => cpkPredictionGateEngine.gate([C_IDEAL], -0.01)).toThrow();
  });

  it("gate throws when ideal < min", () => {
    expect(() => cpkPredictionGateEngine.gate([C_IDEAL], TOL, 2.0, 1.0)).toThrow();
  });

  it("filter returns only passing candidates", () => {
    const filtered = cpkPredictionGateEngine.filter([C_IDEAL, C_ACCEPTABLE, C_REJECTED], TOL);
    expect(filtered).toHaveLength(2);
    const ids = filtered.map(c => c.strategy_id);
    expect(ids).toContain("ideal_process");
    expect(ids).toContain("ok_process");
    expect(ids).not.toContain("bad_process");
  });

  it("filter honors custom min_cpk", () => {
    const filtered = cpkPredictionGateEngine.filter([C_IDEAL, C_ACCEPTABLE], TOL, 1.8);
    // C_ACCEPTABLE (Cpk≈1.45) drops; C_IDEAL (Cpk≈2.78) stays
    expect(filtered).toHaveLength(1);
    expect(filtered[0].strategy_id).toBe("ideal_process");
  });

  it("preserves meta through gate", () => {
    const cand: CandidatePrediction = { ...C_IDEAL, meta: { strategy_name: "HSM roughing" } };
    const r = cpkPredictionGateEngine.gate([cand], TOL);
    expect(r.decisions[0].meta).toEqual({ strategy_name: "HSM roughing" });
  });

  it("tight-tolerance rejection path works", () => {
    // Same σ but tighter tolerance should push Cpk down
    const loose = cpkPredictionGateEngine.gate([C_ACCEPTABLE], 0.05);
    const tight = cpkPredictionGateEngine.gate([C_ACCEPTABLE], 0.02);
    expect(tight.decisions[0].cpk).toBeLessThan(loose.decisions[0].cpk);
  });
});
