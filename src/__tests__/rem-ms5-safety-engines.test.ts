/**
 * REM-MS5-U01: Safety-Critical Engine Unit Tests
 * ================================================
 * PostProcessorEngine, WorkEnvelopeValidatorEngine, RTCP_CompensationEngine
 * These are safety-critical — incorrect output can cause machine crashes.
 */
import { describe, it, expect } from "vitest";
import {
  PostProcessorEngine,
  postProcessorEngine,
} from "../engines/PostProcessorEngine.js";
import type {
  PostInput,
  PostConfig,
  PostMove,
} from "../engines/PostProcessorEngine.js";
import {
  WorkEnvelopeValidatorEngine,
  workEnvelopeValidatorEngine,
} from "../engines/WorkEnvelopeValidatorEngine.js";
import type {
  EnvelopeInput,
  AxisLimits,
} from "../engines/WorkEnvelopeValidatorEngine.js";
import {
  RTCP_CompensationEngine,
  rtcpCompensationEngine,
} from "../engines/RTCP_CompensationEngine.js";
import type { RTCPInput } from "../engines/RTCP_CompensationEngine.js";

// ── Helper factories ────────────────────────────────────────────────────────

function makePostInput(overrides?: Partial<PostInput>): PostInput {
  return {
    moves: [
      { type: "rapid", x: 0, y: 0, z: 50 },
      { type: "feed", x: 100, y: 50, z: -5, feed: 200 },
      { type: "rapid", x: 0, y: 0, z: 50 },
    ],
    tool_number: 1,
    tool_diameter_mm: 12,
    spindle_rpm: 3000,
    feed_rate_mmmin: 500,
    coolant: "flood",
    work_offset: "G54",
    ...overrides,
  };
}

function makePostConfig(
  overrides?: Partial<PostConfig>
): PostConfig {
  return {
    controller: "fanuc",
    use_canned_cycles: true,
    use_tool_length_comp: true,
    decimal_places: 3,
    line_numbers: false,
    line_number_increment: 10,
    coolant_code: "M08",
    safe_start_block: true,
    program_end: "M30",
    ...overrides,
  };
}

function makeEnvelopeInput(
  overrides?: Partial<EnvelopeInput>
): EnvelopeInput {
  return {
    axis_limits: {
      X_min_mm: -500, X_max_mm: 500,
      Y_min_mm: -300, Y_max_mm: 300,
      Z_min_mm: -200, Z_max_mm: 0,
    },
    toolpath_points: [
      { X: 0, Y: 0, Z: -10 },
      { X: 100, Y: 50, Z: -30 },
      { X: -100, Y: -50, Z: -5 },
    ],
    tool_length_mm: 100,
    workpiece_height_mm: 50,
    fixture_height_mm: 30,
    safety_margin_mm: 5,
    ...overrides,
  };
}

