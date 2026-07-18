/**
 * prism_feasibility — Machining Feasibility Intelligence Dispatcher
 *
 * 16 actions across MF-MS0 + MF-MS1:
 *   feasibility_init, feasibility_apply_op, feasibility_simulate,
 *   feasibility_walls, feasibility_surfaces, feasibility_datums,
 *   accessibility_check, accessibility_find_tools, accessibility_report,
 *   workholding_check, workholding_track, workholding_suggest,
 *   rigidity_check, rigidity_critical, rigidity_support,
 *   material_stiffness_lookup
 *
 * Engine dependencies: WorkpieceStateEngine, AccessibilityAnalysisEngine,
 *   WorkholdingViabilityEngine, RigidityDegradationEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import {
  dispatcherError,
  validateActionParams
} from "../../utils/dispatcherMiddleware.js";
import { ACTION_FEASIBILITY_SCHEMAS } from "../../schemas/feasibilityActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

const ACTIONS = [
  "feasibility_init", "feasibility_apply_op", "feasibility_simulate",
  "feasibility_walls", "feasibility_surfaces", "feasibility_datums",
  "accessibility_check", "accessibility_find_tools", "accessibility_report",
  "workholding_check", "workholding_track", "workholding_suggest",
  "rigidity_check", "rigidity_critical", "rigidity_support",
  "material_stiffness_lookup",
  "sequence_simulate", "sequence_dead_ends", "sequence_reorder",
  "sequence_risk_score", "sequence_what_if",
  "setup_transition_analyze", "setup_tolerance_stack",
  "orchestrator_full", "orchestrator_quick", "orchestrator_what_if",
  "predictive_failure", "critical_path"
] as const;

let _wse: any, _access: any, _workhold: any, _rigid: any, _matDB: any, _seqFeas: any, _setup: any, _orch: any, _feasAnalysis: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "wse":
      return _wse ??= new (await import("../../engines/WorkpieceStateEngine.js")).WorkpieceStateEngine();
    case "access":
      return _access ??= (await import("../../engines/AccessibilityAnalysisEngine.js")).accessibilityAnalysisEngine;
    case "workhold":
      return _workhold ??= (await import("../../engines/WorkholdingViabilityEngine.js")).workholdingViabilityEngine;
    case "rigid":
      return _rigid ??= (await import("../../engines/RigidityDegradationEngine.js")).rigidityDegradationEngine;
    case "matDB":
      return _matDB ??= (await import("../../engines/RigidityDegradationEngine.js")).MATERIAL_STIFFNESS;
    case "seqFeas":
      return _seqFeas ??= (await import("../../engines/SequenceFeasibilityEngine.js")).sequenceFeasibilityEngine;
    case "setup":
      return _setup ??= (await import("../../engines/SetupTransitionEngine.js")).setupTransitionEngine;
    case "orch":
      return _orch ??= (await import("../../engines/FeasibilityOrchestratorEngine.js")).feasibilityOrchestratorEngine;
    case "feasAnalysis":
      return _feasAnalysis ??= (await import("../../engines/FeasibilityAnalysisEngine.js")).feasibilityAnalysisEngine;
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

export function registerFeasibilityDispatcher(server: any): void {
  server.tool(
    "prism_feasibility",
    `Machining feasibility intelligence: workpiece state tracking, IPW evolution, accessibility analysis (tool reach, holder collision), workholding viability (grip force, vacuum seal, moment balance), rigidity degradation (deflection, chatter, natural frequency). 16 actions.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_feasibility] Action: ${action} (16 actions wired)`);
      const startMs = Date.now();

      try {
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        const validation = validateActionParams(action, params, ACTION_FEASIBILITY_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_feasibility"
          );
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "feasibilityDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action
            }) }]
          };
        }

        let result: any;

        switch (action) {
          // ── MF-MS0: WorkpieceStateEngine ──
          case "feasibility_init": {
            const wse = await getEngine("wse");
            result = wse.initialize(params.stock);
            break;
          }
          case "feasibility_apply_op": {
            const wse = await getEngine("wse");
            const state = JSON.parse(params.state_json as string);
            result = wse.applyOperation(state, params.operation);
            break;
          }
          case "feasibility_simulate": {
            const wse = await getEngine("wse");
            result = wse.simulateSequence(params.stock, params.operations);
            break;
          }
          case "feasibility_walls": {
            const wse = await getEngine("wse");
            const state = JSON.parse(params.state_json as string);
            result = wse.getMinWallThickness(state);
            break;
          }
          case "feasibility_surfaces": {
            const wse = await getEngine("wse");
            const state = JSON.parse(params.state_json as string);
            result = wse.getSurfaces(state);
            break;
          }
          case "feasibility_datums": {
            const wse = await getEngine("wse");
            const state = JSON.parse(params.state_json as string);
            result = wse.checkDatumIntegrity(state);
            break;
          }

          // ── MF-MS1: AccessibilityAnalysisEngine ──
          case "accessibility_check": {
            const access = await getEngine("access");
            const state = JSON.parse(params.state_json as string);
            result = access.checkAccess(params.operation, params.tool, state, params.config);
            break;
          }
          case "accessibility_find_tools": {
            const access = await getEngine("access");
            const state = JSON.parse(params.state_json as string);
            result = access.findReachableTools(params.operation, state, params.tool_catalog, params.config);
            break;
          }
          case "accessibility_report": {
            const access = await getEngine("access");
            const state = JSON.parse(params.state_json as string);
            result = access.checkAllFeaturesIPW(state, params.assignments, params.config);
            break;
          }

          // ── MF-MS1: WorkholdingViabilityEngine ──
          case "workholding_check": {
            const wh = await getEngine("workhold");
            const state = JSON.parse(params.state_json as string);
            result = wh.checkViability(state, params.operation, params.fixture, params.cutting_force_N);
            break;
          }
          case "workholding_track": {
            const wh = await getEngine("workhold");
            const state = JSON.parse(params.state_json as string);
            result = wh.trackSurfaces(state);
            break;
          }
          case "workholding_suggest": {
            const wh = await getEngine("workhold");
            const state = JSON.parse(params.state_json as string);
            result = wh.suggestFixturing(state, params.remaining_ops ?? []);
            break;
          }

          // ── MF-MS1: RigidityDegradationEngine ──
          case "rigidity_check": {
            const rig = await getEngine("rigid");
            const matDB = await getEngine("matDB");
            const state = JSON.parse(params.state_json as string);
            const mat = matDB[params.material as string] ?? matDB["6061-T6"];
            result = rig.checkRigidity(
              state, params.operation, mat,
              params.cutting_force_N, params.spindle_rpm, params.flutes
            );
            break;
          }
          case "rigidity_critical": {
            const rig = await getEngine("rigid");
            const matDB = await getEngine("matDB");
            const state = JSON.parse(params.state_json as string);
            const mat = matDB[params.material as string] ?? matDB["6061-T6"];
            result = rig.findCriticalFeatures(state, mat, params.cutting_force_N);
            break;
          }
          case "rigidity_support": {
            const rig = await getEngine("rigid");
            const matDB = await getEngine("matDB");
            const mat = matDB[params.material as string] ?? matDB["6061-T6"];
            result = rig.recommendSupport(params.wall, mat);
            break;
          }

          // ── Utility ──
          case "material_stiffness_lookup": {
            const matDB = await getEngine("matDB");
            const name = params.material as string;
            if (name && matDB[name]) {
              result = { material: name, ...matDB[name] };
            } else {
              result = { available: Object.keys(matDB), hint: "Pass material name" };
            }
            break;
          }

          // ── MF-MS2: SequenceFeasibilityEngine ──
          case "sequence_simulate": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_simulate", params);
            break;
          }
          case "sequence_dead_ends": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_detect_deadends", params);
            break;
          }
          case "sequence_reorder": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_resequence", params);
            break;
          }
          case "sequence_risk_score": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_constraint_graph", params);
            break;
          }
          case "sequence_what_if": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_simulate", params);
            break;
          }

          // ── MF-MS3: SetupTransitionEngine ──
          case "setup_transition_analyze": {
            const setup = await getEngine("setup");
            result = setup.calculate("setup_transition_analyze", params);
            break;
          }
          case "setup_tolerance_stack": {
            const setup = await getEngine("setup");
            result = setup.calculate("setup_transition_analyze", params);
            break;
          }

          // ── MF-MS4: FeasibilityOrchestratorEngine ──
          case "orchestrator_full": {
            const orch = await getEngine("orch");
            result = await orch.fullAnalysis(params.job ?? params);
            break;
          }
          case "orchestrator_quick": {
            const orch = await getEngine("orch");
            result = await orch.quickCheck(params.job ?? params);
            break;
          }
          case "orchestrator_what_if": {
            const orch = await getEngine("orch");
            result = await orch.whatIf(params.job ?? params, params.change_op_index);
            break;
          }

          // ── MF Spec: Missing actions ──
          case "predictive_failure": {
            const fa = await getEngine("feasAnalysis");
            // FeasibilityAnalysisEngine has no analyze() method. The unified entry point
            // is calculate(input: FeasibilityInput) which routes by input.action discriminator
            // ("analyzeAccessibility" | "analyzeWorkholding" | "analyzeRigidity").
            // The auditor found analyze() missing; this guard prevented a runtime crash
            // but silently returned { error: "analyze not available" } on every call.
            result = fa.calculate ? fa.calculate(params) : { error: "FeasibilityAnalysisEngine.calculate not available" };
            break;
          }
          case "critical_path": {
            const sf = await getEngine("seqFeas");
            result = sf.calculate("sequence_constraint_graph", params);
            break;
          }

          default:
            return dispatcherError(
              `Unknown feasibility action: ${action}`,
              action, "prism_feasibility"
            );
        }

        const elapsed = Date.now() - startMs;
        log.info(`[prism_feasibility] ${action} completed in ${elapsed}ms`);
        return slimResponse({ action, result, elapsed_ms: elapsed });

      } catch (err: any) {
        log.error(`[prism_feasibility] Error: ${err.message}`);
        return dispatcherError(err.message, action, "prism_feasibility");
      }
    }
  );
}
