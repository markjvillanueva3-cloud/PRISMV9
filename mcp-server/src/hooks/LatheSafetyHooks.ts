/**
 * Lathe Safety Hooks — MS8 of LATHE-AWARE-HARDEN Roadmap
 *
 * 8 lathe-specific hooks for turning safety, quality, and workflow control:
 *   - 3 Blocking (CRITICAL safety checks)
 *   - 3 Warning (quality gates)
 *   - 2 Logging (audit trail)
 *
 * @version 1.0.0
 * @milestone LATHE-AWARE-HARDEN MS8 (U-LAT63)
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
// LATHE BLOCKING HOOKS (3) — CRITICAL SAFETY
// ============================================================================

/**
 * Hook: hook_lathe_collision_guard
 * Trigger: PreTool lathe_orchestrate_facade, lathe_collision_check
 * Blocks if collision zone analysis detects interference
 */
const latheCollisionGuard: HookDefinition = {
  id: "lathe-collision-guard",
  name: "Lathe Collision Zone Guard",
  description:
    "Validates collision zones before turning operations. BLOCKS if tool/chuck/tailstock interference detected.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["lathe", "collision", "safety", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    // Only fire on turning collision-related actions
    if (!action.includes("lathe_collision") && !action.includes("lathe_orchestrate")) {
      return hookSuccess(latheCollisionGuard, "Not a collision action", { skipped: true });
    }

    const issues: string[] = [];

    // Validate tool clearance
    if (d.tool_clearance_mm !== undefined && d.tool_clearance_mm < 2.0) {
      issues.push(`Tool clearance ${d.tool_clearance_mm}mm below 2.0mm safety minimum`);
    }

    // Validate swing diameter
    if (d.part_diameter_mm !== undefined && d.swing_limit_mm !== undefined) {
      if (d.part_diameter_mm > d.swing_limit_mm * 0.95) {
        issues.push(`Part diameter ${d.part_diameter_mm}mm too close to swing limit ${d.swing_limit_mm}mm (>95%)`);
      }
    }

    // Validate chuck jaw clearance
    if (d.jaw_od_mm !== undefined && d.turret_min_x_mm !== undefined) {
      if (d.jaw_od_mm >= d.turret_min_x_mm) {
        issues.push(`Chuck jaw OD ${d.jaw_od_mm}mm interferes with turret minimum X ${d.turret_min_x_mm}mm`);
      }
    }

    if (issues.length > 0) {
      log.warn("lathe-collision-guard", `BLOCKED: ${issues.join("; ")}`);
      return hookBlock(
        latheCollisionGuard,
        `Collision hazard: ${issues.join("; ")}`,
        { issues, severity: "critical" }
      );
    }

    return hookSuccess(latheCollisionGuard, "No collision detected");
  },
};

/**
 * Hook: hook_lathe_spindle_speed_limit
 * Trigger: PreTool lathe_orchestrate_facade (type: speedfeed)
 * Blocks if requested RPM exceeds machine spindle limit
 */
const latheSpindleSpeedLimit: HookDefinition = {
  id: "lathe-spindle-speed-limit",
  name: "Lathe Spindle Speed Limiter",
  description:
    "Validates spindle speed against machine limits. BLOCKS if RPM exceeds rated maximum for the selected machine.",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["lathe", "spindle", "safety", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("lathe_") && !action.includes("turning_")) {
      return hookSuccess(latheSpindleSpeedLimit, "Not a lathe action", { skipped: true });
    }

    // Machine RPM limits (Okuma fleet)
    const MACHINE_RPM_LIMITS: Record<string, number> = {
      "LB3000": 5000,
      "LB3000-MY": 5000,
      "LB3000-MYW": 5000,
      "LU300": 4500,
      "LU300-2SC": 4500,
      "Multus B250": 5000,
      "Multus B250II": 5000,
      "Multus B300": 5000,
      "Multus B300II": 5000,
    };

    const rpm = d.rpm ?? d.spindle_rpm ?? d.requested_rpm;
    const machine = d.machine_id ?? d.machine ?? "LB3000";
    const limit = MACHINE_RPM_LIMITS[machine] ?? 5000;

    if (rpm !== undefined && rpm > limit) {
      log.warn("lathe-spindle-speed-limit", `BLOCKED: RPM ${rpm} > limit ${limit} for ${machine}`);
      return hookBlock(
        latheSpindleSpeedLimit,
        `RPM ${rpm} exceeds ${machine} spindle limit of ${limit} RPM`,
        { rpm, limit, machine }
      );
    }

    return hookSuccess(latheSpindleSpeedLimit, "RPM within limits");
  },
};

