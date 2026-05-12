/**
 * PrintToProgramPipelineEngine — Comprehensive test suite
 *
 * Tests all 5 pipeline stages: intake validation, feature classification,
 * process planning, program generation, and validation/output.
 *
 * @module tests/print-to-program-pipeline
 */

import { describe, it, expect } from "vitest";
import {
  printToProgramPipelineEngine,
  PrintToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
  type PrintToProgramResult,
  type ProcessPlanResult,
  type ValidationResult,
} from "../engines/PrintToProgramPipelineEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STEEL_MATERIAL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

const ALUMINUM_MATERIAL: MaterialCallout = {
  material_name: "6061-T6 Aluminum",
  specification: "AMS 4027",
  iso_group: "N",
};

const STAINLESS_MATERIAL: MaterialCallout = {
  material_name: "316L Stainless",
  iso_group: "M",
};

function makeHole(id: string, diam: number, depth: number, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "hole_through",
    depth_mm: depth,
    diameter_mm: diam,
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function makePocket(id: string, w: number, l: number, d: number, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "pocket_closed",
    width_mm: w,
    length_mm: l,
    depth_mm: d,
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function makeBasicInput(overrides?: Partial<DrawingInput>): DrawingInput {
  return {
    part_number: "TEST-001",
    material: STEEL_MATERIAL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [
      { id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 },
      { id: "D2", type: "diameter", nominal_mm: 10, confidence: 0.98 },
    ],
    features: [
      {
        id: "F1",
        type: "face",
        depth_mm: 1,
        width_mm: 150,
        length_mm: 100,
        required_operations: [],
        priority: 0,
      },
      makeHole("F2", 10, 25),
      makePocket("F3", 40, 60, 15),
    ],
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

function makeSafeProgramInput(overrides?: Partial<DrawingInput>): DrawingInput {
  return makeBasicInput({
    material: ALUMINUM_MATERIAL,
    stock_size: { x: 80, y: 60, z: 12 },
    features: [
      {
        id: "F1",
        type: "face",
        depth_mm: 0.5,
        width_mm: 80,
        length_mm: 60,
        required_operations: [],
        priority: 0,
      },
      makeHole("F2", 8, 8),
    ],
    ...overrides,
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe("PrintToProgramPipelineEngine", () => {
  // --------------------------------------------------------------------------
  // Singleton & structure
  // --------------------------------------------------------------------------

  it("T01: exports a singleton instance", () => {
    expect(printToProgramPipelineEngine).toBeInstanceOf(PrintToProgramPipelineEngine);
    expect(printToProgramPipelineEngine.name).toBe("PrintToProgramPipelineEngine");
    expect(printToProgramPipelineEngine.version).toBe("1.0.0");
  });

  it("T02: calculate() dispatches to correct sub-method", () => {
    const input = makeBasicInput();
    const full = printToProgramPipelineEngine.calculate("print_to_program_full", input as unknown as Record<string, unknown>);
    expect((full as PrintToProgramResult).program_text).toBeDefined();

    const plan = printToProgramPipelineEngine.calculate("print_to_program_plan", input as unknown as Record<string, unknown>);
    expect((plan as ProcessPlanResult).operations).toBeDefined();
    expect((plan as PrintToProgramResult).program_text).toBeUndefined();
  });

  it("T03: calculate() throws on unknown action", () => {
    expect(() => printToProgramPipelineEngine.calculate("bad_action", {})).toThrow("Unknown action");
  });

  // --------------------------------------------------------------------------
  // Stage 1: Intake Validation
  // --------------------------------------------------------------------------

  it("T04: flags missing material as critical", () => {
    const input = makeBasicInput({ material: { material_name: "", iso_group: "P" } as MaterialCallout });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.intake_validation.warnings.some(w => w.severity === "critical" && w.message.includes("material"))).toBe(true);
  });

  it("T05: flags missing hole diameter", () => {
    const input = makeBasicInput({
      features: [makeHole("H1", undefined as unknown as number, 20)],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.intake_validation.missing_dimensions).toContain("Feature H1: hole without diameter");
  });

  it("T06: detects contradictory tolerance vs finish", () => {
    const input = makeBasicInput({
      features: [makePocket("P1", 30, 40, 10, { tolerance_mm: 0.2, surface_finish_Ra_um: 0.4 })],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.intake_validation.ambiguous_tolerances.length).toBeGreaterThan(0);
    expect(result.intake_validation.ambiguous_tolerances[0]).toContain("contradicts");
  });

  it("T07: warns on very tight tolerance", () => {
    const input = makeBasicInput({
      features: [makePocket("P1", 30, 40, 10, { tolerance_mm: 0.005 })],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.intake_validation.warnings.some(w => w.message.includes("very tight"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Stage 2: Feature Classification
  // --------------------------------------------------------------------------

  it("T08: auto-assigns operations to features without ops", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    // Face feature should get "face" op
    const faceFeature = result.machinable_features.find(f => f.type === "face");
    expect(faceFeature?.required_operations).toContain("face");
    // Hole should get "drill"
    const holeFeature = result.machinable_features.find(f => f.type === "hole_through");
    expect(holeFeature?.required_operations).toContain("drill");
    // Pocket should get rough + finish
    const pocketFeature = result.machinable_features.find(f => f.type === "pocket_closed");
    expect(pocketFeature?.required_operations).toContain("pocket_rough");
    expect(pocketFeature?.required_operations).toContain("pocket_finish");
  });

  it("T09: upgrades to semi-finish for tight tolerance", () => {
    const input = makeBasicInput({
      features: [{
        id: "F1",
        type: "contour_outside",
        depth_mm: 10,
        width_mm: 50,
        length_mm: 80,
        tolerance_mm: 0.02,
        surface_finish_Ra_um: 0.8,
        required_operations: [],
        priority: 0,
      }],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    const feat = result.machinable_features[0];
    expect(feat.required_operations).toContain("semi_finish");
  });

  // --------------------------------------------------------------------------
  // Stage 3: Process Planning (physics)
  // --------------------------------------------------------------------------

  it("T10: generates operations with valid Kienzle forces", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.operations.length).toBeGreaterThan(0);
    for (const op of result.operations) {
      expect(op.physics.cutting_force_N).toBeGreaterThan(0);
      expect(op.physics.power_kW).toBeGreaterThan(0);
      expect(op.physics.torque_Nm).toBeGreaterThan(0);
    }
  });

  it("T11: calculates Taylor tool life for each operation", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    for (const op of result.operations) {
      expect(op.physics.tool_life_min).toBeGreaterThan(0);
      expect(op.physics.tool_life_min).toBeLessThan(10000); // sanity
    }
  });

  it("T12: computes tool deflection and predicted Ra", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    for (const op of result.operations) {
      expect(op.physics.deflection_mm).toBeGreaterThanOrEqual(0);
      expect(op.physics.predicted_Ra_um).toBeGreaterThan(0);
    }
  });

  it("T13: respects spindle RPM limit", () => {
    const input = makeBasicInput({ max_spindle_rpm: 8000 });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    for (const op of result.operations) {
      expect(op.cutting_params.spindle_rpm).toBeLessThanOrEqual(8000);
    }
  });

  it("T14: different ISO groups produce different speeds", () => {
    const steelInput = makeBasicInput({ material: STEEL_MATERIAL });
    const aluInput = makeBasicInput({ material: ALUMINUM_MATERIAL });
    const steelResult = printToProgramPipelineEngine.runFullPipeline(steelInput);
    const aluResult = printToProgramPipelineEngine.runFullPipeline(aluInput);
    // Aluminum should have higher cutting speed than steel
    const steelVc = steelResult.operations[0].cutting_params.cutting_speed_m_min;
    const aluVc = aluResult.operations[0].cutting_params.cutting_speed_m_min;
    expect(aluVc).toBeGreaterThan(steelVc);
  });

  it("T15: optimization_target affects cutting parameters", () => {
    const speedInput = makeBasicInput({ optimization_target: "max_speed" });
    const lifeInput = makeBasicInput({ optimization_target: "max_tool_life" });
    const speedResult = printToProgramPipelineEngine.runFullPipeline(speedInput);
    const lifeResult = printToProgramPipelineEngine.runFullPipeline(lifeInput);
    // Max speed should have higher Vc than max life
    const speedVc = speedResult.operations[0].cutting_params.cutting_speed_m_min;
    const lifeVc = lifeResult.operations[0].cutting_params.cutting_speed_m_min;
    expect(speedVc).toBeGreaterThan(lifeVc);
  });

  // --------------------------------------------------------------------------
  // Stage 4: Program Generation
  // --------------------------------------------------------------------------

  it("T16: generates valid G-code program with header and end", () => {
    const input = makeSafeProgramInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(true);
    expect(result.program_text).toContain("%");
    expect(result.program_text).toContain("G90");
    expect(result.program_text).toContain("G21");
    expect(result.program_text).toContain("M30");
    expect(result.program_line_count).toBeGreaterThan(20);
  });

  it("T17: includes tool changes with G43 and spindle start", () => {
    const input = makeSafeProgramInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(true);
    expect(result.program_text).toContain("M06");
    expect(result.program_text).toContain("G43");
    expect(result.program_text).toContain("M03");
  });

  it("T18: includes coolant commands", () => {
    const input = makeSafeProgramInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(true);
    // Steel should use flood coolant
    expect(result.program_text).toMatch(/M0[78]|M88/);
  });

  it("T18A: activates SmartToolSelector and coolant helper for aluminum facing", () => {
    const input = makeSafeProgramInput({
      features: [{
        id: "F1",
        type: "face",
        depth_mm: 0.5,
        width_mm: 80,
        length_mm: 60,
        required_operations: [],
        priority: 0,
      }],
      machine_brand: "Haas",
      machine_model: "VF-2SS",
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(true);
    expect(result.operations[0].coolant).toBe("flood");
    expect(result.warnings.some(w => w.message.includes("SmartToolSelector"))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Stage 5: Validation & Output
  // --------------------------------------------------------------------------

  it("T19: safety checks include pass/warn/fail statuses", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.safety_checks.length).toBeGreaterThan(0);
    expect(result.safety_checks.some(c => c.status === "pass")).toBe(true);
    expect(result.safety_pass_rate).toBeGreaterThan(0);
    expect(result.safety_pass_rate).toBeLessThanOrEqual(1);
  });

  it("T20: generates setup sheet with tool list", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.setup_sheet.part_number).toBe("TEST-001");
    expect(result.setup_sheet.material).toBe("AISI 4140 Steel");
    expect(result.setup_sheet.tool_list.length).toBeGreaterThan(0);
    expect(result.setup_sheet.estimated_cycle_time_formatted).toMatch(/\d+:\d{2}/);
  });

  it("T21: confidence score between 0-100", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.confidence_score).toBeGreaterThanOrEqual(0);
    expect(result.confidence_score).toBeLessThanOrEqual(100);
  });

  it("T21A: fails closed when generated safety checks fail", () => {
    const input = makeBasicInput({
      max_spindle_rpm: 50,
      max_power_kW: 0.05,
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(false);
    expect(result.safety_checks.some(c => c.status === "fail")).toBe(true);
    expect(result.program_text).toBe("");
    expect(result.program_line_count).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Plan-only mode
  // --------------------------------------------------------------------------

  it("T22: runProcessPlan returns operations without G-code", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runProcessPlan(input);
    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.total_operations).toBeGreaterThan(0);
    expect((result as unknown as PrintToProgramResult).program_text).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Validate-only mode
  // --------------------------------------------------------------------------

  it("T23: validateProgram catches rapid into material", () => {
    const badProgram = `%
O0001
G90 G21
G54
T1 M06
G43 H1 Z50.
S5000 M03
G0 X0. Y0.
G0 Z-10.
M30
%`;
    const result = printToProgramPipelineEngine.validateProgram({ program_text: badProgram });
    expect(result.safety_checks.some(c => c.rule === "rapid_into_material" && c.status === "fail")).toBe(true);
  });

  it("T24: validateProgram catches spindle over limit", () => {
    const program = `%
O0001
G90 G21
G54
T1 M06
G43 H1 Z50.
S20000 M03
M30
%`;
    const result = printToProgramPipelineEngine.validateProgram({ program_text: program, max_spindle_rpm: 15000 });
    expect(result.safety_checks.some(c => c.rule === "spindle_over_limit" && c.status === "fail")).toBe(true);
  });

  it("T25: validateProgram passes clean program", () => {
    const cleanProgram = `%
O0001
G90 G21
G54
T1 M06
G43 H1 Z50.
S5000 M03
M08
G0 X0. Y0. Z5.
G1 Z-5. F200
G1 X50. F500
M09
G91 G28 Z0
M05
M30
%`;
    const result = printToProgramPipelineEngine.validateProgram({ program_text: cleanProgram });
    expect(result.safety_pass_rate).toBeGreaterThan(0.5);
    expect(result.warnings.filter(w => w.severity === "critical").length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Edge cases & multi-material
  // --------------------------------------------------------------------------

  it("T26: handles stainless steel (ISO M) with correct parameters", () => {
    const input = makeSafeProgramInput({ material: STAINLESS_MATERIAL });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.success).toBe(true);
    // Stainless should have lower speeds than aluminum
    const vc = result.operations[0].cutting_params.cutting_speed_m_min;
    expect(vc).toBeLessThan(400); // M group is slower
  });

  it("T27: estimates stock size when not provided", () => {
    const input = makeBasicInput({ stock_size: undefined });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.setup_sheet.stock_size.x).toBeGreaterThan(0);
    expect(result.setup_sheet.stock_size.y).toBeGreaterThan(0);
    expect(result.setup_sheet.stock_size.z).toBeGreaterThan(0);
  });

  it("T28: thread feature gets drill + tap operations", () => {
    const input = makeBasicInput({
      features: [{
        id: "T1",
        type: "thread_internal",
        depth_mm: 15,
        diameter_mm: 10,
        thread_pitch_mm: 1.5,
        required_operations: [],
        priority: 0,
      }],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    const ops = result.operations.map(o => o.operation_type);
    expect(ops).toContain("drill");
    expect(ops).toContain("tap");
  });

  it("T29: large hole gets drill + bore", () => {
    const input = makeBasicInput({
      features: [makeHole("H1", 40, 20)],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    const ops = result.operations.map(o => o.operation_type);
    expect(ops).toContain("drill");
    expect(ops).toContain("bore");
  });

  it("T30: cycle time is positive and reasonable", () => {
    const input = makeBasicInput();
    const result = printToProgramPipelineEngine.runFullPipeline(input);
    expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
    expect(result.estimated_cycle_time_sec).toBeLessThan(36000); // < 10 hours sanity
  });
});
