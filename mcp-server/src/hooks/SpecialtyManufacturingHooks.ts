/**
 * PRISM L4-P1-MS1: 20 PASS2 Specialty Manufacturing Hooks (M77-M96)
 *
 * 6 BLOCKING (SAFETY-CRITICAL):
 *   M77 SINGULARITY_APPROACH, M78 RTCP_MISMATCH, M81 WORK_ENVELOPE_EXCEEDED,
 *   M83 CHUCK_CRUSH_RISK, M84 LIVE_TOOL_TORQUE_EXCEEDED, M90 TOOL_REACH_INSUFFICIENT
 *
 * 14 WARNING:
 *   M79 WHITE_LAYER_RISK, M80 RECAST_LAYER_THICK, M82 TAILSTOCK_FORCE_LOW,
 *   M85 STEADY_REST_NEEDED, M86 PLATING_ALLOWANCE_MISSING, M87 PASSIVATION_REQUIRED,
 *   M88 DEBURR_STEP_MISSING, M89 BARFEED_REMNANT_WASTE, M91 MINIMUM_WALL_THICKNESS,
 *   M92 CONCENTRICITY_AT_RISK, M93 THREAD_RELIEF_MISSING, M94 CORNER_RADIUS_TOLERANCE,
 *   M95 CHIP_WRAP_RISK, M96 MATERIAL_CERT_UNVERIFIED
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

// ============================================================================
// BLOCKING HOOKS (6) — SAFETY-CRITICAL
// ============================================================================

/** M77 SINGULARITY_APPROACH — 5-axis approaching kinematic singularity */
const singularityApproach: HookDefinition = {
  id: "singularity-approach",
  name: "5-Axis Singularity Approach",
  description:
    "BLOCKS when A/B/C axis nears kinematic singularity (gimbal lock). Dangerous: infinite axis velocity at singularity.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "5axis", "singularity", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const A = d.A_angle_deg ?? d.tiltAngle ?? 0;
    const singularityZone = d.singularityThreshold_deg ?? 2;
    // Singularity at A=0 for table-table, A=90 for head-table
    const distToSingularity = d.headTableType === "table-table"
      ? Math.abs(A) : Math.abs(90 - Math.abs(A));
    if (distToSingularity < singularityZone) {
      return hookBlock(singularityApproach,
        `SINGULARITY: A=${A}deg, ${distToSingularity.toFixed(2)}deg from singularity`,
        { score: 0, issues: [
          `Distance to singularity: ${distToSingularity.toFixed(2)}deg (threshold: ${singularityZone}deg)`,
          "Axis velocity approaches infinity — machine will fault or crash",
          "Reorient part or use tilted workplane to avoid zone",
        ] });
    }
    return hookSuccess(singularityApproach, `Safe: ${distToSingularity.toFixed(1)}deg from singularity`, { score: 1.0 });
  },
};

/** M78 RTCP_MISMATCH — RTCP mode doesn't match machine kinematics */
const rtcpMismatch: HookDefinition = {
  id: "rtcp-mismatch",
  name: "RTCP Mode Mismatch",
  description:
    "BLOCKS when RTCP/TCPM mode in G-code doesn't match machine kinematic configuration. Wrong RTCP = gouges.",
  phase: "pre-code-generate",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "5axis", "rtcp", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.rtcpEnabled && !d.machineSupportsRTCP) {
      return hookBlock(rtcpMismatch, "RTCP enabled but machine lacks RTCP support", {
        score: 0, issues: ["RTCP requires machine kinematic model — gouge risk without it"] });
    }
    if (d.rtcpType && d.machineKinematicType && d.rtcpType !== d.machineKinematicType) {
      return hookBlock(rtcpMismatch,
        `RTCP type mismatch: program=${d.rtcpType}, machine=${d.machineKinematicType}`,
        { score: 0, issues: ["Kinematic model mismatch causes positional errors"] });
    }
    return hookSuccess(rtcpMismatch, "RTCP config matches machine", { score: 1.0 });
  },
};

