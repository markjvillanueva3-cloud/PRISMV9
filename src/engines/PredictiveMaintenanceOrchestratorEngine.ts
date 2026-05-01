/**
 * PredictiveMaintenanceOrchestratorEngine — Multi-Signal Machine Health & Maintenance Planning
 *
 * Assesses machine health using vibration (ISO 10816), temperature, hours,
 * error counts, and axis backlash signals. Plans maintenance around production
 * schedules and analyzes failure history for MTBF/MTTR/Pareto.
 *
 * @engine PredictiveMaintenanceOrchestratorEngine
 * @dispatcher calcDispatcher
 * @actions maintenance_assess_health, maintenance_plan, maintenance_failure_history
 */

// ── ISO 10816 Vibration Severity Zones (mm/s RMS) ──
const ISO_10816 = {
  good_max: 2.8,
  acceptable_max: 7.1,
  alarm_max: 18.0,
};

// ── Types ──

export interface HealthInput {
  machine_id: string;
  vibration_rms_mm_s?: number;
  spindle_temp_C?: number;
  spindle_hours: number;
  last_maintenance_date: string;
  operating_hours_since_maintenance: number;
  error_count_last_week?: number;
  axis_backlash_um?: Record<string, number>;
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high" | "critical";
  value: number;
  threshold: number;
}

export interface MaintenanceAction {
  action: string;
  urgency: "routine" | "soon" | "urgent" | "immediate";
  estimated_downtime_hours: number;
}

export interface HealthResult {
  health_score: number;
  status: "healthy" | "monitor" | "warning" | "critical";
  risk_factors: RiskFactor[];
  predicted_failure_days?: number;
  recommended_maintenance: MaintenanceAction[];
}

export interface MaintenancePlanInput {
  machines: Array<{
    id: string;
    health_score: number;
    next_maintenance_due: string;
    production_schedule_blocked_dates: string[];
  }>;
}

export interface MaintenancePlanEntry {
  machine_id: string;
  recommended_date: string;
  actions: string[];
  estimated_downtime_hours: number;
}

export interface MaintenancePlanResult {
  maintenance_plan: MaintenancePlanEntry[];
  production_impact_hours: number;
}

export interface FailureRecord {
  machine_id: string;
  date: string;
  component: string;
  cause: string;
  downtime_hours: number;
  cost: number;
}

export interface FailureHistoryInput {
  failures: FailureRecord[];
}

export interface FailureHistoryResult {
  mtbf_hours: Record<string, number>;
  mttr_hours: Record<string, number>;
  pareto_components: Array<{ component: string; failure_count: number; total_cost: number }>;
  trending_issues: string[];
}

// ── Helpers ──

/** Exponential decay health factor: drops after recommended maintenance interval */
function maintenanceDecay(hoursSinceMaintenance: number, intervalHours: number): number {
  if (intervalHours <= 0) return 100;
  const ratio = hoursSinceMaintenance / intervalHours;
  if (ratio <= 0.7) return 100;
  // Exponential decay after 70% of interval
  return Math.max(0, 100 * Math.exp(-2 * (ratio - 0.7)));
}

/** Parse date string to ms */
function parseDate(d: string): number {
  return new Date(d).getTime();
}

/** Format ms to ISO date string */
function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// ── Engine ──

class PredictiveMaintenanceOrchestratorEngine {
  /** Default maintenance interval in hours */
  private readonly MAINTENANCE_INTERVAL_HOURS = 2000;
  /** Baseline spindle temperature */
  private readonly BASELINE_TEMP_C = 35;
  /** Max acceptable backlash (um) */
  private readonly BACKLASH_THRESHOLD_UM = 15;
  /** Max acceptable error count per week */
  private readonly ERROR_THRESHOLD_WEEK = 5;

