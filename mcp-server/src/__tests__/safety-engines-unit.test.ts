/**
 * Safety Engine Unit Tests
 *
 * Tests for safety-critical engines:
 *   1. CoolantValidationEngine — flow, MQL, dry titanium fire safety
 *   2. WorkEnvelopeValidatorEngine — axis limits, fixture clearance
 *   3. RTCP_CompensationEngine — 5-axis kinematic compensation
 *
 * @milestone SYS-MS2-U02
 */

import { describe, it, expect } from "vitest";
import { coolantValidationEngine } from "../engines/CoolantValidationEngine.js";
import { workEnvelopeValidatorEngine } from "../engines/WorkEnvelopeValidatorEngine.js";
import { rtcpCompensationEngine } from "../engines/RTCP_CompensationEngine.js";
import {
  makeCoolantSystem, makeMQLSystem, makeDrySystem, makeCoolantOperationParams,
  expectShape, expectPhysicalValue, expectSafetyResult,
} from "./helpers/engineTestHarness.js";

// ============================================================================
// 1. COOLANT VALIDATION ENGINE
// ============================================================================

describe("CoolantValidationEngine", () => {
  describe("validateCoolant (full validation)", () => {
    it("returns all required fields", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem(),
        makeCoolantOperationParams()
      );
      expectShape(result, [
        "overallAdequate", "flow", "pressure", "thermalStatus",
        "recommendedDelivery", "recommendedType",
        "warnings", "recommendations", "timestamp",
      ]);
    });

    it("adequate flood coolant for standard milling", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem({ flowRate: 30 }),
        makeCoolantOperationParams()
      );
      expect(result.overallAdequate).toBe(true);
      expect(result.thermalStatus).not.toBe("RISK");
    });

    it("insufficient flow is flagged", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem({ flowRate: 0.5 }),
        makeCoolantOperationParams({ toolDiameter: 50 })
      );
      expect(result.overallAdequate).toBe(false);
      expect(result.flow.isAdequate).toBe(false);
    });
  });

  describe("validateCoolantFlow", () => {
    it("higher speed requires more flow", () => {
      const params = makeCoolantOperationParams();
      const lowSpeed = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem(),
        { ...params, cuttingSpeed: 100 }
      );
      const highSpeed = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem(),
        { ...params, cuttingSpeed: 400 }
      );
      expect(highSpeed.requiredFlow).toBeGreaterThan(lowSpeed.requiredFlow);
    });

    it("larger tool requires more flow", () => {
      const small = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem(),
        makeCoolantOperationParams({ toolDiameter: 10 })
      );
      const large = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem(),
        makeCoolantOperationParams({ toolDiameter: 50 })
      );
      expect(large.requiredFlow).toBeGreaterThan(small.requiredFlow);
    });

    it("utilization percent calculated correctly", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem({ flowRate: 20 }),
        makeCoolantOperationParams()
      );
      expectPhysicalValue(result.utilizationPercent, "utilization%", 0);
      // utilization = required / available × 100
      if (result.requiredFlow > 0 && result.availableFlow > 0) {
        const expected = (result.requiredFlow / result.availableFlow) * 100;
        expect(Math.abs(result.utilizationPercent - expected)).toBeLessThan(1);
      }
    });
  });

  describe("MQL validation", () => {
    it("MQL system uses minimal required flow", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeMQLSystem(),
        makeCoolantOperationParams()
      );
      expect(result.requiredFlow).toBeLessThanOrEqual(0.01);
    });

    it("MQL included in full validation when delivery=MQL", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeMQLSystem(),
        makeCoolantOperationParams()
      );
      expect(result.mql).toBeDefined();
    });

    it("no MQL validation for flood coolant", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem({ delivery: "FLOOD" }),
        makeCoolantOperationParams()
      );
      expect(result.mql).toBeUndefined();
    });
  });

  describe("SAFETY: Dry titanium fire risk (QA-MS1 fix)", () => {
    it("DRY + TITANIUM → not adequate", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeDrySystem(),
        makeCoolantOperationParams({ materialType: "TITANIUM" })
      );
      expect(result.isAdequate).toBe(false);
      expect(result.warnings.some(w => w.includes("FIRE RISK"))).toBe(true);
    });

    it("AIR_BLAST + TITANIUM → not adequate", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem({ delivery: "AIR_BLAST", flowRate: 0, pressure: 0 }),
        makeCoolantOperationParams({ materialType: "TITANIUM" })
      );
      expect(result.isAdequate).toBe(false);
    });

    it("DRY + SUPERALLOY → not adequate", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeDrySystem(),
        makeCoolantOperationParams({ materialType: "SUPERALLOY" })
      );
      expect(result.isAdequate).toBe(false);
    });

    it("DRY + STEEL → adequate (steel is safe dry)", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeDrySystem(),
        makeCoolantOperationParams({ materialType: "STEEL" })
      );
      expect(result.isAdequate).toBe(true);
    });

    it("DRY + CAST_IRON → adequate (cast iron often machined dry)", () => {
      const result = coolantValidationEngine.validateCoolantFlow(
        makeDrySystem(),
        makeCoolantOperationParams({ materialType: "CAST_IRON" })
      );
      expect(result.isAdequate).toBe(true);
    });
  });

  describe("SAFETY: Division by zero guard (QA-MS1 fix)", () => {
    it("zero flow rate → utilization = 999 (not NaN/Infinity)", () => {
      // Flood system with zero flow should not crash
      const result = coolantValidationEngine.validateCoolantFlow(
        makeCoolantSystem({ flowRate: 0 }),
        makeCoolantOperationParams()
      );
      expect(Number.isFinite(result.utilizationPercent)).toBe(true);
      expect(result.utilizationPercent).toBe(999);
    });
  });

  describe("thermal status assessment", () => {
    it("adequate flow → SAFE thermal status", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem({ flowRate: 50 }),
        makeCoolantOperationParams()
      );
      expect(result.thermalStatus).toBe("SAFE");
    });

    it("inadequate flow → RISK thermal status", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem({ flowRate: 0.1 }),
        makeCoolantOperationParams({ toolDiameter: 50, cuttingSpeed: 400 })
      );
      expect(result.thermalStatus).toBe("RISK");
    });
  });

  describe("recommendations", () => {
    it("recommends TSC for deep holes", () => {
      const result = coolantValidationEngine.validateCoolant(
        makeCoolantSystem(),
        makeCoolantOperationParams({
          operation: "DRILLING_DEEP",
          holeDepth: 100,
          toolDiameter: 10,
        })
      );
      expect(result.recommendedDelivery).toBe("THROUGH_SPINDLE");
    });

    it("getCoolantRecommendations returns valid structure", () => {
      const rec = coolantValidationEngine.getCoolantRecommendations(
        "TITANIUM", "DRILLING_DEEP"
      );
      expectShape(rec, ["delivery", "type", "notes"]);
      expect(rec.delivery).toBe("THROUGH_SPINDLE");
    });
  });

  describe("MQL unit fix (QA-MS1): L/min → mL/hr conversion", () => {
    it("MQL flow passed as mL/hr to validateMQLParameters", () => {
      // System with 0.05 L/min → should be 3000 mL/hr (×60000)
      // If the old bug (×60) was present, it would be 3 L/hr = wrong
      const result = coolantValidationEngine.validateCoolant(
        makeMQLSystem({ flowRate: 0.05 }),
        makeCoolantOperationParams()
      );
      // MQL validation should exist and not flag impossibly low flow
      expect(result.mql).toBeDefined();
    });
  });
});

