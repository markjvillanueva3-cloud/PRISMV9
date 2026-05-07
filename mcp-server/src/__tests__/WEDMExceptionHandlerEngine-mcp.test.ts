/**
 * U-P2PFS26: WEDMExceptionHandlerEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_exception_handle, wedm_exception_stats,
 * wedm_exception_get_policy, wedm_exception_reset
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMExceptionHandlerEngine,
  DEFAULT_POLICY,
  type WEDMExceptionType,
  type RecoveryDirective,
} from "../engines/WEDMExceptionHandlerEngine.js";

describe("WEDMExceptionHandlerEngine MCP Wiring (U-P2PFS26)", () => {
  let engine: WEDMExceptionHandlerEngine;

  beforeEach(() => {
    engine = new WEDMExceptionHandlerEngine();
  });

  describe("handle()", () => {
    it("returns RecoveryPlan structure", () => {
      const plan = engine.handle({ type: "wire_break" });

      expect(plan).toHaveProperty("type");
      expect(plan).toHaveProperty("directive");
      expect(plan).toHaveProperty("occurrence");
      expect(plan).toHaveProperty("rationale");
      expect(plan).toHaveProperty("terminal");
    });

    it("returns auto_retry for first wire_break", () => {
      const plan = engine.handle({ type: "wire_break" });

      expect(plan.directive).toBe("auto_retry");
      expect(plan.occurrence).toBe(1);
    });

    it("walks escalation ladder on repeat faults", () => {
      const p1 = engine.handle({ type: "wire_break" });
      const p2 = engine.handle({ type: "wire_break" });
      const p3 = engine.handle({ type: "wire_break" });
      const p4 = engine.handle({ type: "wire_break" });

      expect(p1.directive).toBe("auto_retry");
      expect(p2.directive).toBe("auto_back_off");
      expect(p3.directive).toBe("auto_back_off");
      expect(p4.directive).toBe("human_escalate");
    });

    it("marks terminal directive correctly", () => {
      const p1 = engine.handle({ type: "wire_break" });
      expect(p1.terminal).toBe(false);

      engine.handle({ type: "wire_break" });
      engine.handle({ type: "wire_break" });
      const p4 = engine.handle({ type: "wire_break" });

      expect(p4.terminal).toBe(true);
    });

    it("tracks occurrence per type", () => {
      engine.handle({ type: "wire_break" });
      engine.handle({ type: "short_circuit" });
      const p3 = engine.handle({ type: "wire_break" });

      expect(p3.occurrence).toBe(2);
    });

    it("returns emergency_stop for axis_overrun", () => {
      const plan = engine.handle({ type: "axis_overrun" });

      expect(plan.directive).toBe("emergency_stop");
      expect(plan.terminal).toBe(true);
    });

    it("returns human_escalate for tank_low", () => {
      const plan = engine.handle({ type: "tank_low" });

      expect(plan.directive).toBe("human_escalate");
      expect(plan.terminal).toBe(true);
    });

    it("throws for unknown exception type", () => {
      expect(() => engine.handle({ type: "unknown" as WEDMExceptionType })).toThrow();
    });

    it("includes message in exception", () => {
      const plan = engine.handle({
        type: "wire_break",
        message: "Wire severed at Z=45.2",
      });

      expect(plan).toBeDefined();
    });

    it("includes context in exception", () => {
      const plan = engine.handle({
        type: "short_circuit",
        context: { gap_V: 15, current_A: 8 },
      });

      expect(plan).toBeDefined();
    });
  });

  describe("stats()", () => {
    it("returns HandlerStats structure", () => {
      const stats = engine.stats();

      expect(stats).toHaveProperty("counts");
      expect(stats).toHaveProperty("successes");
      expect(stats).toHaveProperty("total");
    });

    it("starts with zero counts", () => {
      const stats = engine.stats();

      expect(stats.total).toBe(0);
      expect(stats.counts.wire_break).toBe(0);
    });

    it("increments count on handle", () => {
      engine.handle({ type: "wire_break" });
      engine.handle({ type: "short_circuit" });

      const stats = engine.stats();

      expect(stats.counts.wire_break).toBe(1);
      expect(stats.counts.short_circuit).toBe(1);
      expect(stats.total).toBe(2);
    });
  });

  describe("recordOutcome()", () => {
    it("tracks successful auto-recoveries", () => {
      engine.handle({ type: "wire_break" });
      engine.recordOutcome("wire_break", true);

      const stats = engine.stats();
      expect(stats.successes.wire_break).toBe(1);
    });

    it("does not increment on failure", () => {
      engine.handle({ type: "wire_break" });
      engine.recordOutcome("wire_break", false);

      const stats = engine.stats();
      expect(stats.successes.wire_break).toBe(0);
    });
  });

  describe("getPolicy()", () => {
    it("returns policy for all exception types", () => {
      const policy = engine.getPolicy();

      expect(Object.keys(policy)).toHaveLength(10);
      expect(policy.wire_break).toBeDefined();
      expect(policy.axis_overrun).toBeDefined();
    });

    it("returns arrays of directives", () => {
      const policy = engine.getPolicy();

      expect(Array.isArray(policy.wire_break)).toBe(true);
      expect(policy.wire_break.length).toBeGreaterThan(0);
    });
  });

  describe("setPolicy()", () => {
    it("overrides ladder for a type", () => {
      engine.setPolicy("wire_break", ["human_escalate"]);

      const plan = engine.handle({ type: "wire_break" });

      expect(plan.directive).toBe("human_escalate");
      expect(plan.terminal).toBe(true);
    });

    it("requires terminal directive at end", () => {
      expect(() => engine.setPolicy("wire_break", ["auto_retry"])).toThrow(/terminal/);
    });

    it("rejects empty ladder", () => {
      expect(() => engine.setPolicy("wire_break", [])).toThrow(/non-empty/);
    });
  });

  describe("resetCounters()", () => {
    it("clears counts and successes", () => {
      engine.handle({ type: "wire_break" });
      engine.handle({ type: "short_circuit" });
      engine.recordOutcome("wire_break", true);

      engine.resetCounters();

      const stats = engine.stats();
      expect(stats.total).toBe(0);
      expect(stats.counts.wire_break).toBe(0);
      expect(stats.successes.wire_break).toBe(0);
    });

    it("does not alter policy", () => {
      const originalPolicy = engine.getPolicy();
      engine.resetCounters();
      const newPolicy = engine.getPolicy();

      expect(newPolicy).toEqual(originalPolicy);
    });
  });

  describe("ladderLength()", () => {
    it("returns length of escalation ladder", () => {
      expect(engine.ladderLength("wire_break")).toBe(4);
      expect(engine.ladderLength("axis_overrun")).toBe(1);
      expect(engine.ladderLength("tank_low")).toBe(1);
    });
  });

  describe("DEFAULT_POLICY", () => {
    it("defines 10 exception types", () => {
      expect(Object.keys(DEFAULT_POLICY)).toHaveLength(10);
    });

    it("all ladders end in terminal directive", () => {
      const terminals: RecoveryDirective[] = ["human_escalate", "emergency_stop"];

      for (const [type, ladder] of Object.entries(DEFAULT_POLICY)) {
        const last = ladder[ladder.length - 1];
        expect(terminals).toContain(last);
      }
    });

    it("wire_break ladder has 4 steps", () => {
      expect(DEFAULT_POLICY.wire_break).toHaveLength(4);
      expect(DEFAULT_POLICY.wire_break).toEqual([
        "auto_retry",
        "auto_back_off",
        "auto_back_off",
        "human_escalate",
      ]);
    });

    it("axis_overrun goes straight to emergency_stop", () => {
      expect(DEFAULT_POLICY.axis_overrun).toEqual(["emergency_stop"]);
    });
  });

  describe("exception types", () => {
    const exceptionTypes: WEDMExceptionType[] = [
      "wire_break",
      "short_circuit",
      "open_circuit",
      "tank_low",
      "resistivity_high",
      "resistivity_low",
      "servo_fault",
      "axis_overrun",
      "wire_tension_out",
      "filter_clogged",
    ];

    it.each(exceptionTypes)("handles %s exception", (type) => {
      const plan = engine.handle({ type });

      expect(plan.type).toBe(type);
      expect(plan.occurrence).toBe(1);
    });
  });
});
