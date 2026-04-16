/**
 * Batch 24 Engines -- Unit Tests
 * CuttingThermalEngine + DifferentialEvolutionEngine
 * @milestone AUDIT-FT-B24
 */
import { describe, it, expect } from "vitest";
import { cuttingThermalEngine } from "../engines/CuttingThermalEngine.js";
import { differentialEvolutionEngine } from "../engines/DifferentialEvolutionEngine.js";

// ============================================================================
// CuttingThermalEngine
// ============================================================================

describe("CuttingThermalEngine", () => {
  describe("shearPlaneTemperature", () => {
    it("calculates temperature rise for steel cutting", () => {
      const r = cuttingThermalEngine.shearPlaneTemperature({
        cuttingSpeed: 200, feed: 0.2, shearStrength: 400,
        shearAngle: 0.5, rakeAngle: 0.1,
        material: { density: 7850, specificHeat: 500, thermalConductivity: 50, ambientTemp: 25 },
      });
      expect(r.temperatureRise_C).toBeGreaterThan(0);
      expect(r.shearZoneTemp_C).toBeGreaterThan(25);
      expect(r.shearVelocity_mps).toBeGreaterThan(0);
      expect(r.thermalNumber).toBeGreaterThan(0);
      expect(["high_speed", "low_speed"]).toContain(r.heatRegime);
    });

    it("uses default material properties when none provided", () => {
      const r = cuttingThermalEngine.shearPlaneTemperature({
        cuttingSpeed: 100, feed: 0.15, shearStrength: 350, shearAngle: 0.4,
      });
      expect(r.shearZoneTemp_C).toBeGreaterThan(25);
    });

    it("high speed gives high_speed regime", () => {
      const r = cuttingThermalEngine.shearPlaneTemperature({
        cuttingSpeed: 500, feed: 0.3, shearStrength: 400, shearAngle: 0.5,
      });
      expect(r.heatRegime).toBe("high_speed");
    });
  });

  describe("toolChipInterfaceTemp", () => {
    it("calculates interface temperature", () => {
      const r = cuttingThermalEngine.toolChipInterfaceTemp({
        cuttingSpeed: 200, feed: 0.2, depthOfCut: 2,
        specificCuttingEnergy: 3.5,
      });
      expect(r.interfaceTemperature_C).toBeGreaterThan(25);
      expect(r.toolAverageTemp_C).toBeGreaterThan(25);
      expect(r.heatPartitionToTool + r.heatPartitionToChip).toBeCloseTo(1);
      expect(r.pecletNumber).toBeGreaterThan(0);
      expect(r.cuttingPower_W).toBeGreaterThan(0);
      expect(r.contactLength_mm).toBeCloseTo(0.4);
    });

    it("higher speed gives higher temperature", () => {
      const r100 = cuttingThermalEngine.toolChipInterfaceTemp({
        cuttingSpeed: 100, feed: 0.2, depthOfCut: 2, specificCuttingEnergy: 3,
      });
      const r300 = cuttingThermalEngine.toolChipInterfaceTemp({
        cuttingSpeed: 300, feed: 0.2, depthOfCut: 2, specificCuttingEnergy: 3,
      });
      expect(r300.interfaceTemperature_C).toBeGreaterThan(r100.interfaceTemperature_C);
    });
  });

  describe("heatPartition", () => {
    it("partitions sum to ~100%", () => {
      const r = cuttingThermalEngine.heatPartition({ cuttingSpeed: 200 });
      const total = r.toChip_percent + r.toTool_percent + r.toWorkpiece_percent;
      expect(total).toBeCloseTo(100, 0);
    });

    it("chip gets majority of heat", () => {
      const r = cuttingThermalEngine.heatPartition({ cuttingSpeed: 200 });
      expect(r.toChip_percent).toBeGreaterThan(50);
    });

    it("aluminum workpiece has higher effusivity than titanium", () => {
      const rAl = cuttingThermalEngine.heatPartition({ cuttingSpeed: 200, workMaterial: "aluminum" });
      const rTi = cuttingThermalEngine.heatPartition({ cuttingSpeed: 200, workMaterial: "titanium" });
      expect(rAl.effusivityWork).toBeGreaterThan(rTi.effusivityWork);
    });
  });
});

// ============================================================================
// DifferentialEvolutionEngine
// ============================================================================

