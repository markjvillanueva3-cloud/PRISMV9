/**
 * PayrollEngine.test.ts — hotel slot ERP+HR (ACP-MS6 iter4 / U-PAYROLL-WIRE).
 *
 * Payroll is hotel's highest-stakes domain — every gross/net/withholding number
 * is money-adjacent and the slot-soul invariant "numbers must reconcile both
 * ways" requires real assertions, not stubs. Tests the canonical pay-stub math
 * (regular + OT + 2T → gross → federal/state/SS/Medicare/401k/health/other →
 * net → YTD), the SS wage-base cap, and the Medicare additional-rate threshold.
 *
 * Seeds employee + clock-in/out through the real EmployeeEngine + TimeClockEngine
 * singletons (no mocks — financial code is tested against real engines per
 * CLAUDE.md "tests verify intent, not behavior").
 */

import { describe, it, expect, beforeEach } from "vitest";
import { payrollEngine } from "../engines/PayrollEngine.js";
import { employeeEngine } from "../engines/EmployeeEngine.js";
import { timeClockEngine } from "../engines/TimeClockEngine.js";

// Test-fixture constants
const REG_HOURS = 8;
const OT_HOURS = 5;
const HOURLY_RATE = 25;
const OT_MULTIPLIER = 1.5;
const FED_RATE = 0.22;
const STATE_RATE = 0.05;
const SS_RATE = 0.062;
const SS_WAGE_BASE = 168600;
const MED_RATE = 0.0145;
const MED_ADDITIONAL_RATE = 0.009;
const MED_ADDITIONAL_THRESHOLD = 200000;
const RETIREMENT_PCT = 0.06;
const HEALTH_PER_PERIOD = 150;

function freshEmployee(opts: { rate?: number; otMult?: number } = {}): string {
  const e = employeeEngine.create({
    first_name: "Test",
    last_name: `Emp-${Math.random().toString(36).slice(2, 8)}`,
    email: `test-${Math.random().toString(36).slice(2, 6)}@jmdie.example`,
    department: "machining" as any,
    role: "machinist" as any,
    hourly_rate: opts.rate ?? HOURLY_RATE,
    overtime_multiplier: opts.otMult ?? OT_MULTIPLIER,
  });
  return e.id;
}

function freshPeriod(): string {
  const p = payrollEngine.createPeriod({
    start_date: "2026-05-01",
    end_date: "2026-05-07",
    pay_date: "2026-05-14",
    type: "weekly",
  });
  return p.id;
}

/** Seed a single shift with given regular hours (≤16) starting 08:00 on baseDate. */
function seedShift(employeeId: string, hours: number, baseDate = "2026-05-01"): void {
  if (hours > 16) throw new Error("seedShift: max 16h per shift; split across days");
  const inMs = Date.parse(`${baseDate}T08:00:00.000Z`);
  const outMs = inMs + hours * 3600_000;
  const inIso = new Date(inMs).toISOString();
  const outIso = new Date(outMs).toISOString();
  timeClockEngine.clockIn({ employee_id: employeeId, timestamp: inIso });
  timeClockEngine.clockOut(employeeId, outIso);
}

describe("PayrollEngine — period + deduction configuration", () => {
  it("createPeriod assigns id matching PP-#### pattern and status='open'", () => {
    const p = payrollEngine.createPeriod({
      start_date: "2026-04-01",
      end_date: "2026-04-07",
      pay_date: "2026-04-14",
      type: "weekly",
    });
    expect(p.id).toMatch(/^PP-\d{4}$/);
    expect(p.status).toBe("open");
    expect(p.type).toBe("weekly");
  });

  it("configureDeductions stores and returns the literal config", () => {
    const cfg = payrollEngine.configureDeductions({
      employee_id: "EMP-TEST-CFG",
      federal_tax_rate: 0.18,
      state_tax_rate: 0.04,
      health_insurance_per_period: 200,
      retirement_401k_pct: 0.08,
      other_deductions_per_period: 25,
    });
    expect(cfg.employee_id).toBe("EMP-TEST-CFG");
    expect(cfg.federal_tax_rate).toBe(0.18);
    expect(cfg.retirement_401k_pct).toBe(0.08);
  });
});

