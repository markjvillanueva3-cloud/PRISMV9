/**
 * Tests for SequenceFeasibilityEngine (MF-MS2)
 *
 * Coverage:
 *   - simulateSequence: forward simulation with accessibility/workholding/rigidity/datum checks
 *   - detectDeadEnds: dead-end pair detection across constraint types
 *   - resequence: backtracking search for valid orderings
 *   - buildConstraintGraph: directed graph with cycle detection
 *   - calculate(): dispatcher routing
 */

import { describe, it, expect } from "vitest";
import {
  SequenceFeasibilityEngine,
  sequenceFeasibilityEngine,
} from "../engines/SequenceFeasibilityEngine.js";
import type {
  SeqOperation,
  StockDefinition,
  WorkholdingConfig,
  SimulateSequenceInput,
} from "../engines/SequenceFeasibilityEngine.js";

// ── Test Fixtures ──────────────────────────────────────────────────────

const makeStock = (w = 200, h = 200, d = 50): StockDefinition => ({
  bounds: { min_x: 0, max_x: w, min_y: 0, max_y: h, min_z: 0, max_z: d },
  material: "6061-T6",
});

const makeWorkholding = (faces = ["bottom"]): WorkholdingConfig => ({
  clamping_method: "vise",
  clamp_positions: faces.map(face => ({
    face,
    area_mm2: 10000,
    position: { x: 100, y: 100, z: face === "bottom" ? 0 : 50 },
  })),
  friction_coefficient: 0.3,
  clamping_pressure_MPa: 5.0,
});

const makeOp = (overrides: Partial<SeqOperation> & { id: string }): SeqOperation => ({
  type: "pocket",
  position: { x: 100, y: 100, z: 50 },
  dimensions: { width: 40, height: 40, depth: 20 },
  tool: { id: "T1", diameter_mm: 10, length_mm: 50 },
  ...overrides,
});

// ── simulateSequence ───────────────────────────────────────────────────

