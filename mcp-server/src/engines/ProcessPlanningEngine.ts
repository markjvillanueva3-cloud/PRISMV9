/**
 * PRISM MCP Server - Process Planning Engine (split from IntelligenceEngine R3)
 *
 * Contains job planning, setup sheet generation, and cycle time estimation.
 * These are the "planning" intelligence actions that compose registry lookups
 * and physics calculations into compound machining plans.
 *
 * Functions:
 *   jobPlan()           - Full machining job plan
 *   setupSheet()        - Setup sheet generation
 *   cycleTimeEstimate() - Cycle time estimation
 */

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSpeedFeed,
  calculateSurfaceFinish,
  calculateMRR,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  getDefaultKienzle,
  getDefaultTaylor,
} from "./ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  type ModalParameters,
} from "./AdvancedCalculations.js";

import {
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
  estimateCycleTime,
} from "./ToolpathCalculations.js";

import { registryManager } from "../registries/manager.js";
import { toolpathRegistry } from "../registries/ToolpathStrategyRegistry.js";
import { log } from "../utils/Logger.js";
import { formatByLevel, type ResponseLevel } from "../types/ResponseLevel.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported feature types for job planning. */
export type FeatureType = "pocket" | "slot" | "face" | "contour" | "hole" | "thread";

/** Input contract for the job_plan intelligence action. */
export interface JobPlanInput {
  material: string;
  feature: string;
  dimensions: {
    width?: number;
    length?: number;
    depth: number;
    diameter?: number;
  };
  tolerance?: number;
  surface_finish?: number;
  machine_id?: string;
  tool_id?: string;
  response_level?: ResponseLevel;
}

/** A single operation within a job plan. */
export interface JobPlanOperation {
  sequence: number;
  type: "roughing" | "semi-finishing" | "finishing";
  params: {
    cutting_speed: number;
    feed_per_tooth: number;
    axial_depth: number;
    radial_depth: number;
    spindle_speed: number;
    feed_rate: number;
  };
  force: { Fc: number; power_kW: number; torque_Nm: number };
  tool_life_min: number;
  surface_finish?: { Ra: number; Rz: number };
}

/** Complete result from the job_plan action. */
export interface JobPlanResult {
  material: { id: string; name: string; iso_group: string };
  operations: JobPlanOperation[];
  coolant: { strategy: string; pressure_bar: number };
  cycle_time: { cutting_min: number; total_min: number };
  stability?: { is_stable: boolean; critical_depth_mm: number; margin_percent: number; recommended_speeds?: number[] };
  safety: { all_checks_passed: boolean; warnings: string[] };
  confidence: number;
}

// Shared constants and helpers (separate module to avoid circular deps)
import {
  INTELLIGENCE_SAFETY_LIMITS,
  DEFAULT_TOOL,
  mapIsoToKienzleGroup,
  mapIsoToTaylorGroup,
  validateRequiredFields,
} from "./IntelligenceShared.js";

// ============================================================================
// JOB PLAN IMPLEMENTATION
// ============================================================================

/**
 * Generate a complete machining job plan by composing registry lookups and
 * physics engine calculations.
 *
 * Steps:
 *  1. Material lookup (registry or conservative defaults)
 *  2. Kienzle / Taylor coefficient extraction
 *  3. Speed/feed calculation
 *  4. Cutting force (Kienzle)
 *  5. Tool life (Taylor)
 *  6. Surface finish prediction
 *  7. Stability check (optional, if modal data available)
 *  8. Cycle time estimation
 *  9. Coolant strategy recommendation
 * 10. Multi-pass strategy (if depth > tool diameter)
 * 11. Safety gate validation and confidence propagation
 *
 * @param params - JobPlanInput describing the desired machining operation
 * @returns A JobPlanResult with operations, coolant, cycle time, and safety info
 */
