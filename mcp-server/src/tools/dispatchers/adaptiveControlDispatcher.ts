/**
 * prism_adaptive_control — Adaptive Control & Digital Twin Dispatcher
 *
 * 12 actions: adaptive_feed, adaptive_feed_tune, adaptive_spindle,
 *   adaptive_spindle_stability, adaptive_spindle_chatter, bayesian_calibrate,
 *   bayesian_predict_force, tool_life_predict, tool_life_weibull,
 *   tool_life_replacement, digital_twin_sync, digital_twin_query
 *
 * Engine dependencies: AdaptiveFeedControlEngine, AdaptiveSpindleControlEngine,
 *   BayesianAdaptiveEngine, ToolLifeAdaptiveEngine, DigitalTwinSyncEngine
 * Milestone: SCI-MS1
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ADAPTIVE_CONTROL_ACTION_SCHEMAS } from "../../schemas/adaptiveControlActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _afc: any, _asc: any, _bay: any, _tla: any, _dts: any, _acal: any;
let _adaChat: any, _adaChip: any, _adaOver: any, _adaTherm: any, _adaWear: any;
let _var: any;
let _rtac: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "afc": return _afc ??= (await import("../../engines/AdaptiveFeedControlEngine.js")).adaptiveFeedControlEngine;
    case "asc": return _asc ??= (await import("../../engines/AdaptiveSpindleControlEngine.js")).adaptiveSpindleControlEngine;
    case "bay": return _bay ??= (await import("../../engines/BayesianAdaptiveEngine.js")).bayesianAdaptiveEngine;
    case "tla": return _tla ??= (await import("../../engines/ToolLifeAdaptiveEngine.js")).toolLifeAdaptiveEngine;
    case "dts": return _dts ??= (await import("../../engines/DigitalTwinSyncEngine.js")).digitalTwinSyncEngine;
    case "acal": return _acal ??= (await import("../../engines/AdaptiveCalibrationEngine.js")).adaptiveCalibrationEngine;
    // ENGINE-WIRE-MS0/U-WIRE01: 5 leaf adaptive engines (static-method classes)
    case "adaChat": return _adaChat ??= (await import("../../engines/AdaptiveChatterEngine.js")).AdaptiveChatterEngine;
    case "adaChip": return _adaChip ??= (await import("../../engines/AdaptiveChiploadEngine.js")).AdaptiveChiploadEngine;
    case "adaOver": return _adaOver ??= (await import("../../engines/AdaptiveOverrideEngine.js")).AdaptiveOverrideEngine;
    case "adaTherm": return _adaTherm ??= (await import("../../engines/AdaptiveThermalEngine.js")).AdaptiveThermalEngine;
    case "adaWear": return _adaWear ??= (await import("../../engines/AdaptiveWearEngine.js")).AdaptiveWearEngine;
    // ORPHAN-RESCUE: VariabilityEnvelopeEngine — probabilistic parameter boundaries
    // (stateful singleton — envelopes + outlier buffer persist across calls)
    case "var": return _var ??= (await import("../../engines/VariabilityEnvelopeEngine.js")).variabilityEnvelopeEngine;
    // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-POST: real-time adaptive control orchestrator
    // (stateful singleton — sensor/output history persists across calls)
    case "rtac": return _rtac ??= (await import("../../engines/RealTimeAdaptiveControllerEngine.js")).realTimeAdaptiveControllerEngine;
    default: throw new Error(`Unknown adaptive control engine: ${name}`);
  }
}

const ACTIONS = [
  "adaptive_feed", "adaptive_feed_tune",
  "adaptive_spindle", "adaptive_spindle_stability", "adaptive_spindle_chatter",
  "bayesian_calibrate", "bayesian_predict_force",
  "tool_life_predict", "tool_life_weibull", "tool_life_replacement",
  "digital_twin_sync", "digital_twin_query",
  "calibration_kienzle", "calibration_taylor", "calibration_surface_bias",
  "calibration_drift", "calibration_thermal", "calibration_model_select",
  // ENGINE-WIRE-MS0/U-WIRE01: leaf adaptive primitives
  "adaptive_chatter_analyze", "adaptive_chipload_analyze",
  "adaptive_override_calc", "adaptive_thermal_analyze", "adaptive_wear_analyze",
  // ORPHAN-RESCUE: VariabilityEnvelopeEngine — probabilistic parameter boundaries
  "variability_evaluate", "variability_get_envelope", "variability_set_envelope",
  "variability_expand", "variability_apply_expansion",
  "variability_export", "variability_import", "variability_outliers",
  // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-POST: RealTimeAdaptiveControllerEngine
  "rtac_update", "rtac_state", "rtac_tune", "rtac_targets",
  "rtac_metrics", "rtac_gcode", "rtac_reset",
] as const;

/** Registers adaptive control dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerAdaptiveControlDispatcher(server: any): void {
  server.tool(
    "prism_adaptive_control",
    `Adaptive Control & Digital Twin dispatcher — real-time feed/spindle adaptation, Bayesian force calibration, Weibull tool life prediction, digital twin synchronization.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_adaptive_control] Action: ${action}`);
      let result: any;
      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, ADAPTIVE_CONTROL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_adaptive_control"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "adaptiveControlDispatcher", action, params }
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
          case "adaptive_feed": {
            const eng = await getEngine("afc");
            result = eng.adapt(params);
            break;
          }
          case "adaptive_feed_tune": {
            const eng = await getEngine("afc");
            result = eng.tuneGains(params);
            break;
          }
          case "adaptive_spindle": {
            const eng = await getEngine("asc");
            result = eng.adapt(params);
            break;
          }
          case "adaptive_spindle_stability": {
            const eng = await getEngine("asc");
            result = eng.stabilityLimit(
              params.rpm, params.natural_freq ?? params.naturalFreq,
              params.damping, params.Kc, params.stiffness, params.flutes
            );
            result = { critical_depth: result };
            break;
          }
          case "adaptive_spindle_chatter": {
            const eng = await getEngine("asc");
            result = eng.detectChatter(params.signal, params.sample_rate ?? params.sampleRate, params.rpm, params.flutes);
            break;
          }
          case "bayesian_calibrate": {
            const eng = await getEngine("bay");
            result = eng.calibrate(params);
            break;
          }
          case "bayesian_predict_force": {
            const eng = await getEngine("bay");
            result = { force_N: eng.predictForce(params.kc11, params.mc, params.h_mm, params.b_mm) };
            break;
          }
          case "tool_life_predict": {
            const eng = await getEngine("tla");
            result = eng.predict(params);
            break;
          }
          case "tool_life_weibull": {
            const eng = await getEngine("tla");
            result = eng.weibullMLE(params.times, params.censored);
            break;
          }
          case "tool_life_replacement": {
            const eng = await getEngine("tla");
            result = { optimal_time: eng.optimalReplacement(params.beta, params.eta, params.C_r, params.C_f) };
            break;
          }
          case "digital_twin_sync": {
            const eng = await getEngine("dts");
            result = eng.sync(params);
            break;
          }
          case "digital_twin_query": {
            const eng = await getEngine("dts");
            result = eng.queryForAlgorithm(params.state || {}, params.algorithm);
            break;
          }          case "calibration_kienzle": {
            const eng = await getEngine("acal");
            result = eng.bayesianKienzleUpdate(params);
            break;
          }
          case "calibration_taylor": {
            const eng = await getEngine("acal");
            result = eng.taylorCoefficientTracker(params);
            break;
          }
          case "calibration_surface_bias": {
            const eng = await getEngine("acal");
            result = eng.surfaceFinishBiasCorrector(params);
            break;
          }
          case "calibration_drift": {
            const eng = await getEngine("acal");
            result = eng.processDriftCompensator(params);
            break;
          }
          case "calibration_thermal": {
            const eng = await getEngine("acal");
            result = eng.thermalModelCalibrator(params);
            break;
          }
          case "calibration_model_select": {
            const eng = await getEngine("acal");
            result = eng.modelSelector(params);
            break;
          }
          case "adaptive_chatter_analyze": {
            const Eng = await getEngine("adaChat");
            result = Eng.analyze(params);
            break;
          }
          case "adaptive_chipload_analyze": {
            const Eng = await getEngine("adaChip");
            result = Eng.analyze(params);
            break;
          }
          case "adaptive_override_calc": {
            const Eng = await getEngine("adaOver");
            result = Eng.calculate(params);
            break;
          }
          case "adaptive_thermal_analyze": {
            const Eng = await getEngine("adaTherm");
            result = Eng.analyze(params);
            break;
          }
          case "adaptive_wear_analyze": {
            const Eng = await getEngine("adaWear");
            result = Eng.analyze(params);
            break;
          }
          // ── ORPHAN-RESCUE: VariabilityEnvelopeEngine ──────────────────
          case "variability_evaluate": {
            const eng = await getEngine("var");
            // evaluate() has a side effect on an UNKNOWN parameter — it mints +
            // stores a default envelope. Surface that so a typo'd parameter name
            // doesn't silently pollute the singleton without the caller knowing.
            const created = !eng.getEnvelope(params.parameter);
            result = { ...eng.evaluate(params.parameter, params.value, params.context), created };
            break;
          }
          case "variability_get_envelope": {
            const eng = await getEngine("var");
            const envelope = eng.getEnvelope(params.parameter);
            // slimResponse strips a null envelope — `found` carries the signal regardless.
            result = { parameter: params.parameter, found: !!envelope, envelope: envelope ?? null };
            break;
          }
          case "variability_set_envelope": {
            const eng = await getEngine("var");
            // Force envelope.parameter to match the Map key — otherwise the stored
            // object can self-identify as a different parameter than its key,
            // corrupting exportEnvelopes / downstream consumers.
            eng.setEnvelope(params.parameter, { ...params.envelope, parameter: params.parameter });
            result = { parameter: params.parameter, stored: true, envelope: eng.getEnvelope(params.parameter) };
            break;
          }
          case "variability_expand": {
            const eng = await getEngine("var");
            const proposal = eng.expandEnvelope(params.parameter, params.evidence ?? []);
            // expandEnvelope returns null when there aren't >=3 successful outliers above p999.
            result = { parameter: params.parameter, hasProposal: !!proposal, proposal: proposal ?? null };
            break;
          }
          case "variability_apply_expansion": {
            const eng = await getEngine("var");
            const proposal = params.proposal;
            // applyExpansion silently no-ops if the parameter has no envelope —
            // check first so `applied` is honest (R12: fail loud, don't claim
            // success on a no-op).
            const before = eng.getEnvelope(proposal?.parameter);
            if (!before) {
              result = { parameter: proposal?.parameter, applied: false, reason: "parameter_not_found" };
              break;
            }
            eng.applyExpansion(proposal);
            result = {
              parameter: proposal.parameter,
              applied: true,
              envelope: eng.getEnvelope(proposal.parameter) ?? null,
            };
            break;
          }
          case "variability_export": {
            const eng = await getEngine("var");
            const envelopes = eng.exportEnvelopes();
            result = { envelopes, count: Object.keys(envelopes).length };
            break;
          }
          case "variability_import": {
            const eng = await getEngine("var");
            const data: Record<string, any> = params.data ?? {};
            // Inject the Map key as envelope.parameter so an entry can never
            // self-identify as a different parameter than its key.
            const keyed = Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, { ...(v as Record<string, unknown>), parameter: k }]),
            );
            eng.importEnvelopes(keyed);
            result = { imported: Object.keys(keyed).length, totalEnvelopes: Object.keys(eng.exportEnvelopes()).length };
            break;
          }
          case "variability_outliers": {
            const eng = await getEngine("var");
            // getOutlierBuffer() returns a Map — JSON.stringify would emit {} — so flatten it.
            const buffer = Object.fromEntries(eng.getOutlierBuffer());
            result = { outliers: buffer, parameterCount: Object.keys(buffer).length };
            break;
          }
          // ── FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-POST: RealTimeAdaptiveControllerEngine ──
          // Stateful singleton — update()/reset() mutate sensor + output history.
          case "rtac_update": {
            const eng = await getEngine("rtac");
            // update() returns ControlOutput (feed/speed/coolant overrides + warnings/alarms).
            result = eng.update(params);
            break;
          }
          case "rtac_state": {
            const eng = await getEngine("rtac");
            result = eng.getState();
            break;
          }
          case "rtac_tune": {
            const eng = await getEngine("rtac");
            // setTuning() returns void — merge the partial then echo full effective tuning.
            eng.setTuning(params.tuning ?? {});
            result = { tuning: eng.getTuning() };
            break;
          }
          case "rtac_targets": {
            const eng = await getEngine("rtac");
            // setTargets() returns void — echo the resulting target triple from state.
            eng.setTargets({ chipLoad: params.chipLoad, mrr: params.mrr, power: params.power });
            const st = eng.getState();
            result = {
              targetChipLoad: st.targetChipLoad,
              targetMRR: st.targetMRR,
              targetPower: st.targetPower,
            };
            break;
          }
          case "rtac_metrics": {
            const eng = await getEngine("rtac");
            result = eng.getPerformanceMetrics();
            break;
          }
          case "rtac_gcode": {
            const eng = await getEngine("rtac");
            const lines = eng.generateAdaptiveGCode(params.baseProgram ?? []);
            result = { gcode: lines, lineCount: lines.length };
            break;
          }
          case "rtac_reset": {
            const eng = await getEngine("rtac");
            eng.reset();
            result = { reset: true, mode: eng.getState().mode };
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
          log.warn(`[prism_adaptive_control] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_adaptive_control");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
  log.info("Registered: prism_adaptive_control dispatcher (38 actions)");
}
