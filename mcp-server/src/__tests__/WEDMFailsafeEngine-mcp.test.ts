/**
 * U-P2PFS23: WEDMFailsafeEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_failsafe_from_clearance, wedm_failsafe_from_envelope,
 * wedm_failsafe_from_exception, wedm_failsafe_manual
 */
import { describe, it, expect } from "vitest";
import { wedmFailsafeEngine, STEP_LADDERS } from "../engines/WEDMFailsafeEngine.js";
import type { ClearanceReport } from "../engines/WEDMHeadClearanceEngine.js";
import type { EnvelopeReport } from "../engines/WEDMSafetyEnvelopeEngine.js";
import type { RecoveryPlan } from "../engines/WEDMExceptionHandlerEngine.js";

describe("WEDMFailsafeEngine MCP Wiring (U-P2PFS23)", () => {
  describe("planFromClearance()", () => {
    it("returns FailsafePlan structure", () => {
      const report: ClearanceReport = {
        pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
        pass: false,
        minClearance_mm: -1,
        events: [
          {
            severity: "critical",
            kind: "guide_vs_fixture",
            actor: "upper_guide",
            obstacleId: "clamp1",
            clearance_mm: -1,
            reason: "collision detected",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromClearance(report);

      expect(plan).toHaveProperty("tier");
      expect(plan).toHaveProperty("trigger");
      expect(plan).toHaveProperty("steps");
      expect(plan).toHaveProperty("degradeTo");
      expect(plan).toHaveProperty("escalate");
      expect(plan).toHaveProperty("summary");
      expect(plan).toHaveProperty("context");
    });

    it("returns HARD tier for critical clearance breach", () => {
      const report: ClearanceReport = {
        pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
        pass: false,
        minClearance_mm: -5,
        events: [
          {
            severity: "critical",
            kind: "guide_vs_part",
            actor: "upper_guide",
            clearance_mm: -5,
            reason: "head collision",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromClearance(report);

      expect(plan.tier).toBe("hard");
      expect(plan.degradeTo).toBe(0);
      expect(plan.escalate).toBe(true);
    });

    it("returns RETRACT tier for warning-only clearance", () => {
      const report: ClearanceReport = {
        pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
        pass: true,
        minClearance_mm: 1.5,
        events: [
          {
            severity: "warning",
            kind: "guide_vs_fixture",
            actor: "lower_guide",
            clearance_mm: 1.5,
            reason: "near miss",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromClearance(report);

      expect(plan.tier).toBe("retract");
      expect(plan.degradeTo).toBe(1);
    });

    it("sets trigger to collision", () => {
      const report: ClearanceReport = {
        pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
        pass: false,
        minClearance_mm: -1,
        events: [],
      };

      const plan = wedmFailsafeEngine.planFromClearance(report);

      expect(plan.trigger).toBe("collision");
    });

    it("includes HARD steps for critical collision", () => {
      const report: ClearanceReport = {
        pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
        pass: false,
        minClearance_mm: -1,
        events: [{ severity: "critical", kind: "guide_vs_part", actor: "upper_guide", clearance_mm: -1, reason: "collision" }],
      };

      const plan = wedmFailsafeEngine.planFromClearance(report);

      expect(plan.steps).toContain("hold_feed");
      expect(plan.steps).toContain("kill_discharge_circuit");
      expect(plan.steps).toContain("park_axes");
      expect(plan.steps).toContain("drop_tank");
    });
  });

  describe("planFromEnvelope()", () => {
    it("returns FailsafePlan structure", () => {
      const report: EnvelopeReport = {
        envelopeId: "default",
        reading: { wire_tension_gf: 400 },
        pass: false,
        violations: [
          {
            param: "wire_tension_gf",
            severity: "critical",
            value: 400,
            limit: { min: 500, max: 2000 },
            edge: "low",
            reason: "below minimum",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromEnvelope(report);

      expect(plan).toHaveProperty("tier");
      expect(plan).toHaveProperty("trigger");
      expect(plan).toHaveProperty("steps");
    });

    it("returns HARD tier for critical envelope breach", () => {
      const report: EnvelopeReport = {
        envelopeId: "default",
        reading: { tank_level_pct: 50 },
        pass: false,
        violations: [
          {
            param: "tank_level_pct",
            severity: "critical",
            value: 50,
            limit: { min: 80 },
            edge: "low",
            reason: "tank level critical",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromEnvelope(report);

      expect(plan.tier).toBe("hard");
      expect(plan.escalate).toBe(true);
    });

    it("returns SOFT tier for warning-only envelope", () => {
      const report: EnvelopeReport = {
        envelopeId: "default",
        reading: { wire_tension_gf: 520 },
        pass: true,
        violations: [
          {
            param: "wire_tension_gf",
            severity: "warning",
            value: 520,
            limit: { min: 500, max: 2000 },
            edge: "low",
            reason: "near soft band",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromEnvelope(report);

      expect(plan.tier).toBe("soft");
      expect(plan.escalate).toBe(false);
    });

    it("sets trigger to envelope_breach", () => {
      const report: EnvelopeReport = {
        envelopeId: "default",
        reading: {},
        pass: true,
        violations: [],
      };

      const plan = wedmFailsafeEngine.planFromEnvelope(report);

      expect(plan.trigger).toBe("envelope_breach");
    });

    it("maps wire tension violation to exception type", () => {
      const report: EnvelopeReport = {
        envelopeId: "default",
        reading: { wire_tension_gf: 300 },
        pass: false,
        violations: [
          {
            param: "wire_tension_gf",
            severity: "critical",
            value: 300,
            limit: { min: 500 },
            edge: "low",
            reason: "tension too low",
          },
        ],
      };

      const plan = wedmFailsafeEngine.planFromEnvelope(report);

      expect(plan.exceptionType).toBe("wire_tension_out");
    });
  });

  describe("planFromException()", () => {
    it("returns FailsafePlan structure", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "wire_break",
        occurrence: 2,
        directive: "human_escalate",
        actions: ["retract_wire", "notify_operator"],
        parameters: {},
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan).toHaveProperty("tier");
      expect(plan).toHaveProperty("trigger");
      expect(plan).toHaveProperty("steps");
      expect(plan).toHaveProperty("exceptionType");
    });

    it("maps auto_retry to SOFT tier", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "short_circuit",
        occurrence: 1,
        directive: "auto_retry",
        actions: [],
        parameters: {},
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan.tier).toBe("soft");
      expect(plan.escalate).toBe(false);
    });

    it("maps auto_back_off to SOFT tier", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "short_circuit",
        occurrence: 2,
        directive: "auto_back_off",
        actions: ["reduce_current"],
        parameters: { current_reduction: 0.1 },
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan.tier).toBe("soft");
    });

    it("maps human_escalate to RETRACT tier", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "wire_break",
        occurrence: 3,
        directive: "human_escalate",
        actions: ["notify_operator"],
        parameters: {},
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan.tier).toBe("retract");
      expect(plan.escalate).toBe(true);
    });

    it("maps emergency_stop to HARD tier", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "axis_overrun",
        occurrence: 1,
        directive: "emergency_stop",
        actions: ["e_stop"],
        parameters: {},
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan.tier).toBe("hard");
      expect(plan.degradeTo).toBe(0);
      expect(plan.escalate).toBe(true);
    });

    it("sets trigger to process_exception", () => {
      const recoveryPlan: RecoveryPlan = {
        type: "wire_break",
        occurrence: 1,
        directive: "auto_retry",
        actions: [],
        parameters: {},
      };

      const plan = wedmFailsafeEngine.planFromException(recoveryPlan);

      expect(plan.trigger).toBe("process_exception");
    });
  });

  describe("planManual()", () => {
    it("returns FailsafePlan with defaults", () => {
      const plan = wedmFailsafeEngine.planManual();

      expect(plan.tier).toBe("hard");
      expect(plan.trigger).toBe("manual");
      expect(plan.summary).toBe("operator-initiated failsafe");
    });

    it("accepts custom tier", () => {
      const plan = wedmFailsafeEngine.planManual("soft", "maintenance pause");

      expect(plan.tier).toBe("soft");
      expect(plan.escalate).toBe(false);
      expect(plan.summary).toBe("maintenance pause");
    });

    it("accepts retract tier", () => {
      const plan = wedmFailsafeEngine.planManual("retract", "wire inspection");

      expect(plan.tier).toBe("retract");
      expect(plan.steps).toContain("retract_wire_to_safe_Z");
    });

    it("returns correct degradeTo for each tier", () => {
      expect(wedmFailsafeEngine.planManual("hard").degradeTo).toBe(0);
      expect(wedmFailsafeEngine.planManual("retract").degradeTo).toBe(1);
      expect(wedmFailsafeEngine.planManual("soft").degradeTo).toBe(2);
    });
  });

  describe("STEP_LADDERS", () => {
    it("SOFT includes hold, dielectric, tension", () => {
      expect(STEP_LADDERS.soft).toContain("hold_feed");
      expect(STEP_LADDERS.soft).toContain("maintain_dielectric");
      expect(STEP_LADDERS.soft).toContain("keep_wire_tension");
    });

    it("RETRACT includes SOFT plus retract steps", () => {
      expect(STEP_LADDERS.retract).toContain("hold_feed");
      expect(STEP_LADDERS.retract).toContain("retract_wire_to_safe_Z");
      expect(STEP_LADDERS.retract).toContain("break_wire_contact");
    });

    it("HARD includes all steps", () => {
      expect(STEP_LADDERS.hard).toContain("hold_feed");
      expect(STEP_LADDERS.hard).toContain("retract_wire_to_safe_Z");
      expect(STEP_LADDERS.hard).toContain("kill_discharge_circuit");
      expect(STEP_LADDERS.hard).toContain("park_axes");
      expect(STEP_LADDERS.hard).toContain("drop_tank");
    });
  });

  describe("merge()", () => {
    it("takes highest tier from multiple plans", () => {
      const soft = wedmFailsafeEngine.planManual("soft");
      const hard = wedmFailsafeEngine.planManual("hard");

      const merged = wedmFailsafeEngine.merge([soft, hard]);

      expect(merged.tier).toBe("hard");
    });

    it("takes lowest degradeTo from multiple plans", () => {
      const soft = wedmFailsafeEngine.planManual("soft"); // degradeTo = 2
      const retract = wedmFailsafeEngine.planManual("retract"); // degradeTo = 1

      const merged = wedmFailsafeEngine.merge([soft, retract]);

      expect(merged.degradeTo).toBe(1);
    });

    it("escalates if any plan escalates", () => {
      const soft = wedmFailsafeEngine.planManual("soft"); // escalate = false
      const retract = wedmFailsafeEngine.planManual("retract"); // escalate = true

      const merged = wedmFailsafeEngine.merge([soft, retract]);

      expect(merged.escalate).toBe(true);
    });

    it("throws if no plans provided", () => {
      expect(() => wedmFailsafeEngine.merge([])).toThrow();
    });
  });
});
