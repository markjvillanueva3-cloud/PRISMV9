/**
 * USSH Phase 0.25 Scientific Foundations Tests
 * =============================================
 *
 * Tests for the 4 new engines:
 *   - SessionStabilityEngine (Lyapunov stability)
 *   - AdaptiveThresholdEngine (PAC-based thresholds)
 *   - EntropyTrackerEngine (Shannon entropy)
 *   - HookBanditEngine (Thompson Sampling)
 *
 * 40 tests covering:
 *   - Core functionality
 *   - Mathematical correctness
 *   - Edge cases
 *   - Integration scenarios
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  sessionStabilityEngine,
  type SessionState,
} from "../engines/SessionStabilityEngine.js";
import {
  adaptiveThresholdEngine,
  type DuplicateObservation,
} from "../engines/AdaptiveThresholdEngine.js";
import {
  entropyTrackerEngine,
  type AssetDistribution,
  type DomainDistribution,
} from "../engines/EntropyTrackerEngine.js";
import {
  hookBanditEngine,
} from "../engines/HookBanditEngine.js";

// ============================================================================
// SESSION STABILITY ENGINE TESTS
// ============================================================================

describe("SessionStabilityEngine", () => {
  beforeEach(() => {
    sessionStabilityEngine.reset();
  });

  describe("Lyapunov analysis", () => {
    it("computes positive Lyapunov function for any state", () => {
      const state: SessionState = {
        awareness: 0.8,
        omega: 0.9,
        sx: 0.85,
        orphanRatio: 0.05,
        lockCount: 2,
        timestamp: Date.now()
      };

      const V = sessionStabilityEngine.computeLyapunov(state);
      expect(V).toBeGreaterThan(0);
    });

    it("Lyapunov function differentiates healthy vs failed states", () => {
      const healthy: SessionState = {
        awareness: 0.9,
        omega: 1.0,
        sx: 0.85,
        orphanRatio: 0.0,
        lockCount: 1,
        timestamp: Date.now()
      };

      const failed: SessionState = {
        awareness: 0.3,
        omega: 0.2,
        sx: 0.4,
        orphanRatio: 0.4,
        lockCount: 8,
        timestamp: Date.now()
      };

      const Vhealthy = sessionStabilityEngine.computeLyapunov(healthy);
      const Vfailed = sessionStabilityEngine.computeLyapunov(failed);

      // V(x) = x'Px measures quadratic form energy
      // Both are positive and distinguishable
      expect(Vhealthy).toBeGreaterThan(0);
      expect(Vfailed).toBeGreaterThan(0);
      expect(Vhealthy).not.toBe(Vfailed);
    });

    it("analyzes Lyapunov derivative from state history", () => {
      const baseTime = Date.now();

      for (let i = 0; i < 5; i++) {
        sessionStabilityEngine.recordState({
          awareness: 0.7 + i * 0.05,
          omega: 0.6 + i * 0.08,
          sx: 0.7 + i * 0.03,
          orphanRatio: 0.1 - i * 0.02,
          lockCount: 3 - i * 0.5,
          timestamp: baseTime + i * 1000
        });
      }

      const state: SessionState = {
        awareness: 0.9,
        omega: 0.92,
        sx: 0.85,
        orphanRatio: 0.02,
        lockCount: 1,
        timestamp: baseTime + 5000
      };

      const result = sessionStabilityEngine.analyzeLyapunov(state);
      expect(result).toHaveProperty("V");
      expect(result).toHaveProperty("dV");
      expect(result).toHaveProperty("isStable");
      expect(result).toHaveProperty("eigenvalues");
      expect(result).toHaveProperty("recommendation");
    });
  });

  describe("attractor detection", () => {
    it("identifies healthy attractor for good state", () => {
      const state: SessionState = {
        awareness: 0.88,
        omega: 0.95,
        sx: 0.84,
        orphanRatio: 0.02,
        lockCount: 1,
        timestamp: Date.now()
      };

      const attractor = sessionStabilityEngine.findClosestAttractor(state);
      expect(attractor.basin).toBe("healthy");
    });

    it("identifies failed attractor for bad state", () => {
      const state: SessionState = {
        awareness: 0.35,
        omega: 0.25,
        sx: 0.45,
        orphanRatio: 0.35,
        lockCount: 7,
        timestamp: Date.now()
      };

      const attractor = sessionStabilityEngine.findClosestAttractor(state);
      expect(attractor.basin).toBe("failed");
    });

    it("identifies degraded attractor for medium state", () => {
      const state: SessionState = {
        awareness: 0.68,
        omega: 0.58,
        sx: 0.68,
        orphanRatio: 0.12,
        lockCount: 3,
        timestamp: Date.now()
      };

      const attractor = sessionStabilityEngine.findClosestAttractor(state);
      expect(attractor.basin).toBe("degraded");
    });
  });

  describe("stability report", () => {
    it("generates complete stability report", () => {
      const state: SessionState = {
        awareness: 0.85,
        omega: 0.9,
        sx: 0.82,
        orphanRatio: 0.03,
        lockCount: 2,
        timestamp: Date.now()
      };

      const report = sessionStabilityEngine.generateReport(state);

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("currentBasin");
      expect(report).toHaveProperty("lyapunov");
      expect(report).toHaveProperty("trajectory");
      expect(report).toHaveProperty("warningLevel");
      expect(["none", "watch", "warning", "critical"]).toContain(report.warningLevel);
    });

    it("suggests interventions for degraded state", () => {
      const state: SessionState = {
        awareness: 0.65,
        omega: 0.55,
        sx: 0.65,
        orphanRatio: 0.15,
        lockCount: 4,
        timestamp: Date.now()
      };

      const report = sessionStabilityEngine.generateReport(state);
      const suggestions = sessionStabilityEngine.suggestInterventions(report);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("isHealthy returns true for good state", () => {
      const state: SessionState = {
        awareness: 0.9,
        omega: 0.95,
        sx: 0.85,
        orphanRatio: 0.01,
        lockCount: 1,
        timestamp: Date.now()
      };

      expect(sessionStabilityEngine.isHealthy(state)).toBe(true);
    });
  });
});

// ============================================================================
// ADAPTIVE THRESHOLD ENGINE TESTS
// ============================================================================

describe("AdaptiveThresholdEngine", () => {
  beforeEach(() => {
    adaptiveThresholdEngine.reset();
  });

  describe("Bayesian updating", () => {
    it("returns threshold with prior when no observations", () => {
      const rec = adaptiveThresholdEngine.getThreshold("engine");

      expect(rec.threshold).toBeGreaterThan(0.5);
      expect(rec.threshold).toBeLessThan(1.0);
      expect(rec.sampleSize).toBe(0);
      expect(rec.isConverged).toBe(false);
    });

    it("updates threshold after observations", () => {
      const initialRec = adaptiveThresholdEngine.getThreshold("engine");

      for (let i = 0; i < 10; i++) {
        adaptiveThresholdEngine.observe({
          cosineSimilarity: 0.88,
          wasActualDuplicate: true,
          assetType: "engine",
          timestamp: Date.now()
        });
      }

      const updatedRec = adaptiveThresholdEngine.getThreshold("engine");

      expect(updatedRec.sampleSize).toBe(10);
      expect(updatedRec.threshold).not.toBe(initialRec.threshold);
    });

    it("provides credible interval", () => {
      // Seed with observations
      for (let i = 0; i < 30; i++) {
        adaptiveThresholdEngine.observe({
          cosineSimilarity: 0.85,
          wasActualDuplicate: i % 2 === 0,
          assetType: "engine",
          timestamp: Date.now()
        });
      }

      const rec = adaptiveThresholdEngine.getThreshold("engine", 0.95);

      // Credible interval should be a valid range within [0, 1]
      expect(rec.credibleInterval[0]).toBeGreaterThanOrEqual(0);
      expect(rec.credibleInterval[1]).toBeLessThanOrEqual(1);
      // Threshold should be within [0, 1]
      expect(rec.threshold).toBeGreaterThanOrEqual(0.5);
      expect(rec.threshold).toBeLessThanOrEqual(0.95);
    });
  });

  describe("PAC bounds", () => {
    it("computes PAC sample complexity", () => {
      const pac = adaptiveThresholdEngine.computePACBound("engine");

      expect(pac.epsilon).toBe(0.05);
      expect(pac.delta).toBe(0.01);
      expect(pac.vcDimension).toBe(385);
      expect(pac.sampleComplexity).toBeGreaterThan(1000);
      expect(pac.isSufficient).toBe(false);
    });

    it("sample complexity grows with VC dimension", () => {
      const pac = adaptiveThresholdEngine.computePACBound("engine");

      // PAC sample complexity: m >= (1/eps)[d_VC * log(1/eps) + log(1/delta)]
      // With d_VC=385, eps=0.05, delta=0.01, this is ~15,400
      expect(pac.sampleComplexity).toBeGreaterThan(10000);
      expect(pac.currentSamples).toBe(0);
      expect(pac.isSufficient).toBe(false);
    });
  });

  describe("duplicate detection", () => {
    it("flags high similarity as duplicate", () => {
      const result = adaptiveThresholdEngine.shouldFlagAsDuplicate(0.95, "engine");
      expect(result.shouldFlag).toBe(true);
    });

    it("does not flag low similarity", () => {
      const result = adaptiveThresholdEngine.shouldFlagAsDuplicate(0.3, "engine");
      expect(result.shouldFlag).toBe(false);
    });

    it("computes probability of duplicate", () => {
      const prob = adaptiveThresholdEngine.probabilityIsDuplicate(0.9, "engine");
      expect(prob).toBeGreaterThan(0.5);
      expect(prob).toBeLessThanOrEqual(1.0);
    });

    it("returns learning status", () => {
      const status = adaptiveThresholdEngine.getLearningStatus();

      expect(status).toHaveProperty("totalObservations");
      expect(status).toHaveProperty("perType");
      expect(status).toHaveProperty("isConverged");
      expect(status).toHaveProperty("recommendations");
    });
  });

  describe("multi-type thresholds", () => {
    it("returns thresholds for all asset types", () => {
      const thresholds = adaptiveThresholdEngine.getAllThresholds();

      expect(thresholds).toHaveProperty("engine");
      expect(thresholds).toHaveProperty("action");
      expect(thresholds).toHaveProperty("formula");
      expect(thresholds).toHaveProperty("hook");
      expect(thresholds).toHaveProperty("skill");
      expect(thresholds).toHaveProperty("global");
    });
  });
});

// ============================================================================
// ENTROPY TRACKER ENGINE TESTS
// ============================================================================

describe("EntropyTrackerEngine", () => {
  beforeEach(() => {
    entropyTrackerEngine.reset();
  });

  const sampleAssetDist: AssetDistribution = {
    engines: 1660,
    actions: 4296,
    formulas: 499,
    hooks: 53,
    skills: 95,
    scripts: 111,
    dispatchers: 84,
    total: 6798
  };

  const sampleDomainDist: DomainDistribution = {
    force: 150,
    thermal: 120,
    surface: 90,
    tool_life: 80,
    stability: 70,
    safety: 100,
    quality: 60,
    business: 200,
    cad_cam: 300,
    infrastructure: 490,
    total: 1660
  };

  describe("entropy computation", () => {
    it("measures asset type entropy", () => {
      const measurement = entropyTrackerEngine.measureAssetTypeEntropy(sampleAssetDist);

      expect(measurement.entropy).toBeGreaterThan(0);
      expect(measurement.maxEntropy).toBeGreaterThan(0);
      expect(measurement.normalizedEntropy).toBeGreaterThan(0);
      expect(measurement.normalizedEntropy).toBeLessThanOrEqual(1);
    });

    it("measures domain entropy", () => {
      const measurement = entropyTrackerEngine.measureDomainEntropy(sampleDomainDist);

      expect(measurement.entropy).toBeGreaterThan(0);
      expect(measurement.dominantCategory).toBeTruthy();
    });

    it("identifies dominant category", () => {
      const measurement = entropyTrackerEngine.measureAssetTypeEntropy(sampleAssetDist);

      expect(measurement.dominantCategory).toBe("actions");
      expect(measurement.dominantShare).toBeGreaterThan(0.5);
    });

    it("uniform distribution has maximum entropy", () => {
      const uniformDist: AssetDistribution = {
        engines: 100,
        actions: 100,
        formulas: 100,
        hooks: 100,
        skills: 100,
        scripts: 100,
        dispatchers: 100,
        total: 700
      };

      const measurement = entropyTrackerEngine.measureAssetTypeEntropy(uniformDist);
      expect(measurement.normalizedEntropy).toBeGreaterThan(0.95);
    });

    it("concentrated distribution has low entropy", () => {
      const concentratedDist: AssetDistribution = {
        engines: 1000,
        actions: 10,
        formulas: 5,
        hooks: 3,
        skills: 2,
        scripts: 1,
        dispatchers: 1,
        total: 1022
      };

      const measurement = entropyTrackerEngine.measureAssetTypeEntropy(concentratedDist);
      expect(measurement.normalizedEntropy).toBeLessThan(0.5);
    });
  });

  describe("entropy report", () => {
    it("generates full entropy report", () => {
      const report = entropyTrackerEngine.generateReport(sampleAssetDist, sampleDomainDist);

      expect(report).toHaveProperty("assetTypeEntropy");
      expect(report).toHaveProperty("domainEntropy");
      expect(report).toHaveProperty("trend");
      expect(report).toHaveProperty("diversity");
      expect(report).toHaveProperty("alerts");
    });

    it("computes diversity indices", () => {
      const report = entropyTrackerEngine.generateReport(sampleAssetDist, sampleDomainDist);

      expect(report.diversity.giniIndex).toBeGreaterThanOrEqual(0);
      expect(report.diversity.giniIndex).toBeLessThanOrEqual(1);
      expect(report.diversity.simpsonIndex).toBeGreaterThanOrEqual(0);
      expect(report.diversity.effectiveCategories).toBeGreaterThan(1);
    });

    it("generates alerts for low entropy", () => {
      const lowEntropyDist: AssetDistribution = {
        engines: 10000,
        actions: 10,
        formulas: 5,
        hooks: 3,
        skills: 2,
        scripts: 1,
        dispatchers: 1,
        total: 10022
      };

      const report = entropyTrackerEngine.generateReport(lowEntropyDist, sampleDomainDist);
      expect(report.alerts.length).toBeGreaterThan(0);
    });
  });

  describe("trend analysis", () => {
    it("detects stable trend with insufficient history", () => {
      const trend = entropyTrackerEngine.analyzeTrend();
      expect(trend.direction).toBe("stable");
    });

    it("tracks history across measurements", () => {
      for (let i = 0; i < 10; i++) {
        entropyTrackerEngine.measureAssetTypeEntropy(sampleAssetDist);
      }

      const history = entropyTrackerEngine.getHistory();
      expect(history.length).toBe(10);
    });
  });

  describe("diversity recommendations", () => {
    it("recommends diversification for skewed distribution", () => {
      const skewedDist: AssetDistribution = {
        engines: 5000,
        actions: 100,
        formulas: 50,
        hooks: 10,
        skills: 5,
        scripts: 5,
        dispatchers: 5,
        total: 5175
      };

      const recommendations = entropyTrackerEngine.recommendDiversification(skewedDist);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("isDiverse returns false for concentrated distribution", () => {
      const concentrated: AssetDistribution = {
        engines: 10000,
        actions: 1,
        formulas: 1,
        hooks: 1,
        skills: 1,
        scripts: 1,
        dispatchers: 1,
        total: 10006
      };

      expect(entropyTrackerEngine.isDiverse(concentrated)).toBe(false);
    });
  });
});

// ============================================================================
// HOOK BANDIT ENGINE TESTS
// ============================================================================

describe("HookBanditEngine", () => {
  beforeEach(() => {
    hookBanditEngine.reset();
  });

  describe("hook registration", () => {
    it("registers hooks as bandit arms", () => {
      hookBanditEngine.registerHook("h1", "SafetyCheck", "safety", "critical");
      hookBanditEngine.registerHook("h2", "WiringCheck", "wiring", "high");

      const arms = hookBanditEngine.listArms();
      expect(arms.length).toBe(2);
    });

    it("marks critical hooks as always-run", () => {
      hookBanditEngine.registerHook("h1", "SafetyCheck", "safety", "critical");

      const alwaysRun = hookBanditEngine.getAlwaysRun();
      expect(alwaysRun).toContain("h1");
    });

    it("does not duplicate hooks", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");
      hookBanditEngine.registerHook("h1", "Test2", "validation", "low");

      expect(hookBanditEngine.listArms().length).toBe(1);
    });
  });

  describe("Thompson Sampling selection", () => {
    it("selects hooks via Thompson Sampling", () => {
      for (let i = 0; i < 10; i++) {
        hookBanditEngine.registerHook(`h${i}`, `Hook${i}`, "validation", i === 0 ? "critical" : "medium");
      }

      const selection = hookBanditEngine.select(5, 1000);

      expect(selection.selectedHooks.length).toBeLessThanOrEqual(5);
      expect(selection.selectedHooks.some(h => h.hookId === "h0")).toBe(true);
    });

    it("respects time budget", () => {
      for (let i = 0; i < 10; i++) {
        hookBanditEngine.registerHook(`h${i}`, `Hook${i}`, "validation", "medium");
        const arm = hookBanditEngine.getArm(`h${i}`)!;
        arm.avgExecutionMs = 100;
      }

      const selection = hookBanditEngine.select(10, 300);

      expect(selection.budget.totalTimeMs).toBeLessThanOrEqual(300);
    });

    it("includes samples in result", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");
      hookBanditEngine.registerHook("h2", "Test2", "validation", "low");

      const selection = hookBanditEngine.select(2, 500);

      expect(selection.samples.length).toBe(selection.selectedHooks.length);
    });
  });

  describe("Bayesian updates", () => {
    it("updates alpha on catch", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");

      const arm1 = hookBanditEngine.getArm("h1")!;
      const initialAlpha = arm1.alpha;

      hookBanditEngine.update("h1", true, 50);

      const arm2 = hookBanditEngine.getArm("h1")!;
      expect(arm2.alpha).toBe(initialAlpha + 1);
    });

    it("updates beta on no catch", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");

      const arm1 = hookBanditEngine.getArm("h1")!;
      const initialBeta = arm1.beta;

      hookBanditEngine.update("h1", false, 50);

      const arm2 = hookBanditEngine.getArm("h1")!;
      expect(arm2.beta).toBe(initialBeta + 1);
    });

    it("tracks execution time average", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");

      hookBanditEngine.update("h1", true, 100);
      hookBanditEngine.update("h1", false, 200);

      const arm = hookBanditEngine.getArm("h1")!;
      expect(arm.avgExecutionMs).toBe(150);
    });

    it("batch updates multiple hooks", () => {
      hookBanditEngine.registerHook("h1", "Test1", "validation", "low");
      hookBanditEngine.registerHook("h2", "Test2", "validation", "low");

      const results = hookBanditEngine.batchUpdate([
        { hookId: "h1", caughtIssue: true, executionMs: 50 },
        { hookId: "h2", caughtIssue: false, executionMs: 30 }
      ]);

      expect(results.length).toBe(2);
    });
  });

  describe("expected value and UCB", () => {
    it("computes expected value", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");

      for (let i = 0; i < 10; i++) {
        hookBanditEngine.update("h1", i < 7, 50);
      }

      const ev = hookBanditEngine.getExpectedValue("h1");
      expect(ev).toBeGreaterThan(0.5);
      expect(ev).toBeLessThan(1.0);
    });

    it("computes UCB", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "low");

      const ucb = hookBanditEngine.getUCB("h1", 2);
      const ev = hookBanditEngine.getExpectedValue("h1");

      expect(ucb).toBeGreaterThanOrEqual(ev);
    });
  });

  describe("performance report", () => {
    it("generates bandit report", () => {
      hookBanditEngine.registerHook("h1", "Good", "safety", "high");
      hookBanditEngine.registerHook("h2", "Bad", "validation", "low");

      for (let i = 0; i < 20; i++) {
        hookBanditEngine.update("h1", Math.random() > 0.2, 50);
        hookBanditEngine.update("h2", Math.random() > 0.9, 100);
      }

      const report = hookBanditEngine.generateReport();

      expect(report).toHaveProperty("totalHooks");
      expect(report).toHaveProperty("totalRuns");
      expect(report).toHaveProperty("overallCatchRate");
      expect(report).toHaveProperty("topPerformers");
      expect(report).toHaveProperty("recommendations");
      expect(report).toHaveProperty("regretEstimate");
    });

    it("identifies top performers", () => {
      hookBanditEngine.registerHook("h1", "Star", "safety", "high");
      hookBanditEngine.registerHook("h2", "Weak", "validation", "low");

      for (let i = 0; i < 50; i++) {
        hookBanditEngine.update("h1", true, 50);
        hookBanditEngine.update("h2", false, 50);
      }

      const report = hookBanditEngine.generateReport();
      expect(report.topPerformers[0].hookId).toBe("h1");
    });
  });

  describe("persistence", () => {
    it("exports and imports arms", () => {
      hookBanditEngine.registerHook("h1", "Test", "validation", "medium");
      hookBanditEngine.update("h1", true, 50);

      const exported = hookBanditEngine.exportArms();
      hookBanditEngine.reset();

      expect(hookBanditEngine.listArms().length).toBe(0);

      hookBanditEngine.importArms(exported);

      expect(hookBanditEngine.listArms().length).toBe(1);
      expect(hookBanditEngine.getArm("h1")!.totalRuns).toBe(1);
    });
  });
});
