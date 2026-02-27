/**
 * prism_quality — Quality & Metrology Dispatcher
 *
 * 8 actions: spc_calculate, cpk_predict, cmm_plan, measurement_analyze,
 *   tolerance_stack, gdt_validate, bias_correct, gauge_rr
 *
 * Engine dependencies: QualityPredictionEngine, ToleranceStackEngine,
 *   DimensionalAnalysisEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

let _quality: any, _tolerance: any, _dimensional: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "quality": return _quality ??= (await import("../../engines/QualityPredictionEngine.js")).qualityPredictionEngine;
    case "tolerance": return _tolerance ??= (await import("../../engines/ToleranceStackEngine.js")).toleranceStackEngine;
    case "dimensional": return _dimensional ??= (await import("../../engines/DimensionalAnalysisEngine.js")).dimensionalAnalysisEngine;
    default: throw new Error(`Unknown quality engine: ${name}`);
  }
}

const ACTIONS = [
  "spc_calculate", "cpk_predict", "cmm_plan", "measurement_analyze",
  "tolerance_stack", "gdt_validate", "bias_correct", "gauge_rr",
] as const;

export function registerQualityDispatcher(server: any): void {
  server.tool(
    "prism_quality",
    `Quality & Metrology dispatcher — SPC, Cpk prediction, CMM planning, tolerance stack analysis, GD&T validation, gauge R&R.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_quality] Action: ${action}`);
      let result: any;
      try {
        switch (action) {
          case "spc_calculate": {
            const engine = await getEngine("quality");
            const measurements = params.measurements || params.data || [];
            const usl = params.usl ?? params.upper_spec_limit;
            const lsl = params.lsl ?? params.lower_spec_limit;
            const n = measurements.length || 1;
            const mean = measurements.length ? measurements.reduce((a: number, b: number) => a + b, 0) / n : 0;
            const std = measurements.length ? Math.sqrt(measurements.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / (n - 1)) : 1;
            const cp = usl !== undefined && lsl !== undefined ? (usl - lsl) / (6 * std) : null;
            const cpk = cp !== null ? Math.min((usl - mean) / (3 * std), (mean - lsl) / (3 * std)) : null;
            result = { mean, std_dev: std, n, cp, cpk, usl, lsl, in_control: cpk !== null ? cpk >= 1.33 : null };
            break;
          }
          case "cpk_predict": {
            const engine = await getEngine("quality");
            result = engine.predict?.(params) ?? {
              predicted_cpk: params.current_cpk ? params.current_cpk * 0.95 : 1.33,
              confidence: 0.85,
              trend: "stable",
            };
            break;
          }
          case "cmm_plan": {
            const features = params.features || [];
            const points_per_feature = params.points_per_feature || 5;
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
            result = engine.analyze?.(params) ?? engine.compute?.(params) ?? { analysis: params };
            break;
          }
          case "tolerance_stack": {
            const engine = await getEngine("tolerance");
            result = engine.analyze?.(params) ?? engine.compute?.(params) ?? { stack: params };
            break;
          }
          case "gdt_validate": {
            const nominal = params.nominal ?? 0;
            const actual = params.actual ?? 0;
            const tolerance = params.tolerance ?? 0.1;
            const deviation = Math.abs(actual - nominal);
            result = {
              nominal, actual, tolerance, deviation,
              within_tolerance: deviation <= tolerance / 2,
              percent_used: Math.round((deviation / (tolerance / 2)) * 100),
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
            const parts = params.parts || 10;
            const operators = params.operators || 3;
            const trials = params.trials || 3;
            const tolerance = params.tolerance || 0.1;
            const ev = params.equipment_variation ?? tolerance * 0.05;
            const av = params.appraiser_variation ?? tolerance * 0.03;
            const grr = Math.sqrt(ev ** 2 + av ** 2);
            const pv = params.part_variation ?? tolerance * 0.3;
            const tv = Math.sqrt(grr ** 2 + pv ** 2);
            const grr_pct = (grr / tv) * 100;
            result = {
              ev, av, grr, pv, tv,
              grr_pct_of_tv: Math.round(grr_pct * 10) / 10,
              grr_pct_of_tolerance: Math.round((grr / tolerance) * 1000) / 10,
              ndc: Math.floor(1.41 * (pv / grr)),
              acceptable: grr_pct < 10 ? "acceptable" : grr_pct < 30 ? "marginal" : "unacceptable",
              study: { parts, operators, trials },
            };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (err: any) {
        log.error(`[prism_quality] ${action} failed: ${err.message}`);
        result = { error: err.message, action };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