/** M81 WORK_ENVELOPE_EXCEEDED — toolpath exceeds machine travel */
const workEnvelopeExceeded: HookDefinition = {
  id: "work-envelope-exceeded",
  name: "Work Envelope Exceeded",
  description:
    "BLOCKS when toolpath coordinates exceed machine axis travel limits. Prevents axis overtravel faults.",
  phase: "post-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "envelope", "travel", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const issues: string[] = [];
    const travel = d.machineTravel ?? {};
    for (const axis of ["X", "Y", "Z"]) {
      const min = d[`min${axis}_mm`];
      const max = d[`max${axis}_mm`];
      const travelMin = travel[`${axis}_min`];
      const travelMax = travel[`${axis}_max`];
      if (min !== undefined && travelMin !== undefined && min < travelMin)
        issues.push(`${axis} min ${min}mm < travel ${travelMin}mm`);
      if (max !== undefined && travelMax !== undefined && max > travelMax)
        issues.push(`${axis} max ${max}mm > travel ${travelMax}mm`);
    }
    if (issues.length > 0)
      return hookBlock(workEnvelopeExceeded, "Toolpath exceeds machine travel", { score: 0, issues });
    return hookSuccess(workEnvelopeExceeded, "Within work envelope", { score: 1.0 });
  },
};

/** M83 CHUCK_CRUSH_RISK — clamping will deform thin-walled part */
const chuckCrushRisk: HookDefinition = {
  id: "chuck-crush-risk",
  name: "Chuck Crush Risk",
  description:
    "BLOCKS when chuck jaw force will deform thin-walled workpiece. Calculates hoop stress vs yield.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "turning", "chuck", "crush", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const wallThickness = d.wallThickness_mm ?? 999;
    const od = d.outerDiameter_mm ?? 50;
    const jawForce = d.jawForce_N ?? d.chuckForce_N ?? 0;
    const yieldStrength = d.yieldStrength_MPa ?? 300;
    // Simplified hoop stress: σ = F / (π * D * t) for 3-jaw
    if (wallThickness < 999 && jawForce > 0) {
      const hoopStress = jawForce / (Math.PI * od * wallThickness);
      if (hoopStress > yieldStrength * 0.5) {
        return hookBlock(chuckCrushRisk,
          `CRUSH RISK: Hoop stress ${hoopStress.toFixed(0)} MPa > 50% yield (${(yieldStrength * 0.5).toFixed(0)} MPa)`,
          { score: 0, issues: [
            `Wall thickness: ${wallThickness}mm, OD: ${od}mm`,
            `Jaw force: ${jawForce}N → hoop stress: ${hoopStress.toFixed(0)} MPa`,
            "Use soft jaws, mandrel, or reduce clamping pressure",
          ] });
      }
    }
    return hookSuccess(chuckCrushRisk, "No crush risk", { score: 1.0 });
  },
};

/** M84 LIVE_TOOL_TORQUE_EXCEEDED — milling on lathe exceeds live tool torque */
const liveToolTorqueExceeded: HookDefinition = {
  id: "live-tool-torque-exceeded",
  name: "Live Tool Torque Exceeded",
  description:
    "BLOCKS when required milling torque exceeds live tooling station capacity. Prevents spindle/coupling damage.",
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "turning", "live-tool", "torque", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const requiredTorque = d.requiredTorque_Nm ?? 0;
    const maxTorque = d.liveToolMaxTorque_Nm ?? 40; // typical live tool limit
    if (requiredTorque > maxTorque) {
      return hookBlock(liveToolTorqueExceeded,
        `TORQUE EXCEEDED: ${requiredTorque.toFixed(1)} Nm > live tool max ${maxTorque} Nm`,
        { score: 0, issues: [
          `Required: ${requiredTorque.toFixed(1)} Nm, Available: ${maxTorque} Nm`,
          "Reduce DOC, feed, or move operation to milling machine",
        ] });
    }
    return hookSuccess(liveToolTorqueExceeded, `Torque OK: ${requiredTorque.toFixed(1)}/${maxTorque} Nm`, { score: 1.0 });
  },
};

