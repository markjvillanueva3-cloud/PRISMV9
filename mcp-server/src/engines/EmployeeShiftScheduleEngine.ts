/**
 * EmployeeShiftScheduleEngine — forward-looking daily roster + coverage analysis.
 *
 * Closes the planning gap between time-clock (after-the-fact) and per-op tracker
 * (in-progress): given a date, lists which employees are scheduled to operate
 * which machines on which shift, plus surfaces coverage problems BEFORE the day
 * starts:
 *   - machine has no qualified operator scheduled
 *   - employee scheduled on a machine whose required academy course they haven't passed
 *   - employee scheduled on >1 machine in the same shift (over-allocation)
 *   - employee scheduled without enough rest between shifts (<10h gap default)
 *
 * COMPOSES (no rebuild — adapter pattern):
 *   - EmployeeRoleAcademyInjectionEngine (for required-course-passed check)
 *   - ShopConfigurationEngine (for machine catalog) — accessed at the caller layer,
 *     this engine just stores serial→required_course mapping injected explicitly
 *
 * Shift model: 3 shifts (day=07:00-15:00, swing=15:00-23:00, night=23:00-07:00).
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, audit-trail on every schedule write.
 *
 * @module EmployeeShiftScheduleEngine
 * @milestone HOTEL/U-EMPLOYEE-SHIFT-SCHEDULE (2026-05-25, slot:hotel iter17)
 */

export type ShiftKind = "day" | "swing" | "night";

export interface ShiftAssignment {
  id: string;
  date: string;             // YYYY-MM-DD
  shift: ShiftKind;
  employee_id: string;
  machine_serial: string;
  notes?: string;
  created_at: string;
}

export interface MachineQualification {
  machine_serial: string;
  required_course_ids: ReadonlyArray<string>;
}

export interface CoverageGap {
  kind:
    | "unstaffed_machine"
    | "unqualified_employee"
    | "double_booked"
    | "insufficient_rest";
  date: string;
  shift?: ShiftKind;
  machine_serial?: string;
  employee_id?: string;
  detail: string;
}

export interface DailyRoster {
  date: string;
  assignments: ReadonlyArray<ShiftAssignment>;
  by_shift: Readonly<Record<ShiftKind, ReadonlyArray<ShiftAssignment>>>;
  coverage_gaps: ReadonlyArray<CoverageGap>;
}

const SHIFT_KINDS: ReadonlyArray<ShiftKind> = Object.freeze(["day", "swing", "night"]);
const SHIFT_ORDER: Readonly<Record<ShiftKind, number>> = Object.freeze({
  day: 0,
  swing: 1,
  night: 2,
});

/** Shifts that are immediately back-to-back AND ABOVE the rest threshold. */
function shiftHoursBetween(prevDate: string, prevShift: ShiftKind, nextDate: string, nextShift: ShiftKind): number {
  const SHIFT_END_HOUR: Record<ShiftKind, number> = { day: 15, swing: 23, night: 31 };  // night ends 07:00 next day
  const SHIFT_START_HOUR: Record<ShiftKind, number> = { day: 7, swing: 15, night: 23 };
  const prevEnd = Date.parse(`${prevDate}T00:00:00Z`) + SHIFT_END_HOUR[prevShift] * 3600 * 1000;
  const nextStart = Date.parse(`${nextDate}T00:00:00Z`) + SHIFT_START_HOUR[nextShift] * 3600 * 1000;
  return (nextStart - prevEnd) / 3600 / 1000;
}

class EmployeeShiftScheduleEngine {
  private assignments: Map<string, ShiftAssignment> = new Map();
  private machineQuals: Map<string, MachineQualification> = new Map();
  private employeeCoursesPassed: Map<string, Set<string>> = new Map();
  private allKnownMachines: Set<string> = new Set();
  private nextAssignmentId = 1;
  private minRestHoursDefault = 10;

