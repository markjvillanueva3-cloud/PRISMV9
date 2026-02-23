/**
 * PRISM MCP Server - Intelligence Engine (R3) — Thin Dispatcher
 *
 * Composes calibrated physics engines into 11 high-level intelligence actions.
 * This engine does NOT rewrite any physics -- it orchestrates existing engines
 * (ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations) and
 * registry lookups into compound results that answer real manufacturing questions
 * in a single round-trip.
 *
 * Architecture:
 *   User query -> IntelligenceEngine -> [registry lookups + N engine calls] -> compound result
 *
 * This file is the thin dispatcher that imports from 5 sub-engines:
 *   - ProcessPlanningEngine.ts       (job_plan, setup_sheet, cycle_time_estimate)
 *   - RecommendationEngine.ts        (material_recommend, tool_recommend, machine_recommend)
 *   - ScenarioAnalysisEngine.ts      (what_if)
 *   - DiagnosticsEngine.ts           (failure_diagnose)
 *   - IntelligenceOptimizationEngine.ts (parameter_optimize, quality_predict, process_cost)
 *
 * Actions (11):
 *   job_plan             - Full machining job plan (IMPLEMENTED)
 *   setup_sheet           - Setup sheet generation (IMPLEMENTED R3-MS0)
 *   process_cost          - Process costing (IMPLEMENTED R3-MS0)
 *   material_recommend    - Material recommendation (IMPLEMENTED R3-MS0)
 *   tool_recommend        - Tool recommendation (IMPLEMENTED R3-MS0)
 *   machine_recommend     - Machine recommendation (IMPLEMENTED R3-MS0)
 *   what_if               - What-if scenario analysis (IMPLEMENTED R3-MS0)
 *   failure_diagnose      - Failure root cause analysis (IMPLEMENTED R3-MS0)
 *   parameter_optimize    - Multi-objective parameter optimization (IMPLEMENTED R3-MS0)
 *   cycle_time_estimate   - Cycle time estimation (IMPLEMENTED R3-MS0)
 *   quality_predict       - Quality prediction (IMPLEMENTED R3-MS0)
 *
 * SAFETY CRITICAL: All cutting parameters are validated against SAFETY_LIMITS.
 * Power is checked against machine rating when machine_id is provided.
 * Tool life below 5 minutes triggers a hard warning.
 */

import { log } from "../utils/Logger.js";

// ── Shared constants & helpers (no circular deps) ──
import {
  INTELLIGENCE_SAFETY_LIMITS,
  DEFAULT_TOOL,
  mapIsoToKienzleGroup,
  mapIsoToTaylorGroup,
  validateRequiredFields,
} from "./IntelligenceShared.js";

// Re-export shared utilities for backward compatibility
// (consumers that import from IntelligenceEngine.js continue to work)
export {
  INTELLIGENCE_SAFETY_LIMITS,
  DEFAULT_TOOL,
  mapIsoToKienzleGroup,
  mapIsoToTaylorGroup,
  validateRequiredFields,
};

// ── Sub-engine imports ──
import {
  jobPlan,
  setupSheet,
  cycleTimeEstimate,
  type FeatureType,
  type JobPlanInput,
  type JobPlanOperation,
  type JobPlanResult,
} from "./ProcessPlanningEngine.js";

import {
  materialRecommend,
  toolRecommend,
  machineRecommend,
} from "./RecommendationEngine.js";

import { whatIf } from "./ScenarioAnalysisEngine.js";

import { failureDiagnose, FAILURE_MODES } from "./DiagnosticsEngine.js";

import {
  parameterOptimize,
  qualityPredict,
  processCost,
} from "./IntelligenceOptimizationEngine.js";

// ============================================================================
// ACTION REGISTRY & DISPATCHER
// ============================================================================

/** All intelligence actions, ordered by implementation priority. */
export const INTELLIGENCE_ACTIONS = [
  "job_plan",
  "setup_sheet",
  "process_cost",
  "material_recommend",
  "tool_recommend",
  "machine_recommend",
  "what_if",
  "failure_diagnose",
  "parameter_optimize",
  "cycle_time_estimate",
  "quality_predict",
] as const;

/** Union type of all valid intelligence action names. */
export type IntelligenceAction = (typeof INTELLIGENCE_ACTIONS)[number];

/** Type guard for IntelligenceAction. */
function isIntelligenceAction(action: string): action is IntelligenceAction {
  return (INTELLIGENCE_ACTIONS as readonly string[]).includes(action);
}

