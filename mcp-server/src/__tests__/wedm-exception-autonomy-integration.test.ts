/**
 * U-P2PFS22-23: WEDM Exception Handler + Autonomy Integration Tests
 * Verifies that exception handler triggers autonomy degrade on human_escalate
 * and failsafe planning on emergency_stop
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmExceptionHandlerEngine } from "../engines/WEDMExceptionHandlerEngine.js";
import { wedmAutonomyEngine } from "../engines/WEDMAutonomyEngine.js";
import { wedmFailsafeEngine } from "../engines/WEDMFailsafeEngine.js";

describe("WEDM Exception-Autonomy Integration (U-P2PFS22-23)", () => {
  beforeEach(() => {
    wedmExceptionHandlerEngine.resetCounters();
    wedmAutonomyEngine.reset();
  });

  describe("U-P2PFS22: Autonomy degrade on human_escalate", () => {
    it("exception handler returns human_escalate after repeated wire breaks", () => {
      // Wire break policy: ["auto_retry", "auto_back_off", "auto_back_off", "human_escalate"]
      wedmExceptionHandlerEngine.handle({ type: "wire_break" }); // auto_retry
      wedmExceptionHandlerEngine.handle({ type: "wire_break" }); // auto_back_off
      wedmExceptionHandlerEngine.handle({ type: "wire_break" }); // auto_back_off
      const plan = wedmExceptionHandlerEngine.handle({ type: "wire_break" }); // human_escalate

      expect(plan.directive).toBe("human_escalate");
      expect(plan.occurrence).toBe(4);
      expect(plan.terminal).toBe(true);
    });

    it("autonomy engine can degrade level", () => {
      // Reset to a higher level first
      wedmAutonomyEngine.reset(3);
      const initialLevel = wedmAutonomyEngine.getLevel();
      expect(initialLevel).toBe(3);

      const result = wedmAutonomyEngine.degrade({
        actor: "exception_handler",
        reason: "Wire break escalation",
        floorToLevel: 1,
      });

      expect(result).not.toBeNull();
      if (result) {
        expect(result.to).toBe(1);
        expect(result.from).toBe(3);
      }
    });

    it("tank_low immediately escalates to human", () => {
      const plan = wedmExceptionHandlerEngine.handle({ type: "tank_low" });

      expect(plan.directive).toBe("human_escalate");
      expect(plan.occurrence).toBe(1);
      expect(plan.terminal).toBe(true);
    });

    it("multiple different exceptions each track separately", () => {
      const wireBreak1 = wedmExceptionHandlerEngine.handle({ type: "wire_break" });
      const tankLow1 = wedmExceptionHandlerEngine.handle({ type: "tank_low" });
      const wireBreak2 = wedmExceptionHandlerEngine.handle({ type: "wire_break" });

      expect(wireBreak1.occurrence).toBe(1);
      expect(tankLow1.occurrence).toBe(1);
      expect(wireBreak2.occurrence).toBe(2);
    });

    it("degrade returns transition with to/from levels", () => {
      // Reset to level 3 first so we can degrade to level 2
      wedmAutonomyEngine.reset(3);
      const initialLevel = wedmAutonomyEngine.getLevel();
      expect(initialLevel).toBe(3);

      const result = wedmAutonomyEngine.degrade({
        actor: "test_actor",
        reason: "Test reason for degrade",
        floorToLevel: 2,
      });

      expect(result).not.toBeNull();
      if (result) {
        expect(result).toHaveProperty("to");
        expect(result).toHaveProperty("from");
        expect(result.to).toBe(2);
        expect(result.from).toBe(3);
      }
    });
  });

  describe("U-P2PFS23: Failsafe planning on emergency_stop", () => {
    it("axis_overrun triggers emergency_stop", () => {
      const plan = wedmExceptionHandlerEngine.handle({ type: "axis_overrun" });

      expect(plan.directive).toBe("emergency_stop");
      expect(plan.terminal).toBe(true);
    });

    it("failsafe engine creates plan from exception", () => {
      const exceptionPlan = wedmExceptionHandlerEngine.handle({ type: "axis_overrun" });
      const failsafePlan = wedmFailsafeEngine.planFromException(exceptionPlan);

      expect(failsafePlan.tier).toBe("hard");
      expect(failsafePlan.trigger).toBe("process_exception");
      expect(failsafePlan.escalate).toBe(true);
    });

    it("failsafe plan includes steps for recovery", () => {
      const exceptionPlan = wedmExceptionHandlerEngine.handle({ type: "axis_overrun" });
      const failsafePlan = wedmFailsafeEngine.planFromException(exceptionPlan);

      expect(failsafePlan.steps).toBeDefined();
      expect(Array.isArray(failsafePlan.steps)).toBe(true);
      expect(failsafePlan.steps.length).toBeGreaterThan(0);
    });

    it("failsafe plan includes degrade level", () => {
      const exceptionPlan = wedmExceptionHandlerEngine.handle({ type: "axis_overrun" });
      const failsafePlan = wedmFailsafeEngine.planFromException(exceptionPlan);

      expect(failsafePlan.degradeTo).toBeDefined();
      expect(failsafePlan.degradeTo).toBe(0); // Hard stop = level 0
    });
  });

  describe("exception handler stats", () => {
    it("tracks counts per exception type", () => {
      wedmExceptionHandlerEngine.handle({ type: "wire_break" });
      wedmExceptionHandlerEngine.handle({ type: "wire_break" });
      wedmExceptionHandlerEngine.handle({ type: "short_circuit" });

      const stats = wedmExceptionHandlerEngine.stats();
      expect(stats.counts.wire_break).toBe(2);
      expect(stats.counts.short_circuit).toBe(1);
      expect(stats.total).toBe(3);
    });

    it("reset clears all counters", () => {
      wedmExceptionHandlerEngine.handle({ type: "wire_break" });
      wedmExceptionHandlerEngine.resetCounters();

      const stats = wedmExceptionHandlerEngine.stats();
      expect(stats.counts.wire_break).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe("policy configuration", () => {
    it("can get current policy", () => {
      const policy = wedmExceptionHandlerEngine.getPolicy();

      expect(policy.wire_break).toBeDefined();
      expect(policy.axis_overrun).toBeDefined();
      expect(Array.isArray(policy.wire_break)).toBe(true);
    });

    it("policy ladder ends in terminal directive", () => {
      const policy = wedmExceptionHandlerEngine.getPolicy();

      for (const [, ladder] of Object.entries(policy)) {
        const last = ladder[ladder.length - 1];
        expect(
          last === "human_escalate" || last === "emergency_stop"
        ).toBe(true);
      }
    });
  });

  describe("integration flow validation", () => {
    it("escalation flow: exception -> degrade -> handoff ready", () => {
      // Reset to level 3 first so degrade has room to go down
      wedmAutonomyEngine.reset(3);
      const initialLevel = wedmAutonomyEngine.getLevel();
      expect(initialLevel).toBe(3);

      // Trigger enough wire breaks to escalate
      for (let i = 0; i < 4; i++) {
        wedmExceptionHandlerEngine.handle({ type: "wire_break" });
      }

      // Now degrade autonomy (simulating what dispatcher does)
      // Degrade to level 1 (human oversight required)
      const degradeResult = wedmAutonomyEngine.degrade({
        actor: "exception_handler",
        reason: "Wire break escalation after 4 occurrences",
        floorToLevel: 1,
      });

      expect(degradeResult).not.toBeNull();
      if (degradeResult) {
        expect(degradeResult.to).toBe(1);
        expect(degradeResult.to).toBeLessThan(initialLevel);
      }
    });

    it("emergency flow: exception -> failsafe plan -> autonomy degrade", () => {
      // Reset autonomy to a higher level first
      wedmAutonomyEngine.reset(3);

      // Axis overrun triggers emergency
      const exceptionPlan = wedmExceptionHandlerEngine.handle({ type: "axis_overrun" });
      expect(exceptionPlan.directive).toBe("emergency_stop");

      // Create failsafe plan (simulating what dispatcher does)
      const failsafePlan = wedmFailsafeEngine.planFromException(exceptionPlan);
      expect(failsafePlan.tier).toBe("hard");
      expect(failsafePlan.degradeTo).toBe(0);

      // Degrade autonomy to level specified by failsafe
      const degradeResult = wedmAutonomyEngine.degrade({
        actor: "failsafe",
        reason: "Emergency stop - axis overrun",
        floorToLevel: failsafePlan.degradeTo,
      });

      // Should succeed since we're going from 3 to 0
      expect(degradeResult).not.toBeNull();
      if (degradeResult) {
        expect(degradeResult.to).toBe(0);
      }
    });

    it("human_escalate creates retract-tier failsafe plan", () => {
      // Get to human_escalate directive
      const plan = wedmExceptionHandlerEngine.handle({ type: "tank_low" });
      expect(plan.directive).toBe("human_escalate");

      const failsafePlan = wedmFailsafeEngine.planFromException(plan);
      expect(failsafePlan.tier).toBe("retract");
      expect(failsafePlan.escalate).toBe(true);
    });
  });
});
