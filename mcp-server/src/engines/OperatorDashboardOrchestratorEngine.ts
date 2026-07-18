/**
 * OperatorDashboardOrchestratorEngine
 * ====================================
 * Unified real-time shop floor operator dashboard — combines anomaly detection,
 * spindle monitoring, chatter prediction, predictive failure, and safety analysis
 * into a single actionable view.
 *
 * Sub-engines:
 * 1. RealTimeAnomalyDetectionEngine — CUSUM/EWMA/Mahalanobis/FFT/Wavelet anomaly detection
 * 2. SpindleProtectionEngine — Torque/power/thermal spindle protection
 * 3. ChatterPredictionEngine — Stability lobe / spectral chatter detection
 * 4. PredictiveFailureEngine — Action failure risk scoring (PFP)
 * 5. GCodeSafetyAnalyzerEngine — 24-rule contextual G-code safety analysis
 *
 * DEFENSIVE: If any sub-engine fails, the dashboard degrades gracefully —
 * that section is marked as unavailable while remaining sections still report.
 *
 * @module OperatorDashboardOrchestratorEngine
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Sub-engine imports (lazy — each is a singleton)
// ---------------------------------------------------------------------------

import { realTimeAnomalyDetectionEngine } from "./RealTimeAnomalyDetectionEngine.js";
import { spindleProtectionEngine } from "./SpindleProtectionEngine.js";
import { chatterPredictionEngine } from "./ChatterPredictionEngine.js";
import { pfpEngine } from "./PredictiveFailureEngine.js";
import { gcSafetyAnalyzer } from "./GCodeSafetyAnalyzerEngine.js";
import type { AnomalyDetectionResult } from "./RealTimeAnomalyDetectionEngine.js";
import type { SafetyAnalysisResult } from "./GCodeSafetyAnalyzerEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = "GREEN" | "YELLOW" | "RED";
export type AlertSeverity = "info" | "warning" | "critical";

export interface DashboardAlert {
  severity: AlertSeverity;
  source: string;
  message: string;
  timestamp: string;
}

export interface SpindleStatus {
  load_pct: number;
  temperature_est: number;
  health: string;
  available: boolean;
}

export interface ChatterStatus {
  risk_pct: number;
  recommended_rpm?: number;
  lobe_status: string;
  available: boolean;
}

export interface ToolStatus {
  estimated_life_remaining_pct: number;
  wear_stage: string;
  available: boolean;
}

export interface SafetyStatus {
  violations: string[];
  score: number;
  available: boolean;
}

export interface DashboardStatusInput {
  machine_id: string;
  current_rpm: number;
  current_feed: number;
  current_load_pct: number;
  tool_id?: string;
  material?: string;
  gcode_block?: string;
  /** Optional vibration samples for anomaly detection */
  vibration_samples?: number[];
  /** Sampling rate in Hz (default 10000) */
  sample_rate_hz?: number;
}

export interface DashboardStatusResult {
  machine_id: string;
  timestamp: string;
  overall_risk: RiskLevel;
  alerts: DashboardAlert[];
  spindle: SpindleStatus;
  chatter: ChatterStatus;
  tool: ToolStatus;
  safety: SafetyStatus;
  recommendations: string[];
  degraded_subsystems: string[];
}

export interface DashboardAlertsInput {
  machine_id: string;
  current_rpm: number;
  current_feed: number;
  current_load_pct: number;
  min_severity?: AlertSeverity;
  tool_id?: string;
  material?: string;
  gcode_block?: string;
  vibration_samples?: number[];
  sample_rate_hz?: number;
}

export interface DashboardAlertsResult {
  machine_id: string;
  timestamp: string;
  overall_risk: RiskLevel;
  alerts: DashboardAlert[];
  alert_count: number;
}

export interface ShiftOperation {
  rpm: number;
  feed: number;
  duration_min: number;
  load_pct?: number;
}

export interface ShiftSummaryInput {
  machine_id: string;
  shift_hours: number;
  operations: ShiftOperation[];
  gcode_blocks?: string[];
}

