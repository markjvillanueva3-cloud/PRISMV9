/**
 * PRISM L4-P0-MS1: Safety + Quality + Business + System Hooks
 *
 * 20 core hooks:
 *   5 Safety (BLOCKING — SAFETY-CRITICAL)
 *   4 Quality (warning)
 *   4 Business (logging)
 *   7 System (mixed: 2 blocking for auth/rate-limit, 5 logging/warning)
 *
 * These hooks integrate with HookExecutor and fire via prism_hook dispatcher.
 *
 * @version 1.0.0
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SAFETY HOOKS (5) — BLOCKING — LIVES DEPEND ON THESE
// ============================================================================

/** #198 pre_calculate_safety — blocks unsafe cutting parameter inputs */
const preCalculateSafety: HookDefinition = {
  id: "pre-calculate-safety",
  name: "Pre-Calculate Safety Gate",
  description:
    "Validates cutting parameters BEFORE calculation. BLOCKS if spindle speed, feed, or DOC exceed machine/tool limits.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "pre-calc", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    // Spindle speed sanity
    if (d.spindleRpm && d.spindleRpm > 60000)
      issues.push(`Spindle RPM ${d.spindleRpm} exceeds 60 000 max`);
    if (d.spindleRpm && d.spindleRpm < 0)
      issues.push("Negative spindle RPM");

    // Feed rate sanity
    if (d.feedRate && d.feedRate > 50000)
      issues.push(`Feed rate ${d.feedRate} mm/min exceeds 50 000 max`);
    if (d.feedPerTooth && d.feedPerTooth > 1.0)
      issues.push(`Feed/tooth ${d.feedPerTooth} mm exceeds 1.0 max`);

    // Depth of cut
    if (d.depthOfCut && d.depthOfCut > 50)
      issues.push(`DOC ${d.depthOfCut} mm exceeds 50 mm max`);

    // Tool diameter consistency
    if (d.toolDiameter && d.toolDiameter <= 0)
      issues.push("Tool diameter must be positive");

    if (issues.length > 0) {
      return hookBlock(
        preCalculateSafety,
        `SAFETY BLOCK: ${issues.length} parameter violation(s)`,
        { score: 0, threshold: 1.0, issues },
      );
    }
    return hookSuccess(preCalculateSafety, "Pre-calc safety passed", {
      score: 1.0,
    });
  },
};

/** #199 post_calculate_safety — blocks if calculated forces/power are dangerous */
const postCalculateSafety: HookDefinition = {
  id: "post-calculate-safety",
  name: "Post-Calculate Safety Gate",
  description:
    "Validates calculation RESULTS. BLOCKS if cutting force, power, or torque exceed safe limits.",
  phase: "post-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "post-calc", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    if (d.cuttingForce_N && d.cuttingForce_N > 100000)
      issues.push(`Cutting force ${d.cuttingForce_N} N exceeds 100 kN`);
    if (d.spindlePower_kW && d.spindlePower_kW > 150)
      issues.push(`Spindle power ${d.spindlePower_kW} kW exceeds 150 kW`);
    if (d.torque_Nm && d.torque_Nm > 5000)
      issues.push(`Torque ${d.torque_Nm} Nm exceeds 5000 Nm`);
    if (d.deflection_mm && d.deflection_mm > 0.5)
      issues.push(`Deflection ${d.deflection_mm} mm exceeds 0.5 mm`);

    if (issues.length > 0) {
      return hookBlock(
        postCalculateSafety,
        `SAFETY BLOCK: Dangerous calculation results`,
        { score: 0, threshold: 1.0, issues },
      );
    }
    return hookSuccess(postCalculateSafety, "Post-calc safety passed", {
      score: 1.0,
    });
  },
};

