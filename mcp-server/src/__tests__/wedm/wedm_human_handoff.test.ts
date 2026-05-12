/**
 * WEDMHumanHandoffEngine tests — WEDM AGI Phase 4 / P4-MS1 / U-P4-03.
 *
 * Covers:
 *  - escalate() creates packets with inferred severity/urgency
 *  - Emergency_stop plans bump severity to critical and urgency to immediate
 *  - Terminal ladder directives bump base severity one notch
 *  - Override: explicit severity / urgency in request wins
 *  - acknowledge() clears from pending, keeps in history
 *  - listPending() is newest-first and returns defensive copies
 *  - Reset wipes state
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMHumanHandoffEngine,
  type HandoffPacket,
} from "../../engines/WEDMHumanHandoffEngine.js";
import type {
  RecoveryPlan,
  WEDMExceptionType,
} from "../../engines/WEDMExceptionHandlerEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function plan(
  type: WEDMExceptionType,
  directive: RecoveryPlan["directive"],
  occurrence = 1,
  terminal = false,
): RecoveryPlan {
  return {
    type,
    directive,
    occurrence,
    rationale: `${occurrence}× ${type} — ${directive}`,
    terminal,
  };
}

// ----------------------------------------------------------------------------
// escalate() — basic packet construction
// ----------------------------------------------------------------------------

describe("WEDMHumanHandoffEngine — escalate()", () => {
  let e: WEDMHumanHandoffEngine;

  beforeEach(() => {
    e = new WEDMHumanHandoffEngine();
  });

  it("rejects empty summary", () => {
    expect(() => e.escalate({ type: "wire_break", summary: "" })).toThrow();
  });

  it("rejects empty type", () => {
    expect(() =>
      e.escalate({ type: "" as WEDMExceptionType, summary: "x" }),
    ).toThrow();
  });

  it("assigns a unique id per packet", () => {
    const a = e.escalate({ type: "wire_break", summary: "break #1" });
    const b = e.escalate({ type: "wire_break", summary: "break #2" });
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^HO-/);
  });

  it("uses the supplied timestamp if provided", () => {
    const when = "2026-04-16T20:00:00.000Z";
    const p = e.escalate({
      type: "wire_break",
      summary: "test",
      timestamp: when,
    });
    expect(p.at).toBe(when);
  });

  it("acknowledged is false on creation", () => {
    const p = e.escalate({ type: "wire_break", summary: "test" });
    expect(p.acknowledged).toBe(false);
    expect(p.acknowledgedAt).toBeUndefined();
    expect(p.acknowledgedBy).toBeUndefined();
  });

  it("embeds supplied context and snapshot", () => {
    const p = e.escalate({
      type: "servo_fault",
      summary: "gap voltage drift",
      context: { consecutive_trips: 3 },
      snapshot: { gap_V: 12, wire_tension_g: 1100 },
    });
    expect(p.context.consecutive_trips).toBe(3);
    expect(p.snapshot.gap_V).toBe(12);
  });

  it("defaults context and snapshot to empty objects", () => {
    const p = e.escalate({ type: "wire_break", summary: "x" });
    expect(p.context).toEqual({});
    expect(p.snapshot).toEqual({});
  });
});

// ----------------------------------------------------------------------------
// Severity / urgency inference
// ----------------------------------------------------------------------------

describe("WEDMHumanHandoffEngine — severity / urgency inference", () => {
  let e: WEDMHumanHandoffEngine;

  beforeEach(() => {
    e = new WEDMHumanHandoffEngine();
  });

  it("wire_break defaults to medium severity, high urgency", () => {
    const p = e.escalate({ type: "wire_break", summary: "x" });
    expect(p.severity).toBe("medium");
    expect(p.urgency).toBe("high");
  });

  it("tank_low defaults to high severity, immediate urgency", () => {
    const p = e.escalate({ type: "tank_low", summary: "x" });
    expect(p.severity).toBe("high");
    expect(p.urgency).toBe("immediate");
  });

  it("axis_overrun defaults to critical severity, immediate urgency", () => {
    const p = e.escalate({ type: "axis_overrun", summary: "x" });
    expect(p.severity).toBe("critical");
    expect(p.urgency).toBe("immediate");
  });

  it("emergency_stop plan forces critical severity and immediate urgency", () => {
    const p = e.escalate({
      type: "servo_fault",
      summary: "locked up",
      plan: plan("servo_fault", "emergency_stop", 3, true),
    });
    expect(p.severity).toBe("critical");
    expect(p.urgency).toBe("immediate");
  });

  it("terminal (non-emergency) plan bumps severity one notch", () => {
    const p = e.escalate({
      type: "wire_break",
      summary: "4th break in 20min",
      plan: plan("wire_break", "human_escalate", 4, true),
    });
    expect(p.severity).toBe("high"); // medium bumped → high
    expect(p.urgency).toBe("high"); // already high for wire_break
  });

  it("non-terminal plan does not bump severity", () => {
    const p = e.escalate({
      type: "wire_break",
      summary: "1st break",
      plan: plan("wire_break", "auto_retry", 1, false),
    });
    expect(p.severity).toBe("medium");
  });

  it("explicit request.severity overrides inference", () => {
    const p = e.escalate({
      type: "filter_clogged",
      summary: "x",
      severity: "critical",
    });
    expect(p.severity).toBe("critical");
  });

  it("explicit request.urgency overrides inference", () => {
    const p = e.escalate({
      type: "wire_break",
      summary: "x",
      urgency: "low",
    });
    expect(p.urgency).toBe("low");
  });

  it("unknown type falls back to medium/medium", () => {
    const p = e.escalate({ type: "mystery_fault", summary: "x" });
    expect(p.severity).toBe("medium");
    expect(p.urgency).toBe("medium");
  });
});

// ----------------------------------------------------------------------------
// Suggested action
// ----------------------------------------------------------------------------

describe("WEDMHumanHandoffEngine — suggested action", () => {
  it("injects a type-specific suggestion by default", () => {
    const e = new WEDMHumanHandoffEngine();
    const p = e.escalate({ type: "tank_low", summary: "x" });
    expect(p.suggestedAction.toLowerCase()).toMatch(/refill|dielectric/);
  });

  it("honors an explicit suggestion from the request", () => {
    const e = new WEDMHumanHandoffEngine();
    const p = e.escalate({
      type: "wire_break",
      summary: "x",
      suggestedAction: "run with tension=1300g",
    });
    expect(p.suggestedAction).toBe("run with tension=1300g");
  });

  it("unknown type gets generic fallback suggestion", () => {
    const e = new WEDMHumanHandoffEngine();
    const p = e.escalate({ type: "novel_fault", summary: "x" });
    expect(p.suggestedAction.length).toBeGreaterThan(10);
  });
});

// ----------------------------------------------------------------------------
// acknowledge() + pending management
// ----------------------------------------------------------------------------

describe("WEDMHumanHandoffEngine — pending queue & acknowledge()", () => {
  let e: WEDMHumanHandoffEngine;

  beforeEach(() => {
    e = new WEDMHumanHandoffEngine();
  });

  it("listPending() returns every created packet not yet acknowledged", () => {
    const a = e.escalate({ type: "wire_break", summary: "a" });
    const b = e.escalate({ type: "tank_low", summary: "b" });
    const ids = e.listPending().map((p) => p.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).toHaveLength(2);
  });

  it("listPending() is newest-first", () => {
    const a = e.escalate({ type: "wire_break", summary: "a" });
    const b = e.escalate({ type: "tank_low", summary: "b" });
    const ids = e.listPending().map((p) => p.id);
    expect(ids[0]).toBe(b.id);
    expect(ids[1]).toBe(a.id);
  });

  it("acknowledge() marks packet acknowledged and removes it from pending", () => {
    const p = e.escalate({ type: "wire_break", summary: "x" });
    const ack = e.acknowledge(p.id, "mark@jmdie");
    expect(ack).not.toBeNull();
    expect(ack!.acknowledged).toBe(true);
    expect(ack!.acknowledgedBy).toBe("mark@jmdie");
    expect(e.listPending()).toHaveLength(0);
  });

  it("history retains acknowledged packets", () => {
    const p = e.escalate({ type: "wire_break", summary: "x" });
    e.acknowledge(p.id, "op");
    expect(e.getHistory()).toHaveLength(1);
  });

  it("acknowledge() returns null for unknown ids", () => {
    expect(e.acknowledge("HO-missing", "op")).toBeNull();
  });

  it("getPending() returns defensive copies", () => {
    const p = e.escalate({ type: "wire_break", summary: "x" });
    const pending = e.getPending(p.id)!;
    pending.summary = "mutated";
    expect(e.getPending(p.id)!.summary).toBe("x");
  });

  it("reset() clears pending, history, and counter", () => {
    e.escalate({ type: "wire_break", summary: "a" });
    e.escalate({ type: "wire_break", summary: "b" });
    e.reset();
    expect(e.listPending()).toHaveLength(0);
    expect(e.getHistory()).toHaveLength(0);
    // Counter reset: new ids still work.
    const fresh = e.escalate({ type: "wire_break", summary: "c" });
    expect(fresh.id).toMatch(/^HO-/);
  });
});

// ----------------------------------------------------------------------------
// Realistic scenario
// ----------------------------------------------------------------------------

describe("WEDMHumanHandoffEngine — scenario: terminal wire break", () => {
  it("4th wire break → escalation packet with bumped severity", () => {
    const e = new WEDMHumanHandoffEngine();
    const packet: HandoffPacket = e.escalate({
      type: "wire_break",
      summary: "4th wire break this job — unable to auto-recover",
      plan: plan("wire_break", "human_escalate", 4, true),
      snapshot: { wire_tension_g: 950, gap_V: 55, resistivity_M: 7.2 },
      context: { total_breaks: 4 },
    });
    expect(packet.severity).toBe("high"); // medium → high because terminal
    expect(packet.urgency).toBe("high");
    expect(packet.suggestedAction.length).toBeGreaterThan(0);
    expect(packet.plan).toBeDefined();
    expect(packet.context.total_breaks).toBe(4);
  });
});
