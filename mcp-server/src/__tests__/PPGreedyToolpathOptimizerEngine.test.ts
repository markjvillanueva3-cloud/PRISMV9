/**
 * PPGreedyToolpathOptimizerEngine Tests — PP-DL-MS5
 */
import { describe, it, expect } from "vitest";
import {
  PPGreedyToolpathOptimizerEngine,
  ppGreedyToolpathOptimizerEngine,
  type OptimizationInput,
} from "../engines/PPGreedyToolpathOptimizerEngine.js";

const mildSteelInput: OptimizationInput = {
  tool_diameter_mm: 10,
  tool_flute_count: 4,
  material_kc1_1: 1800,
  material_mc: 0.25,
  spindle_power_kW: 22,
  machine_max_rpm: 12000,
  objective: "balanced",
};

const aluminumInput: OptimizationInput = {
  tool_diameter_mm: 12,
  tool_flute_count: 3,
  material_kc1_1: 700,
  material_mc: 0.25,
  spindle_power_kW: 22,
  machine_max_rpm: 15000,
  objective: "max_mrr",
};

describe("PPGreedyToolpathOptimizerEngine", () => {
  it("exports singleton", () => {
    expect(ppGreedyToolpathOptimizerEngine).toBeInstanceOf(PPGreedyToolpathOptimizerEngine);
  });

  describe("optimize — mild steel balanced", () => {
    it("returns valid optimal parameters", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.optimal.spindle_speed_rpm).toBeGreaterThan(0);
      expect(r.optimal.feed_rate_mm_min).toBeGreaterThan(0);
      expect(r.optimal.depth_of_cut_mm).toBeGreaterThan(0);
      expect(r.optimal.width_of_cut_mm).toBeGreaterThan(0);
    });

    it("produces positive MRR", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.mrr_cm3_min).toBeGreaterThan(0);
    });

    it("is physics safe", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.physics_safe).toBe(true);
    });

    it("has positive objective score", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.objective_score).toBeGreaterThan(0);
    });

    it("records optimization steps", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.steps.length).toBeGreaterThan(0);
    });

    it("converges", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(["converged", "max_iterations"]).toContain(r.convergence_reason);
    });

    it("RPM within machine limit", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(r.optimal.spindle_speed_rpm).toBeLessThanOrEqual(mildSteelInput.machine_max_rpm);
    });
  });

  describe("optimize — aluminum max MRR", () => {
    it("achieves higher MRR than steel", () => {
      const steelR = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      const alumR = ppGreedyToolpathOptimizerEngine.optimize(aluminumInput);
      expect(alumR.mrr_cm3_min).toBeGreaterThan(steelR.mrr_cm3_min);
    });

    it("uses higher speeds for aluminum", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(aluminumInput);
      expect(r.optimal.spindle_speed_rpm).toBeGreaterThan(5000);
    });
  });

  describe("optimize — different objectives", () => {
    it("max_mrr produces highest MRR", () => {
      const maxMRR = ppGreedyToolpathOptimizerEngine.optimize({ ...mildSteelInput, objective: "max_mrr" });
      const bestFinish = ppGreedyToolpathOptimizerEngine.optimize({ ...mildSteelInput, objective: "best_finish" });
      expect(maxMRR.mrr_cm3_min).toBeGreaterThanOrEqual(bestFinish.mrr_cm3_min);
    });

    it("best_finish uses lower chip load", () => {
      const finish = ppGreedyToolpathOptimizerEngine.optimize({ ...mildSteelInput, objective: "best_finish" });
      // Feed per tooth should be low
      const fz = finish.optimal.feed_rate_mm_min / (finish.optimal.spindle_speed_rpm * mildSteelInput.tool_flute_count);
      expect(fz).toBeLessThan(0.15);
    });
  });

  describe("quickOptimize", () => {
    it("completes quickly with fewer iterations", () => {
      const start = Date.now();
      const r = ppGreedyToolpathOptimizerEngine.quickOptimize(mildSteelInput);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(r.optimal.spindle_speed_rpm).toBeGreaterThan(0);
    });
  });

  describe("step structure", () => {
    it("steps have required fields", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      for (const s of r.steps) {
        expect(typeof s.iteration).toBe("number");
        expect(s.parameter_changed.length).toBeGreaterThan(0);
        expect(["increase", "decrease"]).toContain(s.direction);
        expect(s.new_value).toBeGreaterThan(0);
        expect(typeof s.objective_value).toBe("number");
        expect(typeof s.safe).toBe("boolean");
      }
    });

    it("limits step history to 20", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput, 50);
      expect(r.steps.length).toBeLessThanOrEqual(20);
    });
  });

  describe("MRR improvement", () => {
    it("reports improvement percentage", () => {
      const r = ppGreedyToolpathOptimizerEngine.optimize(mildSteelInput);
      expect(typeof r.mrr_improvement_pct).toBe("number");
    });
  });
});
