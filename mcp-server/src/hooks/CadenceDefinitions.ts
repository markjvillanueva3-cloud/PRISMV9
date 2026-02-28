/**
 * PRISM L4-P0-MS1: 6 Core Cadence Definitions
 *
 * Cadences are scheduled hooks that fire at regular intervals:
 *   #218 daily_tool_wear_check
 *   #219 weekly_maintenance_forecast
 *   #220 hourly_machine_health
 *   #221 shift_change_handoff
 *   #222 monthly_cost_analysis
 *   #223 quarterly_calibration_reminder
 *
 * These are registered with the CadenceExecutor and fire via the hook system.
 *
 * @version 1.0.0
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CADENCE DEFINITIONS
// ============================================================================

/** #218 daily_tool_wear_check — reviews tool wear across all active jobs */
const dailyToolWearCheck: HookDefinition = {
  id: "cadence-daily-tool-wear",
  name: "Daily Tool Wear Check",
  description:
    "Reviews flank wear, crater wear, and remaining life for all active tools. Flags any needing replacement within next shift.",
  phase: "on-tool-life-warning",
  event: "phase.post-safety-check",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["cadence", "daily", "tool-wear", "maintenance"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const tools = d.activeTools ?? [];
    const warnings: string[] = [];
    let criticalCount = 0;

    for (const tool of tools) {
      const life = tool.lifeRemainingPct ?? 100;
      if (life < 10) {
        warnings.push(`${tool.id ?? "?"}: ${life}% life — REPLACE NOW`);
        criticalCount++;
      } else if (life < 25) {
        warnings.push(`${tool.id ?? "?"}: ${life}% life — replace this shift`);
      }
    }

    log.info(`[cadence] Daily tool wear: ${tools.length} tools, ${criticalCount} critical`);
    if (warnings.length > 0)
      return hookWarning(dailyToolWearCheck, `${warnings.length} tools need attention`, {
        score: 1 - criticalCount / Math.max(tools.length, 1),
        warnings,
      });
    return hookSuccess(dailyToolWearCheck, `${tools.length} tools OK`, { score: 1.0 });
  },
};

/** #219 weekly_maintenance_forecast — predicts maintenance needs for next week */
const weeklyMaintenanceForecast: HookDefinition = {
  id: "cadence-weekly-maintenance",
  name: "Weekly Maintenance Forecast",
  description:
    "Forecasts maintenance requirements for the coming week based on machine hours, vibration trends, and historical failure data.",
  phase: "on-session-checkpoint",
  event: "phase.post-calculation",
  category: "automation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "weekly", "maintenance", "predictive"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const machines = d.machines ?? [];
    const recommendations: string[] = [];

    for (const m of machines) {
      const hrs = m.hoursSinceService ?? 0;
      const interval = m.serviceInterval_hrs ?? 500;
      if (hrs > interval * 0.9) {
        recommendations.push(`${m.id ?? "?"}: ${hrs}h/${interval}h — service due`);
      }
      if (m.vibrationTrend === "increasing") {
        recommendations.push(`${m.id ?? "?"}: Vibration trend increasing — inspect bearings`);
      }
    }

    log.info(`[cadence] Weekly maintenance: ${machines.length} machines, ${recommendations.length} actions`);
    if (recommendations.length > 0)
      return hookWarning(weeklyMaintenanceForecast, `${recommendations.length} maintenance items`, {
        score: 0.7,
        warnings: recommendations,
      });
    return hookSuccess(weeklyMaintenanceForecast, "No maintenance due", { score: 1.0 });
  },
};

/** #220 hourly_machine_health — quick health snapshot every hour */
const hourlyMachineHealth: HookDefinition = {
  id: "cadence-hourly-machine-health",
  name: "Hourly Machine Health Check",
  description:
    "Captures machine health snapshot: spindle temperature, vibration level, axis backlash, coolant level.",
  phase: "on-session-checkpoint",
  event: "phase.post-data-query",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "hourly", "machine", "health"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];

    if (d.spindleTemp_C && d.spindleTemp_C > 65)
      warnings.push(`Spindle temp ${d.spindleTemp_C}C > 65C threshold`);
    if (d.vibration_mm_s && d.vibration_mm_s > 4.5)
      warnings.push(`Vibration ${d.vibration_mm_s} mm/s > 4.5 alarm`);
    if (d.coolantLevel_pct && d.coolantLevel_pct < 20)
      warnings.push(`Coolant level ${d.coolantLevel_pct}% — refill needed`);
    if (d.axisBacklash_um && d.axisBacklash_um > 10)
      warnings.push(`Axis backlash ${d.axisBacklash_um} um > 10 um limit`);

    if (warnings.length > 0)
      return hookWarning(hourlyMachineHealth, warnings.join("; "), { score: 0.6, warnings });
    return hookSuccess(hourlyMachineHealth, "Machine health OK", { score: 1.0 });
  },
};

