/**
 * U-ARCH2: Helper Engine Integration Tests
 *
 * Verifies that all 6 shared helper engines are importable and functional,
 * and that the pipeline engines correctly integrate them.
 *
 * Helpers:
 *   1. SmartToolSelectorEngine — physics-scored tool selection
 *   2. CoolantStrategyEngine — material/operation coolant recommendation
 *   3. EntryExitStrategyEngine — safe entry/exit strategies
 *   4. IntelligentSequencingEngine — 33-rule operation ordering
 *   5. WorkholdingVerificationEngine — clamping force validation
 *   6. PipelineCheckpointManager — stage serialization + resume
 */
import { describe, it, expect } from "vitest";
import { smartToolSelectorEngine } from "../engines/SmartToolSelectorEngine.js";
import { coolantStrategyEngine } from "../engines/CoolantStrategyEngine.js";
import { entryExitStrategyEngine } from "../engines/EntryExitStrategyEngine.js";
import { intelligentSequencingEngine } from "../engines/IntelligentSequencingEngine.js";
import { workholdingVerificationEngine } from "../engines/WorkholdingVerificationEngine.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";

// ═══════════════════════════════════════════════════════════════════
// 1. SmartToolSelectorEngine — singleton import + basic selection
// ═══════════════════════════════════════════════════════════════════

