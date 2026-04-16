/**
 * PPJobScenarioAdvisorEngine Tests — Unified PP-AGI Advisor
 */
import { describe, it, expect } from "vitest";
import {
  PPJobScenarioAdvisorEngine,
  ppJobScenarioAdvisorEngine,
  type JobSpec,
} from "../engines/PPJobScenarioAdvisorEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

function validJob(): JobSpec | null {
  const c = ppControllerEmbeddingEngine.embedAll();
  const m = ppMachineVectorEncoderEngine.embedAll();
  const mat = ppMaterialPropertyVectorEngine.embedAll();
  if (!c.length || !m.length || !mat.length) return null;
  return {
    controller_id: c[0].controller_id,
    machine_id: m[0].machine_id,
    material_id: mat[0].material_id,
  };
}

const unknownJob: JobSpec = {
  controller_id: "totally_unknown_xyz",
  machine_id: "nonexistent_machine",
  material_id: "unobtanium_123",
};

describe("PPJobScenarioAdvisorEngine", () => {
  it("exports singleton", () => {
    expect(ppJobScenarioAdvisorEngine).toBeInstanceOf(PPJobScenarioAdvisorEngine);
  });

  describe("advise - valid job", () => {
    it("returns full advice", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.job_id).toBeDefined();
      expect(advice.confidence).toBeGreaterThanOrEqual(0);
      expect(advice.confidence).toBeLessThanOrEqual(1);
    });

    it("recommendation is one of 4 options", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(["proceed", "verify", "caution", "insufficient_data"]).toContain(advice.recommendation);
    });

    it("includes controller advice with G-code patterns", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.controller_advice.dialect_family).toBeDefined();
      expect(advice.controller_advice.safe_start.length).toBeGreaterThan(0);
      expect(advice.controller_advice.program_header.length).toBeGreaterThan(0);
      expect(advice.controller_advice.tool_change_sequence.length).toBeGreaterThan(0);
    });

    it("includes similar controllers", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.controller_advice.similar_controllers.length).toBeGreaterThan(0);
    });

    it("includes machine advice", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(Array.isArray(advice.machine_advice.compatibility_notes)).toBe(true);
    });

    it("includes material advice", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(typeof advice.material_advice.substitution_safe).toBe("boolean");
      expect(Array.isArray(advice.material_advice.similar_materials)).toBe(true);
    });

    it("includes risk assessment", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(Array.isArray(advice.risks)).toBe(true);
    });

    it("includes explanation with analogies", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.explanation.analogies.length).toBeGreaterThan(0);
      expect(advice.explanation.risk_narrative.length).toBeGreaterThan(0);
    });

    it("generates next actions", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.next_actions.length).toBeGreaterThan(0);
    });

    it("records to online tracker", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.tracker_id).toBeDefined();
      expect(advice.tracker_id).toMatch(/^pr_/);
    });
  });

  describe("advise - unknown/invalid job", () => {
    it("handles all-unknown gracefully", () => {
      const advice = ppJobScenarioAdvisorEngine.advise(unknownJob);
      expect(advice.confidence).toBeLessThan(0.7);
      expect(advice.risks.length).toBeGreaterThan(0);
    });

    it("queues unknown jobs for review", () => {
      const advice = ppJobScenarioAdvisorEngine.advise(unknownJob);
      // Should queue if confidence < 0.6
      if (advice.confidence < 0.6) {
        expect(advice.queued_for_review).toBeDefined();
      }
    });

    it("recommends against proceeding if confidence very low", () => {
      const advice = ppJobScenarioAdvisorEngine.advise(unknownJob);
      if (advice.recommendation === "insufficient_data") {
        expect(advice.next_actions.some(a => a.includes("DO NOT PROCEED"))).toBe(true);
      }
    });

    it("flags unknown material in advice", () => {
      const ctrls = ppControllerEmbeddingEngine.embedAll();
      const machines = ppMachineVectorEncoderEngine.embedAll();
      if (!ctrls.length || !machines.length) return;

      const advice = ppJobScenarioAdvisorEngine.advise({
        controller_id: ctrls[0].controller_id,
        machine_id: machines[0].machine_id,
        material_id: "unobtanium_xyz",
      });
      expect(advice.material_advice.warnings.some(w => w.includes("not in database"))).toBe(true);
    });
  });

  describe("advise - with toolpath", () => {
    it("returns toolpath recommendations when spec provided", () => {
      const job = validJob();
      if (!job) return;

      const advice = ppJobScenarioAdvisorEngine.advise({
        ...job,
        toolpath: {
          operation_type: "pocket", dimension: "3d", phase: "roughing",
          stepover_ratio: 0.1, doc_ratio: 1.5, adaptive: true,
        },
      });
      expect(advice.toolpath_advice.recommended_strategies.length).toBeGreaterThan(0);
    });

    it("returns empty strategies if no toolpath spec", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      expect(advice.toolpath_advice.recommended_strategies.length).toBe(0);
    });
  });

  describe("advise - with physics + safety", () => {
    it("includes physics risks when spec provided", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise({
        ...job,
        physics: {
          cutting_force_N: 6000, cutting_temperature_C: 900,
          power_kW: 45, spindle_power_limit_kW: 50, chatter_detected: true,
        },
      });
      expect(advice.risks.some(r => r.domain === "physics")).toBe(true);
    });

    it("includes safety risks when spec provided", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise({
        ...job,
        safety: {
          machine_category: "lathe", has_sub_spindle: true, has_turret: true,
          max_tool_overhang_mm: 100, tool_diameter_mm: 10,
        },
      });
      expect(advice.risks.some(r => r.domain === "safety")).toBe(true);
    });
  });

  describe("recordOutcome", () => {
    it("records feedback for tracked job", () => {
      const job = validJob();
      if (!job) return;
      const advice = ppJobScenarioAdvisorEngine.advise(job);
      const success = ppJobScenarioAdvisorEngine.recordOutcome(
        advice.tracker_id,
        "matched_prediction",
        0,
        "test completed successfully",
      );
      expect(success).toBe(true);
    });

    it("returns false for unknown tracker ID", () => {
      const success = ppJobScenarioAdvisorEngine.recordOutcome("nonexistent", "foo");
      expect(success).toBe(false);
    });
  });
});
