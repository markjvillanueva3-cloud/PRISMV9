/**
 * Tests for EnsembleModelSelectorEngine (MILL-AGI Phase 0.4)
 *
 * Validates ensemble model selection and weighting:
 *   - Member registration
 *   - Ensemble prediction
 *   - Weight update algorithms
 *   - Performance tracking
 *   - Diversity metrics
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EnsembleModelSelectorEngine,
  ensembleModelSelectorEngine,
  type EnsembleMember,
  type SelectorConfig,
} from "../engines/EnsembleModelSelectorEngine.js";

describe("EnsembleModelSelectorEngine (MILL-AGI P0.4)", () => {
  let engine: EnsembleModelSelectorEngine;

  beforeEach(() => {
    engine = new EnsembleModelSelectorEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const mlpMember: EnsembleMember = {
    id: "force-mlp",
    name: "Force MLP",
    type: "neural",
    domain: "force",
    weight: 0.33,
    active: true,
  };

  const physicsMember: EnsembleMember = {
    id: "force-kienzle",
    name: "Kienzle Physics",
    type: "physics",
    domain: "force",
    weight: 0.33,
    active: true,
  };

  const hybridMember: EnsembleMember = {
    id: "force-hybrid",
    name: "Hybrid Force",
    type: "hybrid",
    domain: "force",
    weight: 0.34,
    active: true,
  };

  const thermalMember: EnsembleMember = {
    id: "thermal-lstm",
    name: "Thermal LSTM",
    type: "neural",
    domain: "thermal",
    weight: 0.5,
    active: true,
  };

  // ============================================================================
  // MEMBER REGISTRATION
  // ============================================================================

  describe("member registration", () => {
    it("registers ensemble members", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      const perfs = engine.getAllPerformances();
      expect(perfs.length).toBe(2);
    });

    it("initializes member performance", () => {
      engine.registerMember(mlpMember);

      const perf = engine.getMemberPerformance("force-mlp");
      expect(perf).not.toBeNull();
      expect(perf!.predictions).toBe(0);
      expect(perf!.mean_error).toBe(0);
    });
  });

  // ============================================================================
  // ENSEMBLE PREDICTION
  // ============================================================================

  describe("ensemble prediction", () => {
    it("combines member predictions", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      const predictions = new Map([
        ["force-mlp", 500],
        ["force-kienzle", 520],
      ]);

      const result = engine.predict(predictions);

      expect(result.value).toBeGreaterThan(0);
      expect(result.member_contributions.length).toBe(2);
    });

    it("weights predictions by member weights", () => {
      engine.registerMember({ ...mlpMember, weight: 0.9 });
      engine.registerMember({ ...physicsMember, weight: 0.1 });

      const predictions = new Map([
        ["force-mlp", 500],
        ["force-kienzle", 600],
      ]);

      const result = engine.predict(predictions);

      // Should be closer to MLP prediction due to higher weight
      expect(result.value).toBeLessThan(520);
    });

    it("excludes inactive members", () => {
      engine.registerMember(mlpMember);
      engine.registerMember({ ...physicsMember, active: false });

      const predictions = new Map([
        ["force-mlp", 500],
        ["force-kienzle", 600],
      ]);

      const result = engine.predict(predictions);

      expect(result.member_contributions.length).toBe(1);
      expect(result.value).toBe(500);
    });

    it("filters by domain", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(thermalMember);

      const predictions = new Map([
        ["force-mlp", 500],
        ["thermal-lstm", 350],
      ]);

      const result = engine.predict(predictions, "force");

      expect(result.member_contributions.length).toBe(1);
      expect(result.value).toBe(500);
    });

    it("computes uncertainty from disagreement", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);
      engine.registerMember(hybridMember);

      // High disagreement
      const divergent = new Map([
        ["force-mlp", 400],
        ["force-kienzle", 600],
        ["force-hybrid", 500],
      ]);

      const result = engine.predict(divergent);
      expect(result.uncertainty).toBeGreaterThan(0);
    });

    it("computes diversity score", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      const predictions = new Map([
        ["force-mlp", 500],
        ["force-kienzle", 550],
      ]);

      const result = engine.predict(predictions);
      expect(result.diversity_score).toBeGreaterThanOrEqual(0);
      expect(result.diversity_score).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // WEIGHT UPDATES
  // ============================================================================

  describe("weight updates", () => {
    it("updates weights based on errors", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      const errors = new Map([
        ["force-mlp", 0.05],
        ["force-kienzle", 0.15],
      ]);

      const result = engine.updateWeights(errors, 500);

      const weights = engine.getWeights();
      expect(weights.get("force-mlp")).toBeGreaterThan(weights.get("force-kienzle")!);
    });

    it("identifies best and worst members", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      const errors = new Map([
        ["force-mlp", 0.02],
        ["force-kienzle", 0.20],
      ]);

      const result = engine.updateWeights(errors, 500);

      expect(result.best_member).toBe("force-mlp");
      expect(result.worst_member).toBe("force-kienzle");
    });

    it("tracks cumulative performance", () => {
      engine.registerMember(mlpMember);

      for (let i = 0; i < 10; i++) {
        engine.updateWeights(new Map([["force-mlp", 0.1]]), 500);
      }

      const perf = engine.getMemberPerformance("force-mlp");
      expect(perf!.predictions).toBe(10);
      expect(perf!.mean_error).toBeCloseTo(0.1);
    });
  });

  // ============================================================================
  // HEDGE ALGORITHM
  // ============================================================================

  describe("Hedge algorithm", () => {
    it("uses multiplicative weight update", () => {
      const hedgeEngine = new EnsembleModelSelectorEngine({ algorithm: "hedge" });
      hedgeEngine.registerMember(mlpMember);
      hedgeEngine.registerMember(physicsMember);

      const initial = hedgeEngine.getWeights();

      hedgeEngine.updateWeights(
        new Map([
          ["force-mlp", 0.01],
          ["force-kienzle", 0.5],
        ]),
        500
      );

      const updated = hedgeEngine.getWeights();

      // MLP should have higher weight after low error
      expect(updated.get("force-mlp")!).toBeGreaterThan(updated.get("force-kienzle")!);
    });

    it("normalizes weights to sum to 1", () => {
      const hedgeEngine = new EnsembleModelSelectorEngine({ algorithm: "hedge" });
      hedgeEngine.registerMember(mlpMember);
      hedgeEngine.registerMember(physicsMember);
      hedgeEngine.registerMember(hybridMember);

      hedgeEngine.updateWeights(
        new Map([
          ["force-mlp", 0.1],
          ["force-kienzle", 0.2],
          ["force-hybrid", 0.15],
        ]),
        500
      );

      const weights = hedgeEngine.getWeights();
      const sum = Array.from(weights.values()).reduce((a, b) => a + b, 0);

      expect(sum).toBeCloseTo(1, 5);
    });
  });

  // ============================================================================
  // FOLLOW-LEADER ALGORITHM
  // ============================================================================

  describe("Follow-Leader algorithm", () => {
    it("assigns most weight to leader", () => {
      const flEngine = new EnsembleModelSelectorEngine({ algorithm: "follow-leader" });
      flEngine.registerMember(mlpMember);
      flEngine.registerMember(physicsMember);

      // MLP has lower cumulative loss
      for (let i = 0; i < 10; i++) {
        flEngine.updateWeights(
          new Map([
            ["force-mlp", 0.05],
            ["force-kienzle", 0.15],
          ]),
          500
        );
      }

      const weights = flEngine.getWeights();
      expect(weights.get("force-mlp")).toBeGreaterThan(0.9);
    });
  });

  // ============================================================================
  // UCB-EXPERT ALGORITHM
  // ============================================================================

  describe("UCB-Expert algorithm", () => {
    it("balances exploitation and exploration", () => {
      const ucbEngine = new EnsembleModelSelectorEngine({ algorithm: "ucb-expert" });
      ucbEngine.registerMember(mlpMember);
      ucbEngine.registerMember(physicsMember);

      // Few observations - exploration matters
      ucbEngine.updateWeights(
        new Map([
          ["force-mlp", 0.1],
          ["force-kienzle", 0.15],
        ]),
        500
      );

      const weights = ucbEngine.getWeights();
      // Both should have reasonable weight due to exploration
      expect(weights.get("force-kienzle")!).toBeGreaterThan(0.1);
    });
  });

  // ============================================================================
  // BEST MEMBER
  // ============================================================================

  describe("best member", () => {
    it("returns null with insufficient data", () => {
      engine.registerMember(mlpMember);
      engine.updateWeights(new Map([["force-mlp", 0.1]]), 500);

      const best = engine.getBestMember();
      expect(best).toBeNull();
    });

    it("finds best by recent error", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      for (let i = 0; i < 10; i++) {
        engine.updateWeights(
          new Map([
            ["force-mlp", 0.05],
            ["force-kienzle", 0.15],
          ]),
          500
        );
      }

      const best = engine.getBestMember("recent_error");
      expect(best).not.toBeNull();
      expect(best!.member.id).toBe("force-mlp");
    });

    it("finds best by weight", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      for (let i = 0; i < 10; i++) {
        engine.updateWeights(
          new Map([
            ["force-mlp", 0.02],
            ["force-kienzle", 0.20],
          ]),
          500
        );
      }

      const best = engine.getBestMember("weight");
      expect(best!.member.id).toBe("force-mlp");
    });
  });

  // ============================================================================
  // PRUNING
  // ============================================================================

  describe("pruning", () => {
    it("prunes low-weight members", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      // Drive physics weight very low
      for (let i = 0; i < 50; i++) {
        engine.updateWeights(
          new Map([
            ["force-mlp", 0.01],
            ["force-kienzle", 0.8],
          ]),
          500
        );
      }

      const pruned = engine.pruneMembers(0.1);

      expect(pruned).toContain("force-kienzle");
    });

    it("reactivates pruned member", () => {
      engine.registerMember(mlpMember);

      // Manually deactivate
      for (let i = 0; i < 25; i++) {
        engine.updateWeights(new Map([["force-mlp", 0.5]]), 500);
      }
      engine.pruneMembers(0.5);

      const reactivated = engine.reactivateMember("force-mlp");
      expect(reactivated).toBe(true);
    });
  });

  // ============================================================================
  // DIVERSITY METRICS
  // ============================================================================

  describe("diversity metrics", () => {
    it("counts active members", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);
      engine.registerMember({ ...hybridMember, active: false });

      const metrics = engine.getDiversityMetrics();
      expect(metrics.active_count).toBe(2);
    });

    it("tracks type distribution", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);
      engine.registerMember(hybridMember);

      const metrics = engine.getDiversityMetrics();
      expect(metrics.type_distribution.neural).toBe(1);
      expect(metrics.type_distribution.physics).toBe(1);
      expect(metrics.type_distribution.hybrid).toBe(1);
    });

    it("tracks domain distribution", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(thermalMember);

      const metrics = engine.getDiversityMetrics();
      expect(metrics.domain_distribution.force).toBe(1);
      expect(metrics.domain_distribution.thermal).toBe(1);
    });

    it("computes weight entropy", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);
      engine.registerMember(hybridMember);

      const metrics = engine.getDiversityMetrics();

      // Uniform weights = max entropy
      expect(metrics.weight_entropy).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("clears all statistics", () => {
      engine.registerMember(mlpMember);

      for (let i = 0; i < 20; i++) {
        engine.updateWeights(new Map([["force-mlp", 0.1]]), 500);
      }

      engine.reset();

      const perf = engine.getMemberPerformance("force-mlp");
      expect(perf!.predictions).toBe(0);
      expect(perf!.loss).toBe(0);
    });

    it("resets weights to uniform", () => {
      engine.registerMember(mlpMember);
      engine.registerMember(physicsMember);

      for (let i = 0; i < 20; i++) {
        engine.updateWeights(
          new Map([
            ["force-mlp", 0.01],
            ["force-kienzle", 0.5],
          ]),
          500
        );
      }

      engine.reset();

      const weights = engine.getWeights();
      expect(weights.get("force-mlp")).toBeCloseTo(0.5, 1);
      expect(weights.get("force-kienzle")).toBeCloseTo(0.5, 1);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.algorithm).toBeDefined();
      expect(config.learning_rate).toBeDefined();
    });

    it("applies custom learning rate", () => {
      const customEngine = new EnsembleModelSelectorEngine({ learning_rate: 0.5 });
      expect(customEngine.getConfig().learning_rate).toBe(0.5);
    });

    it("applies custom forgetting factor", () => {
      const customEngine = new EnsembleModelSelectorEngine({ forgetting_factor: 0.9 });
      expect(customEngine.getConfig().forgetting_factor).toBe(0.9);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(ensembleModelSelectorEngine).toBeDefined();
      expect(ensembleModelSelectorEngine).toBeInstanceOf(EnsembleModelSelectorEngine);
    });
  });
});
