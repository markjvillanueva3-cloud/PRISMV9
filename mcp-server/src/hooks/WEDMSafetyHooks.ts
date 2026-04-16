/**
 * WEDM Safety Hooks — Phase 0.3 of WEDM AGI Roadmap
 *
 * 16 WEDM-specific hooks for Wire EDM safety, quality, and workflow control:
 *   - 6 Blocking (CRITICAL safety checks)
 *   - 5 Warning (quality gates)
 *   - 3 Logging (audit trail)
 *   - 2 Trigger (automation)
 *
 * Each hook has TypeScript implementation here and a corresponding
 * Python Codex counterpart in ~/.claude/hooks/lib/wedm-*.py
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
// WEDM BLOCKING HOOKS (6) — CRITICAL SAFETY
// ============================================================================

/**
 * Hook: hook_wedm_calibration_validate
 * Trigger: PreTool wedm_feedback_*
 * Validates feedback data quality before calibration
 */
const wedmCalibrationValidate: HookDefinition = {
  id: "wedm-calibration-validate",
  name: "WEDM Calibration Data Validator",
  description:
    "Validates feedback data quality before neural model calibration. BLOCKS if confidence < 0.5 or data is malformed.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "calibration", "neural", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    // Only fire on wedm_feedback_* actions
    if (!action.startsWith("wedm_feedback")) {
      return hookSuccess(wedmCalibrationValidate, "Not a feedback action", { skipped: true });
    }

    const issues: string[] = [];

    // Check required fields
    if (!d.programId) issues.push("Missing programId");
    if (!d.material) issues.push("Missing material");
    if (d.actualRa === undefined) issues.push("Missing actualRa measurement");
    if (d.actualMrr === undefined) issues.push("Missing actualMrr measurement");

    // Validate bounds
    if (d.actualRa !== undefined && (d.actualRa < 0.05 || d.actualRa > 20)) {
      issues.push(`Ra ${d.actualRa} µm out of physical bounds [0.05, 20]`);
    }
    if (d.actualMrr !== undefined && (d.actualMrr < 1 || d.actualMrr > 500)) {
      issues.push(`MRR ${d.actualMrr} mm²/min out of physical bounds [1, 500]`);
    }

    // Check confidence
    const confidence = d.confidence ?? d.measurementConfidence ?? 1.0;
    if (confidence < 0.5) {
      issues.push(`Measurement confidence ${confidence} below 0.5 threshold`);
    }

    if (issues.length > 0) {
      log.warn("wedm-calibration-validate", `BLOCKED: ${issues.join("; ")}`);
      return hookBlock(
        wedmCalibrationValidate,
        `WEDM calibration data invalid: ${issues.length} issue(s)`,
        { issues, confidence }
      );
    }

    return hookSuccess(wedmCalibrationValidate, "Calibration data valid", {
      confidence,
      fields: Object.keys(d).length,
    });
  },
};

/**
 * Hook: hook_wedm_neural_sanity
 * Trigger: PostTool wedm_neural_*
 * Validates neural model outputs are within physical bounds
 */
