import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { SafetyBlockError } from "../../errors/PrismError.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";
import type { SafetyCalcResult } from "../../schemas/safetyCalcSchema.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

// Import original handlers
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  calculateProductivityMetrics,
  getDefaultKienzle,
  getDefaultTaylor,
  type CuttingConditions,
  type KienzleCoefficients,
  type TaylorCoefficients,
  type JohnsonCookParams
} from "../../engines/ManufacturingCalculations.js";

import {
  calculateStabilityLobes,
  calculateToolDeflection,
  calculateCuttingTemperature,
  calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  type ModalParameters,
  type OptimizationConstraints,
  type OptimizationWeights,
  type CostParameters
} from "../../engines/AdvancedCalculations.js";

import {
  calculateITGrade,
  analyzeShaftHoleFit,
  toleranceStackUp,
  calculateCpk,
} from "../../engines/ToleranceEngine.js";

import {
  generateGCode,
  generateProgram,
  listControllers as listGCodeControllers,
  listOperations as listGCodeOperations,
} from "../../engines/GCodeTemplateEngine.js";

import {
  decide,
  listDecisionTrees,
} from "../../engines/DecisionTreeEngine.js";

import {
  renderReport,
  listReportTypes,
} from "../../engines/ReportRenderer.js";

import {
  createCampaign,
  validateCampaign,
  optimizeCampaign,
  estimateCycleTime as estimateCampaignTime,
  listCampaignActions,
} from "../../engines/CampaignEngine.js";

import {
  runInferenceChain,
  analyzeAndRecommend,
  deepDiagnose,
  listChainTypes,
  type InferenceChainConfig,
} from "../../engines/InferenceChainEngine.js";

import {
  calculateEngagementAngle,
  calculateTrochoidalParams,
  calculateHSMParams,
  calculateScallopHeight,
  calculateOptimalStepover,
  estimateCycleTime,
  calculateArcFitting,
  calculateChipThinning,
  calculateMultiPassStrategy,
  recommendCoolantStrategy,
  generateGCodeSnippet
} from "../../engines/ToolpathCalculations.js";

import {
  physicsPrediction,
} from "../../engines/PhysicsPredictionEngine.js";

import {
  optimization,
} from "../../engines/OptimizationEngine.js";

import {
  workholdingIntelligence,
} from "../../engines/WorkholdingIntelligenceEngine.js";

/**
 * Extract domain-specific key values per calc type for summary-level responses.
 * Each calc type returns only the most critical metrics (~50-100 tokens).
 */
function calcExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== 'object') return { value: result };
  switch (action) {
    case "cutting_force":
      return { Fc_N: result.Fc, Ff_N: result.Ff, power_kW: result.power, torque_Nm: result.torque };
    case "tool_life":
      return { tool_life_min: result.tool_life_minutes, wear_rate: result.wear_rate };
    case "speed_feed":
      return { Vc: result.cutting_speed, fz: result.feed_per_tooth, n: result.spindle_speed, vf: result.feed_rate };
    case "flow_stress":
      return { sigma_MPa: result.stress };
    case "surface_finish":
      return { Ra_um: result.Ra, Rz_um: result.Rz };
    case "mrr":
      return { mrr_cm3min: result.mrr, feed_rate: result.feed_rate, spindle_speed: result.spindle_speed };
    case "power":
      return { power_kW: result.power, torque_Nm: result.torque, safe: result.safe };
    case "torque":
      return { torque_Nm: result.torque, safe: result.safe };
    case "chip_load":
      return { hex_mm: result.hex_mm, chip_load_ok: result.chip_load_ok };
    case "stability":
      return { stable: result.is_stable, critical_depth_mm: result.critical_depth };
    case "deflection":
      return { deflection_mm: result.static_deflection, safe: result.safe };
    case "thermal":
      return { T_tool_C: result.tool_temperature, T_chip_C: result.chip_temperature };
    case "cost_optimize":
      return { Vc_optimal: result.optimal_speed, cost_per_part: result.cost_per_part };
    case "multi_optimize":
      return { optimal_speed: result.optimal_speed, optimal_feed: result.optimal_feed };
    case "trochoidal":
      return { mrr_cm3min: result.mrr, max_engagement: result.max_engagement_deg };
    case "hsm":
      return { mrr_cm3min: result.MRR_cm3min, spindle_rpm: result.spindle_rpm };
    case "coolant_strategy":
      return { strategy: result.recommendation?.strategy, pressure_bar: result.recommendation?.pressure_bar };
    case "tolerance_analysis":
      return { tolerance_um: result.tolerance_um, grade: result.grade_label, nominal_mm: result.nominal_mm };
    case "fit_analysis":
      return { fit_type: result.fit_type, min_clearance_mm: result.min_clearance_mm, max_clearance_mm: result.max_clearance_mm };
    case "gcode_generate":
      return { controller: result.controller, operation: result.operation, line_count: result.line_count, warnings: result.warnings?.length || 0 };
    case "decision_tree":
      return { tree: result.tree || result.strategy || result.tool_type || result.grade, confidence: result.confidence, warnings: result.warnings?.length || 0 };
    case "render_report":
      return { type: result.type, line_count: result.line_count, sections: result.sections?.length || 0 };
    case "campaign_create":
      return { material_count: result.material_count, pass: result.summary?.total_pass, fail: result.summary?.total_fail, quarantine: result.summary?.total_quarantine, avg_safety: result.summary?.avg_safety_score };
    case "campaign_validate":
      return { valid: result.valid, errors: result.errors?.length || 0, warnings: result.warnings?.length || 0 };
    case "campaign_optimize":
      return { improvement_pct: result.estimated_improvement_pct, adjustments: result.operation_adjustments?.length || 0 };
    case "campaign_cycle_time":
      return { total_min: result.estimated_total_time_min, per_material_min: result.time_per_material_min, materials: result.materials_count };
    case "inference_chain":
      return { chain_id: result.chain_id, status: result.status, steps_completed: result.steps_completed, total_steps: result.total_steps, tokens_in: result.total_tokens?.input, tokens_out: result.total_tokens?.output };
    case "wear_prediction":
      return { flank_wear_VB_mm: result.flank_wear_VB_mm, wear_zone: result.wear_zone, remaining_life_min: result.remaining_life_min, recommendation: result.recommendation };
    case "process_cost_calc":
      return { cost_per_part: result.cost_per_part, cycle_time_min: result.cycle_time_min, parts_per_tool_edge: result.parts_per_tool_edge, tool_life_min: result.tool_life_min };
    case "uncertainty_chain":
      return { Fc_N: result.parameters?.Fc_N, T_min: result.parameters?.T_min, dominant_source: result.dominant_uncertainty_source, has_statistics: result.data_quality?.has_statistics };
    case "controller_optimize":
      return { controller: result.controller, mode: result.mode_selected, optimizations: result.optimizations_applied?.length, speed_pct: result.performance_impact?.speed_improvement_pct };
    case "surface_integrity_predict":
      return { Ra_um: result.surface_roughness?.ra_predicted_um, residual_stress_mpa: result.residual_stress?.surface_mpa, white_layer_risk: result.white_layer?.risk, safety: result.safety?.score };
    case "chatter_predict":
      return { stable: result.stable, critical_depth_mm: result.critical_depth_mm, margin: result.stability_margin, safety: result.safety?.score };
    case "thermal_compensate":
      return { z_um: result.offsets?.z_um, x_um: result.offsets?.x_um, y_um: result.offsets?.y_um, steady_state_min: result.steady_state_minutes };
    case "unified_machining_model":
      return { Fc_N: result.force?.tangential_n, tool_temp_c: result.temperature?.tool_c, life_min: result.wear_rate?.estimated_life_min, Ra_um: result.surface_finish?.ra_um, converged: result.convergence?.converged, safety: result.safety?.score };
    case "coupling_sensitivity":
      return { parameter: result.parameter, most_sensitive: result.most_sensitive_output, variation_pct: result.variation_pct };
    case "optimize_parameters":
      return { vc_mpm: result.optimal?.vc_mpm, fz_mm: result.optimal?.fz_mm, ap_mm: result.optimal?.ap_mm, cost_usd: result.optimal?.estimated_cost_usd, cycle_min: result.optimal?.estimated_cycle_time_min, ra_um: result.optimal?.predicted_ra_um, safety: result.safety?.score };
    case "optimize_sequence":
      return { optimal_order: result.optimal_order, tool_changes: result.tool_changes, total_min: result.estimated_total_min, changes_saved: result.savings_vs_input_order?.tool_changes_saved };
    case "sustainability_report":
      return { total_kwh: result.energy?.total_kwh, co2_kg: result.carbon?.total_co2_kg, eco_score: result.eco_efficiency_score, coolant_l: result.coolant?.consumption_liters };
    case "eco_optimize":
      return { vc_mpm: result.optimal?.vc_mpm, eco_weight: result.eco_weight_applied, improvement_pct: result.sustainability_improvement_pct, eco_score: result.optimal?.sustainability?.eco_efficiency_score };
    case "fixture_recommend":
      return { fixture: result.primary_recommendation?.fixture_type, model: result.primary_recommendation?.model, clamp_n: result.primary_recommendation?.clamp_force_n, deflection_mm: result.analysis?.max_deflection_mm, within_tol: result.analysis?.deflection_within_tolerance, safety: result.safety?.score };
    default:
      // Generic: pick first 5 numeric/string fields
      const kv: Record<string, any> = {};
      let count = 0;
      for (const [k, v] of Object.entries(result)) {
        if (k.startsWith('_') || k === 'warnings') continue;
        if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
          kv[k] = v;
          if (++count >= 5) break;
        }
      }
      return kv;
  }
}

