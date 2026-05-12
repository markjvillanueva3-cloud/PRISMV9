/**
 * LatheQualityGateEngine Tests
 * ============================
 *
 * Comprehensive tests for PhD-level lathe program quality validation.
 */

import { describe, it, expect } from "vitest";
import {
  latheQualityGateEngine,
  type ValidationContext,
  type QualityGateMachine,
  type QualityGatePart,
  type QualityGateOperation,
  type QualityGateWorkholding,
} from "../engines/LatheQualityGateEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestMachine = (overrides?: Partial<QualityGateMachine>): QualityGateMachine => ({
  machine_id: "LTH-01",
  brand: "Okuma",
  model: "GENOS L300-M",
  controller: "okuma",
  max_spindle_rpm: 5000,
  spindle_power_kw: 15,
  spindle_torque_nm: 286,
  max_bar_od_mm: 65,
  max_turning_diameter_mm: 340,
  max_turning_length_mm: 500,
  live_tooling: true,
  c_axis: true,
  y_axis: false,
  sub_spindle: false,
  tailstock: true,
  ...overrides,
});

const createTestPart = (overrides?: Partial<QualityGatePart>): QualityGatePart => ({
  name: "Test Punch",
  part_number: "PN-001",
  material: {
    name: "D2 Tool Steel",
    iso_group: "H",
    hardness_hrc: 58,
    kc1_1_mpa: 3200,
    mc_exponent: 0.30,
    e_gpa: 210,
  },
  stock_diameter_mm: 50,
  finished_diameter_mm: 48,
  length_mm: 100,
  overhang_from_chuck_mm: 80,
  customer: "Alcoa",
  jm_die_category: "punch",
  ...overrides,
});

const createTestWorkholding = (overrides?: Partial<QualityGateWorkholding>): QualityGateWorkholding => ({
  type: "3_jaw",
  jaw_type: "hard",
  grip_length_mm: 30,
  grip_diameter_mm: 50,
  tailstock_engaged: false,
  steady_rest_engaged: false,
  ...overrides,
});

const createTestOperation = (overrides?: Partial<QualityGateOperation>): QualityGateOperation => ({
  operation_id: "OP-001",
  type: "od_rough",
  tool: {
    tool_id: "T01",
    tool_type: "external",
    insert_shape: "C",
    nose_radius_mm: 0.8,
    holder_style: "PCLNR",
    insert_grade: "GC4325",
    coating: "CVD",
    orientation: 3,
  },
  params: {
    cutting_speed_m_min: 100,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2.0,
    coolant: "flood",
  },
  start_z_mm: 0,
  end_z_mm: -80,
  start_diameter_mm: 50,
  end_diameter_mm: 48,
  stock_allowance_mm: 0.5,
  ...overrides,
});

const createTestContext = (overrides?: Partial<ValidationContext>): ValidationContext => ({
  program_name: "TEST_PROGRAM_001",
  machine: createTestMachine(),
  workholding: createTestWorkholding(),
  part: createTestPart(),
  operations: [createTestOperation()],
  target_cycle_time_min: 5,
  target_tool_life_min: 30,
  is_production_run: false,
  customer_spec_level: "standard",
  ...overrides,
});