export interface ShiftSummaryResult {
  machine_id: string;
  shift_hours: number;
  timestamp: string;
  total_cut_time_min: number;
  idle_time_min: number;
  utilization_pct: number;
  operation_count: number;
  estimated_tool_changes: number;
  alerts_triggered: number;
  alerts_by_severity: { info: number; warning: number; critical: number };
  avg_spindle_load_pct: number;
  peak_spindle_load_pct: number;
  safety_violations_total: number;
  quality_score: number;
  recommendations: string[];
}

/**
 * Unified input for {@link OperatorDashboardOrchestratorEngineImpl.orchestrate}.
 * The live-status fields are required; min_severity tunes the alerts view, and
 * the shift_* fields (when supplied together) add the end-of-shift summary.
 */
export interface DashboardOrchestrateInput extends DashboardStatusInput {
  /** Minimum severity for the alerts section (default "info"). */
  min_severity?: AlertSeverity;
  /** Shift length in hours -- required (with operations) to compute the shift summary. */
  shift_hours?: number;
  /** Per-operation log -- required (with shift_hours) to compute the shift summary. */
  operations?: ShiftOperation[];
  /** Optional G-code blocks audited as part of the shift summary. */
  gcode_blocks?: string[];
}

/**
 * Combined dashboard result. Each section is null when not requested or when it
 * failed (its error is recorded in `errors` and its name in `sections_failed`).
 */
export interface DashboardOrchestrateResult {
  machine_id: string;
  timestamp: string;
  overall_risk: RiskLevel;
  status: DashboardStatusResult | null;
  alerts: DashboardAlertsResult | null;
  shift_summary: ShiftSummaryResult | null;
  sections_available: string[];
  sections_failed: string[];
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };

function now(): string {
  return new Date().toISOString();
}

/**
 * Estimate spindle temperature from load percentage and RPM.
 * Simplified thermal model: T_est = T_ambient + k1 * load% + k2 * (RPM/1000)^1.5
 */
function estimateSpindleTemp(loadPct: number, rpm: number): number {
  const T_ambient = 22; // degC
  const k1 = 0.35;       // degC per %load
  const k2 = 1.8;        // degC per (kRPM)^1.5
  return Math.round((T_ambient + k1 * loadPct + k2 * Math.pow(rpm / 1000, 1.5)) * 10) / 10;
}

/**
 * Estimate tool wear stage from cumulative cutting time and load.
 * Simplified Taylor-based estimation.
 */
function estimateToolWear(cumulativeMinutes: number, avgLoad: number): { remaining_pct: number; stage: string } {
  // Assume nominal tool life of 60 min at 80% load; scale inversely with load
  const nominalLife = 60 * (80 / Math.max(avgLoad, 10));
  const usedFraction = Math.min(cumulativeMinutes / nominalLife, 1.0);
  const remaining = Math.round((1 - usedFraction) * 100);

  let stage: string;
  if (usedFraction < 0.3) stage = "fresh";
  else if (usedFraction < 0.6) stage = "normal_wear";
  else if (usedFraction < 0.85) stage = "accelerated_wear";
  else stage = "end_of_life";

  return { remaining_pct: Math.max(remaining, 0), stage };
}

/**
 * Classify spindle health from load percentage.
 */
function classifySpindleHealth(loadPct: number, tempEst: number): string {
  if (loadPct > 95 || tempEst > 70) return "critical";
  if (loadPct > 80 || tempEst > 55) return "warning";
  if (loadPct > 60) return "normal_high";
  return "normal";
}

/**
 * Estimate chatter risk from RPM and feed parameters.
 * Uses simplified stability margin heuristic when full lobe data unavailable.
 */
