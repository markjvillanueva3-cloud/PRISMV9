/**
 * AccountingHardeningEngine tests — SQ4-3-ACCT
 *
 * Tests 6 formulas: bank reconciliation, WIP valuation, variance analysis,
 * cost-to-complete (EAC/ETC), multi-period comparison, QuickBooks sync.
 */

import { describe, it, expect } from "vitest";
import {
  accountingHardeningEngine,
  type BankTransaction,
  type GLEntry,
  type JobWIP,
  type CostRecord,
  type JobCostData,
  type PeriodFinancials,
} from "../engines/AccountingHardeningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const BANK_TXNS: BankTransaction[] = [
  { id: "BT-1", date: "2026-03-01", description: "Customer payment", amount: 5000, reference: "CHK-101", type: "deposit" },
  { id: "BT-2", date: "2026-03-05", description: "Tool supplier", amount: -1200, reference: "PO-500", type: "withdrawal" },
  { id: "BT-3", date: "2026-03-10", description: "Payroll", amount: -3500, type: "withdrawal" },
  { id: "BT-4", date: "2026-03-15", description: "Bank fee", amount: -25, type: "fee" },
  { id: "BT-5", date: "2026-03-20", description: "Mystery deposit", amount: 800, type: "deposit" },
];

const GL_ENTRIES: GLEntry[] = [
  { id: "GL-1", date: "2026-03-01", description: "Invoice 1001 payment", amount: 5000, account_code: "1000", reference_id: "CHK-101", posted: true },
  { id: "GL-2", date: "2026-03-04", description: "PO-500 tooling", amount: -1200, account_code: "1000", reference_id: "PO-500", posted: true },
  { id: "GL-3", date: "2026-03-10", description: "Payroll March W1", amount: -3500, account_code: "1000", posted: true },
  { id: "GL-4", date: "2026-03-25", description: "Pending check #1052", amount: -800, account_code: "1000", posted: true },
];

const JOBS_WIP: JobWIP[] = [
  { job_id: "J-100", part_number: "P-100", quantity_ordered: 50, quantity_complete: 30, direct_material: 500, direct_labor: 800, machine_time_cost: 600, tooling_cost: 100, overhead_applied: 300, status: "in_process" },
  { job_id: "J-200", part_number: "P-200", quantity_ordered: 10, quantity_complete: 0, direct_material: 200, direct_labor: 0, machine_time_cost: 0, tooling_cost: 0, overhead_applied: 0, status: "open" },
  { job_id: "J-300", part_number: "P-300", quantity_ordered: 25, quantity_complete: 25, direct_material: 300, direct_labor: 500, machine_time_cost: 400, tooling_cost: 75, overhead_applied: 190, status: "complete" },
];

const COST_RECORDS: CostRecord[] = [
  { job_id: "J-100", category: "material", standard_qty: 50, standard_rate: 10, actual_qty: 52, actual_rate: 11 },
  { job_id: "J-100", category: "labor", standard_qty: 40, standard_rate: 45, actual_qty: 38, actual_rate: 47 },
  { job_id: "J-200", category: "material", standard_qty: 100, standard_rate: 8, actual_qty: 100, actual_rate: 8 },
];

const JOB_COST_DATA: JobCostData[] = [
  { job_id: "J-100", budget_at_completion: 5000, actual_cost_to_date: 3200, earned_value: 3000, pct_complete: 0.6, remaining_work_units: 20 },
  { job_id: "J-200", budget_at_completion: 2000, actual_cost_to_date: 500, earned_value: 600, pct_complete: 0.3, remaining_work_units: 7 },
];

const PERIODS: PeriodFinancials[] = [
  { period: "2026-Q1", revenue: 100000, cogs: 60000, gross_profit: 40000, operating_expenses: 25000, net_income: 15000, total_assets: 200000, total_liabilities: 80000, total_equity: 120000 },
  { period: "2026-Q2", revenue: 120000, cogs: 70000, gross_profit: 50000, operating_expenses: 28000, net_income: 22000, total_assets: 220000, total_liabilities: 75000, total_equity: 145000 },
  { period: "2026-Q3", revenue: 110000, cogs: 68000, gross_profit: 42000, operating_expenses: 30000, net_income: 12000, total_assets: 210000, total_liabilities: 85000, total_equity: 125000 },
];

// ============================================================================
// TESTS
// ============================================================================