describe("DifferentialEvolutionEngine", () => {
  describe("initializePopulation", () => {
    it("creates correct population size within bounds", () => {
      const bounds = [{ min: 0, max: 10 }, { min: -5, max: 5 }];
      const pop = differentialEvolutionEngine.initializePopulation(20, bounds);
      expect(pop.length).toBe(20);
      for (const ind of pop) {
        expect(ind.genes[0]).toBeGreaterThanOrEqual(0);
        expect(ind.genes[0]).toBeLessThanOrEqual(10);
        expect(ind.genes[1]).toBeGreaterThanOrEqual(-5);
        expect(ind.genes[1]).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("applyBounds", () => {
    it("reflects out-of-bounds values", () => {
      const bounds = [{ min: 0, max: 10 }, { min: 0, max: 10 }];
      const bounded = differentialEvolutionEngine.applyBounds([-2, 13], bounds);
      expect(bounded[0]).toBeGreaterThanOrEqual(0);
      expect(bounded[0]).toBeLessThanOrEqual(10);
      expect(bounded[1]).toBeGreaterThanOrEqual(0);
      expect(bounded[1]).toBeLessThanOrEqual(10);
    });

    it("leaves in-bounds values unchanged", () => {
      const bounds = [{ min: 0, max: 10 }];
      const bounded = differentialEvolutionEngine.applyBounds([5], bounds);
      expect(bounded[0]).toBe(5);
    });
  });

  describe("crossoverBinomial", () => {
    it("produces vector of correct dimension", () => {
      const target = [1, 2, 3, 4];
      const donor = [5, 6, 7, 8];
      const trial = differentialEvolutionEngine.crossoverBinomial(target, donor, 0.9);
      expect(trial.length).toBe(4);
      trial.forEach(v => expect([1, 2, 3, 4, 5, 6, 7, 8]).toContain(v));
    });

    it("at least one gene comes from donor (jRand)", () => {
      const target = [0, 0, 0];
      const donor = [1, 1, 1];
      const trial = differentialEvolutionEngine.crossoverBinomial(target, donor, 0);
      expect(trial).toContain(1); // jRand guarantees at least one donor gene
    });
  });

  describe("crossoverExponential", () => {
    it("produces vector of correct dimension", () => {
      const trial = differentialEvolutionEngine.crossoverExponential([1, 2, 3], [4, 5, 6], 0.5);
      expect(trial.length).toBe(3);
    });
  });

  describe("mutationRand1", () => {
    it("produces mutant of correct dimension", () => {
      const pop = differentialEvolutionEngine.initializePopulation(10, [{ min: 0, max: 10 }]);
      pop.forEach(p => p.fitness = 0);
      const mutant = differentialEvolutionEngine.mutationRand1(pop, 0, 0.8);
      expect(mutant.length).toBe(1);
    });
  });

  describe("optimize", () => {
    it("finds minimum of sphere function", () => {
      // Maximize negative sphere: f(x) = -(x₁² + x₂²)
      const fitness = (genes: number[]) => -1 * (genes[0] * genes[0] + genes[1] * genes[1]);
      const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];
      const r = differentialEvolutionEngine.optimize(fitness, bounds, {
        populationSize: 30, maxGenerations: 200,
      });
      expect(r.success).toBe(true);
      expect(Math.abs(r.bestGenes[0])).toBeLessThan(1);
      expect(Math.abs(r.bestGenes[1])).toBeLessThan(1);
      expect(r.bestFitness).toBeGreaterThan(-1);
    });

    it("works with best1 strategy", () => {
      const fitness = (genes: number[]) => -1 * Math.pow(genes[0] - 3, 2);
      const bounds = [{ min: 0, max: 10 }];
      const r = differentialEvolutionEngine.optimize(fitness, bounds, {
        populationSize: 20, maxGenerations: 100, strategy: "best1",
      });
      expect(r.success).toBe(true);
      expect(Math.abs(r.bestGenes[0] - 3)).toBeLessThan(1);
    });

    it("reports convergence", () => {
      const fitness = (genes: number[]) => -1 * (genes[0] * genes[0]);
      const bounds = [{ min: -5, max: 5 }];
      const r = differentialEvolutionEngine.optimize(fitness, bounds, {
        populationSize: 20, maxGenerations: 500,
      });
      expect(r.success).toBe(true);
    });
  });
});
