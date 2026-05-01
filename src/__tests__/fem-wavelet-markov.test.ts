/**
 * Tests for FiniteElement, Wavelet, MarkovChain engines
 */
import { describe, it, expect } from "vitest";
import { finiteElementEngine } from "../engines/FiniteElementEngine.js";
import { waveletEngine } from "../engines/WaveletEngine.js";
import { markovChainEngine } from "../engines/MarkovChainEngine.js";

// ===========================================================================
// FiniteElement
// ===========================================================================

describe("FiniteElement — Bar Analysis", () => {
  it("solves single bar under tension", () => {
    // Bar fixed at node 0, force at node 1
    const result = finiteElementEngine.solveBar({
      elements: [{ nodes: [0, 1], E: 200e9, A: 0.001, L: 1.0 }],
      numNodes: 2,
      fixedDofs: [0],
      loads: [{ dof: 1, value: 1000 }],
    });
    // u = FL/EA = 1000 * 1 / (200e9 * 0.001) = 5e-6
    expect(result.displacements[1]).toBeCloseTo(5e-6, 8);
    expect(result.elementStresses[0]).toBeCloseTo(1e6, -2); // 1 MPa
  });

  it("solves two-bar system", () => {
    // Two bars in series: fixed at 0, force at 2
    const result = finiteElementEngine.solveBar({
      elements: [
        { nodes: [0, 1], E: 200e9, A: 0.001, L: 1.0 },
        { nodes: [1, 2], E: 200e9, A: 0.001, L: 1.0 },
      ],
      numNodes: 3,
      fixedDofs: [0],
      loads: [{ dof: 2, value: 1000 }],
    });
    expect(result.displacements[0]).toBeCloseTo(0, 6);
    expect(result.displacements[2]).toBeGreaterThan(result.displacements[1]);
    expect(result.maxDisplacement).toBeGreaterThan(0);
  });

  it("reports element stresses", () => {
    const result = finiteElementEngine.solveBar({
      elements: [{ nodes: [0, 1], E: 200e9, A: 0.002, L: 0.5 }],
      numNodes: 2,
      fixedDofs: [0],
      loads: [{ dof: 1, value: 5000 }],
    });
    expect(result.elementStresses.length).toBe(1);
    expect(result.elementForces.length).toBe(1);
    // stress = F/A = 5000/0.002 = 2.5 MPa
    expect(result.elementStresses[0]).toBeCloseTo(2.5e6, -2);
  });
});

describe("FiniteElement — Truss Analysis", () => {
  it("solves simple truss", () => {
    // Two-member truss: nodes at (0,0), (1,0), (0.5, 0.866)
    const result = finiteElementEngine.solveTruss({
      elements: [
        { nodes: [0, 1], E: 200e9, A: 0.001, coords: [[0, 0], [1, 0]] },
        { nodes: [0, 2], E: 200e9, A: 0.001, coords: [[0, 0], [0.5, 0.866]] },
        { nodes: [1, 2], E: 200e9, A: 0.001, coords: [[1, 0], [0.5, 0.866]] },
      ] as unknown as Parameters<typeof finiteElementEngine.solveTruss>[0]["elements"],
      numNodes: 3,
      fixedDofs: [0, 1, 2, 3], // Fix nodes 0 and 1 fully
      loads: [{ dof: 5, value: -10000 }], // Downward force on node 2
    });
    expect(result.displacements.length).toBe(6);
    expect(result.maxDisplacement).toBeGreaterThan(0);
    expect(result.elementStresses.length).toBe(3);
  });
});

