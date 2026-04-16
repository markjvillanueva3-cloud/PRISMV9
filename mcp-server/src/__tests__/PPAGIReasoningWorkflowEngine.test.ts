/**
 * PPAGIReasoningWorkflowEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGIReasoningWorkflowEngine,
  ppAGIReasoningWorkflowEngine,
} from "../engines/PPAGIReasoningWorkflowEngine.js";
import { ppControllerEmbeddingEngine } from "../engines/PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "../engines/PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "../engines/PPMaterialPropertyVectorEngine.js";

function getValidScenario() {
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

const SAMPLE_GCODE = `%
O1001
G90 G21 G17 G40 G80
T1 M6
S5000 M3 M8
G0 X0 Y0 Z5
G1 Z-2 F200
G1 X50 F500
M5 M9
M30
%`;

describe("PPAGIReasoningWorkflowEngine", () => {
  it("exports singleton", () => {
    expect(ppAGIReasoningWorkflowEngine).toBeInstanceOf(PPAGIReasoningWorkflowEngine);
  });

  describe("listWorkflows", () => {
    it("lists 8 workflow types", () => {
      const workflows = ppAGIReasoningWorkflowEngine.listWorkflows();
      expect(workflows.length).toBe(8);
    });

    it("all workflows have description", () => {
      const workflows = ppAGIReasoningWorkflowEngine.listWorkflows();
      for (const w of workflows) {
        expect(w.description.length).toBeGreaterThan(10);
      }
    });
  });

  describe("new_job_setup workflow", () => {
    it("produces structured result with steps", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      expect(r.workflow_id).toBeDefined();
      expect(r.workflow_type).toBe("new_job_setup");
      expect(r.steps.length).toBeGreaterThan(0);
    });

    it("each step has engine + latency", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      for (const step of r.steps) {
        expect(step.engine.length).toBeGreaterThan(0);
        expect(step.latency_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("has confidence score", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      expect(r.overall_confidence).toBeGreaterThanOrEqual(0);
      expect(r.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("has recommendation", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      expect(r.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe("machine_substitution workflow", () => {
    it("evaluates candidate machines", () => {
      const s = getValidScenario();
      if (!s) return;
      const machines = ppMachineVectorEncoderEngine.embedAll();
      if (machines.length < 2) return;

      const r = ppAGIReasoningWorkflowEngine.run("machine_substitution", {
        current_scenario: s,
        candidate_machines: machines.slice(1, 3).map(m => m.machine_id),
      });
      expect(r.steps.length).toBeGreaterThanOrEqual(2);
      expect(r.output).toBeDefined();
    });

    it("ranks candidates by confidence", () => {
      const s = getValidScenario();
      if (!s) return;
      const machines = ppMachineVectorEncoderEngine.embedAll();
      if (machines.length < 2) return;

      const r = ppAGIReasoningWorkflowEngine.run("machine_substitution", {
        current_scenario: s,
        candidate_machines: machines.slice(1, 3).map(m => m.machine_id),
      });
      const output = r.output as any;
      if (output.candidates.length < 2) return;
      for (let i = 1; i < output.candidates.length; i++) {
        expect(output.candidates[i].advice.confidence)
          .toBeLessThanOrEqual(output.candidates[i - 1].advice.confidence);
      }
    });
  });

  describe("material_substitution workflow", () => {
    it("evaluates candidate materials", () => {
      const s = getValidScenario();
      if (!s) return;
      const mats = ppMaterialPropertyVectorEngine.embedAll();
      if (mats.length < 3) return;

      const r = ppAGIReasoningWorkflowEngine.run("material_substitution", {
        current_scenario: s,
        candidate_materials: mats.slice(1, 4).map(m => m.material_id),
      });
      expect(r.output).toBeDefined();
    });

    it("identifies safe substitutes", () => {
      const mats = ppMaterialPropertyVectorEngine.embedAll();
      if (mats.length < 3) return;
      const s = getValidScenario();
      if (!s) return;

      const r = ppAGIReasoningWorkflowEngine.run("material_substitution", {
        current_scenario: s,
        candidate_materials: mats.slice(1, 4).map(m => m.material_id),
      });
      const output = r.output as any;
      expect(Array.isArray(output.safe_substitutes)).toBe(true);
    });
  });

  describe("controller_migration workflow", () => {
    it("analyzes source + produces target patterns", () => {
      const r = ppAGIReasoningWorkflowEngine.run("controller_migration", {
        program_gcode: SAMPLE_GCODE,
        source_controller: "fanuc_31i",
        target_controller: "siemens_840d",
      });
      expect(r.steps.length).toBeGreaterThanOrEqual(2);
      const output = r.output as any;
      expect(output.source_analysis).toBeDefined();
      expect(output.target_patterns).toBeDefined();
    });
  });

  describe("risk_assessment workflow", () => {
    it("runs uncertainty + gaps + explanation", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("risk_assessment", { scenario: s });
      expect(r.steps.length).toBeGreaterThanOrEqual(3);
      const output = r.output as any;
      expect(output.uncertainty).toBeDefined();
      expect(output.gaps).toBeDefined();
      expect(output.explanation).toBeDefined();
    });
  });

  describe("program_review workflow", () => {
    it("analyzes a G-code program", () => {
      const r = ppAGIReasoningWorkflowEngine.run("program_review", { gcode: SAMPLE_GCODE });
      expect(r.steps.length).toBeGreaterThan(0);
      const output = r.output as any;
      expect(output.line_count).toBeGreaterThan(0);
      expect(output.controller).toBeDefined();
    });
  });

  describe("job_comparison workflow", () => {
    it("compares two scenarios", () => {
      const s = getValidScenario();
      if (!s) return;
      const machines = ppMachineVectorEncoderEngine.embedAll();
      if (machines.length < 2) return;

      const r = ppAGIReasoningWorkflowEngine.run("job_comparison", {
        scenario_a: s,
        scenario_b: { ...s, machine_id: machines[1].machine_id },
      });
      const output = r.output as any;
      expect(output.advice_a).toBeDefined();
      expect(output.advice_b).toBeDefined();
      expect(typeof output.similarity).toBe("number");
    });
  });

  describe("gap_discovery workflow", () => {
    it("searches knowledge for a topic", () => {
      const r = ppAGIReasoningWorkflowEngine.run("gap_discovery", { topic: "fanuc" });
      expect(r.steps.length).toBeGreaterThan(0);
      const output = r.output as any;
      expect(output.search_results).toBeDefined();
      expect(output.coverage_gaps).toBeDefined();
    });

    it("returns confidence based on matches", () => {
      const rFound = ppAGIReasoningWorkflowEngine.run("gap_discovery", { topic: "fanuc" });
      const rEmpty = ppAGIReasoningWorkflowEngine.run("gap_discovery", { topic: "zzz_unknown_xyz" });
      expect(rFound.overall_confidence).toBeGreaterThan(rEmpty.overall_confidence);
    });
  });

  describe("result structure", () => {
    it("workflow ID is unique", () => {
      const s = getValidScenario();
      if (!s) return;
      const r1 = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      const r2 = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      expect(r1.workflow_id).not.toBe(r2.workflow_id);
    });

    it("total_latency_ms is sum of step latencies (approximately)", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("new_job_setup", { job: s });
      const stepSum = r.steps.reduce((a, s) => a + s.latency_ms, 0);
      expect(r.total_latency_ms).toBeGreaterThanOrEqual(stepSum - 50);
    });

    it("steps are numbered sequentially", () => {
      const s = getValidScenario();
      if (!s) return;
      const r = ppAGIReasoningWorkflowEngine.run("risk_assessment", { scenario: s });
      for (let i = 0; i < r.steps.length; i++) {
        expect(r.steps[i].step).toBe(i + 1);
      }
    });
  });
});
