/**
 * HRComplianceEngine — Benefits administration, PTO tracking, training records,
 * performance reviews, compensation history, labor law compliance.
 */

export interface BenefitPlan {
  id: string;
  name: string;
  type: 'health' | 'dental' | 'vision' | '401k' | 'life' | 'disability' | 'hsa' | 'other';
  provider: string;
  employer_contribution: number;
  employee_contribution: number;
  coverage_tier: 'employee' | 'employee_spouse' | 'employee_children' | 'family';
}

export interface EmployeeBenefitEnrollment {
  employee_id: string;
  plans: { plan_id: string; plan_name: string; tier: string; employee_cost: number; employer_cost: number; effective_date: string }[];
  total_employee_deduction: number;
  total_employer_cost: number;
}

export interface PTOBalance {
  employee_id: string;
  balances: { type: string; accrued: number; used: number; pending: number; available: number; max_carryover: number }[];
  total_available: number;
}

export interface PTORequest {
  id: string;
  employee_id: string;
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'jury_duty' | 'military' | 'fmla';
  start_date: string;
  end_date: string;
  hours: number;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  approved_by?: string;
  notes?: string;
}

export interface TrainingRecord {
  id: string;
  employee_id: string;
  course_name: string;
  category: 'safety' | 'technical' | 'quality' | 'leadership' | 'compliance' | 'machine_specific';
  completed_date: string;
  expiration_date?: string;
  instructor?: string;
  score?: number;
  certificate_id?: string;
  status: 'completed' | 'in_progress' | 'expired' | 'scheduled';
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_date: string;
  period: string;
  overall_rating: number; // 1-5
  categories: { name: string; rating: number; comments: string }[];
  goals: { description: string; status: 'met' | 'partially_met' | 'not_met' | 'pending' }[];
  compensation_change?: { type: 'raise' | 'bonus' | 'promotion'; amount: number; effective_date: string };
  notes?: string;
}

export interface CompensationHistory {
  employee_id: string;
  history: { effective_date: string; type: string; old_rate: number; new_rate: number; change_pct: number; reason: string }[];
  current_rate: number;
  total_changes: number;
}

export interface ComplianceAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  employee_id?: string;
  due_date?: string;
  regulation: string;
}

// PTO accrual rates (hours per pay period for biweekly)
const PTO_ACCRUAL_RATES: Record<string, { year_0_4: number; year_5_9: number; year_10_plus: number }> = {
  vacation: { year_0_4: 3.08, year_5_9: 4.62, year_10_plus: 6.15 },
  sick: { year_0_4: 1.85, year_5_9: 1.85, year_10_plus: 1.85 },
  personal: { year_0_4: 0.77, year_5_9: 0.77, year_10_plus: 0.77 },
};

const DEFAULT_BENEFIT_PLANS: Omit<BenefitPlan, 'id'>[] = [
  { name: 'Medical PPO', type: 'health', provider: 'Blue Cross', employer_contribution: 450, employee_contribution: 150, coverage_tier: 'employee' },
  { name: 'Medical PPO Family', type: 'health', provider: 'Blue Cross', employer_contribution: 1200, employee_contribution: 400, coverage_tier: 'family' },
  { name: 'Dental', type: 'dental', provider: 'Delta Dental', employer_contribution: 40, employee_contribution: 15, coverage_tier: 'employee' },
  { name: 'Vision', type: 'vision', provider: 'VSP', employer_contribution: 12, employee_contribution: 8, coverage_tier: 'employee' },
  { name: '401(k) Match', type: '401k', provider: 'Fidelity', employer_contribution: 0, employee_contribution: 0, coverage_tier: 'employee' },
  { name: 'Life Insurance 1x', type: 'life', provider: 'MetLife', employer_contribution: 25, employee_contribution: 0, coverage_tier: 'employee' },
  { name: 'Short-Term Disability', type: 'disability', provider: 'Hartford', employer_contribution: 18, employee_contribution: 0, coverage_tier: 'employee' },
];

class HRComplianceEngine {
  private benefitPlans: Map<string, BenefitPlan> = new Map();
  private enrollments: Map<string, EmployeeBenefitEnrollment> = new Map();
  private ptoBalances: Map<string, PTOBalance> = new Map();
  private ptoRequests: PTORequest[] = [];
  private trainingRecords: TrainingRecord[] = [];
  private performanceReviews: PerformanceReview[] = [];
  private compensationHistory: Map<string, CompensationHistory> = new Map();