/** #200 pre_gcode_safety — blocks G-code generation with unsafe parameters */
const preGcodeSafety: HookDefinition = {
  id: "pre-gcode-safety",
  name: "Pre-G-code Safety Gate",
  description:
    "Validates parameters BEFORE G-code generation. BLOCKS if feeds, speeds, or rapids are unsafe.",
  phase: "pre-code-generate",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "gcode", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    if (d.rapidTraverse_mm_min && d.rapidTraverse_mm_min > 100000)
      issues.push(`Rapid traverse ${d.rapidTraverse_mm_min} mm/min exceeds 100 m/min`);
    if (d.spindleRpm && d.spindleRpm > 60000)
      issues.push(`Spindle RPM ${d.spindleRpm} exceeds 60 000`);
    if (d.feedRate_mm_min && d.feedRate_mm_min > 50000)
      issues.push(`Feed rate ${d.feedRate_mm_min} mm/min exceeds 50 m/min`);
    // Z-axis plunge rate sanity
    if (d.plungeRate_mm_min && d.plungeRate_mm_min > 10000)
      issues.push(`Plunge rate ${d.plungeRate_mm_min} mm/min exceeds 10 m/min`);
    // Coolant code validation
    if (d.coolantCode && !["M7", "M8", "M9", "M7M8"].includes(d.coolantCode))
      issues.push(`Unknown coolant code: ${d.coolantCode}`);

    if (issues.length > 0) {
      return hookBlock(preGcodeSafety, `G-CODE SAFETY BLOCK`, {
        score: 0,
        threshold: 1.0,
        issues,
      });
    }
    return hookSuccess(preGcodeSafety, "G-code safety passed", { score: 1.0 });
  },
};

/** #201 post_toolpath_safety — blocks toolpath results with collision/out-of-envelope */
const postToolpathSafety: HookDefinition = {
  id: "post-toolpath-safety",
  name: "Post-Toolpath Safety Gate",
  description:
    "Validates toolpath output. BLOCKS if collision detected, work envelope exceeded, or rapid through material.",
  phase: "post-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "toolpath", "collision", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];

    if (d.collisionDetected) issues.push("COLLISION DETECTED in toolpath");
    if (d.envelopeExceeded) issues.push("Work envelope exceeded");
    if (d.rapidThroughMaterial)
      issues.push("Rapid traverse through material — crash risk");
    if (d.gougeDetected) issues.push("Gouge detected — surface damage risk");
    if (d.minClearance_mm !== undefined && d.minClearance_mm < 1.0)
      issues.push(
        `Minimum clearance ${d.minClearance_mm} mm < 1 mm — collision risk`,
      );

    if (issues.length > 0) {
      return hookBlock(postToolpathSafety, `TOOLPATH SAFETY BLOCK`, {
        score: 0,
        threshold: 1.0,
        issues,
      });
    }
    return hookSuccess(postToolpathSafety, "Toolpath safety passed", {
      score: 1.0,
    });
  },
};

/** #202 machine_limit_guard — blocks commands exceeding machine axis limits */
const machineLimitGuard: HookDefinition = {
  id: "machine-limit-guard",
  name: "Machine Limit Guard",
  description:
    "Validates commands against machine axis travel, spindle speed, and torque limits. BLOCKS if exceeded.",
  phase: "on-machine-limit",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "critical", "machine", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const limits = (d.machineLimits ?? {}) as Record<string, number>;
    const issues: string[] = [];

    if (limits.maxRpm && d.spindleRpm > limits.maxRpm)
      issues.push(
        `Spindle ${d.spindleRpm} RPM > machine max ${limits.maxRpm}`,
      );
    if (limits.maxPower_kW && d.power_kW > limits.maxPower_kW)
      issues.push(
        `Power ${d.power_kW} kW > machine max ${limits.maxPower_kW}`,
      );
    if (limits.maxTorque_Nm && d.torque_Nm > limits.maxTorque_Nm)
      issues.push(
        `Torque ${d.torque_Nm} Nm > machine max ${limits.maxTorque_Nm}`,
      );
    // Axis travel checks
    for (const axis of ["X", "Y", "Z", "A", "B", "C"]) {
      const pos = d[`${axis}_mm`];
      const max = limits[`max${axis}_mm`];
      const min = limits[`min${axis}_mm`];
      if (pos !== undefined && max !== undefined && pos > max)
        issues.push(`${axis}=${pos} mm > max ${max} mm`);
      if (pos !== undefined && min !== undefined && pos < min)
        issues.push(`${axis}=${pos} mm < min ${min} mm`);
    }

    if (issues.length > 0) {
      return hookBlock(machineLimitGuard, `MACHINE LIMIT EXCEEDED`, {
        score: 0,
        threshold: 1.0,
        issues,
      });
    }
    return hookSuccess(machineLimitGuard, "Within machine limits", {
      score: 1.0,
    });
  },
};

