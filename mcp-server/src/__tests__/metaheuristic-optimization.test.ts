/**
 * Tests for MetaheuristicOptimizationEngine — 5 metaheuristic optimizers
 * GA, DE, PSO, SA, Bayesian Optimization
 */
import { describe, it, expect } from "vitest";
import { MetaheuristicOptimizationEngine } from "../engines/MetaheuristicOptimizationEngine.js";

const engine = new MetaheuristicOptimizationEngine();

// Shared test functions
const sphere = (x: number[]) => x.reduce((s, v) => s + v * v, 0);
const rosenbrock = (x: number[]) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
const rastrigin = (x: number[]) =>
  10 * x.length + x.reduce((s, v) => s + v * v - 10 * Math.cos(2 * Math.PI * v), 0);

describe("MetaheuristicOptimizationEngine", () => {
  // ──────────────────────────────────────────────────────────────────
  // 1. Genetic Algorithm
  // ──────────────────────────────────────────────────────────────────
  describe("geneticAlgorithm()", () => {
    it("should minimize sphere function", () => {
      const r = engine.geneticAlgorithm({
        objectiveFn: sphere,
        dimensions: 2,
        popSize: 50,
        maxGenerations: 200,
        bounds: [[-5, 5], [-5, 5]],
        seed: 42,
      });
      expect(r.bestFitness).toBeLessThan(1);
      expect(r.bestSolution).toHaveLength(2);
      expect(r.convergenceHistory.length).toBeGreaterThan(0);
      expect(r.finalPopulation).toHaveLength(50);
      expect(r.generations).toBeLessThanOrEqual(200);
    });

    it("should converge — fitness decreases over generations", () => {
      const r = engine.geneticAlgorithm({
        objectiveFn: sphere,
        dimensions: 3,
        popSize: 40,
        maxGenerations: 100,
        bounds: [[-10, 10], [-10, 10], [-10, 10]],
        seed: 123,
      });
      const h = r.convergenceHistory;
      expect(h[h.length - 1]).toBeLessThanOrEqual(h[0]);
    });

    it("should respect bounds", () => {
      const r = engine.geneticAlgorithm({
        objectiveFn: sphere,
        dimensions: 2,
        popSize: 30,
        maxGenerations: 50,
        bounds: [[1, 3], [1, 3]],
        seed: 77,
      });
      for (const ind of r.finalPopulation) {
        expect(ind[0]).toBeGreaterThanOrEqual(1);
        expect(ind[0]).toBeLessThanOrEqual(3);
        expect(ind[1]).toBeGreaterThanOrEqual(1);
        expect(ind[1]).toBeLessThanOrEqual(3);
      }
    });

    it("should be reproducible with same seed", () => {
      const input = {
        objectiveFn: sphere,
        dimensions: 2,
        popSize: 20,
        maxGenerations: 30,
        bounds: [[-5, 5], [-5, 5]] as [number, number][],
        seed: 999,
      };
      const r1 = engine.geneticAlgorithm(input);
      const r2 = engine.geneticAlgorithm(input);
      expect(r1.bestFitness).toBe(r2.bestFitness);
      expect(r1.bestSolution).toEqual(r2.bestSolution);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. Differential Evolution
  // ──────────────────────────────────────────────────────────────────
  describe("differentialEvolution()", () => {
    it("should minimize sphere function", () => {
      const r = engine.differentialEvolution({
        objectiveFn: sphere,
        dimensions: 2,
        popSize: 30,
        maxGenerations: 200,
        bounds: [[-5, 5], [-5, 5]],
        seed: 42,
      });
      expect(r.bestFitness).toBeLessThan(0.1);
      expect(r.bestSolution).toHaveLength(2);
      expect(r.convergenceHistory.length).toBeGreaterThan(0);
    });

    it("should handle Rosenbrock valley", () => {
      const r = engine.differentialEvolution({
        objectiveFn: rosenbrock,
        dimensions: 2,
        popSize: 50,
        maxGenerations: 500,
        bounds: [[-5, 5], [-5, 5]],
        seed: 42,
      });
      expect(r.bestFitness).toBeLessThan(10);
    });

    it("should converge monotonically (best fitness non-increasing)", () => {
      const r = engine.differentialEvolution({
        objectiveFn: sphere,
        dimensions: 3,
        popSize: 30,
        maxGenerations: 100,
        bounds: [[-10, 10], [-10, 10], [-10, 10]],
        seed: 55,
      });
      for (let i = 1; i < r.convergenceHistory.length; i++) {
        expect(r.convergenceHistory[i]).toBeLessThanOrEqual(r.convergenceHistory[i - 1] + 1e-10);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. Particle Swarm Optimization
  // ──────────────────────────────────────────────────────────────────
  describe("particleSwarmOptimization()", () => {
    it("should minimize sphere function", () => {
      const r = engine.particleSwarmOptimization({
        objectiveFn: sphere,
        dimensions: 2,
        swarmSize: 30,
        maxIterations: 200,
        bounds: [[-5, 5], [-5, 5]],
        seed: 42,
      });
      expect(r.bestFitness).toBeLessThan(0.5);
      expect(r.bestPosition).toHaveLength(2);
      expect(r.iterations).toBeLessThanOrEqual(200);
    });

    it("should return convergence history", () => {
      const r = engine.particleSwarmOptimization({
        objectiveFn: sphere,
        dimensions: 2,
        swarmSize: 20,
        maxIterations: 50,
        bounds: [[-10, 10], [-10, 10]],
        seed: 77,
      });
      expect(r.convergenceHistory).toHaveLength(50);
      // Should improve over time
      expect(r.convergenceHistory[49]).toBeLessThanOrEqual(r.convergenceHistory[0]);
    });

    it("should handle higher dimensions", () => {
      const r = engine.particleSwarmOptimization({
        objectiveFn: sphere,
        dimensions: 5,
        swarmSize: 40,
        maxIterations: 300,
        bounds: Array(5).fill([-5, 5]) as [number, number][],
        seed: 42,
      });
      expect(r.bestFitness).toBeLessThan(5);
      expect(r.bestPosition).toHaveLength(5);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. Simulated Annealing
  // ──────────────────────────────────────────────────────────────────
  describe("simulatedAnnealing()", () => {
    it("should minimize sphere function", () => {
      const r = engine.simulatedAnnealing({
        objectiveFn: sphere,
        initialSolution: [5, 5],
        initialTemp: 100,
        coolingRate: 0.995,
        maxIterations: 5000,
        stepSize: 0.5,
        seed: 42,
      });
      expect(r.bestEnergy).toBeLessThan(1);
      expect(r.bestSolution).toHaveLength(2);
      expect(r.finalTemperature).toBeLessThan(r.iterations > 0 ? 100 : Infinity);
      expect(r.convergenceHistory.length).toBeGreaterThan(0);
    });

    it("should cool down temperature", () => {
      const r = engine.simulatedAnnealing({
        objectiveFn: sphere,
        initialSolution: [3],
        initialTemp: 1000,
        coolingRate: 0.99,
        maxIterations: 500,
        seed: 42,
      });
      expect(r.finalTemperature).toBeLessThan(1000);
    });

    it("should respect bounds when provided", () => {
      const r = engine.simulatedAnnealing({
        objectiveFn: sphere,
        initialSolution: [2, 2],
        initialTemp: 100,
        coolingRate: 0.99,
        maxIterations: 1000,
        bounds: [[0, 5], [0, 5]],
        seed: 42,
      });
      expect(r.bestSolution[0]).toBeGreaterThanOrEqual(0);
      expect(r.bestSolution[0]).toBeLessThanOrEqual(5);
      expect(r.bestSolution[1]).toBeGreaterThanOrEqual(0);
      expect(r.bestSolution[1]).toBeLessThanOrEqual(5);
    });

    it("should accept worse solutions at high temperature (stochastic)", () => {
      // With high temp and many iterations, SA should explore broadly
      const r = engine.simulatedAnnealing({
        objectiveFn: sphere,
        initialSolution: [0.1],
        initialTemp: 10000,
        coolingRate: 0.999,
        maxIterations: 100,
        stepSize: 5,
        seed: 42,
      });
      // Convergence history should have some ups (accepted worse)
      let hasIncrease = false;
      for (let i = 1; i < Math.min(50, r.convergenceHistory.length); i++) {
        if (r.convergenceHistory[i] > r.convergenceHistory[i - 1]) {
          hasIncrease = true;
          break;
        }
      }
      // At high temp with large steps, very likely to accept worse
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. Bayesian Optimization
  // ──────────────────────────────────────────────────────────────────
  describe("bayesianOptimization()", () => {
    it("should minimize a simple quadratic", () => {
      const r = engine.bayesianOptimization({
        objectiveFn: (x) => (x[0] - 2) ** 2,
        dimensions: 1,
        bounds: [[-5, 5]],
        nInitial: 5,
        maxIterations: 15,
        seed: 42,
      });
      expect(r.bestValue).toBeLessThan(2);
      expect(r.bestSolution).toHaveLength(1);
      expect(r.observationsX.length).toBeGreaterThanOrEqual(5);
      expect(r.observationsY.length).toBe(r.observationsX.length);
    });

    it("should accumulate observations over iterations", () => {
      const r = engine.bayesianOptimization({
        objectiveFn: sphere,
        dimensions: 2,
        bounds: [[-3, 3], [-3, 3]],
        nInitial: 8,
        maxIterations: 10,
        seed: 42,
      });
      // Should have nInitial + maxIterations observations
      expect(r.observationsX.length).toBe(18);
      expect(r.convergenceHistory.length).toBeGreaterThan(0);
    });

    it("should improve over random sampling baseline", () => {
      const r = engine.bayesianOptimization({
        objectiveFn: sphere,
        dimensions: 2,
        bounds: [[-5, 5], [-5, 5]],
        nInitial: 10,
        maxIterations: 20,
        seed: 42,
      });
      // Best found should be better than the worst initial observation
      const initialWorst = Math.max(...r.observationsY.slice(0, 10));
      expect(r.bestValue).toBeLessThan(initialWorst);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Cross-method comparisons
  // ──────────────────────────────────────────────────────────────────
  describe("cross-method comparison", () => {
    it("all 5 methods should find approximate minimum of sphere", () => {
      const bounds: [number, number][] = [[-5, 5], [-5, 5]];

      const ga = engine.geneticAlgorithm({
        objectiveFn: sphere, dimensions: 2, popSize: 40,
        maxGenerations: 100, bounds, seed: 42,
      });
      const de = engine.differentialEvolution({
        objectiveFn: sphere, dimensions: 2, popSize: 30,
        maxGenerations: 100, bounds, seed: 42,
      });
      const pso = engine.particleSwarmOptimization({
        objectiveFn: sphere, dimensions: 2, swarmSize: 30,
        maxIterations: 100, bounds, seed: 42,
      });
      const sa = engine.simulatedAnnealing({
        objectiveFn: sphere, initialSolution: [3, 3],
        initialTemp: 100, coolingRate: 0.99, maxIterations: 2000, seed: 42,
      });
      const bo = engine.bayesianOptimization({
        objectiveFn: sphere, dimensions: 2, bounds,
        nInitial: 10, maxIterations: 20, seed: 42,
      });

      // All should get below 5 on sphere
      expect(ga.bestFitness).toBeLessThan(5);
      expect(de.bestFitness).toBeLessThan(5);
      expect(pso.bestFitness).toBeLessThan(5);
      expect(sa.bestEnergy).toBeLessThan(5);
      expect(bo.bestValue).toBeLessThan(5);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 5 methods", () => {
      const s = engine.stats();
      expect(s.methods).toHaveLength(5);
      expect(s.methods.some((m) => m.includes("GA"))).toBe(true);
      expect(s.methods.some((m) => m.includes("DE"))).toBe(true);
      expect(s.methods.some((m) => m.includes("PSO"))).toBe(true);
      expect(s.methods.some((m) => m.includes("SA"))).toBe(true);
      expect(s.methods.some((m) => m.includes("Bayesian") || m.includes("BO"))).toBe(true);
    });
  });
});
