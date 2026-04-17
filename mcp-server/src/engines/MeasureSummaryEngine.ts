/**
 * MeasureSummaryEngine — Measurement Summary Reporting
 * =====================================================
 *
 * Aggregates measurement data across CMM, surface, and probe
 * sources to generate comprehensive quality reports.
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MeasurementSourceSchema = z.enum(["cmm", "surface", "probe", "manual", "vision"]);

export const MeasurementSummarySchema = z.object({
  id: z.string(),
  partNumber: z.string(),
  workOrderNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  generatedAt: z.string(),
  sources: z.array(MeasurementSourceSchema),
  totals: z.object({
    features: z.number(),
    passed: z.number(),
    failed: z.number(),
    passRate: z.number(),
  }),
  bySource: z.record(z.object({
    features: z.number(),
    passed: z.number(),
    failed: z.number(),
  })),
  criticalFailures: z.array(z.object({
    featureName: z.string(),
    source: MeasurementSourceSchema,
    deviation: z.number(),
    tolerance: z.number(),
    severity: z.enum(["minor", "major", "critical"]),
  })),
  capabilities: z.object({
    overallCpk: z.number().optional(),
    worstCpk: z.object({
      feature: z.string(),
      value: z.number(),
    }).optional(),
    bestCpk: z.object({
      feature: z.string(),
      value: z.number(),
    }).optional(),
  }),
  disposition: z.enum(["accept", "reject", "conditional", "pending"]),
  notes: z.string().optional(),
});

export const PartQualityTrendSchema = z.object({
  partNumber: z.string(),
  period: z.string(),
  dataPoints: z.array(z.object({
    date: z.string(),
    passRate: z.number(),
    partsInspected: z.number(),
    avgCpk: z.number().optional(),
  })),
  trend: z.enum(["improving", "stable", "degrading", "insufficient_data"]),
  averagePassRate: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementSource = z.infer<typeof MeasurementSourceSchema>;
export type MeasurementSummary = z.infer<typeof MeasurementSummarySchema>;
export type PartQualityTrend = z.infer<typeof PartQualityTrendSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const summaries: Map<string, MeasurementSummary> = new Map();
const measurementData: Map<string, {
  source: MeasurementSource;
  featureName: string;
  passed: boolean;
  deviation: number;
  tolerance: number;
  cpk?: number;
  timestamp: string;
}[]> = new Map();
let summaryCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MeasureSummaryEngine {
  /**
   * Add measurement data point
   */
  static addMeasurement(
    partNumber: string,
    source: MeasurementSource,
    featureName: string,
    passed: boolean,
    deviation: number,
    tolerance: number,
    cpk?: number,
    serialNumber?: string
  ): void {
    const key = serialNumber ? `${partNumber}:${serialNumber}` : partNumber;
    const data = measurementData.get(key) || [];
    data.push({
      source,
      featureName,
      passed,
      deviation,
      tolerance,
      cpk,
      timestamp: new Date().toISOString(),
    });
    measurementData.set(key, data);
  }

  /**
   * Generate measurement summary
   */
  static generateSummary(
    partNumber: string,
    workOrderNumber?: string,
    serialNumber?: string
  ): MeasurementSummary {
    const key = serialNumber ? `${partNumber}:${serialNumber}` : partNumber;
    const data = measurementData.get(key) || [];

    const sources = new Set<MeasurementSource>();
    const bySource: Record<string, { features: number; passed: number; failed: number }> = {};
    const criticalFailures: MeasurementSummary["criticalFailures"] = [];
    const cpkValues: { feature: string; value: number }[] = [];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const m of data) {
      sources.add(m.source);

      if (!bySource[m.source]) {
        bySource[m.source] = { features: 0, passed: 0, failed: 0 };
      }
      bySource[m.source].features++;

      if (m.passed) {
        bySource[m.source].passed++;
        totalPassed++;
      } else {
        bySource[m.source].failed++;
        totalFailed++;

        const severity: "minor" | "major" | "critical" =
          Math.abs(m.deviation) > m.tolerance * 2 ? "critical" :
          Math.abs(m.deviation) > m.tolerance * 1.5 ? "major" : "minor";

        criticalFailures.push({
          featureName: m.featureName,
          source: m.source,
          deviation: m.deviation,
          tolerance: m.tolerance,
          severity,
        });
      }

      if (m.cpk !== undefined) {
        cpkValues.push({ feature: m.featureName, value: m.cpk });
      }
    }

    const totalFeatures = totalPassed + totalFailed;
    const passRate = totalFeatures > 0 ? Math.round((totalPassed / totalFeatures) * 10000) / 100 : 100;

    // Calculate capability metrics
    const capabilities: MeasurementSummary["capabilities"] = {};
    if (cpkValues.length > 0) {
      const avgCpk = cpkValues.reduce((sum, c) => sum + c.value, 0) / cpkValues.length;
      capabilities.overallCpk = Math.round(avgCpk * 100) / 100;

      const sorted = [...cpkValues].sort((a, b) => a.value - b.value);
      capabilities.worstCpk = { feature: sorted[0].feature, value: sorted[0].value };
      capabilities.bestCpk = { feature: sorted[sorted.length - 1].feature, value: sorted[sorted.length - 1].value };
    }

    // Determine disposition
    let disposition: MeasurementSummary["disposition"] = "accept";
    if (criticalFailures.some(f => f.severity === "critical")) {
      disposition = "reject";
    } else if (criticalFailures.length > 0) {
      disposition = "conditional";
    } else if (totalFeatures === 0) {
      disposition = "pending";
    }

    const summary: MeasurementSummary = {
      id: `SUM-${++summaryCounter}`,
      partNumber,
      workOrderNumber,
      serialNumber,
      generatedAt: new Date().toISOString(),
      sources: Array.from(sources),
      totals: {
        features: totalFeatures,
        passed: totalPassed,
        failed: totalFailed,
        passRate,
      },
      bySource,
      criticalFailures: criticalFailures.sort((a, b) => {
        const severityOrder = { critical: 0, major: 1, minor: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      capabilities,
      disposition,
    };

    summaries.set(summary.id, summary);
    return summary;
  }

  /**
   * Get summary by ID
   */
  static getSummary(id: string): MeasurementSummary | undefined {
    return summaries.get(id);
  }

  /**
   * List summaries for a part
   */
  static listSummaries(partNumber: string): MeasurementSummary[] {
    return Array.from(summaries.values())
      .filter(s => s.partNumber === partNumber)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  /**
   * Get quality trend for a part
   */
  static getQualityTrend(partNumber: string, days: number = 30): PartQualityTrend {
    const partSummaries = this.listSummaries(partNumber);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const recentSummaries = partSummaries.filter(s => new Date(s.generatedAt) >= cutoff);

    // Group by date
    const byDate = new Map<string, { passRates: number[]; cpks: number[] }>();
    for (const s of recentSummaries) {
      const date = s.generatedAt.split("T")[0];
      const entry = byDate.get(date) || { passRates: [], cpks: [] };
      entry.passRates.push(s.totals.passRate);
      if (s.capabilities.overallCpk) {
        entry.cpks.push(s.capabilities.overallCpk);
      }
      byDate.set(date, entry);
    }

    const dataPoints = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        passRate: Math.round(data.passRates.reduce((a, b) => a + b, 0) / data.passRates.length * 100) / 100,
        partsInspected: data.passRates.length,
        avgCpk: data.cpks.length > 0
          ? Math.round(data.cpks.reduce((a, b) => a + b, 0) / data.cpks.length * 100) / 100
          : undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Determine trend
    let trend: PartQualityTrend["trend"] = "insufficient_data";
    if (dataPoints.length >= 5) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.passRate, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.passRate, 0) / secondHalf.length;

      if (secondAvg - firstAvg > 2) {
        trend = "improving";
      } else if (firstAvg - secondAvg > 2) {
        trend = "degrading";
      } else {
        trend = "stable";
      }
    }

    const allPassRates = recentSummaries.map(s => s.totals.passRate);
    const averagePassRate = allPassRates.length > 0
      ? Math.round(allPassRates.reduce((a, b) => a + b, 0) / allPassRates.length * 100) / 100
      : 0;

    return {
      partNumber,
      period: `${days} days`,
      dataPoints,
      trend,
      averagePassRate,
    };
  }

  /**
   * Get parts with quality issues
   */
  static getPartsWithIssues(): { partNumber: string; rejectCount: number; conditionalCount: number; avgPassRate: number }[] {
    const partStats = new Map<string, { rejects: number; conditionals: number; passRates: number[] }>();

    for (const summary of summaries.values()) {
      const stats = partStats.get(summary.partNumber) || { rejects: 0, conditionals: 0, passRates: [] };
      if (summary.disposition === "reject") stats.rejects++;
      if (summary.disposition === "conditional") stats.conditionals++;
      stats.passRates.push(summary.totals.passRate);
      partStats.set(summary.partNumber, stats);
    }

    return Array.from(partStats.entries())
      .map(([partNumber, stats]) => ({
        partNumber,
        rejectCount: stats.rejects,
        conditionalCount: stats.conditionals,
        avgPassRate: Math.round(stats.passRates.reduce((a, b) => a + b, 0) / stats.passRates.length * 100) / 100,
      }))
      .filter(p => p.rejectCount > 0 || p.conditionalCount > 0)
      .sort((a, b) => b.rejectCount - a.rejectCount);
  }

  /**
   * Export summary to different formats
   */
  static exportSummary(id: string, format: "json" | "csv" | "text"): string | undefined {
    const summary = summaries.get(id);
    if (!summary) return undefined;

    switch (format) {
      case "json":
        return JSON.stringify(summary, null, 2);
      case "csv": {
        const lines = ["Feature,Source,Passed,Deviation,Tolerance,Severity"];
        for (const f of summary.criticalFailures) {
          lines.push(`${f.featureName},${f.source},false,${f.deviation},${f.tolerance},${f.severity}`);
        }
        return lines.join("\n");
      }
      case "text":
        return [
          `Measurement Summary: ${summary.id}`,
          `Part: ${summary.partNumber}${summary.serialNumber ? ` (S/N: ${summary.serialNumber})` : ""}`,
          `Generated: ${summary.generatedAt}`,
          `Disposition: ${summary.disposition.toUpperCase()}`,
          ``,
          `Results: ${summary.totals.passed}/${summary.totals.features} passed (${summary.totals.passRate}%)`,
          summary.capabilities.overallCpk ? `Overall Cpk: ${summary.capabilities.overallCpk}` : "",
          summary.criticalFailures.length > 0 ? `\nCritical Failures:\n${summary.criticalFailures.map(f => `  - ${f.featureName}: ${f.deviation.toFixed(4)} (tol: ${f.tolerance})`).join("\n")}` : "",
        ].filter(Boolean).join("\n");
    }
  }

  static getSelfAwareness() {
    return {
      name: "MeasureSummaryEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["addMeasurement", "generateSummary", "getSummary", "listSummaries", "getQualityTrend", "getPartsWithIssues", "exportSummary"],
      sources: ["cmm", "surface", "probe", "manual", "vision"],
      dispositions: ["accept", "reject", "conditional", "pending"],
      dependencies: [],
    };
  }
}

export const measureSummaryEngine = new MeasureSummaryEngine();
