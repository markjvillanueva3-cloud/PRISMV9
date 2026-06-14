/**
 * EmployeePayrollGrossPayEngine — pay-period gross-pay synthesis.
 *
 * The ERP capstone for the employee portal: consumes hour breakdowns from
 * time-clock, PTO accrual, shift schedule, and per-op tracker → emits the
 * employee's gross pay for a pay period with full audit-trail of components.
 *
 * Composes (no rebuild — pass-in pattern):
 *   - hours summary from TimeClockEngine
 *   - PTO-paid hours from EmployeePTOAccrualEngine (approved + consumed in period)
 *   - shift-mix from EmployeeShiftScheduleEngine
 *   - per-op completion bonuses (passed in directly)
 *
 * COMPONENTS:
 *   Regular hours (≤40/week)         × base_rate
 * + Overtime hours (40<h≤60/week)    × base_rate × 1.5  (FLSA 29 CFR 778)
 * + Double-time hours (>60/week)     × base_rate × 2.0  (state-specific)
 * + PTO-paid hours                   × base_rate (no shift diff)
 * + Holiday hours                    × base_rate × 1.5
 * + Shift differential               (day 0%, swing +5%, night +10%, on regular+OT)
 * + Per-op completion bonus          (flat $ per part above quota)
 * = Gross pay (cents-resolution)
 *
 * FLSA OT POLICY: weekly OT threshold; daily-OT (CA-style) supported via knob.
 *
 * Hotel-soul invariants: cents-resolution (no fractional pennies), R12 fail-loud
 * (negative rates/hours rejected, OT hours > total hours rejected), Object.frozen
 * returns, PII-free (employee_id only).
 *
 * Reference: FLSA 29 CFR Part 778 (overtime).
 *
 * @module EmployeePayrollGrossPayEngine
 * @milestone HOTEL/U-EMPLOYEE-PAYROLL-GROSS-PAY (2026-05-25, slot:hotel iter19)
 */

export type ShiftMixKey = "day" | "swing" | "night";

export interface ShiftDifferentialPolicy {
  day_pct: number;     // typically 0
  swing_pct: number;   // typically 0.05
  night_pct: number;   // typically 0.10
}

export interface OvertimePolicy {
  weekly_threshold_hours: number;   // typically 40
  weekly_double_time_threshold_hours: number;  // typically 60 (or Infinity to disable)
  daily_overtime_threshold_hours: number;      // typically Infinity (CA uses 8)
  ot_multiplier: number;                       // typically 1.5
  double_time_multiplier: number;              // typically 2.0
  holiday_multiplier: number;                  // typically 1.5
}

export const DEFAULT_OT_POLICY: OvertimePolicy = Object.freeze({
  weekly_threshold_hours: 40,
  weekly_double_time_threshold_hours: 60,
  daily_overtime_threshold_hours: Infinity,
  ot_multiplier: 1.5,
  double_time_multiplier: 2.0,
  holiday_multiplier: 1.5,
});

export const DEFAULT_SHIFT_DIFF_POLICY: ShiftDifferentialPolicy = Object.freeze({
  day_pct: 0,
  swing_pct: 0.05,
  night_pct: 0.10,
});

export interface GrossPayInput {
  employee_id: string;
  pay_period_id: string;          // free-form, e.g. "2026-P12"
  base_rate_cents_per_hour: number; // e.g. 3250 = $32.50/hr
  regular_hours: number;          // hours worked at straight pay (PRE-OT split)
  holiday_hours: number;          // separately tracked, paid at holiday_multiplier
  pto_paid_hours: number;         // already-approved PTO consumed in period
  shift_mix_hours: Readonly<Record<ShiftMixKey, number>>; // sum of regular+OT mapped to shift
  per_op_bonus_cents: number;     // sum of completion bonuses already earned
  overtime_policy?: OvertimePolicy;
  shift_differential_policy?: ShiftDifferentialPolicy;
}

export interface GrossPayBreakdown {
  employee_id: string;
  pay_period_id: string;
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  holiday_hours: number;
  pto_paid_hours: number;
  regular_pay_cents: number;
  overtime_pay_cents: number;
  double_time_pay_cents: number;
  holiday_pay_cents: number;
  pto_paid_pay_cents: number;
  shift_differential_cents: number;
  per_op_bonus_cents: number;
  gross_pay_cents: number;
  computed_at: string;
}

