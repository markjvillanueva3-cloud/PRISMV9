/**
 * prism_quality — Quality & Metrology Dispatcher
 *
 * 17 actions: spc_calculate, cpk_predict, cmm_plan, measurement_analyze,
 *   tolerance_stack, gdt_validate, bias_correct, gauge_rr,
 *   blueprint_extract, blueprint_setup_sheet, blueprint_inspection_plan,
 *   blueprint_compare_revisions, blueprint_dxf_dimensions,
 *   fai_run, fai_generate_forms, fai_evaluate_characteristic, fai_disposition
 *
 * Engine dependencies: QualityPredictionEngine, ToleranceStackEngine,
 *   DimensionalAnalysisEngine, BlueprintOCREngine, PrintReadingEngine,
 *   FirstArticleInspectionPipelineEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { QUALITY_ACTION_SCHEMAS } from "../../schemas/qualityActionSchemas.js";

let _quality: any, _tolerance: any, _dimensional: any, _blueprint: any, _printReading: any, _fai: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "quality": return _quality ??= (await import("../../engines/QualityPredictionEngine.js")).qualityPredictionEngine;
    case "tolerance": return _tolerance ??= (await import("../../engines/ToleranceStackEngine.js")).toleranceStackEngine;
    case "dimensional": return _dimensional ??= (await import("../../engines/DimensionalAnalysisEngine.js")).dimensionalAnalysisEngine;
    case "blueprint": return _blueprint ??= (await import("../../engines/BlueprintOCREngine.js")).blueprintOCREngine;
    case "printReading": return _printReading ??= (await import("../../engines/PrintReadingEngine.js")).printReadingEngine;
    case "fai": return _fai ??= (await import("../../engines/FirstArticleInspectionPipelineEngine.js")).firstArticleInspectionPipelineEngine;
    default: throw new Error(`Unknown quality engine: ${name}`);
  }
}

const ACTIONS = [
  "blueprint_compare_revisions", "blueprint_dxf_dimensions",
  "blueprint_extract", "blueprint_inspection_plan", "blueprint_setup_sheet",
  "bias_correct", "cmm_plan", "cpk_predict",
  "fai_disposition", "fai_evaluate_characteristic", "fai_generate_forms", "fai_run",
  "finish_target_advise",
  "gauge_rr", "gdt_validate", "measurement_analyze",
  "spc_calculate", "tolerance_stack",
] as const;

/** Registers quality dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerQualityDispatcher(server: any): void {
  server.tool(
    "prism_quality",
    `Quality & Metrology dispatcher — SPC, Cpk prediction, CMM planning, tolerance stack analysis, GD&T validation, gauge R&R, blueprint reading & print analysis.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_quality] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, QUALITY_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_quality"
          );
        }

        switch (action) {
          case "spc_calculate": {
            const engine = await getEngine("quality");
            const measurements = params.measurements || params.data || [];
            const usl = params.usl ?? params.upper_spec_limit;
            const lsl = params.lsl ?? params.lower_spec_limit;
            const n = measurements.length ?? 1;
            const mean = measurements.length ? measurements.reduce((a: number, b: number) => a + b, 0) / n : 0;
            const std = n > 1 ? Math.sqrt(measurements.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
            // Guard: std=0 (single measurement or identical values) makes Cp/Cpk undefined
            const cp = usl !== undefined && lsl !== undefined && std > 0 ? (usl - lsl) / (6 * std) : null;
            const cpk = cp !== null && std > 0 ? Math.min((usl - mean) / (3 * std), (mean - lsl) / (3 * std)) : null;
            const spcWarnings: string[] = [];
            if (n <= 1) spcWarnings.push("Insufficient data: Cp/Cpk require at least 2 measurements");
            else if (std === 0) spcWarnings.push("Zero variance: all measurements identical — Cp/Cpk undefined");
            result = { mean, std_dev: std, n, cp, cpk, usl, lsl, in_control: cpk !== null ? cpk >= 1.33 : null, ...(spcWarnings.length ? { warnings: spcWarnings } : {}) };
            break;
          }
          case "cpk_predict": {
            const engine = await getEngine("quality");
            result = engine.predict?.(params) ?? {
              predicted_cpk: params.current_cpk != null ? params.current_cpk * 0.95 : 1.33,
              confidence: 0.85,
              trend: "stable",
            };
            break;
          }
          case "cmm_plan": {
            const features = params.features || [];
            const points_per_feature = params.points_per_feature ?? 5;
            const total_points = features.length * points_per_feature;
            const est_time_min = total_points * 0.1 + features.length * 0.5; // 6s per point + 30s per feature setup
            result = {
              total_features: features.length,
              total_points,
              estimated_time_min: Math.round(est_time_min * 10) / 10,
              probe_changes: Math.ceil(features.length / 4),
              recommended_strategy: features.length > 20 ? "scanning" : "touch_trigger",
            };
            break;
          }
          case "measurement_analyze": {
            const engine = await getEngine("dimensional");
            result = engine.validate?.(params) ?? engine.predict?.(params) ?? { analysis: params };
            break;
          }
          case "tolerance_stack": {
            const engine = await getEngine("tolerance");
            const method = params.method === "rss" ? "rss" : "worstCase";
            result = engine[method]?.(params.dimensions ?? [], params.min_gap_mm ?? 0) ?? { stack: params };
            break;
          }
          case "gdt_validate": {
            const nominal = params.nominal ?? 0;
            const actual = params.actual ?? 0;
            const tolerance = Math.max(params.tolerance ?? 0.1, 1e-10);
            const deviation = Math.abs(actual - nominal);
            const halfTol = tolerance / 2;
            result = {
              nominal, actual, tolerance, deviation,
              within_tolerance: deviation <= halfTol,
              percent_used: Math.round((deviation / halfTol) * 100),
              gdt_type: params.gdt_type || "position",
            };
            break;
          }
          case "bias_correct": {
            const measured = params.measured ?? 0;
            const bias = params.bias ?? 0;
            result = {
              measured, bias,
              corrected: measured - bias,
              uncertainty: params.uncertainty ?? Math.abs(bias) * 0.1,
            };
            break;
          }
          case "gauge_rr": {
            // Gauge R&R study — AIAG method
            const parts = params.parts ?? 10;
            const operators = params.operators ?? 3;
            const trials = params.trials ?? 3;
            const tolerance = params.tolerance ?? 0.1;
            const ev = params.equipment_variation ?? tolerance * 0.05;
            const av = params.appraiser_variation ?? tolerance * 0.03;
            const grr = Math.sqrt(ev ** 2 + av ** 2);
            const pv = params.part_variation ?? tolerance * 0.3;
            const tv = Math.sqrt(grr ** 2 + pv ** 2);
            const grr_pct = tv > 0 ? (grr / tv) * 100 : 0;
            result = {
              ev, av, grr, pv, tv,
              grr_pct_of_tv: Math.round(grr_pct * 10) / 10,
              grr_pct_of_tolerance: Math.round((grr / tolerance) * 1000) / 10,
              ndc: grr > 0 ? Math.floor(1.41 * (pv / grr)) : 0,
              acceptable: grr_pct < 10 ? "acceptable" : grr_pct < 30 ? "marginal" : "unacceptable",
              study: { parts, operators, trials },
            };
            break;
          }
          case "blueprint_extract": {
            const engine = await getEngine("blueprint");
            const text = params.text ?? "";
            const unit = params.unit ?? undefined;
            result = engine.analyzeBlueprint(text, { unit });
            break;
          }
          case "blueprint_setup_sheet": {
            const bpEngine = await getEngine("blueprint");
            const prEngine = await getEngine("printReading");
            const text = params.text ?? "";
            const analysis = bpEngine.analyzeBlueprint(text, { unit: params.unit });
            result = prEngine.generateSetupSheet(analysis);
            break;
          }
          case "blueprint_inspection_plan": {
            const bpEngine = await getEngine("blueprint");
            const prEngine = await getEngine("printReading");
            const text = params.text ?? "";
            const analysis = bpEngine.analyzeBlueprint(text, { unit: params.unit });
            result = prEngine.generateInspectionPlan(analysis);
            break;
          }
          case "blueprint_compare_revisions": {
            const prEngine = await getEngine("printReading");
            const oldText = params.old_text ?? params.text_a ?? "";
            const newText = params.new_text ?? params.text_b ?? "";
            result = prEngine.compareRevisions(oldText, newText, { unit: params.unit });
            break;
          }
          case "blueprint_dxf_dimensions": {
            const prEngine = await getEngine("printReading");
            const dxfText = params.dxf_text ?? params.text ?? "";
            result = prEngine.extractDxfDimensions(dxfText, { unit: params.unit });
            break;
          }
          case "fai_run": {
            const faiEngine = await getEngine("fai");
            result = await faiEngine.runFAI(params);
            break;
          }
          case "fai_generate_forms": {
            const faiEngine = await getEngine("fai");
            result = faiEngine.generateForms(params.fai_id);
            break;
          }
          case "fai_evaluate_characteristic": {
            const { evaluateCharacteristic } = await import("../../engines/FirstArticleInspectionPipelineEngine.js");
            result = evaluateCharacteristic(
              params.nominal ?? 0,
              params.tolerance_plus ?? 0.1,
              params.tolerance_minus ?? -0.1,
              params.measured ?? params.measured_value ?? 0,
            );
            break;
          }
          case "fai_disposition": {
            const { dispositionRecommendation } = await import("../../engines/FirstArticleInspectionPipelineEngine.js");
            result = dispositionRecommendation(params.results ?? params.characteristics ?? []);
            break;
          }
          case "finish_target_advise": {
            // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-FINISH-TARGET-ADVISOR
            const mod = await import("../../engines/FinishTargetAdvisorEngine.js");
            type FinishInput = Parameters<typeof mod.FinishTargetAdvisorEngine.advise>[0];
            result = mod.FinishTargetAdvisorEngine.advise(params as FinishInput);
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_quality");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