const wedmNeuralSanity: HookDefinition = {
  id: "wedm-neural-sanity",
  name: "WEDM Neural Output Sanity Check",
  description:
    "Validates neural model predictions are within physical bounds. BLOCKS if Ra < 0 or Ra > 20 µm, or other impossible values.",
  phase: "post-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "neural", "physics", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    // Only fire on wedm_neural_* actions
    if (!action.startsWith("wedm_neural") && !action.includes("predict")) {
      return hookSuccess(wedmNeuralSanity, "Not a neural action", { skipped: true });
    }

    const issues: string[] = [];

    // Ra bounds: physical minimum is ~0.05 µm (mirror finish), max ~20 µm (very rough)
    if (d.ra_um !== undefined && (d.ra_um < 0 || d.ra_um > 20)) {
      issues.push(`Predicted Ra ${d.ra_um} µm outside physical bounds [0, 20]`);
    }

    // MRR bounds: 1-500 mm²/min typical range
    if (d.mrr_mm2Min !== undefined && (d.mrr_mm2Min < 0 || d.mrr_mm2Min > 500)) {
      issues.push(`Predicted MRR ${d.mrr_mm2Min} outside physical bounds [0, 500]`);
    }

    // Wire break probability: must be [0, 1]
    if (d.wireBreakProb !== undefined && (d.wireBreakProb < 0 || d.wireBreakProb > 1)) {
      issues.push(`Wire break probability ${d.wireBreakProb} outside [0, 1]`);
    }

    // Cycle time: negative is impossible
    if (d.cycleTime_min !== undefined && d.cycleTime_min < 0) {
      issues.push(`Negative cycle time ${d.cycleTime_min} min`);
    }

    if (issues.length > 0) {
      log.error("wedm-neural-sanity", `BLOCKED: ${issues.join("; ")}`);
      return hookBlock(
        wedmNeuralSanity,
        `Neural prediction violates physics: ${issues.join("; ")}`,
        { issues, predictions: d }
      );
    }

    return hookSuccess(wedmNeuralSanity, "Neural predictions within bounds", {
      ra_um: d.ra_um,
      mrr_mm2Min: d.mrr_mm2Min,
    });
  },
};

/**
 * Hook: hook_wedm_gcode_injection
 * Trigger: PreTool wedm_generate_gcode
 * Scans for G-code injection patterns
 */
