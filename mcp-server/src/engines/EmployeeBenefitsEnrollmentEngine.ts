/**
 * EmployeeBenefitsEnrollmentEngine — health/dental/vision/401k/life enrollment.
 *
 * Lifecycle: open_enrollment (Nov-Dec) | qualifying_life_event window (30d from
 * marriage/birth/loss-of-coverage/etc.) → elected → effective → cancelled.
 *
 * 5 plan types: medical (3 tiers HDHP/PPO/HMO) · dental · vision · life_insurance · retirement_401k.
 *
 * Hotel-soul: PII-free (employee_id only, no SSN/dob), Object.frozen, R12 fail-loud,
 * financial-invariant gate (premium cents-resolution, no fractional pennies).
 *
 * @module EmployeeBenefitsEnrollmentEngine
 * @milestone HOTEL/U-EMPLOYEE-BENEFITS-ENROLLMENT (2026-05-25, slot:hotel iter30 /yolo)
 */

export type BenefitType = "medical" | "dental" | "vision" | "life_insurance" | "retirement_401k";
export type MedicalPlan = "HDHP" | "PPO" | "HMO";
export type EnrollmentStatus = "pending" | "active" | "cancelled";
export type QualifyingEvent = "marriage" | "divorce" | "birth_adoption" | "loss_of_coverage" | "spouse_job_change" | "death_dependent";

export interface BenefitElection {
  id: string;
  employee_id: string;
  benefit_type: BenefitType;
  plan_code: string;
  employee_premium_cents_per_period: number;
  employer_contribution_cents_per_period: number;
  coverage_start_date: string;
  status: EnrollmentStatus;
  qualifying_event?: QualifyingEvent;
  qualifying_event_date?: string;
  enrolled_at: string;
  cancelled_at?: string;
}

class EmployeeBenefitsEnrollmentEngine {
  private elections: Map<string, BenefitElection> = new Map();
  private nextId = 1;

  enroll(args: {
    employee_id: string;
    benefit_type: BenefitType;
    plan_code: string;
    employee_premium_cents_per_period: number;
    employer_contribution_cents_per_period: number;
    coverage_start_date: string;
    qualifying_event?: QualifyingEvent;
    qualifying_event_date?: string;
    is_open_enrollment?: boolean;
  }): BenefitElection {
    if (!args.employee_id) throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: employee_id required");
    if (!args.plan_code) throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: plan_code required");
    const validTypes: BenefitType[] = ["medical", "dental", "vision", "life_insurance", "retirement_401k"];
    if (!validTypes.includes(args.benefit_type)) {
      throw new Error(`EmployeeBenefitsEnrollmentEngine.enroll: invalid benefit_type "${args.benefit_type}"`);
    }
    if (!Number.isInteger(args.employee_premium_cents_per_period) || args.employee_premium_cents_per_period < 0) {
      throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: employee_premium_cents_per_period must be non-negative integer");
    }
    if (!Number.isInteger(args.employer_contribution_cents_per_period) || args.employer_contribution_cents_per_period < 0) {
      throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: employer_contribution_cents_per_period must be non-negative integer");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.coverage_start_date)) {
      throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: coverage_start_date must be ISO YYYY-MM-DD");
    }
    // Must be either open-enrollment OR a qualifying-life-event with date
    if (!args.is_open_enrollment && !args.qualifying_event) {
      throw new Error(
        "EmployeeBenefitsEnrollmentEngine.enroll: must be either open-enrollment OR a qualifying_life_event (§125 IRS-required)",
      );
    }
    if (args.qualifying_event) {
      const validEvents: QualifyingEvent[] = ["marriage", "divorce", "birth_adoption", "loss_of_coverage", "spouse_job_change", "death_dependent"];
      if (!validEvents.includes(args.qualifying_event)) {
        throw new Error(`EmployeeBenefitsEnrollmentEngine.enroll: invalid qualifying_event "${args.qualifying_event}"`);
      }
      if (!args.qualifying_event_date || !/^\d{4}-\d{2}-\d{2}$/.test(args.qualifying_event_date)) {
        throw new Error("EmployeeBenefitsEnrollmentEngine.enroll: qualifying_event_date (ISO) required with qualifying_event");
      }
      // 30-day window from event
      const eventMs = Date.parse(args.qualifying_event_date);
      const startMs = Date.parse(args.coverage_start_date);
      const daysAfter = (startMs - eventMs) / 86_400_000;
      if (daysAfter < 0 || daysAfter > 30) {
        throw new Error(
          `EmployeeBenefitsEnrollmentEngine.enroll: coverage_start_date must be within 30 days of qualifying_event_date (got ${daysAfter.toFixed(1)} days)`,
        );
      }
    }
    const id = `BEN-${String(this.nextId++).padStart(6, "0")}`;
    const e: BenefitElection = Object.freeze({
      id,
      employee_id: args.employee_id,
      benefit_type: args.benefit_type,
      plan_code: args.plan_code,
      employee_premium_cents_per_period: args.employee_premium_cents_per_period,
      employer_contribution_cents_per_period: args.employer_contribution_cents_per_period,
      coverage_start_date: args.coverage_start_date,
      status: "active" as const,
      enrolled_at: new Date().toISOString(),
      ...(args.qualifying_event !== undefined && { qualifying_event: args.qualifying_event }),
      ...(args.qualifying_event_date !== undefined && { qualifying_event_date: args.qualifying_event_date }),
    });
    this.elections.set(id, e);
    return e;
  }