describe("FiniteElement — Thermal", () => {
  it("solves 1D heat conduction", () => {
    // Two elements, left at 100°C, right at 0°C
    const result = finiteElementEngine.solveThermal({
      elements: [
        { nodes: [0, 1], k: 50, A: 0.01, L: 0.5 },
        { nodes: [1, 2], k: 50, A: 0.01, L: 0.5 },
      ],
      numNodes: 3,
      fixedTemps: [
        { node: 0, temp: 100 },
        { node: 2, temp: 0 },
      ],
      heatSources: [],
    });
    // Linear distribution: T(mid) = 50
    expect(result.temperatures[1]).toBeCloseTo(50, 0);
    expect(result.maxTemp).toBeCloseTo(100, 0);
  });

  it("handles heat source", () => {
    const result = finiteElementEngine.solveThermal({
      elements: [
        { nodes: [0, 1], k: 50, A: 0.01, L: 1.0 },
      ],
      numNodes: 2,
      fixedTemps: [{ node: 0, temp: 20 }],
      heatSources: [{ node: 1, value: 100 }],
    });
    expect(result.temperatures[1]).toBeGreaterThan(20);
  });
});

describe("FiniteElement — Modal", () => {
  it("computes natural frequencies", () => {
    const result = finiteElementEngine.modalAnalysis(
      [
        { nodes: [0, 1], E: 200e9, A: 0.001, L: 1.0, rho: 7800 },
        { nodes: [1, 2], E: 200e9, A: 0.001, L: 1.0, rho: 7800 },
      ],
      3, [0], 2
    );
    expect(result.frequencies.length).toBe(2);
    expect(result.frequencies[0]).toBeGreaterThan(0);
    expect(result.modeShapes.length).toBe(2);
  });
});

// ===========================================================================
// Wavelet
// ===========================================================================

describe("Wavelet — DWT", () => {
  it("haar DWT decomposes signal", () => {
    const signal = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = waveletEngine.haarDWT(signal);
    expect(result.levels).toBeGreaterThan(0);
    expect(result.approximation.length).toBeLessThan(signal.length);
    expect(result.details.length).toBe(result.levels);
  });

  it("db4 DWT decomposes signal", () => {
    const signal = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i / 16));
    const result = waveletEngine.db4DWT(signal);
    expect(result.levels).toBeGreaterThan(0);
    expect(result.energy.length).toBe(result.levels);
  });

  it("haar IDWT reconstructs signal approximately", () => {
    const signal = [1, 2, 3, 4, 5, 6, 7, 8];
    const dwt = waveletEngine.haarDWT(signal);
    const reconstructed = waveletEngine.haarIDWT(dwt.approximation, dwt.details);
    // Reconstruction should be close to original
    for (let i = 0; i < signal.length; i++) {
      expect(reconstructed[i]).toBeCloseTo(signal[i], 0);
    }
  });

  it("reports energy per level", () => {
    const signal = Array.from({ length: 32 }, (_, i) =>
      Math.sin(2 * Math.PI * i / 8) + 0.5 * Math.sin(2 * Math.PI * i / 2)
    );
    const result = waveletEngine.haarDWT(signal);
    expect(result.energy.length).toBe(result.levels);
    expect(result.energy.some(e => e > 0)).toBe(true);
  });
});

describe("Wavelet — Denoising", () => {
  it("denoises a noisy signal", () => {
    const n = 64;
    const clean = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * i / 16));
    const noisy = clean.map((v, i) => v + 0.3 * Math.sin(100 * i));

    const result = waveletEngine.denoise(noisy, "haar");
    expect(result.denoised.length).toBe(n);
    expect(result.removed.length).toBe(n);
    // SNR improvement should be non-negative (denoising did something)
    expect(result.snrImprovement).toBeGreaterThanOrEqual(0);
  });
});

describe("Wavelet — Energy Analysis", () => {
  it("identifies dominant frequency band", () => {
    const signal = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i / 8));
    const result = waveletEngine.energyAnalysis(signal, "haar");
    expect(result.levels).toBeGreaterThan(0);
    expect(result.totalEnergy).toBeGreaterThan(0);
    expect(result.energyPercent.length).toBeGreaterThan(0);
    expect(result.dominantLevel).toBeGreaterThanOrEqual(0);
  });
});

describe("Wavelet — CWT", () => {
  it("morlet CWT computes scalogram", () => {
    const n = 64;
    const signal = Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * i / 8));
    const result = waveletEngine.morletCWT(signal, 100, [2, 4, 8, 16]);
    expect(result.scales.length).toBe(4);
    expect(result.coefficients.length).toBe(4);
    expect(result.coefficients[0].length).toBe(n);
    expect(result.frequencies.length).toBe(4);
    expect(result.maxEnergy.energy).toBeGreaterThan(0);
  });
});