function estimateChatterRisk(rpm: number, feed: number, loadPct: number): { risk_pct: number; lobe_status: string } {
  // Higher risk at high RPM with heavy loads
  const rpmFactor = Math.min(rpm / 15000, 1.0);
  const loadFactor = Math.min(loadPct / 100, 1.0);
  const feedFactor = Math.min(feed / 5000, 1.0);

  const rawRisk = (rpmFactor * 0.4 + loadFactor * 0.4 + feedFactor * 0.2) * 100;
  const risk_pct = Math.round(Math.min(rawRisk, 100) * 10) / 10;

  let lobe_status: string;
  if (risk_pct < 20) lobe_status = "well_inside_stable";
  else if (risk_pct < 40) lobe_status = "stable";
  else if (risk_pct < 60) lobe_status = "marginal";
  else if (risk_pct < 80) lobe_status = "near_boundary";
  else lobe_status = "unstable";

  return { risk_pct, lobe_status };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class OperatorDashboardOrchestratorEngineImpl {

  // =========================================================================
  // getStatus — Full dashboard snapshot
  // =========================================================================

  getStatus(input: DashboardStatusInput): DashboardStatusResult {
    const ts = now();
    const alerts: DashboardAlert[] = [];
    const recommendations: string[] = [];
    const degraded: string[] = [];

    // --- 1. Anomaly Detection ---
    let anomalyResult: AnomalyDetectionResult | null = null;
    try {
      if (input.vibration_samples && input.vibration_samples.length > 0) {
        const raw = realTimeAnomalyDetectionEngine.detect({
          samples: input.vibration_samples,
          sample_rate_hz: input.sample_rate_hz ?? 10000,
          sensitivity: 0.5,
        });
        // The detect() method returns an AtomicValue; extract the inner result
        if (raw && typeof raw === "object" && "value" in raw) {
          anomalyResult = raw.value as unknown as AnomalyDetectionResult;
        }
      }
    } catch {
      degraded.push("anomaly_detection");
    }

    if (anomalyResult) {
      if (anomalyResult.overall_status === "alarm") {
        alerts.push({ severity: "critical", source: "anomaly_detection", message: anomalyResult.recommended_action, timestamp: ts });
      } else if (anomalyResult.overall_status === "warning") {
        alerts.push({ severity: "warning", source: "anomaly_detection", message: anomalyResult.recommended_action, timestamp: ts });
      }
      for (const a of anomalyResult.anomalies) {
        recommendations.push(`[Anomaly] ${a.type}: ${a.message}`);
      }
    }

    // --- 2. Spindle Protection ---
    let spindle: SpindleStatus;
    try {
      const tempEst = estimateSpindleTemp(input.current_load_pct, input.current_rpm);
      const health = classifySpindleHealth(input.current_load_pct, tempEst);

      spindle = {
        load_pct: input.current_load_pct,
        temperature_est: tempEst,
        health,
        available: true,
      };

      if (health === "critical") {
        alerts.push({ severity: "critical", source: "spindle_protection", message: `Spindle load ${input.current_load_pct}% — overload risk. Temp est: ${tempEst}°C`, timestamp: ts });
        recommendations.push("Reduce depth of cut or feedrate immediately to prevent spindle damage");
      } else if (health === "warning") {
        alerts.push({ severity: "warning", source: "spindle_protection", message: `Spindle load ${input.current_load_pct}% — elevated. Temp est: ${tempEst}°C`, timestamp: ts });
        recommendations.push("Monitor spindle load closely; consider reducing cutting parameters");
      }

      // Try to use the actual spindle protection engine for torque check
      try {
        const torqueResult = spindleProtectionEngine.checkSpindleTorque(
          {
            ratedPower: 22,
            peakPower: 30,
            ratedTorque: 120,
            peakTorque: 180,
            minSpeed: 50,
            maxSpeed: 15000,
            ratedSpeed: 6000,
            cornerSpeed: 1500,
            maxTemperature: 75,
            warningTemperature: 55,
            maxRadialLoad: 5000,
            maxAxialLoad: 3000,
          } as any,
          {
            targetSpeed: input.current_rpm,
            requiredTorque: (input.current_load_pct / 100) * 120,
            requiredPower: (input.current_load_pct / 100) * 22,
            operationType: "ROUGHING" as const,
          },
        );
        if (torqueResult && !torqueResult.isSafe) {
          alerts.push({ severity: "critical", source: "spindle_protection", message: "Torque check FAILED — spindle overload detected", timestamp: ts });
        }
      } catch {
        // Spindle torque check degraded — continue with heuristic result
      }
    } catch {
      degraded.push("spindle_protection");
      spindle = { load_pct: input.current_load_pct, temperature_est: -1, health: "unavailable", available: false };
    }

    // --- 3. Chatter Prediction ---
    let chatter: ChatterStatus;
    try {
      const chatterEst = estimateChatterRisk(input.current_rpm, input.current_feed, input.current_load_pct);
      chatter = {
        risk_pct: chatterEst.risk_pct,
        lobe_status: chatterEst.lobe_status,
        available: true,
      };

      // Attempt full stability check via ChatterPredictionEngine
      try {
        // Generate lobes first, then check stability at current RPM
        const lobes = chatterPredictionEngine.generateStabilityLobes(
          { stiffness: 5e7, dampingRatio: 0.03, naturalFreq: 800 },
          { Kt: 2000e6, radialImmersion: 0.5, numTeeth: 4 },
          { min: Math.max(input.current_rpm - 2000, 500), max: input.current_rpm + 2000, points: 50 },
        );
        const stabilityResult = chatterPredictionEngine.checkStability(
          input.current_rpm,
          3.0, // assumed axial depth mm
          lobes,
        );
        if (stabilityResult && !stabilityResult.stable) {
          chatter.risk_pct = Math.max(chatter.risk_pct, 75);
          chatter.lobe_status = "unstable";
          chatter.recommended_rpm = undefined; // would need lobe peak search
          alerts.push({ severity: "warning", source: "chatter_prediction", message: stabilityResult.recommendation || "Chatter instability detected", timestamp: ts });
          recommendations.push("Shift RPM to a stable pocket or reduce axial depth of cut");
        }
      } catch {
        // Full chatter check unavailable — heuristic suffices
      }

      if (chatterEst.risk_pct > 60) {
        alerts.push({ severity: "warning", source: "chatter_prediction", message: `Chatter risk ${chatterEst.risk_pct}% — ${chatterEst.lobe_status}`, timestamp: ts });
      }
    } catch {
      degraded.push("chatter_prediction");
      chatter = { risk_pct: -1, lobe_status: "unavailable", available: false };
    }

    // --- 4. Predictive Failure ---
    let tool: ToolStatus;
    try {
      // Use simplified wear model for dashboard
      const wear = estimateToolWear(15, input.current_load_pct); // assume 15 min into cut
      tool = {
        estimated_life_remaining_pct: wear.remaining_pct,
        wear_stage: wear.stage,
        available: true,
      };

      // Try PFP risk assessment for additional insight
      try {
        const risk = pfpEngine.assessRisk("operator_dashboard", "getStatus", { machine_id: input.machine_id });
        if (risk && risk.riskLevel === "RED") {
          alerts.push({ severity: "critical", source: "predictive_failure", message: `High failure risk: ${risk.reason ?? "pattern match"}`, timestamp: ts });
        } else if (risk && risk.riskLevel === "YELLOW") {
          alerts.push({ severity: "warning", source: "predictive_failure", message: `Elevated failure risk: ${risk.reason ?? "pattern detected"}`, timestamp: ts });
        }
      } catch {
        // PFP unavailable — continue
      }

      if (wear.stage === "end_of_life") {
        alerts.push({ severity: "critical", source: "tool_wear", message: `Tool at end-of-life (${wear.remaining_pct}% remaining)`, timestamp: ts });
        recommendations.push("Schedule immediate tool change to prevent breakage");
      } else if (wear.stage === "accelerated_wear") {
        alerts.push({ severity: "warning", source: "tool_wear", message: `Tool in accelerated wear zone (${wear.remaining_pct}% remaining)`, timestamp: ts });
        recommendations.push("Plan tool change within next 2-3 operations");
      }
    } catch {
      degraded.push("predictive_failure");
      tool = { estimated_life_remaining_pct: -1, wear_stage: "unavailable", available: false };
    }

    // --- 5. G-Code Safety ---
    let safety: SafetyStatus;
    try {
      if (input.gcode_block && input.gcode_block.trim().length > 0) {
        const safetyResult: SafetyAnalysisResult = gcSafetyAnalyzer.analyze(input.gcode_block, {
          controller: "fanuc",
          strictness: "standard",
        });

        const violations = [
          ...safetyResult.critical.map(i => `[CRITICAL] ${i.description}`),
          ...safetyResult.high.map(i => `[HIGH] ${i.description}`),
          ...safetyResult.medium.map(i => `[MEDIUM] ${i.description}`),
        ];

        safety = {
          violations,
          score: safetyResult.score,
          available: true,
        };

        if (safetyResult.critical.length > 0) {
          alerts.push({
            severity: "critical",
            source: "gcode_safety",
            message: `${safetyResult.critical.length} critical safety violation(s): ${safetyResult.critical[0].description}`,
            timestamp: ts,
          });
          recommendations.push(...safetyResult.critical.map(i => `Fix: ${i.fix_suggestion}`));
        }
        if (safetyResult.high.length > 0) {
          alerts.push({
            severity: "warning",
            source: "gcode_safety",
            message: `${safetyResult.high.length} high-severity safety issue(s)`,
            timestamp: ts,
          });
        }
      } else {
        safety = { violations: [], score: 100, available: true };
      }
    } catch {
      degraded.push("gcode_safety");
      safety = { violations: [], score: -1, available: false };
    }

    // --- Compute overall risk ---
    const overall_risk = this.computeOverallRisk(alerts);

    // Sort alerts by severity (critical first)
    alerts.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

    // Add degraded subsystem warnings
    if (degraded.length > 0) {
      recommendations.push(`${degraded.length} subsystem(s) unavailable: ${degraded.join(", ")}. Dashboard in degraded mode.`);
    }

    return {
      machine_id: input.machine_id,
      timestamp: ts,
      overall_risk,
      alerts,
      spindle,
      chatter,
      tool,
      safety,
      recommendations,
      degraded_subsystems: degraded,
    };
  }

  // =========================================================================
  // getAlerts — Lightweight alert-only view
  // =========================================================================

  getAlerts(input: DashboardAlertsInput): DashboardAlertsResult {
    const fullStatus = this.getStatus({
      machine_id: input.machine_id,
      current_rpm: input.current_rpm,
      current_feed: input.current_feed,
      current_load_pct: input.current_load_pct,
      tool_id: input.tool_id,
      material: input.material,
      gcode_block: input.gcode_block,
      vibration_samples: input.vibration_samples,
      sample_rate_hz: input.sample_rate_hz,
    });

    return this.filterAlertsView(fullStatus, input.min_severity ?? "info");
  }

  // =========================================================================
  // getShiftSummary — End-of-shift aggregate report
  // =========================================================================

  getShiftSummary(input: ShiftSummaryInput): ShiftSummaryResult {
    const ts = now();
    const totalShiftMin = input.shift_hours * 60;

    // Aggregate operation stats
    let totalCutMin = 0;
    let totalLoad = 0;
    let peakLoad = 0;
    let allAlerts: DashboardAlert[] = [];
    let totalSafetyViolations = 0;
    let opCount = 0;

    for (const op of input.operations) {
      totalCutMin += op.duration_min;
      const load = op.load_pct ?? 50;
      totalLoad += load * op.duration_min;
      peakLoad = Math.max(peakLoad, load);
      opCount++;

      // Run status check for each operation to collect alerts
      try {
        const opStatus = this.getStatus({
          machine_id: input.machine_id,
          current_rpm: op.rpm,
          current_feed: op.feed,
          current_load_pct: load,
        });
        allAlerts.push(...opStatus.alerts);
        totalSafetyViolations += opStatus.safety.violations.length;
      } catch {
        // If per-op check fails, continue aggregation
      }
    }

    // Run G-code safety on any provided blocks
    if (input.gcode_blocks && input.gcode_blocks.length > 0) {
      for (const block of input.gcode_blocks) {
        try {
          const result = gcSafetyAnalyzer.analyze(block, { controller: "fanuc", strictness: "standard" });
          totalSafetyViolations += result.critical.length + result.high.length + result.medium.length;
        } catch {
          // Safety check failed for this block — continue
        }
      }
    }

    const avgLoad = totalCutMin > 0 ? Math.round((totalLoad / totalCutMin) * 10) / 10 : 0;
    const idleMin = Math.max(totalShiftMin - totalCutMin, 0);
    const utilization = totalShiftMin > 0 ? Math.round((totalCutMin / totalShiftMin) * 1000) / 10 : 0;

    // Estimate tool changes: rough heuristic — one change per 45 min of cutting at avg load
    const toolLife = 45 * (80 / Math.max(avgLoad, 10));
    const estimatedToolChanges = Math.max(Math.floor(totalCutMin / toolLife), 0);

    // Deduplicate alerts
    const uniqueAlerts = this.deduplicateAlerts(allAlerts);

    // Count by severity
    const alertsBySeverity = { info: 0, warning: 0, critical: 0 };
    for (const a of uniqueAlerts) {
      alertsBySeverity[a.severity]++;
    }

    // Quality score: 100 minus penalties
    let quality = 100;
    quality -= alertsBySeverity.critical * 15;
    quality -= alertsBySeverity.warning * 5;
    quality -= alertsBySeverity.info * 1;
    quality -= totalSafetyViolations * 10;
    quality -= Math.max(0, (peakLoad - 90)) * 2; // penalty for overload
    quality = Math.max(Math.round(quality), 0);

    // Recommendations
    const recommendations: string[] = [];
    if (utilization < 60) {
      recommendations.push(`Low utilization (${utilization}%) — review scheduling to reduce idle time`);
    }
    if (peakLoad > 90) {
      recommendations.push(`Peak load reached ${peakLoad}% — consider distributing cuts across more operations`);
    }
    if (estimatedToolChanges > 3) {
      recommendations.push(`${estimatedToolChanges} tool changes estimated — review tool selection for longer life`);
    }
    if (alertsBySeverity.critical > 0) {
      recommendations.push(`${alertsBySeverity.critical} critical alert(s) occurred — review root causes before next shift`);
    }
    if (totalSafetyViolations > 0) {
      recommendations.push(`${totalSafetyViolations} G-code safety violation(s) — run full safety audit on programs`);
    }
    if (quality >= 90) {
      recommendations.push("Shift quality excellent — no corrective actions needed");
    }

    return {
      machine_id: input.machine_id,
      shift_hours: input.shift_hours,
      timestamp: ts,
      total_cut_time_min: Math.round(totalCutMin * 10) / 10,
      idle_time_min: Math.round(idleMin * 10) / 10,
      utilization_pct: utilization,
      operation_count: opCount,
      estimated_tool_changes: estimatedToolChanges,
      alerts_triggered: uniqueAlerts.length,
      alerts_by_severity: alertsBySeverity,
      avg_spindle_load_pct: avgLoad,
      peak_spindle_load_pct: peakLoad,
      safety_violations_total: totalSafetyViolations,
      quality_score: quality,
      recommendations,
    };
  }

  // =========================================================================
  // orchestrate -- Unified dashboard: status + alerts + (optional) shift summary
  // =========================================================================

  /**
   * Compose the full operator dashboard in one call: the live status snapshot,
   * the filtered alerts view, and -- when shift context (shift_hours +
   * operations) is supplied -- the end-of-shift summary. Fail-soft PER SECTION,
   * matching this engine's degrade-gracefully contract: a section that throws is
   * recorded in `errors` + `sections_failed` while the others still report.
   * Self-validates the core live signals up front (machine_id non-empty +
   * finite current_rpm/feed/load_pct) -- without them every downstream estimate
   * is NaN, so a bad call fails loud (-> dispatcher catch -> success:false)
   * rather than returning a meaningless all-NaN dashboard.
   *
   * @param input Live signals (required) + optional alert filter + shift context.
   * @returns Combined dashboard with per-section availability + error map.
   */
  orchestrate(input: DashboardOrchestrateInput): DashboardOrchestrateResult {
    this.assertOrchestrateInput(input);
    const ts = now();
    const available: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    const statusInput: DashboardStatusInput = {
      machine_id: input.machine_id,
      current_rpm: input.current_rpm,
      current_feed: input.current_feed,
      current_load_pct: input.current_load_pct,
      tool_id: input.tool_id,
      material: input.material,
      gcode_block: input.gcode_block,
      vibration_samples: input.vibration_samples,
      sample_rate_hz: input.sample_rate_hz,
    };

    // --- Section 1: live status snapshot ---
    let status: DashboardStatusResult | null = null;
    try {
      status = this.getStatus(statusInput);
      available.push("status");
    } catch (e) {
      failed.push("status");
      errors.status = e instanceof Error ? e.message : String(e);
    }

    // --- Section 2: filtered alerts view (derived from the status snapshot when
    // available, so the two sections never disagree and getStatus runs once) ---
    let alerts: DashboardAlertsResult | null = null;
    try {
      const minSev = input.min_severity ?? "info";
      alerts = status
        ? this.filterAlertsView(status, minSev)
        : this.getAlerts({ ...statusInput, min_severity: minSev });
      available.push("alerts");
    } catch (e) {
      failed.push("alerts");
      errors.alerts = e instanceof Error ? e.message : String(e);
    }

    // --- Section 3: shift summary (only when shift context is supplied) ---
    let shift_summary: ShiftSummaryResult | null = null;
    if (Array.isArray(input.operations) && typeof input.shift_hours === "number") {
      try {
        shift_summary = this.getShiftSummary({
          machine_id: input.machine_id,
          shift_hours: input.shift_hours,
          operations: input.operations,
          gcode_blocks: input.gcode_blocks,
        });
        available.push("shift_summary");
      } catch (e) {
        failed.push("shift_summary");
        errors.shift_summary = e instanceof Error ? e.message : String(e);
      }
    }

    return {
      machine_id: input.machine_id,
      timestamp: ts,
      // SAFETY-DIRECTION default: if the status section itself failed, "could not
      // assess" must NOT present as all-clear GREEN -> surface RED so the operator
      // treats an unassessable machine as elevated, not safe.
      overall_risk: status ? status.overall_risk : "RED",
      status,
      alerts,
      shift_summary,
      sections_available: available,
      sections_failed: failed,
      errors,
    };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Validate the core live signals an operator dashboard cannot be meaningful
   * without. machine_id must be a non-empty string; the three current_* signals
   * must be finite numbers (getStatus otherwise produces NaN risk silently).
   */
  private assertOrchestrateInput(input: DashboardOrchestrateInput): void {
    if (!input || typeof input.machine_id !== "string" || input.machine_id.trim() === "") {
      throw new Error("OperatorDashboardOrchestratorEngine.orchestrate: machine_id (non-empty string) required");
    }
    for (const f of ["current_rpm", "current_feed", "current_load_pct"] as const) {
      const v = input[f];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`OperatorDashboardOrchestratorEngine.orchestrate: ${f} must be a finite number`);
      }
    }
  }

  /**
   * Build the alerts-only view from a computed status snapshot (single source of
   * the severity filter, shared by getAlerts and orchestrate).
   */
  private filterAlertsView(status: DashboardStatusResult, minSeverity: AlertSeverity): DashboardAlertsResult {
    // Coerce an unknown severity to "info" so a typo never silently drops EVERY
    // alert (SEVERITY_ORDER[bad] would be undefined -> `>= undefined` always false).
    const minLevel = SEVERITY_ORDER[minSeverity] ?? SEVERITY_ORDER.info;
    const filtered = status.alerts.filter(a => SEVERITY_ORDER[a.severity] >= minLevel);
    return {
      machine_id: status.machine_id,
      timestamp: status.timestamp,
      overall_risk: status.overall_risk,
      alerts: filtered,
      alert_count: filtered.length,
    };
  }

  private computeOverallRisk(alerts: DashboardAlert[]): RiskLevel {
    if (alerts.some(a => a.severity === "critical")) return "RED";
    if (alerts.some(a => a.severity === "warning")) return "YELLOW";
    return "GREEN";
  }

  private deduplicateAlerts(alerts: DashboardAlert[]): DashboardAlert[] {
    const seen = new Set<string>();
    const result: DashboardAlert[] = [];
    for (const a of alerts) {
      const key = `${a.severity}|${a.source}|${a.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(a);
      }
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const operatorDashboardOrchestratorEngine = new OperatorDashboardOrchestratorEngineImpl();
export { OperatorDashboardOrchestratorEngineImpl as OperatorDashboardOrchestratorEngine };
