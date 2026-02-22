/**
 * PRISM MCP Server - Intelligence Engine (R3)
 *
 * Composes calibrated physics engines into 11 high-level intelligence actions.
 * This engine does NOT rewrite any physics -- it orchestrates existing engines
 * (ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations) and
 * registry lookups into compound results that answer real manufacturing questions
 * in a single round-trip.
 *
 * Architecture:
 *   User query -> IntelligenceEngine -> [registry lookups + N engine calls] -> compound result
 *
 * Actions (11):
 *   job_plan             - Full machining job plan (IMPLEMENTED)
 *   setup_sheet           - Setup sheet generation (IMPLEMENTED R3-MS0)
 *   process_cost          - Process costing (IMPLEMENTED R3-MS0)
 *   material_recommend    - Material recommendation (IMPLEMENTED R3-MS0)
 *   tool_recommend        - Tool recommendation (IMPLEMENTED R3-MS0)
 *   machine_recommend     - Machine recommendation (IMPLEMENTED R3-MS0)
 *   what_if               - What-if scenario analysis (IMPLEMENTED R3-MS0)
 *   failure_diagnose      - Failure root cause analysis (IMPLEMENTED R3-MS0)
 *   parameter_optimize    - Multi-objective parameter optimization (IMPLEMENTED R3-MS0)
 *   cycle_time_estimate   - Cycle time estimation (IMPLEMENTED R3-MS0)
 *   quality_predict       - Quality prediction (IMPLEMENTED R3-MS0)
 *
 * SAFETY CRITICAL: All cutting parameters are validated against SAFETY_LIMITS.
 * Power is checked against machine rating when machine_id is provided.
 * Tool life below 5 minutes triggers a hard warning.
 */

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSpeedFeed,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  getDefaultKienzle,
  getDefaultTaylor,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
} from "./ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type ModalParameters,
  type CostParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
} from "./AdvancedCalculations.js";

import {
  calculateChipThinning,
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
  estimateCycleTime,
} from "./ToolpathCalculations.js";

import { findAchievableGrade } from "./ToleranceEngine.js";
import { registryManager } from "../registries/manager.js";
import { log } from "../utils/Logger.js";
import { formatByLevel, type ResponseLevel } from "../types/ResponseLevel.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported feature types for job planning. */
type FeatureType = "pocket" | "slot" | "face" | "contour" | "hole" | "thread";

