/**
 * PayrollEngine — Payroll calculation from TimeClockEngine data.
 * Handles gross pay, tax withholding, deductions, pay period management,
 * and payroll summary reporting for HR/accounting integration.
 */

import { employeeEngine, type Employee } from "./EmployeeEngine.js";
import { timeClockEngine } from "./TimeClockEngine.js";

export interface PayrollPeriod {
  id: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: "open" | "processing" | "finalized";
  type: "weekly" | "biweekly" | "semimonthly" | "monthly";
}

export interface PayStub {
  employee_id: string;
  employee_name: string;
  period_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  earnings: {
    regular_hours: number;
    regular_rate: number;
    regular_pay: number;
    overtime_hours: number;
    overtime_rate: number;
    overtime_pay: number;
    double_time_hours: number;
    double_time_rate: number;
    double_time_pay: number;
    gross_pay: number;
  };
  deductions: {
    federal_tax: number;
    state_tax: number;
    social_security: number;
    medicare: number;
    health_insurance: number;
    retirement_401k: number;
    other: number;
    total_deductions: number;
  };
  net_pay: number;
  ytd: {
    gross_pay: number;
    federal_tax: number;
    net_pay: number;
  };
}

export interface PayrollSummary {
  period_id: string;
  period: string;
  employee_count: number;
  total_hours: number;
  total_overtime_hours: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  by_department: Record<string, { employees: number; gross_pay: number; hours: number }>;
  stubs: PayStub[];
}

export interface DeductionConfig {
  employee_id: string;
  federal_tax_rate: number; // e.g. 0.22
  state_tax_rate: number; // e.g. 0.05
  health_insurance_per_period: number;
  retirement_401k_pct: number; // e.g. 0.06
  other_deductions_per_period: number;
}

// Tax constants (2026 simplified)
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009; // over $200k
const MEDICARE_ADDITIONAL_THRESHOLD = 200000;

class PayrollEngine {
  private periods: Map<string, PayrollPeriod> = new Map();
  private deductions: Map<string, DeductionConfig> = new Map();
  private ytdEarnings: Map<string, { gross: number; federal_tax: number; net: number }> = new Map();
  private nextPeriodId = 1;

  /** Configure deductions for an employee. */
  configureDeductions(config: DeductionConfig): DeductionConfig {
    this.deductions.set(config.employee_id, config);
    return config;
  }

  /** Create a payroll period. */
  createPeriod(input: {
    start_date: string;
    end_date: string;
    pay_date: string;
    type: PayrollPeriod["type"];
  }): PayrollPeriod {
    const id = `PP-${String(this.nextPeriodId++).padStart(4, "0")}`;
    const period: PayrollPeriod = { id, ...input, status: "open" };
    this.periods.set(id, period);
    return period;
  }

  /** Calculate a single employee's pay stub for a period. */
  calculatePayStub(employeeId: string, periodId: string): PayStub {
    const emp = employeeEngine.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);
    const period = this.periods.get(periodId);
    if (!period) throw new Error(`Period ${periodId} not found`);

    // Get timecard from TimeClockEngine
    const timecard = timeClockEngine.timecardSummary(
      employeeId,
      `${period.start_date} to ${period.end_date}`,
      period.start_date,
      period.end_date,
    );

    // Calculate earnings
    const regularPay = timecard.regular_hours * emp.hourly_rate;
    const overtimePay = timecard.overtime_hours * emp.overtime_rate;
    const doubleTimePay = timecard.double_time_hours * emp.double_time_rate;
    const grossPay = regularPay + overtimePay + doubleTimePay;

    // Calculate deductions
    const config = this.deductions.get(employeeId) ?? this.defaultDeductions(employeeId);
    const ytd = this.ytdEarnings.get(employeeId) ?? { gross: 0, federal_tax: 0, net: 0 };

    const federalTax = grossPay * config.federal_tax_rate;
    const stateTax = grossPay * config.state_tax_rate;

    // Social security (capped at wage base)
    const ssEligible = Math.max(0, Math.min(grossPay, SOCIAL_SECURITY_WAGE_BASE - ytd.gross));
    const socialSecurity = ssEligible * SOCIAL_SECURITY_RATE;

