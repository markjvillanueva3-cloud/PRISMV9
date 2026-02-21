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
  "chip_thinning", "multi_pass", "coolant_strategy", "gcode_snippet"
] as const;

export function registerCalcDispatcher(server: any): void {
  server.tool(
    "prism_calc",
    "Manufacturing physics calculations: cutting force, tool life, speed/feed, flow stress, surface finish, MRR, power, torque, chip load, stability, deflection, thermal, cost/multi-objective optimization, trochoidal/HSM, scallop, cycle time, chip thinning compensation, multi-pass strategy, coolant strategy, G-code generation.",
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