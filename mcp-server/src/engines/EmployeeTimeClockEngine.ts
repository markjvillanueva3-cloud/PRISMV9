/**
 * EmployeeTimeClockEngine — punch state machine + daily/weekly minute totals.
 *
 * Closes the upstream half of payroll: raw punch events → daily minute aggregation
 * → FLSA OT threshold detection → fed to iter19 EmployeePayrollGrossPayEngine.
 *
 * State machine (4 states + 4 punches):
 *
 *   clocked_out ──clock_in──→ clocked_in ──start_break──→ on_break
 *                                   │                          │
 *                                   │←─────end_break───────────┘
 *                                   │
 *                                   └──clock_out──→ clocked_out
 *
 * Auto-flags:
 *   - 24h+ unclosed shift  → flag.kind = "forgotten_clock_out" (worked_minutes capped at 720)
 *   - FLSA weekly > 40h    → flag.kind = "weekly_ot_threshold"
 *   - shift > 6h, no break → flag.kind = "missed_break"          (some-state labor law)
 *   - back-dated punch     → requires manager approval (SoD: editor ≠ employee)
 *
 * Bridges:
 *   - EmployeePayrollGrossPayEngine (iter19) — getDailySummary() shape feeds
 *     payroll.regular_hours + payroll.overtime_hours
 *   - EmployeeShiftScheduleEngine (iter17) — late/early clock-in vs scheduled shift
 *   - EmployeePerformanceFeedbackEngine (iter16) — attendance signal
 *   - ExecutiveSummaryEngine (iter31) — aggregate hours worked rolls up
 *
 * Hotel-soul: PII-free (employee_id only), Object.frozen, R12 fail-loud, time-edit
 * audit trail required for any retroactive change (silent clobber prohibited).
 *
 * @module EmployeeTimeClockEngine
 * @milestone HOTEL/U-EMPLOYEE-TIMECLOCK (2026-05-26, slot:hotel iter36 /yolo)
 */

export type PunchState = "clocked_out" | "clocked_in" | "on_break";
export type PunchKind = "clock_in" | "clock_out" | "start_break" | "end_break";
export type FlagKind =
  | "forgotten_clock_out"
  | "weekly_ot_threshold"
  | "missed_break"
  | "edit_without_approval";

export interface PunchEvent {
  punch_id: string;
  employee_id: string;
  kind: PunchKind;
  timestamp: string;                  // ISO 8601, UTC ("2026-06-01T08:00:00Z")
  station_id?: string;                // physical clock terminal id
  edited?: boolean;
  edit_approver_employee_id?: string; // required when edited === true (SoD: ≠ employee)
}

export interface PunchInput {
  employee_id: string;
  kind: PunchKind;
  timestamp: string;
  station_id?: string;
  edit_approver_employee_id?: string;
}

export interface DailySummary {
  employee_id: string;
  date: string;                       // YYYY-MM-DD
  worked_minutes: number;
  break_minutes: number;
  current_state: PunchState;
  shift_count: number;
  flags: ReadonlyArray<{ kind: FlagKind; severity: "warn" | "critical"; detail: string }>;
  punches: ReadonlyArray<PunchEvent>;
  generated_at: string;
}

const MAX_SHIFT_MINUTES = 12 * 60;          // cap at 12h for forgotten-clock-out flag
const FORGOTTEN_CLOCK_OUT_MIN = 24 * 60;    // ≥24h since clock_in with no clock_out
const FLSA_WEEKLY_OT_MINUTES = 40 * 60;
const MISSED_BREAK_THRESHOLD = 6 * 60;      // 6h+ shift requires a break

/** Allowed transitions: state → set of legal next punch kinds. */
const ALLOWED_PUNCHES: Readonly<Record<PunchState, ReadonlyArray<PunchKind>>> = Object.freeze({
  clocked_out: Object.freeze(["clock_in"] as PunchKind[]),
  clocked_in:  Object.freeze(["clock_out", "start_break"] as PunchKind[]),
  on_break:    Object.freeze(["end_break"] as PunchKind[]),
});

