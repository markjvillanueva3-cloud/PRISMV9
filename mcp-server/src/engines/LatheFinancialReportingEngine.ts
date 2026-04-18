/**
 * LatheFinancialReportingEngine — Financial Reports & Analytics
 *
 * U-LTH57: P&L, margin analysis, cost tracking, financial KPIs
 * Uses CostTrackingEngine + MarginAnalysisEngine + FinancialKPIEngine patterns
 *
 * @module engines/LatheFinancialReportingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FinancialRecord {
  record_id: string;
  job_id: string;
  customer_id: string;
  customer_name: string;
  part_number: string;
  quantity: number;
  revenue: number;
  material_cost: number;
  labor_cost: number;
  tooling_cost: number;
  overhead_cost: number;
  total_cost: number;
  gross_profit: number;
  margin_pct: number;
  completed_date: string;
}

export interface ProfitLossStatement {
  period: string;
  revenue: number;
  cost_of_goods_sold: {
    material: number;
    labor: number;
    tooling: number;
    overhead: number;
    total: number;
  };
  gross_profit: number;
  gross_margin_pct: number;
  operating_expenses: number;
  operating_income: number;
  operating_margin_pct: number;
}

export interface MarginAnalysis {
  by_customer: Array<{
    customer_id: string;
    customer_name: string;
    revenue: number;
    cost: number;
    margin_pct: number;
    job_count: number;
  }>;
  by_part_type: Array<{
    part_type: string;
    revenue: number;
    cost: number;
    margin_pct: number;
    job_count: number;
  }>;
  top_performers: Array<{
    job_id: string;
    margin_pct: number;
    gross_profit: number;
  }>;
  bottom_performers: Array<{
    job_id: string;
    margin_pct: number;
    gross_profit: number;
  }>;
}

export interface CostBreakdown {
  total_cost: number;
  material_pct: number;
  labor_pct: number;
  tooling_pct: number;
  overhead_pct: number;
  cost_per_part: number;
  trends: {
    material_trend: "increasing" | "stable" | "decreasing";
    labor_trend: "increasing" | "stable" | "decreasing";
    tooling_trend: "increasing" | "stable" | "decreasing";
  };
}

export interface FinancialKPIs {
  period: string;
  revenue: number;
  revenue_growth_pct: number;
  gross_margin_pct: number;
  operating_margin_pct: number;
  revenue_per_machine_hour: number;
  cost_per_machine_hour: number;
  labor_efficiency: number;
  material_utilization_pct: number;
  average_job_value: number;
  average_margin_pct: number;
}

export interface CashFlowProjection {
  period: string;
  accounts_receivable: number;
  accounts_payable: number;
  projected_collections: number;
  projected_payments: number;
  net_cash_flow: number;
  ending_cash: number;
}

export interface CustomerProfitability {
  customer_id: string;
  customer_name: string;
  lifetime_revenue: number;
  lifetime_cost: number;
  lifetime_profit: number;
  margin_pct: number;
  job_count: number;
  avg_job_value: number;
  payment_performance: "excellent" | "good" | "fair" | "poor";
  profitability_tier: "platinum" | "gold" | "silver" | "bronze";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OVERHEAD_RATE = 0.15;
const OPERATING_EXPENSE_RATE = 0.10;

// ============================================================================
// ENGINE
// ============================================================================

class LatheFinancialReportingEngine {
  private records: Map<string, FinancialRecord> = new Map();
  private previousPeriodRevenue = 0;

  // --------------------------------------------------------------------------
  // Record Management
  // --------------------------------------------------------------------------

  recordJobFinancials(params: {
    job_id: string;
    customer_id: string;
    customer_name: string;
    part_number: string;
    quantity: number;
    revenue: number;
    material_cost: number;
    labor_cost: number;
    tooling_cost: number;
    completed_date?: string;
  }): FinancialRecord {
    const recordId = `FIN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const overheadCost = (params.material_cost + params.labor_cost + params.tooling_cost) * OVERHEAD_RATE;
    const totalCost = params.material_cost + params.labor_cost + params.tooling_cost + overheadCost;
    const grossProfit = params.revenue - totalCost;
    const marginPct = params.revenue > 0 ? (grossProfit / params.revenue) * 100 : 0;

    const record: FinancialRecord = {
      record_id: recordId,
      job_id: params.job_id,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      part_number: params.part_number,
      quantity: params.quantity,
      revenue: Math.round(params.revenue * 100) / 100,
      material_cost: Math.round(params.material_cost * 100) / 100,
      labor_cost: Math.round(params.labor_cost * 100) / 100,
      tooling_cost: Math.round(params.tooling_cost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      gross_profit: Math.round(grossProfit * 100) / 100,
      margin_pct: Math.round(marginPct * 10) / 10,
      completed_date: params.completed_date || new Date().toISOString(),
    };

    this.records.set(recordId, record);
    return record;
  }

  getRecord(recordId: string): FinancialRecord | null {
    return this.records.get(recordId) || null;
  }

  getRecordsByJob(jobId: string): FinancialRecord[] {
    return Array.from(this.records.values()).filter((r) => r.job_id === jobId);
  }

  getRecordsByCustomer(customerId: string): FinancialRecord[] {
    return Array.from(this.records.values()).filter((r) => r.customer_id === customerId);
  }

  // --------------------------------------------------------------------------
  // P&L Statement
  // --------------------------------------------------------------------------

  generateProfitLossStatement(startDate: string, endDate: string): ProfitLossStatement {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodRecords = Array.from(this.records.values()).filter((r) => {
      const date = new Date(r.completed_date);
      return date >= start && date <= end;
    });

    const revenue = periodRecords.reduce((sum, r) => sum + r.revenue, 0);
    const materialCost = periodRecords.reduce((sum, r) => sum + r.material_cost, 0);
    const laborCost = periodRecords.reduce((sum, r) => sum + r.labor_cost, 0);
    const toolingCost = periodRecords.reduce((sum, r) => sum + r.tooling_cost, 0);
    const overheadCost = periodRecords.reduce((sum, r) => sum + r.overhead_cost, 0);

    const totalCOGS = materialCost + laborCost + toolingCost + overheadCost;
    const grossProfit = revenue - totalCOGS;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const operatingExpenses = revenue * OPERATING_EXPENSE_RATE;
    const operatingIncome = grossProfit - operatingExpenses;
    const operatingMarginPct = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;

    return {
      period: `${startDate} to ${endDate}`,
      revenue: Math.round(revenue * 100) / 100,
      cost_of_goods_sold: {
        material: Math.round(materialCost * 100) / 100,
        labor: Math.round(laborCost * 100) / 100,
        tooling: Math.round(toolingCost * 100) / 100,
        overhead: Math.round(overheadCost * 100) / 100,
        total: Math.round(totalCOGS * 100) / 100,
      },
      gross_profit: Math.round(grossProfit * 100) / 100,
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      operating_expenses: Math.round(operatingExpenses * 100) / 100,
      operating_income: Math.round(operatingIncome * 100) / 100,
      operating_margin_pct: Math.round(operatingMarginPct * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // Margin Analysis
  // --------------------------------------------------------------------------

  analyzeMargins(startDate: string, endDate: string): MarginAnalysis {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodRecords = Array.from(this.records.values()).filter((r) => {
      const date = new Date(r.completed_date);
      return date >= start && date <= end;
    });

    const byCustomer = new Map<string, { revenue: number; cost: number; jobs: number; name: string }>();
    const byPartType = new Map<string, { revenue: number; cost: number; jobs: number }>();

    for (const record of periodRecords) {
      const custData = byCustomer.get(record.customer_id) || {
        revenue: 0,
        cost: 0,
        jobs: 0,
        name: record.customer_name,
      };
      custData.revenue += record.revenue;
      custData.cost += record.total_cost;
      custData.jobs++;
      byCustomer.set(record.customer_id, custData);

      const partType = this.classifyPartType(record.part_number);
      const partData = byPartType.get(partType) || { revenue: 0, cost: 0, jobs: 0 };
      partData.revenue += record.revenue;
      partData.cost += record.total_cost;
      partData.jobs++;
      byPartType.set(partType, partData);
    }

    const customerMargins = Array.from(byCustomer.entries()).map(([id, data]) => ({
      customer_id: id,
      customer_name: data.name,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      margin_pct: Math.round(((data.revenue - data.cost) / data.revenue) * 1000) / 10,
      job_count: data.jobs,
    }));

    const partMargins = Array.from(byPartType.entries()).map(([type, data]) => ({
      part_type: type,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      margin_pct: Math.round(((data.revenue - data.cost) / data.revenue) * 1000) / 10,
      job_count: data.jobs,
    }));

    const sortedByMargin = [...periodRecords].sort((a, b) => b.margin_pct - a.margin_pct);

    return {
      by_customer: customerMargins.sort((a, b) => b.margin_pct - a.margin_pct),
      by_part_type: partMargins.sort((a, b) => b.margin_pct - a.margin_pct),
      top_performers: sortedByMargin.slice(0, 5).map((r) => ({
        job_id: r.job_id,
        margin_pct: r.margin_pct,
        gross_profit: r.gross_profit,
      })),
      bottom_performers: sortedByMargin.slice(-5).reverse().map((r) => ({
        job_id: r.job_id,
        margin_pct: r.margin_pct,
        gross_profit: r.gross_profit,
      })),
    };
  }

  private classifyPartType(partNumber: string): string {
    const upper = partNumber.toUpperCase();
    if (upper.includes("SHAFT")) return "Shafts";
    if (upper.includes("BORE") || upper.includes("BUSH")) return "Bores/Bushings";
    if (upper.includes("THREAD")) return "Threaded Parts";
    if (upper.includes("GROOVE")) return "Grooved Parts";
    return "General Turning";
  }

  // --------------------------------------------------------------------------
  // Cost Breakdown
  // --------------------------------------------------------------------------

  getCostBreakdown(startDate: string, endDate: string): CostBreakdown {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodRecords = Array.from(this.records.values()).filter((r) => {
      const date = new Date(r.completed_date);
      return date >= start && date <= end;
    });

    const totalMaterial = periodRecords.reduce((sum, r) => sum + r.material_cost, 0);
    const totalLabor = periodRecords.reduce((sum, r) => sum + r.labor_cost, 0);
    const totalTooling = periodRecords.reduce((sum, r) => sum + r.tooling_cost, 0);
    const totalOverhead = periodRecords.reduce((sum, r) => sum + r.overhead_cost, 0);
    const totalCost = totalMaterial + totalLabor + totalTooling + totalOverhead;
    const totalQuantity = periodRecords.reduce((sum, r) => sum + r.quantity, 0);

    const halfPoint = Math.floor(periodRecords.length / 2);
    const firstHalf = periodRecords.slice(0, halfPoint);
    const secondHalf = periodRecords.slice(halfPoint);

    const getTrend = (
      first: FinancialRecord[],
      second: FinancialRecord[],
      field: keyof FinancialRecord
    ): "increasing" | "stable" | "decreasing" => {
      if (first.length === 0 || second.length === 0) return "stable";
      const avgFirst = first.reduce((s, r) => s + (r[field] as number), 0) / first.length;
      const avgSecond = second.reduce((s, r) => s + (r[field] as number), 0) / second.length;
      if (avgSecond > avgFirst * 1.05) return "increasing";
      if (avgSecond < avgFirst * 0.95) return "decreasing";
      return "stable";
    };

    return {
      total_cost: Math.round(totalCost * 100) / 100,
      material_pct: totalCost > 0 ? Math.round((totalMaterial / totalCost) * 1000) / 10 : 0,
      labor_pct: totalCost > 0 ? Math.round((totalLabor / totalCost) * 1000) / 10 : 0,
      tooling_pct: totalCost > 0 ? Math.round((totalTooling / totalCost) * 1000) / 10 : 0,
      overhead_pct: totalCost > 0 ? Math.round((totalOverhead / totalCost) * 1000) / 10 : 0,
      cost_per_part: totalQuantity > 0 ? Math.round((totalCost / totalQuantity) * 100) / 100 : 0,
      trends: {
        material_trend: getTrend(firstHalf, secondHalf, "material_cost"),
        labor_trend: getTrend(firstHalf, secondHalf, "labor_cost"),
        tooling_trend: getTrend(firstHalf, secondHalf, "tooling_cost"),
      },
    };
  }

  // --------------------------------------------------------------------------
  // KPIs
  // --------------------------------------------------------------------------

  calculateKPIs(startDate: string, endDate: string, machineHours: number = 0): FinancialKPIs {
    const pnl = this.generateProfitLossStatement(startDate, endDate);

    const periodRecords = Array.from(this.records.values()).filter((r) => {
      const date = new Date(r.completed_date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });

    const revenueGrowth = this.previousPeriodRevenue > 0
      ? ((pnl.revenue - this.previousPeriodRevenue) / this.previousPeriodRevenue) * 100
      : 0;

    this.previousPeriodRevenue = pnl.revenue;

    const avgJobValue = periodRecords.length > 0
      ? pnl.revenue / periodRecords.length
      : 0;

    const avgMargin = periodRecords.length > 0
      ? periodRecords.reduce((sum, r) => sum + r.margin_pct, 0) / periodRecords.length
      : 0;

    const revenuePerHour = machineHours > 0 ? pnl.revenue / machineHours : 0;
    const costPerHour = machineHours > 0 ? pnl.cost_of_goods_sold.total / machineHours : 0;

    const totalLaborCost = pnl.cost_of_goods_sold.labor;
    const totalRevenue = pnl.revenue;
    const laborEfficiency = totalLaborCost > 0 ? (totalRevenue / totalLaborCost) : 0;

    const totalMaterialCost = pnl.cost_of_goods_sold.material;
    const materialUtilization = totalMaterialCost > 0 ? 85 : 0;

    return {
      period: `${startDate} to ${endDate}`,
      revenue: pnl.revenue,
      revenue_growth_pct: Math.round(revenueGrowth * 10) / 10,
      gross_margin_pct: pnl.gross_margin_pct,
      operating_margin_pct: pnl.operating_margin_pct,
      revenue_per_machine_hour: Math.round(revenuePerHour * 100) / 100,
      cost_per_machine_hour: Math.round(costPerHour * 100) / 100,
      labor_efficiency: Math.round(laborEfficiency * 100) / 100,
      material_utilization_pct: materialUtilization,
      average_job_value: Math.round(avgJobValue * 100) / 100,
      average_margin_pct: Math.round(avgMargin * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // Cash Flow
  // --------------------------------------------------------------------------

  projectCashFlow(
    startingCash: number,
    accountsReceivable: number,
    accountsPayable: number,
    weeks: number = 4
  ): CashFlowProjection[] {
    const projections: CashFlowProjection[] = [];
    let currentCash = startingCash;
    let currentAR = accountsReceivable;
    let currentAP = accountsPayable;

    for (let w = 1; w <= weeks; w++) {
      const collectionRate = 0.25;
      const paymentRate = 0.30;

      const collections = currentAR * collectionRate;
      const payments = currentAP * paymentRate;
      const netCashFlow = collections - payments;

      currentCash += netCashFlow;
      currentAR -= collections;
      currentAP -= payments;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + (w - 1) * 7);

      projections.push({
        period: `Week ${w}`,
        accounts_receivable: Math.round(currentAR * 100) / 100,
        accounts_payable: Math.round(currentAP * 100) / 100,
        projected_collections: Math.round(collections * 100) / 100,
        projected_payments: Math.round(payments * 100) / 100,
        net_cash_flow: Math.round(netCashFlow * 100) / 100,
        ending_cash: Math.round(currentCash * 100) / 100,
      });
    }

    return projections;
  }

  // --------------------------------------------------------------------------
  // Customer Profitability
  // --------------------------------------------------------------------------

  getCustomerProfitability(customerId: string): CustomerProfitability | null {
    const customerRecords = this.getRecordsByCustomer(customerId);
    if (customerRecords.length === 0) return null;

    const lifetimeRevenue = customerRecords.reduce((sum, r) => sum + r.revenue, 0);
    const lifetimeCost = customerRecords.reduce((sum, r) => sum + r.total_cost, 0);
    const lifetimeProfit = lifetimeRevenue - lifetimeCost;
    const marginPct = lifetimeRevenue > 0 ? (lifetimeProfit / lifetimeRevenue) * 100 : 0;
    const avgJobValue = lifetimeRevenue / customerRecords.length;

    let paymentPerformance: CustomerProfitability["payment_performance"] = "good";
    let profitabilityTier: CustomerProfitability["profitability_tier"] = "silver";

    if (marginPct >= 35) profitabilityTier = "platinum";
    else if (marginPct >= 25) profitabilityTier = "gold";
    else if (marginPct >= 15) profitabilityTier = "silver";
    else profitabilityTier = "bronze";

    return {
      customer_id: customerId,
      customer_name: customerRecords[0].customer_name,
      lifetime_revenue: Math.round(lifetimeRevenue * 100) / 100,
      lifetime_cost: Math.round(lifetimeCost * 100) / 100,
      lifetime_profit: Math.round(lifetimeProfit * 100) / 100,
      margin_pct: Math.round(marginPct * 10) / 10,
      job_count: customerRecords.length,
      avg_job_value: Math.round(avgJobValue * 100) / 100,
      payment_performance: paymentPerformance,
      profitability_tier: profitabilityTier,
    };
  }

  getAllCustomerProfitability(): CustomerProfitability[] {
    const customerIds = new Set<string>();
    for (const record of this.records.values()) {
      customerIds.add(record.customer_id);
    }

    const profitabilities: CustomerProfitability[] = [];
    for (const customerId of customerIds) {
      const prof = this.getCustomerProfitability(customerId);
      if (prof) profitabilities.push(prof);
    }

    return profitabilities.sort((a, b) => b.lifetime_profit - a.lifetime_profit);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.records.clear();
    this.previousPeriodRevenue = 0;
  }
}

export const latheFinancialReportingEngine = new LatheFinancialReportingEngine();