describe("SequenceFeasibilityEngine", () => {
  describe("simulateSequence", () => {
    it("should pass a simple feasible sequence", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", type: "rough", dimensions: { width: 40, height: 40, depth: 10 } }),
        makeOp({ id: "op2", type: "finish", dimensions: { width: 40, height: 40, depth: 2 } }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.feasible).toBe(true);
      expect(result.pass_count).toBe(2);
      expect(result.fail_count).toBe(0);
      expect(result.per_operation).toHaveLength(2);
    });

    it("should fail when tool is too short for feature depth", () => {
      const ops: SeqOperation[] = [
        makeOp({
          id: "op1",
          dimensions: { width: 40, height: 40, depth: 80 },
          tool: { id: "T1", diameter_mm: 10, length_mm: 50 },
        }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.feasible).toBe(false);
      expect(result.per_operation[0].checks.accessibility.pass).toBe(false);
      expect(result.per_operation[0].checks.accessibility.detail).toContain("Tool length");
    });

    it("should fail when holder diameter exceeds pocket opening", () => {
      const ops: SeqOperation[] = [
        makeOp({
          id: "op1",
          dimensions: { width: 10, height: 10, depth: 20 },
          tool: { id: "T1", diameter_mm: 10, length_mm: 50, holder_diameter_mm: 30 },
        }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.feasible).toBe(false);
      expect(result.per_operation[0].checks.accessibility.pass).toBe(false);
      expect(result.per_operation[0].checks.accessibility.detail).toContain("Holder diameter");
    });

    it("should warn when tool length margin is thin", () => {
      const ops: SeqOperation[] = [
        makeOp({
          id: "op1",
          dimensions: { width: 40, height: 40, depth: 45 },
          tool: { id: "T1", diameter_mm: 10, length_mm: 50 },
        }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      // 50 / 45 = 1.11 < 1.2 => warning
      expect(result.per_operation[0].status).toBe("warning");
      expect(result.per_operation[0].notes.length).toBeGreaterThan(0);
    });

    it("should detect datum unavailability", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", type: "rough", removes_surface: "top" }),
        makeOp({ id: "op2", type: "finish", requires_datum: "top" }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.per_operation[1].checks.datum_available.pass).toBe(false);
      expect(result.per_operation[1].checks.datum_available.detail).toContain("top");
    });

    it("should track created surfaces for datum availability", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", type: "face", creates_surface: "reference_plane" }),
        makeOp({ id: "op2", type: "finish", requires_surface: "reference_plane" }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.per_operation[1].checks.datum_available.pass).toBe(true);
    });

    it("should fail when required surface is not yet created", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", type: "finish", requires_surface: "reference_plane" }),
        makeOp({ id: "op2", type: "face", creates_surface: "reference_plane" }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.per_operation[0].checks.datum_available.pass).toBe(false);
    });

    it("should compute cumulative risk score", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1" }),
        makeOp({ id: "op2" }),
        makeOp({ id: "op3" }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.cumulative_risk).toBeGreaterThanOrEqual(0);
      expect(typeof result.cumulative_risk).toBe("number");
    });

    it("should update workpiece state after full-face operations", () => {
      const stock = makeStock(200, 200, 50);
      const ops: SeqOperation[] = [
        makeOp({
          id: "face_top",
          type: "face",
          position: { x: 100, y: 100, z: 50 },
          dimensions: { width: 300, height: 300, depth: 5 },
        }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock,
        workholding: makeWorkholding(),
      });
      expect(result.workpiece_state_after.max_z).toBe(45);
    });

    it("should detect workholding failure when clamping area is lost", () => {
      // Clamp on top face, then remove most of the top face
      const ops: SeqOperation[] = [
        makeOp({
          id: "op1",
          type: "rough",
          position: { x: 100, y: 100, z: 50 },
          dimensions: { width: 300, height: 300, depth: 45 },
          forces: { cutting_force_N: 5000 },
        }),
      ];
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(["top"]),
      });
      // Removing material from the top face reduces clamping area
      expect(result.per_operation[0].checks.workholding.pass).toBe(false);
    });
  });

  // ── detectDeadEnds ────────────────────────────────────────────────────

  describe("detectDeadEnds", () => {
    it("should detect datum destruction dead-end", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", removes_surface: "top" }),
        makeOp({ id: "op2", requires_datum: "top" }),
      ];
      const result = sequenceFeasibilityEngine.detectDeadEnds({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.dead_end_pairs.length).toBeGreaterThan(0);
      expect(result.dead_end_pairs[0].blocking_op).toBe("op1");
      expect(result.dead_end_pairs[0].blocked_op).toBe("op2");
      expect(result.dead_end_pairs[0].constraint_type).toBe("datum_dependency");
    });

    it("should detect surface removal dead-end", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", removes_surface: "ref_A" }),
        makeOp({ id: "op2", requires_surface: "ref_A" }),
      ];
      const result = sequenceFeasibilityEngine.detectDeadEnds({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      const surfDep = result.dead_end_pairs.find(d => d.constraint_type === "surface_dependency");
      expect(surfDep).toBeDefined();
      expect(surfDep!.blocking_op).toBe("op1");
    });

    it("should report no dead-ends for independent operations", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", position: { x: 30, y: 30, z: 50 } }),
        makeOp({ id: "op2", position: { x: 170, y: 170, z: 50 } }),
      ];
      const result = sequenceFeasibilityEngine.detectDeadEnds({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.dead_end_pairs.length).toBe(0);
    });

    it("should build dependency graph with forward edges", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", creates_surface: "machined_face" }),
        makeOp({ id: "op2", requires_surface: "machined_face" }),
      ];
      const result = sequenceFeasibilityEngine.detectDeadEnds({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      const fwdEdge = result.dependency_graph.edges.find(
        e => e.from === "op1" && e.to === "op2"
      );
      expect(fwdEdge).toBeDefined();
    });

    it("should report total_checked count", () => {
      const ops = [makeOp({ id: "a" }), makeOp({ id: "b" }), makeOp({ id: "c" })];
      const result = sequenceFeasibilityEngine.detectDeadEnds({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      // C(3,2) = 3 pairs
      expect(result.total_checked).toBe(3);
    });
  });

  // ── buildConstraintGraph ──────────────────────────────────────────────

  describe("buildConstraintGraph", () => {
    it("should create surface dependency edges", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", creates_surface: "step_face" }),
        makeOp({ id: "op2", requires_surface: "step_face" }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      const surfEdge = graph.edges.find(e => e.type === "surface_dependency" && e.from === "op1");
      expect(surfEdge).toBeDefined();
      expect(surfEdge!.to).toBe("op2");
      expect(surfEdge!.weight).toBe(10);
    });

    it("should create datum dependency edges", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", creates_surface: "datum_A" }),
        makeOp({ id: "op2", requires_datum: "datum_A" }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      const datumEdge = graph.edges.find(e => e.type === "datum_dependency");
      expect(datumEdge).toBeDefined();
      expect(datumEdge!.from).toBe("op1");
    });

    it("should create type-based ordering for rough before finish on overlapping regions", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "rough1", type: "rough", position: { x: 100, y: 100, z: 50 }, dimensions: { width: 40, height: 40, depth: 20 } }),
        makeOp({ id: "finish1", type: "finish", position: { x: 100, y: 100, z: 50 }, dimensions: { width: 40, height: 40, depth: 2 } }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      const typeEdge = graph.edges.find(e => e.type === "access_dependency" && e.from === "rough1");
      expect(typeEdge).toBeDefined();
      expect(typeEdge!.to).toBe("finish1");
    });

    it("should create tool grouping edges (soft constraint)", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", tool: { id: "T5", diameter_mm: 10, length_mm: 50 } }),
        makeOp({ id: "op2", tool: { id: "T5", diameter_mm: 10, length_mm: 50 } }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      const toolEdge = graph.edges.find(e => e.type === "tool_dependency");
      expect(toolEdge).toBeDefined();
      expect(toolEdge!.weight).toBe(1);
    });

    it("should detect acyclic graph correctly", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", creates_surface: "s1" }),
        makeOp({ id: "op2", requires_surface: "s1", creates_surface: "s2" }),
        makeOp({ id: "op3", requires_surface: "s2" }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      expect(graph.has_cycles).toBe(false);
      expect(graph.topological_order).not.toBeNull();
      // op1 must come before op2, op2 before op3
      const order = graph.topological_order!;
      expect(order.indexOf("op1")).toBeLessThan(order.indexOf("op2"));
      expect(order.indexOf("op2")).toBeLessThan(order.indexOf("op3"));
    });

    it("should detect cycles in constraint graph", () => {
      // A requires surface from B, B requires surface from A => cycle
      const ops: SeqOperation[] = [
        makeOp({ id: "opA", creates_surface: "sA", requires_surface: "sB" }),
        makeOp({ id: "opB", creates_surface: "sB", requires_surface: "sA" }),
      ];
      const graph = sequenceFeasibilityEngine.buildConstraintGraph({ operations: ops });
      expect(graph.has_cycles).toBe(true);
      expect(graph.cycles.length).toBeGreaterThan(0);
      expect(graph.topological_order).toBeNull();
    });
  });

  // ── resequence ────────────────────────────────────────────────────────

  describe("resequence", () => {
    it("should find valid sequence for simple reordering", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", creates_surface: "s1", estimated_time_sec: 60 }),
        makeOp({ id: "op2", requires_surface: "s1", estimated_time_sec: 30 }),
      ];
      const result = sequenceFeasibilityEngine.resequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.valid_sequences.length).toBeGreaterThan(0);
      expect(result.best_sequence).not.toBeNull();
      expect(result.proof_of_infeasibility).toBeNull();
    });

    it("should return infeasibility proof for cyclic constraints", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "opA", creates_surface: "sA", requires_surface: "sB" }),
        makeOp({ id: "opB", creates_surface: "sB", requires_surface: "sA" }),
      ];
      const result = sequenceFeasibilityEngine.resequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.valid_sequences.length).toBe(0);
      expect(result.proof_of_infeasibility).not.toBeNull();
      expect(result.proof_of_infeasibility).toContain("Circular");
    });

    it("should score sequences by tool changes", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", tool: { id: "T1", diameter_mm: 10, length_mm: 50 }, estimated_time_sec: 30 }),
        makeOp({ id: "op2", tool: { id: "T2", diameter_mm: 20, length_mm: 60 }, estimated_time_sec: 30 }),
        makeOp({ id: "op3", tool: { id: "T1", diameter_mm: 10, length_mm: 50 }, estimated_time_sec: 30 }),
      ];
      const result = sequenceFeasibilityEngine.resequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
        max_candidates: 100,
      });
      expect(result.valid_sequences.length).toBeGreaterThan(0);
      // Best sequence should minimize tool changes (group T1 ops together)
      if (result.best_sequence) {
        expect(result.best_sequence.tool_changes).toBeLessThanOrEqual(2);
      }
    });

    it("should respect max_candidates limit", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "a" }),
        makeOp({ id: "b" }),
        makeOp({ id: "c" }),
        makeOp({ id: "d" }),
      ];
      const result = sequenceFeasibilityEngine.resequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
        max_candidates: 5,
      });
      expect(result.total_candidates_evaluated).toBeLessThanOrEqual(5);
    });

    it("should compute improvement percentage", () => {
      const ops: SeqOperation[] = [
        makeOp({ id: "op1", tool: { id: "T1", diameter_mm: 10, length_mm: 50 }, estimated_time_sec: 30 }),
        makeOp({ id: "op2", tool: { id: "T1", diameter_mm: 10, length_mm: 50 }, estimated_time_sec: 30 }),
      ];
      const result = sequenceFeasibilityEngine.resequence({
        operations: ops,
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.improvement_pct).not.toBeNull();
      expect(typeof result.improvement_pct).toBe("number");
    });
  });

  // ── calculate() dispatcher ────────────────────────────────────────────

  describe("calculate", () => {
    it("should route sequence_simulate correctly", () => {
      const result = sequenceFeasibilityEngine.calculate("sequence_simulate", {
        operations: [makeOp({ id: "op1" })],
        stock: makeStock(),
        workholding: makeWorkholding(),
      } as any) as any;
      expect(result.feasible).toBeDefined();
      expect(result.per_operation).toBeDefined();
    });

    it("should route sequence_detect_deadends correctly", () => {
      const result = sequenceFeasibilityEngine.calculate("sequence_detect_deadends", {
        operations: [makeOp({ id: "op1" })],
        stock: makeStock(),
        workholding: makeWorkholding(),
      } as any) as any;
      expect(result.dead_end_pairs).toBeDefined();
      expect(result.total_checked).toBeDefined();
    });

    it("should route sequence_constraint_graph correctly", () => {
      const result = sequenceFeasibilityEngine.calculate("sequence_constraint_graph", {
        operations: [makeOp({ id: "op1" })],
      } as any) as any;
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.has_cycles).toBeDefined();
    });

    it("should route sequence_resequence correctly", () => {
      const result = sequenceFeasibilityEngine.calculate("sequence_resequence", {
        operations: [makeOp({ id: "op1" })],
        stock: makeStock(),
        workholding: makeWorkholding(),
      } as any) as any;
      expect(result.valid_sequences).toBeDefined();
      expect(result.total_candidates_evaluated).toBeDefined();
    });

    it("should return error for unknown action", () => {
      const result = sequenceFeasibilityEngine.calculate("unknown_action", {}) as any;
      expect(result.error).toContain("Unknown action");
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle empty operation list", () => {
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: [],
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.feasible).toBe(true);
      expect(result.pass_count).toBe(0);
      expect(result.per_operation).toHaveLength(0);
    });

    it("should handle single operation", () => {
      const result = sequenceFeasibilityEngine.simulateSequence({
        operations: [makeOp({ id: "solo" })],
        stock: makeStock(),
        workholding: makeWorkholding(),
      });
      expect(result.per_operation).toHaveLength(1);
    });

    it("should export singleton instance", () => {
      expect(sequenceFeasibilityEngine).toBeInstanceOf(SequenceFeasibilityEngine);
      expect(sequenceFeasibilityEngine.version).toBe("1.0.0");
    });
  });
});