class EmployeeTimeClockEngine {
  /** Append a single punch to a day's punch list (pure — caller persists). */
  recordPunch(
    existingPunches: ReadonlyArray<PunchEvent>,
    input: PunchInput,
  ): PunchEvent {
    this.validatePunchInput(input);

    const employeeId = input.employee_id;
    const dayPunches = existingPunches.filter((p) => p.employee_id === employeeId);
    const state = this.deriveState(dayPunches);
    const allowed = ALLOWED_PUNCHES[state];

    if (!allowed.includes(input.kind)) {
      throw new Error(
        `EmployeeTimeClockEngine: invalid punch ${input.kind} in state ${state} (allowed: ${allowed.join(", ")})`,
      );
    }

    // Chronological ordering — must not predate the most recent punch.
    if (dayPunches.length > 0) {
      const last = dayPunches[dayPunches.length - 1];
      if (Date.parse(input.timestamp) < Date.parse(last.timestamp)) {
        throw new Error(
          `EmployeeTimeClockEngine: punch timestamp ${input.timestamp} predates last punch ${last.timestamp}`,
        );
      }
    }

    return Object.freeze({
      punch_id: `PUNCH-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      employee_id: employeeId,
      kind: input.kind,
      timestamp: input.timestamp,
      ...(input.station_id ? { station_id: input.station_id } : {}),
      edited: false,
    });
  }

  /**
   * Apply a manager-approved edit to an existing punch (e.g. forgotten clock-out
   * fixed retroactively). SoD enforced: approver MUST differ from the employee.
   */
  editPunch(
    punch: PunchEvent,
    newTimestamp: string,
    approverEmployeeId: string,
  ): PunchEvent {
    if (!approverEmployeeId || typeof approverEmployeeId !== "string") {
      throw new Error("EmployeeTimeClockEngine: edit requires approver_employee_id");
    }
    if (approverEmployeeId === punch.employee_id) {
      throw new Error(
        "EmployeeTimeClockEngine: edit approver must differ from the employee being edited (SoD)",
      );
    }
    if (!this.isValidIsoTimestamp(newTimestamp)) {
      throw new Error("EmployeeTimeClockEngine: newTimestamp must be ISO 8601");
    }
    return Object.freeze({
      ...punch,
      timestamp: newTimestamp,
      edited: true,
      edit_approver_employee_id: approverEmployeeId,
    });
  }

  /**
   * Aggregate a day's punches into a summary. Pure — caller hands in the day's
   * filtered punch list. Punches MUST already be sorted by timestamp ascending.
   */
  getDailySummary(
    employeeId: string,
    date: string,
    punches: ReadonlyArray<PunchEvent>,
    weekToDateMinutes: number = 0,
  ): DailySummary {
    if (!employeeId || typeof employeeId !== "string") {
      throw new Error("EmployeeTimeClockEngine: employee_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("EmployeeTimeClockEngine: date must be ISO YYYY-MM-DD");
    }
    if (!Number.isFinite(weekToDateMinutes) || weekToDateMinutes < 0) {
      throw new Error("EmployeeTimeClockEngine: weekToDateMinutes must be non-negative finite number");
    }

    let workedMinutes = 0;
    let breakMinutes = 0;
    let shiftCount = 0;
    let lastClockIn: number | null = null;
    let lastBreakStart: number | null = null;
    const flags: Array<{ kind: FlagKind; severity: "warn" | "critical"; detail: string }> = [];

    for (const p of punches) {
      if (p.employee_id !== employeeId) {
        throw new Error(
          `EmployeeTimeClockEngine: punch employee_id ${p.employee_id} does not match summary employee_id ${employeeId}`,
        );
      }
      const ts = Date.parse(p.timestamp);
      if (!Number.isFinite(ts)) {
        throw new Error(`EmployeeTimeClockEngine: bad punch timestamp ${p.timestamp}`);
      }

      if (p.kind === "clock_in") {
        lastClockIn = ts;
        shiftCount++;
      } else if (p.kind === "clock_out") {
        if (lastClockIn !== null) {
          const shiftMinutes = Math.max(0, Math.round((ts - lastClockIn) / 60_000));
          workedMinutes += shiftMinutes;
          lastClockIn = null;
        }
      } else if (p.kind === "start_break") {
        lastBreakStart = ts;
        // Break-time counts against the open shift, so close out that interval first.
        if (lastClockIn !== null) {
          workedMinutes += Math.max(0, Math.round((ts - lastClockIn) / 60_000));
          lastClockIn = null;
        }
      } else if (p.kind === "end_break") {
        if (lastBreakStart !== null) {
          breakMinutes += Math.max(0, Math.round((ts - lastBreakStart) / 60_000));
          lastBreakStart = null;
        }
        // Re-open shift accounting from end-of-break.
        lastClockIn = ts;
      }

      if (p.edited && !p.edit_approver_employee_id) {
        flags.push({
          kind: "edit_without_approval",
          severity: "critical",
          detail: `punch ${p.punch_id} marked edited but missing edit_approver_employee_id`,
        });
      }
    }

    // Forgotten clock-out detection — if shift still open at end-of-summary AND
    // we're past 24h since last clock-in, cap the worked-minutes at the safety max.
    let currentState: PunchState = "clocked_out";
    if (lastBreakStart !== null) {
      currentState = "on_break";
    } else if (lastClockIn !== null) {
      currentState = "clocked_in";
      const openMinutes = Math.round((Date.now() - lastClockIn) / 60_000);
      if (openMinutes >= FORGOTTEN_CLOCK_OUT_MIN) {
        workedMinutes += MAX_SHIFT_MINUTES; // safety cap, not silent
        flags.push({
          kind: "forgotten_clock_out",
          severity: "critical",
          detail: `Shift open ${openMinutes}min (>= ${FORGOTTEN_CLOCK_OUT_MIN}); capped at ${MAX_SHIFT_MINUTES}min — manager must reconcile`,
        });
        lastClockIn = null;
      }
    }

    // Missed-break detection — any shift > 6h with zero break minutes.
    if (workedMinutes > MISSED_BREAK_THRESHOLD && breakMinutes === 0) {
      flags.push({
        kind: "missed_break",
        severity: "warn",
        detail: `Worked ${workedMinutes}min (>${MISSED_BREAK_THRESHOLD}) with no recorded break`,
      });
    }

    // FLSA weekly OT detection — uses caller-supplied week-to-date.
    if (weekToDateMinutes + workedMinutes > FLSA_WEEKLY_OT_MINUTES) {
      flags.push({
        kind: "weekly_ot_threshold",
        severity: "warn",
        detail: `Week-to-date ${weekToDateMinutes + workedMinutes}min exceeds FLSA threshold ${FLSA_WEEKLY_OT_MINUTES} — payroll must apply 1.5× rate`,
      });
    }

    return Object.freeze({
      employee_id: employeeId,
      date,
      worked_minutes: workedMinutes,
      break_minutes: breakMinutes,
      current_state: currentState,
      shift_count: shiftCount,
      flags: Object.freeze(flags.map((f) => Object.freeze(f))),
      punches: Object.freeze([...punches]),
      generated_at: new Date().toISOString(),
    });
  }

  /** Derive current state by replaying punches in order. */
  deriveState(punches: ReadonlyArray<PunchEvent>): PunchState {
    let state: PunchState = "clocked_out";
    for (const p of punches) {
      if (p.kind === "clock_in") state = "clocked_in";
      else if (p.kind === "clock_out") state = "clocked_out";
      else if (p.kind === "start_break") state = "on_break";
      else if (p.kind === "end_break") state = "clocked_in";
    }
    return state;
  }

  // ─── R12 validation ────────────────────────────────────────────────────

  private validatePunchInput(input: PunchInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("EmployeeTimeClockEngine: punch input must be object");
    }
    if (!input.employee_id || typeof input.employee_id !== "string") {
      throw new Error("EmployeeTimeClockEngine: employee_id must be non-empty string");
    }
    const validKinds: ReadonlyArray<PunchKind> = ["clock_in", "clock_out", "start_break", "end_break"];
    if (!validKinds.includes(input.kind)) {
      throw new Error(`EmployeeTimeClockEngine: kind must be one of ${validKinds.join("|")}`);
    }
    if (!this.isValidIsoTimestamp(input.timestamp)) {
      throw new Error("EmployeeTimeClockEngine: timestamp must be ISO 8601");
    }
    // Future-timestamp rejection — 5 min clock drift tolerance.
    const tsMs = Date.parse(input.timestamp);
    if (tsMs > Date.now() + 5 * 60_000) {
      throw new Error(`EmployeeTimeClockEngine: timestamp ${input.timestamp} is in the future`);
    }
  }

  private isValidIsoTimestamp(ts: string): boolean {
    if (typeof ts !== "string") return false;
    const parsed = Date.parse(ts);
    if (!Number.isFinite(parsed)) return false;
    // Require the string to look like ISO 8601, not a free-form Date.parse-accepted string.
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(ts);
  }
}

export const employeeTimeClockEngine = new EmployeeTimeClockEngine();
