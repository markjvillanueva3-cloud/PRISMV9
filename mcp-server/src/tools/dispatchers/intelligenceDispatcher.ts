/**
 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
 *
 * Routes 11 compound intelligence actions to IntelligenceEngine.
 * These actions compose calibrated physics engines + registry lookups
 * into high-level answers to manufacturing questions.
 *
 * Actions:
 *   job_plan, setup_sheet, process_cost, material_recommend,
 *   tool_recommend, machine_recommend, what_if, failure_diagnose,
 *   parameter_optimize, cycle_time_estimate, quality_predict
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { registryManager } from "../../registries/manager.js";
import { executeIntelligenceAction, INTELLIGENCE_ACTIONS, type IntelligenceAction } from "../../engines/IntelligenceEngine.js";
import { jobLearning } from "../../engines/JobLearningEngine.js";
import { algorithmGateway } from "../../engines/AlgorithmGatewayEngine.js";
import { shopScheduler } from "../../engines/ShopSchedulerEngine.js";
import { intentEngine } from "../../engines/IntentDecompositionEngine.js";
import { responseFormatter } from "../../engines/ResponseFormatterEngine.js";
import { workflowChains } from "../../engines/WorkflowChainsEngine.js";
import { onboardingEngine } from "../../engines/OnboardingEngine.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

const ACTIONS = [
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
  "job_record",
  "job_insights",
  "algorithm_select",
  "shop_schedule",
  "machine_utilization",
  "decompose_intent",
  "format_response",
  "workflow_match",
  "workflow_get",
  "workflow_list",
  "onboarding_welcome",
  "onboarding_state",
  "onboarding_record",
  "onboarding_suggestion",
  "onboarding_reset",
] as const;

/**
 * Extract key values from intelligence action results for summary/slim responses.
 *
 * IMPORTANT: Field paths here MUST match the actual return shapes from
 * IntelligenceEngine.ts. If you change engine output shapes, update this too.
 * Last verified: 2026-02-22 (all 11 actions).
 */
function intelligenceExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    case "job_plan":
      return {
        material: result.material?.name,
        iso_group: result.material?.iso_group,
        operations: result.operations?.length,
        cycle_time_min: result.cycle_time?.total_min,
        stable: result.stability?.is_stable,
        critical_depth_mm: result.stability?.critical_depth_mm,
        confidence: result.confidence,
        safety_passed: result.safety?.all_checks_passed,
      };
    case "setup_sheet":
      return {
        material: result.header?.material,
        operations: result.operations?.length,
        tools: result.tools?.length,
        format: result.format,
      };
    case "process_cost":
      return {
        total_cost: result.total_cost_per_part,
        machine_cost: result.machine_cost,
        tool_cost: result.tool_cost_per_part,
        cycle_time_min: result.cycle_time_min,
      };
    case "material_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name,
        top_score: result.candidates?.[0]?.score,
      };
    case "tool_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.id,
        top_score: result.candidates?.[0]?.score,
      };
    case "machine_recommend":
      return {
        candidates: result.candidates?.length,
        top_pick: result.candidates?.[0]?.name ?? result.candidates?.[0]?.model,
        utilization: result.candidates?.[0]?.utilization_pct,
      };
    case "what_if":
      return {
        material: result.material,
        baseline_Vc: result.baseline?.cutting_speed,
        scenario_Vc: result.scenario?.cutting_speed,
        force_delta_pct: result.deltas?.cutting_force_N?.percent,
        life_delta_pct: result.deltas?.tool_life_min?.percent,
        mrr_delta_pct: result.deltas?.mrr_cm3_min?.percent,
        insights: result.insights?.length,
      };
    case "failure_diagnose":
      return {
        symptoms: result.symptoms_analyzed?.length,
        top_diagnosis: result.diagnoses?.[0]?.name,
        top_relevance: result.diagnoses?.[0]?.relevance,
        severity: result.diagnoses?.[0]?.severity,
        diagnoses_count: result.diagnoses?.length,
        has_alarm: !!result.alarm,
        alarm_code: result.alarm?.code,
        alarm_name: result.alarm?.name,
        has_physics_check: !!result.physics_cross_check,
      };
    case "parameter_optimize":
      return {
        material: result.material,
        optimal_Vc: result.optimal_parameters?.cutting_speed,
        optimal_fz: result.optimal_parameters?.feed_per_tooth,
        optimal_ap: result.optimal_parameters?.axial_depth,
        mrr: result.predicted_outcomes?.mrr,
        surface_finish: result.predicted_outcomes?.surface_finish,
        tool_life: result.predicted_outcomes?.tool_life,
        min_cost_speed: result.minimum_cost_speed,
      };
    case "cycle_time_estimate":
      return {
        total_min: result.total_time_min,
        cutting_min: result.cutting_time_min,
        rapid_min: result.rapid_time_min,
        operations: result.operations?.length,
        utilization_pct: result.utilization_percent,
      };
    case "quality_predict":
      return {
        Ra: result.surface_finish?.Ra,
        Rz: result.surface_finish?.Rz,
        deflection_mm: result.deflection?.max_deflection_mm,
        temperature_C: result.thermal?.max_temperature_C,
        tolerance_grade: result.achievable_tolerance?.grade,
        tolerance_um: result.achievable_tolerance?.tolerance_um,
        force_N: result.cutting_force_N,
      };
    case "job_record":
      return {
        id: result.id,
        stored: result.stored,
        total_jobs_for_key: result.total_jobs_for_key,
        learning_available: result.learning_available,
        safety_score: result.safety?.score,
      };
    case "job_insights":
      return {
        sample_size: result.sample_size,
        patterns_count: result.patterns?.length,
        adjustments_count: result.parameter_adjustments?.length,
        top_finding: result.patterns?.[0]?.finding,
        failures: result.failure_analysis?.total_failures,
        safety_score: result.safety?.score,
      };
    case "algorithm_select":
      return {
        algorithm: result.selected_algorithm,
        course: result.source_course,
        alternatives: result.alternatives?.length,
        safety_score: result.safety?.score,
      };
    case "shop_schedule":
      return {
        makespan_min: result.metrics?.total_makespan_min,
        avg_utilization: result.metrics?.average_utilization_pct,
        jobs_on_time: result.metrics?.jobs_on_time,
        jobs_late: result.metrics?.jobs_late,
        bottlenecks: result.bottlenecks?.length,
        unscheduled: result.unscheduled?.length,
        safety_score: result.safety?.score,
      };
    case "machine_utilization":
      return {
        total_machines: result.fleet_summary?.total_machines,
        avg_utilization: result.fleet_summary?.avg_utilization_pct,
        overloaded: result.fleet_summary?.overloaded_count,
        underutilized: result.fleet_summary?.underutilized_count,
        recommendations: result.recommendations?.length,
        capability_gaps: result.capability_gaps?.length,
        safety_score: result.safety?.score,
      };
    case "decompose_intent":
      return {
        material: result.entities?.material,
        machine: result.entities?.machine,
        operation: result.entities?.operation,
        persona: result.persona,
        confidence: result.confidence,
        plan_steps: result.plan?.length,
        ambiguities: result.ambiguities?.length,
        safety_score: result.safety?.score,
      };
    case "format_response":
      return {
        persona: result.persona,
        units: result.units,
        section_count: result.section_count,
      };
    case "workflow_match":
      return {
        total_matches: result.total_matches,
        best_id: result.best?.workflow_id,
        best_name: result.best?.name,
        best_confidence: result.best?.confidence,
      };
    case "workflow_get":
      return {
        id: result.id,
        name: result.name,
        steps: result.estimated_steps,
        persona: result.persona,
      };
    case "workflow_list":
      return {
        total: result.total,
      };
    case "onboarding_welcome":
      return {
        has_greeting: !!result.greeting,
        suggestions: result.suggestions?.length,
      };
    case "onboarding_state":
    case "onboarding_record":
      return {
        interaction_count: result.interaction_count,
        disclosure_level: result.disclosure_level,
        has_suggestion: !!result.suggestion,
      };
    case "onboarding_suggestion":
      return {
        level: result.level,
        has_message: !!result.message,
      };
    case "onboarding_reset":
      return { reset: result.reset };
    default:
      return result;
  }
}

