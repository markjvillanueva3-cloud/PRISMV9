/**
 * REM-MS0: Safety Fix Verification Tests
 *
 * Tests for CRITICAL/MAJOR safety fixes applied during QA audit and remediation:
 * - C-001: C-axis rotary limit check (WorkEnvelopeValidator)
 * - C-002: fixture_height_mm in Z limit (WorkEnvelopeValidator)
 * - C-003: Tap (G84) / Bore (G76) G-code output (PostProcessor)
 * - C-004: 5-axis TCPM G-code output (PostProcessor)
 * - M-001: RTCP is_within_tolerance actual evaluation
 * - M-002: G28 Z0 safe retract before tool change
 * - M-005: Thread stripping strength via dispatcher
 */
import { describe, it, expect } from "vitest";
import { workEnvelopeValidatorEngine } from "../engines/WorkEnvelopeValidatorEngine.js";
import { rtcpCompensationEngine } from "../engines/RTCP_CompensationEngine.js";
import { postProcessorEngine } from "../engines/PostProcessorEngine.js";
import { handleThreadTool } from "../tools/threadTools.js";

// ============================================================================
// C-001: C-axis rotary limit check
// ============================================================================
describe("C-001: C-axis rotary limit check", () => {
  it("detects C-axis overtravel beyond limits", () => {
    const r = workEnvelopeValidatorEngine.validate({
      axis_limits: {
        X_min_mm: -500, X_max_mm: 500,
        Y_min_mm: -400, Y_max_mm: 400,
        Z_min_mm: -300, Z_max_mm: 0,
        C_min_deg: -180, C_max_deg: 180,
      },
      toolpath_points: [
        { X: 0, Y: 0, Z: -50, C: 200 },  // C exceeds 180° limit
      ],
      tool_length_mm: 100, workpiece_height_mm: 50,
      fixture_height_mm: 0, safety_margin_mm: 5,
    });
    expect(r.is_valid).toBe(false);
    const cViolation = r.violations.find((v: any) => v.axis === "C");
    expect(cViolation).toBeDefined();
    expect(cViolation!.severity).toBe("critical");
  });

  it("passes when C-axis is within limits", () => {
    const r = workEnvelopeValidatorEngine.validate({
      axis_limits: {
        X_min_mm: -500, X_max_mm: 500,
        Y_min_mm: -400, Y_max_mm: 400,
        Z_min_mm: -300, Z_max_mm: 0,
        C_min_deg: -180, C_max_deg: 180,
      },
      toolpath_points: [
        { X: 0, Y: 0, Z: -50, C: 90 },  // C within limits
      ],
      tool_length_mm: 100, workpiece_height_mm: 50,
      fixture_height_mm: 0, safety_margin_mm: 5,
    });
    const cViolation = r.violations.find((v: any) => v.axis === "C");
    expect(cViolation).toBeUndefined();
  });
});

// ============================================================================
// C-002: fixture_height_mm in Z limit calculation
// ============================================================================
describe("C-002: fixture_height_mm in Z limit", () => {
  it("detects Z collision when fixture raises effective floor", () => {
    const r = workEnvelopeValidatorEngine.validate({
      axis_limits: {
        X_min_mm: -500, X_max_mm: 500,
        Y_min_mm: -400, Y_max_mm: 400,
        Z_min_mm: -300, Z_max_mm: 0,
      },
      toolpath_points: [
        { X: 0, Y: 0, Z: -250 },  // Would be OK without fixture, but with 100mm fixture → collision
      ],
      tool_length_mm: 100, workpiece_height_mm: 50,
      fixture_height_mm: 100,  // 100mm fixture raises Z floor
      safety_margin_mm: 5,
    });
    expect(r.is_valid).toBe(false);
    const zViolation = r.violations.find((v: any) => v.axis === "Z");
    expect(zViolation).toBeDefined();
  });
});

// ============================================================================
// C-003: Tap (G84) and Bore (G76) G-code output
// ============================================================================
describe("C-003: Tap and bore G-code output", () => {
  const baseInput = {
    tool_number: 5, tool_diameter_mm: 10,
    spindle_rpm: 500, feed_rate_mmmin: 200,
    coolant: "flood" as const, work_offset: "G54",
  };

  it("generates G84 tapping cycle", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [
        { type: "rapid" as const, x: 10, y: 20, z: 5 },
        { type: "tap" as const, z: -15, pitch: 1.5 },
      ]},
      { controller: "fanuc", use_canned_cycles: true, decimal_places: 3,
        line_numbers: false, line_number_increment: 10, coolant_code: "M08",
        safe_start_block: true, program_end: "M30", use_tool_length_comp: true }
    );
    expect(r.gcode).toContain("G84");
    expect(r.canned_cycles_used).toContain("G84");
  });

  it("generates G76 boring cycle", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [
        { type: "rapid" as const, x: 50, y: 50, z: 5 },
        { type: "bore" as const, z: -30, feed: 100 },
      ]},
      { controller: "fanuc", use_canned_cycles: true, decimal_places: 3,
        line_numbers: false, line_number_increment: 10, coolant_code: "M08",
        safe_start_block: true, program_end: "M30", use_tool_length_comp: true }
    );
    expect(r.gcode).toContain("G76");
    expect(r.canned_cycles_used).toContain("G76");
  });

  it("warns on unknown move type instead of silently dropping", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [
        { type: "unknown_type" as any, x: 10, y: 20, z: -5 },
      ]},
      { controller: "fanuc", use_canned_cycles: true, decimal_places: 3,
        line_numbers: false, line_number_increment: 10, coolant_code: "M08",
        safe_start_block: true, program_end: "M30", use_tool_length_comp: true }
    );
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.gcode).toContain("UNSUPPORTED");
  });
});