  constructor() {
    for (let i = 0; i < DEFAULT_BENEFIT_PLANS.length; i++) {
      const plan = DEFAULT_BENEFIT_PLANS[i];
      const id = `BP-${String(i + 1).padStart(3, '0')}`;
      this.benefitPlans.set(id, { ...plan, id });
    }
  }

  // --- Benefits ---
  listBenefitPlans(): BenefitPlan[] {
    return [...this.benefitPlans.values()];
  }

  enrollEmployee(employee_id: string, plan_ids: string[]): EmployeeBenefitEnrollment {
    const plans = plan_ids.map((pid) => {
      const plan = this.benefitPlans.get(pid);
      if (!plan) throw new Error(`Benefit plan ${pid} not found`);
      return {
        plan_id: pid, plan_name: plan.name, tier: plan.coverage_tier,
        employee_cost: plan.employee_contribution, employer_cost: plan.employer_contribution,
        effective_date: new Date().toISOString().slice(0, 10),
      };
    });
    const enrollment: EmployeeBenefitEnrollment = {
      employee_id, plans,
      total_employee_deduction: plans.reduce((s, p) => s + p.employee_cost, 0),
      total_employer_cost: plans.reduce((s, p) => s + p.employer_cost, 0),
    };
    this.enrollments.set(employee_id, enrollment);
    return enrollment;
  }

  getEnrollment(employee_id: string): EmployeeBenefitEnrollment | undefined {
    return this.enrollments.get(employee_id);
  }

  // --- PTO ---
  initializePTO(employee_id: string, years_of_service: number): PTOBalance {
    const tier = years_of_service >= 10 ? 'year_10_plus' : years_of_service >= 5 ? 'year_5_9' : 'year_0_4';
    const balances = Object.entries(PTO_ACCRUAL_RATES).map(([type, rates]) => ({
      type,
      accrued: rates[tier] * 26, // annual (26 biweekly periods)
      used: 0, pending: 0,
      available: rates[tier] * 26,
      max_carryover: type === 'vacation' ? 40 : type === 'sick' ? 80 : 0,
    }));
    const pto: PTOBalance = {
      employee_id, balances,
      total_available: balances.reduce((s, b) => s + b.available, 0),
    };
    this.ptoBalances.set(employee_id, pto);
    return pto;
  }

  requestPTO(params: Omit<PTORequest, 'id' | 'status'>): PTORequest {
    const balance = this.ptoBalances.get(params.employee_id);
    if (!balance) throw new Error(`No PTO balance for employee ${params.employee_id}`);
    const typeBalance = balance.balances.find((b) => b.type === params.type);
    if (typeBalance && params.hours > typeBalance.available) {
      throw new Error(`Insufficient ${params.type} balance: ${typeBalance.available}h available, ${params.hours}h requested`);
    }
    const request: PTORequest = { ...params, id: `PTO-${Date.now()}`, status: 'pending' };
    this.ptoRequests.push(request);
    if (typeBalance) typeBalance.pending += params.hours;
    return request;
  }

  approvePTO(request_id: string, approved_by: string): PTORequest {
    const req = this.ptoRequests.find((r) => r.id === request_id);
    if (!req) throw new Error(`PTO request ${request_id} not found`);
    req.status = 'approved';
    req.approved_by = approved_by;
    const balance = this.ptoBalances.get(req.employee_id);
    if (balance) {
      const tb = balance.balances.find((b) => b.type === req.type);
      if (tb) {
        tb.pending -= req.hours;
        tb.used += req.hours;
        tb.available -= req.hours;
      }
      balance.total_available = balance.balances.reduce((s, b) => s + b.available, 0);
    }
    return req;
  }

  getPTOBalance(employee_id: string): PTOBalance | undefined {
    return this.ptoBalances.get(employee_id);
  }

  // --- Training ---
  addTraining(params: Omit<TrainingRecord, 'id' | 'status'>): TrainingRecord {
    const id = `TR-${Date.now()}`;
    const now = new Date();
    const expDate = params.expiration_date ? new Date(params.expiration_date) : null;
    const status: TrainingRecord['status'] = expDate && expDate < now ? 'expired' : 'completed';
    const record: TrainingRecord = { ...params, id, status };
    this.trainingRecords.push(record);
    return record;
  }