    // Medicare (additional 0.9% rate on earnings above $200k threshold)
    // Only tax the portion of THIS paycheck above the threshold, not prior periods
    let medicare = grossPay * MEDICARE_RATE;
    if (ytd.gross + grossPay > MEDICARE_ADDITIONAL_THRESHOLD) {
      const priorOverThreshold = Math.max(0, ytd.gross - MEDICARE_ADDITIONAL_THRESHOLD);
      const currentOverThreshold = Math.max(0, ytd.gross + grossPay - MEDICARE_ADDITIONAL_THRESHOLD);
      const additionalEligible = currentOverThreshold - priorOverThreshold;
      medicare += additionalEligible * MEDICARE_ADDITIONAL_RATE;
    }

    const retirement = grossPay * config.retirement_401k_pct;
    const totalDeductions =
      federalTax + stateTax + socialSecurity + medicare +
      config.health_insurance_per_period + retirement + config.other_deductions_per_period;

    const netPay = grossPay - totalDeductions;

    // Update YTD
    ytd.gross += grossPay;
    ytd.federal_tax += federalTax;
    ytd.net += netPay;
    this.ytdEarnings.set(employeeId, ytd);

    return {
      employee_id: employeeId,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      period_id: periodId,
      period_start: period.start_date,
      period_end: period.end_date,
      pay_date: period.pay_date,
      earnings: {
        regular_hours: timecard.regular_hours,
        regular_rate: emp.hourly_rate,
        regular_pay: round2(regularPay),
        overtime_hours: timecard.overtime_hours,
        overtime_rate: emp.overtime_rate,
        overtime_pay: round2(overtimePay),
        double_time_hours: timecard.double_time_hours,
        double_time_rate: emp.double_time_rate,
        double_time_pay: round2(doubleTimePay),
        gross_pay: round2(grossPay),
      },
      deductions: {
        federal_tax: round2(federalTax),
        state_tax: round2(stateTax),
        social_security: round2(socialSecurity),
        medicare: round2(medicare),
        health_insurance: round2(config.health_insurance_per_period),
        retirement_401k: round2(retirement),
        other: round2(config.other_deductions_per_period),
        total_deductions: round2(totalDeductions),
      },
      net_pay: round2(netPay),
      ytd: {
        gross_pay: round2(ytd.gross),
        federal_tax: round2(ytd.federal_tax),
        net_pay: round2(ytd.net),
      },
    };
  }

  /** Run payroll for all active employees in a period. */
  runPayroll(periodId: string): PayrollSummary {
    const period = this.periods.get(periodId);
    if (!period) throw new Error(`Period ${periodId} not found`);

    const activeEmployees = employeeEngine.list("active");
    const stubs: PayStub[] = [];

    for (const emp of activeEmployees) {
      try {
        stubs.push(this.calculatePayStub(emp.id, periodId));
      } catch {
        // Skip employees with no time entries
      }
    }

    const byDept: Record<string, { employees: number; gross_pay: number; hours: number }> = {};
    for (const stub of stubs) {
      const emp = employeeEngine.get(stub.employee_id);
      const dept = emp?.department ?? "unknown";
      if (!byDept[dept]) byDept[dept] = { employees: 0, gross_pay: 0, hours: 0 };
      byDept[dept].employees++;
      byDept[dept].gross_pay += stub.earnings.gross_pay;
      byDept[dept].hours +=
        stub.earnings.regular_hours + stub.earnings.overtime_hours + stub.earnings.double_time_hours;
    }

    period.status = "finalized";

    return {
      period_id: periodId,
      period: `${period.start_date} to ${period.end_date}`,
      employee_count: stubs.length,
      total_hours: round2(stubs.reduce((s, st) => s + st.earnings.regular_hours + st.earnings.overtime_hours + st.earnings.double_time_hours, 0)),
      total_overtime_hours: round2(stubs.reduce((s, st) => s + st.earnings.overtime_hours + st.earnings.double_time_hours, 0)),
      total_gross_pay: round2(stubs.reduce((s, st) => s + st.earnings.gross_pay, 0)),
      total_deductions: round2(stubs.reduce((s, st) => s + st.deductions.total_deductions, 0)),
      total_net_pay: round2(stubs.reduce((s, st) => s + st.net_pay, 0)),
      by_department: byDept,
      stubs,
    };
  }

  private defaultDeductions(employeeId: string): DeductionConfig {
    return {
      employee_id: employeeId,
      federal_tax_rate: 0.22,
      state_tax_rate: 0.05,
      health_insurance_per_period: 150,
      retirement_401k_pct: 0.06,
      other_deductions_per_period: 0,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const payrollEngine = new PayrollEngine();
export { PayrollEngine };
