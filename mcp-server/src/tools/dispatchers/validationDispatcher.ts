/**
 * Validation Dispatcher - Consolidates 13 validation tools → 1
 * Actions: material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression,
 *   prediction_validate, calibration_run, benchmark_run, benchmark_list,
 *   uncertainty_quantify, improvement_run
 * Safety threshold: S(x) ≥ 0.70, Completeness: ≥ 80%
 * SCI-MS2: Scientific validation engines added
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_VALIDATION_SCHEMAS } from "../../schemas/validationActionSchemas.js";
import { SCI_VALIDATION_ACTION_SCHEMAS } from "../../schemas/sciValidationActionSchemas.js";
import { eventBus, EventTypes } from "../../engines/EventBus.js";
import {
  validateKienzle, validateTaylor, validateJohnsonCook,
  computeSafetyScore, checkMaterialCompleteness, checkAntiRegression, validateMaterial,
  KIENZLE_RANGES, TAYLOR_RANGES, SAFETY_THRESHOLD, COMPLETENESS_THRESHOLD
} from "../../utils/validators.js";

let _predVal: any, _calib: any, _bench: any, _uq: any, _ci: any;
async function getSciEngine(name: string): Promise<any> {
  switch (name) {
    case "predVal": return _predVal ??= (await import("../../engines/PredictionValidationEngine.js")).predictionValidationEngine;
    case "calib": return _calib ??= (await import("../../engines/CalibrationEngine.js")).calibrationEngine;
    case "bench": return _bench ??= (await import("../../engines/BenchmarkSuiteEngine.js")).benchmarkSuiteEngine;
    case "uq": return _uq ??= (await import("../../engines/UncertaintyQuantificationEngine.js")).uncertaintyQuantificationEngine;
    case "ci": return _ci ??= (await import("../../engines/ContinuousImprovementEngine.js")).continuousImprovementEngine;
    default: throw new Error(`Unknown sci validation engine: ${name}`);
  }
}

const MERGED_SCHEMAS: Record<string, any> = { ...ACTION_VALIDATION_SCHEMAS, ...SCI_VALIDATION_ACTION_SCHEMAS };

const ACTIONS = [
  "material", "kienzle", "taylor", "johnson_cook", "safety", "completeness", "anti_regression",
  "prediction_validate", "calibration_run", "benchmark_run", "benchmark_list",
  "uncertainty_quantify", "improvement_run",
] as const;

/** Registers validation dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerValidationDispatcher(server: any): void {
  server.tool(
    "prism_validate",
    `Validation dispatcher. Actions: material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression, prediction_validate, calibration_run, benchmark_run, benchmark_list, uncertainty_quantify, improvement_run.
Safety threshold S(x)≥0.70. Completeness≥80%. Anti-regression: new_count≥old_count. SCI-MS2: prediction validation, calibration, benchmarking, uncertainty quantification, continuous improvement.
Params vary by action - see individual action docs.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_validate] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        const validation = validateActionParams(action, params, MERGED_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_validate"
          );
        }
        switch (action) {
          case "material": {
            const mat = params.material || {};
            const r = validateMaterial(mat);
            const summary = r.valid
              ? `✅ Material VALID: S(x)=${r.safety.score.toFixed(3)}, Coverage=${(r.completeness.percentage * 100).toFixed(1)}%`
              : `❌ Material INVALID: S(x)=${r.safety.score.toFixed(3)}, Coverage=${(r.completeness.percentage * 100).toFixed(1)}%`;
            result = { valid: r.valid, safety: r.safety, completeness: r.completeness, issues: r.issues, summary };
            break;
          }
          case "kienzle": {
            const r = validateKienzle(params.kc1_1, params.mc, params.iso_group);
            result = r;
            break;
          }
          case "taylor": {
            const r = validateTaylor(params.C, params.n, params.iso_group);
            result = r;
            break;
          }
          case "johnson_cook": {
            const r = validateJohnsonCook(params.A, params.B, params.n, params.C, params.m, params.yield_strength, params.tensile_strength);
            result = r;
            break;
          }
          case "safety": {
            // Accept either params.material (wrapped) or flat params
            const materialData = params.material ?? ((params.density != null || params.kc1_1 != null) ? params : {});
            const r = computeSafetyScore(materialData);
            result = r;
            break;
          }
          case "completeness": {
            const r = checkMaterialCompleteness(params.material || {});
            result = r;
            break;
          }
          case "anti_regression": {
            const r = checkAntiRegression(params.old_content || "", params.new_content || "", params.file_type || "json");
            result = r;
            break;
          }
          case "prediction_validate": {
            const eng = await getSciEngine("predVal");
            result = eng.validate(params);
            break;
          }
          case "calibration_run": {
            const eng = await getSciEngine("calib");
            result = eng.calibrate(params);
            break;
          }
          case "benchmark_run": {
            const eng = await getSciEngine("bench");
            result = eng.run(params);
            break;
          }
          case "benchmark_list": {
            const eng = await getSciEngine("bench");
            result = eng.getScenarios(params.category);
            break;
          }
          case "uncertainty_quantify": {
            const eng = await getSciEngine("uq");
            result = eng.quantify(params);
            break;
          }
          case "improvement_run": {
            const eng = await getSciEngine("ci");
            result = eng.improve(params);
            break;
          }
          default: result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        log.error(`[prism_validate] Error: ${error.message}`);
        // MS4: Emit validation error event
        try {
          eventBus.publish(EventTypes.DATA_VALIDATION_ERROR, {
            action, error: error?.message?.slice(0, 200),
          }, { category: "data", priority: "high", source: "validationDispatcher" });
        } catch { /* best-effort */ }
        return dispatcherError(error, action, "prism_validate");
      }
    }
  );
  log.info("Registered: prism_validate dispatcher (13 actions)");
}