  /**
   * Multi-signal health scoring. Each signal contributes a weighted score.
   * Weights: vibration 30%, temperature 15%, hours 25%, errors 15%, backlash 15%.
   */
  assessMachineHealth(input: HealthInput): HealthResult {
    const riskFactors: RiskFactor[] = [];
    const actions: MaintenanceAction[] = [];
    const weights = { vibration: 30, temperature: 15, hours: 25, errors: 15, backlash: 15 };
    let totalWeight = 0;
    let weightedScore = 0;

    // ── Vibration (ISO 10816) ──
    if (input.vibration_rms_mm_s !== undefined) {
      const v = input.vibration_rms_mm_s;
      let vScore: number;
      let severity: RiskFactor["severity"];
      if (v <= ISO_10816.good_max) {
        vScore = 100;
        severity = "low";
      } else if (v <= ISO_10816.acceptable_max) {
        vScore = 100 - ((v - ISO_10816.good_max) / (ISO_10816.acceptable_max - ISO_10816.good_max)) * 40;
        severity = "medium";
      } else if (v <= ISO_10816.alarm_max) {
        vScore = 60 - ((v - ISO_10816.acceptable_max) / (ISO_10816.alarm_max - ISO_10816.acceptable_max)) * 40;
        severity = "high";
      } else {
        vScore = Math.max(0, 20 - (v - ISO_10816.alarm_max));
        severity = "critical";
      }
      weightedScore += vScore * weights.vibration;
      totalWeight += weights.vibration;

      if (severity !== "low") {
        riskFactors.push({ factor: "vibration_rms", severity, value: v, threshold: ISO_10816.good_max });
      }
      if (severity === "critical") {
        actions.push({ action: "Immediate vibration diagnostics — check bearings, alignment, balance", urgency: "immediate", estimated_downtime_hours: 4 });
      } else if (severity === "high") {
        actions.push({ action: "Schedule vibration analysis and bearing inspection", urgency: "urgent", estimated_downtime_hours: 2 });
      } else if (severity === "medium") {
        actions.push({ action: "Monitor vibration trend — recheck in 1 week", urgency: "soon", estimated_downtime_hours: 0.5 });
      }
    }

    // ── Spindle Temperature ──
    if (input.spindle_temp_C !== undefined) {
      const t = input.spindle_temp_C;
      const delta = t - this.BASELINE_TEMP_C;
      let tScore: number;
      let severity: RiskFactor["severity"];
      if (delta <= 5) {
        tScore = 100;
        severity = "low";
      } else if (delta <= 15) {
        tScore = 100 - (delta - 5) * 4;
        severity = "medium";
      } else if (delta <= 30) {
        tScore = 60 - (delta - 15) * 2;
        severity = "high";
      } else {
        tScore = Math.max(0, 30 - (delta - 30));
        severity = "critical";
      }
      weightedScore += tScore * weights.temperature;
      totalWeight += weights.temperature;

      if (severity !== "low") {
        riskFactors.push({ factor: "spindle_temperature", severity, value: t, threshold: this.BASELINE_TEMP_C + 15 });
      }
      if (severity === "critical" || severity === "high") {
        actions.push({ action: "Check spindle cooling system and lubrication", urgency: severity === "critical" ? "immediate" : "urgent", estimated_downtime_hours: 3 });
      }
    }

    // ── Operating Hours Since Maintenance ──
    {
      const h = input.operating_hours_since_maintenance;
      const hScore = maintenanceDecay(h, this.MAINTENANCE_INTERVAL_HOURS);
      weightedScore += hScore * weights.hours;
      totalWeight += weights.hours;

      const ratio = h / this.MAINTENANCE_INTERVAL_HOURS;
      if (ratio > 1.2) {
        riskFactors.push({ factor: "overdue_maintenance", severity: "critical", value: h, threshold: this.MAINTENANCE_INTERVAL_HOURS });
        actions.push({ action: "Overdue preventive maintenance — schedule immediately", urgency: "immediate", estimated_downtime_hours: 8 });
      } else if (ratio > 1.0) {
        riskFactors.push({ factor: "overdue_maintenance", severity: "high", value: h, threshold: this.MAINTENANCE_INTERVAL_HOURS });
        actions.push({ action: "Preventive maintenance due — schedule this week", urgency: "urgent", estimated_downtime_hours: 8 });
      } else if (ratio > 0.85) {
        riskFactors.push({ factor: "maintenance_approaching", severity: "medium", value: h, threshold: this.MAINTENANCE_INTERVAL_HOURS });
        actions.push({ action: "Plan preventive maintenance within 2 weeks", urgency: "soon", estimated_downtime_hours: 8 });
      }
    }

    // ── Error Count ──
    if (input.error_count_last_week !== undefined) {
      const e = input.error_count_last_week;
      let eScore: number;
      let severity: RiskFactor["severity"];
      if (e <= 1) {
        eScore = 100;
        severity = "low";
      } else if (e <= this.ERROR_THRESHOLD_WEEK) {
        eScore = 100 - (e - 1) * 15;
        severity = "medium";
      } else if (e <= this.ERROR_THRESHOLD_WEEK * 2) {
        eScore = 40 - (e - this.ERROR_THRESHOLD_WEEK) * 5;
        severity = "high";
      } else {
        eScore = Math.max(0, 15 - (e - this.ERROR_THRESHOLD_WEEK * 2) * 3);
        severity = "critical";
      }
      weightedScore += eScore * weights.errors;
      totalWeight += weights.errors;

      if (severity !== "low") {
        riskFactors.push({ factor: "error_count", severity, value: e, threshold: this.ERROR_THRESHOLD_WEEK });
      }
      if (severity === "critical" || severity === "high") {
        actions.push({ action: "Investigate recurring errors — review alarm log", urgency: "urgent", estimated_downtime_hours: 2 });
      }
    }

    // ── Axis Backlash ──
    if (input.axis_backlash_um) {
      const axes = input.axis_backlash_um;
      let worstScore = 100;
      let worstAxis = "";
      let worstValue = 0;
      for (const [axis, bl] of Object.entries(axes)) {
        let aScore: number;
        if (bl <= this.BACKLASH_THRESHOLD_UM * 0.5) {
          aScore = 100;
        } else if (bl <= this.BACKLASH_THRESHOLD_UM) {
          aScore = 100 - ((bl - this.BACKLASH_THRESHOLD_UM * 0.5) / (this.BACKLASH_THRESHOLD_UM * 0.5)) * 40;
        } else if (bl <= this.BACKLASH_THRESHOLD_UM * 2) {
          aScore = 60 - ((bl - this.BACKLASH_THRESHOLD_UM) / this.BACKLASH_THRESHOLD_UM) * 40;
        } else {
          aScore = Math.max(0, 20 - (bl - this.BACKLASH_THRESHOLD_UM * 2) / this.BACKLASH_THRESHOLD_UM * 20);
        }
        if (aScore < worstScore) {
          worstScore = aScore;
          worstAxis = axis;
          worstValue = bl;
        }
      }
      weightedScore += worstScore * weights.backlash;
      totalWeight += weights.backlash;

      if (worstValue > this.BACKLASH_THRESHOLD_UM) {
        const severity: RiskFactor["severity"] = worstValue > this.BACKLASH_THRESHOLD_UM * 2 ? "critical" : "high";
        riskFactors.push({ factor: `backlash_${worstAxis}`, severity, value: worstValue, threshold: this.BACKLASH_THRESHOLD_UM });
        actions.push({
          action: `${worstAxis}-axis backlash compensation or ballscrew inspection needed`,
          urgency: severity === "critical" ? "immediate" : "urgent",
          estimated_downtime_hours: severity === "critical" ? 16 : 4,
        });
      } else if (worstValue > this.BACKLASH_THRESHOLD_UM * 0.7) {
        riskFactors.push({ factor: `backlash_${worstAxis}`, severity: "medium", value: worstValue, threshold: this.BACKLASH_THRESHOLD_UM });
      }
    }

    // ── Composite Score ──
    const healthScore = totalWeight > 0
      ? Math.round((weightedScore / totalWeight) * 10) / 10
      : 50; // No signals → unknown

    let status: HealthResult["status"];
    if (healthScore >= 80) status = "healthy";
    else if (healthScore >= 60) status = "monitor";
    else if (healthScore >= 35) status = "warning";
    else status = "critical";

    // ── Predicted Failure Days ──
    // Simple exponential model: days_to_fail ~ k * e^(health/20)
    let predictedFailureDays: number | undefined;
    if (healthScore < 80) {
      // At score 0 -> ~1 day, at score 60 -> ~20 days, at score 80 -> ~55 days
      predictedFailureDays = Math.round(Math.exp(healthScore / 20) * 0.7);
    }

    // Add routine maintenance if no urgent actions
    if (actions.length === 0) {
      actions.push({ action: "Continue regular maintenance schedule", urgency: "routine", estimated_downtime_hours: 0 });
    }

    return {
      health_score: healthScore,
      status,
      risk_factors: riskFactors,
      predicted_failure_days: predictedFailureDays,
      recommended_maintenance: actions,
    };
  }

