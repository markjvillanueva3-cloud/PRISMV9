/**
 * LATHE-PRO MS0 Session 7 — LatheOrchestrationEngine Tests
 *
 * Covers:
 *   - 35-stage enum completeness
 *   - Full pipeline execution with basic input
 *   - BAR_STOCK_SAFETY: whip speed RPM blocking, bar feeder requirement,
 *     extension check, critical vibration risk, chucked work bypass
 *   - CLAMPING_PER_OP: OD force direction, boring pull-out hazard,
 *     cutoff without catcher blocking, face groove check, safety factor
 *   - Safety gates cannot be skipped
 *   - Release gate aggregation
 *   - Safety-only mode
 */

import { describe, expect, it } from "vitest";
import {
  LatheOrchestrationEngine,
  LATHE_STAGES,
  type LatheOrchestrationInput,
  type LatheOrchestrationResult,
} from "../engines/LatheOrchestrationEngine.js";

const engine = new LatheOrchestrationEngine();

// ── Test Fixtures ──────────────────────────────────────────────────

function basicInput(overrides?: Partial<LatheOrchestrationInput>): LatheOrchestrationInput {
  return {
    part_number: "TEST-001",
    material: { material_name: "AISI 4140", iso_group: "P" },
    bar_stock_od_mm: 50,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", length_mm: 60, od_mm: 45 },
    ],
    workpiece_type: "chucked",
    ...overrides,
  };
}

function barStockInput(overrides?: Partial<LatheOrchestrationInput>): LatheOrchestrationInput {
  return {
    part_number: "BAR-001",
    material: { material_name: "AISI 1045", iso_group: "P" },
    bar_stock_od_mm: 25,
    part_length_mm: 150,
    features: [
      { id: "f1", type: "od_straight", length_mm: 100, od_mm: 20 },
      { id: "f2", type: "part_off", length_mm: 3 },
    ],
    workpiece_type: "bar_stock",
    bar_feeder: true,
    ...overrides,
  };
}

function boringInput(): LatheOrchestrationInput {
  return {
    part_number: "BORE-001",
    material: { material_name: "AISI 4140", iso_group: "P" },
    bar_stock_od_mm: 60,
    part_length_mm: 50,
    features: [
      { id: "f1", type: "id_bore", length_mm: 40, id_mm: 30, depth_mm: 40 },
    ],
    workpiece_type: "chucked",
  };
}

// ════════════════════════════════════════════════════════════════════
// STAGE ENUM
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — Stage Enum", () => {
  it("has exactly 35 stages", () => {
    expect(LATHE_STAGES).toHaveLength(35);
  });

  it("stages are in correct order with correct names", () => {
    expect(LATHE_STAGES[0]).toBe("INPUT_VALIDATE");
    expect(LATHE_STAGES[11]).toBe("BAR_STOCK_SAFETY");
    expect(LATHE_STAGES[12]).toBe("CLAMPING_PER_OP");
    expect(LATHE_STAGES[15]).toBe("GCODE_GENERATE");
    expect(LATHE_STAGES[34]).toBe("RELEASE_GATE");
  });

  it("all stage names are unique", () => {
    const unique = new Set(LATHE_STAGES);
    expect(unique.size).toBe(LATHE_STAGES.length);
  });

  it("safety-critical stages are in positions 12-14", () => {
    expect(LATHE_STAGES[11]).toBe("BAR_STOCK_SAFETY");
    expect(LATHE_STAGES[12]).toBe("CLAMPING_PER_OP");
    expect(LATHE_STAGES[13]).toBe("MACHINE_READINESS");
  });
});

