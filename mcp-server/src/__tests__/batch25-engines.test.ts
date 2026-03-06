/**
 * Batch 25 Engines -- Unit Tests
 * BayesianToolLifeEngine + QLearningEngine
 * @milestone AUDIT-FT-B25
 */
import { describe, it, expect } from "vitest";
import { bayesianToolLifeEngine } from "../engines/BayesianToolLifeEngine.js";
import { qLearningEngine } from "../engines/QLearningEngine.js";

// ============================================================================
// BayesianToolLifeEngine
// ============================================================================

describe("BayesianToolLifeEngine", () => {
  describe("createPredictor", () => {
    it("initializes with default GP config", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      expect(p.gp.lengthScale).toBe(50);
      expect(p.gp.X_train.length).toBe(0);
      expect(p.taylor.C).toBe(400);
    });

    it("accepts custom config", () => {
      const p = bayesianToolLifeEngine.createPredictor({ lengthScale: 100, signalVariance: 2.0 });
      expect(p.gp.lengthScale).toBe(100);
      expect(p.gp.signalVariance).toBe(2.0);
    });
  });

  describe("predict (Taylor prior only)", () => {
    it("returns taylor_prior source with no observations", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      const r = bayesianToolLifeEngine.predict(p, 200, 0.2, 2);
      expect(r.source).toBe("taylor_prior");
      expect(r.mean).toBeGreaterThan(0);
      expect(r.confidence).toBe(0.5);
      expect(r.confidence95[0]).toBeLessThan(r.mean);
      expect(r.confidence95[1]).toBeGreaterThan(r.mean);
    });

    it("higher speed reduces tool life", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      const r100 = bayesianToolLifeEngine.predict(p, 100, 0.1, 1);
      const r300 = bayesianToolLifeEngine.predict(p, 300, 0.1, 1);
      expect(r100.mean).toBeGreaterThan(r300.mean);
    });
  });

  describe("addObservation + predict (Bayesian)", () => {
    it("switches to bayesian_combined with observations", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      bayesianToolLifeEngine.addObservation(p, 200, 0.2, 2, 45);
      bayesianToolLifeEngine.addObservation(p, 150, 0.15, 1.5, 60);
      const r = bayesianToolLifeEngine.predict(p, 180, 0.18, 1.8);
      expect(r.source).toBe("bayesian_combined");
      expect(r.taylorPrediction).toBeDefined();
      expect(r.gpPrediction).toBeDefined();
      expect(r.confidence).toBeGreaterThan(0.5);
    });

    it("increases confidence with more observations", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      bayesianToolLifeEngine.addObservation(p, 200, 0.2, 2, 45);
      const r1 = bayesianToolLifeEngine.predict(p, 200, 0.2, 2);
      for (let i = 0; i < 5; i++) {
        bayesianToolLifeEngine.addObservation(p, 180 + i * 10, 0.2, 2, 40 + i * 3);
      }
      const r2 = bayesianToolLifeEngine.predict(p, 200, 0.2, 2);
      expect(r2.confidence).toBeGreaterThan(r1.confidence);
    });
  });

  describe("getReplacementTime", () => {
    it("recommends conservative replacement", () => {
      const p = bayesianToolLifeEngine.createPredictor();
      const r = bayesianToolLifeEngine.getReplacementTime(p, 200, 0.2, 2, 0.1);
      expect(r.recommendedReplacement).toBeGreaterThan(0);
      expect(r.recommendedReplacement).toBeLessThan(r.expectedLife);
      expect(r.riskTolerance).toBe(0.1);
    });
  });

  describe("_normInv", () => {
    it("returns 0 for p=0.5", () => {
      expect(bayesianToolLifeEngine._normInv(0.5)).toBe(0);
    });

    it("returns positive for p>0.5", () => {
      expect(bayesianToolLifeEngine._normInv(0.975)).toBeGreaterThan(1.5);
    });

    it("returns negative for p<0.5", () => {
      expect(bayesianToolLifeEngine._normInv(0.025)).toBeLessThan(-1.5);
    });
  });
});

// ============================================================================
// QLearningEngine
// ============================================================================

