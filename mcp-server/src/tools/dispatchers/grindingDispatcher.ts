/**
 * prism_grinding — Grinding Process Dispatcher
 *
 * 4 actions: wheel_select, dress_params, burn_threshold, surface_integrity
 *
 * Uses existing engines for surface integrity and grinding-related calculations.
 * Grinding wheel selection and dressing are computed inline using ANSI B74.13 data.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { GRINDING_ACTION_SCHEMAS } from "../../schemas/grindingActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { grindingForceEngine } from "../../engines/GrindingForceEngine.js";
import type { GrindingMode, CoolantType } from "../../engines/GrindingForceEngine.js";
import { grindingSurfaceFinishEngine } from "../../engines/GrindingSurfaceFinishEngine.js";
import type { GrindingMode as SFGrindingMode, DressingCondition } from "../../engines/GrindingSurfaceFinishEngine.js";

const ACTIONS = [
  "wheel_select", "dress_params", "burn_threshold", "surface_integrity", "grinding_force", "surface_finish_predict",
  // -- Wheel Dressing Optimization (0-D-7b: U-PROC2) --
  "wheel_life_predict", "dressing_interval_optimize", "dressing_tool_select", "creep_feed_setup",
] as const;

// Grinding wheel bond/abrasive constants
const WHEEL_GRADES: Record<string, { abrasive: string; bond: string; hardness: string; structure: number }> = {
  aluminum_oxide: { abrasive: "A", bond: "V", hardness: "K", structure: 6 },
  silicon_carbide: { abrasive: "C", bond: "V", hardness: "J", structure: 7 },
  cbn: { abrasive: "B", bond: "V", hardness: "N", structure: 5 },
  diamond: { abrasive: "D", bond: "R", hardness: "N", structure: 4 },
};

/** Registers grinding dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerGrindingDispatcher(server: any): void {
  server.tool(
    "prism_grinding",
    `Grinding Process dispatcher — wheel selection, dressing parameters, burn threshold detection, grinding surface integrity.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_grinding] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation — burn/white-layer prevention
        const validation = validateActionParams(action, params, GRINDING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_grinding"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — blocks unsafe grinding params (white-layer, burn risk)
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "grindingDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        switch (action) {
          case "wheel_select": {
            const material = (params.material ?? "steel").toLowerCase();
            const hardness_hrc = params.hardness_hrc ?? 60;
            const operation = params.operation ?? "surface";
            const finish_Ra = params.target_Ra_um ?? 0.8;
            let wheelType = "aluminum_oxide";
            if (hardness_hrc > 55) wheelType = "cbn";
            if (material.includes("carbide") || material.includes("ceramic")) wheelType = "diamond";
            if (material.includes("cast iron") || material.includes("non-ferrous")) wheelType = "silicon_carbide";
            const spec = WHEEL_GRADES[wheelType];
            const grit = finish_Ra < 0.4 ? 120 : finish_Ra < 0.8 ? 80 : finish_Ra < 1.6 ? 60 : 46;
            result = {
              wheel_specification: `${spec.abrasive}${grit}${spec.hardness}${spec.structure}${spec.bond}`,
              abrasive_type: wheelType,
              grit_size: grit,
              bond_type: spec.bond === "V" ? "vitrified" : "resinoid",
              hardness_grade: spec.hardness,
              recommended_speed_m_s: wheelType === "cbn" ? 60 : wheelType === "diamond" ? 30 : 35,
              operation,
              material,
            };
            break;
          }
          case "dress_params": {
            const wheelDia = params.wheel_diameter_mm ?? 200;
            const dresserType = params.dresser_type ?? "single_point_diamond";
            const depth = params.dress_depth_um ?? (dresserType.includes("rotary") ? 5 : 15);
            const lead = params.dress_lead_mm_rev ?? 0.1;
            const safeLead = Math.max(lead, 0.001); // guard div/0
            const overlapRatio = 1 / safeLead;
            result = {
              dresser_type: dresserType,
              dress_depth_um: depth,
              dress_lead_mm_rev: lead,
              overlap_ratio: Math.round(overlapRatio * 10) / 10,
              passes: params.passes ?? 2,
              wheel_speed_rpm: Math.round((30 * 60) / (Math.PI * wheelDia / 1000)),
              traverse_speed_mm_min: Math.round(lead * result?.wheel_speed_rpm || 300),
              recommendation: overlapRatio > 10 ? "Fine dress — good for finish grinding" : "Open dress — good for stock removal",
            };
            // Fix traverse speed after result is set
            result.traverse_speed_mm_min = Math.round(lead * result.wheel_speed_rpm);
            break;
          }
          case "burn_threshold": {
            const specific_energy = params.specific_energy_J_mm3 ?? 40;
            const stock_removal = params.stock_removal_mm3_s ?? 5;
            const coolant_factor = params.coolant === "none" ? 0.3 : params.coolant === "mist" ? 0.6 : 1.0;
            const power_W = specific_energy * stock_removal;
            const threshold_W = (params.burn_threshold_W ?? 500) * coolant_factor;
            const burnRisk = power_W / threshold_W;
            result = {
              grinding_power_W: Math.round(power_W),
              burn_threshold_W: Math.round(threshold_W),
              burn_risk_ratio: Math.round(burnRisk * 100) / 100,
              burn_likely: burnRisk > 1.0,
              severity: burnRisk > 1.5 ? "high" : burnRisk > 1.0 ? "moderate" : burnRisk > 0.8 ? "marginal" : "safe",
              recommendation: burnRisk > 1.0
                ? "Reduce stock removal rate or improve coolant delivery"
                : "Within safe grinding envelope",
            };
            break;
          }
          case "surface_integrity": {
            const Ra = params.Ra_um ?? 0.4;
            const residual_stress = params.residual_stress_MPa ?? -200; // compressive = negative
            const burn_detected = params.burn_detected ?? false;
            const micro_cracks = params.micro_cracks ?? false;
            result = {
              surface_roughness_Ra_um: Ra,
              residual_stress_MPa: residual_stress,
              stress_type: residual_stress < 0 ? "compressive" : "tensile",
              burn_detected,
              micro_cracks,
              integrity_grade: burn_detected || micro_cracks ? "reject"
                : residual_stress > 0 ? "caution"
                : Ra > 1.6 ? "marginal"
                : "acceptable",
              recommendations: [
                ...(burn_detected ? ["Thermal damage detected — redress wheel, reduce DOC, improve coolant"] : []),
                ...(micro_cracks ? ["Micro-cracks found — reject or regrind with gentler parameters"] : []),
                ...(residual_stress > 0 ? ["Tensile residual stress — consider shot peening or stress relief"] : []),
              ],
            };
            if (result.recommendations.length === 0) result.recommendations.push("Surface integrity acceptable");
            break;
          }
          case "grinding_force": {
            const gfResult = grindingForceEngine.calculate({
              wheel_diameter_mm: params.wheel_diameter_mm ?? 200,
              wheel_speed_m_s: params.wheel_speed_m_s ?? 30,
              work_speed_m_min: params.work_speed_m_min ?? 15,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 0.02,
              width_of_cut_mm: params.width_of_cut_mm ?? 20,
              grinding_mode: (params.grinding_mode ?? "surface") as GrindingMode,
              workpiece_diameter_mm: params.workpiece_diameter_mm,
              material_specific_energy_J_mm3: params.specific_energy_J_mm3,
              workpiece_hardness_hrc: params.hardness_hrc ?? 40,
              coolant_type: (params.coolant_type ?? "flood") as CoolantType,
              grain_density_per_mm2: params.grain_density,
              grain_radius_um: params.grain_radius_um,
            });
            result = gfResult;
            break;
          }
          case "surface_finish_predict": {
            const sfResult = grindingSurfaceFinishEngine.calculate({
              wheel_diameter_mm: params.wheel_diameter_mm ?? 200,
              wheel_speed_m_s: params.wheel_speed_m_s ?? 30,
              work_speed_m_min: params.work_speed_m_min ?? 15,
              depth_of_cut_mm: params.depth_of_cut_mm ?? 0.02,
              width_of_cut_mm: params.width_of_cut_mm ?? 20,
              grinding_mode: (params.grinding_mode ?? "surface") as SFGrindingMode,
              workpiece_diameter_mm: params.workpiece_diameter_mm,
              grain_size_mesh: params.grain_size_mesh ?? 60,
              grain_density_per_mm2: params.grain_density,
              dressing_condition: (params.dressing_condition ?? "medium") as DressingCondition,
              dressing_overlap_ratio: params.dressing_overlap_ratio,
              spark_out_passes: params.spark_out_passes,
              coolant_type: (params.coolant_type ?? "flood") as CoolantType,
              workpiece_hardness_hrc: params.hardness_hrc,
              target_Ra_um: params.target_Ra_um,
            });
            result = sfResult;
            break;
          }
          // ── Grinding Wheel Dressing Optimization (0-D-7b: U-PROC2) ──
          case "wheel_life_predict": {
            const { grindingWheelDressingOptimizationEngine } = await import("../../engines/GrindingWheelDressingOptimizationEngine.js");
            result = grindingWheelDressingOptimizationEngine.predictWheelLife(params as any);
            break;
          }
          case "dressing_interval_optimize": {
            const { grindingWheelDressingOptimizationEngine: gwdIO } = await import("../../engines/GrindingWheelDressingOptimizationEngine.js");
            result = gwdIO.optimizeDressingInterval(params as any);
            break;
          }
          case "dressing_tool_select": {
            const { grindingWheelDressingOptimizationEngine: gwdTS } = await import("../../engines/GrindingWheelDressingOptimizationEngine.js");
            result = gwdTS.selectDressingTool(params as any);
            break;
          }
          case "creep_feed_setup": {
            const { grindingWheelDressingOptimizationEngine: gwdCF } = await import("../../engines/GrindingWheelDressingOptimizationEngine.js");
            result = gwdCF.creepFeedSetup(params as any);
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_grinding] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_grinding");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
