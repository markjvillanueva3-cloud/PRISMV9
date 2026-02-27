/**
 * PRISM L4-P1-MS1: 6 PASS2 Automation Cadences (M97-M102)
 *
 * M97  autoFRFLibraryMatch      @tool_assembly_created
 * M98  autoToleranceRiskScore   @job_plan_created
 * M99  autoOperatorSkillMatch   @job_assigned
 * M100 autoToolStandardization  @100_tool_changes
 * M101 autoMachineUtilization   @shift_end
 * M102 autoNonConformanceTrend  @quality_event
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

/** M97 autoFRFLibraryMatch — match FRF to predict stability */
const autoFRFLibraryMatch: HookDefinition = {
  id: "cadence-frf-library-match",
  name: "Auto FRF Library Match",
  description:
    "On tool assembly creation, matches frequency response function " +
    "from library to predict chatter stability without tap testing.",
  phase: "post-output",
  category: "automation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "frf", "stability", "chatter", "automation"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const toolId = d.toolAssemblyId ?? d.toolId ?? "unknown";
    const matchScore = d.frfMatchScore ?? 0;
    const warnings: string[] = [];

    if (matchScore < 0.5) {
      warnings.push(
        `Low FRF match (${(matchScore * 100).toFixed(0)}%) — ` +
        "tap test recommended for accurate stability lobes"
      );
    }
    if (d.predictedChatterRisk === "high") {
      warnings.push("Predicted high chatter risk at planned parameters");
    }

    log.info(
      `[cadence] FRF match for ${toolId}: ` +
      `score=${(matchScore * 100).toFixed(0)}%`
    );
    if (warnings.length > 0)
      return hookWarning(autoFRFLibraryMatch,
        `FRF match: ${warnings.length} concerns`, {
          score: matchScore, warnings,
        });
    return hookSuccess(autoFRFLibraryMatch,
      `FRF match OK for ${toolId}`, { score: 1.0 });
  },
};

/** M98 autoToleranceRiskScore — score NCR risk per job */
const autoToleranceRiskScore: HookDefinition = {
  id: "cadence-tolerance-risk-score",
  name: "Auto Tolerance Risk Score",
  description:
    "On job plan creation, scores tolerance non-conformance risk " +
    "based on feature complexity, Cpk history, and machine capability.",
  phase: "post-output",
  category: "automation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "tolerance", "risk", "quality", "automation"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const tightFeatures = d.tightToleranceCount ?? 0;
    const historicalCpk = d.historicalCpk ?? 1.67;
    const riskScore = tightFeatures * (1.33 / Math.max(historicalCpk, 0.5));
    const warnings: string[] = [];

    if (riskScore > 5) {
      warnings.push(
        `High NCR risk (score ${riskScore.toFixed(1)}) — ` +
        `${tightFeatures} tight features, Cpk=${historicalCpk}`
      );
    }
    if (historicalCpk < 1.33) {
      warnings.push(
        `Historical Cpk ${historicalCpk} below 1.33 minimum`
      );
    }

    if (warnings.length > 0)
      return hookWarning(autoToleranceRiskScore,
        `Risk score: ${riskScore.toFixed(1)}`, {
          score: Math.max(0, 1 - riskScore / 10), warnings,
        });
    return hookSuccess(autoToleranceRiskScore,
      `Low NCR risk (${riskScore.toFixed(1)})`, { score: 1.0 });
  },
};

/** M99 autoOperatorSkillMatch — match job to operator */
const autoOperatorSkillMatch: HookDefinition = {
  id: "cadence-operator-skill-match",
  name: "Auto Operator Skill Match",
  description:
    "On job assignment, validates operator skill level matches job " +
    "difficulty. Warns if mismatch detected.",
  phase: "post-output",
  category: "automation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "operator", "skill", "scheduling", "automation"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const jobDifficulty = d.jobDifficulty ?? 1; // 1-5 scale
    const operatorLevel = d.operatorSkillLevel ?? 3;
    const warnings: string[] = [];

    if (jobDifficulty > operatorLevel + 1) {
      warnings.push(
        `Job difficulty ${jobDifficulty} exceeds ` +
        `operator level ${operatorLevel} by >1`
      );
    }
    if (d.requiresCertification && !d.operatorCertified) {
      warnings.push("Job requires certification operator doesn't hold");
    }

    if (warnings.length > 0)
      return hookWarning(autoOperatorSkillMatch,
        `Skill mismatch: ${warnings.length} issues`, {
          score: operatorLevel / Math.max(jobDifficulty, 1),
          warnings,
        });
    return hookSuccess(autoOperatorSkillMatch,
      "Operator skill matches job", { score: 1.0 });
  },
};