/**
 * Hook: hook_lathe_gripping_force
 * Trigger: PreTool chuck_force, lathe_orchestrate_facade
 * Blocks if chuck gripping force is insufficient for cutting forces
 */
const latheGrippingForce: HookDefinition = {
  id: "lathe-gripping-force",
  name: "Lathe Chuck Gripping Force Guard",
  description:
    "Validates chuck gripping force vs. cutting forces. BLOCKS if safety factor < 2.0 (workpiece ejection risk).",
  phase: "pre-tool",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["lathe", "chuck", "gripping", "safety", "blocking"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const action = ctx.target?.action ?? "";

    if (!action.includes("chuck") && !action.includes("lathe_orchestrate")) {
      return hookSuccess(latheGrippingForce, "Not a chuck/orchestrate action", { skipped: true });
    }

    const gripForce = d.gripping_force_n ?? d.chuck_force_n;
    const cuttingForce = d.cutting_force_n ?? d.tangential_force_n;
    const SAFETY_FACTOR = 2.0;

    if (gripForce !== undefined && cuttingForce !== undefined) {
      const ratio = gripForce / cuttingForce;
      if (ratio < SAFETY_FACTOR) {
        log.warn("lathe-gripping-force", `BLOCKED: Grip/cut ratio ${ratio.toFixed(2)} < ${SAFETY_FACTOR}`);
        return hookBlock(
          latheGrippingForce,
          `Gripping force safety factor ${ratio.toFixed(2)} below minimum ${SAFETY_FACTOR} — workpiece ejection risk`,
          { gripForce, cuttingForce, ratio, requiredRatio: SAFETY_FACTOR }
        );
      }
    }

    return hookSuccess(latheGrippingForce, "Gripping force adequate");
  },
};

// ============================================================================
// LATHE WARNING HOOKS (3) — QUALITY GATES
// ============================================================================

/**
 * Hook: hook_lathe_surface_finish_warning
 * Trigger: PostCalc lathe_orchestrate_facade, turning_*
 * Warns if predicted Ra exceeds target
 */
const latheSurfaceFinishWarning: HookDefinition = {
  id: "lathe-surface-finish-warning",
  name: "Lathe Surface Finish Warning",
  description:
    "Warns if predicted surface finish Ra exceeds the target specification.",
  phase: "post-calculation",
  category: "quality",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["lathe", "surface", "quality", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.metadata?.result ?? {}) as Record<string, any>;

    const predictedRa = d.predicted_ra_um ?? d.surface_finish_ra;
    const targetRa = d.target_ra_um ?? d.spec_ra;

    if (predictedRa !== undefined && targetRa !== undefined && predictedRa > targetRa) {
      log.info("lathe-surface-finish-warning", `Ra ${predictedRa} > target ${targetRa}`);
      return hookWarning(
        latheSurfaceFinishWarning,
        `Predicted Ra ${predictedRa} um exceeds target ${targetRa} um — consider reducing feed rate or nose radius`,
        { predictedRa, targetRa, delta: predictedRa - targetRa }
      );
    }

    return hookSuccess(latheSurfaceFinishWarning, "Surface finish within spec");
  },
};

/**
 * Hook: hook_lathe_tool_life_warning
 * Trigger: PostCalc lathe_orchestrate_facade (type: speedfeed)
 * Warns if predicted tool life is below 15 minutes
 */
const latheToolLifeWarning: HookDefinition = {
  id: "lathe-tool-life-warning",
  name: "Lathe Tool Life Warning",
  description:
    "Warns if predicted Taylor tool life is below 15 minutes — consider reducing speed.",
  phase: "post-calculation",
  category: "quality",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["lathe", "toollife", "taylor", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.metadata?.result ?? {}) as Record<string, any>;

    const toolLifeMin = d.tool_life_min ?? d.taylor_life_min;
    const MIN_TOOL_LIFE = 15;

    if (toolLifeMin !== undefined && toolLifeMin < MIN_TOOL_LIFE) {
      log.info("lathe-tool-life-warning", `Tool life ${toolLifeMin} min < ${MIN_TOOL_LIFE} min`);
      return hookWarning(
        latheToolLifeWarning,
        `Predicted tool life ${toolLifeMin.toFixed(1)} min below ${MIN_TOOL_LIFE} min threshold — reduce Vc or increase insert grade`,
        { toolLifeMin, threshold: MIN_TOOL_LIFE }
      );
    }

    return hookSuccess(latheToolLifeWarning, "Tool life acceptable");
  },
};