// ════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — Pipeline Execution", () => {
  it("executes all 35 stages for basic chucked input", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.success).toBe(true);
    expect(result.stages_completed.length).toBe(35);
    expect(result.stages_failed).toHaveLength(0);
    expect(result.stages_skipped).toHaveLength(0);
    expect(result.pipeline_duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("returns compatible TurningProgramResult fields", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.part_number).toBe("TEST-001");
    expect(result.material).toBe("AISI 4140");
    expect(result.bar_stock_od_mm).toBe(50);
    expect(result.part_length_mm).toBe(80);
    expect(typeof result.program_text).toBe("string");
    expect(typeof result.confidence_score).toBe("number");
    expect(Array.isArray(result.setup_notes)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("includes stage trace for every stage", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.stage_trace).toHaveLength(35);
    for (const stage of result.stage_trace) {
      expect(["completed", "skipped", "failed"]).toContain(stage.status);
      expect(typeof stage.duration_ms).toBe("number");
    }
  });

  it("includes release gate verdict", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.release_gate).toBeDefined();
    expect(result.release_gate.passed).toBe(true);
    expect(result.release_gate.checks.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// BAR_STOCK_SAFETY (Stage 12)
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — BAR_STOCK_SAFETY", () => {
  it("passes for chucked workpiece (non-bar-stock)", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.bar_stock_safety).toBeDefined();
    expect(result.bar_stock_safety!.is_bar_stock).toBe(false);
    expect(result.bar_stock_safety!.passed).toBe(true);
  });

  it("analyzes vibration for bar stock", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput());
    expect(result.bar_stock_safety).toBeDefined();
    expect(result.bar_stock_safety!.is_bar_stock).toBe(true);
    expect(result.bar_stock_safety!.vibration).toBeDefined();
    expect(result.bar_stock_safety!.max_rpm_limit).toBeGreaterThan(0);
  });

  it("hard-blocks RPM above critical whip speed", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      max_spindle_rpm: 99999,
      bar_stock_od_mm: 10,
      part_length_mm: 300,
    }));
    const safety = result.bar_stock_safety!;
    expect(safety.rpm_violations.length).toBeGreaterThan(0);
    expect(safety.rpm_violations[0].requested_rpm).toBe(99999);
    expect(safety.rpm_violations[0].limit).toBeLessThan(99999);
  });

  it("blocks bar stock without bar feeder when L/D >= 4", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_stock_od_mm: 20,
      part_length_mm: 200, // L/D = 10
      bar_feeder: false,
    }));
    const safety = result.bar_stock_safety!;
    expect(safety.bar_feeder_required).toBe(true);
    expect(safety.bar_feeder_present).toBe(false);
    expect(safety.passed).toBe(false);
    expect(safety.block_reasons.some(r => r.includes("bar feeder"))).toBe(true);
    // Overall result should reflect safety block
    expect(result.safety_passed).toBe(false);
  });

  it("blocks critical vibration without tailstock", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_stock_od_mm: 10,
      part_length_mm: 200, // L/D = 20 → critical
      bar_feeder: true,
      tailstock: false,
    }));
    const safety = result.bar_stock_safety!;
    expect(safety.vibration?.risk).toBe("critical");
    expect(safety.passed).toBe(false);
    expect(safety.block_reasons.some(r => r.includes("CRITICAL"))).toBe(true);
  });

  it("passes critical vibration WITH tailstock", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_stock_od_mm: 10,
      part_length_mm: 200,
      bar_feeder: true,
      tailstock: true,
    }));
    const safety = result.bar_stock_safety!;
    // With tailstock, analysis changes to simply-supported → lower risk
    expect(safety.passed).toBe(true);
  });

  it("blocks excessive bar extension behind spindle", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_extension_behind_spindle_mm: 500, // > 300mm limit
    }));
    const safety = result.bar_stock_safety!;
    expect(safety.extension_safe).toBe(false);
    expect(safety.passed).toBe(false);
    expect(safety.block_reasons.some(r => r.includes("behind spindle"))).toBe(true);
  });

  it("passes with safe bar extension", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_extension_behind_spindle_mm: 100,
    }));
    const safety = result.bar_stock_safety!;
    expect(safety.extension_safe).toBe(true);
  });

  it("adds setup notes with vibration recommendations", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput());
    const barNotes = result.setup_notes.filter(n => n.includes("[BAR SAFETY]"));
    expect(barNotes.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// CLAMPING_PER_OP (Stage 13)
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — CLAMPING_PER_OP", () => {
  it("analyzes force direction for OD turning (into_chuck)", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    const odOps = result.clamping_analysis?.filter(
      a => a.operation_type.startsWith("od_"),
    );
    expect(odOps).toBeDefined();
    expect(odOps!.length).toBeGreaterThan(0);
    for (const op of odOps!) {
      expect(op.force_direction).toBe("into_chuck");
      expect(op.blocked).toBe(false);
    }
  });

  it("flags boring as axial_pull hazard", () => {
    const result = engine.calculate("lathe_orchestrate", boringInput());
    const boreOps = result.clamping_analysis?.filter(
      a => a.force_direction === "axial_pull",
    );
    expect(boreOps).toBeDefined();
    expect(boreOps!.length).toBeGreaterThan(0);
    for (const op of boreOps!) {
      expect(op.hazards.some(h => h.includes("pull-out"))).toBe(true);
    }
  });

  it("flags deep bore L/D risk", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...boringInput(),
      features: [
        { id: "f1", type: "id_bore", length_mm: 200, id_mm: 10, depth_mm: 200, diameter_mm: 10 },
      ],
    });
    const deepBore = result.clamping_analysis?.filter(
      a => a.hazards.some(h => h.includes("Deep bore")),
    );
    expect(deepBore!.length).toBeGreaterThan(0);
  });

  it("blocks cutoff >800 RPM without catcher or sub-spindle", () => {
    const result = engine.calculate("lathe_orchestrate", {
      part_number: "CUTOFF-001",
      material: { material_name: "AISI 1045", iso_group: "P" },
      bar_stock_od_mm: 30,
      part_length_mm: 50,
      features: [
        { id: "f1", type: "part_off", length_mm: 3 },
      ],
      max_spindle_rpm: 2000,
      workpiece_type: "chucked",
      part_catcher: false,
      sub_spindle: false,
    });
    const cutoffOps = result.clamping_analysis?.filter(
      a => a.operation_type === "part_off",
    );
    expect(cutoffOps).toBeDefined();
    expect(cutoffOps!.length).toBeGreaterThan(0);
    const blocked = cutoffOps!.filter(a => a.blocked);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0].block_reason).toContain("800");
  });

  it("allows cutoff with part catcher", () => {
    const result = engine.calculate("lathe_orchestrate", {
      part_number: "CUTOFF-002",
      material: { material_name: "AISI 1045", iso_group: "P" },
      bar_stock_od_mm: 30,
      part_length_mm: 50,
      features: [
        { id: "f1", type: "part_off", length_mm: 3 },
      ],
      max_spindle_rpm: 2000,
      workpiece_type: "chucked",
      part_catcher: true,
    });
    const cutoffOps = result.clamping_analysis?.filter(
      a => a.operation_type === "part_off",
    );
    expect(cutoffOps!.every(a => !a.blocked)).toBe(true);
  });

  it("allows cutoff with sub-spindle", () => {
    const result = engine.calculate("lathe_orchestrate", {
      part_number: "CUTOFF-003",
      material: { material_name: "AISI 1045", iso_group: "P" },
      bar_stock_od_mm: 30,
      part_length_mm: 50,
      features: [
        { id: "f1", type: "part_off", length_mm: 3 },
      ],
      max_spindle_rpm: 2000,
      workpiece_type: "chucked",
      sub_spindle: true,
    });
    const cutoffOps = result.clamping_analysis?.filter(
      a => a.operation_type === "part_off",
    );
    expect(cutoffOps!.every(a => !a.blocked)).toBe(true);
  });

  it("computes safety factor for each operation", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    for (const op of result.clamping_analysis ?? []) {
      expect(op.safety_factor).toBeGreaterThan(0);
      expect(typeof op.estimated_force_N).toBe("number");
      expect(op.estimated_force_N).toBeGreaterThan(0);
    }
  });

  it("detects face groove axial clamping concern", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      features: [
        { id: "f1", type: "face_groove", length_mm: 5, groove_width_mm: 3, groove_depth_mm: 2 },
      ],
    });
    const faceGrooveOps = result.clamping_analysis?.filter(
      a => a.hazards.some(h => h.includes("Face grooving")),
    );
    expect(faceGrooveOps!.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// SAFETY GATES CANNOT BE SKIPPED
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — Safety Gate Enforcement", () => {
  it("runs safety stages even when stages_to_run tries to skip them", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      stages_to_run: ["INPUT_VALIDATE", "GCODE_GENERATE"], // no safety stages listed
    });
    const completedStages = new Set(result.stages_completed);
    // Safety stages should still run
    expect(completedStages.has("BAR_STOCK_SAFETY")).toBe(true);
    expect(completedStages.has("CLAMPING_PER_OP")).toBe(true);
    expect(completedStages.has("MACHINE_READINESS")).toBe(true);
    expect(completedStages.has("SAFETY_VERIFY")).toBe(true);
    expect(completedStages.has("COLLISION_CHECK")).toBe(true);
    expect(completedStages.has("RELEASE_GATE")).toBe(true);
  });

  it("safety_only mode runs only input + safety stages", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      safety_only: true,
    });
    const completed = new Set(result.stages_completed);
    // Should have input + safety stages
    expect(completed.has("INPUT_VALIDATE")).toBe(true);
    expect(completed.has("BAR_STOCK_SAFETY")).toBe(true);
    expect(completed.has("CLAMPING_PER_OP")).toBe(true);
    // Should NOT have non-safety stages
    expect(completed.has("CHIP_CONTROL")).toBe(false);
    expect(completed.has("TOOLPATH_GENERATE")).toBe(false);
    expect(completed.has("COST_OPTIMIZE")).toBe(false);
    // Skipped stages should be recorded
    expect(result.stages_skipped.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════
// RELEASE GATE AGGREGATION
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — Release Gate", () => {
  it("passes release gate for safe input", () => {
    const result = engine.calculate("lathe_orchestrate", basicInput());
    expect(result.release_gate.passed).toBe(true);
    expect(result.safety_passed).toBe(true);
    expect(result.safety_blocks).toHaveLength(0);
  });

  it("blocks release gate for unsafe input", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_stock_od_mm: 10,
      part_length_mm: 300,
      bar_feeder: false,
      tailstock: false,
    }));
    expect(result.release_gate.passed).toBe(false);
    expect(result.safety_passed).toBe(false);
    expect(result.safety_blocks.length).toBeGreaterThan(0);
  });

  it("program text indicates safety block when release gate fails", () => {
    const result = engine.calculate("lathe_orchestrate", barStockInput({
      bar_stock_od_mm: 10,
      part_length_mm: 300,
      bar_feeder: false,
      tailstock: false,
    }));
    expect(result.program_text).toContain("SAFETY BLOCK");
  });
});