/** M90 TOOL_REACH_INSUFFICIENT — tool too short for deepest feature */
const toolReachInsufficient: HookDefinition = {
  id: "tool-reach-insufficient",
  name: "Tool Reach Insufficient",
  description:
    "BLOCKS when tool length is shorter than deepest feature + clearance. Prevents holder collision with part.",
  phase: "pre-toolpath",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["safety", "tool-reach", "collision", "blocking", "critical"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const featureDepth = d.featureDepth_mm ?? 0;
    const clearance = d.clearance_mm ?? 5;
    const toolLength = d.toolLength_mm ?? d.cuttingLength_mm ?? 999;
    const required = featureDepth + clearance;
    if (toolLength < required) {
      return hookBlock(toolReachInsufficient,
        `REACH: Tool ${toolLength}mm < required ${required}mm (depth ${featureDepth} + clearance ${clearance})`,
        { score: 0, issues: [
          `Feature depth: ${featureDepth}mm + clearance: ${clearance}mm = ${required}mm needed`,
          `Tool available: ${toolLength}mm — ${(required - toolLength).toFixed(1)}mm short`,
          "Use longer tool, extended holder, or reshim workpiece",
        ] });
    }
    return hookSuccess(toolReachInsufficient, `Reach OK: ${toolLength}mm >= ${required}mm`, { score: 1.0 });
  },
};

// ============================================================================
// WARNING HOOKS (14)
// ============================================================================

/** M79 WHITE_LAYER_RISK — hard turning may produce white layer */
const whiteLayerRisk: HookDefinition = {
  id: "white-layer-risk",
  name: "White Layer Risk (Hard Turning)",
  description: "Warns when hard turning conditions may produce untempered martensite (white layer).",
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["turning", "hard-turning", "white-layer", "surface-integrity"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const hardness = d.hardness_hrc ?? 0;
    const cuttingSpeed = d.cuttingSpeed_m_min ?? 0;
    const flankWear = d.flankWear_mm ?? 0;
    const warnings: string[] = [];
    if (hardness > 55 && cuttingSpeed > 200)
      warnings.push(`High speed (${cuttingSpeed} m/min) on hardened steel (${hardness} HRC) — white layer risk`);
    if (flankWear > 0.2 && hardness > 50)
      warnings.push(`Worn tool (VB=${flankWear}mm) on hardened steel — increased heat → white layer`);
    if (warnings.length > 0) return hookWarning(whiteLayerRisk, warnings.join("; "), { score: 0.5, warnings });
    return hookSuccess(whiteLayerRisk, "No white layer risk", { score: 1.0 });
  },
};

/** M80 RECAST_LAYER_THICK — EDM recast exceeding spec */
const recastLayerThick: HookDefinition = {
  id: "recast-layer-thick",
  name: "EDM Recast Layer Thickness",
  description: "Warns when EDM parameters predict recast layer exceeding specification.",
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["edm", "recast", "surface-integrity"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const recast = d.predictedRecast_um ?? d.recastThickness_um ?? 0;
    const spec = d.maxRecast_um ?? 25;
    if (recast > spec) return hookWarning(recastLayerThick, `Recast ${recast}um > spec ${spec}um`, { score: spec / recast, warnings: ["Reduce discharge energy or add finish passes"] });
    return hookSuccess(recastLayerThick, `Recast ${recast}um within spec`, { score: 1.0 });
  },
};

/** M82 TAILSTOCK_FORCE_LOW — inadequate tailstock support */
const tailstockForceLow: HookDefinition = {
  id: "tailstock-force-low",
  name: "Tailstock Force Low",
  description: "Warns when tailstock force is insufficient for workpiece weight/cutting forces.",
  phase: "pre-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["turning", "tailstock", "support"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const tsForce = d.tailstockForce_N ?? 0;
    const required = d.requiredSupportForce_N ?? 0;
    if (tsForce > 0 && required > 0 && tsForce < required * 1.2)
      return hookWarning(tailstockForceLow, `Tailstock ${tsForce}N < 1.2x required ${required}N`, { score: tsForce / (required * 1.2), warnings: ["Increase tailstock pressure or use steady rest"] });
    return hookSuccess(tailstockForceLow, "Tailstock support adequate", { score: 1.0 });
  },
};

/** M85 STEADY_REST_NEEDED — part L/D requires steady rest */
const steadyRestNeeded: HookDefinition = {
  id: "steady-rest-needed",
  name: "Steady Rest Needed",
  description: "Warns when L/D ratio exceeds threshold for unsupported turning.",
  phase: "pre-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["turning", "steady-rest", "deflection"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const ld = d.ld_ratio ?? ((d.length_mm ?? 0) / (d.diameter_mm || 1));
    const threshold = d.steadyRestThreshold ?? 4;
    if (ld > threshold)
      return hookWarning(steadyRestNeeded, `L/D=${ld.toFixed(1)} > ${threshold} — steady rest recommended`, { score: threshold / ld, warnings: ["Part may deflect without intermediate support"] });
    return hookSuccess(steadyRestNeeded, `L/D=${ld.toFixed(1)} OK`, { score: 1.0 });
  },
};

