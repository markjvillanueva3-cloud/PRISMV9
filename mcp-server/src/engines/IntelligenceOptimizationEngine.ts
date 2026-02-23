/**
 * PRISM MCP Server - Intelligence Optimization Engine (split from IntelligenceEngine R3)
 *
 * Contains multi-objective parameter optimization, quality prediction,
 * and process costing. These actions combine physics calculations with
 * cost models to optimize manufacturing parameters.
 *
 * Functions:
 *   parameterOptimize() - Multi-objective parameter optimization
 *   qualityPredict()    - Quality prediction (Ra, Rz, deflection, thermal)
 *   processCost()       - Process costing
 */

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSpeedFeed,
  calculateSurfaceFinish,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  getDefaultKienzle,
  getDefaultTaylor,
} from "./ManufacturingCalculations.js";

import {
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
} from "./AdvancedCalculations.js";

import { findAchievableGrade } from "./ToleranceEngine.js";
import { registryManager } from "../registries/manager.js";
import { log } from "../utils/Logger.js";

import {
  DEFAULT_TOOL,
  mapIsoToKienzleGroup,
  mapIsoToTaylorGroup,
  validateRequiredFields,
} from "./IntelligenceShared.js";

// Re-import jobPlan for processCost (which delegates to it)
import { jobPlan } from "./ProcessPlanningEngine.js";

// ============================================================================
// PARAMETER OPTIMIZATION
// ============================================================================

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
export async function parameterOptimize(params: Record<string, any>): Promise<any> {
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

// ============================================================================
// QUALITY PREDICTION
// ============================================================================

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
export async function qualityPredict(params: Record<string, any>): Promise<any> {
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
// PROCESS COST
// ============================================================================

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
export async function processCost(params: Record<string, any>): Promise<any> {
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