// ============================================================================
// QUALITY HOOKS (4) — WARNING
// ============================================================================

/** #203 post_measurement_spc — SPC check after measurement */
const postMeasurementSpc: HookDefinition = {
  id: "post-measurement-spc",
  name: "Post-Measurement SPC Check",
  description:
    "Evaluates measurement data against SPC control limits. Warns if out of control.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "spc", "measurement"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];

    if (d.cpk !== undefined && d.cpk < 1.33)
      warnings.push(`Cpk ${d.cpk} below 1.33 minimum — process not capable`);
    if (d.cp !== undefined && d.cp < 1.33)
      warnings.push(`Cp ${d.cp} below 1.33 — excessive variation`);
    if (d.outOfControl)
      warnings.push("SPC: Out-of-control condition detected (Western Electric rules)");
    if (d.trendDetected)
      warnings.push("SPC: Trend detected — 7+ consecutive points in one direction");

    if (warnings.length > 0) {
      return hookWarning(postMeasurementSpc, `SPC warnings: ${warnings.length}`, {
        score: 0.6,
        warnings,
      });
    }
    return hookSuccess(postMeasurementSpc, "SPC within control", { score: 1.0 });
  },
};

/** #204 tolerance_drift_alert — warns when dimensions trend toward limits */
const toleranceDriftAlert: HookDefinition = {
  id: "tolerance-drift-alert",
  name: "Tolerance Drift Alert",
  description:
    "Monitors dimensional measurements for drift toward tolerance boundaries. Warns at 75% of tolerance consumed.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "tolerance", "drift"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];
    const nominal = d.nominal ?? 0;
    const upper = d.upperTolerance ?? d.tolerance ?? 0.05;
    const lower = d.lowerTolerance ?? -(d.tolerance ?? 0.05);
    const actual = d.actualDimension ?? d.measured;

    if (actual !== undefined) {
      const totalBand = upper - lower;
      const deviation = actual - nominal;
      const consumedPct = totalBand > 0 ? Math.abs(deviation - (upper + lower) / 2) / (totalBand / 2) : 0;

      if (consumedPct > 1.0)
        warnings.push(`OUT OF TOLERANCE: ${(consumedPct * 100).toFixed(1)}% consumed`);
      else if (consumedPct > 0.75)
        warnings.push(`Drift alert: ${(consumedPct * 100).toFixed(1)}% of tolerance consumed`);
    }

    if (d.driftRate && Math.abs(d.driftRate) > 0.001)
      warnings.push(`Dimensional drift rate: ${d.driftRate} mm/part`);

    if (warnings.length > 0)
      return hookWarning(toleranceDriftAlert, warnings.join("; "), { score: 0.7, warnings });
    return hookSuccess(toleranceDriftAlert, "Dimensions stable", { score: 1.0 });
  },
};

/** #205 tool_wear_threshold — warns when tool wear approaches change limit */
const toolWearThreshold: HookDefinition = {
  id: "tool-wear-threshold",
  name: "Tool Wear Threshold Alert",
  description:
    "Monitors tool wear (flank, crater, notch) and warns when approaching change threshold.",
  phase: "on-tool-life-warning",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "tool-wear", "tool-life"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];

    const flankWear = d.flankWear_mm ?? d.VB;
    const craterWear = d.craterWear_mm ?? d.KT;
    const lifeRemaining = d.toolLifeRemaining_pct ?? d.lifeRemainingPct;

    if (flankWear !== undefined && flankWear > 0.3)
      warnings.push(`Flank wear VB=${flankWear} mm exceeds 0.3 mm limit`);
    if (craterWear !== undefined && craterWear > 0.1)
      warnings.push(`Crater wear KT=${craterWear} mm exceeds 0.1 mm limit`);
    if (lifeRemaining !== undefined && lifeRemaining < 15)
      warnings.push(`Tool life remaining: ${lifeRemaining}% — schedule change`);

    if (warnings.length > 0)
      return hookWarning(toolWearThreshold, warnings.join("; "), { score: 0.5, warnings });
    return hookSuccess(toolWearThreshold, "Tool wear within limits", { score: 1.0 });
  },
};