  cancelElection(args: { election_id: string; reason: string }): BenefitElection {
    const e = this.requireElection(args.election_id);
    if (e.status !== "active") {
      throw new Error(`EmployeeBenefitsEnrollmentEngine.cancelElection: must be 'active' (got '${e.status}')`);
    }
    if (!args.reason || args.reason.trim().length < 5) {
      throw new Error("EmployeeBenefitsEnrollmentEngine.cancelElection: reason (≥5 chars) required");
    }
    const updated: BenefitElection = Object.freeze({
      ...e,
      status: "cancelled" as const,
      cancelled_at: new Date().toISOString(),
    });
    this.elections.set(e.id, updated);
    return updated;
  }

  /** Sum employee+employer deductions per pay period — feeds payroll. */
  getPayrollDeductions(args: { employee_id: string }): {
    employee_id: string;
    total_employee_deduction_cents: number;
    total_employer_contribution_cents: number;
    line_items: ReadonlyArray<{ benefit_type: BenefitType; plan_code: string; employee_cents: number }>;
  } {
    if (!args.employee_id) {
      throw new Error("EmployeeBenefitsEnrollmentEngine.getPayrollDeductions: employee_id required");
    }
    let totalEmp = 0, totalErp = 0;
    const lines: { benefit_type: BenefitType; plan_code: string; employee_cents: number }[] = [];
    for (const e of this.elections.values()) {
      if (e.employee_id !== args.employee_id || e.status !== "active") continue;
      totalEmp += e.employee_premium_cents_per_period;
      totalErp += e.employer_contribution_cents_per_period;
      lines.push({
        benefit_type: e.benefit_type,
        plan_code: e.plan_code,
        employee_cents: e.employee_premium_cents_per_period,
      });
    }
    return Object.freeze({
      employee_id: args.employee_id,
      total_employee_deduction_cents: totalEmp,
      total_employer_contribution_cents: totalErp,
      line_items: Object.freeze(lines.map((l) => Object.freeze(l))),
    });
  }

  listElections(args: { employee_id?: string; status?: EnrollmentStatus; benefit_type?: BenefitType }): ReadonlyArray<BenefitElection> {
    const out: BenefitElection[] = [];
    for (const e of this.elections.values()) {
      if (args.employee_id && e.employee_id !== args.employee_id) continue;
      if (args.status && e.status !== args.status) continue;
      if (args.benefit_type && e.benefit_type !== args.benefit_type) continue;
      out.push(Object.freeze({ ...e }));
    }
    return Object.freeze(out);
  }

  reset(): void {
    this.elections.clear();
    this.nextId = 1;
  }

  private requireElection(id: string): BenefitElection {
    const e = this.elections.get(id);
    if (!e) throw new Error(`EmployeeBenefitsEnrollmentEngine: unknown election_id "${id}"`);
    return e;
  }
}

export const employeeBenefitsEnrollmentEngine = new EmployeeBenefitsEnrollmentEngine();