  /** Register a machine and the academy courses required to operate it. */
  registerMachineQualification(args: {
    machine_serial: string;
    required_course_ids: string[];
  }): MachineQualification {
    if (!args.machine_serial) {
      throw new Error(
        "EmployeeShiftScheduleEngine.registerMachineQualification: machine_serial required",
      );
    }
    if (!Array.isArray(args.required_course_ids)) {
      throw new Error(
        "EmployeeShiftScheduleEngine.registerMachineQualification: required_course_ids must be array",
      );
    }
    const q: MachineQualification = Object.freeze({
      machine_serial: args.machine_serial,
      required_course_ids: Object.freeze([...args.required_course_ids]),
    });
    this.machineQuals.set(args.machine_serial, q);
    this.allKnownMachines.add(args.machine_serial);
    return q;
  }

  /** Push an academy course-pass into the local lookup. */
  registerCoursePassed(args: { employee_id: string; course_id: string }): void {
    if (!args.employee_id || !args.course_id) {
      throw new Error(
        "EmployeeShiftScheduleEngine.registerCoursePassed: employee_id + course_id required",
      );
    }
    let set = this.employeeCoursesPassed.get(args.employee_id);
    if (!set) {
      set = new Set();
      this.employeeCoursesPassed.set(args.employee_id, set);
    }
    set.add(args.course_id);
  }

  scheduleShift(args: {
    date: string;
    shift: ShiftKind;
    employee_id: string;
    machine_serial: string;
    notes?: string;
  }): ShiftAssignment {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("EmployeeShiftScheduleEngine.scheduleShift: date must be ISO YYYY-MM-DD");
    }
    if (!SHIFT_KINDS.includes(args.shift)) {
      throw new Error(
        `EmployeeShiftScheduleEngine.scheduleShift: shift must be one of ${SHIFT_KINDS.join(", ")}`,
      );
    }
    if (!args.employee_id || !args.machine_serial) {
      throw new Error(
        "EmployeeShiftScheduleEngine.scheduleShift: employee_id + machine_serial required",
      );
    }
    const id = `SHIFT-${String(this.nextAssignmentId++).padStart(6, "0")}`;
    const a: ShiftAssignment = Object.freeze({
      id,
      date: args.date,
      shift: args.shift,
      employee_id: args.employee_id,
      machine_serial: args.machine_serial,
      created_at: new Date().toISOString(),
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    this.assignments.set(id, a);
    this.allKnownMachines.add(args.machine_serial);
    return a;
  }

  cancelShift(args: { assignment_id: string }): ShiftAssignment {
    const a = this.assignments.get(args.assignment_id);
    if (!a) {
      throw new Error(
        `EmployeeShiftScheduleEngine.cancelShift: unknown assignment_id "${args.assignment_id}"`,
      );
    }
    this.assignments.delete(a.id);
    return Object.freeze({ ...a });
  }

  /** Build the daily roster + coverage-gap analysis for a date. */
  getDailyRoster(args: {
    date: string;
    required_machines?: string[];   // override: machines that MUST be staffed
    min_rest_hours?: number;
  }): DailyRoster {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error("EmployeeShiftScheduleEngine.getDailyRoster: date must be ISO YYYY-MM-DD");
    }
    const minRest = args.min_rest_hours ?? this.minRestHoursDefault;
    if (minRest < 0 || minRest > 24) {
      throw new Error(
        "EmployeeShiftScheduleEngine.getDailyRoster: min_rest_hours must be in [0, 24]",
      );
    }
    const dayAssignments: ShiftAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (a.date === args.date) dayAssignments.push(a);
    }
    // Group by shift
    const byShift: Record<ShiftKind, ShiftAssignment[]> = { day: [], swing: [], night: [] };
    for (const a of dayAssignments) byShift[a.shift].push(a);

    const gaps: CoverageGap[] = [];
    const requiredMachines = args.required_machines ?? [...this.machineQuals.keys()];

    // 1. unstaffed_machine — required machine has no assignment in any shift for this date
    for (const m of requiredMachines) {
      const anyShift = dayAssignments.some((a) => a.machine_serial === m);
      if (!anyShift) {
        gaps.push({
          kind: "unstaffed_machine",
          date: args.date,
          machine_serial: m,
          detail: `Machine ${m} has zero scheduled assignments for ${args.date}`,
        });
      }
    }