describe("AccountingHardeningEngine", () => {

  describe("bankReconciliation", () => {
    it("should match exact amount+date transactions", () => {
      const r = accountingHardeningEngine.bankReconciliation({
        bank_transactions: BANK_TXNS,
        gl_entries: GL_ENTRIES,
        bank_ending_balance: 1075,
        statement_date: "2026-03-31",
      });
      // BT-1↔GL-1 (exact), BT-3↔GL-3 (exact) — 2 exact matches minimum
      const exact = r.matched.filter(m => m.match_type === "exact");
      expect(exact.length).toBeGreaterThanOrEqual(2);
    });

    it("should fuzzy-match by date tolerance", () => {
      const r = accountingHardeningEngine.bankReconciliation({
        bank_transactions: BANK_TXNS,
        gl_entries: GL_ENTRIES,
        bank_ending_balance: 1075,
        statement_date: "2026-03-31",
        tolerance_days: 3,
      });
      // BT-2 (Mar 5) ↔ GL-2 (Mar 4) — 1 day diff, same amount → fuzzy match
      const fuzzy = r.matched.filter(m => m.match_type === "fuzzy");
      expect(fuzzy.length).toBeGreaterThanOrEqual(1);
    });

    it("should identify unmatched bank transactions", () => {
      const r = accountingHardeningEngine.bankReconciliation({
        bank_transactions: BANK_TXNS,
        gl_entries: GL_ENTRIES,
        bank_ending_balance: 1075,
        statement_date: "2026-03-31",
      });
      // BT-4 (bank fee $25) and BT-5 ($800 mystery) have no GL match
      expect(r.unmatched_bank.length).toBeGreaterThanOrEqual(1);
    });

    it("should calculate outstanding checks and deposits", () => {
      const r = accountingHardeningEngine.bankReconciliation({
        bank_transactions: BANK_TXNS,
        gl_entries: GL_ENTRIES,
        bank_ending_balance: 1075,
        statement_date: "2026-03-31",
      });
      // GL-4 ($800 check) is unmatched GL → outstanding check
      expect(r.outstanding_checks).toBeGreaterThanOrEqual(0);
      expect(typeof r.adjusted_bank_balance).toBe("number");
      expect(typeof r.match_rate_pct).toBe("number");
    });

    it("should report 100% match rate with empty inputs", () => {
      const r = accountingHardeningEngine.bankReconciliation({
        bank_transactions: [],
        gl_entries: [],
        bank_ending_balance: 0,
        statement_date: "2026-03-31",
      });
      expect(r.match_rate_pct).toBe(100);
      expect(r.reconciled).toBe(true);
    });
  });

  describe("wipValuation", () => {
    it("should compute absorption costing (default)", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP });
      expect(r.method).toBe("absorption");
      // J-100: 500+800+600+100+300 = 2300, J-200: 200+0+0+0+0 = 200
      // J-300 is complete → excluded
      expect(r.total_jobs).toBe(2);
      expect(r.total_wip).toBe(2500);
      expect(r.jobs_in_process).toBe(1);
    });

    it("should compute variable costing (excludes overhead)", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP, method: "variable" });
      expect(r.method).toBe("variable");
      // J-100: 500+800+600+100 = 2000 (no overhead), J-200: 200
      expect(r.total_wip).toBe(2200);
    });

    it("should compute throughput costing (material only)", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP, method: "throughput" });
      expect(r.method).toBe("throughput");
      // J-100: 500, J-200: 200
      expect(r.total_wip).toBe(700);
    });

    it("should compute cost per unit correctly", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP });
      const j100 = r.jobs.find(j => j.job_id === "J-100")!;
      // 2300 / 30 completed = 76.67
      expect(j100.cost_per_unit).toBeCloseTo(76.67, 1);
      expect(j100.pct_complete).toBeCloseTo(60, 0);
    });

    it("should exclude completed jobs from WIP", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP });
      expect(r.jobs.find(j => j.job_id === "J-300")).toBeUndefined();
    });

    it("should handle zero quantity gracefully", () => {
      const r = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP });
      const j200 = r.jobs.find(j => j.job_id === "J-200")!;
      expect(j200.cost_per_unit).toBe(0); // 0 completed → 0 cost per unit
      expect(j200.pct_complete).toBe(0);
    });
  });

  describe("varianceAnalysis", () => {
    it("should decompose material variance into price + quantity", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      const mat = r.variances.find(v => v.job_id === "J-100" && v.category === "material")!;
      // Standard: 50×10=500, Actual: 52×11=572
      // Price: (11-10)×52 = 52, Qty: (52-50)×10 = 20, Total: 72
      expect(mat.price_variance).toBe(52);
      expect(mat.quantity_variance).toBe(20);
      expect(mat.total_variance).toBe(72);
      expect(mat.favorable).toBe(false); // Over budget
    });

    it("should identify favorable labor variance", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      const labor = r.variances.find(v => v.job_id === "J-100" && v.category === "labor")!;
      // Standard: 40×45=1800, Actual: 38×47=1786
      // Total: 1786-1800 = -14 (favorable — under budget)
      expect(labor.total_variance).toBe(-14);
      expect(labor.favorable).toBe(true);
    });

    it("should handle zero variance correctly", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      const mat200 = r.variances.find(v => v.job_id === "J-200")!;
      // Standard: 100×8=800, Actual: 100×8=800 → zero variance
      expect(mat200.total_variance).toBe(0);
      expect(mat200.price_variance).toBe(0);
      expect(mat200.quantity_variance).toBe(0);
    });

    it("should compute summary with net variance", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      // Total: 72 + (-14) + 0 = 58 (net unfavorable)
      expect(r.summary.net_variance).toBe(58);
      expect(r.summary.total_unfavorable).toBeGreaterThan(0);
    });

    it("should find largest absolute variance", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      expect(r.summary.largest_variance.job_id).toBe("J-100");
      expect(Math.abs(r.summary.largest_variance.amount)).toBeGreaterThan(0);
    });
  });

  describe("costToComplete", () => {
    it("should forecast EAC using current_cpi method", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA });
      const j100 = r.forecasts.find(f => f.job_id === "J-100")!;
      // CPI = 3000/3200 = 0.9375
      // EAC = BAC/CPI = 5000/0.9375 = 5333.33
      expect(j100.cpi).toBeCloseTo(0.938, 2);
      expect(j100.eac).toBeCloseTo(5333.33, 0);
      expect(j100.etc).toBeCloseTo(5333.33 - 3200, 0);
      expect(j100.on_budget).toBe(false); // 5333 > 5000×1.05
    });

    it("should forecast EAC using budget_rate method", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA, method: "budget_rate" });
      const j100 = r.forecasts.find(f => f.job_id === "J-100")!;
      // EAC = AC + (BAC - EV) = 3200 + (5000-3000) = 5200
      expect(j100.eac).toBe(5200);
    });

    it("should compute TCPI correctly", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA });
      const j100 = r.forecasts.find(f => f.job_id === "J-100")!;
      // TCPI = (BAC-EV)/(BAC-AC) = (5000-3000)/(5000-3200) = 2000/1800 = 1.111
      expect(j100.tcpi).toBeCloseTo(1.111, 2);
    });

    it("should assign risk level based on CPI", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA });
      const j100 = r.forecasts.find(f => f.job_id === "J-100")!;
      // CPI=0.938 → medium risk (0.85-0.95)
      expect(j100.risk_level).toBe("medium");

      const j200 = r.forecasts.find(f => f.job_id === "J-200")!;
      // CPI = 600/500 = 1.2 → low risk (≥0.95)
      expect(j200.risk_level).toBe("low");
    });

    it("should compute portfolio-level metrics", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA });
      expect(r.portfolio.total_bac).toBe(7000);
      expect(r.portfolio.total_eac).toBeGreaterThan(0);
      expect(r.portfolio.portfolio_cpi).toBeGreaterThan(0);
    });

    it("should handle bottom_up method with manual ETC", () => {
      const r = accountingHardeningEngine.costToComplete({
        jobs: JOB_COST_DATA,
        method: "bottom_up",
        manual_etc: { "J-100": 2500 },
      });
      const j100 = r.forecasts.find(f => f.job_id === "J-100")!;
      // EAC = AC + manual_ETC = 3200 + 2500 = 5700
      expect(j100.eac).toBe(5700);
    });
  });

  describe("multiPeriodCompare", () => {
    it("should compute revenue growth rates", () => {
      const r = accountingHardeningEngine.multiPeriodCompare({ periods: PERIODS });
      // Q1→Q2: (120k-100k)/100k = 20%, Q2→Q3: (110k-120k)/120k = -8.3%
      expect(r.trends.revenue_growth_pct).toHaveLength(2);
      expect(r.trends.revenue_growth_pct[0]).toBeCloseTo(20, 0);
      expect(r.trends.revenue_growth_pct[1]).toBeCloseTo(-8.3, 0);
    });

    it("should compute margin trend", () => {
      const r = accountingHardeningEngine.multiPeriodCompare({ periods: PERIODS });
      // Q1: 40k/100k=40%, Q2: 50k/120k=41.7%, Q3: 42k/110k=38.2%
      expect(r.trends.margin_trend_pct).toHaveLength(3);
      expect(r.trends.margin_trend_pct[0]).toBeCloseTo(40, 0);
      expect(r.trends.margin_trend_pct[1]).toBeCloseTo(41.7, 0);
    });

    it("should identify best and worst periods", () => {
      const r = accountingHardeningEngine.multiPeriodCompare({ periods: PERIODS });
      expect(r.summary.best_period).toBe("2026-Q2");   // 22000 net
      expect(r.summary.worst_period).toBe("2026-Q3");  // 12000 net
    });

    it("should compute revenue volatility (CV)", () => {
      const r = accountingHardeningEngine.multiPeriodCompare({ periods: PERIODS });
      expect(r.summary.revenue_volatility_cv).toBeGreaterThan(0);
      expect(r.summary.revenue_volatility_cv).toBeLessThan(50); // Low volatility for these numbers
    });

    it("should handle single period gracefully", () => {
      const r = accountingHardeningEngine.multiPeriodCompare({ periods: [PERIODS[0]] });
      expect(r.trends.revenue_growth_pct).toHaveLength(0);
      expect(r.summary.best_period).toBe("2026-Q1");
      expect(r.summary.worst_period).toBe("2026-Q1");
    });
  });

  describe("quickbooksSync", () => {
    const GL_ACCTS = [
      { code: "1000", name: "Cash", type: "asset", balance: 50000 },
      { code: "1100", name: "Accounts Receivable", type: "asset", balance: 30000 },
      { code: "2000", name: "Accounts Payable", type: "liability", balance: 15000 },
      { code: "4000", name: "Job Revenue", type: "revenue", balance: 100000 },
    ];
    const QB_ACCTS = [
      { id: "QB-1", name: "Cash", type: "Bank", balance: 50000 },
      { id: "QB-2", name: "Accounts Receivable", type: "AccountsReceivable", balance: 28000 },
      { id: "QB-3", name: "Accounts Payable", type: "AccountsPayable", balance: 15000 },
    ];

    it("should map GL accounts to QB accounts by name", () => {
      const r = accountingHardeningEngine.quickbooksSync({
        direction: "push",
        gl_accounts: GL_ACCTS,
        qb_accounts: QB_ACCTS,
      });
      expect(r.accounts_mapped).toBeGreaterThanOrEqual(3); // Cash, AR, AP match
    });

    it("should detect balance conflicts", () => {
      const r = accountingHardeningEngine.quickbooksSync({
        direction: "bidirectional",
        gl_accounts: GL_ACCTS,
        qb_accounts: QB_ACCTS,
      });
      // AR: GL=30000, QB=28000 → conflict
      const arConflict = r.conflicts.find(c => c.gl_id === "1100");
      expect(arConflict).toBeTruthy();
      expect(arConflict!.field).toBe("balance");
    });

    it("should identify unmapped GL accounts", () => {
      const r = accountingHardeningEngine.quickbooksSync({
        direction: "push",
        gl_accounts: GL_ACCTS,
        qb_accounts: QB_ACCTS,
      });
      // "Job Revenue" has no QB match
      expect(r.unmapped_gl).toContain("4000");
    });

    it("should handle push-only with no QB accounts", () => {
      const r = accountingHardeningEngine.quickbooksSync({
        direction: "push",
        gl_accounts: GL_ACCTS,
      });
      expect(r.accounts_mapped).toBe(0);
      expect(r.unmapped_gl).toHaveLength(4);
    });
  });

  describe("accounting identity checks", () => {
    it("should verify variance decomposition: price + qty + mix = total", () => {
      const r = accountingHardeningEngine.varianceAnalysis({ records: COST_RECORDS });
      for (const v of r.variances) {
        const sum = v.price_variance + v.quantity_variance + v.mix_variance;
        expect(sum).toBeCloseTo(v.total_variance, 2);
      }
    });

    it("should verify EV/CPI/EAC identity: EAC×CPI ≈ BAC for current_cpi method", () => {
      const r = accountingHardeningEngine.costToComplete({ jobs: JOB_COST_DATA, method: "current_cpi" });
      for (const f of r.forecasts) {
        // EAC = BAC/CPI → EAC×CPI ≈ BAC (within rounding tolerance of 2-3 dp)
        expect(Math.abs(f.eac * f.cpi - f.bac)).toBeLessThan(f.bac * 0.01);
      }
    });

    it("should verify WIP: absorption >= variable >= throughput for same jobs", () => {
      const abs = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP, method: "absorption" });
      const var_ = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP, method: "variable" });
      const thr = accountingHardeningEngine.wipValuation({ jobs: JOBS_WIP, method: "throughput" });
      expect(abs.total_wip).toBeGreaterThanOrEqual(var_.total_wip);
      expect(var_.total_wip).toBeGreaterThanOrEqual(thr.total_wip);
    });
  });
});