  /**
   * Plan maintenance across multiple machines, avoiding production blocked dates.
   * Prioritizes by health score (lowest first).
   */
  planMaintenance(input: MaintenancePlanInput): MaintenancePlanResult {
    const { machines } = input;
    if (!machines || machines.length === 0) {
      return { maintenance_plan: [], production_impact_hours: 0 };
    }

    // Sort by health score ascending (worst first)
    const sorted = [...machines].sort((a, b) => a.health_score - b.health_score);
    const plan: MaintenancePlanEntry[] = [];
    let totalImpact = 0;

    for (const m of sorted) {
      const dueDate = parseDate(m.next_maintenance_due);
      const blockedSet = new Set(m.production_schedule_blocked_dates);

      // Find the earliest non-blocked date starting from due date
      let candidateMs = dueDate;
      let attempts = 0;
      while (attempts < 60) {
        const candidateStr = toDateStr(candidateMs);
        if (!blockedSet.has(candidateStr)) break;
        candidateMs += 86400000; // next day
        attempts++;
      }

      const actions: string[] = [];
      let downtime: number;
      if (m.health_score < 35) {
        actions.push("Full preventive maintenance", "Bearing inspection", "Alignment check", "Coolant system flush");
        downtime = 12;
      } else if (m.health_score < 60) {
        actions.push("Standard preventive maintenance", "Lubrication", "Filter replacement");
        downtime = 8;
      } else if (m.health_score < 80) {
        actions.push("Light maintenance", "Inspection", "Calibration check");
        downtime = 4;
      } else {
        actions.push("Routine inspection");
        downtime = 2;
      }

      plan.push({
        machine_id: m.id,
        recommended_date: toDateStr(candidateMs),
        actions,
        estimated_downtime_hours: downtime,
      });

      totalImpact += downtime;
    }

    return { maintenance_plan: plan, production_impact_hours: totalImpact };
  }