/** M86 PLATING_ALLOWANCE_MISSING */
const platingAllowanceMissing: HookDefinition = {
  id: "plating-allowance-missing",
  name: "Plating Allowance Missing",
  description: "Warns when part has plating/coating callout but no allowance in finish dimensions.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["finishing", "plating", "coating", "tolerance"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.hasCoating && !d.coatingAllowance)
      return hookWarning(platingAllowanceMissing, "Coating specified but no dimensional allowance", { score: 0.5, warnings: ["Add plating buildup to pre-plate dimensions"] });
    return hookSuccess(platingAllowanceMissing, "Plating allowance OK or N/A", { score: 1.0 });
  },
};

/** M87 PASSIVATION_REQUIRED */
const passivationRequired: HookDefinition = {
  id: "passivation-required",
  name: "Passivation Required",
  description: "Warns when stainless steel part lacks passivation callout.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["finishing", "passivation", "stainless", "corrosion"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const mat = (d.material ?? "").toLowerCase();
    if ((mat.includes("stainless") || mat.includes("ss") || mat.includes("304") || mat.includes("316")) && !d.passivationCallout)
      return hookWarning(passivationRequired, "Stainless steel without passivation callout", { score: 0.5, warnings: ["Add passivation per ASTM A967 / AMS 2700"] });
    return hookSuccess(passivationRequired, "Passivation OK or N/A", { score: 1.0 });
  },
};

/** M88 DEBURR_STEP_MISSING */
const deburStepMissing: HookDefinition = {
  id: "deburr-step-missing",
  name: "Deburr Step Missing",
  description: "Warns when machining plan has sharp edges without deburring operation.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["finishing", "deburr", "edges", "safety"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.sharpEdgesPresent && !d.deburringPlanned)
      return hookWarning(deburStepMissing, "Sharp edges without deburr operation", { score: 0.5, warnings: ["Add chamfer or deburr step — operator safety hazard"] });
    return hookSuccess(deburStepMissing, "Deburr OK or N/A", { score: 1.0 });
  },
};

/** M89 BARFEED_REMNANT_WASTE */
const barfeedRemnantWaste: HookDefinition = {
  id: "barfeed-remnant-waste",
  name: "Bar Feed Remnant Waste",
  description: "Warns when bar stock program creates excessive remnant waste.",
  phase: "post-output",
  category: "observability",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["turning", "barfeed", "waste", "cost"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const remnant = d.remnantLength_mm ?? 0;
    const barLength = d.barLength_mm ?? 3000;
    const wastePct = barLength > 0 ? (remnant / barLength) * 100 : 0;
    if (wastePct > 10)
      return hookWarning(barfeedRemnantWaste, `Remnant waste ${wastePct.toFixed(1)}% (${remnant}mm)`, { score: 0.5, warnings: ["Adjust part-off width or bar length to reduce waste"] });
    return hookSuccess(barfeedRemnantWaste, `Waste ${wastePct.toFixed(1)}%`, { score: 1.0 });
  },
};

/** M91 MINIMUM_WALL_THICKNESS */
const minimumWallThickness: HookDefinition = {
  id: "minimum-wall-thickness",
  name: "Minimum Wall Thickness",
  description: "Warns when wall thickness is below minimum for material.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["design", "wall-thickness", "structural"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const wall = d.wallThickness_mm ?? 999;
    const minWall = d.minimumWall_mm ?? 1.0;
    if (wall < minWall)
      return hookWarning(minimumWallThickness, `Wall ${wall}mm < min ${minWall}mm`, { score: wall / minWall, warnings: ["Thin wall may deflect during machining or fail in service"] });
    return hookSuccess(minimumWallThickness, "Wall thickness OK", { score: 1.0 });
  },
};

/** M92 CONCENTRICITY_AT_RISK */
const concentricityAtRisk: HookDefinition = {
  id: "concentricity-at-risk",
  name: "Concentricity at Risk",
  description: "Warns when multi-setup process threatens concentricity requirements.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "concentricity", "multi-setup"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const setups = d.numberOfSetups ?? 1;
    const concentricitySpec = d.concentricity_mm ?? 999;
    if (setups > 1 && concentricitySpec < 0.025)
      return hookWarning(concentricityAtRisk, `Tight concentricity (${concentricitySpec}mm) across ${setups} setups`, { score: 0.4, warnings: ["Consider single-setup solution or live center alignment"] });
    return hookSuccess(concentricityAtRisk, "Concentricity achievable", { score: 1.0 });
  },
};