/** #206 surface_quality_gate — warns if predicted surface finish exceeds spec */
const surfaceQualityGate: HookDefinition = {
  id: "surface-quality-gate",
  name: "Surface Quality Gate",
  description:
    "Validates predicted or measured surface roughness against specification. Warns if Ra exceeds target.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "surface", "Ra"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];
    const Ra = d.Ra_um ?? d.surfaceRoughness ?? d.predicted_Ra;
    const target = d.targetRa_um ?? d.specRa ?? 1.6;

    if (Ra !== undefined && Ra > target)
      warnings.push(`Surface Ra ${Ra} um exceeds target ${target} um`);
    if (Ra !== undefined && Ra > target * 1.5)
      warnings.push(`Surface finish severely exceeded — consider reduced feed or sharper tool`);

    if (warnings.length > 0)
      return hookWarning(surfaceQualityGate, warnings.join("; "), { score: target / (Ra || 1), warnings });
    return hookSuccess(surfaceQualityGate, "Surface finish acceptable", { score: 1.0 });
  },
};

// ============================================================================
// BUSINESS HOOKS (4) — LOGGING
// ============================================================================

/** #207 job_cost_update — logs cost impact of parameter changes */
const jobCostUpdate: HookDefinition = {
  id: "job-cost-update",
  name: "Job Cost Update",
  description:
    "Tracks cost implications when cutting parameters change — logs updated cycle time, tool cost, machine cost.",
  phase: "post-calculation",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["business", "cost", "job"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const cycleTime = d.cycleTime_min ?? d.machiningTime;
    const toolCost = d.toolCost ?? 0;
    const machineRate = d.machineRate_hr ?? 85;
    const machineCost = cycleTime ? (cycleTime / 60) * machineRate : 0;
    log.info(`[job-cost-update] Cycle: ${cycleTime?.toFixed(2) ?? "?"}min, Tool: $${toolCost}, Machine: $${machineCost.toFixed(2)}`);
    return hookSuccess(jobCostUpdate, "Cost updated", {
      score: 1.0,
      data: { cycleTime, toolCost, machineCost, totalPartCost: toolCost + machineCost },
    });
  },
};

/** #208 schedule_conflict — logs when job scheduling creates conflicts */
const scheduleConflict: HookDefinition = {
  id: "schedule-conflict",
  name: "Schedule Conflict Detection",
  description: "Detects scheduling conflicts — overlapping jobs, overloaded machines, missed due dates.",
  phase: "post-output",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["business", "scheduling", "conflict"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const conflicts: string[] = [];
    if (d.overlappingJobs?.length) conflicts.push(`${d.overlappingJobs.length} overlapping jobs`);
    if (d.overloadedMachines?.length) conflicts.push(`${d.overloadedMachines.length} overloaded machines`);
    if (d.missedDueDates?.length) conflicts.push(`${d.missedDueDates.length} missed due dates`);
    if (conflicts.length > 0) {
      log.warn(`[schedule-conflict] ${conflicts.join(", ")}`);
      return hookWarning(scheduleConflict, conflicts.join("; "), { score: 0.5, warnings: conflicts });
    }
    return hookSuccess(scheduleConflict, "No scheduling conflicts", { score: 1.0 });
  },
};