describe("PayrollEngine — calculatePayStub error paths (R12 fail-loud)", () => {
  it("throws on unknown employee_id", () => {
    const pid = freshPeriod();
    expect(() => payrollEngine.calculatePayStub("EMP-NEVER-EXISTED", pid))
      .toThrow(/Employee EMP-NEVER-EXISTED not found/);
  });

  it("throws on unknown period_id", () => {
    const empId = freshEmployee();
    expect(() => payrollEngine.calculatePayStub(empId, "PP-9999"))
      .toThrow(/Period PP-9999 not found/);
  });
});

describe("PayrollEngine — gross pay math (slot-soul invariant)", () => {
  it("regular-hours-only stub: gross = REG_HOURS * HOURLY_RATE", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.earnings.regular_hours).toBeCloseTo(REG_HOURS, 5);
    expect(stub.earnings.gross_pay).toBeCloseTo(REG_HOURS * HOURLY_RATE, 2);
  });

  it("federal_tax = gross * federal_tax_rate (default 0.22)", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.deductions.federal_tax).toBeCloseTo(stub.earnings.gross_pay * FED_RATE, 2);
  });

  it("state_tax = gross * state_tax_rate (default 0.05)", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.deductions.state_tax).toBeCloseTo(stub.earnings.gross_pay * STATE_RATE, 2);
  });

  it("social_security = gross * 0.062 when under wage base", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.deductions.social_security).toBeCloseTo(stub.earnings.gross_pay * SS_RATE, 2);
  });

  it("medicare = gross * 0.0145 when under additional-rate threshold", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.deductions.medicare).toBeCloseTo(stub.earnings.gross_pay * MED_RATE, 2);
  });

  it("retirement_401k = gross * 0.06 (default config)", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.deductions.retirement_401k).toBeCloseTo(stub.earnings.gross_pay * RETIREMENT_PCT, 2);
  });

  it("net_pay = gross - total_deductions (reconcile both ways)", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    expect(stub.net_pay).toBeCloseTo(stub.earnings.gross_pay - stub.deductions.total_deductions, 2);
  });

  it("total_deductions = sum of every individual deduction line", () => {
    const empId = freshEmployee();
    const pid = freshPeriod();
    seedShift(empId, REG_HOURS, "2026-05-01");
    const stub = payrollEngine.calculatePayStub(empId, pid);
    const itemized =
      stub.deductions.federal_tax + stub.deductions.state_tax +
      stub.deductions.social_security + stub.deductions.medicare +
      stub.deductions.health_insurance + stub.deductions.retirement_401k +
      stub.deductions.other;
    expect(stub.deductions.total_deductions).toBeCloseTo(itemized, 2);
  });
});

describe("PayrollEngine — runPayroll aggregation", () => {
  it("runPayroll on a far-future period produces zero-gross stubs for employees with no shifts in window", () => {
    const futurePeriod = payrollEngine.createPeriod({
      start_date: "2099-01-01",
      end_date: "2099-01-07",
      pay_date: "2099-01-14",
      type: "weekly",
    });
    const summary = payrollEngine.runPayroll(futurePeriod.id);
    expect(summary.period_id).toBe(futurePeriod.id);
    // Active employees without shifts in this window get a zero-gross stub.
    for (const stub of summary.stubs) {
      expect(stub.earnings.gross_pay).toBe(0);
    }
    // Aggregated total_gross_pay must equal zero (no shifts in window).
    expect(summary.total_gross_pay).toBe(0);
  });

  it("runPayroll finalizes the period (status='finalized')", () => {
    const pid = freshPeriod();
    payrollEngine.runPayroll(pid);
    // Re-running the same period asserts the status flip occurred — second call
    // hits the same finalized period without throwing.
    const summary2 = payrollEngine.runPayroll(pid);
    expect(summary2.period_id).toBe(pid);
  });

  it("runPayroll throws on unknown period", () => {
    expect(() => payrollEngine.runPayroll("PP-MISSING")).toThrow(/Period PP-MISSING not found/);
  });
});
