/**
 * WEDMExceptionHandlerEngine tests — WEDM AGI Phase 4 / P4-MS1 / U-P4-02.
 *
 * Covers:
 *  - Default ladder semantics for every exception type
 *  - Occurrence tracking (1st / 2nd / 3rd walks the ladder)
 *  - Terminal clamp (occurrences past ladder length stay terminal)
 *  - Policy override + validation (ladder must end terminal)
 *  - Stats (counts, successes, total)
 *  - Reset behaviour
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMExceptionHandlerEngine,
  DEFAULT_POLICY,
  type WEDMExceptionType,
  type RecoveryDirective,
} from "../../engines/WEDMExceptionHandlerEngine.js";

// ----------------------------------------------------------------------------
// Default policy shape
// ----------------------------------------------------------------------------

describe("WEDMExceptionHandlerEngine — DEFAULT_POLICY integrity", () => {
  it("covers all 10 WEDM exception types", () => {
    const keys = Object.keys(DEFAULT_POLICY);
    expect(keys).toHaveLength(10);
    expect(keys).toContain("wire_break");
    expect(keys).toContain("axis_overrun");
    expect(keys).toContain("filter_clogged");
  });

  it("every ladder is non-empty and ends terminal", () => {
    for (const t of Object.keys(DEFAULT_POLICY) as WEDMExceptionType[]) {
      const ladder = DEFAULT_POLICY[t];
      expect(ladder.length).toBeGreaterThan(0);
      const last = ladder[ladder.length - 1];
      expect(["human_escalate", "emergency_stop"]).toContain(last);
    }
  });

  it("axis_overrun goes straight to emergency_stop (no retries)", () => {
    expect(DEFAULT_POLICY.axis_overrun).toEqual(["emergency_stop"]);
  });

  it("tank_low has no auto-recovery (human only)", () => {
    expect(DEFAULT_POLICY.tank_low).toEqual(["human_escalate"]);
  });

  it("wire_break allows 3 auto attempts before escalate", () => {
    expect(DEFAULT_POLICY.wire_break.slice(0, 3)).toEqual([
      "auto_retry",
      "auto_back_off",
      "auto_back_off",
    ]);
    expect(DEFAULT_POLICY.wire_break.at(-1)).toBe("human_escalate");
  });
});

// ----------------------------------------------------------------------------
// Handle ladder walks
// ----------------------------------------------------------------------------

describe("WEDMExceptionHandlerEngine — handle() ladder walks", () => {
  let e: WEDMExceptionHandlerEngine;
  beforeEach(() => {
    e = new WEDMExceptionHandlerEngine();
  });

  it("first wire_break → auto_retry (not terminal)", () => {
    const plan = e.handle({ type: "wire_break" });
    expect(plan.directive).toBe("auto_retry");
    expect(plan.occurrence).toBe(1);
    expect(plan.terminal).toBe(false);
  });

  it("4th wire_break → human_escalate (terminal)", () => {
    for (let i = 0; i < 3; i++) e.handle({ type: "wire_break" });
    const plan = e.handle({ type: "wire_break" });
    expect(plan.directive).toBe("human_escalate");
    expect(plan.occurrence).toBe(4);
    expect(plan.terminal).toBe(true);
  });

  it("occurrences past ladder stay terminal (10th wire_break still escalate)", () => {
    for (let i = 0; i < 10; i++) e.handle({ type: "wire_break" });
    const stats = e.stats();
    expect(stats.counts.wire_break).toBe(10);
    // 11th still terminal.
    const plan = e.handle({ type: "wire_break" });
    expect(plan.directive).toBe("human_escalate");
    expect(plan.terminal).toBe(true);
    expect(plan.occurrence).toBe(11);
  });

  it("axis_overrun returns emergency_stop on very first occurrence", () => {
    const plan = e.handle({ type: "axis_overrun" });
    expect(plan.directive).toBe("emergency_stop");
    expect(plan.terminal).toBe(true);
  });

  it("tracks different exception types independently", () => {
    e.handle({ type: "wire_break" });
    e.handle({ type: "short_circuit" });
    e.handle({ type: "wire_break" });
    const stats = e.stats();
    expect(stats.counts.wire_break).toBe(2);
    expect(stats.counts.short_circuit).toBe(1);
    expect(stats.total).toBe(3);
  });

  it("rationale text includes occurrence ordinal and type", () => {
    const plan1 = e.handle({ type: "servo_fault" });
    expect(plan1.rationale).toMatch(/1st.*servo_fault/);
    const plan2 = e.handle({ type: "servo_fault" });
    expect(plan2.rationale).toMatch(/2nd.*servo_fault/);
    const plan3 = e.handle({ type: "servo_fault" });
    expect(plan3.rationale).toMatch(/3rd.*servo_fault/);
  });

  it("rationale flags terminal directives as ladder-exhausted", () => {
    for (let i = 0; i < 2; i++) e.handle({ type: "wire_tension_out" });
    const plan = e.handle({ type: "wire_tension_out" });
    expect(plan.terminal).toBe(true);
    expect(plan.rationale).toMatch(/ladder exhausted/);
  });

  it("rejects unknown exception types", () => {
    expect(() => e.handle({ type: "cosmic_ray" as WEDMExceptionType })).toThrow(/unknown/i);
  });

  it("handles exception with missing optional fields", () => {
    expect(() => e.handle({ type: "open_circuit" })).not.toThrow();
    expect(() =>
      e.handle({ type: "open_circuit", message: "lost gap", at: new Date().toISOString() }),
    ).not.toThrow();
    expect(() =>
      e.handle({ type: "open_circuit", context: { gap_V: 0, wire_tension_g: 1100 } }),
    ).not.toThrow();
  });
});

// ----------------------------------------------------------------------------
// Stats & outcomes
// ----------------------------------------------------------------------------

describe("WEDMExceptionHandlerEngine — stats & outcomes", () => {
  let e: WEDMExceptionHandlerEngine;
  beforeEach(() => {
    e = new WEDMExceptionHandlerEngine();
  });

  it("records auto-recovery successes", () => {
    e.handle({ type: "wire_break" });
    e.recordOutcome("wire_break", true);
    e.handle({ type: "wire_break" });
    e.recordOutcome("wire_break", false);
    const stats = e.stats();
    expect(stats.successes.wire_break).toBe(1);
  });

  it("stats() returns a defensive copy", () => {
    e.handle({ type: "wire_break" });
    const s1 = e.stats();
    s1.counts.wire_break = 999;
    expect(e.stats().counts.wire_break).toBe(1);
  });

  it("resetCounters() wipes counts and successes but preserves policy", () => {
    e.handle({ type: "wire_break" });
    e.handle({ type: "wire_break" });
    e.recordOutcome("wire_break", true);
    e.resetCounters();
    const stats = e.stats();
    expect(stats.total).toBe(0);
    expect(stats.counts.wire_break).toBe(0);
    expect(stats.successes.wire_break).toBe(0);
    // Policy ladder still intact.
    expect(e.ladderLength("wire_break")).toBe(DEFAULT_POLICY.wire_break.length);
  });

  it("recordOutcome rejects unknown type", () => {
    expect(() => e.recordOutcome("nope" as WEDMExceptionType, true)).toThrow(/unknown/i);
  });
});

// ----------------------------------------------------------------------------
// Policy override
// ----------------------------------------------------------------------------

describe("WEDMExceptionHandlerEngine — setPolicy() overrides", () => {
  let e: WEDMExceptionHandlerEngine;
  beforeEach(() => {
    e = new WEDMExceptionHandlerEngine();
  });

  it("replaces a ladder atomically", () => {
    const custom: RecoveryDirective[] = ["auto_retry", "emergency_stop"];
    e.setPolicy("wire_break", custom);
    expect(e.getPolicy().wire_break).toEqual(custom);
    expect(e.ladderLength("wire_break")).toBe(2);

    expect(e.handle({ type: "wire_break" }).directive).toBe("auto_retry");
    expect(e.handle({ type: "wire_break" }).directive).toBe("emergency_stop");
    expect(e.handle({ type: "wire_break" }).directive).toBe("emergency_stop");
  });

  it("rejects empty ladder", () => {
    expect(() => e.setPolicy("wire_break", [])).toThrow(/non-empty/i);
  });

  it("rejects non-terminal-ending ladder", () => {
    expect(() =>
      e.setPolicy("wire_break", ["auto_retry", "auto_back_off"]),
    ).toThrow(/terminal/i);
  });

  it("rejects unknown type in setPolicy", () => {
    expect(() => e.setPolicy("foo" as WEDMExceptionType, ["emergency_stop"])).toThrow(/unknown/i);
  });

  it("construction-time policy override applies immediately", () => {
    const custom = new WEDMExceptionHandlerEngine({
      wire_break: ["emergency_stop"],
    });
    const plan = custom.handle({ type: "wire_break" });
    expect(plan.directive).toBe("emergency_stop");
    expect(plan.terminal).toBe(true);
  });

  it("construction-time override leaves other ladders intact", () => {
    const e2 = new WEDMExceptionHandlerEngine({ wire_break: ["emergency_stop"] });
    expect(e2.getPolicy().short_circuit).toEqual(DEFAULT_POLICY.short_circuit);
  });

  it("construction-time override with non-terminal ladder is rejected", () => {
    expect(
      () =>
        new WEDMExceptionHandlerEngine({
          wire_break: ["auto_retry"],
        }),
    ).toThrow(/terminal/i);
  });
});

// ----------------------------------------------------------------------------
// Realistic scenario
// ----------------------------------------------------------------------------

describe("WEDMExceptionHandlerEngine — scenario: wire-break storm", () => {
  it("auto-recovers twice, escalates on the 3rd (wire_break ladder)", () => {
    const e = new WEDMExceptionHandlerEngine();
    const outcomes: RecoveryDirective[] = [];
    for (let i = 0; i < 4; i++) {
      outcomes.push(e.handle({ type: "wire_break" }).directive);
    }
    expect(outcomes).toEqual([
      "auto_retry",
      "auto_back_off",
      "auto_back_off",
      "human_escalate",
    ]);
  });
});
