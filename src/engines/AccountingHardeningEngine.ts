/**
 * AccountingHardeningEngine — SQ4-3-ACCT Finance Hardening
 * ==========================================================
 *
 * Fills gaps in the financial pipeline that GeneralLedgerEngine doesn't cover:
 *   1. bankReconciliation  — Auto-match bank transactions to GL entries
 *   2. wipValuation        — Work-in-process valuation (3 methods)
 *   3. varianceAnalysis    — Price, quantity, and mix variance decomposition
 *   4. costToComplete      — EAC/ETC forecasting for active jobs
 *   5. multiPeriodCompare  — Period-over-period financial comparison
 *   6. quickbooksSync      — QuickBooks Online sync mapping
 *
 * Composes with GeneralLedgerEngine for GL data access.
 *
 * Reference:
 *   - GAAP: ASC 330 (Inventory), ASC 606 (Revenue), ASC 450 (Contingencies)
 *   - CMA: Standard costing variance analysis (Horngren, Cost Accounting, Ch. 7-8)
 *   - PMI: EAC formulas from PMBOK Guide 7th Ed., Section 7.4
 *   - IMA: WIP valuation methods (absorption vs variable vs throughput)
 *
 * @module AccountingHardeningEngine
 * @version 1.0.0 — SQ4-3-ACCT
 */

// ============================================================================
// TYPES
// ============================================================================

/** Bank transaction from statement import */
export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;          // positive = deposit, negative = withdrawal
  reference?: string;      // check #, wire ref, etc.
  type: "deposit" | "withdrawal" | "transfer" | "fee" | "interest";
}

/** GL entry for reconciliation matching */
export interface GLEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  account_code: string;
  reference_id?: string;
  posted: boolean;
}

/** Reconciliation match result */
export interface ReconciliationMatch {
  bank_txn_id: string;
  gl_entry_id: string | null;
  match_type: "exact" | "fuzzy" | "unmatched";
  confidence: number;      // 0-1
  amount_diff: number;     // 0 for exact match
}

/** Bank reconciliation result */
export interface BankReconciliationResult {
  statement_date: string;
  bank_ending_balance: number;
  gl_ending_balance: number;
  matched: ReconciliationMatch[];
  unmatched_bank: BankTransaction[];
  unmatched_gl: GLEntry[];
  outstanding_deposits: number;
  outstanding_checks: number;
  adjusted_bank_balance: number;
  adjusted_gl_balance: number;
  reconciled: boolean;
  difference: number;
  match_rate_pct: number;
  source: string;
}

/** WIP valuation methods per GAAP ASC 330 */
export type WIPMethod = "absorption" | "variable" | "throughput";

/** Job WIP data */
export interface JobWIP {
  job_id: string;
  part_number: string;
  quantity_ordered: number;
  quantity_complete: number;
  direct_material: number;
  direct_labor: number;
  machine_time_cost: number;
  tooling_cost: number;
  overhead_applied: number;
  status: "open" | "in_process" | "complete";
}

/** WIP valuation result */
export interface WIPValuationResult {
  method: WIPMethod;
  as_of: string;
  jobs: Array<{
    job_id: string;
    part_number: string;
    pct_complete: number;
    wip_value: number;
    cost_per_unit: number;
  }>;
  total_wip: number;
  total_jobs: number;
  jobs_in_process: number;
  /** Absorption: includes allocated fixed overhead. Variable: excludes fixed overhead.
   *  Throughput: material only. Reference: IMA Statement 4DD. */
  method_note: string;
  source: string;
}

/** Standard cost vs actual for variance analysis */
export interface CostRecord {
  job_id: string;
  category: "material" | "labor" | "overhead";
  standard_qty: number;
  standard_rate: number;
  actual_qty: number;
  actual_rate: number;
}

/** Variance decomposition result */
export interface VarianceResult {
  job_id: string;
  category: string;
  price_variance: number;      // (actual_rate - std_rate) × actual_qty
  quantity_variance: number;   // (actual_qty - std_qty) × std_rate
  mix_variance: number;        // interaction term
  total_variance: number;      // actual_total - std_total
  favorable: boolean;          // negative variance = favorable (under budget)
  variance_pct: number;        // total_variance / std_total × 100
  source: string;
}