/** M100 autoToolStandardization — consolidate tools */
const autoToolStandardization: HookDefinition = {
  id: "cadence-tool-standardization",
  name: "Auto Tool Standardization",
  description:
    "After 100 tool changes, analyzes tool crib for consolidation " +
    "opportunities — reduce unique tools, simplify inventory.",
  phase: "on-session-checkpoint",
  category: "automation",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["cadence", "tool-crib", "standardization", "cost"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const uniqueTools = d.uniqueToolCount ?? 0;
    const toolChanges = d.totalToolChanges ?? 0;
    const warnings: string[] = [];

    if (uniqueTools > 50) {
      warnings.push(
        `${uniqueTools} unique tools — consider standardization`
      );
    }
    const ratio = toolChanges > 0
      ? uniqueTools / toolChanges : 0;
    if (ratio > 0.3) {
      warnings.push(
        "High tool variety ratio — " +
        "many unique tools per change event"
      );
    }

    log.info(
      `[cadence] Tool standardization: ` +
      `${uniqueTools} unique / ${toolChanges} changes`
    );
    if (warnings.length > 0)
      return hookWarning(autoToolStandardization,
        `${warnings.length} standardization opportunities`, {
          score: 0.7, warnings,
        });
    return hookSuccess(autoToolStandardization,
      "Tool crib well-standardized", { score: 1.0 });
  },
};

/** M101 autoMachineUtilization — per-machine utilization at shift end */
const autoMachineUtilization: HookDefinition = {
  id: "cadence-machine-utilization",
  name: "Auto Machine Utilization",
  description:
    "At shift end, calculates per-machine utilization " +
    "(spindle-on time / available time). Flags underutilized machines.",
  phase: "on-session-end",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["cadence", "utilization", "oee", "shift"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const machines = d.machines ?? [];
    const warnings: string[] = [];

    for (const m of machines) {
      const util = m.utilizationPct ?? 0;
      if (util < 50) {
        warnings.push(
          `${m.id ?? "?"}: ${util}% utilization — underutilized`
        );
      }
    }

    log.info(
      `[cadence] Machine utilization: ` +
      `${machines.length} machines analyzed`
    );
    if (warnings.length > 0)
      return hookWarning(autoMachineUtilization,
        `${warnings.length} underutilized machines`, {
          score: 0.6, warnings,
        });
    return hookSuccess(autoMachineUtilization,
      "All machines well-utilized", { score: 1.0 });
  },
};

/** M102 autoNonConformanceTrend — track NCR trends */
const autoNonConformanceTrend: HookDefinition = {
  id: "cadence-ncr-trend",
  name: "Auto Non-Conformance Trend",
  description:
    "On quality event, tracks non-conformance report trends. " +
    "Alerts when NCR rate increases or patterns emerge.",
  phase: "on-quality-drop",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["cadence", "quality", "ncr", "trend", "spc"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const ncrRate = d.ncrRate ?? d.nonConformanceRate ?? 0;
    const prevRate = d.previousNcrRate ?? 0;
    const warnings: string[] = [];

    if (ncrRate > 3) {
      warnings.push(`NCR rate ${ncrRate}% exceeds 3% threshold`);
    }
    if (ncrRate > prevRate * 1.5 && prevRate > 0) {
      warnings.push(
        `NCR rate increased ${((ncrRate / prevRate - 1) * 100).toFixed(0)}% ` +
        "from previous period"
      );
    }
    if (d.repeatDefectType) {
      warnings.push(
        `Repeat defect type: ${d.repeatDefectType} — ` +
        "investigate root cause"
      );
    }

    if (warnings.length > 0)
      return hookWarning(autoNonConformanceTrend,
        `NCR trend: ${warnings.length} concerns`, {
          score: Math.max(0, 1 - ncrRate / 5), warnings,
        });
    return hookSuccess(autoNonConformanceTrend,
      `NCR rate ${ncrRate}% acceptable`, { score: 1.0 });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const specialtyCadences: HookDefinition[] = [
  autoFRFLibraryMatch,
  autoToleranceRiskScore,
  autoOperatorSkillMatch,
  autoToolStandardization,
  autoMachineUtilization,
  autoNonConformanceTrend,
];