/** Input contract for the job_plan intelligence action. */
interface JobPlanInput {
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
interface JobPlanOperation {
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
interface JobPlanResult {
  material: { id: string; name: string; iso_group: string };
  operations: JobPlanOperation[];
  coolant: { strategy: string; pressure_bar: number };
  cycle_time: { cutting_min: number; total_min: number };
  stability?: { is_stable: boolean; critical_depth_mm: number; margin_percent: number; recommended_speeds?: number[] };
  safety: { all_checks_passed: boolean; warnings: string[] };
  confidence: number;
}

// ============================================================================
// SAFETY LIMITS (mirrors ManufacturingCalculations but used for gate checks)
// ============================================================================

const INTELLIGENCE_SAFETY_LIMITS = {
  MAX_CUTTING_SPEED: 2000,
  MAX_FEED_PER_TOOTH: 2.0,
  MAX_AXIAL_DEPTH: 100,
  MAX_POWER_KW: 500,
  MIN_TOOL_LIFE_WARN: 15,
  MIN_TOOL_LIFE_HARD: 5,
} as const;

// ============================================================================
// DEFAULT TOOL GEOMETRY (used when no tool_id is provided)
// ============================================================================

const DEFAULT_TOOL = {
  diameter: 12,
  number_of_teeth: 4,
  nose_radius: 0.8,
  tool_material: "Carbide" as const,
  overhang_length: 40,
};

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
async function jobPlan(params: JobPlanInput): Promise<JobPlanResult> {
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
    natural_frequency: params.modal?.natural_frequency ?? 1500,
    damping_ratio: params.modal?.damping_ratio ?? 0.03,
    stiffness: params.modal?.stiffness ?? 5e7,
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
  if (!stability.is_stable) {
    safetyWarnings.push(
      `Chatter risk: current axial depth exceeds stability limit ` +
      `(${stability.critical_depth} mm). ` +
      `Consider recommended speeds: ${stability.spindle_speeds?.slice(0, 3).join(", ")} RPM`
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
    },
    safety: { all_checks_passed: allChecksPassed, warnings: safetyWarnings },
    confidence,
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
// ISO GROUP MAPPING HELPERS
// ============================================================================

/** Map ISO material group letter to Kienzle default lookup key. */
function mapIsoToKienzleGroup(isoGroup: string): string {
  const map: Record<string, string> = {
    P: "steel_medium_carbon",
    M: "stainless_austenitic",
    K: "cast_iron_gray",
    N: "aluminum_wrought",
    S: "titanium",
    H: "steel_high_carbon",
    X: "steel_alloy",
  };
  return map[isoGroup] || "steel_medium_carbon";
}

/** Map ISO material group letter to Taylor default lookup key. */
function mapIsoToTaylorGroup(isoGroup: string): string {
  const map: Record<string, string> = {
    P: "steel",
    M: "stainless",
    K: "cast_iron",
    N: "aluminum",
    S: "titanium",
    H: "steel",
    X: "steel",
  };
  return map[isoGroup] || "steel";
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that required fields exist on a params object. Throws with a
 * clear message identifying the action and the missing field.
 */
function validateRequiredFields(
  actionName: string,
  params: Record<string, any>,
  fields: string[]
): void {
  for (const field of fields) {
    if (params[field] === undefined || params[field] === null) {
      throw new Error(
        `[IntelligenceEngine] ${actionName}: missing required field "${field}"`
      );
    }
  }
}

/** Throw a standard NOT_IMPLEMENTED error for stub actions. */
function throwNotImplemented(actionName: string): never {
  throw new Error(
    `[IntelligenceEngine] ${actionName} is not yet implemented (R3-MS1)`
  );
}

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
async function setupSheet(params: Record<string, any>): Promise<any> {
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

/**
 * Calculate full process cost including machine time, tooling, and setup.
 *
 * Cost model:
 *   total_cost_per_part = machine_cost + tool_cost_per_part + setup_cost_per_part
 *   machine_cost = (cycle_time_min / 60) * machine_rate_per_hour
 *   tool_cost_per_part = tool_cost / parts_per_edge
 *   parts_per_edge = tool_life_min / cycle_time_min
 *   setup_cost_per_part = (setup_time_min / 60 * machine_rate_per_hour) / batch_size
 *
 * @param params.material - Material name or ID
 * @param params.operations - Array of { feature, depth, width?, length? }
 * @param params.machine_rate_per_hour - Machine cost per hour (default: 75)
 * @param params.tool_cost - Cost per tool (default: 45)
 * @param params.batch_size - Parts per batch (default: 1)
 * @param params.setup_time_min - Setup time in minutes (default: 30)
 */
async function processCost(params: Record<string, any>): Promise<any> {
  validateRequiredFields("process_cost", params, ["material", "operations"]);

  const machineRate = params.machine_rate_per_hour ?? 75;
  const toolCost = params.tool_cost ?? 45;
  const batchSize = Math.max(1, params.batch_size ?? 1);
  const setupTimeMin = params.setup_time_min ?? 30;

  const operations = params.operations as Array<Record<string, any>>;
  const materialName = params.material as string;

  // Run job_plan for each operation to get cycle time and tool life
  let totalCycleTimeMin = 0;
  let minToolLifeMin = Infinity;
  const opCosts: any[] = [];

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
      machine_id: params.machine_id,
    });

    const cycleMin = plan.cycle_time.total_min;
    totalCycleTimeMin += cycleMin;

    // Minimum tool life across all phases
    const phaseToolLife = plan.operations.reduce(
      (min: number, o: any) => Math.min(min, o.tool_life_min),
      Infinity
    );
    minToolLifeMin = Math.min(minToolLifeMin, phaseToolLife);

    opCosts.push({
      feature: op.feature || "pocket",
      cycle_time_min: cycleMin,
      tool_life_min: phaseToolLife,
    });
  }

  // Cost calculations
  const partsPerEdge = minToolLifeMin > 0 && totalCycleTimeMin > 0
    ? Math.floor(minToolLifeMin / totalCycleTimeMin)
    : 1;
  const effectivePartsPerEdge = Math.max(1, partsPerEdge);

  const machineCost = (totalCycleTimeMin / 60) * machineRate;
  const toolCostPerPart = toolCost / effectivePartsPerEdge;
  const setupCostPerPart = (setupTimeMin / 60 * machineRate) / batchSize;
  const totalCostPerPart = machineCost + toolCostPerPart + setupCostPerPart;

  const result = {
    total_cost_per_part: Math.round(totalCostPerPart * 100) / 100,
    machine_cost: Math.round(machineCost * 100) / 100,
    tool_cost_per_part: Math.round(toolCostPerPart * 100) / 100,
    setup_cost_per_part: Math.round(setupCostPerPart * 100) / 100,
    cycle_time_min: Math.round(totalCycleTimeMin * 10) / 10,
    tool_life_min: Math.round(minToolLifeMin * 10) / 10,
    parts_per_edge: effectivePartsPerEdge,
    batch_size: batchSize,
    breakdown: opCosts,
    inputs: {
      machine_rate_per_hour: machineRate,
      tool_cost: toolCost,
      setup_time_min: setupTimeMin,
    },
  };

  log.info(
    `[IntelligenceEngine] process_cost: $${result.total_cost_per_part}/part, ` +
    `cycle=${result.cycle_time_min}min, batch=${batchSize}`
  );

  return result;
}

/**
 * Recommend materials for a given application and constraints.
 *
 * Searches the MaterialRegistry, then ranks candidates by a composite score
 * based on machinability, available physics data (Kienzle/Taylor), cost ranking,
 * and hardness fit.
 *
 * @param params.application - Application description (used as search query)
 * @param params.iso_group - Optional ISO group filter (P, M, K, N, S, H)
 * @param params.hardness_range - Optional { min, max } Brinell hardness range
 * @param params.priorities - Optional ranking priority order (default: ["machinability", "cost"])
 * @param params.limit - Max candidates to return (default: 5)
 */
async function materialRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("material_recommend", params, ["application"]);

  const limit = params.limit ?? 5;
  const priorities = params.priorities ?? ["machinability", "cost"];

  // Search registry
  const searchResult = await registryManager.materials.search({
    query: params.application as string,
    iso_group: params.iso_group,
    hardness_min: params.hardness_range?.min,
    hardness_max: params.hardness_range?.max,
    limit: Math.max(limit * 3, 20), // fetch extra for scoring
  });

  // If text query returned nothing, broaden to ISO group or all
  let materials = searchResult.materials;
  if (materials.length === 0 && params.iso_group) {
    const broader = await registryManager.materials.search({
      iso_group: params.iso_group,
      hardness_min: params.hardness_range?.min,
      hardness_max: params.hardness_range?.max,
      limit: Math.max(limit * 3, 20),
    });
    materials = broader.materials;
  }
  if (materials.length === 0) {
    const all = await registryManager.materials.search({ query: "*", limit: 30 });
    materials = all.materials;
  }

  // Score each material
  const scored = materials.map((m: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Machinability rating (0-100 → 0-0.4)
    const machinability = m.machining?.machinability_rating ?? 50;
    const machinabilityScore = (machinability / 100) * 0.4;
    score += machinabilityScore;
    if (machinability > 70) reasons.push("High machinability");

    // Physics data availability (Kienzle + Taylor → 0-0.3)
    const hasKienzle = m.kienzle?.kc1_1 && m.kienzle?.mc;
    const hasTaylor = m.taylor?.C && m.taylor?.n;
    if (hasKienzle) { score += 0.15; reasons.push("Kienzle calibrated"); }
    if (hasTaylor) { score += 0.15; reasons.push("Taylor calibrated"); }

    // Hardness fit (if range specified → 0-0.15)
    if (params.hardness_range) {
      const hb = m.mechanical?.hardness_hb ?? m.mechanical?.hardness?.brinell ?? 200;
      const { min, max } = params.hardness_range;
      if (hb >= (min ?? 0) && hb <= (max ?? 9999)) {
        score += 0.15;
        reasons.push(`Hardness ${hb} HB within range`);
      }
    } else {
      score += 0.10; // No constraint = partial credit
    }

    // Verified status bonus (0-0.15)
    if (m.metadata?.validation_status === "verified") {
      score += 0.15;
      reasons.push("Verified data");
    } else {
      score += 0.05;
    }

    return {
      id: m.material_id || m.id,
      name: m.name,
      iso_group: m.classification?.iso_group || (m as any).iso_group || "?",
      hardness_hb: m.mechanical?.hardness_hb ?? m.mechanical?.hardness?.brinell,
      machinability_rating: machinability,
      has_kienzle: !!hasKienzle,
      has_taylor: !!hasTaylor,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  // Sort by score descending
  scored.sort((a: any, b: any) => b.score - a.score);

  // Take top N
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] material_recommend: ${materials.length} searched, ` +
    `${candidates.length} returned, top=${candidates[0]?.name}`
  );

  return {
    application: params.application,
    constraints: {
      iso_group: params.iso_group,
      hardness_range: params.hardness_range,
      priorities,
    },
    candidates,
    total_searched: materials.length,
  };
}

/**
 * Recommend cutting tools for a given material and feature.
 *
 * Searches the ToolRegistry by material group and optional filters,
 * then ranks candidates by suitability score.
 *
 * @param params.material - Material name (used to determine ISO group)
 * @param params.feature - Feature type (pocket, slot, face, contour, hole, thread)
 * @param params.iso_group - Optional ISO group override (P, M, K, N, S, H)
 * @param params.diameter_range - Optional { min, max } diameter in mm
 * @param params.type - Optional tool type filter (endmill, drill, etc.)
 * @param params.limit - Max candidates to return (default: 5)
 */
async function toolRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("tool_recommend", params, ["material", "feature"]);

  const limit = params.limit ?? 5;
  const feature = params.feature as string;

  // Determine ISO group from material
  let isoGroup = params.iso_group;
  if (!isoGroup) {
    try {
      const mat = await registryManager.materials.getByIdOrName(params.material);
      isoGroup = mat?.classification?.iso_group || (mat as any)?.iso_group || "P";
    } catch {
      isoGroup = "P";
    }
  }

  // Map feature to preferred tool type
  const featureToType: Record<string, string> = {
    pocket: "endmill",
    slot: "endmill",
    face: "facemill",
    contour: "endmill",
    hole: "drill",
    thread: "tap",
  };
  const preferredType = params.type || featureToType[feature] || "endmill";

  // Search tools
  const searchResult = registryManager.tools.search({
    material_group: isoGroup,
    type: preferredType,
    diameter_min: params.diameter_range?.min,
    diameter_max: params.diameter_range?.max,
    limit: Math.max(limit * 4, 20),
  });

  let tools = searchResult.tools;

  // If no results with type filter, broaden search
  if (tools.length === 0) {
    const broader = registryManager.tools.search({
      material_group: isoGroup,
      diameter_min: params.diameter_range?.min,
      diameter_max: params.diameter_range?.max,
      limit: Math.max(limit * 4, 20),
    });
    tools = broader.tools;
  }
  if (tools.length === 0) {
    const all = registryManager.tools.search({ query: "*", limit: 30 });
    tools = all.tools;
  }

  // Score each tool
  const scored = tools.map((t: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Material group match (0-0.3)
    const materialGroups = t.material_groups || [];
    const cpMaterials = t.cutting_params?.materials ? Object.keys(t.cutting_params.materials) : [];
    const hasGroupMatch = materialGroups.includes(isoGroup) ||
      cpMaterials.some((k: string) => k.startsWith(isoGroup));
    if (hasGroupMatch) {
      score += 0.30;
      reasons.push(`Rated for ISO ${isoGroup}`);
    }

    // Type match (0-0.25)
    const toolType = (t.type || t.category || "").toLowerCase();
    if (toolType.includes(preferredType)) {
      score += 0.25;
      reasons.push(`Type match: ${preferredType}`);
    }

    // Diameter fit (0-0.15)
    const diam = t.cutting_diameter_mm || t.geometry?.diameter;
    if (diam && params.diameter_range) {
      const { min, max } = params.diameter_range;
      if (diam >= (min ?? 0) && diam <= (max ?? 999)) {
        score += 0.15;
        reasons.push(`Diameter ${diam}mm in range`);
      }
    } else if (diam) {
      score += 0.10;
    }

    // Coating bonus (0-0.15)
    const coating = t.coating || t.coating_type;
    if (coating) {
      score += 0.10;
      reasons.push(`Coated: ${coating}`);
      // Premium coatings get extra
      if (/AlTiN|TiAlN|nACo/i.test(String(coating))) {
        score += 0.05;
        reasons.push("Premium coating");
      }
    }

    // Flute count appropriateness (0-0.15)
    const flutes = t.flutes || t.geometry?.flutes;
    if (flutes) {
      // General heuristic: aluminum=2-3 flutes, steel=4+, titanium=4-5
      const idealFlutes: Record<string, number> = { P: 4, M: 4, K: 4, N: 3, S: 5, H: 4 };
      const ideal = idealFlutes[isoGroup] || 4;
      const delta = Math.abs(flutes - ideal);
      score += Math.max(0, 0.15 - delta * 0.05);
    }

    return {
      id: t.tool_id || t.id,
      name: t.name || `${t.type} D${diam}mm`,
      type: t.type || t.category,
      diameter_mm: diam,
      flutes,
      coating,
      manufacturer: t.manufacturer || t.vendor,
      material_groups: materialGroups,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] tool_recommend: ${tools.length} searched, ` +
    `${candidates.length} returned, iso=${isoGroup}, feature=${feature}`
  );

  return {
    material: params.material,
    feature,
    iso_group: isoGroup,
    constraints: {
      type: preferredType,
      diameter_range: params.diameter_range,
    },
    candidates,
    total_searched: tools.length,
  };
}

/**
 * Recommend machines capable of producing a given part.
 *
 * Searches the MachineRegistry by travel envelope, spindle specs, and
 * machine type, then ranks by utilization efficiency.
 *
 * @param params.part_envelope - { x, y, z } in mm (required travel)
 * @param params.type - Machine type filter (VMC, HMC, etc.)
 * @param params.min_spindle_rpm - Minimum spindle speed
 * @param params.min_spindle_power - Minimum spindle power in kW
 * @param params.simultaneous_axes - Required axes (3, 4, 5)
 * @param params.manufacturer - Optional manufacturer filter
 * @param params.limit - Max candidates (default: 5)
 */
async function machineRecommend(params: Record<string, any>): Promise<any> {
  validateRequiredFields("machine_recommend", params, ["part_envelope"]);

  const limit = params.limit ?? 5;
  const envelope = params.part_envelope as { x: number; y: number; z: number };

  // Add safety margin (20%) to required travel
  const reqX = envelope.x * 1.2;
  const reqY = envelope.y * 1.2;
  const reqZ = envelope.z * 1.2;

  // Search machines
  const searchResult = registryManager.machines.search({
    type: params.type,
    manufacturer: params.manufacturer,
    min_x_travel: reqX,
    min_y_travel: reqY,
    min_z_travel: reqZ,
    min_spindle_rpm: params.min_spindle_rpm,
    min_spindle_power: params.min_spindle_power,
    simultaneous_axes: params.simultaneous_axes,
    limit: Math.max(limit * 4, 20),
  });

  let machines = searchResult.machines;

  // If too few results, relax travel constraints
  if (machines.length < limit) {
    const relaxed = registryManager.machines.search({
      type: params.type,
      min_spindle_rpm: params.min_spindle_rpm,
      limit: Math.max(limit * 4, 30),
    });
    // Merge, dedup by ID
    const seen = new Set(machines.map((m: any) => m.id));
    for (const m of relaxed.machines) {
      if (!seen.has(m.id)) {
        machines.push(m);
        seen.add(m.id);
      }
    }
  }

  // Score each machine
  const scored = machines.map((m: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Travel envelope fit (0-0.30)
    const xTravel = m.envelope?.x_travel ?? 0;
    const yTravel = m.envelope?.y_travel ?? 0;
    const zTravel = m.envelope?.z_travel ?? 0;

    const xFits = xTravel >= reqX;
    const yFits = yTravel >= reqY;
    const zFits = zTravel >= reqZ;

    if (xFits && yFits && zFits) {
      score += 0.30;
      reasons.push("Full envelope fit");
    } else {
      // Partial credit for partial fit
      if (xFits) score += 0.10;
      if (yFits) score += 0.10;
      if (zFits) score += 0.10;
      if (!xFits) reasons.push(`X travel ${xTravel}mm < ${Math.round(reqX)}mm needed`);
      if (!yFits) reasons.push(`Y travel ${yTravel}mm < ${Math.round(reqY)}mm needed`);
      if (!zFits) reasons.push(`Z travel ${zTravel}mm < ${Math.round(reqZ)}mm needed`);
    }

    // Utilization efficiency — penalize oversized machines (0-0.20)
    if (xFits && yFits && zFits) {
      const utilX = envelope.x / xTravel;
      const utilY = envelope.y / yTravel;
      const utilZ = envelope.z / zTravel;
      const avgUtil = (utilX + utilY + utilZ) / 3;
      // Sweet spot: 40-80% utilization
      if (avgUtil >= 0.3 && avgUtil <= 0.85) {
        score += 0.20;
        reasons.push(`Good utilization: ${Math.round(avgUtil * 100)}%`);
      } else if (avgUtil > 0.85) {
        score += 0.10;
        reasons.push(`Tight fit: ${Math.round(avgUtil * 100)}% utilization`);
      } else {
        score += 0.05;
        reasons.push(`Oversized: ${Math.round(avgUtil * 100)}% utilization`);
      }
    }

    // Spindle RPM match (0-0.15)
    const maxRpm = m.spindle?.max_rpm ?? 0;
    if (params.min_spindle_rpm && maxRpm >= params.min_spindle_rpm) {
      score += 0.15;
      reasons.push(`Spindle ${maxRpm} rpm`);
    } else if (maxRpm > 0) {
      score += 0.05;
    }

    // Spindle power (0-0.15)
    const power = m.spindle?.power_continuous ?? m.spindle?.power_30min ?? 0;
    if (params.min_spindle_power && power >= params.min_spindle_power) {
      score += 0.15;
      reasons.push(`Power ${power} kW`);
    } else if (power > 0) {
      score += 0.05;
    }

    // Type match (0-0.10)
    if (params.type && m.type?.toLowerCase().includes(params.type.toLowerCase())) {
      score += 0.10;
      reasons.push(`Type match: ${m.type}`);
    }

    // Tool changer capacity bonus (0-0.10)
    const toolCap = m.tool_changer?.capacity ?? 0;
    if (toolCap >= 30) {
      score += 0.10;
      reasons.push(`${toolCap} tool capacity`);
    } else if (toolCap >= 20) {
      score += 0.05;
    }

    const utilPct = (xFits && yFits && zFits)
      ? Math.round(((envelope.x / xTravel + envelope.y / yTravel + envelope.z / zTravel) / 3) * 100)
      : 0;

    return {
      id: m.id,
      name: m.name || `${m.manufacturer} ${m.model}`,
      manufacturer: m.manufacturer,
      model: m.model,
      type: m.type,
      envelope: { x: xTravel, y: yTravel, z: zTravel },
      spindle_rpm: maxRpm,
      spindle_power_kw: power,
      tool_capacity: toolCap,
      utilization_pct: utilPct,
      score: Math.round(score * 100) / 100,
      reasons,
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  const candidates = scored.slice(0, limit);

  log.info(
    `[IntelligenceEngine] machine_recommend: ${machines.length} searched, ` +
    `${candidates.length} returned, envelope=${envelope.x}x${envelope.y}x${envelope.z}`
  );

  return {
    part_envelope: envelope,
    constraints: {
      type: params.type,
      min_spindle_rpm: params.min_spindle_rpm,
      min_spindle_power: params.min_spindle_power,
      simultaneous_axes: params.simultaneous_axes,
    },
    candidates,
    total_searched: machines.length,
  };
}

/**
 * Run what-if scenario analysis on cutting parameters.
 *
 * Compares baseline cutting parameters against a modified set to show the
 * impact on force, power, tool life, surface finish, and MRR. Useful for
 * quick "what happens if I bump speed by 20%?" exploration without building
 * a full job plan.
 *
 * @param params.baseline - Base cutting parameters (material, cutting_speed, feed_per_tooth, etc.)
 * @param params.changes  - Object with parameters to override in the scenario
 * @param params.material - Optional material name for Kienzle/Taylor lookup
 * IMPLEMENTED R3-MS0
 */
async function whatIf(params: Record<string, any>): Promise<any> {
  validateRequiredFields("what_if", params, ["baseline", "changes"]);

  const baseline = params.baseline as Record<string, any>;
  const changes = params.changes as Record<string, any>;

  // Merge: scenario = baseline overridden by changes
  const scenario = { ...baseline, ...changes };

  // Resolve material coefficients
  let kienzle: KienzleCoefficients;
  let taylor: TaylorCoefficients;
  let materialName = params.material || baseline.material || "Unknown";

  if (params.material || baseline.material) {
    const matName = params.material || baseline.material;
    let mat: any;
    try { mat = await registryManager.materials.getByIdOrName(matName); } catch { /* skip */ }
    if (mat) {
      materialName = mat.name;
      const isoGroup = mat.iso_group || mat.classification?.iso_group || "P";
      kienzle = mat.kienzle?.kc1_1 ? { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc } : getDefaultKienzle(mapIsoToKienzleGroup(isoGroup));
      taylor = mat.taylor?.C ? { C: mat.taylor.C, n: mat.taylor.n } : getDefaultTaylor(mapIsoToTaylorGroup(isoGroup));
    } else {
      kienzle = getDefaultKienzle("steel_medium_carbon");
      taylor = getDefaultTaylor("steel");
    }
  } else {
    kienzle = getDefaultKienzle("steel_medium_carbon");
    taylor = getDefaultTaylor("steel");
  }

  // Helper to compute metrics for a parameter set
  function computeMetrics(p: Record<string, any>) {
    const Vc = p.cutting_speed ?? 150;
    const fz = p.feed_per_tooth ?? 0.1;
    const ap = p.axial_depth ?? 3;
    const ae = p.radial_depth ?? 6;
    const D = p.tool_diameter ?? DEFAULT_TOOL.diameter;
    const z = p.number_of_teeth ?? DEFAULT_TOOL.number_of_teeth;
    const noseR = p.nose_radius ?? DEFAULT_TOOL.nose_radius;

    const conditions: CuttingConditions = {
      cutting_speed: Vc, feed_per_tooth: fz, axial_depth: ap,
      radial_depth: ae, tool_diameter: D, number_of_teeth: z,
    };

    const force = calculateKienzleCuttingForce(conditions, kienzle);
    const toolLife = calculateTaylorToolLife(Vc, taylor, fz, ap);
    const sf = calculateSurfaceFinish(fz, noseR, true, ae, D);
    const mrr = calculateMRR(conditions);
    const power = calculateSpindlePower(force.Fc, Vc, D);

    return {
      cutting_speed: Vc,
      feed_per_tooth: fz,
      axial_depth: ap,
      radial_depth: ae,
      tool_diameter: D,
      cutting_force_N: force.Fc,
      tool_life_min: toolLife.tool_life_minutes,
      surface_finish_Ra: sf.Ra,
      surface_finish_Rz: sf.Rz,
      mrr_cm3_min: mrr.mrr,
      power_kW: power.power_spindle_kw,
      warnings: [...force.warnings, ...toolLife.warnings, ...sf.warnings, ...mrr.warnings],
    };
  }

  const baseMetrics = computeMetrics(baseline);
  const scenarioMetrics = computeMetrics(scenario);

  // Calculate deltas (scenario - baseline) with percentage
  function delta(base: number, scen: number) {
    const diff = scen - base;
    const pct = base !== 0 ? (diff / base) * 100 : 0;
    return { value: Math.round(diff * 100) / 100, percent: Math.round(pct * 10) / 10 };
  }

  const deltas = {
    cutting_force_N: delta(baseMetrics.cutting_force_N, scenarioMetrics.cutting_force_N),
    tool_life_min: delta(baseMetrics.tool_life_min, scenarioMetrics.tool_life_min),
    surface_finish_Ra: delta(baseMetrics.surface_finish_Ra, scenarioMetrics.surface_finish_Ra),
    mrr_cm3_min: delta(baseMetrics.mrr_cm3_min, scenarioMetrics.mrr_cm3_min),
    power_kW: delta(baseMetrics.power_kW, scenarioMetrics.power_kW),
  };

  // Generate insight summary
  const insights: string[] = [];
  if (deltas.tool_life_min.percent < -30) insights.push("Significant tool life reduction — consider cost impact");
  if (deltas.cutting_force_N.percent > 25) insights.push("Force increase may cause chatter or deflection");
  if (deltas.surface_finish_Ra.percent > 20) insights.push("Surface finish degradation — verify against tolerance");
  if (deltas.mrr_cm3_min.percent > 15) insights.push("Productivity gain from higher MRR");
  if (deltas.power_kW.percent > 40) insights.push("Power spike — verify machine capacity");
  if (scenarioMetrics.tool_life_min < 5) insights.push("CRITICAL: Tool life below 5 min — Taylor cliff zone");

  log.info(`[IntelligenceEngine] what_if: Vc ${baseMetrics.cutting_speed}→${scenarioMetrics.cutting_speed}, ` +
    `force Δ${deltas.cutting_force_N.percent}%, life Δ${deltas.tool_life_min.percent}%`);

  return {
    material: materialName,
    changes_applied: changes,
    baseline: baseMetrics,
    scenario: scenarioMetrics,
    deltas,
    insights,
  };
}

/**
 * Diagnose root cause of a machining failure from symptoms and/or alarm codes.
 *
 * Two input modes:
 *   1. Symptom-based: pass `symptoms` array — matches against 7 failure mode KB
 *   2. Alarm-based: pass `alarm_code` + `controller` — decodes via AlarmRegistry (9,200+ codes)
 *   3. Combined: both inputs are merged into a unified diagnosis
 *
 * @param params.symptoms     - Array of symptom strings or comma-separated string
 * @param params.alarm_code   - Alarm code (e.g. "445", "SV0401", "2024")
 * @param params.controller   - Controller family (e.g. "FANUC", "SIEMENS", "HAAS")
 * @param params.material     - Optional material name for context
 * @param params.operation    - Optional operation type (roughing, finishing, etc.)
 * @param params.parameters   - Optional current cutting parameters for physics cross-check
 * IMPLEMENTED R3-MS0 (alarm integration added R3-MS0 hardening)
 */
async function failureDiagnose(params: Record<string, any>): Promise<any> {
  // At least one of symptoms or alarm_code must be provided
  if (!params.symptoms && !params.alarm_code) {
    throw new Error(
      '[IntelligenceEngine] failure_diagnose: at least one of "symptoms" or "alarm_code" is required'
    );
  }

  // Normalize symptoms to string array
  let symptoms: string[] = [];
  if (params.symptoms) {
    symptoms = Array.isArray(params.symptoms)
      ? params.symptoms
      : String(params.symptoms).split(",").map((s: string) => s.trim());
  }
  symptoms = symptoms.map((s: string) => s.toLowerCase());

  // -- Alarm code lookup via AlarmRegistry --
  let alarmResult: any = undefined;
  if (params.alarm_code) {
    const controller = params.controller || "FANUC"; // default to most common
    try {
      const alarm = await registryManager.alarms.decode(controller, String(params.alarm_code));
      if (alarm) {
        alarmResult = {
          alarm_id: alarm.alarm_id,
          code: alarm.code,
          name: alarm.name,
          controller_family: alarm.controller_family,
          category: alarm.category,
          severity: alarm.severity,
          description: alarm.description,
          causes: alarm.causes,
          quick_fix: alarm.quick_fix,
          requires_power_cycle: alarm.requires_power_cycle,
          fix_procedures: alarm.fix_procedures?.map((fp: any) => ({
            step: fp.step,
            action: fp.action,
            details: fp.details,
            safety_warning: fp.safety_warning,
            skill_level: fp.skill_level,
          })),
          related_alarms: alarm.related_alarms,
        };

        // Inject alarm causes as additional symptoms for failure mode matching
        if (alarm.causes) {
          for (const cause of alarm.causes) {
            symptoms.push(cause.toLowerCase());
          }
        }
        // Inject alarm category as a symptom keyword
        if (alarm.category) {
          symptoms.push(alarm.category.toLowerCase());
        }
      } else {
        // Alarm not found — search by query as fallback
        const searchResult = await registryManager.alarms.search({
          query: String(params.alarm_code),
          controller,
          limit: 3,
        });
        if (searchResult.alarms.length > 0) {
          alarmResult = {
            note: "Exact code not found, showing closest matches",
            matches: searchResult.alarms.map((a: any) => ({
              code: a.code,
              name: a.name,
              category: a.category,
              description: a.description,
            })),
          };
        } else {
          alarmResult = {
            note: `Alarm code "${params.alarm_code}" not found for controller ${controller}`,
          };
        }
      }
    } catch (err: any) {
      log.warn(`[IntelligenceEngine] failure_diagnose: alarm lookup failed: ${err.message}`);
      alarmResult = { error: `Alarm lookup failed: ${err.message}` };
    }
  }

  // -- Failure knowledge base --
  const FAILURE_MODES: Array<{
    id: string;
    name: string;
    keywords: string[];
    root_causes: string[];
    remedies: string[];
    severity: "low" | "medium" | "high" | "critical";
  }> = [
    {
      id: "chatter",
      name: "Regenerative Chatter",
      keywords: ["chatter", "vibration", "noise", "waviness", "marks", "surface marks", "harmonics"],
      root_causes: [
        "Spindle speed in unstable lobe region",
        "Excessive axial or radial depth of cut",
        "Low system rigidity (long overhang, weak workholding)",
        "Incorrect number of flutes for engagement",
      ],
      remedies: [
        "Adjust spindle speed to stable lobe (use stability lobe diagram)",
        "Reduce axial depth of cut by 30-50%",
        "Reduce tool overhang or use shrink-fit holder",
        "Switch to variable-pitch or variable-helix cutter",
        "Increase radial engagement to dampen (trochoidal not always better)",
      ],
      severity: "high",
    },
    {
      id: "premature_wear",
      name: "Premature Tool Wear",
      keywords: ["tool wear", "short life", "premature", "wear", "flank wear", "crater", "edge breakdown"],
      root_causes: [
        "Cutting speed too high (operating past Taylor knee)",
        "Insufficient coolant flow or wrong coolant type",
        "Wrong tool coating for material group",
        "Built-up edge due to low speed on sticky material",
      ],
      remedies: [
        "Reduce cutting speed by 15-25%",
        "Verify coolant concentration and flow rate",
        "Switch to AlTiN coating for high-temp alloys, TiAlN for steels",
        "For BUE: increase cutting speed or use positive rake geometry",
      ],
      severity: "high",
    },
    {
      id: "tool_breakage",
      name: "Tool Breakage",
      keywords: ["breakage", "broken", "snap", "catastrophic", "fracture", "shatter"],
      root_causes: [
        "Chip load too high for tool geometry",
        "Interrupted cut shock on brittle substrate",
        "Chip packing in deep slot or pocket",
        "Incorrect tool path — full-width slotting at excessive feed",
      ],
      remedies: [
        "Reduce feed per tooth to stay within chip load limits",
        "Use tougher substrate (micro-grain carbide) for interrupted cuts",
        "Ensure chip evacuation via air blast or through-spindle coolant",
        "Use trochoidal or peel milling instead of full-width slotting",
      ],
      severity: "critical",
    },
    {
      id: "poor_surface_finish",
      name: "Poor Surface Finish",
      keywords: ["surface", "rough", "finish", "Ra", "roughness", "scratches", "scallop"],
      root_causes: [
        "Feed per tooth too high for finishing pass",
        "Worn or chipped cutting edge",
        "Tool runout exceeding tolerance",
        "Nose radius too small for required Ra",
      ],
      remedies: [
        "Reduce feed per tooth for finishing (typically fz < 0.05 mm)",
        "Inspect and replace tool insert",
        "Measure runout with DTI — should be < 5 μm for finishing",
        "Use wiper insert or larger nose radius (Ra ∝ fz²/(32×r))",
      ],
      severity: "medium",
    },
    {
      id: "dimensional_error",
      name: "Dimensional Inaccuracy",
      keywords: ["dimension", "tolerance", "oversize", "undersize", "inaccurate", "drift", "deviation"],
      root_causes: [
        "Tool deflection under cutting force",
        "Thermal growth of spindle or workpiece",
        "Backlash in machine axes",
        "Incorrect tool offset or worn tool geometry",
      ],
      remedies: [
        "Reduce radial depth or use shorter tool assembly",
        "Allow machine warm-up cycle; use coolant to control temperature",
        "Calibrate axis backlash compensation",
        "Re-measure tool with presetter; update offset in controller",
      ],
      severity: "high",
    },
    {
      id: "chip_issues",
      name: "Poor Chip Control",
      keywords: ["chip", "birds nest", "stringy", "clogging", "packing", "evacuation", "long chips"],
      root_causes: [
        "Feed too low for material (thin chips curl poorly)",
        "Wrong chipbreaker geometry for material ductility",
        "Insufficient coolant pressure for chip evacuation",
        "Deep pocket with no chip exit path",
      ],
      remedies: [
        "Increase feed per tooth to produce thicker, breakable chips",
        "Use insert with aggressive chipbreaker for ductile materials",
        "Switch to through-spindle coolant (TSC) at ≥40 bar",
        "Program peck cycles or helical ramp entry for deep features",
      ],
      severity: "medium",
    },
    {
      id: "thermal_damage",
      name: "Thermal Damage / Burns",
      keywords: ["burn", "heat", "thermal", "discoloration", "white layer", "heat affected", "blue"],
      root_causes: [
        "Cutting speed too high for material thermal conductivity",
        "Dwell at bottom of hole or pocket corner",
        "Dry machining of heat-sensitive material",
        "Re-cutting chips that carry heat back into cut zone",
      ],
      remedies: [
        "Reduce cutting speed by 20-30%",
        "Eliminate dwell: use constant feed through corners",
        "Apply flood or MQL coolant — never dry-cut titanium/Inconel",
        "Improve chip evacuation to prevent re-cutting",
      ],
      severity: "high",
    },
  ];

  // Score each failure mode against symptoms
  const scored = FAILURE_MODES.map((mode) => {
    let matchCount = 0;
    const matchedKeywords: string[] = [];
    for (const symptom of symptoms) {
      for (const kw of mode.keywords) {
        if (symptom.includes(kw) || kw.includes(symptom)) {
          matchCount++;
          matchedKeywords.push(kw);
          break; // one match per symptom
        }
      }
    }
    const relevance = symptoms.length > 0 ? matchCount / symptoms.length : 0;
    return { ...mode, matchCount, matchedKeywords, relevance };
  });

  // Filter and sort by relevance
  const matches = scored
    .filter((m) => m.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || (b.severity === "critical" ? 1 : 0) - (a.severity === "critical" ? 1 : 0));

  // Optional physics cross-check if parameters are provided
  let physicsCheck: any = undefined;
  if (params.parameters && params.material) {
    try {
      const p = params.parameters;
      let mat: any;
      try { mat = await registryManager.materials.getByIdOrName(params.material); } catch { /* skip */ }
      const isoGroup = mat?.iso_group || mat?.classification?.iso_group || "P";
      const taylorCoeffs = mat?.taylor?.C
        ? { C: mat.taylor.C, n: mat.taylor.n }
        : getDefaultTaylor(mapIsoToTaylorGroup(isoGroup));

      if (p.cutting_speed) {
        const tl = calculateTaylorToolLife(p.cutting_speed, taylorCoeffs, p.feed_per_tooth, p.axial_depth);
        physicsCheck = {
          estimated_tool_life_min: tl.tool_life_minutes,
          taylor_warnings: tl.warnings,
        };
        if (p.cutting_speed > taylorCoeffs.C * 0.85) {
          physicsCheck.speed_warning = `Cutting speed ${p.cutting_speed} is within 15% of Taylor C=${taylorCoeffs.C} — operating near cliff edge`;
        }
      }
    } catch (err: any) {
      log.warn(`[IntelligenceEngine] failure_diagnose: physics cross-check failed: ${err.message}`);
    }
  }

  log.info(`[IntelligenceEngine] failure_diagnose: ${symptoms.length} symptoms → ${matches.length} mode matches`);

  return {
    symptoms_analyzed: symptoms,
    diagnoses: matches.map((m) => ({
      id: m.id,
      name: m.name,
      relevance: Math.round(m.relevance * 100) / 100,
      severity: m.severity,
      matched_keywords: m.matchedKeywords,
      root_causes: m.root_causes,
      remedies: m.remedies,
    })),
    alarm: alarmResult,
    physics_cross_check: physicsCheck,
    total_modes_checked: FAILURE_MODES.length,
  };
}

/**
 * Multi-objective parameter optimization (cost, quality, productivity).
 *
 * Resolves material physics data, then delegates to optimizeCuttingParameters()
 * from AdvancedCalculations with user-specified objectives and constraints.
 *
 * @param params.material       - Material name for Kienzle/Taylor lookup
 * @param params.objectives     - Weights: { productivity, cost, quality, tool_life } (0-1 each)
 * @param params.constraints    - Optional: { max_power, max_force, max_surface_finish, min_tool_life }
 * @param params.tool_diameter  - Optional tool diameter (default 12 mm)
 * @param params.number_of_teeth - Optional (default 4)
 * IMPLEMENTED R3-MS0
 */
async function parameterOptimize(params: Record<string, any>): Promise<any> {
  validateRequiredFields("parameter_optimize", params, ["material", "objectives"]);

  const objectives = params.objectives as Record<string, number>;
  const weights: OptimizationWeights = {
    productivity: objectives.productivity ?? 0.25,
    cost: objectives.cost ?? 0.25,
    quality: objectives.quality ?? 0.25,
    tool_life: objectives.tool_life ?? 0.25,
  };

  const constraints: OptimizationConstraints = params.constraints ?? {};

  // Resolve material
  let mat: any;
  try { mat = await registryManager.materials.getByIdOrName(params.material); } catch { /* skip */ }
  const isoGroup = mat?.iso_group || mat?.classification?.iso_group || "P";

  const kienzle = mat?.kienzle?.kc1_1
    ? { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc }
    : getDefaultKienzle(mapIsoToKienzleGroup(isoGroup));

  const taylor = mat?.taylor?.C
    ? { C: mat.taylor.C, n: mat.taylor.n }
    : getDefaultTaylor(mapIsoToTaylorGroup(isoGroup));

  const toolDiameter = params.tool_diameter ?? DEFAULT_TOOL.diameter;
  const numTeeth = params.number_of_teeth ?? DEFAULT_TOOL.number_of_teeth;

  // Run multi-objective optimizer
  const result = optimizeCuttingParameters(
    constraints,
    weights,
    kienzle.kc1_1,
    taylor.C,
    taylor.n,
    toolDiameter,
    numTeeth,
  );

  // Also compute the minimum-cost speed as a reference
  const minCost = calculateMinimumCostSpeed(
    taylor.C,
    taylor.n,
    { machine_rate: 75 / 60, tool_cost: 45, tool_change_time: 1 },
  );

  log.info(
    `[IntelligenceEngine] parameter_optimize: ${params.material} → ` +
    `Vc=${result.optimal_speed}, fz=${result.optimal_feed}, ap=${result.optimal_depth}`
  );

  return {
    material: mat?.name || params.material,
    iso_group: isoGroup,
    objectives_used: weights,
    constraints_applied: constraints,
    optimal_parameters: {
      cutting_speed: result.optimal_speed,
      feed_per_tooth: result.optimal_feed,
      axial_depth: result.optimal_depth,
      spindle_speed: Math.round((1000 * result.optimal_speed) / (Math.PI * toolDiameter)),
      feed_rate: Math.round(result.optimal_feed * numTeeth *
        ((1000 * result.optimal_speed) / (Math.PI * toolDiameter))),
    },
    predicted_outcomes: result.objective_values,
    pareto_optimal: result.pareto_optimal,
    minimum_cost_speed: minCost.optimal_speed,
    iterations: result.iterations,
    warnings: result.warnings,
  };
}

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
async function cycleTimeEstimate(params: Record<string, any>): Promise<any> {
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

/**
 * Predict achievable quality metrics (Ra, Rz, tolerances) for given parameters.
 *
 * Combines surface finish prediction with deflection analysis and thermal effects
 * to give a complete quality picture for the specified cutting parameters.
 *
 * @param params.material        - Material name for registry lookup
 * @param params.parameters      - Cutting parameters: { cutting_speed, feed_per_tooth, axial_depth, radial_depth, tool_diameter, number_of_teeth }
 * @param params.nose_radius     - Tool nose radius mm (default 0.8)
 * @param params.overhang_length - Tool overhang mm (default 40)
 * @param params.operation       - Operation type for Rz/Ra ratio (milling, turning, etc.)
 * IMPLEMENTED R3-MS0
 */
async function qualityPredict(params: Record<string, any>): Promise<any> {
  validateRequiredFields("quality_predict", params, ["material", "parameters"]);

  const p = params.parameters as Record<string, any>;
  const Vc = p.cutting_speed ?? 150;
  const fz = p.feed_per_tooth ?? 0.1;
  const ap = p.axial_depth ?? 3;
  const ae = p.radial_depth ?? 6;
  const D = p.tool_diameter ?? DEFAULT_TOOL.diameter;
  const z = p.number_of_teeth ?? DEFAULT_TOOL.number_of_teeth;
  const noseR = params.nose_radius ?? DEFAULT_TOOL.nose_radius;
  const overhang = params.overhang_length ?? DEFAULT_TOOL.overhang_length;
  const operation = params.operation || "milling";

  // Resolve material
  let mat: any;
  try { mat = await registryManager.materials.getByIdOrName(params.material); } catch { /* skip */ }
  const isoGroup = mat?.iso_group || mat?.classification?.iso_group || "P";
  const materialName = mat?.name || params.material;
  const hardness = mat?.mechanical?.hardness?.brinell ?? 200;

  // 1. Surface finish prediction
  const surfaceFinish = calculateSurfaceFinish(fz, noseR, operation !== "turning", ae, D, operation);

  // 2. Cutting force for deflection analysis
  const kienzle = mat?.kienzle?.kc1_1
    ? { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc }
    : getDefaultKienzle(mapIsoToKienzleGroup(isoGroup));

  const conditions: CuttingConditions = {
    cutting_speed: Vc, feed_per_tooth: fz, axial_depth: ap,
    radial_depth: ae, tool_diameter: D, number_of_teeth: z,
  };
  const force = calculateKienzleCuttingForce(conditions, kienzle);
  const Fc = force.Fc;

  // 3. Tool deflection estimate
  let deflection: any;
  try {
    deflection = calculateToolDeflection(
      Fc, overhang, D, D * 0.7, // assume solid core ~70% of D
    );
  } catch {
    deflection = { max_deflection: 0, warnings: ["Deflection calc skipped"] };
  }

  // 4. Thermal effects
  let thermal: any;
  try {
    const thermalCond = mat?.thermal?.thermal_conductivity ?? 50;
    thermal = calculateCuttingTemperature(
      Vc, fz * z * ((1000 * Vc) / (Math.PI * D)), // feed_rate
      ap, D, thermalCond,
    );
  } catch {
    thermal = { max_temperature: 0, warnings: ["Thermal calc skipped"] };
  }

  // 5. Quality assessment — ISO 286 tolerance lookup via ToleranceEngine
  const qualityWarnings: string[] = [...surfaceFinish.warnings];
  const nominalForTolerance = params.nominal_mm ?? D; // use tool diameter as proxy if no nominal given
  const deflMm = deflection.max_deflection ?? 0;

  let toleranceEstimate: string;
  let tolerance_um: number | undefined;
  let tolerance_mm: number | undefined;

  const achievable = findAchievableGrade(nominalForTolerance, deflMm);
  if (achievable) {
    toleranceEstimate = achievable.grade_label;
    tolerance_um = achievable.tolerance_um;
    tolerance_mm = achievable.tolerance_mm;
  } else {
    toleranceEstimate = "IT14+";
  }

  if (deflMm > 0.05) {
    qualityWarnings.push(`Tool deflection ${deflMm.toFixed(3)} mm may affect dimensional accuracy`);
  }
  if (thermal.max_temperature > 500) {
    qualityWarnings.push("High cutting temperature may cause thermal distortion and affect surface integrity");
  }

  log.info(
    `[IntelligenceEngine] quality_predict: ${materialName} → Ra=${surfaceFinish.Ra}, ` +
    `deflection=${deflection.max_deflection?.toFixed(3) ?? "?"}mm, temp=${thermal.max_temperature?.toFixed(0) ?? "?"}°C`
  );

  return {
    material: materialName,
    iso_group: isoGroup,
    parameters_used: { cutting_speed: Vc, feed_per_tooth: fz, axial_depth: ap, radial_depth: ae, tool_diameter: D },
    surface_finish: {
      Ra: surfaceFinish.Ra,
      Rz: surfaceFinish.Rz,
      Rt: surfaceFinish.Rt,
      theoretical_Ra: surfaceFinish.theoretical_Ra,
    },
    deflection: {
      max_deflection_mm: deflection.max_deflection ?? 0,
      stiffness_ratio: deflection.stiffness_ratio,
    },
    thermal: {
      max_temperature_C: thermal.max_temperature ?? 0,
      chip_temperature_C: thermal.chip_temperature,
    },
    achievable_tolerance: {
      grade: toleranceEstimate,
      tolerance_um: tolerance_um,
      tolerance_mm: tolerance_mm,
      nominal_mm: nominalForTolerance,
    },
    cutting_force_N: Fc,
    warnings: qualityWarnings,
  };
}

// ============================================================================
// ACTION REGISTRY & DISPATCHER
// ============================================================================

/** All intelligence actions, ordered by implementation priority. */
export const INTELLIGENCE_ACTIONS = [
  "job_plan",
  "setup_sheet",
  "process_cost",
  "material_recommend",
  "tool_recommend",
  "machine_recommend",
  "what_if",
  "failure_diagnose",
  "parameter_optimize",
  "cycle_time_estimate",
  "quality_predict",
] as const;

/** Union type of all valid intelligence action names. */
export type IntelligenceAction = (typeof INTELLIGENCE_ACTIONS)[number];

/** Type guard for IntelligenceAction. */
function isIntelligenceAction(action: string): action is IntelligenceAction {
  return (INTELLIGENCE_ACTIONS as readonly string[]).includes(action);
}

/**
 * Execute an intelligence action by name.
 *
 * This is the single entry point for all 11 intelligence actions. It validates
 * the action name, dispatches to the appropriate handler, and wraps errors in
 * a consistent format.
 *
 * @param action - One of the INTELLIGENCE_ACTIONS
 * @param params - Action-specific parameters (see individual functions)
 * @returns The action result (shape depends on the action)
 * @throws Error if the action is unknown or if required parameters are missing
 */
export async function executeIntelligenceAction(
  action: IntelligenceAction,
  params: Record<string, any>
): Promise<any> {
  if (!isIntelligenceAction(action)) {
    throw new Error(
      `[IntelligenceEngine] Unknown action "${action}". ` +
      `Valid actions: ${INTELLIGENCE_ACTIONS.join(", ")}`
    );
  }

  log.info(`[IntelligenceEngine] Executing action: ${action}`);
  const startMs = Date.now();

  try {
    let result: any;

    switch (action) {
      case "job_plan":
        validateRequiredFields("job_plan", params, ["material", "feature", "dimensions"]);
        if (!params.dimensions?.depth) {
          throw new Error(
            '[IntelligenceEngine] job_plan: dimensions.depth is required'
          );
        }
        result = await jobPlan(params as JobPlanInput);
        break;

      case "setup_sheet":
        result = await setupSheet(params);
        break;

      case "process_cost":
        result = await processCost(params);
        break;

      case "material_recommend":
        result = await materialRecommend(params);
        break;

      case "tool_recommend":
        result = await toolRecommend(params);
        break;

      case "machine_recommend":
        result = await machineRecommend(params);
        break;

      case "what_if":
        result = await whatIf(params);
        break;

      case "failure_diagnose":
        result = await failureDiagnose(params);
        break;

      case "parameter_optimize":
        result = await parameterOptimize(params);
        break;

      case "cycle_time_estimate":
        result = await cycleTimeEstimate(params);
        break;

      case "quality_predict":
        result = await qualityPredict(params);
        break;

      default: {
        // Exhaustiveness check -- TypeScript ensures all cases are handled
        const _exhaustive: never = action;
        throw new Error(`[IntelligenceEngine] Unhandled action: ${_exhaustive}`);
      }
    }

    const elapsedMs = Date.now() - startMs;
    log.debug(`[IntelligenceEngine] ${action} completed in ${elapsedMs}ms`);
    return result;
  } catch (err: any) {
    const elapsedMs = Date.now() - startMs;
    log.error(
      `[IntelligenceEngine] ${action} failed after ${elapsedMs}ms: ${err.message}`
    );
    throw err;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton intelligence engine with action dispatcher and constants. */
export const intelligenceEngine = {
  executeAction: executeIntelligenceAction,
  ACTIONS: INTELLIGENCE_ACTIONS,
};

export type { JobPlanInput, JobPlanResult, JobPlanOperation, FeatureType };
