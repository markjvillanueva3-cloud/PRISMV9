/**
 * ProbeDriftEngine — Probe Drift Monitoring
 * ==========================================
 *
 * Monitors probe calibration drift and accuracy over time,
 * triggering recalibration alerts when needed.
 *
 * L2-P4-MS1/P0-U02 — Batch 4: Measurement & QC Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CalibrationRecordSchema = z.object({
  id: z.string(),
  probeId: z.string(),
  machineId: z.string(),
  calibrationType: z.enum(["full", "quick", "stylus_only", "ring_gauge"]),
  referenceStandard: z.string(),
  referenceValue: z.number(),
  measuredValue: z.number(),
  deviation: z.number(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  passed: z.boolean(),
  calibratedBy: z.string().optional(),
  timestamp: z.string(),
  nextDue: z.string().optional(),
});

export const DriftAnalysisSchema = z.object({
  probeId: z.string(),
  analysisDate: z.string(),
  recordCount: z.number(),
  driftRate: z.number(),
  driftDirection: z.enum(["positive", "negative", "stable", "erratic"]),
  currentDeviation: z.number(),
  maxAllowedDeviation: z.number(),
  healthStatus: z.enum(["good", "warning", "critical", "calibration_required"]),
  estimatedDaysUntilCalibration: z.number(),
  recommendations: z.array(z.string()),
});

export const DriftAlertSchema = z.object({
  id: z.string(),
  probeId: z.string(),
  machineId: z.string(),
  alertType: z.enum(["calibration_due", "drift_warning", "drift_critical", "temperature_compensation"]),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  detectedAt: z.string(),
  acknowledged: z.boolean().default(false),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalibrationRecord = z.infer<typeof CalibrationRecordSchema>;
export type DriftAnalysis = z.infer<typeof DriftAnalysisSchema>;
export type DriftAlert = z.infer<typeof DriftAlertSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const calibrationHistory: Map<string, CalibrationRecord[]> = new Map();
const driftAlerts: DriftAlert[] = [];
const probeThresholds: Map<string, { warning: number; critical: number; maxDays: number }> = new Map([
  ["default", { warning: 0.005, critical: 0.010, maxDays: 30 }],
]);
let calibrationCounter = 1;
let alertCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ProbeDriftEngine {
  /**
   * Record a calibration check
   */
  static recordCalibration(data: Omit<CalibrationRecord, "id" | "timestamp" | "deviation" | "passed">): CalibrationRecord {
    const deviation = data.measuredValue - data.referenceValue;
    const thresholds = probeThresholds.get(data.probeId) || probeThresholds.get("default")!;

    const record: CalibrationRecord = {
      ...data,
      id: `CAL-${++calibrationCounter}`,
      deviation: Math.round(deviation * 10000) / 10000,
      passed: Math.abs(deviation) <= thresholds.critical,
      timestamp: new Date().toISOString(),
    };

    const key = data.probeId;
    const history = calibrationHistory.get(key) || [];
    history.push(record);
    calibrationHistory.set(key, history);

    // Check for alerts
    this.checkDriftAlerts(data.probeId, data.machineId, deviation, thresholds);

    return record;
  }

  /**
   * Check and generate drift alerts
   */
  private static checkDriftAlerts(probeId: string, machineId: string, deviation: number, thresholds: { warning: number; critical: number }): void {
    const absDeviation = Math.abs(deviation);

    if (absDeviation >= thresholds.critical) {
      driftAlerts.push({
        id: `DA-${++alertCounter}`,
        probeId,
        machineId,
        alertType: "drift_critical",
        severity: "critical",
        message: `Probe ${probeId} deviation ${deviation.toFixed(4)}mm exceeds critical threshold`,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    } else if (absDeviation >= thresholds.warning) {
      driftAlerts.push({
        id: `DA-${++alertCounter}`,
        probeId,
        machineId,
        alertType: "drift_warning",
        severity: "warning",
        message: `Probe ${probeId} deviation ${deviation.toFixed(4)}mm approaching critical threshold`,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
      });
    }
  }

  /**
   * Analyze drift trend for a probe
   */
  static analyzeDrift(probeId: string): DriftAnalysis | undefined {
    const history = calibrationHistory.get(probeId);
    if (!history || history.length < 2) {
      return undefined;
    }

    const thresholds = probeThresholds.get(probeId) || probeThresholds.get("default")!;
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const deviations = sorted.map(r => r.deviation);
    const currentDeviation = deviations[deviations.length - 1];

    // Calculate drift rate (deviation change per day)
    const firstTime = new Date(sorted[0].timestamp).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const daysElapsed = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
    const totalDrift = currentDeviation - deviations[0];
    const driftRate = daysElapsed > 0 ? totalDrift / daysElapsed : 0;

    // Determine drift direction
    let driftDirection: DriftAnalysis["driftDirection"] = "stable";
    if (Math.abs(driftRate) > 0.0001) {
      driftDirection = driftRate > 0 ? "positive" : "negative";
    }
    const stdDev = Math.sqrt(
      deviations.reduce((sum, d) => sum + (d - currentDeviation) ** 2, 0) / deviations.length
    );
    if (stdDev > thresholds.warning) {
      driftDirection = "erratic";
    }

    // Determine health status
    const absDeviation = Math.abs(currentDeviation);
    let healthStatus: DriftAnalysis["healthStatus"] = "good";
    if (absDeviation >= thresholds.critical) {
      healthStatus = "calibration_required";
    } else if (absDeviation >= thresholds.warning) {
      healthStatus = "warning";
    } else if (absDeviation >= thresholds.warning * 0.7) {
      healthStatus = "warning";
    }

    // Estimate days until calibration needed
    const remainingTolerance = thresholds.critical - absDeviation;
    const estimatedDays = Math.abs(driftRate) > 0.00001
      ? Math.max(0, remainingTolerance / Math.abs(driftRate))
      : thresholds.maxDays;

    // Generate recommendations
    const recommendations: string[] = [];
    if (healthStatus === "calibration_required") {
      recommendations.push("Immediate recalibration required");
    } else if (healthStatus === "warning") {
      recommendations.push("Schedule calibration within 7 days");
    }
    if (driftDirection === "erratic") {
      recommendations.push("Check probe stylus for damage or contamination");
      recommendations.push("Verify machine thermal stability");
    }
    if (estimatedDays < 7 && healthStatus !== "calibration_required") {
      recommendations.push(`Calibration recommended within ${Math.ceil(estimatedDays)} days`);
    }

    return {
      probeId,
      analysisDate: new Date().toISOString(),
      recordCount: history.length,
      driftRate: Math.round(driftRate * 100000) / 100000,
      driftDirection,
      currentDeviation: Math.round(currentDeviation * 10000) / 10000,
      maxAllowedDeviation: thresholds.critical,
      healthStatus,
      estimatedDaysUntilCalibration: Math.round(estimatedDays),
      recommendations,
    };
  }

  /**
   * Get calibration history
   */
  static getCalibrationHistory(probeId: string, limit?: number): CalibrationRecord[] {
    const history = calibrationHistory.get(probeId) || [];
    const sorted = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Set probe thresholds
   */
  static setThresholds(probeId: string, warning: number, critical: number, maxDays: number): void {
    probeThresholds.set(probeId, { warning, critical, maxDays });
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(probeId?: string): DriftAlert[] {
    let alerts = driftAlerts.filter(a => !a.acknowledged);
    if (probeId) {
      alerts = alerts.filter(a => a.probeId === probeId);
    }
    return alerts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  /**
   * Acknowledge alert
   */
  static acknowledgeAlert(alertId: string): boolean {
    const alert = driftAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get probes requiring calibration
   */
  static getCalibrationDue(): { probeId: string; lastCalibration: string; daysSince: number; healthStatus: string }[] {
    const results: { probeId: string; lastCalibration: string; daysSince: number; healthStatus: string }[] = [];

    for (const [probeId, history] of calibrationHistory) {
      if (history.length === 0) continue;

      const latest = [...history].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      const daysSince = Math.floor(
        (Date.now() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      const analysis = this.analyzeDrift(probeId);

      results.push({
        probeId,
        lastCalibration: latest.timestamp,
        daysSince,
        healthStatus: analysis?.healthStatus || "unknown",
      });
    }

    return results.sort((a, b) => b.daysSince - a.daysSince);
  }

  static getSelfAwareness() {
    return {
      name: "ProbeDriftEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["recordCalibration", "analyzeDrift", "getCalibrationHistory", "setThresholds", "getActiveAlerts", "acknowledgeAlert", "getCalibrationDue"],
      calibrationTypes: ["full", "quick", "stylus_only", "ring_gauge"],
      alertTypes: ["calibration_due", "drift_warning", "drift_critical", "temperature_compensation"],
      dependencies: [],
    };
  }
}

export const probeDriftEngine = new ProbeDriftEngine();
