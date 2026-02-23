/**
 * PRISM MCP Server - Scenario Analysis Engine (split from IntelligenceEngine R3)
 *
 * Contains what-if scenario analysis including sensitivity sweep.
 * Compares baseline cutting parameters against modified sets to show
 * impact on force, power, tool life, surface finish, and MRR.
 *
 * Functions:
 *   whatIf()          - What-if scenario analysis
 *   computeMetrics()  - Helper to compute metrics for a parameter set
 */

import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpindlePower,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  getDefaultKienzle,
  getDefaultTaylor,
} from "./ManufacturingCalculations.js";

import { registryManager } from "../registries/manager.js";
import { log } from "../utils/Logger.js";

import {
  INTELLIGENCE_SAFETY_LIMITS,
  DEFAULT_TOOL,
  mapIsoToKienzleGroup,
  mapIsoToTaylorGroup,
  validateRequiredFields,
} from "./IntelligenceShared.js";

// ============================================================================
// WHAT-IF SCENARIO ANALYSIS
// ============================================================================

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
export async function whatIf(params: Record<string, any>): Promise<any> {
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

  // ── 7A: Sensitivity sweep mode ──
  // If params.sweep is provided, vary ONE parameter ±range% in N steps and return
  // a response surface showing how all outputs respond.
  let sensitivity: any = undefined;
  if (params.sweep) {
    const sweepParam = params.sweep.parameter as string;
    const sweepRange = params.sweep.range_pct ?? 20;   // default ±20%
    const sweepSteps = params.sweep.steps ?? 5;         // default 5 steps
    const baseValue = baseline[sweepParam] ?? scenario[sweepParam];

    if (baseValue !== undefined && typeof baseValue === "number" && baseValue > 0) {
      const minVal = baseValue * (1 - sweepRange / 100);
      const maxVal = baseValue * (1 + sweepRange / 100);
      const step = (maxVal - minVal) / (sweepSteps - 1);

      const sweepPoints: Array<{
        [key: string]: number;
        cutting_force_N: number;
        tool_life_min: number;
        surface_finish_Ra: number;
        mrr_cm3_min: number;
        power_kW: number;
      }> = [];

      for (let i = 0; i < sweepSteps; i++) {
        const val = minVal + step * i;
        const sweepScenario = { ...baseline, [sweepParam]: val };
        const m = computeMetrics(sweepScenario);
        sweepPoints.push({
          [sweepParam]: Math.round(val * 1000) / 1000,
          cutting_force_N: m.cutting_force_N,
          tool_life_min: m.tool_life_min,
          surface_finish_Ra: m.surface_finish_Ra,
          mrr_cm3_min: m.mrr_cm3_min,
          power_kW: m.power_kW,
        });
      }

      // Calculate response gradients (elasticity: %Δoutput / %Δinput)
      const first = sweepPoints[0];
      const last = sweepPoints[sweepPoints.length - 1];
      const inputRange = (last[sweepParam] - first[sweepParam]) / first[sweepParam];

      const elasticity: Record<string, number> = {};
      for (const key of ["cutting_force_N", "tool_life_min", "surface_finish_Ra", "mrr_cm3_min", "power_kW"]) {
        const outRange = first[key] !== 0
          ? ((last[key] as number) - (first[key] as number)) / (first[key] as number)
          : 0;
        elasticity[key] = inputRange !== 0
          ? Math.round((outRange / inputRange) * 100) / 100
          : 0;
      }

      // Machine constraint checking
      const constraintViolations: string[] = [];
      const machineMaxPower = params.machine_power_kw ?? (INTELLIGENCE_SAFETY_LIMITS as any).MAX_SPINDLE_POWER_KW;
      for (const pt of sweepPoints) {
        if (pt.power_kW > machineMaxPower) {
          constraintViolations.push(
            `${sweepParam}=${pt[sweepParam]}: power ${pt.power_kW.toFixed(1)} kW exceeds machine limit ${machineMaxPower} kW`
          );
        }
        if (pt.tool_life_min < 5) {
          constraintViolations.push(
            `${sweepParam}=${pt[sweepParam]}: tool life ${pt.tool_life_min.toFixed(1)} min below safe minimum`
          );
        }
      }

      sensitivity = {
        parameter: sweepParam,
        range_pct: sweepRange,
        steps: sweepSteps,
        points: sweepPoints,
        elasticity,
        constraint_violations: constraintViolations,
      };

      log.info(`[IntelligenceEngine] what_if sweep: ${sweepParam} ±${sweepRange}%, ${sweepSteps} steps, ` +
        `${constraintViolations.length} constraint violations`);
    }
  }

  return {
    material: materialName,
    changes_applied: changes,
    baseline: baseMetrics,
    scenario: scenarioMetrics,
    deltas,
    insights,
    ...(sensitivity ? { sensitivity } : {}),
  };
}
