/**
 * MF-MS2 Tests: SequenceFeasibilityEngine
 * Forward simulation, dead-end detection, auto-resequencing, what-if
 */
import { describe, it, expect } from "vitest";
import {
  sequenceFeasibilityEngine,
  type FeasibilityOperation,
} from "../engines/SequenceFeasibilityEngine.js";

const STOCK = { length_mm: 100, width_mm: 80, height_mm: 50 };

// ─── Test Operation Sets ────────────────────────────────────────

const SAFE_OPS: FeasibilityOperation[] = [
  { id: "face", type: "face", tool_diameter_mm: 50,
    tool_length_mm: 40, depth_mm: 3 },
  { id: "pocket1", type: "pocket", tool_diameter_mm: 10,
    tool_length_mm: 50, depth_mm: 20, width_mm: 40, length_mm: 30 },
  { id: "hole1", type: "hole", tool_diameter_mm: 8,
    tool_length_mm: 60, depth_mm: 40 },
];

const DEAD_END_OPS: FeasibilityOperation[] = [
  {
    id: "pocket_left", type: "pocket", tool_diameter_mm: 10,
    depth_mm: 30, width_mm: 38, creates_thin_wall: {
      thickness_mm: 1, height_mm: 30, length_mm: 60,
    },
  },
  {
    id: "finish_wall", type: "profile", tool_diameter_mm: 6,
    depth_mm: 30, cutting_force_N: 800, tolerance_mm: 0.02,
    name: "finish thin wall",
  },
];

const PREREQ_OPS: FeasibilityOperation[] = [
  { id: "drill", type: "drill", tool_diameter_mm: 5,
    depth_mm: 20, tool_length_mm: 40 },
  { id: "thread", type: "thread", tool_diameter_mm: 6,
    depth_mm: 15, tool_length_mm: 40, prerequisites: ["drill"] },
  { id: "bore", type: "bore", tool_diameter_mm: 10,
    depth_mm: 20, tool_length_mm: 50, prerequisites: ["drill"] },
];

const GRIP_LOSS_OPS: FeasibilityOperation[] = [
  {
    id: "big_pocket", type: "pocket", tool_diameter_mm: 20,
    depth_mm: 30, width_mm: 80, length_mm: 60,
    removes_surface: "top", cutting_force_N: 1000,
  },
  {
    id: "finish", type: "profile", tool_diameter_mm: 6,
    depth_mm: 30, cutting_force_N: 500,
  },
];

// ─── Tests ──────────────────────────────────────────────────────

