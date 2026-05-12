/**
 * WEDMFailsafeEngine tests — WEDM AGI Phase 4 / P4-MS2 / U-P4-06.
 *
 * Covers:
 *  - Clearance → HARD on critical, RETRACT on warning-only
 *  - Envelope → HARD on critical violation, SOFT on warning-only
 *  - Exception directive → tier mapping (retry/back_off → SOFT,
 *    human_escalate → RETRACT, emergency_stop → HARD)
 *  - Manual plan (defaults + custom tier)
 *  - merge() picks the worst tier + merges context
 *  - Step ladders are monotone (soft ⊂ retract ⊂ hard)
 *  - Exception mapping for envelope violations → correct WEDM type
 */
import { describe, it, expect } from "vitest";
import {
  WEDMFailsafeEngine,
  wedmFailsafeEngine,
  STEP_LADDERS,
  type FailsafePlan,
} from "../../engines/WEDMFailsafeEngine.js";
import type {
  ClearanceReport,
  ClearanceEvent,
} from "../../engines/WEDMHeadClearanceEngine.js";
import type {
  EnvelopeReport,
  EnvelopeViolation,
} from "../../engines/WEDMSafetyEnvelopeEngine.js";
import type { RecoveryPlan } from "../../engines/WEDMExceptionHandlerEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function clearanceEvent(
  severity: "warning" | "critical",
  kind: ClearanceEvent["kind"] = "guide_vs_fixture",
): ClearanceEvent {
  return {
    severity,
    kind,
    actor: "upper_guide",
    clearance_mm: severity === "critical" ? -1 : 1,
    reason: "test",
  };
}

function violation(
  param: EnvelopeViolation["param"],
  severity: "warning" | "critical",
  edge: "low" | "high" = "low",
): EnvelopeViolation {
  return { param, severity, value: 0, limit: {}, edge, reason: `${param} test` };
}

// ----------------------------------------------------------------------------
// Step ladders
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — step ladders", () => {
  it("soft ⊂ retract ⊂ hard", () => {
    const soft = new Set(STEP_LADDERS.soft);
    const retract = new Set(STEP_LADDERS.retract);
    const hard = new Set(STEP_LADDERS.hard);
    for (const s of soft) expect(retract.has(s)).toBe(true);
    for (const s of retract) expect(hard.has(s)).toBe(true);
    expect(hard.size).toBeGreaterThan(retract.size);
    expect(retract.size).toBeGreaterThan(soft.size);
  });

  it("hard ladder ends in drop_tank", () => {
    expect(STEP_LADDERS.hard[STEP_LADDERS.hard.length - 1]).toBe("drop_tank");
  });
});

// ----------------------------------------------------------------------------
// Clearance → failsafe
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — planFromClearance()", () => {
  const e = new WEDMFailsafeEngine();

  it("critical clearance → HARD + escalate + exceptionType=axis_overrun", () => {
    const report: ClearanceReport = {
      pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
      pass: false,
      minClearance_mm: -1,
      events: [clearanceEvent("critical")],
    };
    const plan = e.planFromClearance(report);
    expect(plan.tier).toBe("hard");
    expect(plan.degradeTo).toBe(0);
    expect(plan.escalate).toBe(true);
    expect(plan.exceptionType).toBe("axis_overrun");
    expect(plan.steps).toEqual(STEP_LADDERS.hard);
  });

  it("warning-only clearance → RETRACT + escalate + degradeTo=1", () => {
    const report: ClearanceReport = {
      pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
      pass: true,
      minClearance_mm: 0.5,
      events: [clearanceEvent("warning")],
    };
    const plan = e.planFromClearance(report);
    expect(plan.tier).toBe("retract");
    expect(plan.degradeTo).toBe(1);
    expect(plan.steps).toEqual(STEP_LADDERS.retract);
  });

  it("context carries minClearance + events", () => {
    const evs = [clearanceEvent("critical"), clearanceEvent("warning")];
    const plan = e.planFromClearance({
      pose: { X: 0, Y: 0, Z_upper: 50, Z_lower: 0 },
      pass: false,
      minClearance_mm: -3,
      events: evs,
    });
    expect(plan.context.minClearance_mm).toBe(-3);
    expect(plan.context.events).toEqual(evs);
  });
});

