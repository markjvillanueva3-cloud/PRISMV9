import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { SafetyBlockError } from "../../errors/PrismError.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";
import type { SafetyCalcResult } from "../../schemas/safetyCalcSchema.js";

// Import original handlers
import {
  calculateKienzleCuttingForce,
  calculateTaylorToolLife,
  calculateJohnsonCookStress,
  calculateSurfaceFinish,
  calculateMRR,
  calculateSpeedFeed,
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
  calculateArcFitting
} from "../../engines/ToolpathCalculations.js";

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
  "mrr", "power", "chip_load", "stability", "deflection", "thermal", 
  "cost_optimize", "multi_optimize", "productivity", "engagement", 
  "trochoidal", "hsm", "scallop", "stepover", "cycle_time", "arc_fit"
] as const;

export function registerCalcDispatcher(server: any): void {
  server.tool(
    "prism_calc",
    "Manufacturing physics calculations: cutting force, tool life, speed/feed, flow stress, surface finish, MRR, power, chip load, stability, deflection, thermal, cost/multi-objective optimization, trochoidal/HSM, scallop, cycle time.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional()
    },
    async ({ action, params = {} }) => {
      log.info(`[prism_calc] Action: ${action}`);
      
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
            const conditions: CuttingConditions = {
              cutting_speed: params.cutting_speed,
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
            } else if (params.material_id) {
              // W5: Auto-lookup from material registry — .get() returns data directly
              const mat = registryManager.materials.get(params.material_id);
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
                result = { error: `Material ${params.material_id} not found or no Kienzle data`, fallback: "using defaults" };
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
            } else if (params.material_id) {
              // W5: Auto-lookup Taylor coefficients — .get() returns data directly
              const mat = registryManager.materials.get(params.material_id);
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
            result = calculateSpeedFeed(
              params.material_hardness || 200,
              params.tool_material || "Carbide",
              params.operation || "semi-finishing",
              params.tool_diameter,
              params.number_of_teeth
            );
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