export async function jobPlan(params: JobPlanInput): Promise<JobPlanResult> {
  const startMs = Date.now();
  const safetyWarnings: string[] = [];
  let confidence = 1.0;

  // -- Defaults --
  const tolerance = params.tolerance ?? 0.05;
  const targetRa = params.surface_finish ?? 3.2;
  const feature = (params.feature || "pocket") as FeatureType;
  const depth = params.dimensions.depth;
  const width = params.dimensions.width ?? 50;
  const length = params.dimensions.length ?? 100;

  // -- 1. Material lookup --
  let mat: any = undefined;
  try {
    mat = await registryManager.materials.getByIdOrName(params.material);
  } catch (err) {
    log.warn(`[IntelligenceEngine] Material registry lookup failed: ${err}`);
  }

  let materialId: string;
  let materialName: string;
  let isoGroup: string;
  let hardnessBrinell: number;
  let thermalConductivity: number;

  if (mat) {
    materialId = mat.id;
    materialName = mat.name;
    isoGroup = mat.iso_group || mat.classification?.iso_group || "P";
    hardnessBrinell = mat.mechanical?.hardness?.brinell ?? 200;
    thermalConductivity = mat.thermal?.thermal_conductivity ?? 50;
    confidence *= mat.metadata?.validation_status === "verified" ? 0.95 : 0.85;
  } else {
    materialId = params.material;
    materialName = params.material;
    isoGroup = "P";
    hardnessBrinell = 200;
    thermalConductivity = 50;
    confidence *= 0.70;
    safetyWarnings.push(
      `Material "${params.material}" not found in registry -- using conservative P-group defaults`
    );
  }

  // -- 2. Extract Kienzle and Taylor coefficients --
  let kienzle: KienzleCoefficients;
  if (mat?.kienzle?.kc1_1 && mat?.kienzle?.mc) {
    kienzle = { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc };
  } else {
    kienzle = getDefaultKienzle(mapIsoToKienzleGroup(isoGroup));
    confidence *= 0.90;
  }

  let taylor: TaylorCoefficients;
  if (mat?.taylor?.C && mat?.taylor?.n) {
    taylor = { C: mat.taylor.C, n: mat.taylor.n };
  } else {
    taylor = getDefaultTaylor(mapIsoToTaylorGroup(isoGroup), DEFAULT_TOOL.tool_material);
    confidence *= 0.90;
  }

  // -- Tool geometry --
  const toolDiameter = params.dimensions.diameter ?? DEFAULT_TOOL.diameter;
  const numTeeth = DEFAULT_TOOL.number_of_teeth;
  const noseRadius = DEFAULT_TOOL.nose_radius;

  // -- 3. Speed/feed for each operation phase --
  const phases: Array<"roughing" | "semi-finishing" | "finishing"> = ["roughing", "semi-finishing", "finishing"];
  const operations: JobPlanOperation[] = [];
  let totalCuttingTimeMin = 0;
  let sequence = 0;

  // Determine if multi-pass is needed
  const needsMultiPass = depth > toolDiameter;
  let multiPassStrategy: any = undefined;

  if (needsMultiPass) {
    // -- 11. Multi-pass strategy --
    const roughSpeed = calculateSpeedFeed({
      material_hardness: hardnessBrinell,
      tool_material: DEFAULT_TOOL.tool_material,
      operation: "roughing",
      tool_diameter: toolDiameter,
      number_of_teeth: numTeeth,
    });
    const finishSpeed = calculateSpeedFeed({
      material_hardness: hardnessBrinell,
      tool_material: DEFAULT_TOOL.tool_material,
      operation: "finishing",
      tool_diameter: toolDiameter,
      number_of_teeth: numTeeth,
    });

    multiPassStrategy = calculateMultiPassStrategy(
      depth,
      toolDiameter,
      kienzle.kc1_1,
      /* machine_power_kw */ 15,
      roughSpeed.cutting_speed,
      finishSpeed.cutting_speed,
      roughSpeed.feed_per_tooth,
      finishSpeed.feed_per_tooth,
      targetRa,
      length
    );
  }

  for (const phase of phases) {
    sequence++;

    // -- 4. Speed/feed --
    const sf = calculateSpeedFeed({
      material_hardness: hardnessBrinell,
      tool_material: DEFAULT_TOOL.tool_material,
      operation: phase,
      tool_diameter: toolDiameter,
      number_of_teeth: numTeeth,
    });

    // Override depths from multi-pass strategy if available
    let axialDepth = sf.axial_depth;
    let radialDepth = sf.radial_depth;

    if (multiPassStrategy?.strategy?.phases) {
      const matchedPhase = multiPassStrategy.strategy.phases.find(
        (p: any) => p.phase === phase
      );
      if (matchedPhase) {
        axialDepth = matchedPhase.ap_mm;
        radialDepth = matchedPhase.ae_mm;
      }
    } else {
      // Single-pass: cap axial depth at available stock proportionally
      if (phase === "roughing") {
        axialDepth = Math.min(sf.axial_depth, depth * 0.7);
      } else if (phase === "semi-finishing") {
        axialDepth = Math.min(sf.axial_depth, depth * 0.2);
      } else {
        axialDepth = Math.min(sf.axial_depth, depth * 0.1, 0.5);
      }
    }

    // Safety clamp
    axialDepth = Math.max(0.05, axialDepth);
    radialDepth = Math.max(0.05, radialDepth);

    const conditions: CuttingConditions = {
      cutting_speed: sf.cutting_speed,
      feed_per_tooth: sf.feed_per_tooth,
      axial_depth: axialDepth,
      radial_depth: radialDepth,
      tool_diameter: toolDiameter,
      number_of_teeth: numTeeth,
    };

    // -- 5. Cutting force --
    const forceResult = calculateKienzleCuttingForce(conditions, kienzle);
    if (forceResult.warnings.length > 0) {
      safetyWarnings.push(...forceResult.warnings.map((w) => `[${phase}] ${w}`));
    }

    // Propagate force confidence
    const forceConfidence = (forceResult as any).uncertainty?.confidence ?? 0.80;
    confidence *= forceConfidence;

    // -- 6. Tool life --
    const toolLifeResult = calculateTaylorToolLife(
      sf.cutting_speed,
      taylor,
      sf.feed_per_tooth,
      axialDepth
    );
    if (toolLifeResult.warnings.length > 0) {
      safetyWarnings.push(...toolLifeResult.warnings.map((w) => `[${phase}] ${w}`));
    }

    // Tool life safety gate
    if (toolLifeResult.tool_life_minutes < INTELLIGENCE_SAFETY_LIMITS.MIN_TOOL_LIFE_HARD) {
      safetyWarnings.push(
        `[${phase}] CRITICAL: Tool life ${toolLifeResult.tool_life_minutes} min < ${INTELLIGENCE_SAFETY_LIMITS.MIN_TOOL_LIFE_HARD} min hard limit`
      );
    } else if (toolLifeResult.tool_life_minutes < INTELLIGENCE_SAFETY_LIMITS.MIN_TOOL_LIFE_WARN) {
      safetyWarnings.push(
        `[${phase}] WARNING: Tool life ${toolLifeResult.tool_life_minutes} min < ${INTELLIGENCE_SAFETY_LIMITS.MIN_TOOL_LIFE_WARN} min recommended minimum`
      );
    }

    // -- 7. Surface finish (only for finishing) --
    let surfaceFinish: { Ra: number; Rz: number } | undefined;
    if (phase === "finishing") {
      const finishResult = calculateSurfaceFinish(
        sf.feed_per_tooth,
        noseRadius,
        /* is_milling */ true,
        radialDepth,
        toolDiameter,
        "milling"
      );
      surfaceFinish = { Ra: finishResult.Ra, Rz: finishResult.Rz };

      if (finishResult.Ra > targetRa) {
        safetyWarnings.push(
          `Predicted Ra ${finishResult.Ra} um exceeds target ${targetRa} um -- consider reducing feed or increasing nose radius`
        );
      }
    }

    // Estimate cutting distance for this phase
    const passCount = multiPassStrategy?.strategy?.phases?.find(
      (p: any) => p.phase === phase
    )?.passes ?? 1;
    const cuttingDistance = length * passCount;
    const feedRate = sf.feed_rate > 0 ? sf.feed_rate : 1;
    const phaseTime = cuttingDistance / feedRate;
    totalCuttingTimeMin += phaseTime;

    // Power calculation
    const powerKw = forceResult.power;
    const torqueNm = forceResult.torque;

    // Power safety gate (if machine_id is provided, check against rating)
    if (powerKw > INTELLIGENCE_SAFETY_LIMITS.MAX_POWER_KW) {
      safetyWarnings.push(
        `[${phase}] Power ${powerKw.toFixed(1)} kW exceeds absolute max ${INTELLIGENCE_SAFETY_LIMITS.MAX_POWER_KW} kW`
      );
    }

    operations.push({
      sequence,
      type: phase,
      params: {
        cutting_speed: sf.cutting_speed,
        feed_per_tooth: sf.feed_per_tooth,
        axial_depth: Math.round(axialDepth * 100) / 100,
        radial_depth: Math.round(radialDepth * 100) / 100,
        spindle_speed: sf.spindle_speed,
        feed_rate: sf.feed_rate,
      },
      force: {
        Fc: Math.round(forceResult.Fc * 10) / 10,
        power_kW: Math.round(powerKw * 100) / 100,
        torque_Nm: Math.round(torqueNm * 100) / 100,
      },
      tool_life_min: toolLifeResult.tool_life_minutes,
      surface_finish: surfaceFinish,
    });
  }

  // -- 8. Stability check --
  // Use user-provided modal parameters or typical VMC defaults.
  // Defaults: fn=1500 Hz, zeta=0.03, k=50 MN/m (representative vertical machining center).
  const modal: ModalParameters = {
    natural_frequency: (params as any).modal?.natural_frequency ?? 1500,
    damping_ratio: (params as any).modal?.damping_ratio ?? 0.03,
    stiffness: (params as any).modal?.stiffness ?? 5e7,
  };
  const stability = calculateStabilityLobes(
    modal,
    kienzle.kc1_1,
    numTeeth,
    operations[0].params.axial_depth,
    operations[0].params.spindle_speed
  );

  // -- 9. Cycle time --
  const avgFeedRate = operations.reduce((s, o) => s + o.params.feed_rate, 0) / operations.length;
  const totalCuttingDistance = length * (multiPassStrategy?.strategy?.total_passes ?? 3);
  const rapidDistance = totalCuttingDistance * 0.3;

  const cycleTimeResult = estimateCycleTime(
    totalCuttingDistance,
    avgFeedRate > 0 ? avgFeedRate : 500,
    rapidDistance,
    /* number_of_tools */ 1,
    /* tool_change_time */ 0.5
  );

  // -- 10. Coolant strategy --
  const coolantResult = recommendCoolantStrategy(
    isoGroup,
    feature,
    operations[0].params.cutting_speed,
    /* tool_has_coolant_through */ false,
    thermalConductivity
  );

  // -- 11. Toolpath strategy recommendation --
  let toolpath: { strategy: string; reasoning: string; alternatives: string[] } | undefined;
  try {
    const tpResult = toolpathRegistry.getBestStrategy(
      feature,
      materialName,
      "roughing",
      { priority: "balanced" }
    );
    if (tpResult?.strategy) {
      toolpath = {
        strategy: `${tpResult.strategy.name} (${tpResult.strategy.id})`,
        reasoning: tpResult.reasoning || tpResult.strategy.description || "",
        alternatives: (tpResult.alternatives || []).slice(0, 3).map((a: any) => a.name || a.id),
      };
    }
  } catch (err) {
    log.warn(`[IntelligenceEngine] Toolpath strategy lookup failed: ${err}`);
  }

  // -- Machine power check (if machine_id provided) --
  if (params.machine_id) {
    try {
      const machine = registryManager.machines.getByIdOrModel(params.machine_id);
      if (machine) {
        const maxSpindlePower = (machine as any).spindle?.max_power_kw
          ?? (machine as any).spindle?.power
          ?? undefined;
        if (maxSpindlePower) {
          for (const op of operations) {
            if (op.force.power_kW > maxSpindlePower) {
              safetyWarnings.push(
                `[${op.type}] Power ${op.force.power_kW} kW exceeds machine "${params.machine_id}" rating of ${maxSpindlePower} kW`
              );
            }
          }
        }
      }
    } catch (err) {
      safetyWarnings.push(`Machine "${params.machine_id}" lookup failed: ${err}`);
    }
  }

  // -- Cutting parameter bounds check --
  for (const op of operations) {
    if (op.params.cutting_speed > INTELLIGENCE_SAFETY_LIMITS.MAX_CUTTING_SPEED) {
      safetyWarnings.push(`[${op.type}] Cutting speed ${op.params.cutting_speed} m/min exceeds safety limit`);
    }
    if (op.params.feed_per_tooth > INTELLIGENCE_SAFETY_LIMITS.MAX_FEED_PER_TOOTH) {
      safetyWarnings.push(`[${op.type}] Feed per tooth ${op.params.feed_per_tooth} mm exceeds safety limit`);
    }
    if (op.params.axial_depth > INTELLIGENCE_SAFETY_LIMITS.MAX_AXIAL_DEPTH) {
      safetyWarnings.push(`[${op.type}] Axial depth ${op.params.axial_depth} mm exceeds safety limit`);
    }
  }

  // -- Confidence floor --
  confidence = Math.max(0.10, Math.min(1.0, confidence));
  confidence = Math.round(confidence * 100) / 100;

  let allChecksPassed = !safetyWarnings.some(
    (w) => w.includes("CRITICAL") || w.includes("SAFETY BLOCK")
  );

  const elapsedMs = Date.now() - startMs;
  log.info(
    `[IntelligenceEngine] job_plan completed in ${elapsedMs}ms, ` +
    `${operations.length} operations, confidence=${confidence}, ` +
    `warnings=${safetyWarnings.length}`
  );

  // Merge stability warnings into safety warnings
  if (stability.warnings?.length) {
    safetyWarnings.push(...stability.warnings);
  }

  // ── 7C: Stability-adjusted speed recommendation ──
  // If unstable, find nearest stable lobe speed and provide adjusted parameters.
  let stability_adjustment: {
    adjusted_speed_rpm: number;
    adjusted_cutting_speed_m_min: number;
    original_speed_rpm: number;
    nearest_lobe: number;
  } | undefined;

  if (!stability.is_stable && stability.spindle_speeds?.length) {
    const currentRPM = operations[0].params.spindle_speed;
    // Find nearest stable speed
    let nearestSpeed = stability.spindle_speeds[0];
    let nearestDist = Math.abs(currentRPM - nearestSpeed);
    let nearestLobe = 0;

    for (let i = 1; i < stability.spindle_speeds.length; i++) {
      const dist = Math.abs(currentRPM - stability.spindle_speeds[i]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestSpeed = stability.spindle_speeds[i];
        nearestLobe = i;
      }
    }

    // Convert RPM back to cutting speed: Vc = π × D × n / 1000
    const D = (operations[0].params as any).tool_diameter ?? DEFAULT_TOOL.diameter;
    const adjustedVc = Math.round((Math.PI * D * nearestSpeed / 1000) * 10) / 10;

    stability_adjustment = {
      adjusted_speed_rpm: nearestSpeed,
      adjusted_cutting_speed_m_min: adjustedVc,
      original_speed_rpm: currentRPM,
      nearest_lobe: nearestLobe,
    };

    safetyWarnings.push(
      `Chatter risk: current axial depth exceeds stability limit ` +
      `(${stability.critical_depth} mm). ` +
      `Adjusted speed recommendation: ${nearestSpeed} RPM (${adjustedVc} m/min) at stable lobe ${nearestLobe}. ` +
      `Original: ${currentRPM} RPM`
    );
    allChecksPassed = false;
  } else if (!stability.is_stable) {
    safetyWarnings.push(
      `Chatter risk: current axial depth exceeds stability limit ` +
      `(${stability.critical_depth} mm). No stable lobes found in usable speed range.`
    );
    allChecksPassed = false;
  }

  const result: JobPlanResult = {
    material: { id: materialId, name: materialName, iso_group: isoGroup },
    operations,
    coolant: {
      strategy: coolantResult.recommendation.strategy,
      pressure_bar: coolantResult.recommendation.pressure_bar,
    },
    cycle_time: {
      cutting_min: Math.round(cycleTimeResult.cutting_time * 10) / 10,
      total_min: Math.round(cycleTimeResult.total_time * 10) / 10,
    },
    stability: {
      is_stable: stability.is_stable,
      critical_depth_mm: stability.critical_depth,
      margin_percent: stability.margin_percent,
      recommended_speeds: stability.spindle_speeds?.slice(0, 5),
      ...(stability_adjustment ? { stability_adjustment } : {}),
    },
    safety: { all_checks_passed: allChecksPassed, warnings: safetyWarnings },
    confidence,
    ...(toolpath ? { toolpath_recommendation: toolpath } : {}),
  };

  // Apply response level formatting if requested
  if (params.response_level && params.response_level !== "full") {
    return formatByLevel(result, params.response_level, (r) => ({
      material: r.material.name,
      iso_group: r.material.iso_group,
      operations_count: r.operations.length,
      roughing_Vc: r.operations.find((o) => o.type === "roughing")?.params.cutting_speed,
      finishing_Ra: r.operations.find((o) => o.type === "finishing")?.surface_finish?.Ra,
      cycle_time_min: r.cycle_time.total_min,
      confidence: r.confidence,
      safety_passed: r.safety.all_checks_passed,
    })).data as any;
  }

  return result;
}

