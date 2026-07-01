/**
 * PRISM MCP Server — Reporting Engine
 *
 * Production reporting: KPI dashboards, production/quality/financial reports,
 * Pareto analysis, OEE calculation, trend analysis.
 *
 * Ported from PRISM_REPORTING_ENGINE.js (monolith R2.3.1).
 *
 * @module ReportingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProductionRecord {
  date: string;
  partNumber: string;
  quantity: number;
  machine?: string;
  operator?: string;
  cycleTime?: number;   // minutes per part
  setupTime?: number;   // minutes
  scrapCount?: number;
  downtime?: number;    // minutes
}

export interface QualityRecord {
  date: string;
  partNumber: string;
  inspected: number;
  passed: number;
  failed: number;
  defectType?: string;
  reworked?: number;
}

export interface FinancialRecord {
  date: string;
  category: string;       // material, labor, overhead, tooling
  amount: number;
  jobId?: string;
  description?: string;
}

export interface KPIDashboard {
  period: string;
  production: {
    totalParts: number;
    totalSetupMinutes: number;
    totalRunMinutes: number;
    totalDowntimeMinutes: number;
    partsPerHour: number;
    utilizationPct: number;
  };
  quality: {
    totalInspected: number;
    totalPassed: number;
    totalFailed: number;
    yieldPct: number;
    scrapPct: number;
    reworkPct: number;
  };
  oee: {
    availability: number;
    performance: number;
    quality: number;
    overall: number;
  };
}

export interface ParetoItem {
  category: string;
  count: number;
  cumulative: number;
  cumulativePct: number;
}

export interface TrendPoint {
  period: string;
  value: number;
  movingAverage?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class ReportingEngineImpl {

  /** Generate KPI dashboard from production + quality data. */
  dashboard(
    production: ProductionRecord[],
    quality: QualityRecord[],
    period = "all",
  ): KPIDashboard {
    const totalParts = production.reduce((s, r) => s + r.quantity, 0);
    const totalScrap = production.reduce((s, r) => s + (r.scrapCount ?? 0), 0);
    const totalSetup = production.reduce((s, r) => s + (r.setupTime ?? 0), 0);
    const totalRun = production.reduce(
      (s, r) => s + (r.cycleTime ?? 0) * r.quantity, 0,
    );
    const totalDowntime = production.reduce(
      (s, r) => s + (r.downtime ?? 0), 0,
    );

    const totalInspected = quality.reduce((s, r) => s + r.inspected, 0);
    const totalPassed = quality.reduce((s, r) => s + r.passed, 0);
    const totalFailed = quality.reduce((s, r) => s + r.failed, 0);
    const totalReworked = quality.reduce((s, r) => s + (r.reworked ?? 0), 0);

    const totalAvailable = totalSetup + totalRun + totalDowntime;
    const plannedRun = totalSetup + totalRun;

    const availability = totalAvailable > 0
      ? round2(plannedRun / totalAvailable) : 1;
    const idealCycleTime = totalParts > 0 && totalRun > 0
      ? totalRun / totalParts : 0;
    const performance = plannedRun > 0 && idealCycleTime > 0
      ? round2(Math.min(1, (idealCycleTime * totalParts) / plannedRun)) : 1;
    const qualityRate = totalInspected > 0
      ? round2(totalPassed / totalInspected) : 1;

    return {
      period,
      production: {
        totalParts,
        totalSetupMinutes: round2(totalSetup),
        totalRunMinutes: round2(totalRun),
        totalDowntimeMinutes: round2(totalDowntime),
        partsPerHour: totalRun > 0 ? round2(totalParts / (totalRun / 60)) : 0,
        utilizationPct: totalAvailable > 0
          ? round2((plannedRun / totalAvailable) * 100) : 0,
      },
      quality: {
        totalInspected,
        totalPassed,
        totalFailed,
        yieldPct: totalInspected > 0
          ? round2((totalPassed / totalInspected) * 100) : 100,
        scrapPct: totalParts > 0
          ? round2((totalScrap / totalParts) * 100) : 0,
        reworkPct: totalInspected > 0
          ? round2((totalReworked / totalInspected) * 100) : 0,
      },
      oee: {
        availability: round2(availability * 100),
        performance: round2(performance * 100),
        quality: round2(qualityRate * 100),
        overall: round2(availability * performance * qualityRate * 100),
      },
    };
  }

  /** Pareto analysis — sort by count descending, compute cumulative %. */
  paretoAnalysis(
    data: Array<{ category: string; count: number }>,
  ): ParetoItem[] {
    const sorted = [...data].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, d) => s + d.count, 0);
    if (total === 0) return [];

    let cumulative = 0;
    return sorted.map(d => {
      cumulative += d.count;
      return {
        category: d.category,
        count: d.count,
        cumulative,
        cumulativePct: round2((cumulative / total) * 100),
      };
    });
  }

  /** Production summary grouped by part number. */
  productionReport(records: ProductionRecord[]): Array<{
    partNumber: string;
    totalQuantity: number;
    totalScrap: number;
    avgCycleTime: number;
    totalSetup: number;
    machines: string[];
  }> {
    const byPart = new Map<string, ProductionRecord[]>();
    for (const r of records) {
      const arr = byPart.get(r.partNumber) ?? [];
      arr.push(r);
      byPart.set(r.partNumber, arr);
    }

    return Array.from(byPart.entries()).map(([partNumber, recs]) => {
      const totalQuantity = recs.reduce((s, r) => s + r.quantity, 0);
      const totalScrap = recs.reduce((s, r) => s + (r.scrapCount ?? 0), 0);
      const cycleRecs = recs.filter(r => r.cycleTime != null);
      const avgCycleTime = cycleRecs.length > 0
        ? round2(cycleRecs.reduce((s, r) => s + r.cycleTime!, 0) / cycleRecs.length)
        : 0;
      const totalSetup = recs.reduce((s, r) => s + (r.setupTime ?? 0), 0);
      const machines = [...new Set(recs.map(r => r.machine).filter(Boolean) as string[])];

      return { partNumber, totalQuantity, totalScrap, avgCycleTime, totalSetup, machines };
    });
  }

  /** Quality report grouped by defect type. */
  qualityReport(records: QualityRecord[]): {
    overall: { inspected: number; passed: number; failed: number; yieldPct: number };
    byDefect: Array<{ defectType: string; count: number; pct: number }>;
  } {
    const inspected = records.reduce((s, r) => s + r.inspected, 0);
    const passed = records.reduce((s, r) => s + r.passed, 0);
    const failed = records.reduce((s, r) => s + r.failed, 0);

    const defectMap = new Map<string, number>();
    for (const r of records) {
      if (r.defectType && r.failed > 0) {
        defectMap.set(r.defectType, (defectMap.get(r.defectType) ?? 0) + r.failed);
      }
    }

    const byDefect = Array.from(defectMap.entries())
      .map(([defectType, count]) => ({
        defectType,
        count,
        pct: failed > 0 ? round2((count / failed) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      overall: {
        inspected, passed, failed,
        yieldPct: inspected > 0 ? round2((passed / inspected) * 100) : 100,
      },
      byDefect,
    };
  }

  /** Financial summary grouped by category. */
  financialReport(records: FinancialRecord[]): {
    total: number;
    byCategory: Array<{ category: string; total: number; pct: number }>;
    byJob: Array<{ jobId: string; total: number }>;
  } {
    const total = records.reduce((s, r) => s + r.amount, 0);

    const catMap = new Map<string, number>();
    const jobMap = new Map<string, number>();

    for (const r of records) {
      catMap.set(r.category, (catMap.get(r.category) ?? 0) + r.amount);
      if (r.jobId) {
        jobMap.set(r.jobId, (jobMap.get(r.jobId) ?? 0) + r.amount);
      }
    }

    const byCategory = Array.from(catMap.entries())
      .map(([category, t]) => ({
        category, total: round2(t),
        pct: total > 0 ? round2((t / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const byJob = Array.from(jobMap.entries())
      .map(([jobId, t]) => ({ jobId, total: round2(t) }))
      .sort((a, b) => b.total - a.total);

    return { total: round2(total), byCategory, byJob };
  }

  /** Compute trend with optional moving average. */
  trendAnalysis(
    data: Array<{ period: string; value: number }>,
    windowSize = 3,
  ): TrendPoint[] {
    return data.map((d, i) => {
      let movingAverage: number | undefined;
      if (i >= windowSize - 1) {
        const window = data.slice(i - windowSize + 1, i + 1);
        movingAverage = round2(
          window.reduce((s, w) => s + w.value, 0) / windowSize,
        );
      }
      return { period: d.period, value: d.value, movingAverage };
    });
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const reportingEngine = new ReportingEngineImpl();
