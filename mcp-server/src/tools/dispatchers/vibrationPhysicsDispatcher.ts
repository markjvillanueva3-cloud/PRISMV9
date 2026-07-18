/**
 * prism_vibration_physics — Vibration, Dynamics & Cutting Physics Dispatcher
 *
 * 20 actions: vibration-assisted machining, vibration dampening, isolation,
 *   Fourier analysis, wavelet analysis, regenerative chatter, chatter-stable
 *   RPM recommendation (9-axis SLD), burr formation, chip conveyor, cutter
 *   contact, tribology, surface finish, surface grinding, centerless grinding,
 *   grinding wheel, post-processor generation, tap drill, adaptive feed (×3)
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { VIBRATION_ACTION_SCHEMAS } from "../../schemas/vibrationActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _vam: any, _dampening: any, _isolation: any, _fourier: any;
let _wavelet: any, _chatter: any, _burr: any, _chipConveyor: any;
let _cutterContact: any, _tribology: any, _surfFinish: any, _surfGrinding: any;
let _centerlessGrinding: any, _grindingWheel: any, _postProc: any, _tapDrill: any;
let _adaptiveFeed: any;
let _chatterSF: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "vam": return _vam ??= (await import("../../engines/VibrationAssistedMachiningEngine.js")).vibrationAssistedMachiningEngine;
    case "dampening": return _dampening ??= (await import("../../engines/VibrationDampeningEngine.js")).vibrationDampeningEngine;
    case "isolation": return _isolation ??= (await import("../../engines/VibrationIsolationEngine.js")).vibrationIsolationEngine;
    case "fourier": return _fourier ??= (await import("../../engines/FourierAnalysisEngine.js")).fourierAnalysisEngine;
    case "wavelet": return _wavelet ??= (await import("../../engines/WaveletAnalysisEngine.js")).waveletAnalysisEngine;
    case "chatter": return _chatter ??= (await import("../../engines/RegenerativeChatterPredictor.js")).regenerativeChatterPredictor;
    case "burr": return _burr ??= (await import("../../engines/BurrFormationEngine.js")).burrFormationEngine;
    case "chipConveyor": return _chipConveyor ??= (await import("../../engines/ChipConveyorEngine.js")).chipConveyorEngine;
    case "cutterContact": return _cutterContact ??= (await import("../../engines/CutterContactEngine.js")).cutterContactEngine;
    case "tribology": return _tribology ??= (await import("../../engines/TribologyEngine.js")).tribologyEngine;
    case "surfFinish": return _surfFinish ??= (await import("../../engines/SurfaceFinishEngine.js")).surfaceFinishEngine;
    case "surfGrinding": return _surfGrinding ??= (await import("../../engines/SurfaceGrindingEngine.js")).surfaceGrindingEngine;
    case "centerlessGrinding": return _centerlessGrinding ??= (await import("../../engines/CenterlessGrindingEngine.js")).centerlessGrindingEngine;
    case "grindingWheel": return _grindingWheel ??= (await import("../../engines/GrindingWheelEngine.js")).grindingWheelEngine;
    case "postProc": return _postProc ??= (await import("../../engines/PostProcessorGeneratorEngine.js")).postProcessorGeneratorEngine;
    case "tapDrill": return _tapDrill ??= (await import("../../engines/TapDrillEngine.js")).tapDrillEngine;
    case "adaptiveFeed": return _adaptiveFeed ??= (await import("../../engines/AdaptiveFeedModulationEngine.js")).adaptiveFeedModulationEngine;
    case "chatterSF": return _chatterSF ??= (await import("../../engines/SpeedFeedChatterStabilityAdapterEngine.js")).speedFeedChatterStabilityAdapterEngine;
    default: throw new Error(`Unknown engine: ${name}`);
  }
}

// WIRE-EXEMPT: Uses engineMap + if/else pattern instead of switch/case for 20 actions.
// All actions handled via engineMap lookup (line 87) and method dispatch (lines 103-120).
const ACTIONS = [
  "vam_calculate", "vibration_dampening_calculate", "vibration_isolation_calculate",
  "fourier_analysis", "wavelet_analysis", "regenerative_chatter_predict",
  "chatter_stable_rpm_recommend",
  "burr_formation_calculate", "chip_conveyor_calculate",
  "cutter_contact_calculate", "tribology_calculate",
  "surface_finish_calculate", "surface_grinding_calculate",
  "centerless_grinding_calculate", "grinding_wheel_calculate",
  "post_processor_generate", "tap_drill_calculate",
  "adaptive_feed_modulate", "adaptive_feed_update_tool", "adaptive_feed_get_tool",
] as const;

export function registerVibrationPhysicsDispatcher(server: any): void {
  server.tool(
    "prism_vibration_physics",
    `Vibration, dynamics & cutting physics: VAM, vibration dampening/isolation, Fourier/wavelet analysis, regenerative chatter prediction, burr formation, chip conveyor sizing, cutter contact analysis, tribology, surface finish prediction, surface/centerless grinding, grinding wheel selection, post-processor generation, tap drill calculation.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_vibration_physics] Action: ${action} (${ACTIONS.length} actions wired)`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, VIBRATION_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_vibration_physics");
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "vibrationPhysicsDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return { content: [{ type: "text", text: JSON.stringify({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action }) }] };
        }

        const engineMap: Record<string, string> = {
          vam_calculate: "vam", vibration_dampening_calculate: "dampening",
          vibration_isolation_calculate: "isolation", fourier_analysis: "fourier",
          wavelet_analysis: "wavelet", regenerative_chatter_predict: "chatter",
          burr_formation_calculate: "burr", chip_conveyor_calculate: "chipConveyor",
          cutter_contact_calculate: "cutterContact", tribology_calculate: "tribology",
          surface_finish_calculate: "surfFinish", surface_grinding_calculate: "surfGrinding",
          centerless_grinding_calculate: "centerlessGrinding", grinding_wheel_calculate: "grindingWheel",
          post_processor_generate: "postProc", tap_drill_calculate: "tapDrill",
          adaptive_feed_modulate: "adaptiveFeed", adaptive_feed_update_tool: "adaptiveFeed",
          adaptive_feed_get_tool: "adaptiveFeed",
          chatter_stable_rpm_recommend: "chatterSF",
        };

        const engineKey = engineMap[action];
        const eng = await getEngine(engineKey);

        if (action === "post_processor_generate") {
          result = eng.generate?.(params) ?? eng.calculate?.(params) ?? { error: "PostProcessorGenerator method not found" };
        } else if (action === "regenerative_chatter_predict") {
          result = eng.predict?.(params) ?? eng.calculate?.(params) ?? { error: "RegenerativeChatterPredictor method not found" };
        } else if (action === "chatter_stable_rpm_recommend") {
          // 9-axis stable-RPM recommender (holder/stickout/material → stability-lobe peak).
          // Accepts the NineAxisInput nested under `input`, or the flat record itself.
          // nominalRpm is read from the TOP level (sibling of `input`) — pass it
          // alongside `input`, not inside it (the engine ignores a nested nominalRpm).
          const input = (params.input ?? params) as Record<string, any>;
          result = eng.recommend?.(input, params.nominalRpm as number | undefined)
            ?? { error: "SpeedFeedChatterStabilityAdapter.recommend method not found" };
        } else if (action === "fourier_analysis") {
          result = eng.analyze?.(params) ?? eng.calculate?.(params) ?? { error: "FourierAnalysis method not found" };
        } else if (action === "wavelet_analysis") {
          result = eng.analyze?.(params) ?? eng.calculate?.(params) ?? { error: "WaveletAnalysis method not found" };
        } else if (action === "adaptive_feed_modulate") {
          const engagement = params.engagement ?? {};
          result = eng.modulateFeed?.(engagement, params.baseFeedrate ?? 1000, params.toolId ?? "default", params.config);
        } else if (action === "adaptive_feed_update_tool") {
          eng.updateToolState?.({ toolId: params.toolId, currentWearPercent: params.currentWearPercent, cuttingTimeMinutes: params.cuttingTimeMinutes });
          result = { success: true, toolId: params.toolId };
        } else if (action === "adaptive_feed_get_tool") {
          result = eng.getCumulativeToolState?.(params.toolId) ?? { error: "Tool not found" };
        } else {
          result = eng.calculate?.(params) ?? eng.compute?.(params) ?? { error: `${engineKey} method not found` };
        }

        try {
          await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } });
        } catch (postErr) {
          log.warn(`[prism_vibration_physics] Post-hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_vibration_physics");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
