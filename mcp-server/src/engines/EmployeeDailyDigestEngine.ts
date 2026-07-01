/**
 * EmployeeDailyDigestEngine — per-employee daily synergy capstone.
 *
 * The single consumer surface that ties together this batch's 8 employee/business
 * engines into ONE phone-ready daily view per employee:
 *   • today + tomorrow shift (from EmployeeShiftScheduleEngine)
 *   • PTO balance + pending requests (from EmployeePTOAccrualEngine)
 *   • required-course punch-list (from EmployeeRoleAcademyInjectionEngine)
 *   • coaching nudges (from EmployeePerformanceFeedbackEngine)
 *   • last gross-pay snapshot (from EmployeePayrollGrossPayEngine)
 *   • role + tier + readiness (composite view)
 *
 * Pass-in pattern (no rebuild — caller wires the upstream engines as DI inputs,
 * keeping this engine pure + testable).
 *
 * Hotel-soul invariants: PII-free (employee_id only, no names/SSN/DOB),
 * Object.frozen returns, R12 fail-loud on missing input, never silent.
 *
 * @module EmployeeDailyDigestEngine
 * @milestone HOTEL/U-EMPLOYEE-DAILY-DIGEST (2026-05-25, slot:hotel iter20)
 */

export interface DigestShiftEntry {
  date: string;
  shift: "day" | "swing" | "night";
  machine_serial: string;
}

export interface DigestPTOStatus {
  vacation_hours: number;
  sick_hours: number;
  personal_hours: number;
  pending_request_count: number;
  approved_upcoming_count: number;
}

export interface DigestCoursePunch {
  course_id: string;
  reason: "hire" | "promotion" | "incident_remediation" | "refresher_overdue" | "growth_opt_in";
  due_date: string | null;
}

export interface DigestSafetyReminder {
  cfr_reference: string;            // e.g. "29 CFR 1910.147"
  topic: string;                     // e.g. "LOTO"
  status: "due_soon" | "overdue";
  due_date: string;
}

export interface DigestNudge {
  kind: "positive" | "corrective";
  dimension: "quality" | "throughput" | "safety" | "learning" | "composite";
  message: string;
  severity: "info" | "warn" | "critical";
}

export interface DigestPayrollSnapshot {
  pay_period_id: string;
  gross_pay_cents: number;
  regular_hours: number;
  overtime_hours: number;
  shift_differential_cents: number;
}

export interface DigestInput {
  employee_id: string;
  as_of_date: string;             // YYYY-MM-DD
  role: string | null;
  tier: "entry" | "intermediate" | "advanced" | "master" | null;
  shifts_today_tomorrow: ReadonlyArray<DigestShiftEntry>;
  pto: DigestPTOStatus;
  required_courses: ReadonlyArray<DigestCoursePunch>;
  safety_reminders: ReadonlyArray<DigestSafetyReminder>;
  nudges: ReadonlyArray<DigestNudge>;
  payroll_snapshot: DigestPayrollSnapshot | null;
  readiness_label: "early" | "developing" | "ready" | "promote_now" | null;
}

export interface DailyDigest {
  employee_id: string;
  as_of_date: string;
  role: string | null;
  tier: "entry" | "intermediate" | "advanced" | "master" | null;
  readiness_label: "early" | "developing" | "ready" | "promote_now" | null;
  shifts_today_tomorrow: ReadonlyArray<DigestShiftEntry>;
  pto: DigestPTOStatus;
  required_courses: ReadonlyArray<DigestCoursePunch>;
  safety_reminders: ReadonlyArray<DigestSafetyReminder>;
  nudges: ReadonlyArray<DigestNudge>;
  payroll_snapshot: DigestPayrollSnapshot | null;
  /** Top-3 action items ranked by urgency for the phone home-screen card. */
  top_actions: ReadonlyArray<{
    rank: number;
    kind: "shift" | "course" | "safety" | "nudge" | "pto_response";
    urgency: "info" | "warn" | "critical";
    headline: string;
  }>;
  generated_at: string;
}