/** Job cost data for EAC/ETC forecasting */
export interface JobCostData {
  job_id: string;
  budget_at_completion: number; // BAC — original budget
  actual_cost_to_date: number;  // AC — actual spent so far
  earned_value: number;         // EV — value of work completed
  pct_complete: number;         // 0-1
  remaining_work_units: number;
}

/** EAC forecasting method — Reference: PMBOK Guide 7th Ed. Section 7.4 */
export type EACMethod =
  | "budget_rate"       // EAC = AC + (BAC - EV) — assumes original budget rate for remaining
  | "current_cpi"       // EAC = BAC / CPI — assumes current cost performance continues
  | "cpi_spi"           // EAC = AC + (BAC - EV) / (CPI × SPI) — accounts for schedule
  | "bottom_up";        // EAC = AC + re-estimated ETC

/** Cost-to-complete forecast result */
export interface CostToCompleteResult {
  job_id: string;
  method: EACMethod;
  bac: number;                  // Budget at Completion
  ac: number;                   // Actual Cost
  ev: number;                   // Earned Value
  cpi: number;                  // Cost Performance Index = EV/AC
  spi: number;                  // Schedule Performance Index = EV/PV (uses pct_complete as proxy)
  eac: number;                  // Estimate at Completion
  etc: number;                  // Estimate to Complete = EAC - AC
  vac: number;                  // Variance at Completion = BAC - EAC
  tcpi: number;                 // To-Complete Performance Index = (BAC-EV)/(BAC-AC)
  on_budget: boolean;           // EAC <= BAC × 1.05 (5% tolerance)
  risk_level: "low" | "medium" | "high" | "critical";
  source: string;
}