// ===========================================================================
// MarkovChain
// ===========================================================================

describe("MarkovChain — Validation", () => {
  it("validates correct transition matrix", () => {
    const result = markovChainEngine.validate([
      [0.7, 0.3],
      [0.4, 0.6],
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("detects invalid row sums", () => {
    const result = markovChainEngine.validate([
      [0.7, 0.2], // Sum = 0.9
      [0.4, 0.6],
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("MarkovChain — Steady State", () => {
  it("computes steady state for 2-state chain", () => {
    // P = [[0.7, 0.3], [0.4, 0.6]]
    // Steady state: π₁ = 0.4/(0.3+0.4), π₂ = 0.3/(0.3+0.4)
    const result = markovChainEngine.steadyState([
      [0.7, 0.3],
      [0.4, 0.6],
    ]);
    expect(result.converged).toBe(true);
    expect(result.distribution[0]).toBeCloseTo(4 / 7, 3);
    expect(result.distribution[1]).toBeCloseTo(3 / 7, 3);
  });

  it("computes steady state for 3-state chain", () => {
    const result = markovChainEngine.steadyState([
      [0.5, 0.3, 0.2],
      [0.1, 0.6, 0.3],
      [0.2, 0.2, 0.6],
    ]);
    expect(result.converged).toBe(true);
    expect(result.distribution.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
  });
});

describe("MarkovChain — Evolution", () => {
  it("evolves state probabilities", () => {
    const result = markovChainEngine.evolve(
      [[0.7, 0.3], [0.4, 0.6]],
      [1, 0], // Start in state 0
      10
    );
    expect(result.time.length).toBe(11); // 0..10
    expect(result.probabilities.length).toBe(11);
    // Should converge toward steady state
    const last = result.probabilities[10];
    expect(last[0]).toBeCloseTo(4 / 7, 1);
  });
});

describe("MarkovChain — Absorbing", () => {
  it("analyzes absorbing chain", () => {
    // State 2 is absorbing
    const result = markovChainEngine.absorbingAnalysis([
      [0.5, 0.3, 0.2],
      [0.1, 0.4, 0.5],
      [0, 0, 1],
    ]);
    expect(result.absorbingStates).toEqual([2]);
    expect(result.transientStates).toEqual([0, 1]);
    expect(result.expectedSteps.length).toBe(2);
    expect(result.expectedSteps[0]).toBeGreaterThan(0);
    expect(result.absorptionProbabilities.length).toBe(2);
  });
});

describe("MarkovChain — First Passage", () => {
  it("computes mean first passage time", () => {
    const result = markovChainEngine.firstPassageTime(
      [[0.7, 0.3], [0.4, 0.6]],
      0, 1
    );
    // From state 0 to state 1: expected = 1/0.3 ≈ 3.33
    expect(result.meanTime).toBeCloseTo(1 / 0.3, 0);
    expect(result.distribution.length).toBeGreaterThan(0);
    expect(result.cdf[result.cdf.length - 1]).toBeCloseTo(1, 1);
  });
});

describe("MarkovChain — Classification", () => {
  it("classifies states correctly", () => {
    const result = markovChainEngine.classifyStates([
      [0.5, 0.3, 0.2],
      [0.1, 0.4, 0.5],
      [0, 0, 1],
    ]);
    expect(result.absorbing).toContain(2);
    expect(result.transient.length).toBeGreaterThan(0);
  });
});

describe("MarkovChain — Reliability Model", () => {
  it("creates machine reliability model", () => {
    const result = markovChainEngine.reliabilityModel(
      0.01,   // fail rate
      0.05,   // degrade rate
      0.1,    // degraded fail rate
      0.5     // repair rate
    );
    expect(result.chain.states).toEqual(["operational", "degraded", "failed"]);
    expect(result.availability).toBeGreaterThan(0.5);
    expect(result.availability).toBeLessThanOrEqual(1);
    expect(result.mttf).toBeGreaterThan(0);
  });
});