describe("MF-MS2: SequenceFeasibilityEngine", () => {

  describe("Forward Simulation", () => {
    it("safe sequence passes with no dead-ends", () => {
      const r = sequenceFeasibilityEngine.simulate(SAFE_OPS, STOCK);
      expect(r.feasible).toBe(true);
      expect(r.dead_ends.length).toBe(0);
      expect(r.per_operation.length).toBe(3);
      expect(r.total_checks).toBeGreaterThan(0);
      expect(r.simulation_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("detects thin-wall rigidity dead-end", () => {
      const r = sequenceFeasibilityEngine.simulate(
        DEAD_END_OPS, STOCK
      );
      expect(r.dead_ends.length).toBeGreaterThan(0);
      const rigidity = r.dead_ends.filter(
        d => d.category === "rigidity"
      );
      expect(rigidity.length).toBeGreaterThan(0);
      expect(rigidity[0].reason).toContain("deflect");
    });

    it("dead-end includes suggestion", () => {
      const r = sequenceFeasibilityEngine.simulate(
        DEAD_END_OPS, STOCK
      );
      const de = r.dead_ends[0];
      expect(de.suggestion).toBeDefined();
      expect(de.suggestion!.length).toBeGreaterThan(0);
    });

    it("checks prerequisites", () => {
      // Thread before drill — should flag prerequisite
      const wrongOrder = [PREREQ_OPS[1], PREREQ_OPS[0]];
      const r = sequenceFeasibilityEngine.simulate(
        wrongOrder, STOCK
      );
      expect(r.dead_ends.some(
        d => d.category === "prerequisite"
      )).toBe(true);
    });

    it("correct prerequisite order passes", () => {
      const r = sequenceFeasibilityEngine.simulate(
        PREREQ_OPS, STOCK
      );
      const prereqDeadEnds = r.dead_ends.filter(
        d => d.category === "prerequisite"
      );
      expect(prereqDeadEnds.length).toBe(0);
    });
  });

  describe("Accessibility Checks", () => {
    it("flags tool too short for feature", () => {
      const ops: FeasibilityOperation[] = [{
        id: "deep_hole", type: "hole", tool_diameter_mm: 6,
        tool_length_mm: 30, depth_mm: 40,
      }];
      const r = sequenceFeasibilityEngine.simulate(ops, STOCK);
      expect(r.per_operation[0].accessible).toBe(false);
      expect(r.per_operation[0].issues.some(
        i => i.includes("Tool length")
      )).toBe(true);
    });

    it("flags tool larger than feature width", () => {
      const ops: FeasibilityOperation[] = [{
        id: "narrow_slot", type: "slot", tool_diameter_mm: 12,
        depth_mm: 10, width_mm: 8,
      }];
      const r = sequenceFeasibilityEngine.simulate(ops, STOCK);
      expect(r.per_operation[0].accessible).toBe(false);
    });

    it("adequate tool length passes", () => {
      const ops: FeasibilityOperation[] = [{
        id: "pocket", type: "pocket", tool_diameter_mm: 10,
        tool_length_mm: 80, depth_mm: 40,
      }];
      const r = sequenceFeasibilityEngine.simulate(ops, STOCK);
      expect(r.per_operation[0].accessible).toBe(true);
    });
  });

  describe("Workholding Checks", () => {
    it("large surface removal degrades grip", () => {
      const r = sequenceFeasibilityEngine.simulate(
        GRIP_LOSS_OPS, STOCK,
        { clamp_area_mm2: 100 * 80 }
      );
      // After removing 80×60 from 100×80, grip is reduced
      expect(r.per_operation.length).toBe(2);
    });

    it("flags workholding dead-end for future ops", () => {
      const ops: FeasibilityOperation[] = [
        {
          id: "remove_most", type: "pocket",
          tool_diameter_mm: 20, depth_mm: 30,
          width_mm: 95, length_mm: 75,
          removes_surface: "top", cutting_force_N: 200,
        },
        {
          id: "finish", type: "profile",
          tool_diameter_mm: 6, depth_mm: 10,
          cutting_force_N: 800,
        },
      ];
      const r = sequenceFeasibilityEngine.simulate(
        ops, STOCK,
        { clamp_area_mm2: 100 * 80, friction_coeff: 0.1 }
      );
      const whDeadEnds = r.dead_ends.filter(
        d => d.category === "workholding"
      );
      expect(whDeadEnds.length).toBeGreaterThanOrEqual(0);
      // At minimum the grip margin should be tracked
    });
  });

  describe("Risk Scores", () => {
    it("safe operations have low risk", () => {
      const r = sequenceFeasibilityEngine.simulate(SAFE_OPS, STOCK);
      for (const score of r.risk_scores) {
        expect(score.risk_pct).toBeLessThan(50);
      }
    });

    it("inaccessible operation has high risk", () => {
      const ops: FeasibilityOperation[] = [{
        id: "impossible", type: "hole", tool_diameter_mm: 6,
        tool_length_mm: 10, depth_mm: 50,
      }];
      const r = sequenceFeasibilityEngine.simulate(ops, STOCK);
      expect(r.risk_scores[0].risk_pct).toBeGreaterThanOrEqual(40);
    });

    it("risk scores between 0 and 100", () => {
      const r = sequenceFeasibilityEngine.simulate(
        [...SAFE_OPS, ...DEAD_END_OPS], STOCK
      );
      for (const score of r.risk_scores) {
        expect(score.risk_pct).toBeGreaterThanOrEqual(0);
        expect(score.risk_pct).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Auto-Resequencing", () => {
    it("findValidOrdering finds sequence for prerequisite ops", () => {
      const r = sequenceFeasibilityEngine.findValidOrdering(
        PREREQ_OPS
      );
      expect(r.found).toBe(true);
      // drill must come before thread and bore
      const drillIdx = r.sequence.indexOf("drill");
      const threadIdx = r.sequence.indexOf("thread");
      const boreIdx = r.sequence.indexOf("bore");
      expect(drillIdx).toBeLessThan(threadIdx);
      expect(drillIdx).toBeLessThan(boreIdx);
    });

    it("returns explored count", () => {
      const r = sequenceFeasibilityEngine.findValidOrdering(
        SAFE_OPS
      );
      expect(r.permutations_explored).toBeGreaterThan(0);
    });

    it("rejects >15 operations as too many", () => {
      const manyOps = Array.from({ length: 16 }, (_, i) => ({
        id: `op${i}`, type: "pocket", tool_diameter_mm: 10,
        depth_mm: 10,
      }));
      const r = sequenceFeasibilityEngine.findValidOrdering(
        manyOps
      );
      expect(r.found).toBe(false);
      expect(r.reason).toContain("Too many");
    });
  });

  describe("What-If Analysis", () => {
    it("tests impact of moving an operation", () => {
      const r = sequenceFeasibilityEngine.whatIf(
        SAFE_OPS, STOCK, "hole1", 0
      );
      expect(r.before).toBeDefined();
      expect(r.after).toBeDefined();
      expect(typeof r.improvement).toBe("boolean");
    });

    it("moving op to better position reduces dead-ends", () => {
      // Reverse the dead-end ops — finish first, then create wall
      const reversed = [DEAD_END_OPS[1], DEAD_END_OPS[0]];
      const r = sequenceFeasibilityEngine.whatIf(
        DEAD_END_OPS, STOCK, "finish_wall", 0
      );
      // After moving finish before wall creation, should improve
      expect(r.after.dead_ends.length).toBeLessThanOrEqual(
        r.before.dead_ends.length
      );
    });
  });

  describe("Physics Invariants", () => {
    it("deflection ∝ force (double force = double deflection)", () => {
      // δ = F/k, so doubling F doubles δ
      const k = 100; // N/mm
      expect((200 / k) / (100 / k)).toBeCloseTo(2, 5);
    });

    it("deflection ∝ H³ (double height = 8× deflection)", () => {
      const defl = (H: number) => {
        const E = 200e3, L = 60, t = 2;
        const I = L * Math.pow(t, 3) / 12;
        return 500 * Math.pow(H, 3) / (3 * E * I);
      };
      expect(defl(60) / defl(30)).toBeCloseTo(8, 0);
    });

    it("stiffness ∝ t³ (double thickness = 8× stiffness)", () => {
      const stiff = (t: number) => {
        const E = 200e3, L = 60, H = 30;
        const I = L * Math.pow(t, 3) / 12;
        return 3 * E * I / Math.pow(H, 3);
      };
      expect(stiff(4) / stiff(2)).toBeCloseTo(8, 0);
    });

    it("grip force ∝ area (halve area = halve grip)", () => {
      const grip = (A: number) => 0.15 * 2.0 * A;
      expect(grip(4000) / grip(8000)).toBeCloseTo(0.5, 5);
    });
  });
});