/** #209 quote_expiry_alert — logs quotes nearing expiry */
const quoteExpiryAlert: HookDefinition = {
  id: "quote-expiry-alert",
  name: "Quote Expiry Alert",
  description: "Monitors active quotes and alerts when approaching expiry date.",
  phase: "post-output",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["business", "quoting", "expiry"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];
    if (d.daysToExpiry !== undefined && d.daysToExpiry < 7)
      warnings.push(`Quote expires in ${d.daysToExpiry} days`);
    if (d.daysToExpiry !== undefined && d.daysToExpiry < 0)
      warnings.push("Quote EXPIRED");
    if (warnings.length > 0) {
      log.info(`[quote-expiry] ${warnings.join("; ")}`);
      return hookWarning(quoteExpiryAlert, warnings.join("; "), { score: 0.5, warnings });
    }
    return hookSuccess(quoteExpiryAlert, "Quotes current", { score: 1.0 });
  },
};

/** #210 inventory_low_alert — logs low inventory for consumables */
const inventoryLowAlert: HookDefinition = {
  id: "inventory-low-alert",
  name: "Inventory Low Alert",
  description: "Monitors tool crib and consumable inventory, alerts when below reorder point.",
  phase: "post-output",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["business", "inventory", "tools"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const warnings: string[] = [];
    if (d.stockLevel !== undefined && d.reorderPoint !== undefined && d.stockLevel <= d.reorderPoint)
      warnings.push(`${d.itemName ?? "Item"}: stock ${d.stockLevel} <= reorder point ${d.reorderPoint}`);
    if (d.lowItems?.length)
      warnings.push(`${d.lowItems.length} items below reorder point`);
    if (warnings.length > 0) {
      log.warn(`[inventory-low] ${warnings.join("; ")}`);
      return hookWarning(inventoryLowAlert, warnings.join("; "), { score: 0.4, warnings });
    }
    return hookSuccess(inventoryLowAlert, "Inventory adequate", { score: 1.0 });
  },
};

// ============================================================================
// SYSTEM HOOKS (7) — MIXED
// ============================================================================

/** #211 pre_api_auth — BLOCKING: validates API authentication */
const preApiAuth: HookDefinition = {
  id: "pre-api-auth",
  name: "API Authentication Gate",
  description: "Validates API request authentication. BLOCKS unauthenticated requests.",
  phase: "pre-file-read",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["system", "auth", "api", "blocking", "security"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.authenticated === false)
      return hookBlock(preApiAuth, "Authentication required", { score: 0, issues: ["No valid auth token"] });
    if (d.tokenExpired)
      return hookBlock(preApiAuth, "Token expired", { score: 0, issues: ["Auth token expired — refresh required"] });
    return hookSuccess(preApiAuth, "Authenticated", { score: 1.0 });
  },
};

/** #212 post_api_audit — logs all API calls for audit trail */
const postApiAudit: HookDefinition = {
  id: "post-api-audit",
  name: "API Audit Logger",
  description: "Logs all API operations for compliance audit trail.",
  phase: "on-audit",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["system", "audit", "api", "compliance"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    log.info(`[api-audit] ${d.method ?? "?"} ${d.endpoint ?? "?"} by ${d.userId ?? "anonymous"} → ${d.statusCode ?? "?"}`);
    return hookSuccess(postApiAudit, "Audit logged", { score: 1.0 });
  },
};

/** #213 rate_limit_check — BLOCKING: enforces API rate limits */
const rateLimitCheck: HookDefinition = {
  id: "rate-limit-check",
  name: "Rate Limit Check",
  description: "Enforces API rate limiting. BLOCKS requests exceeding limit.",
  phase: "pre-file-read",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["system", "rate-limit", "api", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const remaining = d.rateLimitRemaining ?? 100;
    if (remaining <= 0)
      return hookBlock(rateLimitCheck, "Rate limit exceeded", {
        score: 0,
        issues: [`Rate limit: ${d.rateLimitMax ?? 100} requests/${d.rateLimitWindow ?? "minute"}`],
      });
    if (remaining < 10)
      return hookWarning(rateLimitCheck, `Rate limit: ${remaining} remaining`, { score: 0.3 });
    return hookSuccess(rateLimitCheck, `Rate limit OK: ${remaining} remaining`, { score: 1.0 });
  },
};