class EmployeeDailyDigestEngine {
  buildDigest(input: DigestInput): DailyDigest {
    this.validate(input);
    const topActions = this.computeTopActions(input);
    return Object.freeze({
      employee_id: input.employee_id,
      as_of_date: input.as_of_date,
      role: input.role,
      tier: input.tier,
      readiness_label: input.readiness_label,
      shifts_today_tomorrow: Object.freeze(input.shifts_today_tomorrow.map((s) => Object.freeze({ ...s }))),
      pto: Object.freeze({ ...input.pto }),
      required_courses: Object.freeze(input.required_courses.map((c) => Object.freeze({ ...c }))),
      safety_reminders: Object.freeze(input.safety_reminders.map((s) => Object.freeze({ ...s }))),
      nudges: Object.freeze(input.nudges.map((n) => Object.freeze({ ...n }))),
      payroll_snapshot: input.payroll_snapshot ? Object.freeze({ ...input.payroll_snapshot }) : null,
      top_actions: Object.freeze(topActions.map((a) => Object.freeze(a))),
      generated_at: new Date().toISOString(),
    });
  }

  /**
   * Compute the top-3 ranked action items for the phone home-screen card.
   * Urgency ordering: critical safety > overdue safety > critical nudge >
   *   warn nudge > today's shift > tomorrow's shift > overdue course > info nudge.
   */
  private computeTopActions(input: DigestInput): ReadonlyArray<{
    rank: number;
    kind: "shift" | "course" | "safety" | "nudge" | "pto_response";
    urgency: "info" | "warn" | "critical";
    headline: string;
  }> {
    type Candidate = {
      kind: "shift" | "course" | "safety" | "nudge" | "pto_response";
      urgency: "info" | "warn" | "critical";
      headline: string;
      sortKey: number; // lower = more urgent
    };
    const cands: Candidate[] = [];

    // 1. Overdue safety = highest urgency
    for (const s of input.safety_reminders) {
      cands.push({
        kind: "safety",
        urgency: s.status === "overdue" ? "critical" : "warn",
        headline: `Safety: ${s.topic} (${s.cfr_reference}) — ${s.status} ${s.due_date}`,
        sortKey: s.status === "overdue" ? 0 : 10,
      });
    }

    // 2. Critical or warn nudges
    for (const n of input.nudges) {
      let key: number;
      if (n.kind === "positive") key = 50;
      else if (n.severity === "critical") key = 1;
      else if (n.severity === "warn") key = 15;
      else key = 60;
      cands.push({
        kind: "nudge",
        urgency: n.severity,
        headline: n.message,
        sortKey: key,
      });
    }

    // 3. Today's shift
    const today = input.as_of_date;
    for (const s of input.shifts_today_tomorrow) {
      const isToday = s.date === today;
      cands.push({
        kind: "shift",
        urgency: "info",
        headline: `${isToday ? "Today" : "Tomorrow"}: ${s.shift} shift on ${s.machine_serial}`,
        sortKey: isToday ? 20 : 30,
      });
    }

    // 4. Courses with due_date
    for (const c of input.required_courses) {
      if (!c.due_date) continue;
      cands.push({
        kind: "course",
        urgency: "warn",
        headline: `Course ${c.course_id} due ${c.due_date} (${c.reason})`,
        sortKey: 25,
      });
    }

    // 5. PTO approver action — managers see pending requests
    if (input.pto.pending_request_count > 0) {
      cands.push({
        kind: "pto_response",
        urgency: "info",
        headline: `${input.pto.pending_request_count} PTO request(s) awaiting your action`,
        sortKey: 35,
      });
    }

    cands.sort((a, b) => a.sortKey - b.sortKey);
    return cands.slice(0, 3).map((c, i) => ({
      rank: i + 1,
      kind: c.kind,
      urgency: c.urgency,
      headline: c.headline,
    }));
  }

  private validate(input: DigestInput): void {
    if (!input.employee_id) {
      throw new Error("EmployeeDailyDigestEngine: employee_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.as_of_date)) {
      throw new Error("EmployeeDailyDigestEngine: as_of_date must be ISO YYYY-MM-DD");
    }
    if (!Array.isArray(input.shifts_today_tomorrow) || !Array.isArray(input.required_courses) ||
        !Array.isArray(input.safety_reminders) || !Array.isArray(input.nudges)) {
      throw new Error("EmployeeDailyDigestEngine: shifts/courses/safety/nudges must be arrays");
    }
    if (!input.pto || typeof input.pto.vacation_hours !== "number") {
      throw new Error("EmployeeDailyDigestEngine: pto object with vacation_hours required");
    }
    const ptoFields: Array<keyof DigestPTOStatus> = [
      "vacation_hours", "sick_hours", "personal_hours",
      "pending_request_count", "approved_upcoming_count",
    ];
    for (const f of ptoFields) {
      if (!Number.isFinite(input.pto[f])) {
        throw new Error(`EmployeeDailyDigestEngine: pto.${f} must be finite number`);
      }
    }
  }
}

export const employeeDailyDigestEngine = new EmployeeDailyDigestEngine();