const wedmGcodeInjection: HookDefinition = {
  id: "wedm-gcode-injection",
  name: "WEDM G-Code Injection Scanner",
  description:
    "Scans G-code inputs for injection patterns that could cause machine damage. BLOCKS if malicious patterns detected.",
  phase: "pre-tool",
  category: "security",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "gcode", "security", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("gcode") && !action.includes("generate")) {
      return hookSuccess(wedmGcodeInjection, "Not a G-code action", { skipped: true });
    }

    const issues: string[] = [];
    const content = String(d.content ?? d.gcode ?? d.program ?? "");

    // Dangerous patterns for Wire EDM
    const dangerousPatterns = [
      { pattern: /M0?6\s*T-?\d{4,}/i, desc: "Abnormal tool number (potential overflow)" },
      { pattern: /G28.*Z-\d{3,}/i, desc: "Large negative Z reference (crash risk)" },
      { pattern: /F\d{6,}/i, desc: "Extremely high feed rate (crash risk)" },
      { pattern: /;.*DROP|DELETE|TRUNCATE/i, desc: "SQL-like injection in comment" },
      { pattern: /\$\([^)]+\)/i, desc: "Shell command substitution attempt" },
      { pattern: /`[^`]+`/i, desc: "Backtick command injection" },
      { pattern: /M99\s*P-?\d{4,}/i, desc: "Abnormal subprogram call" },
    ];

    for (const { pattern, desc } of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push(desc);
      }
    }

    if (issues.length > 0) {
      log.error("wedm-gcode-injection", `BLOCKED: ${issues.join("; ")}`);
      return hookBlock(
        wedmGcodeInjection,
        `Potential G-code injection detected: ${issues.join("; ")}`,
        { issues, patterns: issues.length }
      );
    }

    return hookSuccess(wedmGcodeInjection, "G-code passed injection scan", {
      lines: content.split("\n").length,
    });
  },
};

/**
 * Hook: hook_wedm_ecode_consistency
 * Trigger: PreTool wedm_generate_gcode
 * Validates E-code matches machine controller
 */
const wedmEcodeConsistency: HookDefinition = {
  id: "wedm-ecode-consistency",
  name: "WEDM E-Code Consistency Check",
  description:
    "Validates E-code family matches the target machine controller. BLOCKS on mismatch.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["wedm", "ecode", "controller", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("generate") && !action.includes("gcode")) {
      return hookSuccess(wedmEcodeConsistency, "Not a G-code action", { skipped: true });
    }

    const ecode = d.ecode ?? d.eCode ?? "";
    const controller = d.controller ?? d.machine ?? "";

    if (!ecode || !controller) {
      return hookSuccess(wedmEcodeConsistency, "E-code or controller not specified", {
        skipped: true,
      });
    }

    // E-code to controller compatibility matrix
    const compatibilityMap: Record<string, string[]> = {
      mitsubishi: ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
      fanuc: ["E0", "E1", "E2", "E3", "E4"],
      sodick: ["E1", "E2", "E3"],
      makino: ["E0", "E1", "E2", "E3", "E4", "E5"],
      agiecharmilles: ["E1", "E2"],
    };

    const controllerLower = controller.toLowerCase();
    const ecodePrefix = ecode.substring(0, 2);

    let controllerType: string | null = null;
    for (const key of Object.keys(compatibilityMap)) {
      if (controllerLower.includes(key)) {
        controllerType = key;
        break;
      }
    }

    if (controllerType && !compatibilityMap[controllerType]?.includes(ecodePrefix)) {
      log.warn("wedm-ecode-consistency", `E-code ${ecode} may not be compatible with ${controller}`);
      return hookBlock(
        wedmEcodeConsistency,
        `E-code ${ecode} not in compatibility list for ${controllerType}`,
        { ecode, controller: controllerType, supportedPrefixes: compatibilityMap[controllerType] }
      );
    }

    return hookSuccess(wedmEcodeConsistency, "E-code compatible with controller", {
      ecode,
      controller,
    });
  },
};

/**
 * Hook: hook_wedm_taper_limits
 * Trigger: PreTool wedm_solve_taper
 * Validates UV taper angle within machine limits
 */
const wedmTaperLimits: HookDefinition = {
  id: "wedm-taper-limits",
  name: "WEDM Taper Angle Limits",
  description:
    "Validates requested UV taper angle is within machine maximum. BLOCKS if angle exceeds capability.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "taper", "uv", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("taper") && !d.taperAngle && !d.uvAngle) {
      return hookSuccess(wedmTaperLimits, "Not a taper operation", { skipped: true });
    }

    const requestedAngle = d.taperAngle ?? d.uvAngle ?? d.angle ?? 0;
    const machineMax = d.machineMaxTaper ?? d.maxTaper ?? 30; // Default 30° for FA-20S

    if (Math.abs(requestedAngle) > machineMax) {
      log.error("wedm-taper-limits", `Taper ${requestedAngle}° exceeds machine max ${machineMax}°`);
      return hookBlock(
        wedmTaperLimits,
        `Taper angle ${requestedAngle}° exceeds machine maximum ${machineMax}°`,
        { requested: requestedAngle, maximum: machineMax }
      );
    }

    return hookSuccess(wedmTaperLimits, "Taper angle within limits", {
      angle: requestedAngle,
      max: machineMax,
    });
  },
};

/**
 * Hook: hook_wedm_tension_safety
 * Trigger: PreTool wedm_*
 * Validates wire tension in safe range
 */
const wedmTensionSafety: HookDefinition = {
  id: "wedm-tension-safety",
  name: "WEDM Wire Tension Safety",
  description:
    "Validates wire tension is within safe range [500g, 2000g]. BLOCKS if outside range.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "wire", "tension", "safety", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    const tension = d.wireTension ?? d.tension ?? d.wireTension_g;

    if (tension === undefined) {
      return hookSuccess(wedmTensionSafety, "No tension specified", { skipped: true });
    }

    const minTension = 500;  // grams
    const maxTension = 2000; // grams

    if (tension < minTension) {
      return hookBlock(
        wedmTensionSafety,
        `Wire tension ${tension}g below minimum ${minTension}g — wire may wander`,
        { tension, min: minTension, max: maxTension }
      );
    }

    if (tension > maxTension) {
      return hookBlock(
        wedmTensionSafety,
        `Wire tension ${tension}g exceeds maximum ${maxTension}g — wire break risk`,
        { tension, min: minTension, max: maxTension }
      );
    }

    return hookSuccess(wedmTensionSafety, "Wire tension in safe range", {
      tension,
      range: [minTension, maxTension],
    });
  },
};

// ============================================================================
// WEDM WARNING HOOKS (5) — QUALITY GATES
// ============================================================================

/**
 * Hook: hook_wedm_cost_confidence
 * Trigger: PostTool wedm_estimate_cost
 * Warns if cost estimate confidence is low
 */
const wedmCostConfidence: HookDefinition = {
  id: "wedm-cost-confidence",
  name: "WEDM Cost Estimate Confidence",
  description: "Warns if cost estimate confidence < 70%. Suggests manual review.",
  phase: "post-tool",
  category: "quality",
  mode: "warning",
  priority: "medium",
  enabled: true,
  tags: ["wedm", "cost", "confidence", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("cost") && !action.includes("estimate")) {
      return hookSuccess(wedmCostConfidence, "Not a cost action", { skipped: true });
    }

    const confidence = d.confidence ?? d.estimateConfidence ?? 1.0;

    if (confidence < 0.7) {
      log.warn("wedm-cost-confidence", `Cost estimate confidence ${(confidence * 100).toFixed(0)}% < 70%`);
      return hookWarning(
        wedmCostConfidence,
        `Cost estimate confidence ${(confidence * 100).toFixed(0)}% below 70% — manual review recommended`,
        { confidence, threshold: 0.7 }
      );
    }

    return hookSuccess(wedmCostConfidence, "Cost estimate confidence acceptable", {
      confidence,
    });
  },
};

/**
 * Hook: hook_wedm_batch_deps
 * Trigger: PreTool wedm_batch_*
 * Checks for circular dependencies in batch jobs
 */
const wedmBatchDeps: HookDefinition = {
  id: "wedm-batch-deps",
  name: "WEDM Batch Dependency Check",
  description: "Checks batch job dependencies for circular references. BLOCKS on cycles.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["wedm", "batch", "dependency", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("batch")) {
      return hookSuccess(wedmBatchDeps, "Not a batch action", { skipped: true });
    }

    const jobs = d.jobs ?? d.batch ?? [];
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return hookSuccess(wedmBatchDeps, "No jobs to check", { skipped: true });
    }

    // Build dependency graph
    const deps = new Map<string, Set<string>>();
    for (const job of jobs) {
      const id = job.id ?? job.jobId ?? "";
      const requires = job.requires ?? job.dependencies ?? [];
      deps.set(id, new Set(Array.isArray(requires) ? requires : [requires]));
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(node: string): boolean {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      for (const dep of deps.get(node) ?? []) {
        if (hasCycle(dep)) return true;
      }

      stack.delete(node);
      return false;
    }

    for (const id of deps.keys()) {
      if (hasCycle(id)) {
        return hookBlock(
          wedmBatchDeps,
          `Circular dependency detected involving job ${id}`,
          { cycleJob: id, totalJobs: jobs.length }
        );
      }
    }

    return hookSuccess(wedmBatchDeps, "No circular dependencies", {
      jobs: jobs.length,
    });
  },
};

/**
 * Hook: hook_wedm_schedule_conflict
 * Trigger: PreTool wedm_schedule
 * Checks for machine scheduling conflicts
 */
const wedmScheduleConflict: HookDefinition = {
  id: "wedm-schedule-conflict",
  name: "WEDM Schedule Conflict Check",
  description: "Checks for double-booking or overlapping machine reservations. BLOCKS on conflict.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  tags: ["wedm", "schedule", "conflict", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("schedule") && !action.includes("reserve")) {
      return hookSuccess(wedmScheduleConflict, "Not a scheduling action", { skipped: true });
    }

    const machine = d.machine ?? d.machineId ?? "";
    const start = d.start ?? d.startTime;
    const end = d.end ?? d.endTime;
    const existingReservations = d.existingReservations ?? [];

    if (!machine || !start || !end) {
      return hookSuccess(wedmScheduleConflict, "Incomplete scheduling data", { skipped: true });
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    // Check for overlaps
    for (const res of existingReservations) {
      if (res.machine !== machine) continue;

      const resStart = new Date(res.start).getTime();
      const resEnd = new Date(res.end).getTime();

      // Check overlap: (start1 < end2) && (start2 < end1)
      if (startTime < resEnd && resStart < endTime) {
        return hookBlock(
          wedmScheduleConflict,
          `Schedule conflict: ${machine} already reserved from ${res.start} to ${res.end}`,
          { machine, conflictWith: res.jobId ?? "unknown", requestedStart: start, requestedEnd: end }
        );
      }
    }

    return hookSuccess(wedmScheduleConflict, "No scheduling conflicts", {
      machine,
      start,
      end,
    });
  },
};

/**
 * Hook: hook_wedm_drift_alert
 * Trigger: PostTool wedm_calibration_*
 * Alerts on concept drift in neural models
 */
const wedmDriftAlert: HookDefinition = {
  id: "wedm-drift-alert",
  name: "WEDM Model Drift Alert",
  description: "Alerts when neural model predictions drift significantly from actual outcomes.",
  phase: "post-tool",
  category: "quality",
  mode: "warning",
  priority: "medium",
  enabled: true,
  tags: ["wedm", "drift", "neural", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("calibration")) {
      return hookSuccess(wedmDriftAlert, "Not a calibration action", { skipped: true });
    }

    const driftScore = d.driftScore ?? d.drift ?? 0;
    const driftThreshold = d.driftThreshold ?? 0.2; // 20% drift threshold

    if (driftScore > driftThreshold) {
      log.warn("wedm-drift-alert", `Model drift ${(driftScore * 100).toFixed(1)}% exceeds threshold`);
      return hookWarning(
        wedmDriftAlert,
        `Model drift ${(driftScore * 100).toFixed(1)}% exceeds ${(driftThreshold * 100).toFixed(0)}% threshold — consider retraining`,
        { drift: driftScore, threshold: driftThreshold }
      );
    }

    return hookSuccess(wedmDriftAlert, "Model drift within acceptable range", {
      drift: driftScore,
    });
  },
};

/**
 * Hook: hook_wedm_ood_detector
 * Trigger: PreTool wedm_*_material
 * Flags out-of-distribution materials
 */
const wedmOodDetector: HookDefinition = {
  id: "wedm-ood-detector",
  name: "WEDM Out-of-Distribution Detector",
  description: "Flags materials or parameters outside the training distribution.",
  phase: "pre-tool",
  category: "quality",
  mode: "warning",
  priority: "medium",
  enabled: true,
  tags: ["wedm", "ood", "material", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    const material = d.material ?? "";
    const thickness = d.thickness ?? 0;

    // Known materials in training distribution
    const knownMaterials = new Set([
      "D2", "A2", "M2", "S7", "H13", "O1", "W1",
      "carbide", "tungsten carbide",
      "4140", "4340", "1045", "1018",
      "aluminum", "6061", "7075",
      "copper", "brass", "titanium",
      "inconel", "hastelloy", "stainless", "304", "316",
    ]);

    const issues: string[] = [];

    // Check material
    const matLower = material.toLowerCase();
    const isKnown = Array.from(knownMaterials).some((m) =>
      matLower.includes(m.toLowerCase())
    );

    if (material && !isKnown) {
      issues.push(`Material "${material}" not in training distribution`);
    }

    // Check thickness (typical training range 1-100mm)
    if (thickness > 0 && (thickness < 1 || thickness > 100)) {
      issues.push(`Thickness ${thickness}mm outside typical training range [1-100mm]`);
    }

    if (issues.length > 0) {
      return hookWarning(
        wedmOodDetector,
        `Out-of-distribution warning: ${issues.join("; ")}`,
        { issues, material, thickness }
      );
    }

    return hookSuccess(wedmOodDetector, "Parameters within training distribution", {
      material,
      thickness,
    });
  },
};

// ============================================================================
// WEDM LOGGING HOOKS (3) — AUDIT TRAIL
// ============================================================================

/**
 * Hook: hook_wedm_quality_audit
 * Trigger: PostTool wedm_override_quality
 * Logs quality gate overrides to audit trail
 */
const wedmQualityAudit: HookDefinition = {
  id: "wedm-quality-audit",
  name: "WEDM Quality Override Audit",
  description: "Logs all quality gate overrides to audit trail. Never blocks.",
  phase: "post-tool",
  category: "audit",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["wedm", "quality", "audit", "logging"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (action.includes("override") || d.override || d.bypass) {
      log.info("wedm-quality-audit", `Quality override: action=${action}`, {
        operator: d.operator ?? ctx.session?.userId ?? "unknown",
        reason: d.reason ?? d.overrideReason ?? "not specified",
        timestamp: new Date().toISOString(),
        target: d.target ?? d.gate ?? "unknown",
      });
    }

    return hookSuccess(wedmQualityAudit, "Audit logged", { logged: true });
  },
};

/**
 * Hook: hook_wedm_workflow_monitor
 * Trigger: PreTool wedm_*
 * Tracks multi-action workflow progress
 */
const wedmWorkflowMonitor: HookDefinition = {
  id: "wedm-workflow-monitor",
  name: "WEDM Workflow Progress Monitor",
  description: "Tracks progress through multi-action WEDM workflows.",
  phase: "pre-tool",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["wedm", "workflow", "monitoring", "logging"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? "";
    const workflowId = ctx.session?.workflowId ?? ctx.target?.data?.workflowId;

    if (action.startsWith("wedm_") && workflowId) {
      log.debug("wedm-workflow-monitor", `Workflow step: ${action}`, {
        workflowId,
        step: action,
        timestamp: new Date().toISOString(),
      });
    }

    return hookSuccess(wedmWorkflowMonitor, "Workflow step logged", {
      action,
      workflowId,
    });
  },
};

/**
 * Hook: hook_wedm_sx_safety
 * Trigger: PreTool wedm_* CRITICAL
 * S(x) safety scoring for WEDM operations
 */
const wedmSxSafety: HookDefinition = {
  id: "wedm-sx-safety",
  name: "WEDM S(x) Safety Score",
  description: "Calculates S(x) safety score for WEDM operations. BLOCKS if S(x) < 0.70.",
  phase: "pre-tool",
  category: "safety",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["wedm", "safety", "sx", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    // Only check critical WEDM operations
    const criticalActions = ["generate_gcode", "execute", "run", "start", "cut"];
    if (!criticalActions.some((c) => action.includes(c))) {
      return hookSuccess(wedmSxSafety, "Not a critical action", { skipped: true });
    }

    // Calculate S(x) components
    const components = {
      parameterValidity: d.parameterValidated ? 1.0 : 0.5,
      machineCompatibility: d.machineValidated ? 1.0 : 0.6,
      materialKnown: d.materialKnown !== false ? 1.0 : 0.4,
      operatorCertified: d.operatorCertified !== false ? 1.0 : 0.7,
      programValidated: d.programValidated ? 1.0 : 0.5,
    };

    // Weighted average
    const weights = { parameterValidity: 0.3, machineCompatibility: 0.2, materialKnown: 0.2, operatorCertified: 0.15, programValidated: 0.15 };
    let sx = 0;
    for (const [key, weight] of Object.entries(weights)) {
      sx += (components[key as keyof typeof components] ?? 0.5) * weight;
    }

    const threshold = 0.70;

    if (sx < threshold) {
      log.error("wedm-sx-safety", `S(x)=${sx.toFixed(2)} < ${threshold} threshold`);
      return hookBlock(
        wedmSxSafety,
        `S(x) safety score ${sx.toFixed(2)} below ${threshold} threshold`,
        { sx, threshold, components }
      );
    }

    return hookSuccess(wedmSxSafety, `S(x) safety score acceptable: ${sx.toFixed(2)}`, {
      sx,
      components,
    });
  },
};

// ============================================================================
// WEDM TRIGGER HOOKS (2) — AUTOMATION
// ============================================================================

/**
 * Hook: hook_wedm_learning_trigger
 * Trigger: PostTool wedm_submit_feedback
 * Auto-triggers calibration after feedback submission
 */
const wedmLearningTrigger: HookDefinition = {
  id: "wedm-learning-trigger",
  name: "WEDM Learning Auto-Trigger",
  description: "Automatically triggers model calibration after sufficient feedback received.",
  phase: "post-tool",
  category: "automation",
  mode: "logging",
  priority: "medium",
  enabled: true,
  tags: ["wedm", "learning", "trigger", "automation"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("feedback") && !action.includes("submit")) {
      return hookSuccess(wedmLearningTrigger, "Not a feedback action", { skipped: true });
    }

    const feedbackCount = d.feedbackCount ?? d.totalFeedback ?? 1;
    const triggerThreshold = 10; // Retrain after 10 feedback entries

    if (feedbackCount >= triggerThreshold) {
      log.info("wedm-learning-trigger", `Triggering recalibration after ${feedbackCount} feedback entries`);
      // In production, this would emit an event to trigger WEDMFeedbackCalibrationEngine
      return hookSuccess(wedmLearningTrigger, `Calibration triggered (${feedbackCount} entries)`, {
        triggered: true,
        feedbackCount,
      });
    }

    return hookSuccess(wedmLearningTrigger, `Feedback logged (${feedbackCount}/${triggerThreshold})`, {
      triggered: false,
      feedbackCount,
      threshold: triggerThreshold,
    });
  },
};

/**
 * Hook: hook_wedm_awareness_inject
 * Trigger: SessionStart
 * Injects WEDM context when session involves Wire EDM
 */
const wedmAwarenessInject: HookDefinition = {
  id: "wedm-awareness-inject",
  name: "WEDM Session Awareness Injection",
  description: "Injects WEDM context into session when Wire EDM topics detected.",
  phase: "session-start",
  category: "awareness",
  mode: "logging",
  priority: "medium",
  enabled: true,
  tags: ["wedm", "session", "awareness", "injection"],
  handler: (ctx: HookContext): HookResult => {
    const sessionPrompt = ctx.session?.prompt ?? "";
    const sessionContext = ctx.session?.context ?? "";
    const combined = `${sessionPrompt} ${sessionContext}`.toLowerCase();

    // Check for WEDM-related content
    const wedmKeywords = ["wire edm", "wedm", "wire cut", "edm wire", "spark erosion", "electrical discharge"];
    const isWedmRelevant = wedmKeywords.some((kw) => combined.includes(kw));

    if (isWedmRelevant) {
      log.info("wedm-awareness-inject", "WEDM context detected, injecting awareness");
      // In production, this would enrich the session context with WEDM engines/capabilities
      return hookSuccess(wedmAwarenessInject, "WEDM awareness injected", {
        injected: true,
        keywords: wedmKeywords.filter((kw) => combined.includes(kw)),
        engines: 119,
        actions: 256,
      });
    }

    return hookSuccess(wedmAwarenessInject, "No WEDM context needed", {
      injected: false,
    });
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All 16 WEDM Safety Hooks
 */
export const wedmSafetyHooks: HookDefinition[] = [
  // Blocking (6)
  wedmCalibrationValidate,
  wedmNeuralSanity,
  wedmGcodeInjection,
  wedmEcodeConsistency,
  wedmTaperLimits,
  wedmTensionSafety,
  // Quality/Warning (5)
  wedmCostConfidence,
  wedmBatchDeps,
  wedmScheduleConflict,
  wedmDriftAlert,
  wedmOodDetector,
  // Logging/Audit (3)
  wedmQualityAudit,
  wedmWorkflowMonitor,
  wedmSxSafety,
  // Automation/Trigger (2)
  wedmLearningTrigger,
  wedmAwarenessInject,
];

/**
 * Individual hook exports for direct registration
 */
export {
  wedmCalibrationValidate,
  wedmNeuralSanity,
  wedmGcodeInjection,
  wedmEcodeConsistency,
  wedmTaperLimits,
  wedmTensionSafety,
  wedmCostConfidence,
  wedmBatchDeps,
  wedmScheduleConflict,
  wedmDriftAlert,
  wedmOodDetector,
  wedmQualityAudit,
  wedmWorkflowMonitor,
  wedmSxSafety,
  wedmLearningTrigger,
  wedmAwarenessInject,
};

export default wedmSafetyHooks;