/** XA-6: Basic input validation for material name parameters */
function validateMaterialName(name: string | undefined): string | null {
  if (!name) return null;
  // Reject path traversal, injection patterns
  if (/[\.\.\/\\]|<|>|\$|\{|\}/.test(name)) return null;
  // Allow alphanumeric + common material name chars
  if (!/^[a-zA-Z0-9\-_.\/\s]+$/.test(name)) return null;
  return name.trim();
}

const ACTIONS = [
  "cutting_force", "tool_life", "speed_feed", "flow_stress", "surface_finish",
  "mrr", "power", "torque", "chip_load", "stability", "deflection", "thermal",
  "cost_optimize", "multi_optimize", "productivity", "engagement",
  "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit",
  "chip_thinning", "multi_pass", "coolant_strategy", "gcode_snippet",
  "tolerance_analysis", "fit_analysis", "gcode_generate", "decision_tree",
  "render_report", "campaign_create", "campaign_validate", "campaign_optimize",
  "campaign_cycle_time", "inference_chain",
  "wear_prediction", "process_cost_calc", "uncertainty_chain",
  "controller_optimize",
  "surface_integrity_predict", "chatter_predict", "thermal_compensate",
  "unified_machining_model", "coupling_sensitivity",
  "rz_kinematic", "rz_milling", "surface_profile", "chip_form",
  "optimize_parameters", "optimize_sequence", "sustainability_report", "eco_optimize",
  "fixture_recommend"
] as const;