  getTrainingHistory(employee_id: string): TrainingRecord[] {
    return this.trainingRecords.filter((t) => t.employee_id === employee_id);
  }

  getExpiringTraining(within_days: number = 90): TrainingRecord[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + within_days);
    return this.trainingRecords.filter((t) =>
      t.expiration_date && new Date(t.expiration_date) <= cutoff && t.status !== 'expired'
    );
  }

  // --- Performance Reviews ---
  createReview(params: Omit<PerformanceReview, 'id'>): PerformanceReview {
    const id = `PR-${Date.now()}`;
    const review: PerformanceReview = { ...params, id };
    this.performanceReviews.push(review);

    // Record compensation change if any
    if (params.compensation_change) {
      const history = this.compensationHistory.get(params.employee_id) ?? {
        employee_id: params.employee_id, history: [], current_rate: 0, total_changes: 0,
      };
      history.history.push({
        effective_date: params.compensation_change.effective_date,
        type: params.compensation_change.type,
        old_rate: history.current_rate,
        new_rate: history.current_rate + params.compensation_change.amount,
        change_pct: history.current_rate > 0 ? (params.compensation_change.amount / history.current_rate) * 100 : 0,
        reason: `Performance review ${params.period}`,
      });
      history.current_rate += params.compensation_change.amount;
      history.total_changes++;
      this.compensationHistory.set(params.employee_id, history);
    }

    return review;
  }

  getReviews(employee_id: string): PerformanceReview[] {
    return this.performanceReviews.filter((r) => r.employee_id === employee_id);
  }

  getCompensationHistory(employee_id: string): CompensationHistory | undefined {
    return this.compensationHistory.get(employee_id);
  }

  // --- Compliance ---
  complianceAlerts(): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];

    // Expiring training
    const expiring = this.getExpiringTraining(30);
    for (const t of expiring) {
      alerts.push({
        type: 'training_expiring', severity: 'warning',
        description: `${t.course_name} expires ${t.expiration_date}`,
        employee_id: t.employee_id, due_date: t.expiration_date,
        regulation: t.category === 'safety' ? 'OSHA 29 CFR 1910' : 'Company Policy',
      });
    }

    // Missing benefits enrollment (employees with no enrollment)
    // Would check against employee list — simplified here

    // PTO approaching max carryover
    for (const [empId, pto] of this.ptoBalances) {
      for (const b of pto.balances) {
        if (b.max_carryover > 0 && b.available > b.max_carryover * 0.9) {
          alerts.push({
            type: 'pto_use_it_or_lose_it', severity: 'info',
            description: `${b.type}: ${b.available.toFixed(1)}h remaining (max carryover: ${b.max_carryover}h)`,
            employee_id: empId, regulation: 'Company PTO Policy',
          });
        }
      }
    }

    return alerts.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return sev[a.severity] - sev[b.severity];
    });
  }

  hrDashboard(): {
    total_enrolled: number;
    total_employer_benefit_cost: number;
    avg_pto_balance: number;
    training_compliance_pct: number;
    pending_reviews: number;
    compliance_alerts: number;
  } {
    const enrolled = this.enrollments.size;
    const totalCost = [...this.enrollments.values()].reduce((s, e) => s + e.total_employer_cost, 0);
    const ptoBals = [...this.ptoBalances.values()];
    const avgPto = ptoBals.length > 0 ? ptoBals.reduce((s, p) => s + p.total_available, 0) / ptoBals.length : 0;
    const totalTraining = this.trainingRecords.length;
    const currentTraining = this.trainingRecords.filter((t) => t.status === 'completed').length;
    const alerts = this.complianceAlerts();

    return {
      total_enrolled: enrolled,
      total_employer_benefit_cost: totalCost,
      avg_pto_balance: Math.round(avgPto * 10) / 10,
      training_compliance_pct: totalTraining > 0 ? Math.round((currentTraining / totalTraining) * 1000) / 10 : 100,
      pending_reviews: this.performanceReviews.filter((r) => r.goals.some((g) => g.status === 'pending')).length,
      compliance_alerts: alerts.length,
    };
  }
}

export const hrComplianceEngine = new HRComplianceEngine();
