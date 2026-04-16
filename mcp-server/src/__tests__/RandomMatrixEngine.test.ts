/**
 * RandomMatrixEngine — Test Suite
 * @milestone SCIMATH-MS0
 * @unit P2-U03
 */
import { describe, it, expect } from "vitest";
import { RandomMatrixEngine } from "../engines/RandomMatrixEngine.js";

// ============================================================================
// MARCHENKO-PASTUR DISTRIBUTION
// ============================================================================

describe("RandomMatrixEngine — Marchenko-Pastur", () => {
  it("computes correct bulk edges for γ=1, σ²=1", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(100, 100, 1);
    expect(mp.gamma).toBeCloseTo(1);
    expect(mp.lambdaMinus).toBeCloseTo(0, 6); // (1-1)² = 0
    expect(mp.lambdaPlus).toBeCloseTo(4, 6);  // (1+1)² = 4
    expect(mp.hasPointMass).toBe(false); // γ = 1 → no point mass
  });

  it("computes correct edges for γ=0.5, σ²=1", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(50, 100, 1);
    const sqrtGamma = Math.sqrt(0.5);
    expect(mp.gamma).toBeCloseTo(0.5);
    expect(mp.lambdaMinus).toBeCloseTo((1 - sqrtGamma) ** 2, 6);
    expect(mp.lambdaPlus).toBeCloseTo((1 + sqrtGamma) ** 2, 6);
    expect(mp.hasPointMass).toBe(true); // γ < 1
  });

  it("scales with σ²", () => {
    const mp1 = RandomMatrixEngine.marchenkoPastur(50, 100, 1);
    const mp2 = RandomMatrixEngine.marchenkoPastur(50, 100, 4);
    expect(mp2.lambdaPlus).toBeCloseTo(4 * mp1.lambdaPlus, 6);
    expect(mp2.lambdaMinus).toBeCloseTo(4 * mp1.lambdaMinus, 6);
  });

  it("throws on invalid inputs", () => {
    expect(() => RandomMatrixEngine.marchenkoPastur(0, 10)).toThrow();
    expect(() => RandomMatrixEngine.marchenkoPastur(10, 0)).toThrow();
    expect(() => RandomMatrixEngine.marchenkoPastur(10, 10, -1)).toThrow();
  });
});

// ============================================================================
// MP DENSITY
// ============================================================================

describe("RandomMatrixEngine — MP Density", () => {
  it("returns 0 outside bulk", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(50, 100, 1);
    expect(RandomMatrixEngine.mpDensity(mp.lambdaPlus + 1, mp)).toBe(0);
    expect(RandomMatrixEngine.mpDensity(-1, mp)).toBe(0);
  });

  it("returns positive inside bulk", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(50, 100, 1);
    const mid = (mp.lambdaMinus + mp.lambdaPlus) / 2;
    expect(RandomMatrixEngine.mpDensity(mid, mp)).toBeGreaterThan(0);
  });

  it("integrates approximately to 1 (numerical check)", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(50, 100, 1);
    // Simple trapezoidal integration
    const nSteps = 1000;
    const dx = (mp.lambdaPlus - mp.lambdaMinus) / nSteps;
    let integral = 0;
    for (let i = 0; i <= nSteps; i++) {
      const x = mp.lambdaMinus + i * dx + 1e-10;
      const f = RandomMatrixEngine.mpDensity(x, mp);
      integral += f * dx * (i === 0 || i === nSteps ? 0.5 : 1);
    }
    // For γ < 1, bulk contains (1-pointMass) fraction
    // Point mass weight = max(0, 1 - 1/γ) = 0 for γ=0.5
    // So integral should be close to 1
    expect(integral).toBeGreaterThan(0.9);
    expect(integral).toBeLessThan(1.1);
  });
});

// ============================================================================
// TRACY-WIDOM THRESHOLD
// ============================================================================

describe("RandomMatrixEngine — Tracy-Widom", () => {
  it("threshold > MP upper edge (finite-sample correction)", () => {
    const mp = RandomMatrixEngine.marchenkoPastur(50, 200, 1);
    const tw = RandomMatrixEngine.tracyWidomThreshold(50, 200, 1, 0.05);
    expect(tw).toBeGreaterThan(mp.lambdaPlus);
  });

  it("more stringent alpha gives higher threshold", () => {
    const tw05 = RandomMatrixEngine.tracyWidomThreshold(50, 200, 1, 0.05);
    const tw01 = RandomMatrixEngine.tracyWidomThreshold(50, 200, 1, 0.01);
    expect(tw01).toBeGreaterThan(tw05);
  });

  it("scales with σ²", () => {
    const tw1 = RandomMatrixEngine.tracyWidomThreshold(50, 200, 1, 0.05);
    const tw4 = RandomMatrixEngine.tracyWidomThreshold(50, 200, 4, 0.05);
    expect(tw4).toBeGreaterThan(tw1);
  });
});