/** M93 THREAD_RELIEF_MISSING */
const threadReliefMissing: HookDefinition = {
  id: "thread-relief-missing",
  name: "Thread Relief Missing",
  description: "Warns when thread callout lacks relief groove.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["threading", "relief", "design"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.hasThread && !d.hasThreadRelief)
      return hookWarning(threadReliefMissing, "Thread without relief groove", { score: 0.6, warnings: ["Add thread relief per DIN 76 / ASME B1.1 — prevents tool crash at shoulder"] });
    return hookSuccess(threadReliefMissing, "Thread relief OK or N/A", { score: 1.0 });
  },
};

/** M94 CORNER_RADIUS_TOLERANCE */
const cornerRadiusTolerance: HookDefinition = {
  id: "corner-radius-tolerance",
  name: "Corner Radius vs Tool Capability",
  description: "Warns when internal corner radius is sharper than tool can produce.",
  phase: "post-output",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["geometry", "corner-radius", "tool-capability"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const requiredR = d.cornerRadius_mm ?? 999;
    const toolR = d.toolNoseRadius_mm ?? d.endmillRadius_mm ?? 0;
    if (toolR > 0 && requiredR < toolR)
      return hookWarning(cornerRadiusTolerance, `Corner R${requiredR}mm < tool R${toolR}mm`, { score: requiredR / toolR, warnings: ["Use smaller tool or EDM for sharp internal corners"] });
    return hookSuccess(cornerRadiusTolerance, "Corner radius achievable", { score: 1.0 });
  },
};

/** M95 CHIP_WRAP_RISK */
const chipWrapRisk: HookDefinition = {
  id: "chip-wrap-risk",
  name: "Chip Wrap Risk",
  description: "Warns when continuous chip formation likely on unattended or lights-out setup.",
  phase: "post-calculation",
  category: "manufacturing",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["chip-control", "automation", "safety"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    const mat = (d.material ?? "").toLowerCase();
    const unattended = d.unattendedOperation ?? d.lightsOut ?? false;
    const chipBreaker = d.hasChipBreaker ?? false;
    const ductile = mat.includes("aluminum") || mat.includes("copper") || mat.includes("stainless") || mat.includes("plastic");
    if (unattended && ductile && !chipBreaker)
      return hookWarning(chipWrapRisk, "Continuous chip risk on unattended operation", { score: 0.3, warnings: ["Add chipbreaker geometry, increase feed, or program pecking cycle"] });
    return hookSuccess(chipWrapRisk, "Chip control OK", { score: 1.0 });
  },
};

/** M96 MATERIAL_CERT_UNVERIFIED */
const materialCertUnverified: HookDefinition = {
  id: "material-cert-unverified",
  name: "Material Cert Unverified",
  description: "Warns when job is starting without verified material certification.",
  phase: "pre-calculation",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["quality", "material", "certification", "traceability"],
  handler: (ctx: HookContext): HookResult => {
    const d = (ctx.target?.data ?? {}) as Record<string, any>;
    if (d.materialCertVerified === false)
      return hookWarning(materialCertUnverified, "Material cert not verified — traceability gap", { score: 0.3, warnings: ["Verify MTR before machining — required for aerospace/medical"] });
    return hookSuccess(materialCertUnverified, "Material cert verified or N/A", { score: 1.0 });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const specialtyManufacturingHooks: HookDefinition[] = [
  // Blocking (6)
  singularityApproach,
  rtcpMismatch,
  workEnvelopeExceeded,
  chuckCrushRisk,
  liveToolTorqueExceeded,
  toolReachInsufficient,
  // Warning (14)
  whiteLayerRisk,
  recastLayerThick,
  tailstockForceLow,
  steadyRestNeeded,
  platingAllowanceMissing,
  passivationRequired,
  deburStepMissing,
  barfeedRemnantWaste,
  minimumWallThickness,
  concentricityAtRisk,
  threadReliefMissing,
  cornerRadiusTolerance,
  chipWrapRisk,
  materialCertUnverified,
];
