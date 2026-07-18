/**
 * TimeClockEngine.audit.test.ts — HOTEL-ERP-WIRING/U-ERP-TIMECARD-AUDIT
 *
 * Verifies the timecard-change audit trail: every status-transition write path (clock in/out, break,
 * job start/pause/resume/stop) appends an immutable audit record, and timecardAuditLog() reads the
 * REAL recorded trail (newest first, filterable) -- NOT a reconstruction from current state. This is
 * what backs the ERP /timecard-audit-log endpoint that erp-live-smoke found as a 501 stub.
 *
 * R9: real reference values on isolated `new TimeClockEngine()` instances with deterministic explicit
 * timestamps, so ordering/filtering assertions are stable.
 */
import { describe, it, expect } from "vitest";
import { TimeClockEngine } from "../engines/TimeClockEngine.js";
import { employeeEngine } from "../engines/EmployeeEngine.js";

let seq = 0;
function newEmp(): string {
  seq++;
  return employeeEngine.create({
    first_name: "Aud", last_name: `Probe${seq}`, email: `aud-probe-${seq}@jmdie.test`,
    department: "machining", role: "operator", hourly_rate: 30,
  }).id;
}

describe("TimeClockEngine — timecard audit trail", () => {
  it("empty engine -> timecardAuditLog data_available:false", () => {
    const e = new TimeClockEngine();
    const log = e.timecardAuditLog();
    expect(log.data_available).toBe(false);
    expect(log.total).toBe(0);
    expect(log.entries).toHaveLength(0);
  });

  it("records a clock_in transition with correct fields", () => {
    const e = new TimeClockEngine();
    const id = newEmp();
    const shift = e.clockIn({ employee_id: id, timestamp: "2026-06-15T08:00:00.000Z" });
    const log = e.timecardAuditLog({ employee_id: id });
    expect(log.data_available).toBe(true);
    expect(log.entries[0].action).toBe("clock_in");
    expect(log.entries[0].entity_type).toBe("shift");
    expect(log.entries[0].entity_id).toBe(shift.id);
    expect(log.entries[0].to_status).toBe("active");
    expect(log.entries[0].timestamp).toBe("2026-06-15T08:00:00.000Z");
  });

  it("records the full job lifecycle + clock_out, newest first", () => {
    const e = new TimeClockEngine();
    const id = newEmp();
    e.clockIn({ employee_id: id, timestamp: "2026-06-15T08:00:00.000Z" });
    e.jobStart({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T08:05:00.000Z" });
    e.jobPause({ employee_id: id, job_id: "J-1", reason: "tool change", reason_category: "tool_change", timestamp: "2026-06-15T09:00:00.000Z" });
    e.jobResume(id, "J-1", "2026-06-15T09:15:00.000Z");
    e.jobStop({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T10:00:00.000Z" });
    e.clockOut(id, "2026-06-15T16:00:00.000Z");
    const log = e.timecardAuditLog({ employee_id: id });
    expect(log.entries.map((x) => x.action)).toEqual([
      "clock_out", "job_stop", "job_resume", "job_pause", "job_start", "clock_in",
    ]);
    const pause = log.entries.find((x) => x.action === "job_pause");
    expect(pause?.from_status).toBe("active");
    expect(pause?.to_status).toBe("paused");
    expect(pause?.detail).toBe("tool_change");
    expect(pause?.job_id).toBe("J-1");
  });

  it("filters by entity_type and action", () => {
    const e = new TimeClockEngine();
    const id = newEmp();
    e.clockIn({ employee_id: id, timestamp: "2026-06-15T08:00:00.000Z" });
    e.jobStart({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T08:05:00.000Z" });
    e.jobStop({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T09:00:00.000Z" });
    const jobOnly = e.timecardAuditLog({ employee_id: id, entity_type: "job" });
    expect(jobOnly.total).toBe(2); // job_start + job_stop
    expect(jobOnly.entries.every((x) => x.entity_type === "job")).toBe(true);
    const stops = e.timecardAuditLog({ employee_id: id, action: "job_stop" });
    expect(stops.total).toBe(1);
    expect(stops.entries[0].action).toBe("job_stop");
  });

  it("respects the limit, returning the newest entries first", () => {
    const e = new TimeClockEngine();
    const id = newEmp();
    e.clockIn({ employee_id: id, timestamp: "2026-06-15T08:00:00.000Z" });
    e.jobStart({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T08:05:00.000Z" });
    e.jobStop({ employee_id: id, job_id: "J-1", timestamp: "2026-06-15T09:00:00.000Z" });
    const limited = e.timecardAuditLog({ employee_id: id, limit: 2 });
    expect(limited.total).toBe(3);
    expect(limited.returned).toBe(2);
    expect(limited.entries.map((x) => x.action)).toEqual(["job_stop", "job_start"]);
  });

  it("records a break_added event with the minutes detail", () => {
    const e = new TimeClockEngine();
    const id = newEmp();
    e.clockIn({ employee_id: id, timestamp: "2026-06-15T08:00:00.000Z" });
    e.addBreak(id, 15);
    const log = e.timecardAuditLog({ employee_id: id, action: "break_added" });
    expect(log.total).toBe(1);
    expect(log.entries[0].detail).toBe("+15min");
  });

  it("isolates trails per employee (filter returns only that employee's events)", () => {
    const e = new TimeClockEngine();
    const a = newEmp();
    const b = newEmp();
    e.clockIn({ employee_id: a, timestamp: "2026-06-15T08:00:00.000Z" });
    e.clockIn({ employee_id: b, timestamp: "2026-06-15T08:01:00.000Z" });
    const logA = e.timecardAuditLog({ employee_id: a });
    expect(logA.total).toBe(1);
    expect(logA.entries.every((x) => x.employee_id === a)).toBe(true);
  });
});