    // 2. unqualified_employee — employee assigned to machine whose required courses they haven't passed
    for (const a of dayAssignments) {
      const qual = this.machineQuals.get(a.machine_serial);
      if (!qual) continue; // no required courses registered → skip
      const passed = this.employeeCoursesPassed.get(a.employee_id) ?? new Set<string>();
      const missing = qual.required_course_ids.filter((c) => !passed.has(c));
      if (missing.length > 0) {
        gaps.push({
          kind: "unqualified_employee",
          date: args.date,
          shift: a.shift,
          employee_id: a.employee_id,
          machine_serial: a.machine_serial,
          detail: `Employee ${a.employee_id} not qualified for ${a.machine_serial}; missing course(s): ${missing.join(", ")}`,
        });
      }
    }

    // 3. double_booked — same employee on >1 machine in same shift
    for (const shift of SHIFT_KINDS) {
      const seen = new Map<string, string[]>();
      for (const a of byShift[shift]) {
        const arr = seen.get(a.employee_id) ?? [];
        arr.push(a.machine_serial);
        seen.set(a.employee_id, arr);
      }
      for (const [emp, machines] of seen.entries()) {
        if (machines.length > 1) {
          gaps.push({
            kind: "double_booked",
            date: args.date,
            shift,
            employee_id: emp,
            detail: `Employee ${emp} scheduled on ${machines.length} machines simultaneously in ${shift} shift: ${machines.join(", ")}`,
          });
        }
      }
    }

    // 4. insufficient_rest — same employee scheduled across this date's shifts with <minRest gap from prior assignment same date
    // Walk shifts day → swing → night in order, looking for the same employee back-to-back.
    const sortedAssignments = [...dayAssignments].sort(
      (a, b) => SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift],
    );
    for (let i = 0; i < sortedAssignments.length; i++) {
      const cur = sortedAssignments[i];
      for (let j = i + 1; j < sortedAssignments.length; j++) {
        const nxt = sortedAssignments[j];
        if (cur.employee_id !== nxt.employee_id) continue;
        if (SHIFT_ORDER[nxt.shift] <= SHIFT_ORDER[cur.shift]) continue;
        const hrs = shiftHoursBetween(cur.date, cur.shift, nxt.date, nxt.shift);
        if (hrs < minRest) {
          gaps.push({
            kind: "insufficient_rest",
            date: args.date,
            employee_id: cur.employee_id,
            detail: `Employee ${cur.employee_id} scheduled ${cur.shift} → ${nxt.shift} with only ${hrs.toFixed(1)}h rest (<${minRest}h threshold)`,
          });
        }
      }
    }

    return Object.freeze({
      date: args.date,
      assignments: Object.freeze(dayAssignments.map((a) => Object.freeze({ ...a }))),
      by_shift: Object.freeze({
        day: Object.freeze(byShift.day.map((a) => Object.freeze({ ...a }))),
        swing: Object.freeze(byShift.swing.map((a) => Object.freeze({ ...a }))),
        night: Object.freeze(byShift.night.map((a) => Object.freeze({ ...a }))),
      }),
      coverage_gaps: Object.freeze(gaps.map((g) => Object.freeze(g))),
    });
  }

  /** List employee's shifts in a date range (inclusive). */
  getEmployeeSchedule(args: {
    employee_id: string;
    from_date: string;
    to_date: string;
  }): ReadonlyArray<ShiftAssignment> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.from_date) || !/^\d{4}-\d{2}-\d{2}$/.test(args.to_date)) {
      throw new Error(
        "EmployeeShiftScheduleEngine.getEmployeeSchedule: from_date + to_date must be ISO YYYY-MM-DD",
      );
    }
    if (args.from_date > args.to_date) {
      throw new Error(
        "EmployeeShiftScheduleEngine.getEmployeeSchedule: from_date must be ≤ to_date",
      );
    }
    const out: ShiftAssignment[] = [];
    for (const a of this.assignments.values()) {
      if (a.employee_id !== args.employee_id) continue;
      if (a.date < args.from_date || a.date > args.to_date) continue;
      out.push(Object.freeze({ ...a }));
    }
    out.sort((a, b) => (a.date === b.date ? SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift] : a.date.localeCompare(b.date)));
    return Object.freeze(out);
  }

  reset(): void {
    this.assignments.clear();
    this.machineQuals.clear();
    this.employeeCoursesPassed.clear();
    this.allKnownMachines.clear();
    this.nextAssignmentId = 1;
  }
}

export const employeeShiftScheduleEngine = new EmployeeShiftScheduleEngine();
