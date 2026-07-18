/**
 * EmployeeTimeClockEngine.test.ts — HOTEL/U-EMPLOYEE-TIMECLOCK (iter36 /yolo)
 *
 * Tests construct ISO timestamps RELATIVE to "now" so they don't age out of the
 * 5-min future-drift window or the 24h forgotten-clock-out window over time.
 */
import { describe, it, expect } from "vitest";
import {
  employeeTimeClockEngine,
  type PunchEvent,
  type PunchInput,
} from "../engines/EmployeeTimeClockEngine.js";

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

function isoMinutesFromNow(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}

function makePunch(
  employee_id: string,
  kind: PunchInput["kind"],
  minutesAgo: number,
  punch_id?: string,
): PunchEvent {
  return Object.freeze({
    punch_id: punch_id ?? `P-${kind}-${minutesAgo}`,
    employee_id,
    kind,
    timestamp: isoMinutesAgo(minutesAgo),
  }) as PunchEvent;
}

const EMP = "EMP-JMD-005";

describe("EmployeeTimeClockEngine", () => {
  describe("recordPunch — punch FSM", () => {
    it("clock_in from clocked_out succeeds", () => {
      const p = employeeTimeClockEngine.recordPunch([], {
        employee_id: EMP, kind: "clock_in", timestamp: isoMinutesAgo(60),
      });
      expect(p.kind).toBe("clock_in");
      expect(p.employee_id).toBe(EMP);
      expect(Object.isFrozen(p)).toBe(true);
    });

    it("clock_out from clocked_in succeeds", () => {
      const existing = [makePunch(EMP, "clock_in", 60)];
      const p = employeeTimeClockEngine.recordPunch(existing, {
        employee_id: EMP, kind: "clock_out", timestamp: isoMinutesAgo(0),
      });
      expect(p.kind).toBe("clock_out");
    });

    it("double clock_in rejected", () => {
      const existing = [makePunch(EMP, "clock_in", 60)];
      expect(() =>
        employeeTimeClockEngine.recordPunch(existing, {
          employee_id: EMP, kind: "clock_in", timestamp: isoMinutesAgo(0),
        }),
      ).toThrow(/invalid punch clock_in in state clocked_in/);
    });

    it("clock_out without clock_in rejected", () => {
      expect(() =>
        employeeTimeClockEngine.recordPunch([], {
          employee_id: EMP, kind: "clock_out", timestamp: isoMinutesAgo(0),
        }),
      ).toThrow(/invalid punch clock_out in state clocked_out/);
    });

    it("end_break without start_break rejected", () => {
      const existing = [makePunch(EMP, "clock_in", 60)];
      expect(() =>
        employeeTimeClockEngine.recordPunch(existing, {
          employee_id: EMP, kind: "end_break", timestamp: isoMinutesAgo(0),
        }),
      ).toThrow(/invalid punch end_break in state clocked_in/);
    });

    it("clock_out during on_break rejected", () => {
      const existing = [
        makePunch(EMP, "clock_in", 120),
        makePunch(EMP, "start_break", 60),
      ];
      expect(() =>
        employeeTimeClockEngine.recordPunch(existing, {
          employee_id: EMP, kind: "clock_out", timestamp: isoMinutesAgo(0),
        }),
      ).toThrow(/invalid punch clock_out in state on_break/);
    });

    it("backdated punch (predates last) rejected", () => {
      const existing = [makePunch(EMP, "clock_in", 60)];
      expect(() =>
        employeeTimeClockEngine.recordPunch(existing, {
          employee_id: EMP, kind: "clock_out", timestamp: isoMinutesAgo(90),
        }),
      ).toThrow(/predates last punch/);
    });

    it("future timestamp (> 5 min clock-drift) rejected", () => {
      expect(() =>
        employeeTimeClockEngine.recordPunch([], {
          employee_id: EMP, kind: "clock_in", timestamp: isoMinutesFromNow(60),
        }),
      ).toThrow(/is in the future/);
    });
  });

  describe("editPunch — SoD enforcement", () => {
    it("approver != employee succeeds", () => {
      const p = makePunch(EMP, "clock_in", 60);
      const edited = employeeTimeClockEngine.editPunch(p, isoMinutesAgo(120), "EMP-MGR-01");
      expect(edited.edited).toBe(true);
      expect(edited.edit_approver_employee_id).toBe("EMP-MGR-01");
    });

    it("approver == employee rejected (SoD)", () => {
      const p = makePunch(EMP, "clock_in", 60);
      expect(() =>
        employeeTimeClockEngine.editPunch(p, isoMinutesAgo(120), EMP),
      ).toThrow(/approver must differ from the employee/);
    });

    it("missing approver rejected", () => {
      const p = makePunch(EMP, "clock_in", 60);
      expect(() =>
        employeeTimeClockEngine.editPunch(p, isoMinutesAgo(120), ""),
      ).toThrow(/edit requires approver_employee_id/);
    });
  });

  describe("getDailySummary — minute aggregation", () => {
    it("single 8h shift: 480 worked, no break", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 8 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(s.worked_minutes).toBe(480);
      expect(s.break_minutes).toBe(0);
      expect(s.current_state).toBe("clocked_out");
      expect(s.shift_count).toBe(1);
    });

    it("8h shift with 30min break: 450 worked + 30 break", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 8 * 60),
        makePunch(EMP, "start_break", 4 * 60),
        makePunch(EMP, "end_break", 3.5 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(s.worked_minutes).toBe(450);
      expect(s.break_minutes).toBe(30);
      expect(s.current_state).toBe("clocked_out");
    });

    it("missed_break flag fires on 7h shift with no break", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 7 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      const flag = s.flags.find((f) => f.kind === "missed_break");
      expect(flag).toMatchObject({
        kind: "missed_break",
        severity: "warn",
      });
      expect(flag?.detail).toMatch(/420.*no recorded break/);
    });

    it("weekly_ot_threshold fires when week-to-date + today > 40h", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 4 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches, 38 * 60);
      const flag = s.flags.find((f) => f.kind === "weekly_ot_threshold");
      expect(flag).toMatchObject({
        kind: "weekly_ot_threshold",
        severity: "warn",
      });
      expect(flag?.detail).toMatch(/2520min exceeds FLSA threshold 2400/);
      expect(flag?.detail).toMatch(/1\.5×/);
    });

    it("no OT flag when week-to-date + today <= 40h", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 4 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches, 30 * 60);
      const otFlagKinds = s.flags.map((f) => f.kind).filter((k) => k === "weekly_ot_threshold");
      expect(otFlagKinds).toEqual([]);
      expect(s.worked_minutes).toBe(240);
    });

    it("multi-shift day: 2 shifts add up correctly", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 10 * 60),
        makePunch(EMP, "clock_out", 8 * 60),
        makePunch(EMP, "clock_in", 4 * 60),
        makePunch(EMP, "clock_out", 1 * 60),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(s.worked_minutes).toBe(300);
      expect(s.shift_count).toBe(2);
    });

    it("still-open shift: current_state reflects in-progress", () => {
      const punches: PunchEvent[] = [makePunch(EMP, "clock_in", 60)];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(s.current_state).toBe("clocked_in");
      expect(s.shift_count).toBe(1);
    });

    it("on-break shift: current_state = on_break", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 120),
        makePunch(EMP, "start_break", 60),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(s.current_state).toBe("on_break");
    });

    it("foreign employee_id in punch list throws", () => {
      const punches: PunchEvent[] = [makePunch("EMP-OTHER", "clock_in", 60)];
      expect(() =>
        employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches),
      ).toThrow(/employee_id EMP-OTHER does not match/);
    });

    it("bad date format throws", () => {
      expect(() =>
        employeeTimeClockEngine.getDailySummary(EMP, "next Monday", []),
      ).toThrow(/date must be ISO/);
    });

    it("negative week-to-date throws", () => {
      expect(() =>
        employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", [], -1),
      ).toThrow(/weekToDateMinutes must be non-negative/);
    });
  });

  describe("deriveState — replay", () => {
    it("empty punches → clocked_out", () => {
      expect(employeeTimeClockEngine.deriveState([])).toBe("clocked_out");
    });

    it("clock_in → clocked_in", () => {
      expect(employeeTimeClockEngine.deriveState([
        makePunch(EMP, "clock_in", 30),
      ])).toBe("clocked_in");
    });

    it("clock_in + start_break → on_break", () => {
      expect(employeeTimeClockEngine.deriveState([
        makePunch(EMP, "clock_in", 60),
        makePunch(EMP, "start_break", 30),
      ])).toBe("on_break");
    });

    it("clock_in + clock_out → clocked_out", () => {
      expect(employeeTimeClockEngine.deriveState([
        makePunch(EMP, "clock_in", 60),
        makePunch(EMP, "clock_out", 0),
      ])).toBe("clocked_out");
    });

    it("full cycle clock_in + start_break + end_break + clock_out → clocked_out", () => {
      expect(employeeTimeClockEngine.deriveState([
        makePunch(EMP, "clock_in", 120),
        makePunch(EMP, "start_break", 90),
        makePunch(EMP, "end_break", 60),
        makePunch(EMP, "clock_out", 0),
      ])).toBe("clocked_out");
    });
  });

  describe("Hotel-soul invariants", () => {
    it("PII-free — only employee_id strings, no name/SSN", () => {
      const p = employeeTimeClockEngine.recordPunch([], {
        employee_id: EMP, kind: "clock_in", timestamp: isoMinutesAgo(60),
      });
      const j = JSON.stringify(p);
      expect(j).not.toMatch(/ssn/i);
      expect(j).not.toMatch(/employee_name|first_name|last_name|date.of.birth/i);
    });

    it("returned summaries + nested flags are frozen", () => {
      const punches: PunchEvent[] = [
        makePunch(EMP, "clock_in", 7 * 60),
        makePunch(EMP, "clock_out", 0),
      ];
      const s = employeeTimeClockEngine.getDailySummary(EMP, "2026-06-01", punches);
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.flags)).toBe(true);
      expect(s.flags.length).toBe(1);            // missed_break expected
      expect(s.flags[0].kind).toBe("missed_break");
      expect(Object.isFrozen(s.flags[0])).toBe(true);
      expect(Object.isFrozen(s.punches)).toBe(true);
    });

    it("variability floor — all 4 punch kinds round-trip cleanly", () => {
      const seq: Array<PunchInput["kind"]> = ["clock_in", "start_break", "end_break", "clock_out"];
      const punches: PunchEvent[] = [];
      let offset = 4 * 60;
      for (const kind of seq) {
        const ts = isoMinutesAgo(offset);
        const p = employeeTimeClockEngine.recordPunch(punches, {
          employee_id: EMP, kind, timestamp: ts,
        });
        punches.push({ ...p, timestamp: ts });
        offset -= 60;
      }
      expect(employeeTimeClockEngine.deriveState(punches)).toBe("clocked_out");
      expect(punches.map((p) => p.kind)).toEqual(seq);
    });
  });
});