/** #221 shift_change_handoff — generates handoff report at shift change */
const shiftChangeHandoff: HookDefinition = {
  id: "cadence-shift-handoff",
  name: "Shift Change Handoff",
  description:
    "Generates shift handoff report: active jobs, machine status, pending issues, tool changes needed.",
  phase: "on-session-end",
  event: "phase.post-export",
  category: "automation",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "shift", "handoff", "report"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const report = {
      shift: d.shift ?? "unknown",
      activeJobs: d.activeJobs ?? 0,
      completedThisShift: d.completedThisShift ?? 0,
      pendingIssues: d.pendingIssues ?? [],
      toolChangesNeeded: d.toolChangesNeeded ?? [],
      machineAlerts: d.machineAlerts ?? [],
      notes: d.operatorNotes ?? "",
    };
    log.info(`[cadence] Shift handoff: ${report.activeJobs} active, ${report.completedThisShift} completed, ${report.pendingIssues.length} issues`);
    return hookSuccess(shiftChangeHandoff, "Handoff report generated", {
      score: 1.0,
      data: report,
    });
  },
};

/** #222 monthly_cost_analysis — aggregates monthly manufacturing costs */
const monthlyCostAnalysis: HookDefinition = {
  id: "cadence-monthly-cost",
  name: "Monthly Cost Analysis",
  description:
    "Aggregates monthly cost data: tooling spend, machine time, material waste, energy consumption.",
  phase: "on-session-checkpoint",
  event: "phase.post-calculation",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["cadence", "monthly", "cost", "analysis"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];
    if (d.toolingSpend && d.toolingBudget && d.toolingSpend > d.toolingBudget * 0.9)
      warnings.push(`Tooling spend at ${((d.toolingSpend / d.toolingBudget) * 100).toFixed(0)}% of budget`);
    if (d.scrapRate && d.scrapRate > 3)
      warnings.push(`Scrap rate ${d.scrapRate}% exceeds 3% target`);

    log.info(`[cadence] Monthly cost: tooling $${d.toolingSpend ?? "?"}, machine $${d.machineCost ?? "?"}`);
    if (warnings.length > 0)
      return hookWarning(monthlyCostAnalysis, warnings.join("; "), { score: 0.7, warnings });
    return hookSuccess(monthlyCostAnalysis, "Costs within budget", { score: 1.0 });
  },
};

/** #223 quarterly_calibration_reminder — flags machines due for calibration */
const quarterlyCalibrationReminder: HookDefinition = {
  id: "cadence-quarterly-calibration",
  name: "Quarterly Calibration Reminder",
  description:
    "Checks machine calibration dates and flags those overdue or due within 30 days.",
  phase: "on-session-checkpoint",
  event: "phase.post-quality-check",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "quarterly", "calibration", "quality"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const machines = d.machines ?? [];
    const warnings: string[] = [];

    for (const m of machines) {
      const daysSinceCal = m.daysSinceCalibration ?? 0;
      const calInterval = m.calibrationInterval_days ?? 90;
      if (daysSinceCal > calInterval)
        warnings.push(`${m.id ?? "?"}: OVERDUE (${daysSinceCal}d / ${calInterval}d interval)`);
      else if (daysSinceCal > calInterval - 30)
        warnings.push(`${m.id ?? "?"}: Due within 30 days (${calInterval - daysSinceCal}d remaining)`);
    }

    if (warnings.length > 0)
      return hookWarning(quarterlyCalibrationReminder, `${warnings.length} machines need calibration`, {
        score: 0.5,
        warnings,
      });
    return hookSuccess(quarterlyCalibrationReminder, "All machines calibrated", { score: 1.0 });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cadenceHooks: HookDefinition[] = [
  dailyToolWearCheck,
  weeklyMaintenanceForecast,
  hourlyMachineHealth,
  shiftChangeHandoff,
  monthlyCostAnalysis,
  quarterlyCalibrationReminder,
];
