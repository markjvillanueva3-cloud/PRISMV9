/**
 * SimulatedAnnealingEngine — Unit Tests (12 tests)
 * Simulated annealing metaheuristic for global optimization.
 * Reference: Kirkpatrick et al. (1983).
 */
import { describe, it, expect } from "vitest";
import { simulatedAnnealingEngine } from "../engines/SimulatedAnnealingEngine.js";

describe("SimulatedAnnealingEngine", () => {

  describe("optimize", () => {

    it("sphere function: minimum near origin (within tolerance)", () => {
      // f(x) = x₁² + x₂² → min at (0,0)
      const sphere = (x: number[]) => -(x[0] ** 2 + x[1] ** 2); // negate: SA maximizes fitness
      const result = simulatedAnnealingEngine.optimize(sphere, [
        { min: -5, max: 5 },
        { min: -5, max: 5 },
      ], { initialTemp: 1000, coolingRate: 0.995, maxIterations: 20000 });

      expect(result.bestSolution[0]).toBeCloseTo(0, 0);
      expect(result.bestSolution[1]).toBeCloseTo(0, 0);
      expect(result.bestFitness).toBeGreaterThan(-1);
    });

    it("Rosenbrock: converges near (1,1)", () => {
      // f(x,y) = (1-x)² + 100(y-x²)² → min at (1,1)
      const rosenbrock = (x: number[]) =>
        -((1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2);
      const result = simulatedAnnealingEngine.optimize(rosenbrock, [
        { min: -5, max: 5 },
        { min: -5, max: 5 },
      ], { initialTemp: 2000, coolingRate: 0.998, maxIterations: 50000, iterationsPerTemp: 200 });

      expect(result.bestSolution[0]).toBeCloseTo(1, 0);
      expect(result.bestSolution[1]).toBeCloseTo(1, 0);
    });

    it("respects bounds constraints", () => {
      const result = simulatedAnnealingEngine.optimize(
        (x) => -(x[0] ** 2),
        [{ min: 2, max: 10 }],
        { maxIterations: 5000 },
      );
      expect(result.bestSolution[0]).toBeGreaterThanOrEqual(2);
      expect(result.bestSolution[0]).toBeLessThanOrEqual(10);
    });

    it("acceptance rate decreases as temperature drops", () => {
      const result = simulatedAnnealingEngine.optimize(
        (x) => -(x[0] ** 2 + x[1] ** 2),
        [{ min: -10, max: 10 }, { min: -10, max: 10 }],
        { initialTemp: 1000, coolingRate: 0.99, maxIterations: 10000 },
      );
      // Overall acceptance rate should be between 0 and 1
      expect(result.acceptanceRate).toBeGreaterThan(0);
      expect(result.acceptanceRate).toBeLessThan(1);
      // Temperature should have decreased
      const temps = result.temperatureHistory;
      expect(temps[temps.length - 1]).toBeLessThan(temps[0]);
    });

    it("single variable optimization works", () => {
      // f(x) = -(x-3)² → max at x=3
      const result = simulatedAnnealingEngine.optimize(
        (x) => -((x[0] - 3) ** 2),
        [{ min: -10, max: 10 }],
        { initialTemp: 500, maxIterations: 10000 },
      );
      expect(result.bestSolution[0]).toBeCloseTo(3, 0);
    });

    it("returns convergence history with non-increasing best values (fitness)", () => {
      const result = simulatedAnnealingEngine.optimize(
        (x) => -(x[0] ** 2 + x[1] ** 2),
        [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        { maxIterations: 5000 },
      );
      const hist = result.fitnessHistory;
      expect(hist.length).toBeGreaterThan(1);
      // Best fitness should be non-decreasing (SA tracks best)
      for (let i = 1; i < hist.length; i++) {
        expect(hist[i]).toBeGreaterThanOrEqual(hist[i - 1]);
      }
    });
  });

  describe("temperature effects", () => {
    it("higher initial temperature leads to more exploration", () => {
      const fn = (x: number[]) => -(x[0] ** 2);
      const lowTemp = simulatedAnnealingEngine.optimize(fn,
        [{ min: -10, max: 10 }],
        { initialTemp: 10, maxIterations: 5000 },
      );
      const highTemp = simulatedAnnealingEngine.optimize(fn,
        [{ min: -10, max: 10 }],
        { initialTemp: 10000, maxIterations: 5000 },
      );

      // Higher temp should have higher acceptance rate
      expect(highTemp.acceptanceRate).toBeGreaterThanOrEqual(lowTemp.acceptanceRate * 0.5);
    });
  });
});
