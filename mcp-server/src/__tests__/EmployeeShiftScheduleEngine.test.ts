/**
 * EmployeeShiftScheduleEngine.test.ts — HOTEL/U-EMPLOYEE-SHIFT-SCHEDULE (iter17)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeShiftScheduleEngine } from "../engines/EmployeeShiftScheduleEngine.js";

describe("EmployeeShiftScheduleEngine", () => {
  beforeEach(() => employeeShiftScheduleEngine.reset());

  describe("scheduleShift — happy path", () => {
    it("creates a day shift assignment with correct fields", () => {
      const s = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-001",
        machine_serial: "HAAS-VF2-001",
      });
      expect(s.id).toMatch(/^SHIFT-\d{6}$/);
      expect(s.shift).toBe("day");
      expect(s.machine_serial).toBe("HAAS-VF2-001");
      expect(s.employee_id).toBe("EMP-001");
      expect(s.date).toBe("2026-06-01");
      expect(Object.isFrozen(s)).toBe(true);
    });

    it("variability — supports all 3 shift kinds", () => {
      const day = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-D",
        machine_serial: "M1",
      });
      const swing = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-S",
        machine_serial: "M2",
      });
      const night = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "night",
        employee_id: "EMP-N",
        machine_serial: "M3",
      });
      expect([day.shift, swing.shift, night.shift]).toEqual(["day", "swing", "night"]);
    });

    it("R12 throws on bad date format", () => {
      expect(() =>
        employeeShiftScheduleEngine.scheduleShift({
          date: "June 1, 2026",
          shift: "day",
          employee_id: "E",
          machine_serial: "M",
        }),
      ).toThrow(/date must be ISO YYYY-MM-DD/);
    });

    it("R12 throws on invalid shift kind", () => {
      expect(() =>
        employeeShiftScheduleEngine.scheduleShift({
          date: "2026-06-01",
          shift: "graveyard" as never,
          employee_id: "E",
          machine_serial: "M",
        }),
      ).toThrow(/shift must be one of/);
    });

    it("R12 throws on missing employee_id or machine_serial", () => {
      expect(() =>
        employeeShiftScheduleEngine.scheduleShift({
          date: "2026-06-01",
          shift: "day",
          employee_id: "",
          machine_serial: "M",
        }),
      ).toThrow(/employee_id \+ machine_serial required/);
    });
  });

  describe("cancelShift", () => {
    it("removes a previously-scheduled assignment", () => {
      const s = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-X",
        machine_serial: "M1",
      });
      const cancelled = employeeShiftScheduleEngine.cancelShift({ assignment_id: s.id });
      expect(cancelled.id).toBe(s.id);
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      expect(roster.assignments).toHaveLength(0);
    });

    it("R12 throws on unknown assignment_id", () => {
      expect(() =>
        employeeShiftScheduleEngine.cancelShift({ assignment_id: "NOPE" }),
      ).toThrow(/unknown assignment_id/);
    });
  });

  describe("Daily roster coverage-gap detection", () => {
    it("detects unstaffed_machine when required machine has no assignment", () => {
      employeeShiftScheduleEngine.registerMachineQualification({
        machine_serial: "HAAS-VF2-001",
        required_course_ids: ["course-0a", "course-0b"],
      });
      employeeShiftScheduleEngine.registerMachineQualification({
        machine_serial: "OKUMA-LATHE-001",
        required_course_ids: ["course-5"],
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-1",
        machine_serial: "HAAS-VF2-001",
      });
      employeeShiftScheduleEngine.registerCoursePassed({ employee_id: "EMP-1", course_id: "course-0a" });
      employeeShiftScheduleEngine.registerCoursePassed({ employee_id: "EMP-1", course_id: "course-0b" });
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      const unstaffed = roster.coverage_gaps.filter((g) => g.kind === "unstaffed_machine");
      expect(unstaffed).toHaveLength(1);
      expect(unstaffed[0].machine_serial).toBe("OKUMA-LATHE-001");
    });

    it("detects unqualified_employee when missing required course", () => {
      employeeShiftScheduleEngine.registerMachineQualification({
        machine_serial: "FIVE-AX-001",
        required_course_ids: ["course-8", "course-32"],
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-J",
        machine_serial: "FIVE-AX-001",
      });
      employeeShiftScheduleEngine.registerCoursePassed({ employee_id: "EMP-J", course_id: "course-8" });
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      const unqualified = roster.coverage_gaps.find((g) => g.kind === "unqualified_employee");
      expect(unqualified).toMatchObject({
        kind: "unqualified_employee",
        date: "2026-06-01",
        employee_id: "EMP-J",
        machine_serial: "FIVE-AX-001",
      });
      expect(unqualified!.detail).toContain("course-32");
    });

    it("detects double_booked when employee on >1 machine same shift", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-DOUBLE",
        machine_serial: "M1",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-DOUBLE",
        machine_serial: "M2",
      });
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      const dbl = roster.coverage_gaps.find((g) => g.kind === "double_booked");
      expect(dbl).toMatchObject({
        kind: "double_booked",
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-DOUBLE",
      });
      expect(dbl!.detail).toContain("2 machines");
    });

    it("detects insufficient_rest when day→swing same employee (<10h rest)", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-TIRED",
        machine_serial: "M1",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-TIRED",
        machine_serial: "M2",
      });
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      const rest = roster.coverage_gaps.find((g) => g.kind === "insufficient_rest");
      expect(rest).toMatchObject({
        kind: "insufficient_rest",
        date: "2026-06-01",
        employee_id: "EMP-TIRED",
      });
      expect(rest!.detail).toMatch(/0\.0h rest/);
    });

    it("min_rest_hours=0 suppresses insufficient_rest classification", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-NORST",
        machine_serial: "M1",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "swing",
        employee_id: "EMP-NORST",
        machine_serial: "M2",
      });
      const roster = employeeShiftScheduleEngine.getDailyRoster({
        date: "2026-06-01",
        min_rest_hours: 0,
      });
      const restGaps = roster.coverage_gaps.filter(
        (g) => g.kind === "insufficient_rest" && g.employee_id === "EMP-NORST",
      );
      expect(restGaps).toHaveLength(0);
      // But the assignments still exist
      expect(roster.assignments).toHaveLength(2);
    });

    it("happy path: all machines staffed + qualified + no double-book → only the configured-gap kinds appear empty", () => {
      employeeShiftScheduleEngine.registerMachineQualification({
        machine_serial: "M1",
        required_course_ids: ["course-1"],
      });
      employeeShiftScheduleEngine.registerCoursePassed({ employee_id: "EMP-A", course_id: "course-1" });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-A",
        machine_serial: "M1",
      });
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      expect(roster.coverage_gaps.filter((g) => g.kind === "unqualified_employee")).toHaveLength(0);
      expect(roster.coverage_gaps.filter((g) => g.kind === "double_booked")).toHaveLength(0);
      expect(roster.coverage_gaps.filter((g) => g.kind === "insufficient_rest")).toHaveLength(0);
      expect(roster.coverage_gaps.filter((g) => g.kind === "unstaffed_machine")).toHaveLength(0);
    });
  });

  describe("Daily roster shape", () => {
    it("groups assignments by shift correctly across all 3 shifts", () => {
      for (const [shift, emp] of [["day", "A"], ["swing", "B"], ["night", "C"]] as const) {
        employeeShiftScheduleEngine.scheduleShift({
          date: "2026-06-02",
          shift,
          employee_id: `EMP-${emp}`,
          machine_serial: `M-${emp}`,
        });
      }
      const roster = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-02" });
      expect(roster.by_shift.day).toHaveLength(1);
      expect(roster.by_shift.swing).toHaveLength(1);
      expect(roster.by_shift.night).toHaveLength(1);
      expect(roster.by_shift.day[0].employee_id).toBe("EMP-A");
      expect(roster.by_shift.swing[0].employee_id).toBe("EMP-B");
      expect(roster.by_shift.night[0].employee_id).toBe("EMP-C");
    });

    it("R12 throws on bad date format", () => {
      expect(() =>
        employeeShiftScheduleEngine.getDailyRoster({ date: "2026/06/01" }),
      ).toThrow(/date must be ISO YYYY-MM-DD/);
    });

    it("R12 throws on out-of-range min_rest_hours", () => {
      expect(() =>
        employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01", min_rest_hours: 30 }),
      ).toThrow(/min_rest_hours must be in/);
    });
  });

  describe("getEmployeeSchedule — date-range view", () => {
    it("returns assignments in sorted order across multiple dates", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-03",
        shift: "night",
        employee_id: "EMP-W",
        machine_serial: "M1",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-W",
        machine_serial: "M2",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-02",
        shift: "swing",
        employee_id: "EMP-W",
        machine_serial: "M3",
      });
      const sched = employeeShiftScheduleEngine.getEmployeeSchedule({
        employee_id: "EMP-W",
        from_date: "2026-06-01",
        to_date: "2026-06-03",
      });
      expect(sched).toHaveLength(3);
      expect(sched[0].date).toBe("2026-06-01");
      expect(sched[1].date).toBe("2026-06-02");
      expect(sched[2].date).toBe("2026-06-03");
    });

    it("filters out other employees", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-W",
        machine_serial: "M1",
      });
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-Y",
        machine_serial: "M2",
      });
      const sched = employeeShiftScheduleEngine.getEmployeeSchedule({
        employee_id: "EMP-W",
        from_date: "2026-06-01",
        to_date: "2026-06-01",
      });
      expect(sched).toHaveLength(1);
      expect(sched[0].employee_id).toBe("EMP-W");
    });

    it("R12 throws when from_date > to_date", () => {
      expect(() =>
        employeeShiftScheduleEngine.getEmployeeSchedule({
          employee_id: "E",
          from_date: "2026-06-05",
          to_date: "2026-06-01",
        }),
      ).toThrow(/from_date must be ≤ to_date/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned roster + nested arrays are frozen", () => {
      employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-F",
        machine_serial: "M1",
      });
      const r = employeeShiftScheduleEngine.getDailyRoster({ date: "2026-06-01" });
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.assignments)).toBe(true);
      expect(Object.isFrozen(r.by_shift)).toBe(true);
      expect(Object.isFrozen(r.coverage_gaps)).toBe(true);
    });

    it("PII-free — only employee_id strings, no names/SSN", () => {
      const s = employeeShiftScheduleEngine.scheduleShift({
        date: "2026-06-01",
        shift: "day",
        employee_id: "EMP-P",
        machine_serial: "M1",
      });
      const keys = Object.keys(s);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