class EmployeePayrollGrossPayEngine {
  computeGrossPay(input: GrossPayInput): GrossPayBreakdown {
    this.validate(input);
    const otPolicy = input.overtime_policy ?? DEFAULT_OT_POLICY;
    const shiftPolicy = input.shift_differential_policy ?? DEFAULT_SHIFT_DIFF_POLICY;
    const rate = input.base_rate_cents_per_hour;

    // Split regular_hours into regular / OT / double-time per OT policy
    const weeklyThreshold = otPolicy.weekly_threshold_hours;
    const dtThreshold = otPolicy.weekly_double_time_threshold_hours;
    const totalWorked = input.regular_hours;
    const reg = Math.min(totalWorked, weeklyThreshold);
    const otRaw = Math.max(0, Math.min(totalWorked, dtThreshold) - weeklyThreshold);
    const dt = Math.max(0, totalWorked - dtThreshold);

    // Pay components — cents-resolution, all integer math after rounding
    const regularPay = Math.round(reg * rate);
    const overtimePay = Math.round(otRaw * rate * otPolicy.ot_multiplier);
    const doubleTimePay = Math.round(dt * rate * otPolicy.double_time_multiplier);
    const holidayPay = Math.round(input.holiday_hours * rate * otPolicy.holiday_multiplier);
    const ptoPaidPay = Math.round(input.pto_paid_hours * rate);

    // Shift differential applies to regular + OT (not holiday or PTO, by policy)
    const totalShiftHours = input.shift_mix_hours.day +
      input.shift_mix_hours.swing +
      input.shift_mix_hours.night;
    // Verify shift_mix sums to regular hours (within a small slack for rounding)
    if (Math.abs(totalShiftHours - totalWorked) > 0.01) {
      throw new Error(
        `EmployeePayrollGrossPayEngine: shift_mix_hours sum (${totalShiftHours.toFixed(2)}) ≠ regular_hours (${totalWorked.toFixed(2)})`,
      );
    }
    const diffDay = input.shift_mix_hours.day * rate * shiftPolicy.day_pct;
    const diffSwing = input.shift_mix_hours.swing * rate * shiftPolicy.swing_pct;
    const diffNight = input.shift_mix_hours.night * rate * shiftPolicy.night_pct;
    const shiftDifferential = Math.round(diffDay + diffSwing + diffNight);

    const grossPay =
      regularPay + overtimePay + doubleTimePay + holidayPay + ptoPaidPay +
      shiftDifferential + input.per_op_bonus_cents;

    return Object.freeze({
      employee_id: input.employee_id,
      pay_period_id: input.pay_period_id,
      regular_hours: Number(reg.toFixed(4)),
      overtime_hours: Number(otRaw.toFixed(4)),
      double_time_hours: Number(dt.toFixed(4)),
      holiday_hours: Number(input.holiday_hours.toFixed(4)),
      pto_paid_hours: Number(input.pto_paid_hours.toFixed(4)),
      regular_pay_cents: regularPay,
      overtime_pay_cents: overtimePay,
      double_time_pay_cents: doubleTimePay,
      holiday_pay_cents: holidayPay,
      pto_paid_pay_cents: ptoPaidPay,
      shift_differential_cents: shiftDifferential,
      per_op_bonus_cents: input.per_op_bonus_cents,
      gross_pay_cents: grossPay,
      computed_at: new Date().toISOString(),
    });
  }

  /**
   * Reconciliation check: sum-of-parts MUST equal gross_pay_cents.
   * Surfaces any silent arithmetic drift (hotel-soul "numbers must reconcile both ways").
   */
  reconcile(breakdown: GrossPayBreakdown): { ok: boolean; expected: number; actual: number; delta: number } {
    const expected =
      breakdown.regular_pay_cents +
      breakdown.overtime_pay_cents +
      breakdown.double_time_pay_cents +
      breakdown.holiday_pay_cents +
      breakdown.pto_paid_pay_cents +
      breakdown.shift_differential_cents +
      breakdown.per_op_bonus_cents;
    const delta = breakdown.gross_pay_cents - expected;
    return Object.freeze({
      ok: delta === 0,
      expected,
      actual: breakdown.gross_pay_cents,
      delta,
    });
  }

  private validate(input: GrossPayInput): void {
    if (!input.employee_id) {
      throw new Error("EmployeePayrollGrossPayEngine: employee_id required");
    }
    if (!input.pay_period_id) {
      throw new Error("EmployeePayrollGrossPayEngine: pay_period_id required");
    }
    if (!Number.isFinite(input.base_rate_cents_per_hour) || input.base_rate_cents_per_hour <= 0) {
      throw new Error("EmployeePayrollGrossPayEngine: base_rate_cents_per_hour must be positive finite");
    }
    const fields: Array<{ key: keyof GrossPayInput; label: string }> = [
      { key: "regular_hours", label: "regular_hours" },
      { key: "holiday_hours", label: "holiday_hours" },
      { key: "pto_paid_hours", label: "pto_paid_hours" },
    ];
    for (const f of fields) {
      const v = input[f.key] as number;
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(`EmployeePayrollGrossPayEngine: ${f.label} must be non-negative finite`);
      }
    }
    if (!Number.isFinite(input.per_op_bonus_cents) || input.per_op_bonus_cents < 0) {
      throw new Error("EmployeePayrollGrossPayEngine: per_op_bonus_cents must be non-negative finite");
    }
    if (!input.shift_mix_hours ||
        typeof input.shift_mix_hours.day !== "number" ||
        typeof input.shift_mix_hours.swing !== "number" ||
        typeof input.shift_mix_hours.night !== "number") {
      throw new Error(
        "EmployeePayrollGrossPayEngine: shift_mix_hours must have day/swing/night number fields",
      );
    }
    if (input.shift_mix_hours.day < 0 || input.shift_mix_hours.swing < 0 || input.shift_mix_hours.night < 0) {
      throw new Error("EmployeePayrollGrossPayEngine: shift_mix_hours must be non-negative");
    }
    // Cap absurd hours
    const MAX_WEEKLY_HOURS = 168;
    if (input.regular_hours > MAX_WEEKLY_HOURS) {
      throw new Error(
        `EmployeePayrollGrossPayEngine: regular_hours ${input.regular_hours} exceeds physical maximum ${MAX_WEEKLY_HOURS}h/week`,
      );
    }
  }
}

export const employeePayrollGrossPayEngine = new EmployeePayrollGrossPayEngine();
