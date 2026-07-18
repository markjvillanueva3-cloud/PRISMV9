/**
 * Tests for AlarmEscalationEngine — RT-MS2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AlarmEscalationEngine } from "../engines/AlarmEscalationEngine.js";

describe("AlarmEscalationEngine", () => {
  let engine: AlarmEscalationEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new AlarmEscalationEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates instance with default rules", () => {
    const rules = engine.getRules();
    expect(rules.length).toBe(5);
    expect(rules.map(r => r.id)).toContain("SPINDLE_OVERLOAD");
    expect(rules.map(r => r.id)).toContain("MACHINE_CRASH");
  });

  it("adds custom rules", () => {
    engine.addRule({
      id: "CUSTOM_1", name: "Custom Rule",
      condition: "temp > 100", severity: "warn",
      escalation_delay_sec: 60, escalate_to: "critical",
      notify_channels: ["ws"], auto_resolve: false,
    });
    expect(engine.getRules().length).toBe(6);
  });

  it("triggers alarms with sequential IDs", () => {
    const a1 = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Spindle at 97%");
    const a2 = engine.trigger("TOOL_LIFE_LOW", "machine:haas-vf2", "Tool T3 at 8%");
    expect(a1.id).toMatch(/^ALM-\d{6}$/);
    expect(a1.state).toBe("active");
    expect(a1.severity).toBe("critical");
    expect(a2.severity).toBe("warn");
    expect(a1.escalation_count).toBe(0);
  });

  it("triggers alarm with unknown rule defaults to warn", () => {
    const a = engine.trigger("NONEXISTENT", "machine:x", "Unknown rule");
    expect(a.severity).toBe("warn");
  });

  it("acknowledges active alarms", () => {
    const alarm = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Overload");
    const ack = engine.acknowledge(alarm.id, "user:john");
    expect(ack).not.toBeNull();
    expect(ack!.state).toBe("acknowledged");
    expect(ack!.acknowledged_by).toBe("user:john");
    expect(ack!.acknowledged_at).toBeDefined();
  });

  it("cannot acknowledge non-active alarms", () => {
    const alarm = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Overload");
    engine.acknowledge(alarm.id, "user:john");
    const again = engine.acknowledge(alarm.id, "user:jane");
    expect(again).toBeNull();
  });

  it("resolves alarms", () => {
    const alarm = engine.trigger("TOOL_LIFE_LOW", "machine:haas-vf2", "Low tool");
    const resolved = engine.resolve(alarm.id);
    expect(resolved).not.toBeNull();
    expect(resolved!.state).toBe("resolved");
    expect(resolved!.resolved_at).toBeDefined();
  });

  it("returns null resolving nonexistent alarm", () => {
    expect(engine.resolve("ALM-999999")).toBeNull();
  });

  it("escalates alarm after delay", () => {
    const alarm = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Spindle hot");
    // SPINDLE_OVERLOAD has 30s escalation delay
    vi.advanceTimersByTime(30_000);
    // Re-read from engine (mutation in place)
    const active = engine.getActive();
    const escalated = active.find(a => a.id === alarm.id);
    expect(escalated).toBeDefined();
    expect(escalated!.state).toBe("escalated");
    expect(escalated!.severity).toBe("emergency");
    expect(escalated!.escalation_count).toBe(1);
  });

  it("acknowledging cancels escalation", () => {
    const alarm = engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "Spindle");
    engine.acknowledge(alarm.id, "user:op1");
    vi.advanceTimersByTime(60_000);
    // Should still be acknowledged, not escalated
    const history = engine.history();
    const found = history.find(a => a.id === alarm.id);
    expect(found!.state).toBe("acknowledged");
  });

  it("getActive filters by severity", () => {
    engine.trigger("SPINDLE_OVERLOAD", "machine:a", "Critical alarm");
    engine.trigger("TOOL_LIFE_LOW", "machine:b", "Warn alarm");
    const critical = engine.getActive({ severity: "critical" });
    expect(critical.length).toBe(1);
    expect(critical[0].severity).toBe("critical");
  });

  it("getActive filters by source", () => {
    engine.trigger("SPINDLE_OVERLOAD", "machine:haas-vf2", "A");
    engine.trigger("TOOL_LIFE_LOW", "machine:dmg-mori", "B");
    const haas = engine.getActive({ source: "haas" });
    expect(haas.length).toBe(1);
    expect(haas[0].source).toContain("haas");
  });

  it("getActive sorts by severity (emergency first)", () => {
    engine.trigger("TOOL_LIFE_LOW", "machine:a", "Warn");
    engine.trigger("MACHINE_CRASH", "machine:b", "Emergency");
    engine.trigger("SPINDLE_OVERLOAD", "machine:c", "Critical");
    const active = engine.getActive();
    expect(active[0].severity).toBe("emergency");
    expect(active[1].severity).toBe("critical");
    expect(active[2].severity).toBe("warn");
  });

  it("history returns all alarms", () => {
    engine.trigger("SPINDLE_OVERLOAD", "machine:a", "First");
    vi.advanceTimersByTime(1000);
    engine.trigger("TOOL_LIFE_LOW", "machine:b", "Second");
    const hist = engine.history(10);
    expect(hist.length).toBe(2);
    // Most recent first (sorted by created_at desc)
    expect(hist[0].message).toBe("Second");
    expect(hist[1].message).toBe("First");
  });

  it("stats returns correct counts", () => {
    const alarm1 = engine.trigger("SPINDLE_OVERLOAD", "machine:a", "Active");
    const alarm2 = engine.trigger("TOOL_LIFE_LOW", "machine:b", "To resolve");
    const alarm3 = engine.trigger("COOLANT_LOW", "machine:c", "To ack");
    engine.resolve(alarm2.id);
    engine.acknowledge(alarm3.id, "user:x");

    const s = engine.stats();
    expect(s.total_alarms).toBe(3);
    expect(s.active).toBe(1);
    expect(s.acknowledged).toBe(1);
    expect(s.resolved).toBe(1);
    expect(s.rules).toBe(5);
    expect(s.by_severity.critical).toBe(1);
  });

  it("exports singleton", async () => {
    const { alarmEscalationEngine } = await import("../engines/AlarmEscalationEngine.js");
    expect(alarmEscalationEngine).toBeDefined();
    expect(alarmEscalationEngine).toBeInstanceOf(AlarmEscalationEngine);
  });
});
