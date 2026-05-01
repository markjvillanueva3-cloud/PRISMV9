/**
 * Batch 20 Engines -- Unit Tests
 * SwarmAlgorithmsEngine + VoxelStockEngine
 * @milestone AUDIT-FT-B20
 */
import { describe, it, expect } from "vitest";
import { swarmAlgorithmsEngine } from "../engines/SwarmAlgorithmsEngine.js";
import { voxelStockEngine } from "../engines/VoxelStockEngine.js";

// ============================================================================
// SwarmAlgorithmsEngine — PSO
// ============================================================================

describe("SwarmAlgorithmsEngine — PSO", () => {
  const bounds = [{ min: -10, max: 10 }, { min: -10, max: 10 }];

  describe("initializeSwarm", () => {
    it("creates correct swarm size", () => {
      const swarm = swarmAlgorithmsEngine.initializeSwarm(bounds, 15);
      expect(swarm.length).toBe(15);
    });

    it("particles within bounds", () => {
      const swarm = swarmAlgorithmsEngine.initializeSwarm(bounds, 5);
      for (const p of swarm) {
        expect(p.position[0]).toBeGreaterThanOrEqual(-10);
        expect(p.position[0]).toBeLessThanOrEqual(10);
        expect(p.bestFitness).toBe(-Infinity);
      }
    });
  });

  describe("psoOptimize", () => {
    it("maximizes negative-sphere (finds near origin)", () => {
      const sphere = (pos: number[]) => -(pos[0] ** 2 + pos[1] ** 2);
      const r = swarmAlgorithmsEngine.psoOptimize(sphere, bounds, {
        swarmSize: 20, maxIterations: 50,
      });
      expect(r.success).toBe(true);
      expect(r.bestFitness).toBeGreaterThan(-5);
      expect(r.fitnessHistory.length).toBe(50);
    });

    it("fitness improves over iterations", () => {
      const sphere = (pos: number[]) => -(pos[0] ** 2 + pos[1] ** 2);
      const r = swarmAlgorithmsEngine.psoOptimize(sphere, bounds, {
        swarmSize: 20, maxIterations: 30,
      });
      expect(r.fitnessHistory[r.fitnessHistory.length - 1])
        .toBeGreaterThanOrEqual(r.fitnessHistory[0]);
    });
  });
});

// ============================================================================
// SwarmAlgorithmsEngine — ACO
// ============================================================================

describe("SwarmAlgorithmsEngine — ACO", () => {
  describe("buildCostMatrix", () => {
    it("creates NxN matrix with zero diagonal", () => {
      const ops = [
        { toolId: "T1", startX: 0, endX: 10 },
        { toolId: "T2", startX: 10, endX: 20 },
        { toolId: "T1", startX: 20, endX: 30 },
      ];
      const costs = swarmAlgorithmsEngine.buildCostMatrix(ops, 30, 10000);
      expect(costs.length).toBe(3);
      expect(costs[0][0]).toBe(0);
      expect(costs[0][1]).toBeGreaterThan(0); // tool change + distance
    });

    it("adds fixture change cost", () => {
      const ops = [
        { toolId: "T1", fixtureId: "F1" },
        { toolId: "T1", fixtureId: "F2" },
      ];
      const costs = swarmAlgorithmsEngine.buildCostMatrix(ops, 30);
      expect(costs[0][1]).toBeGreaterThanOrEqual(60); // fixture change
    });
  });

  describe("acoOptimize", () => {
    it("optimizes a small sequence", () => {
      const costs = [
        [0, 10, 50],
        [10, 0, 10],
        [50, 10, 0],
      ];
      const r = swarmAlgorithmsEngine.acoOptimize(costs, {
        numAnts: 10, maxIterations: 20,
      });
      expect(r.success).toBe(true);
      expect(r.sequence.length).toBe(3);
      expect(r.totalCost).toBeGreaterThan(0);
      expect(new Set(r.sequence).size).toBe(3); // all nodes visited
    });

    it("handles single node", () => {
      const r = swarmAlgorithmsEngine.acoOptimize([[0]]);
      expect(r.sequence).toEqual([0]);
      expect(r.totalCost).toBe(0);
    });

    it("calculates improvement stats", () => {
      const costs = [
        [0, 5, 100],
        [5, 0, 5],
        [100, 5, 0],
      ];
      const r = swarmAlgorithmsEngine.acoOptimize(costs, {
        numAnts: 15, maxIterations: 30,
      });
      expect(r.improvement.originalCost).toBeGreaterThan(0);
      expect(r.improvement.improvementPercent).toMatch(/%$/);
    });
  });

  describe("pathCost", () => {
    it("sums edge costs along path", () => {
      const costs = [[0, 3, 7], [3, 0, 2], [7, 2, 0]];
      expect(swarmAlgorithmsEngine.pathCost([0, 1, 2], costs)).toBe(5);
      expect(swarmAlgorithmsEngine.pathCost([0, 2, 1], costs)).toBe(9);
    });
  });
});

