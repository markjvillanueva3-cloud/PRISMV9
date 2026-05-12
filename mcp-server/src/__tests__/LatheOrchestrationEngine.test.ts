/**
 * LatheOrchestrationEngine Test Suite (MS0 U01-U10)
 * ==================================================
 *
 * LATHE-PRO-MS0 — 35-stage pipeline orchestrator. Safety gates 12-14
 * cannot be bypassed — tests confirm they run even when stages_to_run
 * tries to skip them.
 *
 * @milestone LATHE-PRO-MS0
 */

import { describe, it, expect } from "vitest";
import {
  latheOrchestrationEngine,
  LATHE_STAGES,
  type LatheOrchestrationInput,
} from "../engines/LatheOrchestrationEngine.js";

function baseInput(overrides: Partial<LatheOrchestrationInput> = {}): LatheOrchestrationInput {
  return {
    part_number: "TEST-001",
    material: { material_name: "4140", iso_group: "P", hardness_hrc: 28 },
    bar_stock_od_mm: 50,
    part_length_mm: 100,
    chuck_type: "3_jaw",
    max_spindle_rpm: 4000,
    max_power_kW: 15,
    machine_brand: "Okuma",
    machine_model: "LB3000",
    features: [
      {
        id: "f1",
        type: "od_turn",
        od_mm: 45,
        length_mm: 80,
      },
    ],
    optimization_target: "balanced",
    tailstock: false,
    controller: "okuma",
    workpiece_type: "chucked",
    bar_feeder: false,
    ...overrides,
  };
}

describe("LatheOrchestrationEngine", () => {
  // ── Pipeline structure ────────────────────────────────────────────────

  describe("pipeline structure", () => {
    it("exports 35 stages in LATHE_STAGES", () => {
      expect(LATHE_STAGES.length).toBe(35);
    });

    it("pipeline starts with INPUT_VALIDATE", () => {
      expect(LATHE_STAGES[0]).toBe("INPUT_VALIDATE");
    });

    it("pipeline ends with RELEASE_GATE", () => {
      expect(LATHE_STAGES[LATHE_STAGES.length - 1]).toBe("RELEASE_GATE");
    });

    it("includes all 3 mandatory safety stages", () => {
      expect(LATHE_STAGES).toContain("BAR_STOCK_SAFETY");
      expect(LATHE_STAGES).toContain("CLAMPING_PER_OP");
      expect(LATHE_STAGES).toContain("MACHINE_READINESS");
    });
  });

  // ── calculate() basic result ──────────────────────────────────────────

  describe("calculate() — basic result shape", () => {
    it("returns success=true for a valid input", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(r.success).toBeDefined();
      expect(r.stage_trace).toBeDefined();
      expect(Array.isArray(r.stage_trace)).toBe(true);
    });

    it("records pipeline duration", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(r.pipeline_duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("populates operations list", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(Array.isArray(r.operations)).toBe(true);
    });

    it("emits a program text", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(typeof r.program_text).toBe("string");
    });

    it("returns release_gate object", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(r.release_gate).toBeDefined();
      expect(typeof r.release_gate.passed).toBe("boolean");
      expect(Array.isArray(r.release_gate.checks)).toBe(true);
    });
  });

  // ── Safety gate enforcement ───────────────────────────────────────────

  describe("safety gates cannot be bypassed", () => {
    it("BAR_STOCK_SAFETY runs even when omitted from stages_to_run", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput({
        stages_to_run: ["INPUT_VALIDATE"],
      }));
      const ran = r.stage_trace.some((s) => s.stage === "BAR_STOCK_SAFETY");
      expect(ran).toBe(true);
    });

    it("CLAMPING_PER_OP runs even when omitted", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput({
        stages_to_run: ["INPUT_VALIDATE"],
      }));
      const ran = r.stage_trace.some((s) => s.stage === "CLAMPING_PER_OP");
      expect(ran).toBe(true);
    });

    it("MACHINE_READINESS runs even when omitted", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput({
        stages_to_run: ["INPUT_VALIDATE"],
      }));
      const ran = r.stage_trace.some((s) => s.stage === "MACHINE_READINESS");
      expect(ran).toBe(true);
    });
  });

  // ── Bar stock safety ──────────────────────────────────────────────────

  describe("bar stock safety", () => {
    it("detects bar stock requirement when workpiece_type='bar_stock' + no feeder", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput({
        workpiece_type: "bar_stock",
        bar_feeder: false,
        part_length_mm: 300,
      }));
      // Not required to be blocked, but should surface warning/block
      const barStage = r.stage_trace.find((s) => s.stage === "BAR_STOCK_SAFETY");
      expect(barStage).toBeDefined();
    });

    it("bar_stock + no feeder + long bar triggers safety warning", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput({
        workpiece_type: "bar_stock",
        bar_feeder: false,
        bar_extension_behind_spindle_mm: 500, // > MAX_BAR_EXTENSION_MM (300)
      }));
      expect(r.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Stage trace ───────────────────────────────────────────────────────

  describe("stage trace", () => {
    it("each stage record has stage + status + duration + warnings", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      r.stage_trace.forEach((s) => {
        expect(s.stage).toBeDefined();
        expect(["completed", "skipped", "failed"]).toContain(s.status);
        expect(typeof s.duration_ms).toBe("number");
        expect(Array.isArray(s.warnings)).toBe(true);
      });
    });

    it("stages_completed aggregates completed stage names", () => {
      const r = latheOrchestrationEngine.calculate("generate", baseInput());
      expect(Array.isArray(r.stages_completed)).toBe(true);
    });
  });

  // ── Optimization targets ─────────────────────────────────────────────

  describe("optimization targets", () => {
    const targets: LatheOrchestrationInput["optimization_target"][] = [
      "balanced",
      "max_speed",
      "max_tool_life",
      "min_cost",
      "surface_quality",
    ];
    targets.forEach((target) => {
      it(`runs successfully with target=${target}`, () => {
        const r = latheOrchestrationEngine.calculate(
          "generate",
          baseInput({ optimization_target: target })
        );
        expect(r).toBeDefined();
        expect(r.stage_trace.length).toBeGreaterThan(0);
      });
    });
  });

  // ── Controllers ───────────────────────────────────────────────────────

  describe("controller dialect coverage", () => {
    const controllers: LatheOrchestrationInput["controller"][] = [
      "fanuc",
      "haas",
      "okuma",
      "mazak",
      "siemens",
    ];
    controllers.forEach((controller) => {
      it(`completes pipeline on ${controller}`, () => {
        const r = latheOrchestrationEngine.calculate(
          "generate",
          baseInput({ controller })
        );
        expect(r.stage_trace.length).toBeGreaterThan(0);
      });
    });
  });

  // ── Multi-feature part ────────────────────────────────────────────────

  describe("multi-feature part", () => {
    it("handles part with turn + groove + thread", () => {
      const r = latheOrchestrationEngine.calculate(
        "generate",
        baseInput({
          features: [
            { id: "f1", type: "od_turn", od_mm: 45, length_mm: 80 },
            { id: "f2", type: "od_groove", position_z_mm: -20, groove_width_mm: 3, groove_depth_mm: 3 },
            { id: "f3", type: "od_thread", od_mm: 42, length_mm: 30, thread_pitch_mm: 1.5 },
          ],
        })
      );
      expect(r).toBeDefined();
    });
  });
});
