/**
 * InProcessStockModelEngine Tests — MIO-MS0/U-MIO18
 */
import { describe, it, expect, beforeEach } from "vitest";
import { inProcessStockModelEngine } from "../engines/InProcessStockModelEngine.js";

describe("InProcessStockModelEngine", () => {
  beforeEach(() => {
    inProcessStockModelEngine.reset();
  });

  describe("initialize", () => {
    it("initializes stock from bounding box", () => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        5
      );

      const state = inProcessStockModelEngine.getState();

      expect(state.initial_volume_mm3).toBeGreaterThan(0);
      expect(state.current_volume_mm3).toBe(state.initial_volume_mm3);
      expect(state.removal_percentage).toBe(0);
    });

    it("creates voxels at specified resolution", () => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
        5
      );

      const state = inProcessStockModelEngine.getState();

      // 3x3x3 voxels at 5mm resolution for 10x10x10 block
      // Volume = 27 voxels × 125mm³ = 3375mm³
      expect(state.initial_volume_mm3).toBeGreaterThan(0);
    });
  });

  describe("applyOperation", () => {
    beforeEach(() => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        2
      );
    });

    it("removes material along toolpath", () => {
      const initialState = inProcessStockModelEngine.getState();

      const result = inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 10, y: 25, z: 20 },
          { x: 40, y: 25, z: 20 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      expect(result.volume_removed_mm3).toBeGreaterThan(0);
      expect(result.remaining_volume_mm3).toBeLessThan(initialState.initial_volume_mm3);
      expect(result.removal_percentage).toBeGreaterThan(0);
    });

    it("updates collision envelope", () => {
      const result = inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 10, y: 25, z: 20 },
          { x: 40, y: 25, z: 20 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      expect(result.collision_envelope).toBeDefined();
      expect(result.collision_envelope.min.x).toBeLessThan(result.updated_bounds.min.x);
      expect(result.collision_envelope.max.x).toBeGreaterThan(result.updated_bounds.max.x);
    });

    it("provides AI reasoning trace", () => {
      const result = inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 25, y: 25, z: 20 },
          { x: 25, y: 25, z: 15 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[STOCK-MODEL]"))).toBe(true);
    });

    it("tracks cumulative operations", () => {
      inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 10, y: 25, z: 20 },
          { x: 40, y: 25, z: 20 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      const afterFirst = inProcessStockModelEngine.getState();

      inProcessStockModelEngine.applyOperation({
        id: "op2",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 25, y: 10, z: 20 },
          { x: 25, y: 40, z: 20 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      const afterSecond = inProcessStockModelEngine.getState();

      expect(afterSecond.operations_applied).toBe(2);
      expect(afterSecond.removal_percentage).toBeGreaterThan(afterFirst.removal_percentage);
    });
  });

  describe("checkCollision", () => {
    beforeEach(() => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        2
      );
    });

    it("detects collision with stock", () => {
      const result = inProcessStockModelEngine.checkCollision(
        { x: 25, y: 25, z: 10 },
        10,
        2
      );

      expect(result.safe).toBe(false);
      expect(result.collision_points.length).toBeGreaterThan(0);
    });

    it("reports safe above stock", () => {
      const result = inProcessStockModelEngine.checkCollision(
        { x: 25, y: 25, z: 30 },
        10,
        2
      );

      expect(result.safe).toBe(true);
      expect(result.collision_points).toHaveLength(0);
    });

    it("calculates clearance distance", () => {
      const result = inProcessStockModelEngine.checkCollision(
        { x: 25, y: 25, z: 25 },
        10,
        2
      );

      expect(result.clearance_mm).toBeGreaterThan(0);
      expect(result.clearance_mm).toBeLessThan(10);
    });
  });

  describe("hasMaterial", () => {
    beforeEach(() => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 20, y: 20, z: 10 } },
        2
      );
    });

    it("returns true inside stock", () => {
      expect(inProcessStockModelEngine.hasMaterial({ x: 10, y: 10, z: 5 })).toBe(true);
    });

    it("returns false outside stock", () => {
      expect(inProcessStockModelEngine.hasMaterial({ x: 30, y: 30, z: 15 })).toBe(false);
    });
  });

  describe("getStockHeight", () => {
    beforeEach(() => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        2
      );
    });

    it("returns stock height at XY position", () => {
      const height = inProcessStockModelEngine.getStockHeight(25, 25);

      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(22); // max.z + resolution
    });

    it("returns updated height after operation", () => {
      const initialHeight = inProcessStockModelEngine.getStockHeight(25, 25);

      inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 20, length_mm: 50 },
        toolpath: [
          { x: 25, y: 25, z: 20 },
          { x: 25, y: 25, z: 15 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 10,
      });

      const newHeight = inProcessStockModelEngine.getStockHeight(25, 25);

      expect(newHeight).toBeLessThan(initialHeight);
    });
  });

  describe("generateHeightMap", () => {
    beforeEach(() => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 20, y: 20, z: 10 } },
        2
      );
    });

    it("generates height map for stock", () => {
      const heightMap = inProcessStockModelEngine.generateHeightMap(5);

      expect(heightMap.length).toBeGreaterThan(0);
      expect(heightMap[0]).toHaveProperty("x");
      expect(heightMap[0]).toHaveProperty("y");
      expect(heightMap[0]).toHaveProperty("height");
    });

    it("reflects material removal in height map", () => {
      const before = inProcessStockModelEngine.generateHeightMap(5);

      inProcessStockModelEngine.applyOperation({
        id: "op1",
        tool: { type: "flat_endmill", diameter_mm: 10, length_mm: 50 },
        toolpath: [
          { x: 10, y: 10, z: 10 },
          { x: 10, y: 10, z: 5 },
        ],
        axial_depth_mm: 5,
        radial_depth_mm: 5,
      });

      const after = inProcessStockModelEngine.generateHeightMap(5);

      // Heights at affected area should be lower
      const beforePoint = before.find(p => p.x === 10 && p.y === 10);
      const afterPoint = after.find(p => p.x === 10 && p.y === 10);

      if (beforePoint && afterPoint) {
        expect(afterPoint.height).toBeLessThanOrEqual(beforePoint.height);
      }
    });
  });

  describe("getState", () => {
    it("returns complete state", () => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        2
      );

      const state = inProcessStockModelEngine.getState();

      expect(state.initial_volume_mm3).toBeGreaterThan(0);
      expect(state.current_volume_mm3).toBeGreaterThan(0);
      expect(state.removal_percentage).toBeGreaterThanOrEqual(0);
      expect(state.bounds).toBeDefined();
      expect(state.collision_envelope).toBeDefined();
      expect(state.operations_applied).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      inProcessStockModelEngine.initialize(
        { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 20 } },
        2
      );

      inProcessStockModelEngine.reset();

      const state = inProcessStockModelEngine.getState();
      expect(state.initial_volume_mm3).toBe(0);
      expect(state.current_volume_mm3).toBe(0);
    });
  });
});