function makeRTCPInput(
  overrides?: Partial<RTCPInput>
): RTCPInput {
  return {
    kinematic_type: "table_table",
    pivot_to_gauge_mm: 200,
    pivot_to_table_mm: 150,
    tool_length_mm: 80,
    tool_gauge_length_mm: 75,
    A_deg: 0,
    C_deg: 0,
    X_mm: 100,
    Y_mm: 50,
    Z_mm: -20,
    tolerance_mm: 0.01,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// POST PROCESSOR ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe("PostProcessorEngine", () => {
  it("singleton exists", () => {
    expect(postProcessorEngine).toBeInstanceOf(PostProcessorEngine);
  });

  describe("Fanuc output", () => {
    it("generates valid G-code with safe start block", () => {
      const result = postProcessorEngine.process(
        makePostInput(),
        makePostConfig()
      );
      expect(result.controller).toBe("fanuc");
      expect(result.gcode).toContain("G90");      // absolute mode
      expect(result.gcode).toContain("G54");       // work offset
      expect(result.gcode).toContain("M30");       // program end
      expect(result.line_count).toBeGreaterThan(5);
    });

    it("includes tool change", () => {
      const result = postProcessorEngine.process(
        makePostInput({ tool_number: 5 }),
        makePostConfig()
      );
      expect(result.gcode).toContain("T5");
      expect(result.gcode).toMatch(/S3000/);
    });

    it("includes coolant codes", () => {
      const result = postProcessorEngine.process(
        makePostInput({ coolant: "flood" }),
        makePostConfig()
      );
      expect(result.gcode).toMatch(/M0?8/);        // coolant on
      expect(result.gcode).toMatch(/M0?9/);        // coolant off
    });
  });

  describe("Multi-controller support", () => {
    const controllers = [
      "fanuc", "haas", "siemens",
      "heidenhain", "mazak", "okuma",
    ] as const;

    for (const ctrl of controllers) {
      it(`generates G-code for ${ctrl}`, () => {
        const result = postProcessorEngine.process(
          makePostInput(),
          makePostConfig({ controller: ctrl })
        );
        expect(result.controller).toBe(ctrl);
        expect(result.gcode.length).toBeGreaterThan(50);
        expect(result.line_count).toBeGreaterThan(3);
        expect(result.warnings).toBeInstanceOf(Array);
      });
    }
  });

  describe("Canned cycles", () => {
    it("generates drill canned cycle", () => {
      const moves: PostMove[] = [
        { type: "rapid", x: 10, y: 10, z: 5 },
        { type: "drill", x: 10, y: 10, z: -15 },
        { type: "rapid", x: 0, y: 0, z: 50 },
      ];
      const result = postProcessorEngine.process(
        makePostInput({ moves }),
        makePostConfig({ use_canned_cycles: true })
      );
      expect(result.gcode).toMatch(/G8[1-3]/);  // drill cycle
      expect(result.canned_cycles_used.length).toBeGreaterThan(0);
    });

    it("generates tap cycle with pitch", () => {
      const moves: PostMove[] = [
        { type: "rapid", x: 20, y: 20, z: 5 },
        { type: "tap", x: 20, y: 20, z: -10, pitch: 1.25 },
        { type: "rapid", x: 0, y: 0, z: 50 },
      ];
      const result = postProcessorEngine.process(
        makePostInput({ moves }),
        makePostConfig({ use_canned_cycles: true })
      );
      expect(result.gcode).toContain("G84");  // tapping cycle
    });
  });

  describe("5-axis TCPM", () => {
    it("generates TCPM activation for supported controllers", () => {
      const moves: PostMove[] = [
        { type: "rapid", x: 0, y: 0, z: 50 },
        { type: "feed", x: 50, y: 0, z: -10, a: 15, c: 45 },
      ];
      const result = postProcessorEngine.process(
        makePostInput({ moves }),
        makePostConfig({ five_axis_mode: "tcpm" })
      );
      // Should contain TCPM-related G-code
      expect(result.gcode).toMatch(
        /G43\.4|G234|TRAORI|M128|TCPM/i
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WORK ENVELOPE VALIDATOR ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe("WorkEnvelopeValidatorEngine", () => {
  it("singleton exists", () => {
    expect(workEnvelopeValidatorEngine).toBeInstanceOf(
      WorkEnvelopeValidatorEngine
    );
  });

  describe("Valid toolpath", () => {
    it("passes toolpath within limits", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput()
      );
      expect(result.is_valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it("returns bounding box", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput()
      );
      expect(result.bounding_box).toBeDefined();
      expect(result.bounding_box.X_min).toBeLessThanOrEqual(
        result.bounding_box.X_max
      );
      expect(result.bounding_box.Z_min).toBeLessThanOrEqual(
        result.bounding_box.Z_max
      );
    });

    it("returns utilization percentages", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput()
      );
      expect(result.utilization.X_pct).toBeGreaterThanOrEqual(0);
      expect(result.utilization.X_pct).toBeLessThanOrEqual(100);
      expect(result.utilization.Y_pct).toBeGreaterThanOrEqual(0);
      expect(result.utilization.Z_pct).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Violation detection", () => {
    it("detects X-axis overshoot", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput({
          toolpath_points: [
            { X: 0, Y: 0, Z: -10 },
            { X: 600, Y: 0, Z: -10 }, // exceeds X_max=500
          ],
        })
      );
      expect(result.is_valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      const xViolation = result.violations.find(
        (v) => v.axis === "X"
      );
      expect(xViolation).toBeDefined();
      expect(xViolation!.overshoot_mm_or_deg).toBeGreaterThan(0);
    });

    it("detects Z-axis violation", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput({
          toolpath_points: [
            { X: 0, Y: 0, Z: -300 }, // exceeds Z_min=-200
          ],
        })
      );
      expect(result.is_valid).toBe(false);
      const zViolation = result.violations.find(
        (v) => v.axis === "Z"
      );
      expect(zViolation).toBeDefined();
    });

    it("detects rapid move violations as critical", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput({
          toolpath_points: [
            { X: 600, Y: 0, Z: -10, is_rapid: true },
          ],
        })
      );
      expect(result.is_valid).toBe(false);
      const violation = result.violations[0];
      expect(violation.is_rapid).toBe(true);
      expect(violation.severity).toBe("critical");
    });
  });

  describe("C-axis limits (C-001 fix)", () => {
    it("validates C-axis within limits", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput({
          axis_limits: {
            X_min_mm: -500, X_max_mm: 500,
            Y_min_mm: -300, Y_max_mm: 300,
            Z_min_mm: -200, Z_max_mm: 0,
            C_min_deg: -360, C_max_deg: 360,
          },
          toolpath_points: [
            { X: 0, Y: 0, Z: -10, C: 45 },
            { X: 50, Y: 50, Z: -20, C: 180 },
          ],
        })
      );
      expect(result.is_valid).toBe(true);
    });

    it("flags C-axis beyond limits", () => {
      const result = workEnvelopeValidatorEngine.validate(
        makeEnvelopeInput({
          axis_limits: {
            X_min_mm: -500, X_max_mm: 500,
            Y_min_mm: -300, Y_max_mm: 300,
            Z_min_mm: -200, Z_max_mm: 0,
            C_min_deg: -180, C_max_deg: 180,
          },
          toolpath_points: [
            { X: 0, Y: 0, Z: -10, C: 270 },
          ],
        })
      );
      expect(result.is_valid).toBe(false);
      expect(
        result.violations.some((v) => v.axis === "C")
      ).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RTCP COMPENSATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe("RTCP_CompensationEngine", () => {
  it("singleton exists", () => {
    expect(rtcpCompensationEngine).toBeInstanceOf(
      RTCP_CompensationEngine
    );
  });

  describe("Zero-angle compensation", () => {
    it("returns zero compensation at A=0 C=0", () => {
      const result = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 0, C_deg: 0 })
      );
      expect(result.compensated_X_mm).toBeCloseTo(100, 1);
      expect(result.compensated_Y_mm).toBeCloseTo(50, 1);
      expect(result.is_within_tolerance).toBe(true);
      expect(result.kinematic_chain).toBeDefined();
    });
  });

  describe("Tilted compensation", () => {
    it("compensates for A-axis tilt", () => {
      const zeroResult = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 0, C_deg: 0 })
      );
      const tiltedResult = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 30, C_deg: 0 })
      );
      // Compensation should differ when tilted
      const dx = Math.abs(
        tiltedResult.compensation_vector.dx -
        zeroResult.compensation_vector.dx
      );
      const dz = Math.abs(
        tiltedResult.compensation_vector.dz -
        zeroResult.compensation_vector.dz
      );
      expect(dx + dz).toBeGreaterThan(0);
    });

    it("compensates for C-axis rotation", () => {
      const zeroResult = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 15, C_deg: 0 })
      );
      const rotatedResult = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 15, C_deg: 90 })
      );
      // C rotation should shift X/Y compensation
      expect(
        rotatedResult.compensated_X_mm
      ).not.toBeCloseTo(zeroResult.compensated_X_mm, 0);
    });
  });

  describe("Kinematic types", () => {
    const types = [
      "table_table",
      "head_head",
      "mixed_AC",
      "mixed_BC",
      "head_table",
    ] as const;

    for (const kt of types) {
      it(`handles ${kt} kinematics`, () => {
        const result = rtcpCompensationEngine.compensate(
          makeRTCPInput({
            kinematic_type: kt,
            A_deg: 15,
            C_deg: 30,
          })
        );
        expect(result.kinematic_chain).toBeDefined();
        expect(result.compensation_vector).toBeDefined();
        expect(typeof result.compensated_X_mm).toBe("number");
        expect(typeof result.compensated_Z_mm).toBe("number");
      });
    }
  });

  describe("Validation", () => {
    it("validates within axis limits", () => {
      const result = rtcpCompensationEngine.validate(
        makeRTCPInput({ A_deg: 10, C_deg: 30 }),
        { A_min: -120, A_max: 120, C_min: -360, C_max: 360 }
      );
      expect(result.safe).toBe(true);
      expect(result.axis_limits_ok).toBe(true);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it("flags axis limits exceeded", () => {
      const result = rtcpCompensationEngine.validate(
        makeRTCPInput({ A_deg: 150, C_deg: 30 }),
        { A_min: -120, A_max: 120, C_min: -360, C_max: 360 }
      );
      expect(result.axis_limits_ok).toBe(false);
    });

    it("detects singularity risk near A=0 (C-axis degeneracy)", () => {
      const result = rtcpCompensationEngine.validate(
        makeRTCPInput({ A_deg: 0.2, C_deg: 45 }),
        { A_min: -120, A_max: 120, C_min: -360, C_max: 360 }
      );
      expect(result.singularity_risk).toBe(true);
    });
  });

  describe("Error magnitude", () => {
    it("reports larger error for larger angles", () => {
      const small = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 5, C_deg: 0 })
      );
      const large = rtcpCompensationEngine.compensate(
        makeRTCPInput({ A_deg: 45, C_deg: 0 })
      );
      expect(
        large.tool_tip_error_without_rtcp_mm
      ).toBeGreaterThan(
        small.tool_tip_error_without_rtcp_mm
      );
    });
  });
});