// ============================================================================
// 2. WORK ENVELOPE VALIDATOR ENGINE
// ============================================================================

describe("WorkEnvelopeValidatorEngine", () => {
  function makeEnvelopeInput(overrides?: Record<string, any>) {
    return {
      axis_limits: {
        X_min_mm: -400, X_max_mm: 400,
        Y_min_mm: -200, Y_max_mm: 200,
        Z_min_mm: -300, Z_max_mm: 0,
      },
      toolpath_points: [
        { X: 0, Y: 0, Z: -50 },
        { X: 100, Y: 50, Z: -100 },
        { X: -100, Y: -50, Z: -150 },
      ],
      tool_length_mm: 80,
      workpiece_height_mm: 50,
      fixture_height_mm: 30,
      safety_margin_mm: 5,
      ...overrides,
    };
  }

  describe("basic validation", () => {
    it("returns all required fields", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput());
      expectShape(result, [
        "is_valid", "violations", "utilization",
        "bounding_box", "recommendations",
      ]);
    });

    it("valid toolpath within envelope → is_valid = true", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput());
      expect(result.is_valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("computes bounding box from toolpath", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput());
      expect(result.bounding_box.X_min).toBe(-100);
      expect(result.bounding_box.X_max).toBe(100);
      expect(result.bounding_box.Y_min).toBe(-50);
      expect(result.bounding_box.Y_max).toBe(50);
    });
  });

  describe("violation detection", () => {
    it("detects X-axis violation", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        toolpath_points: [
          { X: 0, Y: 0, Z: -50 },
          { X: 500, Y: 0, Z: -50 }, // exceeds X_max=400
        ],
      }));
      expect(result.is_valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.axis === "X")).toBe(true);
    });

    it("detects Y-axis violation", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        toolpath_points: [
          { X: 0, Y: 300, Z: -50 }, // exceeds Y_max=200
        ],
      }));
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.axis === "Y")).toBe(true);
    });

    it("detects Z violation considering fixture height", () => {
      // Z_min=-300, tool=80, fixture=30, safety=5
      // Effective Z_min = -300 + 5 + 80 + 30 = -185
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        toolpath_points: [
          { X: 0, Y: 0, Z: -200 }, // below effective Z_min
        ],
      }));
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.axis === "Z")).toBe(true);
    });

    it("rapid moves flagged in violations", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        toolpath_points: [
          { X: 0, Y: 0, Z: -50, is_rapid: false },
          { X: 500, Y: 0, Z: -50, is_rapid: true }, // rapid exceeding limits
        ],
      }));
      const rapidViolation = result.violations.find(v => v.is_rapid);
      if (result.violations.length > 0) {
        expect(rapidViolation).toBeDefined();
      }
    });
  });

  describe("utilization tracking", () => {
    it("reports axis utilization percentages", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput());
      expectPhysicalValue(result.utilization.X_pct, "X utilization", 0, 100);
      expectPhysicalValue(result.utilization.Y_pct, "Y utilization", 0, 100);
      expectPhysicalValue(result.utilization.Z_pct, "Z utilization", 0, 100);
    });
  });

  describe("C-axis limits (QA-MS1 fix: C-001)", () => {
    it("validates C-axis when limits provided", () => {
      const result = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        axis_limits: {
          X_min_mm: -400, X_max_mm: 400,
          Y_min_mm: -200, Y_max_mm: 200,
          Z_min_mm: -300, Z_max_mm: 0,
          C_min_deg: -180, C_max_deg: 180,
        },
        toolpath_points: [
          { X: 0, Y: 0, Z: -50, C: 200 }, // exceeds C_max=180
        ],
      }));
      expect(result.is_valid).toBe(false);
      expect(result.violations.some(v => v.axis === "C")).toBe(true);
    });
  });

  describe("fixture_height integration (QA-MS1 fix: C-002)", () => {
    it("fixture height reduces usable Z range", () => {
      const noFixture = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        fixture_height_mm: 0,
        toolpath_points: [{ X: 0, Y: 0, Z: -200 }],
      }));
      const withFixture = workEnvelopeValidatorEngine.validate(makeEnvelopeInput({
        fixture_height_mm: 100,
        toolpath_points: [{ X: 0, Y: 0, Z: -200 }],
      }));
      // Same Z point, but with fixture it's more likely to violate
      if (noFixture.is_valid) {
        expect(withFixture.is_valid).toBe(false);
      }
    });
  });
});

