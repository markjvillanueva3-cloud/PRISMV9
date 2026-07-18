/**
 * prism_material_processing — Material Processing Dispatcher
 *
 * 16 actions: anodizing, carburizing, coating thickness, heat treatment,
 *   induction heating, nitriding, quenching, sintering, surface treatment,
 *   autoclave, electrochemical, cryogenic treatment, heat treatment response,
 *   shot peening, electroplating, passivation
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MATERIAL_PROCESSING_ACTION_SCHEMAS } from "../../schemas/materialProcessingActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _anodizing: any, _carburizing: any, _coatingThickness: any, _heatTreat: any;
let _induction: any, _nitriding: any, _quenching: any, _sintering: any;
let _surfTreat: any, _autoclave: any, _electrochem: any;
let _cryoTreat: any, _heatTreatResp: any, _shotPeen: any, _electroplating: any, _passivation: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "anodizing": return _anodizing ??= (await import("../../engines/AnodizingProcessEngine.js")).anodizingProcessEngine;
    case "carburizing": return _carburizing ??= (await import("../../engines/CarburizingEngine.js")).carburizingEngine;
    case "coatingThickness": return _coatingThickness ??= (await import("../../engines/CoatingThicknessEngine.js")).coatingThicknessEngine;
    case "heatTreat": return _heatTreat ??= (await import("../../engines/HeatTreatmentEngine.js")).heatTreatmentEngine;
    case "induction": return _induction ??= (await import("../../engines/InductionHeatingEngine.js")).inductionHeatingEngine;
    case "nitriding": return _nitriding ??= (await import("../../engines/NitridingProcessEngine.js")).nitridingProcessEngine;
    case "quenching": return _quenching ??= (await import("../../engines/QuenchingProcessEngine.js")).quenchingProcessEngine;
    case "sintering": return _sintering ??= (await import("../../engines/SinteringProcessEngine.js")).sinteringProcessEngine;
    case "surfTreat": return _surfTreat ??= (await import("../../engines/SurfaceTreatmentEngine.js")).surfaceTreatmentEngine;
    case "autoclave": return _autoclave ??= (await import("../../engines/AutoclaveProcessEngine.js")).autoclaveProcessEngine;
    case "electrochem": return _electrochem ??= (await import("../../engines/ElectrochemicalEngine.js")).electrochemicalEngine;
    case "cryoTreat": return _cryoTreat ??= (await import("../../engines/CryogenicTreatmentEngine.js")).cryogenicTreatmentEngine;
    case "heatTreatResp": return _heatTreatResp ??= (await import("../../engines/HeatTreatmentResponseEngine.js")).heatTreatmentResponseEngine;
    case "shotPeen": return _shotPeen ??= (await import("../../engines/ShotPeeningEngine.js")).shotPeeningEngine;
    case "electroplating": return _electroplating ??= (await import("../../engines/ElectroPlatingEngine.js")).electroplatingEngine;
    case "passivation": return _passivation ??= (await import("../../engines/PassivationEngine.js")).passivationEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

const ACTIONS = [
  "anodizing_calculate", "carburizing_calculate", "coating_thickness_calculate",
  "heat_treatment_calculate", "induction_heating_calculate", "nitriding_calculate",
  "quenching_calculate", "sintering_calculate", "surface_treatment_calculate",
  "autoclave_calculate", "electrochemical_calculate",
  "cryogenic_treatment_calc", "heat_treatment_response_calc", "shot_peening_calc",
  "electroplating_calc", "passivation_calc",
  // WIRE-COATING-DIRECT-MS0/U-VICTOR-COATING-DIRECT (slot:victor, 2026-05-26)
  // CoatingSelectionEngine.calculate + CoatingSelectionAdapter.selectCoatingOrchestrated
  // — distinct from coating_thickness_calculate (CoatingThicknessEngine, deposit-rate).
  "coating_select", "coating_select_orchestrated",
] as const;

export function registerMaterialProcessingDispatcher(server: any): void {
  server.tool(
    "prism_material_processing",
    `Material processing: anodizing (Type I/II/III), carburizing, coating thickness, heat treatment (anneal/normalize/quench/temper/case harden/age/stress relief), induction heating, nitriding (gas/plasma/salt bath), quenching, sintering, surface treatment, autoclave, electrochemical, cryogenic treatment (deep cryo/shallow cryo), heat treatment response (predict hardness/microstructure), shot peening (Almen intensity/coverage), electroplating (Faraday deposition), passivation (citric/nitric acid).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_material_processing] Action: ${action} (16 actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, MATERIAL_PROCESSING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_material_processing");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "materialProcessingDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const engineMap: Record<string, string> = {
          anodizing_calculate: "anodizing",
          carburizing_calculate: "carburizing",
          coating_thickness_calculate: "coatingThickness",
          heat_treatment_calculate: "heatTreat",
          induction_heating_calculate: "induction",
          nitriding_calculate: "nitriding",
          quenching_calculate: "quenching",
          sintering_calculate: "sintering",
          surface_treatment_calculate: "surfTreat",
          autoclave_calculate: "autoclave",
          electrochemical_calculate: "electrochem",
          cryogenic_treatment_calc: "cryoTreat",
          heat_treatment_response_calc: "heatTreatResp",
          shot_peening_calc: "shotPeen",
          electroplating_calc: "electroplating",
          passivation_calc: "passivation",
        };

        // WIRE-COATING-DIRECT-MS0/U-VICTOR-COATING-DIRECT (2026-05-26) — 2 specialized
        // selection engines BEFORE the engineMap fallthrough (their methods are
        // not named `.calculate/.predict/.compute` so the generic dispatch misses).
        if (action === "coating_select") {
          const { coatingSelectionEngine } = await import("../../engines/CoatingSelectionEngine.js");
          result = coatingSelectionEngine.calculate(params as any);
        } else if (action === "coating_select_orchestrated") {
          const { coatingSelectionAdapter } = await import("../../engines/CoatingSelectionAdapter.js");
          result = coatingSelectionAdapter.selectCoatingOrchestrated(params as any);
        } else {
          const engineKey = engineMap[action];
          const eng = await getEngine(engineKey);
          result = eng.calculate?.(params) ?? eng.predict?.(params) ?? eng.compute?.(params) ?? { error: `${engineKey} method not found` };
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_material_processing] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_material_processing");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
