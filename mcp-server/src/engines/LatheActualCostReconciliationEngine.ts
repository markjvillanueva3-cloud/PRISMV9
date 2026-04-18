/**
 * LatheActualCostReconciliationEngine — Actual Cost vs Quote Reconciliation
 *
 * U-LTH49: After job completes, reconciles actual cost against quote
 * Surfaces variance to feed tuning → improves next quote accuracy
 *
 * Uses:
 * - ActualCostEngine patterns
 * - JobCostingEngine patterns
 * - CostSavingsTrackerEngine patterns
 *
 * @module engines/LatheActualCostReconciliationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface JobActuals {
  job_id: string;
  quote_id: string;
  part_number: string;
  customer: string;
  quantity_ordered: number;
  quantity_produced: number;
  quantity_scrapped: number;
  actual_material_cost: number;
  actual_tool_cost: number;
  actual_labor_hours: number;
  labor_rate: number;
  actual_setup_hours: number;
  actual_machine_hours: number;
  machine_rate: number;
  actual_overhead: number;
  actual_cycle_time_sec: number;
  completion_date: string;
  operator_id?: string;
  notes?: string;
}

export interface QuotedCosts {
  quote_id: string;
  material_cost: number;
  tool_wear_cost: number;
  cycle_time_cost: number;
  setup_cost: number;
  overhead: number;
  margin: number;
  total_per_part: number;
  unit_price: number;
  total_price: number;
  quantity: number;
}

export interface VarianceBreakdown {
  material_variance: number;
  material_variance_pct: number;
  tool_variance: number;
  tool_variance_pct: number;
  labor_variance: number;
  labor_variance_pct: number;
  setup_variance: number;
  setup_variance_pct: number;
  machine_variance: number;
  machine_variance_pct: number;
  overhead_variance: number;
  overhead_variance_pct: number;
  cycle_time_variance_sec: number;
  cycle_time_variance_pct: number;
}

export interface ReconciliationResult {
  reconciliation_id: string;
  job_id: string;
  quote_id: string;
  timestamp: string;
  actual_total_cost: number;
  quoted_total_cost: number;
  total_variance: number;
  total_variance_pct: number;
  variance_breakdown: VarianceBreakdown;
  profit_actual: number;
  profit_quoted: number;
  profit_variance: number;
  profit_margin_actual_pct: number;
  profit_margin_quoted_pct: number;
  scrap_rate_pct: number;
  efficiency_rating: number;
  recommendations: string[];
  tuning_adjustments: TuningAdjustment[];
  status: "profitable" | "break_even" | "loss";
}

export interface TuningAdjustment {
  parameter: string;
  current_value: number;
  suggested_value: number;
  reason: string;
  confidence: number;
}

export interface ReconciliationHistory {
  part_number: string;
  reconciliations: Array<{
    job_id: string;
    timestamp: string;
    variance_pct: number;
  }>;
  average_variance_pct: number;
  trend: "improving" | "stable" | "degrading";
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheActualCostReconciliationEngine {
  private reconciliationCounter = 0;
  private history: Map<string, ReconciliationHistory> = new Map();

  reconcile(actuals: JobActuals, quoted: QuotedCosts): ReconciliationResult {
    const reconciliationId = this.generateReconciliationId(actuals);
    const timestamp = new Date().toISOString();

    const actualTotalCost = this.calculateActualTotalCost(actuals);
    const quotedTotalCost = quoted.total_per_part * actuals.quantity_produced;

    const totalVariance = actualTotalCost - quotedTotalCost;
    const totalVariancePct = quotedTotalCost > 0
      ? (totalVariance / quotedTotalCost) * 100
      : 0;

    const varianceBreakdown = this.calculateVarianceBreakdown(actuals, quoted);

    const revenue = quoted.unit_price * actuals.quantity_produced;
    const profitActual = revenue - actualTotalCost;
    const profitQuoted = revenue - quotedTotalCost;
    const profitVariance = profitActual - profitQuoted;

    const profitMarginActualPct = revenue > 0 ? (profitActual / revenue) * 100 : 0;
    const profitMarginQuotedPct = revenue > 0 ? (profitQuoted / revenue) * 100 : 0;

    const scrapRatePct = actuals.quantity_ordered > 0
      ? (actuals.quantity_scrapped / actuals.quantity_ordered) * 100
      : 0;

    const efficiencyRating = this.calculateEfficiencyRating(actuals, quoted);

    const recommendations = this.generateRecommendations(
      varianceBreakdown,
      scrapRatePct,
      efficiencyRating
    );

    const tuningAdjustments = this.generateTuningAdjustments(varianceBreakdown, actuals);

    let status: "profitable" | "break_even" | "loss";
    if (profitActual > revenue * 0.05) {
      status = "profitable";
    } else if (profitActual >= 0) {
      status = "break_even";
    } else {
      status = "loss";
    }

    this.updateHistory(actuals.part_number, actuals.job_id, timestamp, totalVariancePct);

    return {
      reconciliation_id: reconciliationId,
      job_id: actuals.job_id,
      quote_id: actuals.quote_id,
      timestamp,
      actual_total_cost: Math.round(actualTotalCost * 100) / 100,
      quoted_total_cost: Math.round(quotedTotalCost * 100) / 100,
      total_variance: Math.round(totalVariance * 100) / 100,
      total_variance_pct: Math.round(totalVariancePct * 10) / 10,
      variance_breakdown: varianceBreakdown,
      profit_actual: Math.round(profitActual * 100) / 100,
      profit_quoted: Math.round(profitQuoted * 100) / 100,
      profit_variance: Math.round(profitVariance * 100) / 100,
      profit_margin_actual_pct: Math.round(profitMarginActualPct * 10) / 10,
      profit_margin_quoted_pct: Math.round(profitMarginQuotedPct * 10) / 10,
      scrap_rate_pct: Math.round(scrapRatePct * 10) / 10,
      efficiency_rating: Math.round(efficiencyRating * 100) / 100,
      recommendations,
      tuning_adjustments: tuningAdjustments,
      status,
    };
  }

  private calculateActualTotalCost(actuals: JobActuals): number {
    const laborCost = actuals.actual_labor_hours * actuals.labor_rate;
    const machineCost = actuals.actual_machine_hours * actuals.machine_rate;
    const setupCost = actuals.actual_setup_hours * actuals.labor_rate;

    return (
      actuals.actual_material_cost +
      actuals.actual_tool_cost +
      laborCost +
      machineCost +
      setupCost +
      actuals.actual_overhead
    );
  }

  private calculateVarianceBreakdown(
    actuals: JobActuals,
    quoted: QuotedCosts
  ): VarianceBreakdown {
    const quotedMaterial = quoted.material_cost * actuals.quantity_produced;
    const materialVariance = actuals.actual_material_cost - quotedMaterial;
    const materialVariancePct = quotedMaterial > 0
      ? (materialVariance / quotedMaterial) * 100
      : 0;

    const quotedTool = quoted.tool_wear_cost * actuals.quantity_produced;
    const toolVariance = actuals.actual_tool_cost - quotedTool;
    const toolVariancePct = quotedTool > 0 ? (toolVariance / quotedTool) * 100 : 0;

    const actualLaborCost = actuals.actual_labor_hours * actuals.labor_rate;
    const quotedLabor = quoted.cycle_time_cost * actuals.quantity_produced * 0.4;
    const laborVariance = actualLaborCost - quotedLabor;
    const laborVariancePct = quotedLabor > 0 ? (laborVariance / quotedLabor) * 100 : 0;

    const actualSetupCost = actuals.actual_setup_hours * actuals.labor_rate;
    const quotedSetup = quoted.setup_cost;
    const setupVariance = actualSetupCost - quotedSetup;
    const setupVariancePct = quotedSetup > 0 ? (setupVariance / quotedSetup) * 100 : 0;

    const actualMachineCost = actuals.actual_machine_hours * actuals.machine_rate;
    const quotedMachine = quoted.cycle_time_cost * actuals.quantity_produced * 0.6;
    const machineVariance = actualMachineCost - quotedMachine;
    const machineVariancePct = quotedMachine > 0
      ? (machineVariance / quotedMachine) * 100
      : 0;

    const quotedOverhead = quoted.overhead * actuals.quantity_produced;
    const overheadVariance = actuals.actual_overhead - quotedOverhead;
    const overheadVariancePct = quotedOverhead > 0
      ? (overheadVariance / quotedOverhead) * 100
      : 0;

    const quotedCycleTime = (quoted.cycle_time_cost / 85) * 3600;
    const cycleTimeVariance = actuals.actual_cycle_time_sec - quotedCycleTime;
    const cycleTimeVariancePct = quotedCycleTime > 0
      ? (cycleTimeVariance / quotedCycleTime) * 100
      : 0;

    return {
      material_variance: Math.round(materialVariance * 100) / 100,
      material_variance_pct: Math.round(materialVariancePct * 10) / 10,
      tool_variance: Math.round(toolVariance * 100) / 100,
      tool_variance_pct: Math.round(toolVariancePct * 10) / 10,
      labor_variance: Math.round(laborVariance * 100) / 100,
      labor_variance_pct: Math.round(laborVariancePct * 10) / 10,
      setup_variance: Math.round(setupVariance * 100) / 100,
      setup_variance_pct: Math.round(setupVariancePct * 10) / 10,
      machine_variance: Math.round(machineVariance * 100) / 100,
      machine_variance_pct: Math.round(machineVariancePct * 10) / 10,
      overhead_variance: Math.round(overheadVariance * 100) / 100,
      overhead_variance_pct: Math.round(overheadVariancePct * 10) / 10,
      cycle_time_variance_sec: Math.round(cycleTimeVariance),
      cycle_time_variance_pct: Math.round(cycleTimeVariancePct * 10) / 10,
    };
  }

  private calculateEfficiencyRating(actuals: JobActuals, quoted: QuotedCosts): number {
    const quotedCycleTime = (quoted.cycle_time_cost / 85) * 3600;
    const cycleEfficiency = quotedCycleTime > 0
      ? Math.min(1, quotedCycleTime / actuals.actual_cycle_time_sec)
      : 1;

    const yieldRate = actuals.quantity_ordered > 0
      ? actuals.quantity_produced / actuals.quantity_ordered
      : 1;

    const quotedTotal = quoted.total_per_part * actuals.quantity_produced;
    const actualTotal = this.calculateActualTotalCost(actuals);
    const costEfficiency = actualTotal > 0 ? Math.min(1, quotedTotal / actualTotal) : 1;

    return (cycleEfficiency * 0.4 + yieldRate * 0.3 + costEfficiency * 0.3);
  }

  private generateRecommendations(
    variance: VarianceBreakdown,
    scrapRate: number,
    efficiency: number
  ): string[] {
    const recs: string[] = [];

    if (variance.material_variance_pct > 15) {
      recs.push("Review material utilization - actual cost significantly above quoted");
    }
    if (variance.tool_variance_pct > 20) {
      recs.push("Investigate tool consumption - consider tool life analysis");
    }
    if (variance.setup_variance_pct > 25) {
      recs.push("Setup time exceeded estimate - document improvements for future jobs");
    }
    if (variance.cycle_time_variance_pct > 15) {
      recs.push("Cycle time higher than quoted - review feeds/speeds or tool selection");
    }
    if (scrapRate > 5) {
      recs.push(`Scrap rate ${scrapRate.toFixed(1)}% - root cause analysis recommended`);
    }
    if (efficiency < 0.8) {
      recs.push("Overall efficiency below 80% - consider process review");
    }
    if (variance.labor_variance_pct > 20) {
      recs.push("Labor costs exceeded estimate - review operator efficiency or job complexity");
    }

    if (recs.length === 0) {
      recs.push("Job performed within expected parameters - no action required");
    }

    return recs;
  }

  private generateTuningAdjustments(
    variance: VarianceBreakdown,
    actuals: JobActuals
  ): TuningAdjustment[] {
    const adjustments: TuningAdjustment[] = [];

    if (Math.abs(variance.material_variance_pct) > 10) {
      const factor = 1 + variance.material_variance_pct / 200;
      adjustments.push({
        parameter: "material_rate_multiplier",
        current_value: 1.0,
        suggested_value: Math.round(factor * 100) / 100,
        reason: `Material variance ${variance.material_variance_pct.toFixed(1)}%`,
        confidence: Math.min(0.9, 0.5 + actuals.quantity_produced / 100),
      });
    }

    if (Math.abs(variance.cycle_time_variance_pct) > 10) {
      const factor = 1 + variance.cycle_time_variance_pct / 200;
      adjustments.push({
        parameter: "cycle_time_multiplier",
        current_value: 1.0,
        suggested_value: Math.round(factor * 100) / 100,
        reason: `Cycle time variance ${variance.cycle_time_variance_pct.toFixed(1)}%`,
        confidence: Math.min(0.9, 0.5 + actuals.quantity_produced / 100),
      });
    }

    if (Math.abs(variance.setup_variance_pct) > 15) {
      const factor = 1 + variance.setup_variance_pct / 200;
      adjustments.push({
        parameter: "setup_time_multiplier",
        current_value: 1.0,
        suggested_value: Math.round(factor * 100) / 100,
        reason: `Setup variance ${variance.setup_variance_pct.toFixed(1)}%`,
        confidence: Math.min(0.8, 0.4 + actuals.quantity_produced / 50),
      });
    }

    if (Math.abs(variance.tool_variance_pct) > 15) {
      const factor = 1 + variance.tool_variance_pct / 200;
      adjustments.push({
        parameter: "tool_wear_multiplier",
        current_value: 1.0,
        suggested_value: Math.round(factor * 100) / 100,
        reason: `Tool cost variance ${variance.tool_variance_pct.toFixed(1)}%`,
        confidence: Math.min(0.85, 0.45 + actuals.quantity_produced / 80),
      });
    }

    return adjustments;
  }

  private updateHistory(
    partNumber: string,
    jobId: string,
    timestamp: string,
    variancePct: number
  ): void {
    let history = this.history.get(partNumber);
    if (!history) {
      history = {
        part_number: partNumber,
        reconciliations: [],
        average_variance_pct: 0,
        trend: "stable",
      };
      this.history.set(partNumber, history);
    }

    history.reconciliations.push({
      job_id: jobId,
      timestamp,
      variance_pct: variancePct,
    });

    if (history.reconciliations.length > 20) {
      history.reconciliations = history.reconciliations.slice(-20);
    }

    const sum = history.reconciliations.reduce((acc, r) => acc + r.variance_pct, 0);
    history.average_variance_pct = sum / history.reconciliations.length;

    if (history.reconciliations.length >= 3) {
      const recent = history.reconciliations.slice(-3);
      const older = history.reconciliations.slice(-6, -3);
      if (older.length >= 3) {
        const recentAvg = recent.reduce((a, r) => a + Math.abs(r.variance_pct), 0) / 3;
        const olderAvg = older.reduce((a, r) => a + Math.abs(r.variance_pct), 0) / 3;
        if (recentAvg < olderAvg * 0.8) {
          history.trend = "improving";
        } else if (recentAvg > olderAvg * 1.2) {
          history.trend = "degrading";
        } else {
          history.trend = "stable";
        }
      }
    }
  }

  getPartHistory(partNumber: string): ReconciliationHistory | null {
    return this.history.get(partNumber) || null;
  }

  getAllHistory(): ReconciliationHistory[] {
    return Array.from(this.history.values());
  }

  clearHistory(): void {
    this.history.clear();
  }

  private generateReconciliationId(actuals: JobActuals): string {
    this.reconciliationCounter++;
    const timestamp = Date.now().toString(36);
    return `REC-${actuals.job_id}-${timestamp}-${this.reconciliationCounter.toString().padStart(4, "0")}`;
  }
}

export const latheActualCostReconciliationEngine = new LatheActualCostReconciliationEngine();
