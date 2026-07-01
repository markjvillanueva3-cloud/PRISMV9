/**
 * EmployeePayrollGrossPayEngine.test.ts — HOTEL/U-EMPLOYEE-PAYROLL-GROSS-PAY (iter19)
 *
 * Reference values calculated by hand. All in cents to avoid float dust.
 */
import { describe, it, expect } from "vitest";
import {
  employeePayrollGrossPayEngine,
  DEFAULT_OT_POLICY,
  DEFAULT_SHIFT_DIFF_POLICY,
} from "../engines/EmployeePayrollGrossPayEngine.js";

// Helper — assemble a balanced shift_mix that sums to regular_hours
function balancedShiftMix(regularHours: number) {
  return { day: regularHours, swing: 0, night: 0 };
}

describe("EmployeePayrollGrossPayEngine", () => {
  describe("Straight-time happy path (no OT)", () => {
    it("$32.50/hr × 40h regular = $1300.00 gross", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-1",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3250,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(40),
        per_op_bonus_cents: 0,
      });
      expect(out.regular_pay_cents).toBe(130000);
      expect(out.overtime_pay_cents).toBe(0);
      expect(out.double_time_pay_cents).toBe(0);
      expect(out.gross_pay_cents).toBe(130000);
    });

    it("PTO-paid hours are paid at base rate without shift diff", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-PTO",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 4000, // $40/hr
        regular_hours: 32,
        holiday_hours: 0,
        pto_paid_hours: 8,
        shift_mix_hours: balancedShiftMix(32),
        per_op_bonus_cents: 0,
      });
      // 32h × $40 = $1280, +8h PTO × $40 = $320 → $1600 gross
      expect(out.regular_pay_cents).toBe(128000);
      expect(out.pto_paid_pay_cents).toBe(32000);
      expect(out.gross_pay_cents).toBe(160000);
    });
  });

  describe("FLSA 29 CFR 778 overtime split", () => {
    it("48h → 40 reg + 8 OT at 1.5×", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-OT",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000, // $30/hr
        regular_hours: 48,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(48),
        per_op_bonus_cents: 0,
      });
      // 40 × $30 = $1200 regular, 8 × $30 × 1.5 = $360 OT → $1560
      expect(out.regular_hours).toBe(40);
      expect(out.overtime_hours).toBe(8);
      expect(out.regular_pay_cents).toBe(120000);
      expect(out.overtime_pay_cents).toBe(36000);
      expect(out.gross_pay_cents).toBe(156000);
    });

    it("70h → 40 reg + 20 OT + 10 DT (default 60h DT threshold)", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-DT",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 2000, // $20/hr
        regular_hours: 70,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(70),
        per_op_bonus_cents: 0,
      });
      // 40 × $20 = $800 reg, 20 × $20 × 1.5 = $600 OT, 10 × $20 × 2.0 = $400 DT → $1800
      expect(out.regular_hours).toBe(40);
      expect(out.overtime_hours).toBe(20);
      expect(out.double_time_hours).toBe(10);
      expect(out.regular_pay_cents).toBe(80000);
      expect(out.overtime_pay_cents).toBe(60000);
      expect(out.double_time_pay_cents).toBe(40000);
      expect(out.gross_pay_cents).toBe(180000);
    });

    it("Custom OT policy: weekly_threshold=35h (union shop)", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-UNION",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 2500,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(40),
        per_op_bonus_cents: 0,
        overtime_policy: { ...DEFAULT_OT_POLICY, weekly_threshold_hours: 35 },
      });
      // 35 × $25 = $875 reg, 5 × $25 × 1.5 = $187.50 OT → $1062.50
      expect(out.regular_hours).toBe(35);
      expect(out.overtime_hours).toBe(5);
      expect(out.regular_pay_cents).toBe(87500);
      expect(out.overtime_pay_cents).toBe(18750);
      expect(out.gross_pay_cents).toBe(106250);
    });
  });

  describe("Shift differential — 3 shift configurations (variability floor)", () => {
    it("all-day shift = 0% differential", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-D",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: { day: 40, swing: 0, night: 0 },
        per_op_bonus_cents: 0,
      });
      expect(out.shift_differential_cents).toBe(0);
    });

    it("all-swing = 5% differential", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-S",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: { day: 0, swing: 40, night: 0 },
        per_op_bonus_cents: 0,
      });
      // 40 × $30 × 0.05 = $60 diff
      expect(out.shift_differential_cents).toBe(6000);
      expect(out.gross_pay_cents).toBe(120000 + 6000);
    });

    it("all-night = 10% differential", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-N",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: { day: 0, swing: 0, night: 40 },
        per_op_bonus_cents: 0,
      });
      // 40 × $30 × 0.10 = $120 diff
      expect(out.shift_differential_cents).toBe(12000);
      expect(out.gross_pay_cents).toBe(120000 + 12000);
    });

    it("mixed shifts — partial each", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-MIX",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 4000, // $40/hr
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: { day: 20, swing: 10, night: 10 },
        per_op_bonus_cents: 0,
      });
      // diff = 20×40×0 + 10×40×0.05 + 10×40×0.10 = 0 + 20 + 40 = $60
      expect(out.shift_differential_cents).toBe(6000);
    });
  });

  describe("Holiday pay + per-op bonus", () => {
    it("holiday hours at 1.5× multiplier", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-H",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 4000,
        regular_hours: 32,
        holiday_hours: 8,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(32),
        per_op_bonus_cents: 0,
      });
      // reg 32 × $40 = $1280; holiday 8 × $40 × 1.5 = $480 → $1760
      expect(out.regular_pay_cents).toBe(128000);
      expect(out.holiday_pay_cents).toBe(48000);
      expect(out.gross_pay_cents).toBe(176000);
    });

    it("per-op completion bonus added to gross", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-B",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(40),
        per_op_bonus_cents: 5000, // $50 bonus
      });
      expect(out.per_op_bonus_cents).toBe(5000);
      expect(out.gross_pay_cents).toBe(125000); // $1200 + $50
    });
  });

  describe("Reconciliation invariant (hotel-soul 'both ways')", () => {
    it("reconcile() returns ok:true when components sum to gross", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-R",
        pay_period_id: "2026-P12",
        base_rate_cents_per_hour: 3000,
        regular_hours: 55,
        holiday_hours: 8,
        pto_paid_hours: 16,
        shift_mix_hours: { day: 30, swing: 15, night: 10 },
        per_op_bonus_cents: 2500,
      });
      const r = employeePayrollGrossPayEngine.reconcile(out);
      expect(r.ok).toBe(true);
      expect(r.delta).toBe(0);
      expect(r.actual).toBe(r.expected);
    });
  });

  describe("R12 input validation", () => {
    it("throws on missing employee_id", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "",
          pay_period_id: "P1",
          base_rate_cents_per_hour: 3000,
          regular_hours: 40,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: balancedShiftMix(40),
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/employee_id required/);
    });

    it("throws on negative base_rate", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: -500,
          regular_hours: 40,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: balancedShiftMix(40),
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/base_rate_cents_per_hour must be positive/);
    });

    it("throws on NaN base_rate", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: Number.NaN,
          regular_hours: 40,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: balancedShiftMix(40),
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/base_rate_cents_per_hour must be positive finite/);
    });

    it("throws on shift_mix sum not equal to regular_hours (silent drift guard)", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: 3000,
          regular_hours: 40,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: { day: 10, swing: 10, night: 10 }, // sums to 30
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/shift_mix_hours sum .* ≠ regular_hours/);
    });

    it("throws on hours exceeding 168/wk physical max", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: 3000,
          regular_hours: 200,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: { day: 200, swing: 0, night: 0 },
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/exceeds physical maximum/);
    });

    it("throws on Infinity hours", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: 3000,
          regular_hours: Number.POSITIVE_INFINITY,
          holiday_hours: 0,
          pto_paid_hours: 0,
          shift_mix_hours: balancedShiftMix(40),
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/regular_hours must be non-negative finite/);
    });

    it("throws on negative pto_paid_hours", () => {
      expect(() =>
        employeePayrollGrossPayEngine.computeGrossPay({
          employee_id: "E",
          pay_period_id: "P1",
          base_rate_cents_per_hour: 3000,
          regular_hours: 40,
          holiday_hours: 0,
          pto_paid_hours: -4,
          shift_mix_hours: balancedShiftMix(40),
          per_op_bonus_cents: 0,
        }),
      ).toThrow(/pto_paid_hours must be non-negative finite/);
    });
  });

  describe("Cents-resolution invariant", () => {
    it("all pay components are integer cents", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-INT",
        pay_period_id: "P1",
        base_rate_cents_per_hour: 2733, // $27.33/hr — picks up fractional pennies
        regular_hours: 43.5,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: { day: 20.5, swing: 13, night: 10 },
        per_op_bonus_cents: 0,
      });
      expect(Number.isInteger(out.regular_pay_cents)).toBe(true);
      expect(Number.isInteger(out.overtime_pay_cents)).toBe(true);
      expect(Number.isInteger(out.shift_differential_cents)).toBe(true);
      expect(Number.isInteger(out.gross_pay_cents)).toBe(true);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned breakdown is frozen", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-F",
        pay_period_id: "P1",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(40),
        per_op_bonus_cents: 0,
      });
      expect(Object.isFrozen(out)).toBe(true);
    });

    it("PII-free — no employee_name / ssn / dob / bank_account", () => {
      const out = employeePayrollGrossPayEngine.computeGrossPay({
        employee_id: "EMP-P",
        pay_period_id: "P1",
        base_rate_cents_per_hour: 3000,
        regular_hours: 40,
        holiday_hours: 0,
        pto_paid_hours: 0,
        shift_mix_hours: balancedShiftMix(40),
        per_op_bonus_cents: 0,
      });
      const keys = Object.keys(out);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
      expect(keys).not.toContain("bank_account");
    });

    it("DEFAULT_OT_POLICY + DEFAULT_SHIFT_DIFF_POLICY are frozen", () => {
      expect(Object.isFrozen(DEFAULT_OT_POLICY)).toBe(true);
      expect(Object.isFrozen(DEFAULT_SHIFT_DIFF_POLICY)).toBe(true);
    });
  });
});