// ============================================================================
// VoxelStockEngine
// ============================================================================

describe("VoxelStockEngine", () => {
  describe("initializeFromBox", () => {
    it("creates grid with correct dimensions", () => {
      const { grid, result } = voxelStockEngine.initializeFromBox(0, 0, 0, 10, 10, 10, 1);
      expect(result.success).toBe(true);
      expect(grid.sizeX).toBe(10);
      expect(grid.sizeY).toBe(10);
      expect(grid.sizeZ).toBe(10);
      expect(result.voxelCount).toBe(1000);
    });

    it("auto-adjusts resolution for large volumes", () => {
      const { result } = voxelStockEngine.initializeFromBox(0, 0, 0, 1000, 1000, 1000, 0.1);
      // Would be 10^12 voxels at 0.1 res — must auto-scale
      expect(result.voxelCount).toBeLessThanOrEqual(10_000_000);
      expect(result.resolution).toBeGreaterThan(0.1);
    });
  });

  describe("getToolEnvelope", () => {
    it("endmill envelope", () => {
      const e = voxelStockEngine.getToolEnvelope({ type: "endmill", diameter: 10, cuttingLength: 20 });
      expect(e.radius).toBe(5);
      expect(e.minZ).toBe(0);
      expect(e.maxZ).toBe(20);
    });

    it("ballnose envelope", () => {
      const e = voxelStockEngine.getToolEnvelope({ type: "ballnose", diameter: 10, cuttingLength: 20 });
      expect(e.radius).toBe(5);
      expect(e.minZ).toBe(-5);
    });
  });

  describe("isInsideTool", () => {
    it("point inside endmill", () => {
      const tool = { type: "endmill" as const, diameter: 10, cuttingLength: 20 };
      expect(voxelStockEngine.isInsideTool(0, 0, 10, tool)).toBe(true);
      expect(voxelStockEngine.isInsideTool(0, 0, -1, tool)).toBe(false);
      expect(voxelStockEngine.isInsideTool(6, 0, 5, tool)).toBe(false); // outside radius
    });

    it("point in ball portion of ballnose", () => {
      const tool = { type: "ballnose" as const, diameter: 10, cuttingLength: 20 };
      expect(voxelStockEngine.isInsideTool(0, 0, -3, tool)).toBe(true); // inside ball
      expect(voxelStockEngine.isInsideTool(0, 0, -6, tool)).toBe(false); // below ball
    });
  });

  describe("removeMaterial", () => {
    it("removes voxels under tool", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 10, 10, 10, 1);
      const tool = { type: "endmill" as const, diameter: 4, cuttingLength: 5 };
      const r = voxelStockEngine.removeMaterial(grid, { x: 5, y: 5, z: 0 }, tool);
      expect(r.voxelsRemoved).toBeGreaterThan(0);
    });
  });

  describe("removeAlongPath", () => {
    it("removes material along straight line", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 20, 10, 5, 1);
      const tool = { type: "endmill" as const, diameter: 4, cuttingLength: 3 };
      const path = [{ x: 2, y: 5, z: 0 }, { x: 18, y: 5, z: 0 }];
      const r = voxelStockEngine.removeAlongPath(grid, path, tool);
      expect(r.totalVoxelsRemoved).toBeGreaterThan(0);
      expect(r.remainingVolume).toBeLessThan(20 * 10 * 5);
    });
  });

  describe("isPointInStock", () => {
    it("returns true for solid, false for removed/outside", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 10, 10, 10, 1);
      expect(voxelStockEngine.isPointInStock(grid, 5, 5, 5)).toBe(true);
      expect(voxelStockEngine.isPointInStock(grid, -1, 5, 5)).toBe(false);
    });
  });

  describe("getStatistics", () => {
    it("reports correct initial stats", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 5, 5, 5, 1);
      const stats = voxelStockEngine.getStatistics(grid);
      expect(stats.solidVoxels).toBe(125);
      expect(stats.removedVoxels).toBe(0);
      expect(stats.removalPercentage).toBe(0);
    });

    it("updates after removal", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 10, 10, 10, 1);
      voxelStockEngine.removeMaterial(grid, { x: 5, y: 5, z: 0 }, { type: "endmill", diameter: 6, cuttingLength: 5 });
      const stats = voxelStockEngine.getStatistics(grid);
      expect(stats.removedVoxels).toBeGreaterThan(0);
      expect(stats.removalPercentage).toBeGreaterThan(0);
    });
  });

  describe("getSurfaceVoxels", () => {
    it("all voxels are surface in small cube", () => {
      const { grid } = voxelStockEngine.initializeFromBox(0, 0, 0, 3, 3, 3, 1);
      const surface = voxelStockEngine.getSurfaceVoxels(grid);
      // 3x3x3 = 27 voxels, only 1x1x1=1 interior voxel
      expect(surface.length).toBe(26);
    });
  });
});
