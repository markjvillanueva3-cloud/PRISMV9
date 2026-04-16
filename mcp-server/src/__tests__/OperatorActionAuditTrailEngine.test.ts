import { describe, it, expect } from "vitest";
import { operatorActionAuditTrailEngine } from "../engines/OperatorActionAuditTrailEngine.js";

const EV1 = {
  event_id: "E1",
  timestamp: "2026-04-16T10:00:00Z",
  operator_id: "alice",
  machine_id: "LATHE-07",
  action: "feed_rate_override" as const,
  reason_code: "R7_dimension_nudge" as const,
  before_value: 100,
  after_value: 80,
};

const EV2 = {
  event_id: "E2",
  timestamp: "2026-04-16T10:05:00Z",
  operator_id: "bob",
  machine_id: "LATHE-07",
  action: "e_stop" as const,
  reason_code: "R6_safety_concern" as const,
};

describe("OperatorActionAuditTrailEngine", () => {
  it("appends events to existing trail", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [EV1, EV2],
      existing_trail: [],
    });
    expect(r.appended_count).toBe(2);
    expect(r.total_trail_length).toBe(2);
  });

  it("returns events in filtered output", () => {
    const r = operatorActionAuditTrailEngine.record({ new_events: [EV1] });
    expect(r.filtered.length).toBe(1);
    expect(r.filtered[0].event_id).toBe("E1");
  });

  it("filters by machine_id", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [EV1, { ...EV2, machine_id: "MILL-03" }],
      filter_machine_id: "LATHE-07",
    });
    expect(r.filtered.length).toBe(1);
    expect(r.filtered[0].machine_id).toBe("LATHE-07");
  });

  it("filters by operator_id", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [EV1, EV2],
      filter_operator_id: "alice",
    });
    expect(r.filtered.length).toBe(1);
    expect(r.filtered[0].operator_id).toBe("alice");
  });

  it("time-window filter excludes events outside", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [EV1, EV2],
      filter_from: "2026-04-16T10:04:00Z",
    });
    expect(r.filtered.length).toBe(1);
    expect(r.filtered[0].event_id).toBe("E2");
  });

  it("summary_by_action counts correctly", () => {
    const r = operatorActionAuditTrailEngine.record({ new_events: [EV1, EV2] });
    expect(r.summary_by_action["feed_rate_override"]).toBe(1);
    expect(r.summary_by_action["e_stop"]).toBe(1);
  });

  it("summary_by_reason counts correctly", () => {
    const r = operatorActionAuditTrailEngine.record({ new_events: [EV1, EV2] });
    expect(r.summary_by_reason["R7_dimension_nudge"]).toBe(1);
  });

  it("flags missing required fields", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [{ ...EV1, operator_id: "" }],
    });
    expect(r.flags.some((f) => /missing/i.test(f) || /invalid/i.test(f))).toBe(true);
  });

  it("flags door_bypass without authorization", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [{
        event_id: "E9", timestamp: "2026-04-16T11:00:00Z",
        operator_id: "alice", machine_id: "LATHE-07",
        action: "door_bypass", reason_code: "R6_safety_concern",
      }],
    });
    expect(r.flags.some((f) => /door/i.test(f) || /authorization/i.test(f))).toBe(true);
  });

  it("no authorization flag when authorized_by provided", () => {
    const r = operatorActionAuditTrailEngine.record({
      new_events: [{
        event_id: "E9", timestamp: "2026-04-16T11:00:00Z",
        operator_id: "alice", machine_id: "LATHE-07",
        action: "door_bypass", reason_code: "R6_safety_concern",
        requires_authorization: true, authorized_by: "supervisor",
      }],
    });
    expect(r.flags.some((f) => /supervisor/i.test(f))).toBe(false);
  });

  it("high e-stop frequency triggers safety flag", () => {
    const estops = Array.from({ length: 4 }).map((_, k) => ({
      event_id: `ES${k}`,
      timestamp: `2026-04-16T1${k}:00:00Z`,
      operator_id: "alice", machine_id: "LATHE-07",
      action: "e_stop" as const, reason_code: "R6_safety_concern" as const,
    }));
    const r = operatorActionAuditTrailEngine.record({ new_events: estops });
    expect(r.flags.some((f) => /e-stop/i.test(f) || /frequency/i.test(f))).toBe(true);
  });

  it("time-sorted output", () => {
    const a = { ...EV1, event_id: "A", timestamp: "2026-04-16T12:00:00Z" };
    const b = { ...EV1, event_id: "B", timestamp: "2026-04-16T10:00:00Z" };
    const r = operatorActionAuditTrailEngine.record({ new_events: [a, b] });
    expect(r.filtered[0].event_id).toBe("B");
    expect(r.filtered[1].event_id).toBe("A");
  });

  it("limit truncates to most-recent N", () => {
    const events = Array.from({ length: 10 }).map((_, k) => ({
      ...EV1, event_id: `L${k}`, timestamp: `2026-04-16T1${k}:00:00Z`,
    }));
    const r = operatorActionAuditTrailEngine.record({ new_events: events, limit: 3 });
    expect(r.filtered.length).toBe(3);
  });

  it("getStats lists known actions and reasons", () => {
    const s = operatorActionAuditTrailEngine.getStats();
    expect(s.actions.length).toBeGreaterThanOrEqual(10);
    expect(s.reasons.length).toBeGreaterThanOrEqual(10);
  });
});