/** Period financial data for multi-period comparison */
export interface PeriodFinancials {
  period: string;               // "2026-Q1", "2026-01", etc.
  revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

/** Multi-period comparison result */
export interface MultiPeriodResult {
  periods: PeriodFinancials[];
  trends: {
    revenue_growth_pct: number[];
    margin_trend_pct: number[];
    expense_ratio_pct: number[];
  };
  summary: {
    avg_revenue: number;
    avg_margin_pct: number;
    revenue_volatility_cv: number;
    best_period: string;
    worst_period: string;
  };
  source: string;
}

/** QuickBooks sync mapping */
export interface QBSyncResult {
  direction: "push" | "pull" | "bidirectional";
  accounts_mapped: number;
  entries_synced: number;
  conflicts: Array<{ gl_id: string; qb_id: string; field: string; gl_value: any; qb_value: any }>;
  unmapped_gl: string[];
  unmapped_qb: string[];
  sync_time_ms: number;
  source: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class AccountingHardeningEngine {
  readonly name = "AccountingHardeningEngine";

  // ── 1. Bank Reconciliation ────────────────────────────────────────────────

  /**
   * Auto-match bank statement transactions to GL cash entries.
   * Uses 3-pass matching: exact amount+date, fuzzy date±3 days, reference match.
   *
   * Reference: AICPA Audit Guide — Cash Reconciliation Procedures
   */
  bankReconciliation(params: {
    bank_transactions: BankTransaction[];
    gl_entries: GLEntry[];
    bank_ending_balance: number;
    statement_date: string;
    tolerance_days?: number;
    tolerance_amount?: number;
  }): BankReconciliationResult {
    const { bank_transactions, gl_entries, bank_ending_balance, statement_date } = params;
    const tolDays = params.tolerance_days ?? 3;
    const tolAmt = params.tolerance_amount ?? 0.01;

    const matched: ReconciliationMatch[] = [];
    const usedBankIds = new Set<string>();
    const usedGLIds = new Set<string>();

    // Pass 1: Exact match (same amount, same date)
    for (const bt of bank_transactions) {
      if (usedBankIds.has(bt.id)) continue;
      for (const gl of gl_entries) {
        if (usedGLIds.has(gl.id)) continue;
        if (Math.abs(bt.amount - gl.amount) <= tolAmt && bt.date === gl.date) {
          matched.push({ bank_txn_id: bt.id, gl_entry_id: gl.id, match_type: "exact", confidence: 1.0, amount_diff: 0 });
          usedBankIds.add(bt.id);
          usedGLIds.add(gl.id);
          break;
        }
      }
    }

    // Pass 2: Fuzzy date match (same amount, date within tolerance)
    for (const bt of bank_transactions) {
      if (usedBankIds.has(bt.id)) continue;
      const btDate = new Date(bt.date).getTime();
      for (const gl of gl_entries) {
        if (usedGLIds.has(gl.id)) continue;
        const glDate = new Date(gl.date).getTime();
        const daysDiff = Math.abs(btDate - glDate) / (1000 * 60 * 60 * 24);
        if (Math.abs(bt.amount - gl.amount) <= tolAmt && daysDiff <= tolDays) {
          const confidence = 1 - (daysDiff / (tolDays + 1)) * 0.3;
          matched.push({ bank_txn_id: bt.id, gl_entry_id: gl.id, match_type: "fuzzy", confidence, amount_diff: 0 });
          usedBankIds.add(bt.id);
          usedGLIds.add(gl.id);
          break;
        }
      }
    }

    // Pass 3: Reference match (same reference, amount within tolerance)
    for (const bt of bank_transactions) {
      if (usedBankIds.has(bt.id) || !bt.reference) continue;
      for (const gl of gl_entries) {
        if (usedGLIds.has(gl.id) || !gl.reference_id) continue;
        if (bt.reference === gl.reference_id && Math.abs(bt.amount - gl.amount) <= tolAmt * 10) {
          const amtDiff = Math.abs(bt.amount - gl.amount);
          matched.push({ bank_txn_id: bt.id, gl_entry_id: gl.id, match_type: "fuzzy", confidence: 0.8, amount_diff: amtDiff });
          usedBankIds.add(bt.id);
          usedGLIds.add(gl.id);
          break;
        }
      }
    }

    const unmatchedBank = bank_transactions.filter(bt => !usedBankIds.has(bt.id));
    const unmatchedGL = gl_entries.filter(gl => !usedGLIds.has(gl.id));

    const outstandingDeposits = unmatchedGL
      .filter(gl => gl.amount > 0)
      .reduce((sum, gl) => sum + gl.amount, 0);
    const outstandingChecks = Math.abs(unmatchedGL
      .filter(gl => gl.amount < 0)
      .reduce((sum, gl) => sum + gl.amount, 0));

    const glEndingBalance = gl_entries.reduce((sum, gl) => sum + gl.amount, 0);
    const adjustedBank = bank_ending_balance + outstandingDeposits - outstandingChecks;
    const adjustedGL = glEndingBalance;
    const diff = Math.round((adjustedBank - adjustedGL) * 100) / 100;

    return {
      statement_date,
      bank_ending_balance,
      gl_ending_balance: glEndingBalance,
      matched,
      unmatched_bank: unmatchedBank,
      unmatched_gl: unmatchedGL,
      outstanding_deposits: outstandingDeposits,
      outstanding_checks: outstandingChecks,
      adjusted_bank_balance: Math.round(adjustedBank * 100) / 100,
      adjusted_gl_balance: Math.round(adjustedGL * 100) / 100,
      reconciled: Math.abs(diff) <= tolAmt,
      difference: diff,
      match_rate_pct: bank_transactions.length > 0
        ? Math.round(matched.length / bank_transactions.length * 100 * 10) / 10
        : 100,
      source: "AICPA reconciliation — 3-pass match (exact/fuzzy-date/reference)",
    };
  }

  // ── 2. WIP Valuation ─────────────────────────────────────────────────────

  /**
   * Value work-in-process inventory using absorption, variable, or throughput costing.
   *
   * - Absorption: All manufacturing costs (direct + fixed overhead allocated)
   * - Variable: Only variable costs (direct material + direct labor + variable overhead)
   * - Throughput: Material cost only (Theory of Constraints — Goldratt)
   *
   * Reference: GAAP ASC 330-10-30, IMA Statement 4DD
   */
  wipValuation(params: {
    jobs: JobWIP[];
    method?: WIPMethod;
    overhead_rate_pct?: number;
    as_of?: string;
  }): WIPValuationResult {
    const method = params.method ?? "absorption";
    const overheadPct = params.overhead_rate_pct ?? 15;
    const asOf = params.as_of ?? new Date().toISOString().slice(0, 10);

    const jobResults = params.jobs
      .filter(j => j.status !== "complete")
      .map(j => {
        const pctComplete = j.quantity_ordered > 0
          ? j.quantity_complete / j.quantity_ordered
          : 0;

        let wipValue: number;
        switch (method) {
          case "absorption":
            // All costs including allocated fixed overhead
            wipValue = j.direct_material + j.direct_labor + j.machine_time_cost
              + j.tooling_cost + j.overhead_applied;
            break;
          case "variable":
            // Exclude fixed overhead — only variable costs
            wipValue = j.direct_material + j.direct_labor + j.machine_time_cost + j.tooling_cost;
            break;
          case "throughput":
            // Material only (Goldratt TOC method)
            wipValue = j.direct_material;
            break;
        }

        const costPerUnit = j.quantity_complete > 0
          ? Math.round(wipValue / j.quantity_complete * 100) / 100
          : 0;

        return {
          job_id: j.job_id,
          part_number: j.part_number,
          pct_complete: Math.round(pctComplete * 100 * 10) / 10,
          wip_value: Math.round(wipValue * 100) / 100,
          cost_per_unit: costPerUnit,
        };
      });

    const methodNotes: Record<WIPMethod, string> = {
      absorption: "Full absorption costing (GAAP ASC 330) — includes allocated fixed overhead",
      variable: "Variable costing — excludes fixed overhead, useful for internal CVP analysis",
      throughput: "Throughput costing (Goldratt TOC) — material only, maximizes throughput contribution",
    };

    return {
      method,
      as_of: asOf,
      jobs: jobResults,
      total_wip: Math.round(jobResults.reduce((s, j) => s + j.wip_value, 0) * 100) / 100,
      total_jobs: jobResults.length,
      jobs_in_process: params.jobs.filter(j => j.status === "in_process").length,
      method_note: methodNotes[method],
      source: "GAAP ASC 330 / IMA 4DD — WIP valuation",
    };
  }

  // ── 3. Variance Analysis ──────────────────────────────────────────────────

  /**
   * Decompose cost variances into price, quantity, and mix components.
   *
   * Price Variance  = (Actual Rate - Standard Rate) × Actual Quantity
   * Quantity Variance = (Actual Qty - Standard Qty) × Standard Rate
   * Mix Variance = Total Variance - Price Variance - Quantity Variance
   *
   * Favorable (F) = actual < standard. Unfavorable (U) = actual > standard.
   *
   * Reference: Horngren, Datar & Rajan, "Cost Accounting", Ch. 7-8
   */
  varianceAnalysis(params: {
    records: CostRecord[];
  }): {
    variances: VarianceResult[];
    summary: {
      total_favorable: number;
      total_unfavorable: number;
      net_variance: number;
      net_variance_pct: number;
      largest_variance: { job_id: string; category: string; amount: number };
    };
    source: string;
  } {
    const variances: VarianceResult[] = params.records.map(r => {
      const stdTotal = r.standard_qty * r.standard_rate;
      const actTotal = r.actual_qty * r.actual_rate;
      const totalVariance = actTotal - stdTotal;

      // Two-way decomposition
      const priceVariance = (r.actual_rate - r.standard_rate) * r.actual_qty;
      const qtyVariance = (r.actual_qty - r.standard_qty) * r.standard_rate;
      // Mix (interaction) absorbs rounding / cross-term
      const mixVariance = totalVariance - priceVariance - qtyVariance;

      const variancePct = stdTotal !== 0
        ? Math.round(totalVariance / stdTotal * 100 * 10) / 10
        : 0;

      return {
        job_id: r.job_id,
        category: r.category,
        price_variance: Math.round(priceVariance * 100) / 100,
        quantity_variance: Math.round(qtyVariance * 100) / 100,
        mix_variance: Math.round(mixVariance * 100) / 100,
        total_variance: Math.round(totalVariance * 100) / 100,
        favorable: totalVariance < 0,
        variance_pct: variancePct,
        source: "Horngren standard costing — two-way decomposition",
      };
    });

    const favorable = variances.filter(v => v.favorable).reduce((s, v) => s + v.total_variance, 0);
    const unfavorable = variances.filter(v => !v.favorable).reduce((s, v) => s + v.total_variance, 0);
    const net = Math.round((favorable + unfavorable) * 100) / 100;
    const totalStd = params.records.reduce((s, r) => s + r.standard_qty * r.standard_rate, 0);

    // Find largest absolute variance
    let largest = { job_id: "", category: "", amount: 0 };
    for (const v of variances) {
      if (Math.abs(v.total_variance) > Math.abs(largest.amount)) {
        largest = { job_id: v.job_id, category: v.category, amount: v.total_variance };
      }
    }

    return {
      variances,
      summary: {
        total_favorable: Math.round(favorable * 100) / 100,
        total_unfavorable: Math.round(unfavorable * 100) / 100,
        net_variance: net,
        net_variance_pct: totalStd !== 0 ? Math.round(net / totalStd * 100 * 10) / 10 : 0,
        largest_variance: largest,
      },
      source: "Horngren standard costing variance analysis",
    };
  }

  // ── 4. Cost-to-Complete (EAC/ETC) ─────────────────────────────────────────

  /**
   * Forecast Estimate at Completion (EAC) and Estimate to Complete (ETC).
   *
   * Four methods (PMBOK Guide 7th Ed., Section 7.4):
   *   budget_rate: EAC = AC + (BAC - EV)            — future at budget rate
   *   current_cpi: EAC = BAC / CPI                   — future at current CPI
   *   cpi_spi:     EAC = AC + (BAC - EV)/(CPI × SPI) — accounts for schedule
   *   bottom_up:   EAC = AC + manual ETC              — re-estimated remaining
   *
   * CPI = EV / AC (Cost Performance Index)
   * SPI = EV / PV (Schedule Performance Index, using pct_complete as PV proxy)
   * TCPI = (BAC - EV) / (BAC - AC) (To-Complete Performance Index)
   */
  costToComplete(params: {
    jobs: JobCostData[];
    method?: EACMethod;
    manual_etc?: Record<string, number>;  // job_id → manual ETC for bottom_up method
  }): {
    forecasts: CostToCompleteResult[];
    portfolio: {
      total_bac: number;
      total_eac: number;
      total_etc: number;
      total_vac: number;
      portfolio_cpi: number;
      at_risk_jobs: number;
    };
    source: string;
  } {
    const method = params.method ?? "current_cpi";

    const forecasts: CostToCompleteResult[] = params.jobs.map(j => {
      const bac = j.budget_at_completion;
      const ac = j.actual_cost_to_date;
      const ev = j.earned_value;

      // Guard: BAC <= 0 means no valid budget — flag as critical risk
      if (bac <= 0) {
        return {
          job_id: j.job_id, method, bac: 0, ac, ev,
          cpi: 0, spi: 0, eac: ac, etc: 0, vac: 0, tcpi: 999,
          on_budget: false, risk_level: "critical" as const,
          source: `PMBOK 7th Ed. — BAC≤0: no valid budget for ${j.job_id}`,
        };
      }

      // Guard against division by zero
      const cpi = ac > 0 ? ev / ac : 1;
      const pv = bac * j.pct_complete;  // Planned Value proxy
      const spi = pv > 0 ? ev / pv : 1;

      let eac: number;
      switch (method) {
        case "budget_rate":
          eac = ac + (bac - ev);
          break;
        case "current_cpi":
          eac = cpi > 0 ? bac / cpi : bac * 2;  // If CPI=0, assume 2x overrun
          break;
        case "cpi_spi":
          eac = (cpi * spi) > 0
            ? ac + (bac - ev) / (cpi * spi)
            : bac * 2;
          break;
        case "bottom_up":
          eac = ac + (params.manual_etc?.[j.job_id] ?? (bac - ev));
          break;
      }

      const etc = Math.max(0, eac - ac);
      const vac = bac - eac;
      const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 999;

      // Risk level based on CPI
      let risk_level: CostToCompleteResult["risk_level"];
      if (cpi >= 0.95) risk_level = "low";
      else if (cpi >= 0.85) risk_level = "medium";
      else if (cpi >= 0.70) risk_level = "high";
      else risk_level = "critical";

      return {
        job_id: j.job_id,
        method,
        bac: Math.round(bac * 100) / 100,
        ac: Math.round(ac * 100) / 100,
        ev: Math.round(ev * 100) / 100,
        cpi: Math.round(cpi * 1000) / 1000,
        spi: Math.round(spi * 1000) / 1000,
        eac: Math.round(eac * 100) / 100,
        etc: Math.round(etc * 100) / 100,
        vac: Math.round(vac * 100) / 100,
        tcpi: Math.round(Math.min(tcpi, 999) * 1000) / 1000,
        on_budget: eac <= bac * 1.05,
        risk_level,
        source: `PMBOK 7th Ed. EAC method: ${method}`,
      };
    });

    const totBac = forecasts.reduce((s, f) => s + f.bac, 0);
    const totEac = forecasts.reduce((s, f) => s + f.eac, 0);
    const totEtc = forecasts.reduce((s, f) => s + f.etc, 0);
    const totVac = forecasts.reduce((s, f) => s + f.vac, 0);
    const totAc = forecasts.reduce((s, f) => s + f.ac, 0);
    const totEv = forecasts.reduce((s, f) => s + f.ev, 0);
    const portfolioCpi = totAc > 0 ? totEv / totAc : 1;

    return {
      forecasts,
      portfolio: {
        total_bac: Math.round(totBac * 100) / 100,
        total_eac: Math.round(totEac * 100) / 100,
        total_etc: Math.round(totEtc * 100) / 100,
        total_vac: Math.round(totVac * 100) / 100,
        portfolio_cpi: Math.round(portfolioCpi * 1000) / 1000,
        at_risk_jobs: forecasts.filter(f => f.risk_level === "high" || f.risk_level === "critical").length,
      },
      source: `PMBOK 7th Ed. Earned Value Management — ${method}`,
    };
  }

  // ── 5. Multi-Period Financial Comparison ──────────────────────────────────

  /**
   * Compare financials across multiple periods with trend analysis.
   *
   * Computes: revenue growth rate, margin trend, expense ratio,
   * coefficient of variation for revenue volatility, best/worst periods.
   *
   * Reference: Financial Analysis standard practice — trend/horizontal analysis
   */
  multiPeriodCompare(params: {
    periods: PeriodFinancials[];
  }): MultiPeriodResult {
    const periods = params.periods.sort((a, b) => a.period.localeCompare(b.period));

    // Growth rates (period-over-period)
    const revenueGrowth: number[] = [];
    for (let i = 1; i < periods.length; i++) {
      const prev = periods[i - 1].revenue;
      const curr = periods[i].revenue;
      const growth = prev > 0 ? Math.round((curr - prev) / prev * 100 * 10) / 10 : 0;
      revenueGrowth.push(growth);
    }

    // Margin trend
    const marginTrend = periods.map(p =>
      p.revenue > 0 ? Math.round(p.gross_profit / p.revenue * 100 * 10) / 10 : 0
    );

    // Expense ratio
    const expenseRatio = periods.map(p =>
      p.revenue > 0 ? Math.round(p.operating_expenses / p.revenue * 100 * 10) / 10 : 0
    );

    // Summary statistics
    const revenues = periods.map(p => p.revenue);
    const avgRevenue = revenues.length > 0
      ? Math.round(revenues.reduce((s, r) => s + r, 0) / revenues.length * 100) / 100
      : 0;

    const margins = periods.map(p => p.revenue > 0 ? p.gross_profit / p.revenue * 100 : 0);
    const avgMargin = margins.length > 0
      ? Math.round(margins.reduce((s, m) => s + m, 0) / margins.length * 10) / 10
      : 0;

    // Revenue coefficient of variation (volatility measure)
    const mean = avgRevenue;
    const variance = revenues.length > 1
      ? revenues.reduce((s, r) => s + (r - mean) ** 2, 0) / (revenues.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? Math.round(stdDev / mean * 100 * 10) / 10 : 0;

    // Best/worst by net income
    let bestPeriod = periods[0]?.period ?? "";
    let worstPeriod = periods[0]?.period ?? "";
    let bestIncome = -Infinity;
    let worstIncome = Infinity;
    for (const p of periods) {
      if (p.net_income > bestIncome) { bestIncome = p.net_income; bestPeriod = p.period; }
      if (p.net_income < worstIncome) { worstIncome = p.net_income; worstPeriod = p.period; }
    }

    return {
      periods,
      trends: {
        revenue_growth_pct: revenueGrowth,
        margin_trend_pct: marginTrend,
        expense_ratio_pct: expenseRatio,
      },
      summary: {
        avg_revenue: avgRevenue,
        avg_margin_pct: avgMargin,
        revenue_volatility_cv: cv,
        best_period: bestPeriod,
        worst_period: worstPeriod,
      },
      source: "Horizontal/trend analysis — multi-period financial comparison",
    };
  }

  // ── 6. QuickBooks Online Sync Mapping ─────────────────────────────────────

  /**
   * Map PRISM GL accounts to QuickBooks Online chart of accounts.
   * Generates sync plan with conflict detection.
   *
   * QuickBooks account types: Bank, AR, OtherCurrentAsset, FixedAsset,
   * AP, OtherCurrentLiability, Equity, Income, COGS, Expense.
   *
   * Reference: QuickBooks Online API — Account Object
   */
  quickbooksSync(params: {
    direction: "push" | "pull" | "bidirectional";
    gl_accounts: Array<{ code: string; name: string; type: string; balance: number }>;
    qb_accounts?: Array<{ id: string; name: string; type: string; balance: number }>;
  }): QBSyncResult {
    const start = Date.now();
    const { gl_accounts, qb_accounts = [] } = params;

    // PRISM account type → QB account type mapping
    const typeMap: Record<string, string> = {
      asset: "OtherCurrentAsset",
      liability: "OtherCurrentLiability",
      equity: "Equity",
      revenue: "Income",
      expense: "Expense",
    };

    // Specific code-based overrides for CNC shop accounts
    const codeOverrides: Record<string, string> = {
      "1000": "Bank",
      "1100": "AccountsReceivable",
      "1500": "FixedAsset",
      "1510": "FixedAsset",
      "2000": "AccountsPayable",
      "5100": "CostOfGoodsSold",
      "5200": "CostOfGoodsSold",
      "5300": "CostOfGoodsSold",
    };

    // Match GL → QB by name similarity
    const mapped: Array<{ gl_code: string; qb_id: string }> = [];
    const unmappedGL: string[] = [];
    const unmappedQB: string[] = [];
    const conflicts: QBSyncResult["conflicts"] = [];

    for (const gl of gl_accounts) {
      const qbType = codeOverrides[gl.code] ?? typeMap[gl.type] ?? "Expense";
      const qbMatch = qb_accounts.find(qb =>
        qb.name.toLowerCase() === gl.name.toLowerCase() ||
        qb.type === qbType && qb.name.toLowerCase().includes(gl.name.toLowerCase().split(" ")[0])
      );

      if (qbMatch) {
        mapped.push({ gl_code: gl.code, qb_id: qbMatch.id });

        // Check for balance conflicts
        if (Math.abs(gl.balance - qbMatch.balance) > 0.01) {
          conflicts.push({
            gl_id: gl.code, qb_id: qbMatch.id, field: "balance",
            gl_value: gl.balance, qb_value: qbMatch.balance,
          });
        }
      } else {
        unmappedGL.push(gl.code);
      }
    }

    // QB accounts not matched to any GL
    const mappedQBIds = new Set(mapped.map(m => m.qb_id));
    for (const qb of qb_accounts) {
      if (!mappedQBIds.has(qb.id)) unmappedQB.push(qb.id);
    }

    return {
      direction: params.direction,
      accounts_mapped: mapped.length,
      entries_synced: 0,  // Actual sync would happen via QB API
      conflicts,
      unmapped_gl: unmappedGL,
      unmapped_qb: unmappedQB,
      sync_time_ms: Date.now() - start,
      source: "QuickBooks Online API mapping — account type + name match",
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const accountingHardeningEngine = new AccountingHardeningEngine();
export { AccountingHardeningEngine };