export function registerCalcDispatcher(server: any): void {
  server.tool(
    "prism_calc",
    "Manufacturing physics calculations: cutting force, tool life, speed/feed, flow stress, surface finish, MRR, power, torque, chip load, stability, deflection, thermal, cost/multi-objective optimization, trochoidal/HSM, scallop, cycle time, chip thinning compensation, multi-pass strategy, coolant strategy, G-code generation, tolerance analysis (ISO 286), shaft/hole fit analysis, parametric G-code templates (6 controllers, 13 operations), decision trees (tool/insert/coolant/workholding/strategy/approach selection), report rendering (setup sheet, process plan, cost estimate, tool list, inspection plan, alarm report, speed/feed card), campaign orchestration (create/validate/optimize/cycle_time for batch machining campaigns with cumulative safety tracking), wear prediction (three-zone flank wear model with Taylor-based tool life), process cost calculation (speed/feed to cost chain with batch economics), uncertainty chain (GUM-compliant uncertainty propagation through Kienzle/Taylor/power/cost), controller optimization (controller-specific G-code features for Fanuc/Siemens/Haas/Mazak/Okuma/Heidenhain with roughing/finishing/contouring modes).",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional()
    },
    async ({ action, params: rawParams = {} }) => {
      log.info(`[prism_calc] Action: ${action}`);
      
      // Normalize common parameter aliases for usability
      const params: Record<string, any> = { ...rawParams };
      if (params.depth_of_cut !== undefined && params.axial_depth === undefined) params.axial_depth = params.depth_of_cut;
      if (params.width_of_cut !== undefined && params.radial_depth === undefined) params.radial_depth = params.width_of_cut;
      if (params.flutes !== undefined && params.number_of_teeth === undefined) params.number_of_teeth = params.flutes;
      if (params.ap !== undefined && params.axial_depth === undefined) params.axial_depth = params.ap;
      if (params.ae !== undefined && params.radial_depth === undefined) params.radial_depth = params.ae;
      if (params.fz !== undefined && params.feed_per_tooth === undefined) params.feed_per_tooth = params.fz;
      if (params.vc !== undefined && params.cutting_speed === undefined) params.cutting_speed = params.vc;
      if (params.fn !== undefined && params.feed_per_rev === undefined) params.feed_per_rev = params.fn;
      if (params.n !== undefined && params.rpm === undefined) params.rpm = params.n;
      if (params.diameter !== undefined && params.tool_diameter === undefined) params.tool_diameter = params.diameter;
      // H1-MS2: Also accept camelCase → snake_case for calc
      if (params.toolDiameter !== undefined && params.tool_diameter === undefined) params.tool_diameter = params.toolDiameter;
      if (params.feedPerTooth !== undefined && params.feed_per_tooth === undefined) params.feed_per_tooth = params.feedPerTooth;
      if (params.axialDepth !== undefined && params.axial_depth === undefined) params.axial_depth = params.axialDepth;
      if (params.radialDepth !== undefined && params.radial_depth === undefined) params.radial_depth = params.radialDepth;
      if (params.cuttingSpeed !== undefined && params.cutting_speed === undefined) params.cutting_speed = params.cuttingSpeed;
      if (params.spindleSpeed !== undefined && params.rpm === undefined) params.rpm = params.spindleSpeed;
      if (params.numberOfFlutes !== undefined && params.number_of_teeth === undefined) params.number_of_teeth = params.numberOfFlutes;
      if (params.feedPerRev !== undefined && params.feed_per_rev === undefined) params.feed_per_rev = params.feedPerRev;
      if (params.feedRate !== undefined && params.feed_rate === undefined) params.feed_rate = params.feedRate;
      
      let result: any;
      
      // Map actions to specific pre-hook phases
      const SPECIFIC_HOOKS: Record<string, string> = {
        cutting_force: "pre-kienzle",
        tool_life: "pre-taylor",
        flow_stress: "pre-johnson-cook"
      };
      
      try {
        // === PRE-CALCULATION HOOKS (9 hooks: lesson recall, validation, compatibility, force bounds, circuit breaker) ===
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "calcDispatcher", action, params }
        };
        
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true,
              blocker: preResult.blockedBy,
              reason: preResult.summary,
              action,
              hook_results: preResult.results.map(r => ({ id: r.hookId, blocked: r.blocked, message: r.message }))
            }) }]
          };
        }
        
        // Fire specific formula hooks (e.g. pre-kienzle for cutting_force)
        const specificPhase = SPECIFIC_HOOKS[action];
        if (specificPhase) {
          const specResult = await hookExecutor.execute(specificPhase as any, hookCtx);
          if (specResult.blocked) {
            return {
              content: [{ type: "text", text: JSON.stringify({
                blocked: true,
                blocker: specResult.blockedBy,
                reason: specResult.summary,
                action,
                hook_phase: specificPhase
              }) }]
            };
          }
        }
        
        switch (action) {
          case "cutting_force": {
            // Auto-derive cutting_speed from material if not provided
            let autoVc = params.cutting_speed;
            if (!autoVc && (params.material_id || params.material)) {
              const matLookup = await registryManager.materials.getByIdOrName(params.material_id || params.material);
              if (matLookup) {
                const cr = (matLookup as any).cutting_recommendations?.milling;
                autoVc = cr?.speed_roughing || cr?.speed_finishing || 150;
              }
            }
            if (!autoVc) autoVc = 150; // Safe default
            
            const conditions: CuttingConditions = {
              cutting_speed: autoVc,
              feed_per_tooth: params.feed_per_tooth,
              axial_depth: params.axial_depth,
              radial_depth: params.radial_depth,
              tool_diameter: params.tool_diameter,
              number_of_teeth: params.number_of_teeth,
              rake_angle: params.rake_angle || 6
            };
            
            let coefficients: KienzleCoefficients;
            if (params.kc1_1 && params.mc) {
              coefficients = { kc1_1: params.kc1_1, mc: params.mc };
            } else if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              if (mat?.kienzle) {
                const k = mat.kienzle;
                coefficients = { 
                  kc1_1: k.kc1_1_milling || k.kc1_1, 
                  mc: k.mc_milling || k.mc,
                  iso_group: mat.iso_group,
                  data_quality: mat.data_quality
                } as any;
              } else {
                coefficients = getDefaultKienzle(params.material_group || "steel_medium_carbon");
              }
            } else {
              coefficients = getDefaultKienzle(params.material_group || "steel_medium_carbon");
            }
            
            result = calculateKienzleCuttingForce(conditions, coefficients);
            break;
          }
          
          case "tool_life": {
            let coefficients: TaylorCoefficients;
            if (params.taylor_C && params.taylor_n) {
              coefficients = { C: params.taylor_C, n: params.taylor_n, tool_material: params.tool_material || "Carbide" };
            } else if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              const toolMat = params.tool_material || "Carbide";
              if (mat?.taylor) {
                const t = mat.taylor;
                const useC = toolMat.toLowerCase().includes("carbide") ? (t.C_carbide || t.C) : t.C;
                const useN = toolMat.toLowerCase().includes("carbide") ? (t.n_carbide || t.n) : t.n;
                coefficients = { C: useC, n: useN, tool_material: toolMat };
              } else {
                coefficients = getDefaultTaylor(params.material_group || "steel", toolMat);
              }
            } else {
              coefficients = getDefaultTaylor(params.material_group || "steel", params.tool_material || "Carbide");
            }
            
            result = calculateTaylorToolLife(
              params.cutting_speed,
              coefficients,
              params.feed,
              params.depth
            );
            break;
          }
          
          case "speed_feed": {
            // R1: Pass SpeedFeedInput object, not positional args
            const sfInput = {
              material_hardness: params.material_hardness || 200,
              tool_material: params.tool_material || "Carbide",
              operation: params.operation || "semi-finishing",
              tool_diameter: params.tool_diameter || 12,
              number_of_teeth: params.number_of_teeth || 4,
              kienzle: undefined as any,
              taylor: undefined as any,
            };
            
            // Auto-lookup material data if material_id provided
            if (params.material_id || params.material) {
              const matId = params.material_id || params.material;
              const mat = await registryManager.materials.getByIdOrName(matId);
              if (mat) {
                sfInput.material_hardness = mat.mechanical?.hardness?.brinell || sfInput.material_hardness;
                if (mat.kienzle) sfInput.kienzle = { kc1_1: mat.kienzle.kc1_1, mc: mat.kienzle.mc };
                if (mat.taylor) sfInput.taylor = { C: mat.taylor.C, n: mat.taylor.n };
              }
            }
            
            result = calculateSpeedFeed(sfInput);
            break;
          }
          
          case "flow_stress": {
            const jcParams: JohnsonCookParams = {
              A: params.A,
              B: params.B,
              n: params.n,
              C: params.C,
              m: params.m,
              T_melt: params.T_melt,
              T_ref: params.T_ref || 20
            };
            
            result = calculateJohnsonCookStress(
              params.strain,
              params.strain_rate,
              params.temperature,
              jcParams
            );
            break;
          }
          
          case "surface_finish": {
            result = calculateSurfaceFinish(
              params.feed,
              params.nose_radius,
              params.is_milling || false,
              params.radial_depth,
              params.tool_diameter
            );
            break;
          }
          
          case "mrr": {
            const mrrConditions: CuttingConditions = {
              cutting_speed: params.cutting_speed,
              feed_per_tooth: params.feed_per_tooth,
              axial_depth: params.axial_depth,
              radial_depth: params.radial_depth,
              tool_diameter: params.tool_diameter,
              number_of_teeth: params.number_of_teeth
            };
            result = calculateMRR(mrrConditions, params.volume_to_remove);
            break;
          }
          
          case "power": {
            result = calculateSpindlePower(
              params.cutting_force,
              params.cutting_speed,
              params.tool_diameter,
              params.efficiency || 0.8
            );
            break;
          }
          
          case "chip_load": {
            result = calculateChipLoad(
              params.feed_rate,
              params.spindle_speed,
              params.number_of_teeth,
              params.radial_depth,
              params.tool_diameter
            );
            break;
          }
          
          case "torque": {
            result = calculateTorque(
              params.cutting_force,
              params.tool_diameter || params.workpiece_diameter,
              params.operation || "milling"
            );
            break;
          }
          
          case "stability": {
            const modal: ModalParameters = {
              natural_frequency: params.natural_frequency,
              damping_ratio: params.damping_ratio,
              stiffness: params.stiffness
            };
            
            result = calculateStabilityLobes(
              modal,
              params.specific_force,
              params.number_of_teeth,
              params.current_depth,
              params.current_speed
            );
            break;
          }
          
          case "deflection": {
            result = calculateToolDeflection(
              params.cutting_force,
              params.tool_diameter,
              params.overhang_length,
              params.youngs_modulus || 600,
              params.runout || 0.005
            );
            break;
          }
          
          case "thermal": {
            result = calculateCuttingTemperature(
              params.cutting_speed,
              params.feed,
              params.depth,
              params.specific_force,
              params.thermal_conductivity || 50,
              params.workpiece_length
            );
            break;
          }
          
          case "cost_optimize": {
            const costParams: CostParameters = {
              taylor_C: params.taylor_C,
              taylor_n: params.taylor_n,
              machine_rate: params.machine_rate,
              tool_cost: params.tool_cost,
              tool_change_time: params.tool_change_time
            };
            
            result = calculateMinimumCostSpeed(
              costParams,
              params.volume_to_remove,
              params.mrr_at_ref
            );
            break;
          }
          
          case "multi_optimize": {
            const constraints: OptimizationConstraints = {
              max_power: params.max_power,
              max_force: params.max_force,
              min_tool_life: params.min_tool_life,
              max_surface_finish: params.max_surface_finish
            };
            
            const weights: OptimizationWeights = {
              productivity: params.weight_productivity || 0.3,
              cost: params.weight_cost || 0.3,
              quality: params.weight_quality || 0.2,
              tool_life: params.weight_tool_life || 0.2
            };
            
            result = optimizeCuttingParameters(
              params.material_kc,
              params.taylor_C,
              params.taylor_n,
              params.tool_diameter,
              params.number_of_teeth,
              constraints,
              weights
            );
            break;
          }
          
          case "productivity": {
            result = calculateProductivityMetrics(
              params.cutting_speed,
              params.feed_per_tooth,
              params.axial_depth,
              params.radial_depth,
              params.tool_diameter,
              params.number_of_teeth,
              params.taylor_C,
              params.taylor_n,
              params.tool_cost,
              params.machine_rate
            );
            break;
          }
          
          case "engagement": {
            result = calculateEngagementAngle(
              params.tool_diameter,
              params.radial_depth,
              params.feed_per_tooth,
              params.is_climb !== false,
              params.cutting_speed
            );
            break;
          }
          
          case "trochoidal": {
            result = calculateTrochoidalParams(
              params.tool_diameter,
              params.slot_width,
              params.axial_depth,
              params.cutting_speed,
              params.feed_per_tooth,
              params.number_of_teeth
            );
            break;
          }
          
          case "hsm": {
            result = calculateHSMParams(
              params.tool_diameter,
              params.programmed_feedrate,
              params.machine_max_accel || 5,
              params.tolerance || 0.01
            );
            break;
          }
          
          case "scallop": {
            result = calculateScallopHeight(
              params.tool_radius,
              params.stepover,
              params.surface_width,
              params.feed_rate,
              params.is_ball_nose !== false
            );
            break;
          }
          
          case "stepover": {
            result = calculateOptimalStepover(
              params.tool_diameter,
              params.tool_corner_radius,
              params.target_scallop || 0.01,
              params.operation || "finishing"
            );
            break;
          }
          
          case "cycle_time": {
            result = estimateCycleTime(
              params.cutting_distance,
              params.cutting_feedrate,
              params.rapid_distance,
              params.number_of_tools || 1,
              params.tool_change_time || 0.5,
              params.rapid_rate || 30000
            );
            break;
          }
          
          case "arc_fit": {
            result = calculateArcFitting(
              params.chord_tolerance,
              params.arc_radius,
              params.feedrate,
              params.block_time || 1
            );
            break;
          }

          case "chip_thinning": {
            result = calculateChipThinning(params.tool_diameter, params.radial_depth, params.feed_per_tooth, params.number_of_teeth || 4, params.cutting_speed || 150);
            break;
          }

          case "multi_pass": {
            const mpMat = (params.material_id || params.material) ? await registryManager.materials.getByIdOrName(params.material_id || params.material) : null;
            const mpKc = params.kc1_1 || mpMat?.kienzle?.kc1_1 || 1800;
            const mpCr = (mpMat as any)?.cutting_recommendations?.milling || {};
            result = calculateMultiPassStrategy(params.total_stock || params.stock || 10, params.tool_diameter || 12, mpKc, params.machine_power_kw || params.max_power || 15, params.cutting_speed_rough || mpCr.speed_roughing || 150, params.cutting_speed_finish || mpCr.speed_finishing || 200, params.fz_rough || mpCr.feed_per_tooth_roughing || 0.12, params.fz_finish || mpCr.feed_per_tooth_finishing || 0.06, params.target_Ra);
            break;
          }

          case "coolant_strategy": {
            const csMat = (params.material_id || params.material) ? await registryManager.materials.getByIdOrName(params.material_id || params.material) : null;
            result = recommendCoolantStrategy(params.iso_group || csMat?.iso_group || "P", params.operation || "milling", params.cutting_speed || 150, params.coolant_through || false, (csMat as any)?.physical?.thermal_conductivity);
            break;
          }

          case "gcode_snippet": {
            const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
            result = generateGCodeSnippet(params.controller || "fanuc", params.operation || "milling", { rpm: gcRpm, feed_rate: params.feed_rate || params.vf || 1000, tool_number: params.tool_number || 1, depth_of_cut: params.axial_depth || 3, x_start: params.x_start, y_start: params.y_start, z_safe: params.z_safe || 5, z_depth: params.z_depth, coolant: params.coolant });
            break;
          }

          case "tolerance_analysis": {
            const analysisType = params.analysis_type || "single";
            if (analysisType === "stack" && Array.isArray(params.stack_dimensions)) {
              result = toleranceStackUp(params.stack_dimensions);
            } else if (analysisType === "cpk") {
              result = calculateCpk(params.nominal_mm, params.tolerance_mm, params.process_sigma_mm);
            } else {
              result = calculateITGrade(params.nominal_mm, params.it_grade ?? 7);
            }
            break;
          }

          case "fit_analysis": {
            result = analyzeShaftHoleFit(params.nominal_mm, params.fit_class);
            break;
          }

          case "gcode_generate": {
            if (params.operations && Array.isArray(params.operations)) {
              // Multi-operation program
              result = generateProgram(params.controller || "fanuc", params.operations);
            } else if (params.list_controllers) {
              result = { controllers: listGCodeControllers() };
            } else if (params.list_operations) {
              result = { operations: listGCodeOperations() };
            } else {
              // Single operation
              const gcRpm = params.rpm || Math.round(((params.cutting_speed || 150) * 1000) / (Math.PI * (params.tool_diameter || 12)));
              result = generateGCode(
                params.controller || "fanuc",
                params.operation || "facing",
                {
                  rpm: gcRpm,
                  feed_rate: params.feed_rate || params.vf || 1000,
                  tool_number: params.tool_number || 1,
                  z_safe: params.z_safe || 5,
                  z_depth: params.z_depth,
                  coolant: params.coolant || "flood",
                  x_start: params.x_start,
                  y_start: params.y_start,
                  x_end: params.x_end,
                  y_end: params.y_end,
                  tool_diameter: params.tool_diameter,
                  peck_depth: params.peck_depth,
                  pitch: params.pitch,
                  thread_diameter: params.thread_diameter,
                  thread_pitch: params.thread_pitch,
                  thread_depth: params.thread_depth,
                  thread_direction: params.thread_direction,
                  pocket_diameter: params.pocket_diameter,
                  pocket_depth: params.pocket_depth,
                  stepover_percent: params.stepover_percent,
                  profile_points: params.profile_points,
                  comp_side: params.comp_side,
                  approach_type: params.approach_type,
                  program_number: params.program_number,
                  program_name: params.program_name,
                  sub_program_number: params.sub_program_number,
                  sub_repeats: params.sub_repeats,
                  work_offset: params.work_offset,
                  dwell: params.dwell,
                  orient_angle: params.orient_angle,
                  shift_amount: params.shift_amount,
                }
              );
            }
            break;
          }

          case "decision_tree": {
            if (params.list_trees) {
              result = { trees: listDecisionTrees() };
            } else {
              const treeName = params.tree;
              if (!treeName) throw new Error("decision_tree requires 'tree' parameter (e.g., 'selectToolType')");
              result = decide(treeName, params);
            }
            break;
          }

          case "render_report": {
            if (params.list_types) {
              result = { types: listReportTypes() };
            } else {
              const reportType = params.report_type || params.type;
              if (!reportType) throw new Error("render_report requires 'report_type' parameter (e.g., 'setup_sheet')");
              result = renderReport(reportType, params);
            }
            break;
          }

          case "campaign_create": {
            if (params.list_actions) {
              result = { actions: listCampaignActions() };
            } else {
              if (!params.config) throw new Error("campaign_create requires 'config' parameter");
              if (!params.operation_results) throw new Error("campaign_create requires 'operation_results' (2D array of pre-computed results)");
              result = createCampaign(params.config, params.operation_results);
            }
            break;
          }

          case "campaign_validate": {
            if (!params.config) throw new Error("campaign_validate requires 'config' parameter");
            result = validateCampaign(params.config);
            break;
          }

          case "campaign_optimize": {
            if (!params.config) throw new Error("campaign_optimize requires 'config' parameter");
            const target = params.target || { objective: "balanced" };
            result = optimizeCampaign(params.config, target);
            break;
          }

          case "campaign_cycle_time": {
            if (!params.config) throw new Error("campaign_cycle_time requires 'config' parameter");
            result = estimateCampaignTime(params.config);
            break;
          }

          case "inference_chain": {
            const mode = params.mode || "run_chain";
            if (mode === "list_chains") {
              result = { chain_types: listChainTypes(), actions: ["run_chain", "analyze", "diagnose", "list_chains"] };
            } else if (mode === "analyze") {
              if (!params.scenario) throw new Error("inference_chain analyze requires 'scenario' parameter");
              result = await analyzeAndRecommend({
                scenario: params.scenario,
                material: params.material,
                machine: params.machine,
                constraints: params.constraints,
                response_level: params.response_level,
              });
            } else if (mode === "diagnose") {
              if (!params.symptoms) throw new Error("inference_chain diagnose requires 'symptoms' parameter");
              result = await deepDiagnose({
                alarm_code: params.alarm_code,
                symptoms: params.symptoms,
                machine_state: params.machine_state,
                material: params.material,
                operation: params.operation,
                response_level: params.response_level,
              });
            } else {
              // mode === "run_chain" (default)
              if (!params.chain_config) throw new Error("inference_chain run_chain requires 'chain_config' parameter");
              const chainConfig = params.chain_config as InferenceChainConfig;
              if (params.response_level && !chainConfig.response_level) {
                chainConfig.response_level = params.response_level;
              }
              result = await runInferenceChain(chainConfig);
            }
            break;
          }

          case "wear_prediction": {
            // R3-MS1: Three-zone flank wear model based on Taylor parameters
            // Zone I (break-in): VB = VB0 + k_breakin * sqrt(t)
            // Zone II (steady): VB = VB_breakin + k_steady * t
            // Zone III (accelerated): VB = VB_steady + k_accel * (exp(alpha*(t-t_accel)) - 1)
            const wpCuttingSpeed = params.cutting_speed;
            const wpFeedPerTooth = params.feed_per_tooth || 0.15;
            const wpDepthOfCut = params.depth_of_cut || params.axial_depth || 2.0;
            const wpCuttingTime = params.cutting_time_min;
            if (!wpCuttingSpeed || wpCuttingTime === undefined) {
              throw new Error("wear_prediction requires: cutting_speed (m/min), cutting_time_min");
            }

            let wpTaylorC = params.taylor_C;
            let wpTaylorN = params.taylor_n;
            let wpIsoGroup = params.iso_group || "P";
            if ((!wpTaylorC || !wpTaylorN) && (params.material_id || params.material)) {
              const wpMat = await registryManager.materials.getByIdOrName(params.material_id || params.material);
              if (wpMat?.taylor) {
                wpTaylorC = wpTaylorC || wpMat.taylor.C_carbide || wpMat.taylor.C;
                wpTaylorN = wpTaylorN || wpMat.taylor.n_carbide || wpMat.taylor.n;
                wpIsoGroup = wpMat.iso_group || wpIsoGroup;
              }
            }
            if (!wpTaylorC || !wpTaylorN) {
              const defaults = getDefaultTaylor(params.material_group || "steel", params.tool_material || "Carbide");
              wpTaylorC = wpTaylorC || defaults.C;
              wpTaylorN = wpTaylorN || defaults.n;
            }

            // Taylor tool life: T = (C/Vc)^(1/n)
            const wpToolLife = Math.pow(wpTaylorC / wpCuttingSpeed, 1 / wpTaylorN);
            const wpToolLifeClamped = Math.max(1, Math.min(480, wpToolLife));

            const wpThreshold = params.threshold_mm || 0.3; // ISO 3685
            const wpBreakInEnd = wpToolLifeClamped * 0.05;
            const wpAccelStart = wpToolLifeClamped * 0.80;

            // Zone constants (empirically derived from ISO 3685 wear curves)
            const feedFactor = wpFeedPerTooth / 0.15;
            const depthFactor = Math.pow(wpDepthOfCut / 2.0, 0.3);
            const wpVB0 = 0.02; // initial wear from edge preparation
            const kBreakIn = (0.05 * feedFactor * depthFactor) / Math.sqrt(Math.max(0.01, wpBreakInEnd));
            const wpVBBreakIn = wpVB0 + kBreakIn * Math.sqrt(wpBreakInEnd);

            const kSteady = (wpThreshold * 0.60 - wpVBBreakIn) / Math.max(0.01, wpAccelStart - wpBreakInEnd);
            const wpVBSteady = wpVBBreakIn + kSteady * (wpAccelStart - wpBreakInEnd);

            const kAccel = 0.02;
            const remainingWear = Math.max(0.001, wpThreshold - wpVBSteady);
            const remainingTime = Math.max(0.01, wpToolLifeClamped - wpAccelStart);
            const alpha = Math.log(remainingWear / kAccel + 1) / remainingTime;

            // Calculate current wear
            let wpCurrentVB: number;
            let wpWearZone: string;
            const t = Math.max(0, wpCuttingTime);

            if (t <= wpBreakInEnd) {
              wpCurrentVB = wpVB0 + kBreakIn * Math.sqrt(t);
              wpWearZone = "break-in";
            } else if (t <= wpAccelStart) {
              wpCurrentVB = wpVBBreakIn + kSteady * (t - wpBreakInEnd);
              wpWearZone = "steady";
            } else {
              wpCurrentVB = wpVBSteady + kAccel * (Math.exp(alpha * (t - wpAccelStart)) - 1);
              wpWearZone = "accelerated";
            }

            // Calculate remaining useful life
            let wpRemainingLife: number;
            if (wpCurrentVB >= wpThreshold) {
              wpRemainingLife = 0;
            } else {
              wpRemainingLife = Math.max(0, wpToolLifeClamped - t);
            }

            const wpWarnings: string[] = [];
            if (wpCurrentVB > 0.2) wpWarnings.push("Approaching ISO 3685 wear threshold (0.3mm)");
            if (wpCurrentVB >= wpThreshold) wpWarnings.push("CRITICAL: Tool exceeded wear threshold");
            if (wpRemainingLife < 5 && wpRemainingLife > 0) wpWarnings.push(`Low remaining life: ${wpRemainingLife.toFixed(1)} min`);
            if (wpWearZone === "accelerated") wpWarnings.push("In accelerated wear zone — failure risk increasing");

            result = {
              flank_wear_VB_mm: Math.round(wpCurrentVB * 1000) / 1000,
              wear_zone: wpWearZone,
              remaining_life_min: Math.round(wpRemainingLife * 10) / 10,
              total_tool_life_min: Math.round(wpToolLifeClamped * 10) / 10,
              threshold_mm: wpThreshold,
              wear_rate_mm_per_min: wpWearZone === "steady" ? Math.round(kSteady * 10000) / 10000 : null,
              zone_boundaries: {
                break_in_end_min: Math.round(wpBreakInEnd * 10) / 10,
                accel_start_min: Math.round(wpAccelStart * 10) / 10
              },
              confidence: (params.material_id || params.material) ? "medium" : "low",
              recommendation: wpCurrentVB >= wpThreshold ? "Replace tool immediately"
                : wpCurrentVB > 0.2 ? "Plan tool change — approaching wear limit"
                : wpWearZone === "accelerated" ? "Monitor closely — in accelerated wear zone"
                : "Tool in normal operating range",
              warnings: wpWarnings,
              iso_group: wpIsoGroup
            };
            break;
          }

          case "process_cost_calc": {
            // R3-MS1: Process cost — chains speed_feed → multi_pass → tool_life → cost rollup
            const pcMachineRate = params.machine_rate_per_hr;
            const pcToolCost = params.tool_cost;
            if (!pcMachineRate || !pcToolCost) {
              throw new Error("process_cost_calc requires: machine_rate_per_hr, tool_cost");
            }
            const pcToolDiam = params.tool_diameter || 12;
            const pcTotalStock = params.total_stock || 5;
            const pcSetupTime = params.setup_time_min || 30;
            const pcBatchSize = params.batch_size || 1;
            const pcNumTeeth = params.number_of_teeth || 4;
            const pcMaxPower = params.machine_power_kw || 15;

            let pcKc = params.kc1_1 || 1800, pcMc = params.mc || 0.25;
            let pcTaylorC = params.taylor_C || 250, pcTaylorN = params.taylor_n || 0.25;
            let pcVcRough = params.cutting_speed_rough || 150;
            let pcVcFinish = params.cutting_speed_finish || 200;
            let pcFzRough = params.fz_rough || 0.12;
            let pcFzFinish = params.fz_finish || 0.06;

            const pcMaterial = params.material_id || params.material;
            if (pcMaterial) {
              const pcMat = await registryManager.materials.getByIdOrName(pcMaterial);
              if (pcMat) {
                if (pcMat.kienzle) { pcKc = pcMat.kienzle.kc1_1 || pcKc; pcMc = pcMat.kienzle.mc || pcMc; }
                if (pcMat.taylor) { pcTaylorC = pcMat.taylor.C_carbide || pcMat.taylor.C || pcTaylorC; pcTaylorN = pcMat.taylor.n_carbide || pcMat.taylor.n || pcTaylorN; }
                const cr = (pcMat as any).cutting_recommendations?.milling;
                if (cr) { pcVcRough = cr.speed_roughing || pcVcRough; pcVcFinish = cr.speed_finishing || pcVcFinish; pcFzRough = cr.feed_per_tooth_roughing || pcFzRough; pcFzFinish = cr.feed_per_tooth_finishing || pcFzFinish; }
              }
            }

            const pcMultiPass = calculateMultiPassStrategy(pcTotalStock, pcToolDiam, pcKc, pcMaxPower, pcVcRough, pcVcFinish, pcFzRough, pcFzFinish, params.target_Ra);
            const pcRpmRough = Math.round((pcVcRough * 1000) / (Math.PI * pcToolDiam));
            const pcFeedRateRough = pcFzRough * pcNumTeeth * pcRpmRough;
            const pcCuttingLength = params.cutting_length || 100;
            const pcRoughPasses = (pcMultiPass as any)?.roughing?.passes || Math.ceil((pcTotalStock - 0.3) / 2);
            const pcFinishPasses = params.target_Ra ? 1 : 0;
            const pcRpmFinish = Math.round((pcVcFinish * 1000) / (Math.PI * pcToolDiam));
            const pcFeedRateFinish = pcFzFinish * pcNumTeeth * pcRpmFinish;

            const pcRoughTime = pcRoughPasses * (pcCuttingLength / pcFeedRateRough);
            const pcFinishTime = pcFinishPasses > 0 ? (pcCuttingLength / pcFeedRateFinish) : 0;
            const pcRapidTime = (pcRoughPasses + pcFinishPasses) * 0.05;
            const pcToolChangeTime = params.tool_change_time || 0.5;
            const pcToolChanges = pcFinishPasses > 0 ? 1 : 0;
            const pcCycleTime = pcRoughTime + pcFinishTime + pcRapidTime + pcToolChanges * pcToolChangeTime;

            const pcToolLifeRough = Math.pow(pcTaylorC / pcVcRough, 1 / pcTaylorN);
            const pcToolLifeClamp = Math.max(1, Math.min(480, pcToolLifeRough));
            const pcPartsPerEdge = Math.max(1, Math.floor(pcToolLifeClamp / Math.max(0.01, pcRoughTime)));

            const pcMachiningCost = (pcCycleTime / 60) * pcMachineRate;
            const pcToolingCost = pcToolCost / pcPartsPerEdge;
            const pcSetupCost = (pcSetupTime / 60) * pcMachineRate / pcBatchSize;
            const pcIdleCost = (pcToolChanges * pcToolChangeTime / 60) * pcMachineRate;
            const pcTotal = pcMachiningCost + pcToolingCost + pcSetupCost + pcIdleCost;

            result = {
              cost_per_part: Math.round(pcTotal * 100) / 100,
              breakdown: {
                machining: Math.round(pcMachiningCost * 100) / 100,
                tooling: Math.round(pcToolingCost * 100) / 100,
                setup: Math.round(pcSetupCost * 100) / 100,
                idle: Math.round(pcIdleCost * 100) / 100
              },
              cycle_time_min: Math.round(pcCycleTime * 100) / 100,
              parts_per_tool_edge: pcPartsPerEdge,
              tool_life_min: Math.round(pcToolLifeClamp * 10) / 10,
              batch_cost_total: Math.round(pcTotal * pcBatchSize * 100) / 100,
              pass_strategy: { roughing_passes: pcRoughPasses, finishing_passes: pcFinishPasses, total_stock_mm: pcTotalStock },
              parameters_used: { Vc_rough: pcVcRough, Vc_finish: pcVcFinish, fz_rough: pcFzRough, rpm_rough: pcRpmRough, feed_rate_rough_mm_min: Math.round(pcFeedRateRough) }
            };
            break;
          }

          case "uncertainty_chain": {
            // R3-MS1: Uncertainty propagation through Kienzle → Taylor → Power → Cost
            // RSS (Root Sum of Squares) method per GUM (Guide to Uncertainty in Measurement)
            const ucToolDiam = params.tool_diameter || 12;
            const ucNumTeeth = params.number_of_teeth || 4;

            let ucKc = 1800, ucMc = 0.25, ucTaylorC = 250, ucTaylorN = 0.25;
            let ucSigmaKc = 0.10, ucSigmaMc = 0.05, ucSigmaC = 0.15, ucSigmaN = 0.08;
            let ucHasStats = false;
            const ucAssumed: string[] = [];

            const ucMaterial = params.material_id || params.material;
            if (ucMaterial) {
              const ucMat = await registryManager.materials.getByIdOrName(ucMaterial);
              if (ucMat) {
                if (ucMat.kienzle) { ucKc = ucMat.kienzle.kc1_1 || ucKc; ucMc = ucMat.kienzle.mc || ucMc; }
                if (ucMat.taylor) { ucTaylorC = ucMat.taylor.C_carbide || ucMat.taylor.C || ucTaylorC; ucTaylorN = ucMat.taylor.n_carbide || ucMat.taylor.n || ucTaylorN; }
                const stats = (ucMat as any).statistics;
                if (stats?.standardDeviation) {
                  ucHasStats = true;
                  ucSigmaKc = stats.standardDeviation.kc1_1 ? stats.standardDeviation.kc1_1 / ucKc : ucSigmaKc;
                  ucSigmaN = stats.standardDeviation.taylor_n ? stats.standardDeviation.taylor_n / ucTaylorN : ucSigmaN;
                } else {
                  ucAssumed.push("kc1_1 (±10%)", "mc (±5%)", "Taylor C (±15%)", "Taylor n (±8%)");
                }
              }
            } else {
              ucAssumed.push("kc1_1 (±10% default)", "mc (±5% default)", "Taylor C (±15% default)", "Taylor n (±8% default)");
            }

            const ucVc = params.cutting_speed || 150;
            const ucFz = params.feed_per_tooth || 0.12;
            const ucAp = params.axial_depth || params.depth_of_cut || 2.0;
            const ucSigmaFz = 0.03, ucSigmaVc = 0.02;

            // Cutting force: Fc = kc1_1 × ap × fz^(1-mc)
            const ucFc = ucKc * ucAp * Math.pow(ucFz, 1 - ucMc);
            const ucRelSigmaFc = Math.sqrt(ucSigmaKc ** 2 + ((1 - ucMc) * ucSigmaFz) ** 2 + (ucSigmaMc * Math.log(ucFz)) ** 2);

            // Power: Pc = Fc × Vc / (60000 × η)
            const ucPc = (ucFc * ucVc) / (60000 * 0.80);
            const ucRelSigmaPc = Math.sqrt(ucRelSigmaFc ** 2 + ucSigmaVc ** 2);

            // Tool life: T = (C/Vc)^(1/n)
            const ucT = Math.max(1, Math.min(480, Math.pow(ucTaylorC / ucVc, 1 / ucTaylorN)));
            const ucRelSigmaT = Math.sqrt((ucSigmaC / ucTaylorN) ** 2 + (Math.log(ucVc) * ucSigmaN / (ucTaylorN ** 2)) ** 2);

            // Cost per part
            const ucMachineRate = params.machine_rate_per_hr || 85;
            const ucToolCostVal = params.tool_cost || 15;
            const ucCuttingLength = params.cutting_length || 100;
            const ucRpm = Math.round((ucVc * 1000) / (Math.PI * ucToolDiam));
            const ucFeedRate = ucFz * ucNumTeeth * ucRpm;
            const ucCycleT = ucCuttingLength / ucFeedRate;
            const ucPartsPerEdge = Math.max(1, Math.floor(ucT / ucCycleT));
            const ucCostPerPart = (ucCycleT / 60) * ucMachineRate + ucToolCostVal / ucPartsPerEdge;
            const ucRelSigmaCost = Math.sqrt((ucRelSigmaT * 0.5) ** 2 + (ucSigmaVc * 0.3) ** 2);

            const ci = (val: number, rel: number, z: number) => [
              Math.round(val * (1 - z * rel) * 100) / 100,
              Math.round(val * (1 + z * rel) * 100) / 100
            ];

            const ucSources = [
              { name: "Taylor C (tool life constant)", sigma: ucSigmaC },
              { name: "kc1_1 (specific cutting force)", sigma: ucSigmaKc },
              { name: "Taylor n (tool life exponent)", sigma: ucSigmaN },
              { name: "mc (Kienzle exponent)", sigma: ucSigmaMc },
              { name: "feed accuracy", sigma: ucSigmaFz },
              { name: "speed accuracy", sigma: ucSigmaVc }
            ].sort((a, b) => b.sigma - a.sigma);

            result = {
              parameters: {
                Vc_m_min: ucVc, fz_mm: ucFz, ap_mm: ucAp,
                Fc_N: Math.round(ucFc), Pc_kW: Math.round(ucPc * 100) / 100,
                T_min: Math.round(ucT * 10) / 10, cost_per_part: Math.round(ucCostPerPart * 100) / 100
              },
              relative_uncertainties: {
                Fc: Math.round(ucRelSigmaFc * 10000) / 100 + "%",
                Pc: Math.round(ucRelSigmaPc * 10000) / 100 + "%",
                T: Math.round(ucRelSigmaT * 10000) / 100 + "%",
                cost: Math.round(ucRelSigmaCost * 10000) / 100 + "%"
              },
              confidence_intervals: {
                ci_90: { Fc_N: ci(ucFc, ucRelSigmaFc, 1.645), Pc_kW: ci(ucPc, ucRelSigmaPc, 1.645), T_min: ci(ucT, ucRelSigmaT, 1.645), cost: ci(ucCostPerPart, ucRelSigmaCost, 1.645) },
                ci_95: { Fc_N: ci(ucFc, ucRelSigmaFc, 1.96), Pc_kW: ci(ucPc, ucRelSigmaPc, 1.96), T_min: ci(ucT, ucRelSigmaT, 1.96), cost: ci(ucCostPerPart, ucRelSigmaCost, 1.96) }
              },
              dominant_uncertainty_source: ucSources[0].name,
              uncertainty_ranking: ucSources.map(s => `${s.name}: \u00b1${Math.round(s.sigma * 100)}%`),
              data_quality: { has_statistics: ucHasStats, assumed_uncertainties: ucAssumed }
            };
            break;
          }

          // === CONTROLLER OPTIMIZATION (R3-MS3) ===
          case "controller_optimize": {
            const coController = (params.controller || "").toLowerCase();
            const coOperation = params.operation || "milling";
            const coParams = params.params || {};
            if (!coController) throw new Error("controller_optimize requires 'controller' parameter (fanuc, siemens, haas, mazak, okuma, heidenhain)");

            // Controller-specific optimization features database
            const controllerFeatures: Record<string, { roughing: string[]; finishing: string[]; contouring: string[]; codes: string[]; notes: string[] }> = {
              fanuc: {
                roughing: ["G05.1 Q0 (high-speed smoothing OFF for roughing)", "G64 (continuous path mode for faster rapids)"],
                finishing: ["G05.1 Q1 (nano smoothing ON)", "G05.1 Q2 (AI nano contour control)", "G08 P1 (look-ahead ON)"],
                contouring: ["G05.1 Q1 (AICC — AI contour control)", "G41/G42 (cutter compensation with AICC)"],
                codes: ["G05.1", "G08", "G64", "G61.1"],
                notes: ["AICC requires option; check parameter 19601", "Nano smoothing tolerance set via G05.1 Rx.xxx"]
              },
              siemens: {
                roughing: ["CYCLE832(0.1, 1) ; rough tolerance 0.1mm", "SOFT (acceleration smoothing)"],
                finishing: ["CYCLE832(0.005, 3) ; finish tolerance 5μm", "COMPCAD (spline interpolation)", "FFWON (feed-forward ON)"],
                contouring: ["COMPCAD", "G642 (corner rounding with tolerance)", "FFWON"],
                codes: ["CYCLE832", "COMPCAD", "G642", "FFWON", "SOFT"],
                notes: ["CYCLE832 sets CPRECON, FIFOCTRL, COMPSURF internally", "G642 radius = corner tolerance for contour accuracy"]
              },
              haas: {
                roughing: ["G187 P1 (rough mode — fastest cornering)", "G64 P0.05 (continuous path, 50μm tolerance)"],
                finishing: ["G187 P3 (finish mode — smoothest motion)", "G64 P0.005 (tight path tolerance 5μm)"],
                contouring: ["G187 P2 (medium mode)", "G64 P0.01 (10μm path tolerance)"],
                codes: ["G187", "G64"],
                notes: ["G187 P1/P2/P3 = rough/medium/finish smoothness", "Setting 191 controls look-ahead blocks"]
              },
              mazak: {
                roughing: ["G05.1 Q0 (high-speed mode OFF for heavy cuts)", "Machining Navi L-g (learning vibration suppression)"],
                finishing: ["G05.1 Q1 (high-speed machining ON)", "SFC (Super Feed Control) for constant chip load"],
                contouring: ["G05.1 Q1", "Intelligent Thermal Shield compensation"],
                codes: ["G05.1", "G05", "SFC"],
                notes: ["SFC adjusts feed rate automatically at corners", "Machining Navi requires SmoothX option"]
              },
              okuma: {
                roughing: ["G08 P0 (look-ahead OFF for stability)", "Machining Navi for optimal spindle speed"],
                finishing: ["G08 P1 (look-ahead ON)", "Super-NURBS interpolation", "5-Axis Auto Tuning System"],
                contouring: ["Super-NURBS", "G05.1 Q1 (NURBS interpolation)", "Collision Avoidance System"],
                codes: ["G08", "G05.1", "Super-NURBS"],
                notes: ["Super-NURBS requires OSP-P300 or newer", "Machining Navi M-i for intelligent vibration control"]
              },
              heidenhain: {
                roughing: ["FUNCTION TCPM OFF", "M204 (linear acceleration for heavy cuts)"],
                finishing: ["FUNCTION TCPM (tool center point management)", "CYCLE32 (surface tolerance 0.005)", "M200 (jerk limitation for smooth finish)"],
                contouring: ["FUNCTION TCPM F0.01", "CYCLE32 R0.005 (HSC tolerance)", "Q parameters for adaptive feed"],
                codes: ["CYCLE32", "FUNCTION TCPM", "M200", "M204"],
                notes: ["CYCLE32 tolerance controls HSC quality vs speed tradeoff", "iTNC 530/640: use FUNCTION TCPM for 5-axis work"]
              }
            };

            const family = Object.keys(controllerFeatures).find(k => coController.includes(k)) || "fanuc";
            const features = controllerFeatures[family];
            const isRoughing = /rough|heavy|hogg/i.test(coOperation);
            const isFinishing = /finish|fine|polish/i.test(coOperation);
            const mode = isRoughing ? "roughing" : isFinishing ? "finishing" : "contouring";
            const optimizations = features[mode];

            // Performance impact estimates
            const speedImpact = isFinishing ? 5 : isRoughing ? 15 : 10;
            const finishImpact = isFinishing ? 30 : isRoughing ? 0 : 15;

            result = {
              controller: family,
              controller_input: coController,
              operation: coOperation,
              mode_selected: mode,
              optimizations_applied: optimizations,
              all_available_codes: features.codes,
              performance_impact: {
                speed_improvement_pct: speedImpact,
                finish_improvement_pct: finishImpact,
                note: `Estimated for ${mode} mode on ${family}`
              },
              gcode_additions: optimizations.join("\n"),
              notes: features.notes,
              params_received: coParams
            };
            break;
          }

          // === PHYSICS PREDICTION (R7-MS0) ===
          case "surface_integrity_predict":
          case "chatter_predict":
          case "thermal_compensate":
          case "unified_machining_model":
          case "coupling_sensitivity":
          case "rz_kinematic":
          case "rz_milling":
          case "surface_profile":
          case "chip_form": {
            result = physicsPrediction(action, params);
            break;
          }

          case "optimize_parameters":
          case "optimize_sequence":
          case "sustainability_report":
          case "eco_optimize": {
            result = optimization(action, params);
            break;
          }

          case "fixture_recommend": {
            result = workholdingIntelligence(action, params);
            break;
          }

          default:
            throw new Error(`Unknown calculation action: ${action}`);
        }
        
        // === POST-CALCULATION HOOKS (9 hooks: chip breaking, stability, power, torque, Bayesian, deflection, surface finish, MRR) ===
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_calc] Post-calculation hook error (non-blocking): ${postErr}`);
        }
        
        // R2-MS1 T5: Apply response_level formatting if requested
        const responseLevel = (params.response_level as ResponseLevel) || undefined;
        if (responseLevel) {
          const leveled = formatByLevel(result, responseLevel, (r: any) => calcExtractKeyValues(action, r));
          return { content: [{ type: "text", text: JSON.stringify(leveled) }] };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(slimResponse(result, getSlimLevel(getCurrentPressurePct()))) }]
        };
        
      } catch (error) {
        log.error(`[prism_calc] Error in ${action}:`, error);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              error: `Calculation failed: ${error instanceof Error ? error.message : String(error)}`,
              action,
              params 
            }) 
          }]
        };
      }
    }
  );
}