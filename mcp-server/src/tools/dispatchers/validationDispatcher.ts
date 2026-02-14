/**
 * Validation Dispatcher - Consolidates 7 validation tools → 1
 * Actions: material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression
 * Safety threshold: S(x) ≥ 0.70, Completeness: ≥ 80%
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import {
  validateKienzle, validateTaylor, validateJohnsonCook,
  computeSafetyScore, checkMaterialCompleteness, checkAntiRegression, validateMaterial,
  KIENZLE_RANGES, TAYLOR_RANGES, SAFETY_THRESHOLD, COMPLETENESS_THRESHOLD
} from "../../utils/validators.js";

const ACTIONS = ["material", "kienzle", "taylor", "johnson_cook", "safety", "completeness", "anti_regression"] as const;

export function registerValidationDispatcher(server: any): void {
  server.tool(
    "prism_validate",
    `Validation dispatcher. Actions: material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression.
Safety threshold S(x)≥0.70. Completeness≥80%. Anti-regression: new_count≥old_count.
Params vary by action - see individual action docs.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_validate] Action: ${action}`);
      let result: any;
      try {
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
            const r = validateKienzle(params.iso_group, params.kc1_1, params.mc);
            result = r;
            break;
          }
          case "taylor": {
            const r = validateTaylor(params.iso_group, params.C, params.n);
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
            const materialData = params.material || (params.density || params.kc1_1 ? params : {});
            const r = computeSafetyScore(materialData);
            result = r;
            break;
          }
          case "completeness": {
            const r = checkMaterialCompleteness(params.material || {}, params.threshold ?? COMPLETENESS_THRESHOLD);
            result = r;
            break;
          }
          case "anti_regression": {
            const r = checkAntiRegression(params.old_content || "", params.new_content || "", params.file_type || "json");
            result = r;
            break;
          }
          default: result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error: any) {
        log.error(`[prism_validate] Error: ${error.message}`);
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message, action }) }], isError: true };
      }
    }
  );
  log.info("✅ Registered: prism_validate dispatcher (7 actions)");
}
