/**
 * CMMHistoryEngine — CMM Measurement History
 * ===========================================
 *
 * Tracks measurement history over time for parts, enabling
 * trend analysis, SPC, and process capability studies.
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MeasurementRecordSchema = z.object({
  id: z.string(),
  partNumber: z.string(),
  featureName: z.string(),
  serialNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  nominal: z.number(),
  actual: z.number(),
  deviation: z.number(),
  toleranceUpper: z.number(),
  toleranceLower: z.number(),
  inTolerance: z.boolean(),
  measuredAt: z.string(),
  machineId: z.string(),
  operatorId: z.string().optional(),
});

export const FeatureTrendSchema = z.object({
  partNumber: z.string(),
  featureName: z.string(),
  recordCount: z.number(),
  statistics: z.object({
    mean: z.number(),
    stdDev: z.number(),
    min: z.number(),
    max: z.number(),
    range: z.number(),
    cp: z.number().optional(),
    cpk: z.number().optional(),
  }),
  trend: z.enum(["stable", "drifting_high", "drifting_low", "erratic", "insufficient_data"]),
  outOfToleranceRate: z.number(),
  records: z.array(MeasurementRecordSchema),
});

export const SPCAlertSchema = z.object({
  id: z.string(),
  partNumber: z.string(),
  featureName: z.string(),
  alertType: z.enum(["out_of_tolerance", "trend", "run", "cpk_low", "range_excessive"]),
  severity: z.enum(["warning", "critical"]),
  message: z.string(),
  detectedAt: z.string(),
  acknowledged: z.boolean().default(false),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementRecord = z.infer<typeof MeasurementRecordSchema>;
export type FeatureTrend = z.infer<typeof FeatureTrendSchema>;
export type SPCAlert = z.infer<typeof SPCAlertSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const measurementHistory: Map<string, MeasurementRecord[]> = new Map();
const spcAlerts: SPCAlert[] = [];
let recordCounter = 1;
let alertCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CMMHistoryEngine {
  /**
   * Add measurement record to history
   */
  static addRecord(record: Omit<MeasurementRecord, "id">): MeasurementRecord {
    const newRecord: MeasurementRecord = {
      ...record,
      id: `MR-${++recordCounter}`,
    };

    const key = `${record.partNumber}:${record.featureName}`;
    const records = measurementHistory.get(key) || [];
    records.push(newRecord);
    measurementHistory.set(key, records);

    // Check for SPC violations
    this.checkSPCRules(key, records);

    return newRecord;
  }

  /**
   * Check SPC rules and generate alerts
   */
  private static checkSPCRules(key: string, records: MeasurementRecord[]): void {
    if (records.length < 5) return;

    const recent = records.slice(-10);
    const [partNumber, featureName] = key.split(":");

    // Rule 1: Point out of tolerance
    const latest = recent[recent.length - 1];
    if (!latest.inTolerance) {
      spcAlerts.push({
        id: `SPC-${++alertCounter}`,
        partNumber,
        featureName,
        alertType: "out_of_tolerance",
        severity: "critical",
        message: `Feature ${featureName} out of tolerance: ${latest.actual.toFixed(4)} (nom: ${latest.nominal.toFixed(4)})`,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Rule 2: 7 points trending same direction
    if (recent.length >= 7) {
      const last7 = recent.slice(-7);
      let increasing = true;
      let decreasing = true;
      for (let i = 1; i < last7.length; i++) {
        if (last7[i].deviation <= last7[i - 1].deviation) increasing = false;
        if (last7[i].deviation >= last7[i - 1].deviation) decreasing = false;
      }
      if (increasing || decreasing) {
        spcAlerts.push({
          id: `SPC-${++alertCounter}`,
          partNumber,
          featureName,
          alertType: "trend",
          severity: "warning",
          message: `Feature ${featureName}: 7-point ${increasing ? "increasing" : "decreasing"} trend detected`,
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }
  }

  /**
   * Get feature trend analysis
   */
  static getFeatureTrend(partNumber: string, featureName: string, limit?: number): FeatureTrend | undefined {
    const key = `${partNumber}:${featureName}`;
    const records = measurementHistory.get(key);
    if (!records || records.length === 0) return undefined;

    const subset = limit ? records.slice(-limit) : records;
    const deviations = subset.map(r => r.deviation);

    const mean = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const variance = deviations.reduce((a, b) => a + (b - mean) ** 2, 0) / deviations.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...deviations);
    const max = Math.max(...deviations);

    // Calculate Cp and Cpk if we have tolerance info
    const sample = subset[0];
    const toleranceRange = sample.toleranceUpper - sample.toleranceLower;
    const cp = toleranceRange / (6 * stdDev);
    const cpkUpper = (sample.toleranceUpper - mean) / (3 * stdDev);
    const cpkLower = (mean - sample.toleranceLower) / (3 * stdDev);
    const cpk = Math.min(cpkUpper, cpkLower);

    // Determine trend
    let trend: FeatureTrend["trend"] = "stable";
    if (subset.length < 10) {
      trend = "insufficient_data";
    } else {
      const firstHalf = deviations.slice(0, Math.floor(deviations.length / 2));
      const secondHalf = deviations.slice(Math.floor(deviations.length / 2));
      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const drift = secondMean - firstMean;

      if (Math.abs(drift) > stdDev) {
        trend = drift > 0 ? "drifting_high" : "drifting_low";
      } else if (stdDev > toleranceRange / 4) {
        trend = "erratic";
      }
    }

    const outOfTolerance = subset.filter(r => !r.inTolerance).length;

    return {
      partNumber,
      featureName,
      recordCount: subset.length,
      statistics: {
        mean: Math.round(mean * 10000) / 10000,
        stdDev: Math.round(stdDev * 10000) / 10000,
        min: Math.round(min * 10000) / 10000,
        max: Math.round(max * 10000) / 10000,
        range: Math.round((max - min) * 10000) / 10000,
        cp: isFinite(cp) ? Math.round(cp * 100) / 100 : undefined,
        cpk: isFinite(cpk) ? Math.round(cpk * 100) / 100 : undefined,
      },
      trend,
      outOfToleranceRate: Math.round((outOfTolerance / subset.length) * 10000) / 100,
      records: subset,
    };
  }

  /**
   * Get all features for a part
   */
  static getPartFeatures(partNumber: string): string[] {
    const features: Set<string> = new Set();
    for (const key of measurementHistory.keys()) {
      if (key.startsWith(`${partNumber}:`)) {
        features.add(key.split(":")[1]);
      }
    }
    return Array.from(features);
  }

  /**
   * Get active SPC alerts
   */
  static getActiveAlerts(partNumber?: string): SPCAlert[] {
    let alerts = spcAlerts.filter(a => !a.acknowledged);
    if (partNumber) {
      alerts = alerts.filter(a => a.partNumber === partNumber);
    }
    return alerts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  /**
   * Acknowledge an alert
   */
  static acknowledgeAlert(alertId: string): boolean {
    const alert = spcAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get measurement history statistics
   */
  static getHistoryStats(): {
    totalRecords: number;
    partsTracked: number;
    featuresTracked: number;
    activeAlerts: number;
  } {
    const parts = new Set<string>();
    let totalRecords = 0;

    for (const [key, records] of measurementHistory) {
      parts.add(key.split(":")[0]);
      totalRecords += records.length;
    }

    return {
      totalRecords,
      partsTracked: parts.size,
      featuresTracked: measurementHistory.size,
      activeAlerts: spcAlerts.filter(a => !a.acknowledged).length,
    };
  }

  static getSelfAwareness() {
    return {
      name: "CMMHistoryEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["addRecord", "getFeatureTrend", "getPartFeatures", "getActiveAlerts", "acknowledgeAlert", "getHistoryStats"],
      spcRules: ["out_of_tolerance", "trend", "run", "cpk_low", "range_excessive"],
      dependencies: [],
    };
  }
}

export const cmmHistoryEngine = new CMMHistoryEngine();