/** #214 cache_invalidate — logs cache invalidation events */
const cacheInvalidate: HookDefinition = {
  id: "cache-invalidate",
  name: "Cache Invalidation Logger",
  description: "Logs cache invalidation events for debugging and performance analysis.",
  phase: "post-file-write",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["system", "cache", "performance"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    log.info(`[cache-invalidate] Key: ${d.cacheKey ?? "?"}, Reason: ${d.reason ?? "write"}`);
    return hookSuccess(cacheInvalidate, "Cache invalidated", { score: 1.0 });
  },
};

/** #215 backup_trigger — logs backup creation events */
const backupTrigger: HookDefinition = {
  id: "backup-trigger",
  name: "Backup Trigger",
  description: "Triggers backup on significant data changes.",
  phase: "post-file-write",
  category: "automation",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["system", "backup", "data-safety"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const changeSize = d.bytesWritten ?? d.changeCount ?? 0;
    if (changeSize > 10000) {
      log.info(`[backup-trigger] Significant change (${changeSize}) — backup recommended`);
      return hookWarning(backupTrigger, "Backup recommended after large change", { score: 0.8 });
    }
    return hookSuccess(backupTrigger, "No backup needed", { score: 1.0 });
  },
};

/** #216 health_check_hook — logs system health status */
const healthCheckHook: HookDefinition = {
  id: "health-check-hook",
  name: "Health Check",
  description: "Monitors system health — memory, connections, engine availability.",
  phase: "on-session-checkpoint",
  category: "observability",
  mode: "logging",
  priority: "normal",
  enabled: true,
  tags: ["system", "health", "monitoring"],
  handler: (ctx: HookContext): HookResult => {
    const mem = process.memoryUsage();
    const heapPct = (mem.heapUsed / mem.heapTotal) * 100;
    const warnings: string[] = [];
    if (heapPct > 90) warnings.push(`Heap usage ${heapPct.toFixed(1)}% — pressure`);
    if (heapPct > 95) warnings.push("CRITICAL: Heap near exhaustion");
    if (warnings.length > 0)
      return hookWarning(healthCheckHook, warnings.join("; "), { score: 1 - heapPct / 100, warnings });
    return hookSuccess(healthCheckHook, `Health OK (heap ${heapPct.toFixed(0)}%)`, { score: 1.0 });
  },
};

/** #217 context_overflow_guard — warns on context pressure */
const contextOverflowGuard: HookDefinition = {
  id: "context-overflow-guard",
  name: "Context Overflow Guard",
  description: "Monitors context window usage and warns when approaching limits.",
  phase: "on-context-pressure",
  category: "lifecycle",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["system", "context", "pressure"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const pct = d.contextUsagePct ?? d.pressurePct ?? 0;
    if (pct > 90)
      return hookWarning(contextOverflowGuard, `Context ${pct}% — compaction imminent`, {
        score: 0.1,
        warnings: ["Save critical state before compaction"],
      });
    if (pct > 75)
      return hookWarning(contextOverflowGuard, `Context ${pct}% — summarize soon`, {
        score: 0.3,
        warnings: ["Consider summarizing before pressure increases"],
      });
    return hookSuccess(contextOverflowGuard, `Context ${pct}%`, { score: 1.0 });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const safetyQualityHooks: HookDefinition[] = [
  // Safety (5 BLOCKING)
  preCalculateSafety,
  postCalculateSafety,
  preGcodeSafety,
  postToolpathSafety,
  machineLimitGuard,
  // Quality (4 WARNING)
  postMeasurementSpc,
  toleranceDriftAlert,
  toolWearThreshold,
  surfaceQualityGate,
  // Business (4 LOGGING)
  jobCostUpdate,
  scheduleConflict,
  quoteExpiryAlert,
  inventoryLowAlert,
  // System (7 MIXED)
  preApiAuth,
  postApiAudit,
  rateLimitCheck,
  cacheInvalidate,
  backupTrigger,
  healthCheckHook,
  contextOverflowGuard,
];