// ----------------------------------------------------------------------------
// Envelope → failsafe
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — planFromEnvelope()", () => {
  const e = new WEDMFailsafeEngine();

  it("critical envelope violation → HARD", () => {
    const report: EnvelopeReport = {
      envelopeId: "test",
      reading: {},
      pass: false,
      violations: [violation("tank_level_pct", "critical", "low")],
    };
    const plan = e.planFromEnvelope(report);
    expect(plan.tier).toBe("hard");
    expect(plan.escalate).toBe(true);
    expect(plan.exceptionType).toBe("tank_low");
  });

  it("warning-only envelope → SOFT + no escalate", () => {
    const report: EnvelopeReport = {
      envelopeId: "test",
      reading: {},
      pass: true,
      violations: [violation("wire_tension_gf", "warning", "low")],
    };
    const plan = e.planFromEnvelope(report);
    expect(plan.tier).toBe("soft");
    expect(plan.escalate).toBe(false);
    expect(plan.degradeTo).toBe(1);
  });

  it("gap_V low-edge critical → short_circuit exception", () => {
    const plan = e.planFromEnvelope({
      envelopeId: "x",
      reading: {},
      pass: false,
      violations: [violation("gap_V", "critical", "low")],
    });
    expect(plan.exceptionType).toBe("short_circuit");
  });

  it("gap_V high-edge critical → open_circuit exception", () => {
    const plan = e.planFromEnvelope({
      envelopeId: "x",
      reading: {},
      pass: false,
      violations: [violation("gap_V", "critical", "high")],
    });
    expect(plan.exceptionType).toBe("open_circuit");
  });

  it("axis overrun on any axis → axis_overrun", () => {
    const plan = e.planFromEnvelope({
      envelopeId: "x",
      reading: {},
      pass: false,
      violations: [violation("Z_upper_mm", "critical", "high")],
    });
    expect(plan.exceptionType).toBe("axis_overrun");
  });
});

// ----------------------------------------------------------------------------
// Exception → failsafe (directive mapping)
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — planFromException() directive mapping", () => {
  const e = new WEDMFailsafeEngine();

  function rp(directive: RecoveryPlan["directive"], terminal = false): RecoveryPlan {
    return {
      type: "wire_break",
      directive,
      occurrence: 1,
      rationale: "test",
      terminal,
    };
  }

  it("auto_retry → SOFT + no escalate", () => {
    const plan = e.planFromException(rp("auto_retry"));
    expect(plan.tier).toBe("soft");
    expect(plan.escalate).toBe(false);
    expect(plan.degradeTo).toBe(2);
  });

  it("auto_back_off → SOFT", () => {
    expect(e.planFromException(rp("auto_back_off")).tier).toBe("soft");
  });

  it("human_escalate → RETRACT + escalate", () => {
    const plan = e.planFromException(rp("human_escalate", true));
    expect(plan.tier).toBe("retract");
    expect(plan.escalate).toBe(true);
    expect(plan.degradeTo).toBe(1);
  });

  it("emergency_stop → HARD + escalate + degradeTo=0", () => {
    const plan = e.planFromException(rp("emergency_stop", true));
    expect(plan.tier).toBe("hard");
    expect(plan.escalate).toBe(true);
    expect(plan.degradeTo).toBe(0);
  });

  it("context carries the full RecoveryPlan", () => {
    const source = rp("auto_retry");
    const plan = e.planFromException(source);
    expect(plan.context.plan).toEqual(source);
    expect(plan.exceptionType).toBe("wire_break");
  });
});

// ----------------------------------------------------------------------------
// Manual
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — planManual()", () => {
  const e = new WEDMFailsafeEngine();

  it("defaults to HARD + escalate", () => {
    const plan = e.planManual();
    expect(plan.tier).toBe("hard");
    expect(plan.escalate).toBe(true);
    expect(plan.degradeTo).toBe(0);
  });

  it("custom tier honored", () => {
    const plan = e.planManual("soft", "planned maintenance pause");
    expect(plan.tier).toBe("soft");
    expect(plan.summary).toBe("planned maintenance pause");
  });
});

// ----------------------------------------------------------------------------
// merge()
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — merge()", () => {
  const e = new WEDMFailsafeEngine();

  it("picks the worst tier", () => {
    const soft = e.planManual("soft");
    const retract = e.planManual("retract");
    const hard = e.planManual("hard");
    expect(e.merge([soft, retract, hard]).tier).toBe("hard");
    expect(e.merge([soft, retract]).tier).toBe("retract");
    expect(e.merge([soft]).tier).toBe("soft");
  });

  it("picks the lowest (strictest) degradeTo", () => {
    const p0: FailsafePlan = { ...e.planManual("soft"), degradeTo: 2 };
    const p1: FailsafePlan = { ...e.planManual("soft"), degradeTo: 1 };
    expect(e.merge([p0, p1]).degradeTo).toBe(1);
  });

  it("escalate is true if ANY plan escalates", () => {
    const noEsc: FailsafePlan = { ...e.planManual("soft"), escalate: false };
    const yesEsc: FailsafePlan = { ...e.planManual("soft"), escalate: true };
    expect(e.merge([noEsc, yesEsc]).escalate).toBe(true);
  });

  it("throws on empty input", () => {
    expect(() => e.merge([])).toThrow();
  });

  it("merged plan embeds source plans in context", () => {
    const a = e.planManual("soft");
    const b = e.planManual("hard");
    const merged = e.merge([a, b]);
    expect(Array.isArray(merged.context.plans)).toBe(true);
    expect((merged.context.plans as FailsafePlan[])).toHaveLength(2);
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("WEDMFailsafeEngine — singleton", () => {
  it("wedmFailsafeEngine builds plans identically", () => {
    const plan = wedmFailsafeEngine.planManual("hard");
    expect(plan.tier).toBe("hard");
  });
});