/**
 * Execute an intelligence action by name.
 *
 * This is the single entry point for all 11 intelligence actions. It validates
 * the action name, dispatches to the appropriate handler, and wraps errors in
 * a consistent format.
 *
 * @param action - One of the INTELLIGENCE_ACTIONS
 * @param params - Action-specific parameters (see individual functions)
 * @returns The action result (shape depends on the action)
 * @throws Error if the action is unknown or if required parameters are missing
 */
export async function executeIntelligenceAction(
  action: IntelligenceAction,
  params: Record<string, any>
): Promise<any> {
  if (!isIntelligenceAction(action)) {
    throw new Error(
      `[IntelligenceEngine] Unknown action "${action}". ` +
      `Valid actions: ${INTELLIGENCE_ACTIONS.join(", ")}`
    );
  }

  log.info(`[IntelligenceEngine] Executing action: ${action}`);
  const startMs = Date.now();

  try {
    let result: any;

    switch (action) {
      case "job_plan":
        validateRequiredFields("job_plan", params, ["material", "feature", "dimensions"]);
        if (!params.dimensions?.depth) {
          throw new Error(
            '[IntelligenceEngine] job_plan: dimensions.depth is required'
          );
        }
        result = await jobPlan(params as JobPlanInput);
        break;

      case "setup_sheet":
        result = await setupSheet(params);
        break;

      case "process_cost":
        result = await processCost(params);
        break;

      case "material_recommend":
        result = await materialRecommend(params);
        break;

      case "tool_recommend":
        result = await toolRecommend(params);
        break;

      case "machine_recommend":
        result = await machineRecommend(params);
        break;

      case "what_if":
        result = await whatIf(params);
        break;

      case "failure_diagnose":
        result = await failureDiagnose(params);
        break;

      case "parameter_optimize":
        result = await parameterOptimize(params);
        break;

      case "cycle_time_estimate":
        result = await cycleTimeEstimate(params);
        break;

      case "quality_predict":
        result = await qualityPredict(params);
        break;

      default: {
        // Exhaustiveness check -- TypeScript ensures all cases are handled
        const _exhaustive: never = action;
        throw new Error(`[IntelligenceEngine] Unhandled action: ${_exhaustive}`);
      }
    }

    // ── 7B: Confidence gating ──
    // If the result has a confidence field, apply gating logic:
    //   confidence < 0.60 → status: INSUFFICIENT_DATA (numbers are unreliable)
    //   confidence < 0.80 → append low-confidence warning
    if (result && typeof result === "object" && typeof result.confidence === "number") {
      if (result.confidence < 0.60) {
        result._confidence_gate = "INSUFFICIENT_DATA";
        result._confidence_warning = `Confidence ${result.confidence} is below threshold (0.60). ` +
          `Numerical results are unreliable — verify with empirical testing or provide more specific input.`;
        log.warn(`[IntelligenceEngine] ${action}: confidence ${result.confidence} < 0.60 — INSUFFICIENT_DATA gate`);
      } else if (result.confidence < 0.80) {
        result._confidence_warning = `Low confidence (${result.confidence}). ` +
          `Results are approximate — verify critical parameters with empirical testing.`;
        log.info(`[IntelligenceEngine] ${action}: confidence ${result.confidence} < 0.80 — low confidence warning`);
      }
    }

    const elapsedMs = Date.now() - startMs;
    log.debug(`[IntelligenceEngine] ${action} completed in ${elapsedMs}ms`);
    return result;
  } catch (err: any) {
    const elapsedMs = Date.now() - startMs;
    log.error(
      `[IntelligenceEngine] ${action} failed after ${elapsedMs}ms: ${err.message}`
    );
    throw err;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton intelligence engine with action dispatcher and constants. */
export const intelligenceEngine = {
  executeAction: executeIntelligenceAction,
  ACTIONS: INTELLIGENCE_ACTIONS,
};

// Re-export types for backward compatibility
export type { JobPlanInput, JobPlanResult, JobPlanOperation, FeatureType };

// Re-export sub-engine functions for direct access
export {
  jobPlan,
  setupSheet,
  cycleTimeEstimate,
  materialRecommend,
  toolRecommend,
  machineRecommend,
  whatIf,
  failureDiagnose,
  FAILURE_MODES,
  parameterOptimize,
  qualityPredict,
  processCost,
};
