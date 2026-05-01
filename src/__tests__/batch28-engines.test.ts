/**
 * Batch 28 Engines -- Unit Tests
 * SwarmNeuralHybridEngine
 * @milestone AUDIT-FT-B28
 */
import { describe, it, expect } from "vitest";
import { swarmNeuralHybridEngine } from "../engines/SwarmNeuralHybridEngine.js";

describe("SwarmNeuralHybridEngine", () => {
  describe("createOptimizer", () => {
    it("creates optimizer with particles", () => {
      const obj = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const opt = swarmNeuralHybridEngine.createOptimizer(obj, [[-5, 5], [-5, 5]]);
      expect(opt.particles.length).toBe(30);
      expect(opt.globalBest.fitness).toBeLessThan(Infinity);
      expect(opt.iteration).toBe(0);
    });

    it("respects custom config", () => {
      const obj = (x: number[]) => x[0] * x[0];
      const opt = swarmNeuralHybridEngine.createOptimizer(obj, [[-10, 10]], { numParticles: 10 });
      expect(opt.particles.length).toBe(10);
    });
  });

  describe("step", () => {
    it("advances iteration", () => {
      const obj = (x: number[]) => x[0] * x[0];
      const opt = swarmNeuralHybridEngine.createOptimizer(obj, [[-5, 5]], { numParticles: 10 });
      const r = swarmNeuralHybridEngine.step(opt, obj);
      expect(r.iteration).toBe(1);
      expect(r.bestFitness).toBeLessThan(Infinity);
    });

    it("improves over multiple steps", () => {
      const obj = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const opt = swarmNeuralHybridEngine.createOptimizer(obj, [[-10, 10], [-10, 10]], { numParticles: 20 });
      const initial = opt.globalBest.fitness;
      for (let i = 0; i < 50; i++) swarmNeuralHybridEngine.step(opt, obj);
      expect(opt.globalBest.fitness).toBeLessThanOrEqual(initial);
    });
  });

  describe("optimize", () => {
    it("finds minimum of sphere function", () => {
      const obj = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const r = swarmNeuralHybridEngine.optimize(obj, [[-10, 10], [-10, 10]], {
        numParticles: 30, maxIterations: 100,
      });
      expect(r.bestFitness).toBeLessThan(1);
      expect(Math.abs(r.bestPosition[0])).toBeLessThan(2);
      expect(Math.abs(r.bestPosition[1])).toBeLessThan(2);
      expect(r.iterations).toBe(100);
      expect(r.convergenceHistory.length).toBe(100);
    });

    it("finds minimum of shifted quadratic", () => {
      const obj = (x: number[]) => Math.pow(x[0] - 3, 2) + Math.pow(x[1] + 2, 2);
      const r = swarmNeuralHybridEngine.optimize(obj, [[-10, 10], [-10, 10]], {
        numParticles: 30, maxIterations: 100,
      });
      expect(r.bestFitness).toBeLessThan(2);
      expect(Math.abs(r.bestPosition[0] - 3)).toBeLessThan(2);
    });

    it("works without neural guidance", () => {
      const obj = (x: number[]) => x[0] * x[0];
      const r = swarmNeuralHybridEngine.optimize(obj, [[-5, 5]], {
        numParticles: 20, maxIterations: 50, useNeuralGuidance: false,
      });
      expect(r.bestFitness).toBeLessThan(1);
    });

    it("handles 1D optimization", () => {
      const obj = (x: number[]) => Math.pow(x[0] - 7, 2);
      const r = swarmNeuralHybridEngine.optimize(obj, [[0, 10]], {
        numParticles: 15, maxIterations: 50,
      });
      expect(Math.abs(r.bestPosition[0] - 7)).toBeLessThan(2);
    });
  });

  describe("_forward", () => {
    it("produces output of correct dimension", () => {
      const net = swarmNeuralHybridEngine._createNetwork(3, 8);
      const out = swarmNeuralHybridEngine._forward(net, [1, 2, 3]);
      expect(out.length).toBe(3);
    });
  });

  describe("convergence history", () => {
    it("is monotonically non-increasing", () => {
      const obj = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const r = swarmNeuralHybridEngine.optimize(obj, [[-10, 10], [-10, 10]], {
        numParticles: 20, maxIterations: 50,
      });
      for (let i = 1; i < r.convergenceHistory.length; i++) {
        expect(r.convergenceHistory[i]).toBeLessThanOrEqual(r.convergenceHistory[i - 1]);
      }
    });
  });
});
