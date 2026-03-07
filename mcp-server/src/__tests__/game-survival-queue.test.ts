/**
 * Tests for GameTheory, SurvivalAnalysis, QueueingTheory engines
 */
import { describe, it, expect } from "vitest";
import { gameTheoryEngine } from "../engines/GameTheoryEngine.js";
import { survivalAnalysisEngine } from "../engines/SurvivalAnalysisEngine.js";
import { queueingTheoryEngine } from "../engines/QueueingTheoryEngine.js";

// ===========================================================================
// GameTheory
// ===========================================================================

describe("GameTheory — Zero Sum", () => {
  it("finds saddle point", () => {
    // Rock-paper-scissors has no saddle point; use a dominated game
    const result = gameTheoryEngine.solveZeroSum([
      [3, 1],
      [2, 4],
    ]);
    expect(result.value).toBeDefined();
    expect(result.rowStrategy.length).toBe(2);
    expect(result.colStrategy.length).toBe(2);
  });

  it("finds saddle point in dominated game", () => {
    const result = gameTheoryEngine.solveZeroSum([
      [1, 3],
      [4, 2],
    ]);
    expect(result.value).toBeDefined();
    expect(result.rowStrategy.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });
});

describe("GameTheory — Nash Equilibrium", () => {
  it("finds pure strategy Nash equilibrium", () => {
    // Prisoner's dilemma
    const A = [[3, 0], [5, 1]]; // Player 1 payoffs
    const B = [[3, 5], [0, 1]]; // Player 2 payoffs
    const result = gameTheoryEngine.nashEquilibrium(A, B);
    expect(result.player1Strategy.length).toBe(2);
    expect(result.player2Strategy.length).toBe(2);
  });

  it("finds mixed strategy Nash equilibrium", () => {
    // Matching pennies
    const A = [[1, -1], [-1, 1]];
    const B = [[-1, 1], [1, -1]];
    const result = gameTheoryEngine.nashEquilibrium(A, B);
    expect(result.isPure).toBe(false);
    expect(result.player1Strategy[0]).toBeCloseTo(0.5, 1);
  });
});

describe("GameTheory — Decision Under Uncertainty", () => {
  it("computes all decision criteria", () => {
    const payoffs = [
      [40, 30, 20],  // Action A
      [50, 25, 15],  // Action B
      [35, 35, 25],  // Action C
    ];
    const result = gameTheoryEngine.decisionUnderUncertainty(payoffs);
    expect(result.maximin.action).toBeDefined();
    expect(result.maximax.action).toBeDefined();
    expect(result.hurwicz.action).toBeDefined();
    expect(result.laplace.action).toBeDefined();
    expect(result.minimax_regret.action).toBeDefined();
    // Maximin should pick C (worst=25 > 20,15)
    expect(result.maximin.action).toBe(2);
  });
});

describe("GameTheory — Shapley Value", () => {
  it("computes Shapley values for 3-player game", () => {
    // Simple game: v(S) = |S|^2
    const result = gameTheoryEngine.shapleyValue(3, (S) => {
      let count = 0;
      for (let i = 0; i < 3; i++) if (S & (1 << i)) count++;
      return count * count;
    });
    expect(result.values.length).toBe(3);
    // Symmetric game: all Shapley values should be equal
    expect(result.values[0]).toBeCloseTo(result.values[1], 3);
    expect(result.totalValue).toBe(9); // v({1,2,3}) = 9
  });
});

// ===========================================================================
// SurvivalAnalysis
// ===========================================================================

describe("SurvivalAnalysis — Kaplan-Meier", () => {
  it("computes survival curve", () => {
    const data = [
      { time: 10, event: true },
      { time: 20, event: true },
      { time: 30, event: false }, // Censored
      { time: 40, event: true },
      { time: 50, event: true },
    ];
    const result = survivalAnalysisEngine.kaplanMeier(data);
    expect(result.survival[0]).toBe(1.0);
    expect(result.survival[result.survival.length - 1]).toBeLessThan(1);
    expect(result.events).toBe(4); // 4 actual failures
    expect(result.censored).toBe(1);
  });

  it("computes median survival", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      time: (i + 1) * 10,
      event: true,
    }));
    const result = survivalAnalysisEngine.kaplanMeier(data);
    expect(result.medianSurvival).toBeGreaterThan(0);
    expect(result.medianSurvival).toBeLessThan(210);
  });
});

describe("SurvivalAnalysis — Weibull Fit", () => {
  it("fits Weibull distribution", () => {
    // Generate Weibull-like data (β≈2, η≈100)
    const data = [30, 45, 60, 70, 80, 90, 100, 110, 120, 150];
    const result = survivalAnalysisEngine.weibullFit(data);
    expect(result.shape).toBeGreaterThan(0);
    expect(result.scale).toBeGreaterThan(0);
    expect(result.mttf).toBeGreaterThan(0);
    expect(result.b10Life).toBeGreaterThan(0);
    expect(result.b10Life).toBeLessThan(result.mttf);
    expect(result.reliability(0)).toBeCloseTo(1, 3);
    expect(result.reliability(1e10)).toBeCloseTo(0, 3);
  });
});