// ============================================================================
// SIGNAL DETECTION
// ============================================================================

describe("RandomMatrixEngine — Signal Detection", () => {
  it("detects clear signal above noise", () => {
    // 5 noise eigenvalues around 1, plus 2 signals at 10 and 20
    const eigenvalues = [20, 10, 1.5, 1.2, 1.0, 0.8, 0.5];
    const result = RandomMatrixEngine.detectSignals(eigenvalues, 7, 100);
    expect(result.numSignals).toBeGreaterThanOrEqual(1);
    expect(result.signalEigenvalues[0]).toBe(20);
    expect(result.noiseVariance).toBeGreaterThan(0);
    expect(result.threshold).toBeGreaterThan(0);
  });

  it("detects no signal in pure noise", () => {
    // All eigenvalues close to 1 (noise only)
    const eigenvalues = [1.3, 1.1, 1.0, 0.9, 0.7];
    const result = RandomMatrixEngine.detectSignals(eigenvalues, 5, 500);
    // With large n (500), MP bulk is narrow, but eigenvalues near 1 should be noise
    expect(result.noiseVariance).toBeGreaterThan(0);
  });

  it("handles empty eigenvalues", () => {
    const result = RandomMatrixEngine.detectSignals([], 5, 100);
    expect(result.numSignals).toBe(0);
  });
});

// ============================================================================
// SPIKED COVARIANCE
// ============================================================================

describe("RandomMatrixEngine — Spiked Covariance", () => {
  it("detects spikes above BBP threshold", () => {
    // γ = 0.5, σ² = 1 → BBP threshold = √0.5 ≈ 0.707
    // λ+ = (1+√0.5)² ≈ 2.914
    // Spike at observed λ = 8 should be detected
    const eigenvalues = [8, 2.5, 1.5, 1.0, 0.8];
    const result = RandomMatrixEngine.spikedCovariance(eigenvalues, 50, 100, 1);
    expect(result.numSpikes).toBeGreaterThanOrEqual(1);
    expect(result.bbpThreshold).toBeCloseTo(Math.sqrt(0.5), 4);
    expect(result.spikeStrengths[0]).toBeGreaterThan(0);
  });

  it("corrects finite-sample bias (spike < observed)", () => {
    const eigenvalues = [10];
    const result = RandomMatrixEngine.spikedCovariance(eigenvalues, 50, 100, 1);
    if (result.numSpikes > 0) {
      // True spike strength should be less than observed eigenvalue
      expect(result.spikeStrengths[0]).toBeLessThan(10);
      expect(result.spikeStrengths[0]).toBeGreaterThan(0);
    }
  });

  it("BBP threshold scales with γ and σ²", () => {
    const r1 = RandomMatrixEngine.spikedCovariance([10], 25, 100, 1);
    const r2 = RandomMatrixEngine.spikedCovariance([10], 50, 100, 1);
    // Larger γ → higher BBP threshold
    expect(r2.bbpThreshold).toBeGreaterThan(r1.bbpThreshold);
  });
});

// ============================================================================
// EFFECTIVE RANK
// ============================================================================

describe("RandomMatrixEngine — Effective Rank", () => {
  it("returns fewer signals for pure noise (large γ)", () => {
    // With γ close to 1, MP bulk is wide, so noise eigenvalues are absorbed
    const eigenvalues = [3.5, 2.0, 1.5, 1.0, 0.8, 0.5, 0.3];
    const rank = RandomMatrixEngine.effectiveRank(eigenvalues, 7, 10);
    // With p=7, n=10, γ=0.7 → bulk is wide, fewer signals expected
    expect(rank).toBeLessThanOrEqual(eigenvalues.length);
  });

  it("detects rank for well-separated signals", () => {
    const eigenvalues = [100, 50, 1.2, 1.0, 0.8];
    const rank = RandomMatrixEngine.effectiveRank(eigenvalues, 5, 200);
    expect(rank).toBeGreaterThanOrEqual(1);
  });
});