// ============================================================================
// SETUP SHEET
// ============================================================================

/**
 * Generate a setup sheet for a machining job.
 *
 * Internally runs jobPlan for each operation to get cutting parameters,
 * then formats the result as a structured setup sheet.
 *
 * @param params.material - Material name or ID
 * @param params.operations - Array of { feature, depth, width?, length? }
 * @param params.format - "json" | "markdown" | "text" (default: "json")
 * @param params.machine_id - Optional machine for power validation
 * @param params.tool_id - Optional tool override
 */
export async function setupSheet(params: Record<string, any>): Promise<any> {
  validateRequiredFields("setup_sheet", params, ["material", "operations"]);

  const format = params.format || "json";
  const operations = params.operations as Array<Record<string, any>>;
  const materialName = params.material as string;

  // Run job_plan for each operation to get cutting parameters
  const planResults: any[] = [];
  for (const op of operations) {
    const plan = await jobPlan({
      material: materialName,
      feature: op.feature || "pocket",
      dimensions: {
        depth: op.depth || 10,
        width: op.width || 50,
        length: op.length || 100,
        diameter: op.diameter,
      },
      tolerance: op.tolerance ?? params.tolerance,
      surface_finish: op.surface_finish ?? params.surface_finish,
      machine_id: params.machine_id,
      tool_id: params.tool_id,
    });
    planResults.push(plan);
  }

  // Extract unique tools (one per operation in this implementation)
  const tools = operations.map((op, i) => ({
    sequence: i + 1,
    type: "End Mill",
    diameter_mm: op.diameter ?? DEFAULT_TOOL.diameter,
    flutes: DEFAULT_TOOL.number_of_teeth,
    material: DEFAULT_TOOL.tool_material,
    holder: "ER collet",
    stickout_mm: DEFAULT_TOOL.overhang_length,
  }));

  // Build header
  const header = {
    material: materialName,
    iso_group: planResults[0]?.material?.iso_group ?? "P",
    part_description: params.part_name || "Machining Setup",
    date: new Date().toISOString().split("T")[0],
    machine: params.machine_id || "Not specified",
    operator_notes: params.notes || "",
  };

  // Build operations detail
  const opsDetail = planResults.map((plan, i) => ({
    sequence: i + 1,
    feature: operations[i].feature || "pocket",
    phases: plan.operations.map((phase: any) => ({
      type: phase.type,
      cutting_speed: phase.params.cutting_speed,
      feed_per_tooth: phase.params.feed_per_tooth,
      axial_depth: phase.params.axial_depth,
      radial_depth: phase.params.radial_depth,
      spindle_speed: phase.params.spindle_speed,
      feed_rate: phase.params.feed_rate,
    })),
    coolant: plan.coolant,
    cycle_time_min: plan.cycle_time.total_min,
    safety_warnings: plan.safety.warnings,
  }));

  // Safety notes
  const allWarnings = planResults.flatMap((p) => p.safety.warnings || []);
  const safetyNotes = allWarnings.length > 0
    ? allWarnings
    : ["No safety warnings — all parameters within limits"];

  const result: any = {
    header,
    tools,
    operations: opsDetail,
    safety_notes: safetyNotes,
    total_cycle_time_min: planResults.reduce((s, p) => s + p.cycle_time.total_min, 0),
    format,
  };

  // Generate markdown if requested
  if (format === "markdown" || format === "text") {
    const lines: string[] = [];
    lines.push(`# Setup Sheet: ${header.part_description}`);
    lines.push(`**Material:** ${header.material} (ISO ${header.iso_group})`);
    lines.push(`**Date:** ${header.date}`);
    lines.push(`**Machine:** ${header.machine}`);
    lines.push("");
    lines.push("## Tools");
    for (const t of tools) {
      lines.push(`- T${t.sequence}: ${t.type} D${t.diameter_mm}mm, ${t.flutes}F ${t.material}`);
    }
    lines.push("");
    lines.push("## Operations");
    for (const op of opsDetail) {
      lines.push(`### Op ${op.sequence}: ${op.feature}`);
      for (const phase of op.phases) {
        lines.push(
          `  - **${phase.type}**: Vc=${phase.cutting_speed} m/min, ` +
          `fz=${phase.feed_per_tooth} mm, ap=${phase.axial_depth} mm, ` +
          `ae=${phase.radial_depth} mm, N=${phase.spindle_speed} rpm`
        );
      }
      lines.push(`  - Coolant: ${op.coolant.strategy} @ ${op.coolant.pressure_bar} bar`);
      lines.push(`  - Cycle time: ${op.cycle_time_min} min`);
    }
    lines.push("");
    lines.push("## Safety Notes");
    for (const note of safetyNotes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
    lines.push(`**Total cycle time:** ${result.total_cycle_time_min} min`);

    result.markdown = lines.join("\n");
  }

  log.info(
    `[IntelligenceEngine] setup_sheet: ${operations.length} ops, ` +
    `total ${result.total_cycle_time_min} min, format=${format}`
  );

  return result;
}

// ============================================================================
// CYCLE TIME ESTIMATE
// ============================================================================

/**
 * Estimate cycle time for a set of operations without full job planning.
 *
 * For each operation, derives feed rate from speed/feed calculation, then
 * estimates cutting distance from feature dimensions. Sums up cutting time,
 * rapid time, and tool change time across all operations.
 *
 * @param params.operations       - Array of { feature, depth, width, length, material? }
 * @param params.material         - Default material for all operations
 * @param params.tool_change_time - Seconds per tool change (default 8)
 * @param params.rapid_rate       - Rapid traverse mm/min (default 30000)
 * IMPLEMENTED R3-MS0
 */
export async function cycleTimeEstimate(params: Record<string, any>): Promise<any> {
  validateRequiredFields("cycle_time_estimate", params, ["operations"]);

  const operations = params.operations as Array<Record<string, any>>;
  const toolChangeTimeSec = params.tool_change_time ?? 8;
  const toolChangeTimeMin = toolChangeTimeSec / 60;
  const rapidRate = params.rapid_rate ?? 30000;

  // Resolve default material
  const materialName = params.material || operations[0]?.material || "4140 Steel";
  let mat: any;
  try { mat = await registryManager.materials.getByIdOrName(materialName); } catch { /* skip */ }
  const isoGroup = mat?.iso_group || mat?.classification?.iso_group || "P";
  const hardness = mat?.mechanical?.hardness?.brinell ?? 200;

  let totalCuttingTime = 0;
  let totalRapidTime = 0;
  let totalToolChanges = 0;
  const operationDetails: any[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const depth = op.depth ?? 10;
    const width = op.width ?? 50;
    const length = op.length ?? 100;
    const D = op.tool_diameter ?? DEFAULT_TOOL.diameter;
    const z = op.number_of_teeth ?? DEFAULT_TOOL.number_of_teeth;
    const operation = op.operation || "roughing";

    // Get speed/feed for this operation
    const sf = calculateSpeedFeed({
      material_hardness: hardness,
      tool_material: "Carbide",
      operation,
      tool_diameter: D,
      number_of_teeth: z,
    });

    // Estimate number of passes based on depth and axial depth
    const ap = sf.axial_depth;
    const ae = sf.radial_depth;
    const numAxialPasses = Math.ceil(depth / ap);
    const numRadialPasses = Math.ceil(width / ae);

    // Cutting distance: passes × length, roughly
    const cuttingDistance = numAxialPasses * numRadialPasses * length; // mm
    // Rapid distance: approach + retract per pass + moves between passes
    const rapidDistance = numAxialPasses * numRadialPasses * (50 + D * 2) + 100; // mm estimate

    const cuttingTime = cuttingDistance / sf.feed_rate; // minutes
    const rapidTime = rapidDistance / rapidRate; // minutes

    totalCuttingTime += cuttingTime;
    totalRapidTime += rapidTime;
    if (i > 0) totalToolChanges++;

    operationDetails.push({
      index: i + 1,
      feature: op.feature || "unknown",
      operation,
      cutting_speed: sf.cutting_speed,
      feed_rate: sf.feed_rate,
      axial_depth: ap,
      radial_depth: ae,
      passes: numAxialPasses * numRadialPasses,
      cutting_time_min: Math.round(cuttingTime * 100) / 100,
      rapid_time_min: Math.round(rapidTime * 100) / 100,
    });
  }

  const toolChangeTotal = totalToolChanges * toolChangeTimeMin;
  const totalTime = totalCuttingTime + totalRapidTime + toolChangeTotal;
  const utilization = totalTime > 0 ? (totalCuttingTime / totalTime) * 100 : 0;

  const warnings: string[] = [];
  if (utilization < 50) warnings.push("Low spindle utilization — consider consolidating tool paths");
  if (totalTime > 120) warnings.push("Cycle time exceeds 2 hours — consider batch splitting or parallel fixturing");

  log.info(
    `[IntelligenceEngine] cycle_time_estimate: ${operations.length} ops, ` +
    `total=${totalTime.toFixed(1)} min (cutting=${totalCuttingTime.toFixed(1)}, ` +
    `rapid=${totalRapidTime.toFixed(1)}, tool_change=${toolChangeTotal.toFixed(1)})`
  );

  return {
    material: mat?.name || materialName,
    total_time_min: Math.round(totalTime * 10) / 10,
    cutting_time_min: Math.round(totalCuttingTime * 10) / 10,
    rapid_time_min: Math.round(totalRapidTime * 10) / 10,
    tool_change_time_min: Math.round(toolChangeTotal * 10) / 10,
    tool_changes: totalToolChanges,
    utilization_percent: Math.round(utilization * 10) / 10,
    operations: operationDetails,
    warnings,
  };
}