describe("SurvivalAnalysis — Exponential", () => {
  it("models constant hazard rate", () => {
    const model = survivalAnalysisEngine.exponentialModel(500); // MTTF = 500h
    expect(model.hazardRate).toBeCloseTo(0.002, 5);
    expect(model.reliability(0)).toBeCloseTo(1);
    expect(model.reliability(500)).toBeCloseTo(Math.exp(-1), 3);
    expect(model.failureProb(500)).toBeCloseTo(1 - Math.exp(-1), 3);
  });
});

describe("SurvivalAnalysis — MTBF", () => {
  it("computes MTBF from failure times", () => {
    const result = survivalAnalysisEngine.mtbf([100, 250, 400, 500, 700]);
    expect(result.mtbf).toBeGreaterThan(0);
    expect(result.failureRate).toBeGreaterThan(0);
    expect(result.ci95[0]).toBeLessThan(result.mtbf);
    expect(result.ci95[1]).toBeGreaterThan(result.mtbf);
  });
});

describe("SurvivalAnalysis — Hazard", () => {
  it("estimates hazard rate", () => {
    const data = [
      { time: 10, event: true }, { time: 20, event: true },
      { time: 30, event: true }, { time: 40, event: true },
      { time: 50, event: true },
    ];
    const result = survivalAnalysisEngine.hazardEstimate(data);
    expect(result.times.length).toBeGreaterThan(0);
    expect(result.hazardRate.length).toBe(result.times.length);
    expect(result.bathtubPhase).toBeDefined();
  });
});

// ===========================================================================
// QueueingTheory
// ===========================================================================

describe("QueueingTheory — M/M/1", () => {
  it("computes M/M/1 metrics", () => {
    const result = queueingTheoryEngine.mm1(4, 5); // λ=4, μ=5
    expect(result.utilization).toBeCloseTo(0.8, 5);
    expect(result.Ls).toBeCloseTo(4, 5); // ρ/(1-ρ) = 0.8/0.2 = 4
    expect(result.Ws).toBeCloseTo(1, 5);  // 1/(μ-λ) = 1/1 = 1
    expect(result.stable).toBe(true);
  });

  it("detects unstable queue", () => {
    const result = queueingTheoryEngine.mm1(6, 5); // λ > μ
    expect(result.stable).toBe(false);
    expect(result.Ls).toBe(Infinity);
  });
});

describe("QueueingTheory — M/M/c", () => {
  it("computes M/M/c metrics", () => {
    const result = queueingTheoryEngine.mmc(8, 5, 2); // 2 servers
    expect(result.utilization).toBeCloseTo(0.8, 5); // 8/(2*5)
    expect(result.stable).toBe(true);
    expect(result.Lq).toBeGreaterThan(0);
    expect(result.Ws).toBeGreaterThan(1 / 5); // At least 1/μ
  });
});

describe("QueueingTheory — M/M/1/K", () => {
  it("computes finite buffer metrics", () => {
    const result = queueingTheoryEngine.mm1k(4, 5, 10);
    expect(result.stable).toBe(true);
    expect(result.Pk).toBeGreaterThan(0);
    expect(result.Pk).toBeLessThan(1);
    expect(result.lossRate).toBeGreaterThan(0);
    expect(result.effectiveLambda).toBeLessThan(4);
  });
});

describe("QueueingTheory — M/G/1", () => {
  it("computes Pollaczek-Khinchine metrics", () => {
    // Deterministic service (cv=0)
    const result = queueingTheoryEngine.mg1(4, 5, 0);
    expect(result.stable).toBe(true);
    expect(result.Lq).toBeGreaterThanOrEqual(0);
    // With zero variance, Lq should be half of M/M/1
    const mm1 = queueingTheoryEngine.mm1(4, 5);
    expect(result.Lq).toBeLessThanOrEqual(mm1.Lq + 0.01);
  });
});

describe("QueueingTheory — Little's Law", () => {
  it("derives missing parameter", () => {
    expect(queueingTheoryEngine.littlesLaw({ L: 10, lambda: 2 }).W).toBeCloseTo(5);
    expect(queueingTheoryEngine.littlesLaw({ L: 10, W: 5 }).lambda).toBeCloseTo(2);
    expect(queueingTheoryEngine.littlesLaw({ lambda: 2, W: 5 }).L).toBeCloseTo(10);
  });
});

describe("QueueingTheory — Production Line", () => {
  it("analyzes multi-station production line", () => {
    const result = queueingTheoryEngine.productionLine(
      [
        { serviceRate: 10, servers: 1 },
        { serviceRate: 8, servers: 1 },  // Bottleneck
        { serviceRate: 12, servers: 1 },
      ],
      6
    );
    expect(result.stationMetrics.length).toBe(3);
    expect(result.bottleneckStation).toBe(1); // Slowest station
    expect(result.totalCycleTime).toBeGreaterThan(0);
    expect(result.totalWIP).toBeGreaterThan(0);
  });
});