// ============================================================================
// C-004: 5-axis TCPM G-code output
// ============================================================================
describe("C-004: 5-axis TCPM G-code", () => {
  const baseInput = {
    tool_number: 1, tool_diameter_mm: 10,
    spindle_rpm: 8000, feed_rate_mmmin: 3000,
    coolant: "flood" as const, work_offset: "G54",
  };
  const baseConfig = {
    use_canned_cycles: false, decimal_places: 3,
    line_numbers: false, line_number_increment: 10, coolant_code: "M08",
    safe_start_block: true, program_end: "M30", use_tool_length_comp: true,
    five_axis_mode: "tcpm" as const,
  };

  it("Fanuc: outputs G43.4 for TCPM", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 50, y: 30, z: -10, a: 15, c: 45 }] },
      { ...baseConfig, controller: "fanuc" }
    );
    expect(r.gcode).toContain("G43.4");
    expect(r.gcode).toContain("A15.000");
    expect(r.gcode).toContain("C45.000");
  });

  it("Heidenhain: outputs M128/M129 for TCPM", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "feed" as const, x: 50, y: 30, z: -10, b: 20, c: 60 }] },
      { ...baseConfig, controller: "heidenhain" }
    );
    expect(r.gcode).toContain("M128");
    expect(r.gcode).toContain("B20.000");
    expect(r.gcode).toContain("C60.000");
  });

  it("Siemens: outputs TRAORI for TCPM", () => {
    const r = postProcessorEngine.process(
      { ...baseInput, moves: [{ type: "rapid" as const, x: 0, y: 0, z: 10, b: 0, c: 0 }] },
      { ...baseConfig, controller: "siemens" }
    );
    expect(r.gcode).toContain("TRAORI");
  });
});

// ============================================================================
// M-001: RTCP is_within_tolerance actual evaluation
// ============================================================================
describe("M-001: RTCP tolerance evaluation", () => {
  const baseInput = {
    kinematic_type: "BC_head" as const,
    pivot_to_gauge_mm: 300, pivot_to_table_mm: 500,
    tool_length_mm: 150, tool_gauge_length_mm: 150,
    A_deg: 0, C_deg: 0, X_mm: 100, Y_mm: 50, Z_mm: 0,
  };

  it("returns true when error is within default 0.01mm tolerance", () => {
    // Zero tilt = zero error
    const r = rtcpCompensationEngine.compensate({ ...baseInput, B_deg: 0 });
    expect(r.is_within_tolerance).toBe(true);
  });

  it("returns false when error exceeds tight tolerance", () => {
    // Large tilt creates RTCP error exceeding 0.001mm tolerance
    const r = rtcpCompensationEngine.compensate({
      ...baseInput, B_deg: 45, tolerance_mm: 0.001,
    });
    // 45° tilt with 300mm pivot creates significant compensation
    expect(r.tool_tip_error_without_rtcp_mm).toBeGreaterThan(0.001);
    expect(r.is_within_tolerance).toBe(false);
  });
});

// ============================================================================
// M-002: G28 Z0 safe retract before tool change
// ============================================================================
describe("M-002: G28 Z0 safe retract", () => {
  it("outputs G28 Z0 before tool change", () => {
    const r = postProcessorEngine.process(
      {
        tool_number: 3, tool_diameter_mm: 12,
        spindle_rpm: 2000, feed_rate_mmmin: 500,
        coolant: "flood", work_offset: "G54",
        moves: [{ type: "feed" as const, x: 10, y: 10, z: -5 }],
      },
      { controller: "fanuc", use_canned_cycles: true, decimal_places: 3,
        line_numbers: false, line_number_increment: 10, coolant_code: "M08",
        safe_start_block: true, program_end: "M30", use_tool_length_comp: true }
    );
    const lines = r.gcode.split("\n");
    const g28Idx = lines.findIndex(l => l.includes("G28 Z0"));
    const toolIdx = lines.findIndex(l => l.includes("M06") || l.includes("M6"));
    expect(g28Idx).toBeGreaterThan(-1);
    expect(toolIdx).toBeGreaterThan(-1);
    expect(g28Idx).toBeLessThan(toolIdx);  // G28 Z0 must come BEFORE tool change
  });
});

// ============================================================================
// M-005: Thread stripping strength via dispatcher routing
// ============================================================================
describe("M-005: Thread stripping strength", () => {
  it("calculates stripping strength for M10x1.5", async () => {
    const r = await handleThreadTool("calculate_thread_stripping", {
      thread_designation: "M10x1.5",
      engagement_length: 15,
      tensile_strength_mpa: 600,
    });
    expect(r).toBeDefined();
    expect(r.error).toBeUndefined();
  });
});