describe("QLearningEngine", () => {
  describe("createAgent", () => {
    it("creates agent with defaults", () => {
      const agent = qLearningEngine.createAgent();
      expect(agent.actionSize).toBe(4);
      expect(agent.epsilon).toBe(1.0);
      expect(agent.qTable.size).toBe(0);
    });

    it("accepts custom config", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 6, learningRate: 0.5 });
      expect(agent.actionSize).toBe(6);
      expect(agent.learningRate).toBe(0.5);
    });
  });

  describe("Q-table operations", () => {
    it("initializes Q-values to zero", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 3 });
      const qv = qLearningEngine.getQValues(agent, 0);
      expect(qv).toEqual([0, 0, 0]);
    });

    it("sets and gets Q-values", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 3 });
      qLearningEngine.setQ(agent, 0, 1, 5.0);
      expect(qLearningEngine.getQ(agent, 0, 1)).toBe(5.0);
      expect(qLearningEngine.getQ(agent, 0, 0)).toBe(0);
    });

    it("handles array states", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 2 });
      qLearningEngine.setQ(agent, [1, 2, 3], 0, 10);
      expect(qLearningEngine.getQ(agent, [1, 2, 3], 0)).toBe(10);
    });
  });

  describe("selectAction", () => {
    it("selects greedy action when not training", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 3 });
      qLearningEngine.setQ(agent, 0, 2, 10);
      const action = qLearningEngine.selectAction(agent, 0, false);
      expect(action).toBe(2);
    });

    it("explores during training with high epsilon", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 10, epsilon: 1.0 });
      const actions = new Set<number>();
      for (let i = 0; i < 100; i++) actions.add(qLearningEngine.selectAction(agent, 0, true));
      expect(actions.size).toBeGreaterThan(1);
    });
  });

  describe("learnQLearning", () => {
    it("updates Q-value toward target", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 2, learningRate: 0.5, discountFactor: 0.9 });
      const r = qLearningEngine.learnQLearning(agent, 0, 0, 10, 1, false);
      expect(r.newQ).toBe(5); // 0 + 0.5 * (10 + 0.9*0 - 0) = 5
      expect(r.tdError).toBe(10);
      expect(agent.totalSteps).toBe(1);
    });

    it("terminal state uses reward only", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 2, learningRate: 1.0 });
      qLearningEngine.learnQLearning(agent, 0, 0, 100, 1, true);
      expect(qLearningEngine.getQ(agent, 0, 0)).toBe(100);
    });
  });

  describe("learnSARSA", () => {
    it("uses next action Q-value instead of max", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 3, learningRate: 1.0, discountFactor: 0.9 });
      qLearningEngine.setQ(agent, 1, 0, 5);  // next state, action 0 = 5
      qLearningEngine.setQ(agent, 1, 1, 10); // next state, action 1 = 10
      qLearningEngine.learnSARSA(agent, 0, 0, 1, 1, 0, false); // nextAction=0 (Q=5)
      expect(qLearningEngine.getQ(agent, 0, 0)).toBeCloseTo(1 + 0.9 * 5); // 5.5
    });
  });

  describe("decayEpsilon", () => {
    it("reduces epsilon", () => {
      const agent = qLearningEngine.createAgent({ epsilon: 1.0, epsilonDecay: 0.9 });
      qLearningEngine.decayEpsilon(agent);
      expect(agent.epsilon).toBeCloseTo(0.9);
    });

    it("respects minimum", () => {
      const agent = qLearningEngine.createAgent({ epsilon: 0.02, epsilonMin: 0.01, epsilonDecay: 0.5 });
      qLearningEngine.decayEpsilon(agent);
      expect(agent.epsilon).toBe(0.01);
    });
  });

  describe("getPolicy", () => {
    it("extracts greedy policy from Q-table", () => {
      const agent = qLearningEngine.createAgent({ actionSize: 3 });
      qLearningEngine.setQ(agent, 0, 2, 10);
      qLearningEngine.setQ(agent, 1, 0, 5);
      const policy = qLearningEngine.getPolicy(agent);
      expect(policy.get(qLearningEngine.stateKey(0))).toBe(2);
      expect(policy.get(qLearningEngine.stateKey(1))).toBe(0);
    });
  });
});