/**
 * Hook: hook_lathe_tribal_override_warning
 * Trigger: PostCalc lathe_tribal_activate, lathe_orchestrate_facade
 * Warns if tribal tip overrides physics-based recommendation
 */
const latheTribalOverrideWarning: HookDefinition = {
  id: "lathe-tribal-override-warning",
  name: "Lathe Tribal Override Warning",
  description:
    "Warns when tribal knowledge tips override physics-based recommendations by >20%.",
  phase: "post-calculation",
  category: "quality",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["lathe", "tribal", "override", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.metadata?.result ?? {}) as Record<string, any>;

    const tribalModifier = d.tribal_modifier ?? d.tribal_adjustment;
    const OVERRIDE_THRESHOLD = 0.20;

    if (tribalModifier !== undefined && Math.abs(1.0 - tribalModifier) > OVERRIDE_THRESHOLD) {
      const pctDelta = ((tribalModifier - 1.0) * 100).toFixed(1);
      log.info("lathe-tribal-override-warning", `Tribal override ${pctDelta}% exceeds ±20%`);
      return hookWarning(
        latheTribalOverrideWarning,
        `Tribal knowledge applying ${pctDelta}% adjustment — verify with physics before production`,
        { tribalModifier, threshold: OVERRIDE_THRESHOLD }
      );
    }

    return hookSuccess(latheTribalOverrideWarning, "No significant tribal override");
  },
};

// ============================================================================
// LATHE LOGGING HOOKS (2) — AUDIT TRAIL
// ============================================================================

/**
 * Hook: hook_lathe_orchestration_log
 * Trigger: PostCalc lathe_orchestrate_facade
 * Logs every facade orchestration for audit trail
 */
const latheOrchestrationLog: HookDefinition = {
  id: "lathe-orchestration-log",
  name: "Lathe Orchestration Logger",
  description: "Logs all facade orchestration requests for audit and analytics.",
  phase: "post-calculation",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["lathe", "orchestration", "audit", "logging"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? "";
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const resultData = (ctx.metadata?.result ?? {}) as Record<string, any>;

    log.info("[lathe-orchestration-log]", JSON.stringify({
      action,
      type: d.type,
      material: d.material,
      machine_id: d.machine_id,
      routed_to: resultData.routed_to,
      confidence: resultData.provenance?.confidence,
      engines_count: resultData.provenance?.engines_invoked?.length,
      timestamp: new Date().toISOString(),
    }));

    return hookSuccess(latheOrchestrationLog, "Orchestration logged");
  },
};

/**
 * Hook: hook_lathe_tribal_activation_log
 * Trigger: PostCalc lathe_tribal_*
 * Logs tribal knowledge activations for learning feedback
 */
const latheTribalActivationLog: HookDefinition = {
  id: "lathe-tribal-activation-log",
  name: "Lathe Tribal Activation Logger",
  description: "Logs tribal knowledge activation events for feedback loop improvement.",
  phase: "post-calculation",
  category: "observability",
  mode: "logging",
  priority: "low",
  enabled: true,
  tags: ["lathe", "tribal", "activation", "logging"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? "";
    const d = (ctx.target?.data ?? {}) as Record<string, any>;

    if (!action.includes("tribal")) {
      return hookSuccess(latheTribalActivationLog, "Not a tribal action", { skipped: true });
    }

    log.info("[lathe-tribal-activation-log]", JSON.stringify({
      action,
      material: d.material,
      operation: d.operation,
      decision_type: d.decision_type,
      tips_returned: d.tips_count ?? 0,
      timestamp: new Date().toISOString(),
    }));

    return hookSuccess(latheTribalActivationLog, "Tribal activation logged");
  },
};

// ============================================================================
// EXPORT — All 8 Lathe Safety Hooks
// ============================================================================

export const LATHE_SAFETY_HOOKS: HookDefinition[] = [
  // Blocking (3)
  latheCollisionGuard,
  latheSpindleSpeedLimit,
  latheGrippingForce,
  // Warning (3)
  latheSurfaceFinishWarning,
  latheToolLifeWarning,
  latheTribalOverrideWarning,
  // Logging (2)
  latheOrchestrationLog,
  latheTribalActivationLog,
];

export {
  latheCollisionGuard,
  latheSpindleSpeedLimit,
  latheGrippingForce,
  latheSurfaceFinishWarning,
  latheToolLifeWarning,
  latheTribalOverrideWarning,
  latheOrchestrationLog,
  latheTribalActivationLog,
};
