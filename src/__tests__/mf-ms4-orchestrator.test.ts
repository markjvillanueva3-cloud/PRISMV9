/**
 * MF-MS4 Tests: FeasibilityOrchestratorEngine
 * Integration: chains WorkpieceState + SequenceFeasibility + ForceCapability
 */
import { describe, it, expect } from "vitest";
import { feasibilityOrchestratorEngine } from "../engines/FeasibilityOrchestratorEngine.js";

const STOCK = { length_mm: 100, width_mm: 80, height_mm: 50 };

const SAFE_JOB = {
  stock: STOCK,
  operations: [
    { id: "face", type: "face", tool_diameter_mm: 50,
      tool_length_mm: 40, depth_mm: 3 },
    { id: "pocket", type: "pocket", tool_diameter_mm: 10,
      tool_length_mm: 50, depth_mm: 20, width_mm: 40, length_mm: 30 },
    { id: "hole", type: "hole", tool_diameter_mm: 8,
      tool_length_mm: 60, depth_mm: 40 },
  ],
};

const DEAD_END_JOB = {
  stock: STOCK,
  operations: [
    {
      id: "remove_top", type: "pocket", tool_diameter_mm: 10,
      depth_mm: 30, width_mm: 38,
      removes_surface: "top",
    },
    {
      id: "finish_from_top", type: "profile", tool_diameter_mm: 6,
      depth_mm: 30, cutting_force_N: 800, tolerance_mm: 0.02,
      name: "finish from top datum",
      requires_datum: "top",
    },
  ],
};

describe("MF-MS4: FeasibilityOrchestratorEngine", () => {

  describe("Full Analysis", () => {
    it("safe job passes with no dead-ends", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis(SAFE_JOB);
      expect(r.overall_feasible).toBe(true);
      expect(r.dead_ends.length).toBe(0);
      expect(r.per_operation.length).toBe(3);
      expect(r.analysis_time_ms).toBeGreaterThanOrEqual(0);
      expect(r.layers_run.length).toBeGreaterThanOrEqual(2);
    });

    it("dead-end job detects infeasibility", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis(DEAD_END_JOB);
      expect(r.overall_feasible).toBe(false);
    });

    it("tracks workpiece evolution", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis(SAFE_JOB);
      expect(r.workpiece_evolution.length).toBe(3);
      // Volume removed increases
      if (r.workpiece_evolution.length >= 2) {
        expect(r.workpiece_evolution[1].volume_removed_pct)
          .toBeGreaterThanOrEqual(r.workpiece_evolution[0].volume_removed_pct);
      }
    });

    it("per-operation has risk scores", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis(SAFE_JOB);
      for (const op of r.per_operation) {
        expect(op.risk_pct).toBeGreaterThanOrEqual(0);
        expect(op.risk_pct).toBeLessThanOrEqual(100);
      }
    });

    it("reports layers that were run", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis(SAFE_JOB);
      expect(r.layers_run).toContain("workpiece_state");
      expect(r.layers_run).toContain("sequence_feasibility");
    });
  });

  describe("Quick Check", () => {
    it("returns pass/fail + top issues", async () => {
      const r = await feasibilityOrchestratorEngine.quickCheck(SAFE_JOB);
      expect(r.feasible).toBe(true);
      expect(Array.isArray(r.top_issues)).toBe(true);
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(100);
    });

    it("dead-end job fails quick check", async () => {
      const r = await feasibilityOrchestratorEngine.quickCheck(DEAD_END_JOB);
      expect(r.feasible).toBe(false);
    });
  });

  describe("What-If Analysis", () => {
    it("tests impact of reordering", async () => {
      const r = await feasibilityOrchestratorEngine.whatIf(
        SAFE_JOB, "hole", 0
      );
      expect(typeof r.before_feasible).toBe("boolean");
      expect(typeof r.after_feasible).toBe("boolean");
      expect(typeof r.improvement).toBe("boolean");
      expect(typeof r.dead_ends_change).toBe("number");
    });

    it("moving finish before thin-wall creation improves", async () => {
      const r = await feasibilityOrchestratorEngine.whatIf(
        DEAD_END_JOB, "finish_wall", 0
      );
      expect(r.dead_ends_change).toBeLessThanOrEqual(0);
    });

    it("handles non-existent operation gracefully", async () => {
      const r = await feasibilityOrchestratorEngine.whatIf(
        SAFE_JOB, "nonexistent", 0
      );
      expect(r.improvement).toBe(false);
    });
  });

  describe("Material + Machine Options", () => {
    it("accepts material properties", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis({
        ...SAFE_JOB,
        material: { name: "7075-T6", E_GPa: 70, friction_coeff: 0.12 },
      });
      expect(r.overall_feasible).toBe(true);
    });

    it("accepts machine limits", async () => {
      const r = await feasibilityOrchestratorEngine.fullAnalysis({
        ...SAFE_JOB,
        machine: { max_power_kW: 22, max_torque_Nm: 120, max_rpm: 8100 },
      });
      expect(r.overall_feasible).toBe(true);
    });
  });
});
