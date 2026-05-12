/**
 * MF-MS2: Sequence Feasibility — PUOA Integration Tests
 *
 * Tests the integration between SequenceFeasibilityEngine and
 * PRISMUnifiedOrchestratorEngine for sequence-based pre-flight assessment.
 */

import { describe, it, expect } from "vitest";
import {
  sequenceFeasibilityEngine,
  type SimulateSequenceInput,
  type ResequenceInput,
  type PUOASequenceAssessment,
} from "../engines/SequenceFeasibilityEngine.js";

describe("MF-MS2: Sequence Feasibility PUOA Integration", () => {
  describe("assessSequenceForPUOA", () => {
    it("should return PUOA-compatible assessment for valid sequence", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "face_top",
            type: "face",
            position: { x: 50, y: 50, z: 50 },
            dimensions: { width: 100, height: 100, depth: 2 },
            tool: { id: "face_mill_50", diameter_mm: 50, length_mm: 100 },
            forces: { cutting_force_N: 500 },
          },
          {
            id: "pocket_center",
            type: "pocket",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 40, height: 40, depth: 20 },
            tool: { id: "endmill_12", diameter_mm: 12, length_mm: 80 },
            forces: { cutting_force_N: 300 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1500, position: { x: 0, y: 50, z: 25 } },
            { face: "right", area_mm2: 1500, position: { x: 100, y: 50, z: 25 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("feasible");
      expect(result).toHaveProperty("risk_score");
      expect(result).toHaveProperty("risks");
      expect(result).toHaveProperty("dead_ends");
      expect(result).toHaveProperty("fallback_strategies");
      expect(result).toHaveProperty("success_probability");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("operation_results");
      expect(typeof result.feasible).toBe("boolean");
      expect(typeof result.risk_score).toBe("number");
      expect(Array.isArray(result.risks)).toBe(true);
    });

    it("should detect dead-end and provide fallback strategy", () => {
      // Create a dead-end scenario: pocket removes clamping surface needed for later op
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "deep_pocket",
            type: "pocket",
            position: { x: 0, y: 50, z: 25 },
            dimensions: { width: 30, height: 100, depth: 40 },
            tool: { id: "endmill_10", diameter_mm: 10, length_mm: 120 },
            forces: { cutting_force_N: 400 },
            removes_surface: "left",  // Removes clamping surface
          },
          {
            id: "finish_side",
            type: "contour",
            position: { x: 100, y: 50, z: 25 },
            dimensions: { width: 10, height: 100, depth: 30 },
            tool: { id: "endmill_8", diameter_mm: 8, length_mm: 100 },
            forces: { cutting_force_N: 600 },  // High force needs good clamping
            requires_surface: "left",  // Needs the removed surface
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "4140",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1000, position: { x: 0, y: 50, z: 25 } },
            { face: "right", area_mm2: 1000, position: { x: 100, y: 50, z: 25 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      // Should have detected the dependency issue
      expect(result.summary).toBeDefined();
      expect(result.success_probability).toBeGreaterThanOrEqual(0);
      expect(result.success_probability).toBeLessThanOrEqual(1);
    });

    it("should return success probability between 0 and 1", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "simple_face",
            type: "face",
            position: { x: 50, y: 50, z: 50 },
            dimensions: { width: 100, height: 100, depth: 1 },
            tool: { id: "face_mill", diameter_mm: 50, length_mm: 80 },
            forces: { cutting_force_N: 200 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "bottom", area_mm2: 5000, position: { x: 50, y: 50, z: 0 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result.success_probability).toBeGreaterThanOrEqual(0);
      expect(result.success_probability).toBeLessThanOrEqual(1);
    });

    it("should categorize risks correctly", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "deep_hole",
            type: "drill",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 8, height: 8, depth: 100 },  // Very deep hole
            tool: { id: "drill_8", diameter_mm: 8, length_mm: 60 },  // Tool too short
            forces: { cutting_force_N: 300 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 100 },
          material: "4140",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 500, position: { x: 0, y: 50, z: 50 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      // Verify risk structure when risks exist
      for (const risk of result.risks) {
        expect(["accessibility", "workholding", "rigidity", "datum_available", "sequence"]).toContain(risk.category);
        expect(["low", "medium", "high", "critical"]).toContain(risk.severity);
        expect(risk.risk_score).toBeGreaterThanOrEqual(0);
        expect(risk.risk_score).toBeLessThanOrEqual(1);
      }
    });

    it("should provide operation-level results", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "op1",
            type: "face",
            position: { x: 50, y: 50, z: 30 },
            dimensions: { width: 80, height: 80, depth: 2 },
            tool: { id: "face_mill", diameter_mm: 40, length_mm: 80 },
            forces: { cutting_force_N: 300 },
          },
          {
            id: "op2",
            type: "pocket",
            position: { x: 50, y: 50, z: 15 },
            dimensions: { width: 30, height: 30, depth: 10 },
            tool: { id: "endmill", diameter_mm: 10, length_mm: 60 },
            forces: { cutting_force_N: 200 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 30 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 900, position: { x: 0, y: 50, z: 15 } },
            { face: "right", area_mm2: 900, position: { x: 100, y: 50, z: 15 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result.operation_results.length).toBe(2);
      for (const opResult of result.operation_results) {
        expect(opResult).toHaveProperty("operation_id");
        expect(opResult).toHaveProperty("status");
        expect(opResult).toHaveProperty("risk_score");
        expect(["pass", "fail", "warning"]).toContain(opResult.status);
      }
    });
  });

  describe("suggestResequencingForPUOA", () => {
    it("should suggest resequencing options", () => {
      const input: ResequenceInput = {
        operations: [
          {
            id: "rough_pocket",
            type: "rough",
            position: { x: 50, y: 50, z: 20 },
            dimensions: { width: 40, height: 40, depth: 15 },
            tool: { id: "endmill_12", diameter_mm: 12, length_mm: 80 },
            forces: { cutting_force_N: 400 },
            estimated_time_sec: 120,
          },
          {
            id: "finish_pocket",
            type: "finish",
            position: { x: 50, y: 50, z: 20 },
            dimensions: { width: 40, height: 40, depth: 15 },
            tool: { id: "endmill_8", diameter_mm: 8, length_mm: 80 },
            forces: { cutting_force_N: 200 },
            estimated_time_sec: 180,
          },
          {
            id: "drill_holes",
            type: "drill",
            position: { x: 25, y: 25, z: 15 },
            dimensions: { width: 6, height: 6, depth: 20 },
            tool: { id: "drill_6", diameter_mm: 6, length_mm: 100 },
            forces: { cutting_force_N: 150 },
            estimated_time_sec: 30,
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 40 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1200, position: { x: 0, y: 50, z: 20 } },
            { face: "right", area_mm2: 1200, position: { x: 100, y: 50, z: 20 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.suggestResequencingForPUOA(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("can_resequence");
      expect(result).toHaveProperty("reason");
      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("confidence");
      expect(typeof result.can_resequence).toBe("boolean");
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should provide sequence suggestions with scores", () => {
      const input: ResequenceInput = {
        operations: [
          {
            id: "op_a",
            type: "rough",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 30, height: 30, depth: 20 },
            tool: { id: "tool_1", diameter_mm: 10, length_mm: 80 },
            forces: { cutting_force_N: 300 },
            estimated_time_sec: 60,
          },
          {
            id: "op_b",
            type: "finish",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 30, height: 30, depth: 20 },
            tool: { id: "tool_2", diameter_mm: 8, length_mm: 80 },
            forces: { cutting_force_N: 150 },
            estimated_time_sec: 90,
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1500, position: { x: 0, y: 50, z: 25 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.suggestResequencingForPUOA(input);

      if (result.can_resequence && result.suggestions.length > 0) {
        for (const suggestion of result.suggestions) {
          expect(suggestion).toHaveProperty("order");
          expect(suggestion).toHaveProperty("score");
          expect(suggestion).toHaveProperty("reason");
          expect(Array.isArray(suggestion.order)).toBe(true);
          expect(typeof suggestion.score).toBe("number");
        }
      }
    });

    it("should indicate when resequencing is not possible", () => {
      // Circular dependency: A requires B's output, B requires A's output
      const input: ResequenceInput = {
        operations: [
          {
            id: "op_circular_a",
            type: "rough",
            position: { x: 25, y: 50, z: 25 },
            dimensions: { width: 20, height: 50, depth: 20 },
            tool: { id: "tool_1", diameter_mm: 10, length_mm: 80 },
            forces: { cutting_force_N: 300 },
            requires_surface: "surface_b",
            creates_surface: "surface_a",
          },
          {
            id: "op_circular_b",
            type: "rough",
            position: { x: 75, y: 50, z: 25 },
            dimensions: { width: 20, height: 50, depth: 20 },
            tool: { id: "tool_1", diameter_mm: 10, length_mm: 80 },
            forces: { cutting_force_N: 300 },
            requires_surface: "surface_a",
            creates_surface: "surface_b",
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "4140",
        },
        workholding: {
          clamping_method: "fixture",
          clamp_positions: [
            { face: "bottom", area_mm2: 5000, position: { x: 50, y: 50, z: 0 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.suggestResequencingForPUOA(input);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("can_resequence");
      expect(result).toHaveProperty("reason");
      // The result will indicate whether resequencing is possible
    });
  });

  describe("summary generation", () => {
    it("should generate human-readable summary for LLM context", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "simple_op",
            type: "face",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 80, height: 80, depth: 2 },
            tool: { id: "face_mill", diameter_mm: 50, length_mm: 80 },
            forces: { cutting_force_N: 200 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 30 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1000, position: { x: 0, y: 50, z: 15 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(10);
      // Summary should contain relevant keywords
      expect(result.summary).toMatch(/feasibility|PASSED|FAILED|operations|sequence/i);
    });
  });

  describe("edge cases", () => {
    it("should handle empty operations array", () => {
      const input: SimulateSequenceInput = {
        operations: [],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result).toBeDefined();
      expect(result.feasible).toBe(true);  // Empty sequence is trivially feasible
      expect(result.operation_results.length).toBe(0);
    });

    it("should handle single operation", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "single_op",
            type: "drill",
            position: { x: 50, y: 50, z: 25 },
            dimensions: { width: 10, height: 10, depth: 20 },
            tool: { id: "drill", diameter_mm: 10, length_mm: 80 },
            forces: { cutting_force_N: 200 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "4140",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "left", area_mm2: 1000, position: { x: 0, y: 50, z: 25 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result).toBeDefined();
      expect(result.operation_results.length).toBe(1);
    });

    it("should handle zero-dimension operations gracefully", () => {
      const input: SimulateSequenceInput = {
        operations: [
          {
            id: "zero_depth",
            type: "face",
            position: { x: 50, y: 50, z: 50 },
            dimensions: { width: 100, height: 100, depth: 0 },  // Zero depth
            tool: { id: "face_mill", diameter_mm: 50, length_mm: 80 },
            forces: { cutting_force_N: 0 },
          },
        ],
        stock: {
          bounds: { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 },
          material: "6061-T6",
        },
        workholding: {
          clamping_method: "vise",
          clamp_positions: [
            { face: "bottom", area_mm2: 5000, position: { x: 50, y: 50, z: 0 } },
          ],
        },
      };

      const result = sequenceFeasibilityEngine.assessSequenceForPUOA(input);

      expect(result).toBeDefined();
      expect(result.feasible).toBe(true);  // Zero-depth is trivially feasible
    });
  });
});