// ============================================================================
// SAFETY GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Safety Gate", () => {
  it("should detect missing G50 spindle limit", () => {
    const program = `
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.spindle_limit_present).toBe(false);
    expect(report.critical_failures).toContain("Missing G50 spindle limit — spindle may overspeed on small diameters");
    expect(report.overall_status).toBe("fail");
  });

  it("should pass when G50 is present", () => {
    const program = `
      G50 S3500
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.spindle_limit_present).toBe(true);
    expect(report.checks.find(c => c.check_id === "SAFETY_001")?.status).toBe("pass");
  });

  it("should detect missing program end (M30/M02)", () => {
    const program = `
      G50 S3500
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.program_end_present).toBe(false);
    expect(report.critical_failures).toContain("Missing program end (M30/M02) — program may run into unintended code");
  });

  it("should accept M02 as program end", () => {
    const program = `
      G50 S3500
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
      M02
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.program_end_present).toBe(true);
  });

  it("should detect tool compensation not canceled", () => {
    const program = `
      G50 S3500
      G96 S150
      G42
      G0 X50 Z2
      G1 Z-80 F0.25
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.tool_compensation_correct).toBe(false);
    expect(report.critical_failures).toContain("Tool compensation (G41/G42) not canceled with G40");
  });

  it("should pass when tool compensation is properly canceled", () => {
    const program = `
      G50 S3500
      G96 S150
      G42
      G0 X50 Z2
      G1 Z-80 F0.25
      G40
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.tool_compensation_correct).toBe(true);
  });

  it("should warn about coolant ON without OFF", () => {
    const program = `
      G50 S3500
      G96 S150
      M8
      G0 X50 Z2
      G1 Z-80 F0.25
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.coolant_control_correct).toBe(false);
    expect(report.warnings).toContain("Coolant ON (M8) without corresponding OFF (M9)");
  });

  it("should detect CSS mode without G50 as critical", () => {
    const program = `
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
      M30
    `;
    const report = latheQualityGateEngine.validateSafety(program);

    expect(report.critical_failures).toContain("CSS mode (G96) without spindle limit (G50) — DANGEROUS");
  });
});

// ============================================================================
// PARAMETER GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Parameter Gate", () => {
  it("should validate cutting speed within ISO limits", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100, // Within H group limits (50-150)
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.speed_within_limits).toBe(true);
  });

  it("should flag cutting speed exceeding ISO limits", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 300, // Exceeds H group max_rough (150)
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.speed_within_limits).toBe(false);
  });

  it("should validate feed rate appropriateness", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.15, // Within H group limits
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.feed_appropriate).toBe(true);
  });

  it("should flag excessive feed rate", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.5, // Exceeds H group max_rough (0.2)
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.feed_appropriate).toBe(false);
  });

  it("should check nose radius adequacy for surface finish", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        type: "od_finish",
        tool: {
          tool_id: "T02",
          tool_type: "external",
          nose_radius_mm: 0.4, // Small nose radius
        },
        params: {
          cutting_speed_m_min: 120,
          feed_mm_rev: 0.2, // High feed for small radius
          depth_of_cut_mm: 0.3,
        },
        target_ra_um: 0.8, // Tight Ra target
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    // Ra = fn^2 / (32 * r) = 0.2^2 / (32 * 0.4) = 0.04 / 12.8 = 0.003125 mm = 3.125 um
    // This exceeds 0.8 um target
    expect(report.critical_failures.some(f => f.includes("Cannot achieve Ra"))).toBe(true);
  });
});

// ============================================================================
// SEQUENCE GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Sequence Gate", () => {
  it("should validate correct operation sequence", () => {
    const operations: QualityGateOperation[] = [
      createTestOperation({ operation_id: "OP-001", type: "face_rough" }),
      createTestOperation({ operation_id: "OP-002", type: "od_rough" }),
      createTestOperation({ operation_id: "OP-003", type: "od_finish" }),
      createTestOperation({ operation_id: "OP-004", type: "parting" }),
    ];

    const report = latheQualityGateEngine.validateSequence(operations);
    expect(report.logical_order_correct).toBe(true);
    expect(report.overall_status).not.toBe("fail");
  });

  it("should detect operations after parting", () => {
    const operations: QualityGateOperation[] = [
      createTestOperation({ operation_id: "OP-001", type: "od_rough" }),
      createTestOperation({ operation_id: "OP-002", type: "parting" }),
      createTestOperation({ operation_id: "OP-003", type: "od_finish" }), // After parting!
    ];

    const report = latheQualityGateEngine.validateSequence(operations);
    expect(report.critical_failures).toContain("Operations after parting — part will be detached");
    expect(report.overall_status).toBe("fail");
  });

  it("should detect finishing before roughing", () => {
    const operations: QualityGateOperation[] = [
      createTestOperation({ operation_id: "OP-001", type: "od_finish" }),
      createTestOperation({ operation_id: "OP-002", type: "od_rough" }),
    ];

    const report = latheQualityGateEngine.validateSequence(operations);
    expect(report.critical_failures).toContain("Finishing before roughing — will leave excess material");
  });

  it("should validate threading after roughing", () => {
    const operations: QualityGateOperation[] = [
      createTestOperation({ operation_id: "OP-001", type: "od_rough" }),
      createTestOperation({ operation_id: "OP-002", type: "od_finish" }),
      createTestOperation({ operation_id: "OP-003", type: "od_thread" }),
    ];

    const report = latheQualityGateEngine.validateSequence(operations);
    const threadCheck = report.checks.find(c => c.check_id === "SEQ_006");
    expect(threadCheck?.status).toBe("pass");
  });

  it("should verify stock allowances are consistent", () => {
    const operations: QualityGateOperation[] = [
      createTestOperation({
        operation_id: "OP-001",
        type: "od_rough",
        stock_allowance_mm: 0.5,
      }),
      createTestOperation({
        operation_id: "OP-002",
        type: "od_finish",
        params: { cutting_speed_m_min: 120, feed_mm_rev: 0.1, depth_of_cut_mm: 0.5 },
      }),
    ];

    const report = latheQualityGateEngine.validateSequence(operations);
    expect(report.stock_allowances_correct).toBe(true);
  });
});

// ============================================================================
// PHYSICS GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Physics Gate", () => {
  it("should calculate Kienzle cutting force correctly", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.cutting_force_n).toBeGreaterThan(0);
    // Fc = kc1_1 * ap * fn^(1-mc) for H group
    // kc = 3200 * 0.25^(-0.30) = 3200 * 1.516 = 4851 N/mm²
    // Fc = 4851 * 2.0 * 0.25 = 2425.5 N
    expect(report.cutting_force_n).toBeGreaterThan(1000);
  });

  it("should detect power exceeding machine capacity", () => {
    const context = createTestContext({
      machine: createTestMachine({ spindle_power_kw: 5 }), // Low power machine
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 200, // High speed
          feed_mm_rev: 0.4,
          depth_of_cut_mm: 4.0, // Aggressive cut
        },
      })],
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.within_machine_limits).toBe(false);
    expect(report.critical_failures.some(f => f.includes("Power demand"))).toBe(true);
  });

  it("should calculate tool life using Taylor equation", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100, // Moderate speed
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.tool_life_min).toBeGreaterThan(0);
    // T = (C/Vc)^(1/n) for H group: C=200, n=0.20
    // T = (200/100)^(1/0.20) = 2^5 = 32 min
    expect(report.tool_life_min).toBeGreaterThan(20);
  });

  it("should check workpiece deflection for cantilever setup", () => {
    const context = createTestContext({
      workholding: createTestWorkholding({ tailstock_engaged: false }),
      part: createTestPart({ overhang_from_chuck_mm: 120 }), // Long overhang
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.deflection_mm).toBeGreaterThan(0);
    // Long cantilever should have measurable deflection
    expect(report.deflection_mm).toBeGreaterThan(0.001);
  });

  it("should recommend tailstock for high L/D ratio", () => {
    const context = createTestContext({
      workholding: createTestWorkholding({ tailstock_engaged: false }),
      part: createTestPart({
        stock_diameter_mm: 20,
        overhang_from_chuck_mm: 100, // L/D = 5
      }),
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.warnings.some(w => w.includes("L/D ratio") && w.includes("tailstock"))).toBe(true);
    expect(report.recommendations).toContain("Engage tailstock for improved rigidity");
  });

  it("should validate grip length ratio", () => {
    const context = createTestContext({
      workholding: createTestWorkholding({
        grip_length_mm: 10, // Too short
        grip_diameter_mm: 50,
      }),
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    const gripCheck = report.checks.find(c => c.check_id === "PHYS_GRIP_RATIO");
    expect(gripCheck?.status).toBe("warn");
  });
});

// ============================================================================
// QUALITY GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Quality Gate", () => {
  it("should predict surface finish using Ra formula", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        type: "od_finish",
        tool: { tool_id: "T01", tool_type: "external", nose_radius_mm: 0.8 },
        params: {
          cutting_speed_m_min: 120,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.3,
        },
        target_ra_um: 1.6,
      })],
    });

    const report = latheQualityGateEngine.validateQuality(context);
    // Ra = fn^2 / (32 * r) = 0.1^2 / (32 * 0.8) = 0.01 / 25.6 = 0.00039 mm = 0.39 um
    // With material factor for H group (~1.1): 0.39 * 1.1 = 0.43 um
    expect(report.predicted_ra_um).toBeLessThan(1.6);
    expect(report.gdt_compliant).toBe(true);
  });

  it("should fail when Ra target is unachievable", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        type: "od_finish",
        tool: { tool_id: "T01", tool_type: "external", nose_radius_mm: 0.4 },
        params: {
          cutting_speed_m_min: 120,
          feed_mm_rev: 0.3, // High feed
          depth_of_cut_mm: 0.3,
        },
        target_ra_um: 0.4, // Very tight target
      })],
    });

    const report = latheQualityGateEngine.validateQuality(context);
    // Ra = fn^2 / (32 * r) = 0.3^2 / (32 * 0.4) = 0.09 / 12.8 = 0.007 mm = 7 um
    expect(report.gdt_compliant).toBe(false);
    expect(report.critical_failures.some(f => f.includes("Cannot achieve Ra"))).toBe(true);
  });

  it("should consider tolerance achievability with deflection", () => {
    const context = createTestContext({
      workholding: createTestWorkholding({ tailstock_engaged: false }),
      part: createTestPart({ overhang_from_chuck_mm: 100 }),
      operations: [createTestOperation({
        type: "od_finish",
        params: {
          cutting_speed_m_min: 120,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.3,
        },
        target_tolerance_mm: 0.005, // Very tight
      })],
    });

    const report = latheQualityGateEngine.validateQuality(context);
    // With high deflection, tight tolerance may not be achievable
    expect(report.achievable_tolerance_mm).toBeGreaterThan(0);
  });
});

// ============================================================================
// SHOP GATE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Shop Gate", () => {
  it("should validate JM Die coolant standard", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
          coolant: "flood",
        },
      })],
    });

    const report = latheQualityGateEngine.validateShop(context);
    const coolantCheck = report.checks.find(c => c.check_id === "SHOP_001");
    expect(coolantCheck?.status).toBe("pass");
  });

  it("should warn about non-standard coolant", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
          coolant: "mist",
        },
      })],
    });

    const report = latheQualityGateEngine.validateShop(context);
    const coolantCheck = report.checks.find(c => c.check_id === "SHOP_001");
    expect(coolantCheck?.status).toBe("warn");
  });

  it("should check machine envelope", () => {
    const context = createTestContext({
      machine: createTestMachine({ max_bar_od_mm: 40 }),
      part: createTestPart({ stock_diameter_mm: 50 }), // Exceeds capacity
    });

    const report = latheQualityGateEngine.validateShop(context);
    expect(report.machine_capability_match).toBe(false);
    expect(report.critical_failures.some(f => f.includes("exceeds machine"))).toBe(true);
  });

  it("should check live tooling capability", () => {
    const context = createTestContext({
      machine: createTestMachine({ live_tooling: false, c_axis: false }),
      operations: [createTestOperation({ type: "live_milling" })],
    });

    const report = latheQualityGateEngine.validateShop(context);
    expect(report.machine_capability_match).toBe(false);
    expect(report.critical_failures.some(f => f.includes("live tooling"))).toBe(true);
  });

  it("should validate JM Die tool life standard", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateShop(context);
    const lifeCheck = report.checks.find(c => c.check_id === "SHOP_002");
    expect(lifeCheck).toBeDefined();
  });
});

// ============================================================================
// FULL VALIDATION TESTS
// ============================================================================

describe("LatheQualityGateEngine - Full Validation", () => {
  it("should produce complete validation report", () => {
    const program = `
      G50 S3500
      G96 S150
      M8
      G0 X52 Z2
      G71 U2.0 R1.0
      G71 P10 Q20 U0.5 W0.1 F0.25
      N10 G0 X48
      G1 Z-80
      N20 X50
      G70 P10 Q20
      G40
      M9
      M30
    `;

    const context = createTestContext();
    const report = latheQualityGateEngine.validateProgram(program, context);

    // Check structure
    expect(report.program_name).toBe("TEST_PROGRAM_001");
    expect(report.validation_timestamp).toBeDefined();
    expect(report.overall_score).toBeGreaterThanOrEqual(0);
    expect(report.overall_score).toBeLessThanOrEqual(100);
    expect(["pass", "warn", "fail"]).toContain(report.overall_status);

    // Check all gates present
    expect(report.safety_report).toBeDefined();
    expect(report.param_report).toBeDefined();
    expect(report.sequence_report).toBeDefined();
    expect(report.physics_report).toBeDefined();
    expect(report.quality_report).toBeDefined();
    expect(report.shop_report).toBeDefined();

    // Check recommendations generated
    expect(Array.isArray(report.all_recommendations)).toBe(true);
  });

  it("should fail overall when safety fails", () => {
    const program = `
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
    `;
    // Missing G50, M30 - multiple safety failures

    const context = createTestContext();
    const report = latheQualityGateEngine.validateProgram(program, context);

    expect(report.overall_status).toBe("fail");
    expect(report.program_approved).toBe(false);
    expect(report.critical_failures.length).toBeGreaterThan(0);
  });

  it("should generate prioritized recommendations", () => {
    const program = `
      G96 S150
      G0 X50 Z2
      G1 Z-80 F0.25
    `;

    const context = createTestContext();
    const report = latheQualityGateEngine.validateProgram(program, context);

    // Critical recommendations should come first
    if (report.all_recommendations.length > 0) {
      const criticalRecs = report.all_recommendations.filter(r => r.priority === "critical");
      if (criticalRecs.length > 0) {
        expect(report.all_recommendations[0].priority).toBe("critical");
      }
    }
  });

  it("should calculate weighted overall score", () => {
    const program = `
      G50 S3500
      G96 S150
      M8
      G0 X52 Z2
      G1 Z-80 F0.25
      M9
      M30
    `;

    const context = createTestContext();
    const report = latheQualityGateEngine.validateProgram(program, context);

    // Overall score should be weighted average of gate scores
    const weights = latheQualityGateEngine.getGateWeights();
    const expectedScore = Math.round(
      report.safety_report.score * weights.safety +
      report.param_report.score * weights.parameter +
      report.sequence_report.score * weights.sequence +
      report.physics_report.score * weights.physics +
      report.quality_report.score * weights.quality +
      report.shop_report.score * weights.shop
    );

    // Allow small rounding difference
    expect(Math.abs(report.overall_score - expectedScore)).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// UTILITY METHOD TESTS
// ============================================================================

describe("LatheQualityGateEngine - Utility Methods", () => {
  it("should perform quick safety check", () => {
    const safeProgram = `
      G50 S3500
      G96 S150
      G0 X50 Z2
      M30
    `;

    const unsafeProgram = `
      G96 S150
      G0 X50 Z2
    `;

    const safeResult = latheQualityGateEngine.quickSafetyCheck(safeProgram);
    const unsafeResult = latheQualityGateEngine.quickSafetyCheck(unsafeProgram);

    expect(safeResult.safe).toBe(true);
    expect(safeResult.issues.length).toBe(0);

    expect(unsafeResult.safe).toBe(false);
    expect(unsafeResult.issues.length).toBeGreaterThan(0);
    expect(unsafeResult.issues).toContain("Missing G50 spindle limit");
    expect(unsafeResult.issues).toContain("Missing program end (M30/M02)");
  });

  it("should return ISO speed ranges", () => {
    const roughRange = latheQualityGateEngine.getSpeedRange("P", true);
    const finishRange = latheQualityGateEngine.getSpeedRange("P", false);

    expect(roughRange.min).toBe(80);
    expect(roughRange.max).toBe(350);
    expect(finishRange.max).toBe(450);
    expect(finishRange.max).toBeGreaterThan(roughRange.max);
  });

  it("should return ISO feed ranges", () => {
    const roughRange = latheQualityGateEngine.getFeedRange("H", true);
    const finishRange = latheQualityGateEngine.getFeedRange("H", false);

    expect(roughRange.min).toBe(0.03);
    expect(roughRange.max).toBe(0.2);
    expect(finishRange.max).toBe(0.08);
    expect(finishRange.max).toBeLessThan(roughRange.max);
  });

  it("should calculate required nose radius for target Ra", () => {
    const targetRa = 1.6; // um
    const feed = 0.15; // mm/rev

    const requiredRadius = latheQualityGateEngine.calculateRequiredNoseRadius(targetRa, feed);

    // r = fn^2 / (32 * Ra) = 0.15^2 / (32 * 0.0016) = 0.0225 / 0.0512 = 0.44 mm
    expect(requiredRadius).toBeGreaterThan(0.4);
    expect(requiredRadius).toBeLessThan(0.5);
  });

  it("should calculate max feed for target Ra", () => {
    const targetRa = 1.6; // um
    const noseRadius = 0.8; // mm

    const maxFeed = latheQualityGateEngine.calculateMaxFeedForRa(targetRa, noseRadius);

    // fn = sqrt(32 * r * Ra) = sqrt(32 * 0.8 * 0.0016) = sqrt(0.041) = 0.202 mm/rev
    expect(maxFeed).toBeGreaterThan(0.15);
    expect(maxFeed).toBeLessThan(0.25);
  });

  it("should return surface finish limits by operation", () => {
    const roughLimits = latheQualityGateEngine.getSurfaceFinishLimits("od_rough");
    const finishLimits = latheQualityGateEngine.getSurfaceFinishLimits("od_finish");
    const boringLimits = latheQualityGateEngine.getSurfaceFinishLimits("boring");

    expect(roughLimits.typical_ra).toBeGreaterThan(finishLimits.typical_ra);
    expect(finishLimits.best_ra).toBeLessThan(roughLimits.best_ra);
    expect(boringLimits.best_ra).toBeLessThan(roughLimits.best_ra);
  });

  it("should return JM Die standards", () => {
    const standards = latheQualityGateEngine.getJMDieStandards();

    expect(standards.min_tool_life_min).toBe(30);
    expect(standards.max_surface_roughness_um).toBe(3.2);
    expect(standards.preferred_coolant).toBe("flood");
    expect(standards.punch_tolerance_mm).toBe(0.005);
  });

  it("should return engine version", () => {
    const version = latheQualityGateEngine.getVersion();
    expect(version).toBe("1.0.0");
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("LatheQualityGateEngine - Edge Cases", () => {
  it("should handle empty operations array", () => {
    const context = createTestContext({ operations: [] });
    const report = latheQualityGateEngine.validateParameters(context);

    expect(report.checks.length).toBe(0);
    expect(report.overall_status).not.toBe("fail");
  });

  it("should handle missing optional parameters", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 100,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 2.0,
          // No coolant specified
        },
        // No target_ra_um
        // No target_tolerance_mm
      })],
    });

    const physicsReport = latheQualityGateEngine.validatePhysics(context);
    expect(physicsReport).toBeDefined();
    expect(physicsReport.cutting_force_n).toBeGreaterThan(0);
  });

  it("should handle very small parameters", () => {
    const context = createTestContext({
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 10, // Very low speed
          feed_mm_rev: 0.01, // Very low feed
          depth_of_cut_mm: 0.1, // Very shallow cut
        },
      })],
    });

    const report = latheQualityGateEngine.validatePhysics(context);
    expect(report.cutting_force_n).toBeGreaterThan(0);
    expect(report.tool_life_min).toBeGreaterThan(0);
  });

  it("should handle aluminum material (high machinability)", () => {
    const context = createTestContext({
      part: createTestPart({
        material: {
          name: "6061-T6",
          iso_group: "N",
          kc1_1_mpa: 700,
          mc_exponent: 0.23,
          e_gpa: 70,
        },
      }),
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 500, // High speed for aluminum
          feed_mm_rev: 0.3,
          depth_of_cut_mm: 3.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.speed_within_limits).toBe(true);
  });

  it("should handle superalloy material (difficult machining)", () => {
    const context = createTestContext({
      part: createTestPart({
        material: {
          name: "Inconel 718",
          iso_group: "S",
          kc1_1_mpa: 2800,
          mc_exponent: 0.28,
          e_gpa: 200,
        },
      }),
      operations: [createTestOperation({
        params: {
          cutting_speed_m_min: 40, // Low speed for superalloy
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 1.0,
        },
      })],
    });

    const report = latheQualityGateEngine.validateParameters(context);
    expect(report.speed_within_limits).toBe(true);
    expect(report.feed_appropriate).toBe(true);
  });
});