  /**
   * Analyze failure history for MTBF, MTTR, Pareto, and trending issues.
   */
  analyzeFailureHistory(input: FailureHistoryInput): FailureHistoryResult {
    const { failures } = input;
    if (!failures || failures.length === 0) {
      return { mtbf_hours: {}, mttr_hours: {}, pareto_components: [], trending_issues: [] };
    }

    // Group by machine
    const byMachine: Record<string, FailureRecord[]> = {};
    for (const f of failures) {
      if (!byMachine[f.machine_id]) byMachine[f.machine_id] = [];
      byMachine[f.machine_id].push(f);
    }

    // MTBF: mean time between failures per machine
    const mtbf: Record<string, number> = {};
    const mttr: Record<string, number> = {};

    for (const [machineId, recs] of Object.entries(byMachine)) {
      // Sort by date
      const sorted = [...recs].sort((a, b) => parseDate(a.date) - parseDate(b.date));

      // MTBF = total span / (failure count - 1), converted to hours
      if (sorted.length >= 2) {
        const spanMs = parseDate(sorted[sorted.length - 1].date) - parseDate(sorted[0].date);
        const spanHours = spanMs / 3600000;
        mtbf[machineId] = Math.round((spanHours / (sorted.length - 1)) * 10) / 10;
      } else {
        mtbf[machineId] = 0; // Not enough data
      }

      // MTTR = average downtime
      const totalDowntime = sorted.reduce((s, r) => s + r.downtime_hours, 0);
      mttr[machineId] = Math.round((totalDowntime / sorted.length) * 10) / 10;
    }

    // Pareto: component failure count and cost
    const componentMap: Record<string, { count: number; cost: number }> = {};
    for (const f of failures) {
      if (!componentMap[f.component]) componentMap[f.component] = { count: 0, cost: 0 };
      componentMap[f.component].count++;
      componentMap[f.component].cost += f.cost;
    }
    const pareto = Object.entries(componentMap)
      .map(([component, data]) => ({
        component,
        failure_count: data.count,
        total_cost: Math.round(data.cost * 100) / 100,
      }))
      .sort((a, b) => b.failure_count - a.failure_count);

    // Trending issues: components with increasing failure rate in recent period
    const trending: string[] = [];
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const sixtyDaysAgo = now - 60 * 86400000;

    for (const [component] of Object.entries(componentMap)) {
      const recentCount = failures.filter(f =>
        f.component === component && parseDate(f.date) >= thirtyDaysAgo
      ).length;
      const priorCount = failures.filter(f =>
        f.component === component &&
        parseDate(f.date) >= sixtyDaysAgo &&
        parseDate(f.date) < thirtyDaysAgo
      ).length;

      if (recentCount > priorCount && recentCount >= 2) {
        trending.push(`${component}: ${priorCount}→${recentCount} failures (30-day trend ↑)`);
      }
    }

    return { mtbf_hours: mtbf, mttr_hours: mttr, pareto_components: pareto, trending_issues: trending };
  }
}

/** Singleton */
export const predictiveMaintenanceOrchestratorEngine = new PredictiveMaintenanceOrchestratorEngine();