export function registerIntelligenceDispatcher(server: any): void {
  server.tool(
    "prism_intelligence",
    "Compound intelligence actions for manufacturing: job planning, setup sheets, process costing, material/tool/machine recommendations, what-if analysis, failure diagnosis, parameter optimization, cycle time estimation, quality prediction, job outcome recording & learning, algorithm selection, shop floor scheduling & machine utilization, natural language intent decomposition, persona-adaptive response formatting, pre-built workflow chains. Actions: job_plan, setup_sheet, process_cost, material_recommend, tool_recommend, machine_recommend, what_if, failure_diagnose, parameter_optimize, cycle_time_estimate, quality_predict, job_record, job_insights, algorithm_select, shop_schedule, machine_utilization, decompose_intent, format_response, workflow_match, workflow_get, workflow_list",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_intelligence] Action: ${action}`);

      // Ensure registries are initialized
      await registryManager.initialize();

      // Normalize common parameter aliases
      const params: Record<string, any> = { ...rawParams };
      if (params.material_name !== undefined && params.material === undefined) params.material = params.material_name;
      if (params.machine_name !== undefined && params.machine_id === undefined) params.machine_id = params.machine_name;
      if (params.tool_name !== undefined && params.tool_id === undefined) params.tool_id = params.tool_name;
      if (params.depth !== undefined && params.dimensions === undefined) {
        params.dimensions = { depth: params.depth, width: params.width, length: params.length };
      }

      try {
        // === PRE-INTELLIGENCE HOOKS ===
        const hookCtx = {
          operation: action,
          target: { type: "intelligence" as const, id: action, data: params },
          metadata: { dispatcher: "intelligenceDispatcher", action, params },
        };

        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                blocked: true,
                blocker: preResult.blockedBy,
                reason: preResult.summary,
                action,
              }),
            }],
          };
        }

        // === EXECUTE INTELLIGENCE ACTION ===
        // Route to specialized engines or IntelligenceEngine
        const LEARNING_ACTIONS = ["job_record", "job_insights"] as const;
        const ALGORITHM_ACTIONS = ["algorithm_select"] as const;
        const SCHEDULER_ACTIONS = ["shop_schedule", "machine_utilization"] as const;
        const INTENT_ACTIONS = ["decompose_intent"] as const;
        const FORMATTER_ACTIONS = ["format_response"] as const;
        const WORKFLOW_ACTIONS = ["workflow_match", "workflow_get", "workflow_list"] as const;
        const ONBOARDING_ACTIONS = ["onboarding_welcome", "onboarding_state", "onboarding_record", "onboarding_suggestion", "onboarding_reset"] as const;
        const result = LEARNING_ACTIONS.includes(action as any)
          ? jobLearning(action, params)
          : ALGORITHM_ACTIONS.includes(action as any)
            ? algorithmGateway(action, params)
            : SCHEDULER_ACTIONS.includes(action as any)
              ? shopScheduler(action, params)
              : INTENT_ACTIONS.includes(action as any)
                ? intentEngine(action, params)
                : FORMATTER_ACTIONS.includes(action as any)
                  ? responseFormatter(action, params)
                  : WORKFLOW_ACTIONS.includes(action as any)
                    ? workflowChains(action, params)
                    : ONBOARDING_ACTIONS.includes(action as any)
                      ? onboardingEngine(action, params)
                      : await executeIntelligenceAction(action as IntelligenceAction, params);

        // === POST-INTELLIGENCE HOOKS ===
        const postCtx = {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        };
        await hookExecutor.execute("post-calculation", postCtx);

        // === RESPONSE FORMATTING ===
        // Support response_level parameter
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => intelligenceExtractKeyValues(action, r)
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
          };
        }

        // Apply context-pressure-aware slimming
        const pressure = getCurrentPressurePct();
        if (pressure > 50) {
          const slimLevel = getSlimLevel(pressure);
          const keyValues = intelligenceExtractKeyValues(action, result);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(slimResponse(
                { action, ...result },
                slimLevel,
                keyValues
              )),
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }],
        };
      } catch (err: any) {
        log.error(`[prism_intelligence] ${action} failed: ${err.message}`);

        // Return structured error (not a throw — keep MCP protocol clean)
        const isStub = err.message?.includes("not yet implemented");
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: true,
              action,
              message: err.message,
              stub: isStub,
              hint: isStub
                ? `Action "${action}" is not yet implemented`
                : undefined,
            }),
          }],
        };
      }
    }
  );
}
