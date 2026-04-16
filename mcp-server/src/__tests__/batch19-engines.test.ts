/**
 * Batch 19 Engines -- Unit Tests
 * GeneticAlgorithmEngine + SimulatedAnnealingEngine
 * @milestone AUDIT-FT-B19
 */
import { describe, it, expect } from "vitest";
import { geneticAlgorithmEngine } from "../engines/GeneticAlgorithmEngine.js";
import { simulatedAnnealingEngine } from "../engines/SimulatedAnnealingEngine.js";

// ============================================================================
// GeneticAlgorithmEngine
// ============================================================================

describe("GeneticAlgorithmEngine", () => {
  const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];

  describe("createIndividual", () => {
    it("creates individual within bounds", () => {
      const ind = geneticAlgorithmEngine.createIndividual(bounds);
      expect(ind.genes.length).toBe(2);
      expect(ind.genes[0]).toBeGreaterThanOrEqual(-10);
      expect(ind.genes[0]).toBeLessThanOrEqual(10);
      expect(ind.fitness).toBe(-Infinity);
    });
  });

  describe("initializePopulation", () => {
    it("creates correct population size", () => {
      const pop = geneticAlgorithmEngine.initializePopulation(20, bounds);
      expect(pop.length).toBe(20);
    });
  });

  describe("selection", () => {
    const pop = [
      { genes: [1], fitness: 10 },
      { genes: [2], fitness: 20 },
      { genes: [3], fitness: 30 },
    ];

    it("tournament selects an individual", () => {
      const sel = geneticAlgorithmEngine.tournamentSelection(pop, 3);
      expect(sel.genes).toBeDefined();
      expect(sel.fitness).toBeGreaterThanOrEqual(10);
    });

    it("roulette selects an individual", () => {
      const sel = geneticAlgorithmEngine.rouletteSelection(pop);
      expect(sel.genes).toBeDefined();
    });
  });

  describe("crossover", () => {
    const p1 = { genes: [1, 2, 3, 4, 5], fitness: 0 };
    const p2 = { genes: [6, 7, 8, 9, 10], fitness: 0 };

    it("single-point produces 2 children", () => {
      const [c1, c2] = geneticAlgorithmEngine.singlePointCrossover(p1, p2);
      expect(c1.genes.length).toBe(5);
      expect(c2.genes.length).toBe(5);
    });

    it("two-point produces 2 children", () => {
      const [c1, c2] = geneticAlgorithmEngine.twoPointCrossover(p1, p2);
      expect(c1.genes.length).toBe(5);
      expect(c2.genes.length).toBe(5);
    });

    it("blend crossover stays within bounds", () => {
      const b = Array(5).fill({ min: 0, max: 15 });
      const [c1] = geneticAlgorithmEngine.blendCrossover(p1, p2, 0.5, b);
      for (let i = 0; i < 5; i++) {
        expect(c1.genes[i]).toBeGreaterThanOrEqual(0);
        expect(c1.genes[i]).toBeLessThanOrEqual(15);
      }
    });
  });

  describe("mutation", () => {
    it("gaussian mutation stays within bounds", () => {
      const ind = { genes: [5, 5], fitness: 0 };
      const m = geneticAlgorithmEngine.gaussianMutation(ind, bounds, 1.0);
      expect(m.genes[0]).toBeGreaterThanOrEqual(-10);
      expect(m.genes[0]).toBeLessThanOrEqual(10);
    });
  });

  describe("optimize", () => {
    it("minimizes sphere function", () => {
      const sphere = (g: number[]) => -(g[0] ** 2 + g[1] ** 2);
      const r = geneticAlgorithmEngine.optimize(sphere, bounds, {
        populationSize: 30, maxGenerations: 30,
      });
      expect(r.success).toBe(true);
      expect(r.bestFitness).toBeGreaterThan(-5); // near 0
      expect(r.fitnessHistory.length).toBeGreaterThan(1);
    });

    it("detects convergence", () => {
      const flat = () => 42;
      const r = geneticAlgorithmEngine.optimize(flat, bounds, {
        populationSize: 10, maxGenerations: 100, stagnationLimit: 5,
      });
      expect(r.converged).toBe(true);
    });
  });
});

// ============================================================================
// SimulatedAnnealingEngine
// ============================================================================

describe("SimulatedAnnealingEngine", () => {
  const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];

  describe("generateNeighbor", () => {
    it("stays within bounds", () => {
      const n = simulatedAnnealingEngine.generateNeighbor([5, 5], bounds, 100);
      expect(n[0]).toBeGreaterThanOrEqual(-10);
      expect(n[0]).toBeLessThanOrEqual(10);
    });
  });

  describe("acceptanceProbability", () => {
    it("always accepts improvements", () => {
      expect(simulatedAnnealingEngine.acceptanceProbability(10, 5, 100)).toBe(true);
    });

    it("sometimes accepts worse at high temp", () => {
      // Statistically: at temp=1000, delta=1 should almost always accept
      let accepted = 0;
      for (let i = 0; i < 100; i++) {
        if (simulatedAnnealingEngine.acceptanceProbability(10, 11, 1000)) accepted++;
      }
      expect(accepted).toBeGreaterThan(50);
    });
  });

  describe("cooling schedules", () => {
    it("geometric reduces temperature", () => {
      expect(simulatedAnnealingEngine.coolGeometric(100, 0.95)).toBeCloseTo(95);
    });

    it("linear reduces to zero", () => {
      expect(simulatedAnnealingEngine.coolLinear(100, 50, 100)).toBeCloseTo(50);
    });

    it("logarithmic reduces slowly", () => {
      const t = simulatedAnnealingEngine.coolLogarithmic(100, 10);
      expect(t).toBeLessThan(100);
      expect(t).toBeGreaterThan(0);
    });
  });

  describe("optimize", () => {
    it("minimizes sphere function", () => {
      const sphere = (s: number[]) => -(s[0] ** 2 + s[1] ** 2);
      const r = simulatedAnnealingEngine.optimize(sphere, bounds, {
        initialTemp: 100, maxIterations: 2000, iterationsPerTemp: 50,
      });
      expect(r.success).toBe(true);
      expect(r.bestFitness).toBeGreaterThan(-10);
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  describe("batchOptimize", () => {
    it("returns best of multiple runs", () => {
      const sphere = (s: number[]) => -(s[0] ** 2 + s[1] ** 2);
      const r = simulatedAnnealingEngine.batchOptimize(sphere, bounds, 3, {
        initialTemp: 50, maxIterations: 500, iterationsPerTemp: 20,
      });
      expect(r.numRuns).toBe(3);
      expect(r.allResults.length).toBe(3);
      expect(r.best.bestFitness).toBeGreaterThanOrEqual(r.allResults[r.allResults.length - 1].fitness);
    });
  });

  describe("optimizeSequence", () => {
    it("optimizes 2-opt TSP", () => {
      const pts = [
        { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }, { x: 5, y: 5, z: 0 },
      ];
      const r = simulatedAnnealingEngine.optimizeSequence(pts, { maxIterations: 500 });
      expect(r.success).toBe(true);
      expect(r.sequence.length).toBe(5);
      expect(r.distance).toBeGreaterThan(0);
    });

    it("handles single point", () => {
      const r = simulatedAnnealingEngine.optimizeSequence([{ x: 0, y: 0 }]);
      expect(r.sequence).toEqual([0]);
      expect(r.distance).toBe(0);
    });
  });
});