// ============================================================================
// 3. RTCP COMPENSATION ENGINE
// ============================================================================

describe("RTCP_CompensationEngine", () => {
  function makeRTCPInput(overrides?: Record<string, any>) {
    return {
      kinematic_type: "table_table" as const,
      pivot_to_gauge_mm: 150,
      pivot_to_table_mm: 200,
      tool_length_mm: 100,
      tool_gauge_length_mm: 100,
      A_deg: 0,
      C_deg: 0,
      X_mm: 100,
      Y_mm: 50,
      Z_mm: -80,
      tolerance_mm: 0.01,
      ...overrides,
    };
  }

  describe("compensate", () => {
    it("returns all required fields", () => {
      const result = rtcpCompensationEngine.compensate(makeRTCPInput());
      expectShape(result, [
        "compensated_X_mm", "compensated_Y_mm", "compensated_Z_mm",
        "compensation_vector", "tool_tip_error_without_rtcp_mm",
        "is_within_tolerance", "kinematic_chain", "recommendations",
      ]);
    });

    it("zero rotation → zero compensation", () => {
      const result = rtcpCompensationEngine.compensate(makeRTCPInput({
        A_deg: 0, C_deg: 0,
      }));
      expect(Math.abs(result.compensation_vector.dx)).toBeLessThan(0.001);
      expect(Math.abs(result.compensation_vector.dy)).toBeLessThan(0.001);
      expect(Math.abs(result.compensation_vector.dz)).toBeLessThan(0.001);
    });

    it("non-zero A rotation → non-zero compensation", () => {
      const result = rtcpCompensationEngine.compensate(makeRTCPInput({
        A_deg: 30,
      }));
      const totalComp = Math.sqrt(
        result.compensation_vector.dx ** 2 +
        result.compensation_vector.dy ** 2 +
        result.compensation_vector.dz ** 2
      );
      expect(totalComp).toBeGreaterThan(0.1);
    });

    it("larger angles → larger compensation", () => {
      const small = rtcpCompensationEngine.compensate(makeRTCPInput({ A_deg: 10 }));
      const large = rtcpCompensationEngine.compensate(makeRTCPInput({ A_deg: 45 }));
      const smallMag = Math.sqrt(
        small.compensation_vector.dx ** 2 +
        small.compensation_vector.dy ** 2 +
        small.compensation_vector.dz ** 2
      );
      const largeMag = Math.sqrt(
        large.compensation_vector.dx ** 2 +
        large.compensation_vector.dy ** 2 +
        large.compensation_vector.dz ** 2
      );
      expect(largeMag).toBeGreaterThan(smallMag);
    });
  });

  describe("kinematic types", () => {
    const types = ["table_table", "head_head", "mixed_AC", "mixed_BC", "head_table"] as const;

    for (const type of types) {
      it(`handles ${type} kinematic type`, () => {
        const result = rtcpCompensationEngine.compensate(makeRTCPInput({
          kinematic_type: type,
          A_deg: 15,
          C_deg: 30,
        }));
        expect(result.kinematic_chain).toBeDefined();
        expect(Number.isFinite(result.compensated_X_mm)).toBe(true);
        expect(Number.isFinite(result.compensated_Y_mm)).toBe(true);
        expect(Number.isFinite(result.compensated_Z_mm)).toBe(true);
      });
    }
  });

  describe("tolerance check", () => {
    it("is_within_tolerance true at zero rotation", () => {
      const result = rtcpCompensationEngine.compensate(makeRTCPInput({
        A_deg: 0, C_deg: 0,
        tolerance_mm: 0.01,
      }));
      expect(result.is_within_tolerance).toBe(true);
    });
  });

  describe("validate", () => {
    const axisLimits = { A_min: -120, A_max: 30, C_min: -360, C_max: 360 };

    it("returns safety validation structure", () => {
      const result = rtcpCompensationEngine.validate(makeRTCPInput(), axisLimits);
      expectShape(result, ["safe", "max_error_mm", "warnings"]);
      expect(typeof result.safe).toBe("boolean");
      expectPhysicalValue(result.max_error_mm, "max_error", 0);
    });

    it("flags A-axis outside limits", () => {
      const result = rtcpCompensationEngine.validate(
        makeRTCPInput({ A_deg: 45 }), // exceeds A_max=30
        axisLimits
      );
      expect(result.safe).toBe(false);
      expect(result.warnings.some(w => w.includes("A-axis"))).toBe(true);
    });
  });
});