describe("SmartToolSelectorEngine (U-ARCH2 integration)", () => {
  it("exports a singleton instance", () => {
    expect(smartToolSelectorEngine).toBeDefined();
    expect(typeof smartToolSelectorEngine.select).toBe("function");
  });

  it("selects tools for a roughing operation on P-group steel", () => {
    const result = smartToolSelectorEngine.select({
      operation_type: "face_milling",
      material_iso_group: "P",
      machine_max_rpm: 8000,
      machine_max_power_kw: 15,
      max_tool_diameter_mm: 80,
      min_tool_diameter_mm: 10,
      optimization_goal: "balanced",
    });
    expect(result).toBeDefined();
    expect(result.candidates).toBeDefined();
    expect(Array.isArray(result.candidates)).toBe(true);
  });

  it("handles unknown ISO group gracefully", () => {
    const result = smartToolSelectorEngine.select({
      operation_type: "drilling",
      material_iso_group: "Z",
      machine_max_rpm: 5000,
      machine_max_power_kw: 10,
    });
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. CoolantStrategyEngine — coolant recommendation
// ═══════════════════════════════════════════════════════════════════

describe("CoolantStrategyEngine (U-ARCH2 integration)", () => {
  it("exports a singleton instance", () => {
    expect(coolantStrategyEngine).toBeDefined();
    expect(typeof coolantStrategyEngine.calculate).toBe("function");
  });

  it("recommends coolant for stainless turning", () => {
    const result = coolantStrategyEngine.calculate({
      workpiece_material: "stainless_steel",
      operation: "turning_rough",
      cutting_speed_m_min: 120,
      depth_of_cut_mm: 3,
    });
    expect(result).toBeDefined();
    expect(result.primary_method).toBeDefined();
    expect(["flood", "through_spindle", "through_tool", "mql"]).toContain(result.primary_method);
  });

  it("recommends appropriate strategy for aluminum milling", () => {
    const result = coolantStrategyEngine.calculate({
      workpiece_material: "aluminum",
      operation: "milling_rough",
      cutting_speed_m_min: 300,
    });
    expect(result).toBeDefined();
    expect(result.primary_method).toBeDefined();
  });

  it("returns pressure and flow rate as AtomicValues", () => {
    const result = coolantStrategyEngine.calculate({
      workpiece_material: "carbon_steel",
      operation: "drilling",
      cutting_speed_m_min: 80,
      hole_depth_mm: 30,
      hole_diameter_mm: 10,
    });
    expect(result.pressure_bar).toBeDefined();
    expect(result.pressure_bar.value).toBeGreaterThan(0);
    expect(result.flow_rate_l_min).toBeDefined();
    expect(result.flow_rate_l_min.value).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. EntryExitStrategyEngine — entry/exit selection
// ═══════════════════════════════════════════════════════════════════

describe("EntryExitStrategyEngine (U-ARCH2 integration)", () => {
  it("exports a singleton instance", () => {
    expect(entryExitStrategyEngine).toBeDefined();
    expect(typeof entryExitStrategyEngine.selectEntry).toBe("function");
    expect(typeof entryExitStrategyEngine.selectExit).toBe("function");
  });

  it("selects entry for aluminum pocket", () => {
    const result = entryExitStrategyEngine.selectEntry({
      tool_diameter: 12,
      pocket_width: 30,
      pocket_depth: 15,
      material: "aluminum",
    });
    expect(result).toBeDefined();
    expect(result.recommended_method).toBeDefined();
    expect(["helix", "ramp", "arc", "plunge", "interpolated", "pre_drill"]).toContain(result.recommended_method);
  });

  it("selects conservative entry for titanium", () => {
    const result = entryExitStrategyEngine.selectEntry({
      tool_diameter: 10,
      pocket_width: 25,
      pocket_depth: 20,
      material: "titanium",
    });
    expect(result).toBeDefined();
    expect(["ramp", "helix", "interpolated"]).toContain(result.recommended_method);
  });

  it("returns helix params when helix method selected", () => {
    const result = entryExitStrategyEngine.selectEntry({
      tool_diameter: 16,
      pocket_depth: 10,
      material: "aluminum",
      pocket_width: 40,
    });
    if (result.recommended_method === "helix" && result.helix_params) {
      expect(result.helix_params.angle_deg).toBeGreaterThan(0);
      expect(result.helix_params.angle_deg).toBeLessThanOrEqual(5.0); // aluminum max
    }
  });

  it("selects exit strategy", () => {
    const result = entryExitStrategyEngine.selectExit(12, "finishing");
    expect(result).toBeDefined();
    expect(result.method).toBeDefined();
    expect(["arc_out", "tangent", "rapid_retract", "lift_and_rapid"]).toContain(result.method);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. IntelligentSequencingEngine — 33-rule operation ordering
// ═══════════════════════════════════════════════════════════════════

describe("IntelligentSequencingEngine (U-ARCH2 integration)", () => {
  it("exports a singleton instance", () => {
    expect(intelligentSequencingEngine).toBeDefined();
    expect(typeof intelligentSequencingEngine.sequence).toBe("function");
  });

  it("sequences a mixed operation set respecting phase order", () => {
    const ops = [
      { id: "op1", type: "roughing", operation: "pocket_rough", phase: 1 },
      { id: "op2", type: "drill", operation: "drilling", phase: 2 },
      { id: "op3", type: "face", operation: "facing", phase: 0, is_datum: true },
      { id: "op4", type: "finish", operation: "pocket_finish", phase: 5 },
    ];
    const result = intelligentSequencingEngine.sequence(ops);
    expect(result).toBeDefined();
    expect(result.operations).toBeDefined();
    expect(result.operations.length).toBeGreaterThanOrEqual(4);
    // Phase 0 (facing/datum) should come before phase 5 (finishing)
    const faceIdx = result.operations.findIndex((o: any) => o.id === "op3");
    const finishIdx = result.operations.findIndex((o: any) => o.id === "op4");
    expect(faceIdx).toBeLessThan(finishIdx);
  });

  it("returns rules_applied and quality score", () => {
    const ops = [
      { id: "a", type: "rough", operation: "roughing", phase: 1 },
      { id: "b", type: "finish", operation: "finishing", phase: 5 },
    ];
    const result = intelligentSequencingEngine.sequence(ops);
    expect(result.rules_applied).toBeDefined();
    expect(Array.isArray(result.rules_applied)).toBe(true);
    expect(result.sequence_quality_score).toBeGreaterThanOrEqual(0);
  });

  it("handles single operation without error", () => {
    const result = intelligentSequencingEngine.sequence([
      { id: "solo", type: "face", operation: "facing", phase: 0 },
    ]);
    expect(result.operations.length).toBe(1);
  });

  it("handles empty operations array", () => {
    const result = intelligentSequencingEngine.sequence([]);
    expect(result.operations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. WorkholdingVerificationEngine — clamping safety check
// ═══════════════════════════════════════════════════════════════════

describe("WorkholdingVerificationEngine (U-ARCH2 integration)", () => {
  it("exports a singleton instance", () => {
    expect(workholdingVerificationEngine).toBeDefined();
    expect(typeof workholdingVerificationEngine.verify).toBe("function");
  });

  it("returns SAFE verdict with adequate clamping force", () => {
    const result = workholdingVerificationEngine.verify(
      { Fc_N: 500, Ff_N: 200, operation_name: "roughing" },
      { clamping_force_N: 15000, clamping_method: "hydraulic" },
    );
    expect(result).toBeDefined();
    expect(result.verdict).toBe("SAFE");
    expect(result.safety_factor).toBeGreaterThanOrEqual(2.0);
  });

  it("returns non-SAFE verdict with insufficient clamping force", () => {
    const result = workholdingVerificationEngine.verify(
      { Fc_N: 5000, Ff_N: 3000, operation_name: "heavy_roughing" },
      { clamping_force_N: 500, clamping_method: "manual" },
    );
    expect(result).toBeDefined();
    expect(["WARNING", "CRITICAL"]).toContain(result.verdict);
  });

  it("returns safety_factor and required_grip_N", () => {
    const result = workholdingVerificationEngine.verify(
      { Fc_N: 1000 },
      { clamping_force_N: 20000, clamping_method: "hydraulic" },
    );
    expect(result.safety_factor).toBeGreaterThan(0);
    expect(result.required_grip_N).toBeGreaterThan(0);
    expect(result.available_grip_N).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. PipelineCheckpointManager — stage serialization + resume
// ═══════════════════════════════════════════════════════════════════

describe("PipelineCheckpointManager (U-ARCH2 integration)", () => {
  it("constructs without error", () => {
    const mgr = new PipelineCheckpointManager("test-pipeline", "test-run-1");
    expect(mgr).toBeDefined();
  });

  it("checkpoints and returns a file path", () => {
    const mgr = new PipelineCheckpointManager("test-pipeline", "checkpoint-test");
    const path = mgr.checkpoint("validate_intake", 0, { features: 5 }, 100);
    expect(typeof path).toBe("string");
  });

  it("saves multiple stages in sequence", () => {
    const mgr = new PipelineCheckpointManager("test-pipeline", "multi-stage");
    const p1 = mgr.checkpoint("intake", 0, { count: 1 });
    const p2 = mgr.checkpoint("process", 1, { count: 2 });
    const p3 = mgr.checkpoint("output", 2, { count: 3 });
    expect(typeof p1).toBe("string");
    expect(typeof p2).toBe("string");
    expect(typeof p3).toBe("string");
  });

  it("resumeFrom returns null for non-existent stage", () => {
    const mgr = new PipelineCheckpointManager("test-pipeline", "resume-miss");
    const result = mgr.resumeFrom(99);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Pipeline imports — verify helper wiring exists (module loads)
// ═══════════════════════════════════════════════════════════════════

describe("Pipeline engine helper imports (U-ARCH2 wiring verification)", () => {
  it("TurningPrintToProgramEngine imports all helpers", async () => {
    const mod = await import("../engines/TurningPrintToProgramEngine.js");
    expect(mod.turningPrintToProgramEngine).toBeDefined();
  });

  it("MultiAxisPrintToProgramEngine imports all helpers", async () => {
    const mod = await import("../engines/MultiAxisPrintToProgramEngine.js");
    expect(mod.multiAxisPrintToProgramEngine).toBeDefined();
  });

  it("MillTurnSwissPipelineEngine imports all helpers", async () => {
    const mod = await import("../engines/MillTurnSwissPipelineEngine.js");
    expect(mod.millTurnSwissPipelineEngine).toBeDefined();
  });

  it("EDMProgramAssemblerEngine exports class", async () => {
    const mod = await import("../engines/EDMProgramAssemblerEngine.js");
    expect(mod.EDMProgramAssemblerEngine).toBeDefined();
  });

  it("GrindingProgramAssemblerEngine exports class", async () => {
    const mod = await import("../engines/GrindingProgramAssemblerEngine.js");
    expect(mod.GrindingProgramAssemblerEngine).toBeDefined();
  });

  it("LaserProgramAssemblerEngine exports class", async () => {
    const mod = await import("../engines/LaserProgramAssemblerEngine.js");
    expect(mod.LaserProgramAssemblerEngine).toBeDefined();
  });

  it("WaterjetProgramAssemblerEngine exports singleton", async () => {
    const mod = await import("../engines/WaterjetProgramAssemblerEngine.js");
    expect(mod.waterjetProgramAssemblerEngine).toBeDefined();
  });
});