// ════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ════════════════════════════════════════════════════════════════════

describe("LatheOrchestrationEngine — Input Validation", () => {
  it("fails with no features", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      features: [],
    });
    expect(result.success).toBe(false);
    expect(result.stages_failed.some(s => s.stage === "INPUT_VALIDATE")).toBe(true);
  });

  it("fails with zero bar stock OD", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      bar_stock_od_mm: 0,
    });
    expect(result.success).toBe(false);
  });

  it("fails when finished OD exceeds bar stock OD", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      bar_stock_od_mm: 30,
      features: [{ id: "f1", type: "od_straight", length_mm: 50, od_mm: 40 }],
    });
    expect(result.success).toBe(false);
    expect(result.stages_failed[0].error).toContain("exceeds bar stock");
  });

  it("warns for extremely slender part (L/D > 20)", () => {
    const result = engine.calculate("lathe_orchestrate", {
      ...basicInput(),
      bar_stock_od_mm: 10,
      part_length_mm: 250,
      workpiece_type: "chucked",
      features: [
        { id: "f1", type: "od_straight", length_mm: 200, od_mm: 8 },
      ],
    });
    const slenderWarning = result.warnings.find(
      w => w.message.includes("slender"),
    );
    expect(slenderWarning).toBeDefined();
  });
});
