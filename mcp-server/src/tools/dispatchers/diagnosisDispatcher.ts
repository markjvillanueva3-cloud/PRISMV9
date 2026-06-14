/**
 * PRISM MCP Server - Diagnosis Dispatcher
 *
 * Routes 47 diagnostic, forensic, sustainability, generative process, and alarm intelligence actions.
 * Extracted from intelligenceDispatcher (SYS-MS1-U04).
 *
 * Sub-engines:
 *   failureForensics     (10 actions) — Tool autopsy, chip/surface/crash analysis
 *   inverseSolver        (8 actions)  — Inverse problem solving
 *   generativeProcess    (10 actions) — Generative process planning
 *   sustainabilityEngine (10 actions) — Sustainability optimization
 *   alarmIntelligence   (9 actions)  — Handbook-enhanced alarm diagnostics (HBK-MS3)
 *
 * @milestone SYS-MS1-U04
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { DIAGNOSIS_ACTION_SCHEMAS } from "../../schemas/diagnosisActionSchemas.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

/** Action string is validated by Zod enum but `.includes()` needs wider type */
type ActionString = string;

// Lazy engine cache
let _failureForensics: any, _inverseSolver: any,
    _generativeProcess: any, _sustainabilityEngine: any;

async function getDiagnosisEngine(name: string): Promise<any> {
  switch (name) {
    case "failureForensics":    return _failureForensics ??= (await import("../../engines/FailureForensicsEngine.js")).failureForensics;
    case "inverseSolver":       return _inverseSolver ??= (await import("../../engines/InverseSolverEngine.js")).inverseSolver;
    case "generativeProcess":   return _generativeProcess ??= (await import("../../engines/GenerativeProcessEngine.js")).generativeProcess;
    case "sustainabilityEngine": return _sustainabilityEngine ??= (await import("../../engines/SustainabilityEngine.js")).sustainabilityEngine;
    default: throw new Error(`Unknown diagnosis engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const FORENSIC_ACTIONS = [
  "forensic_tool_autopsy", "forensic_chip_analysis", "forensic_surface_defect",
  "forensic_crash", "forensic_failure_modes", "forensic_chip_types",
  "forensic_surface_types", "forensic_crash_types", "forensic_history",
  "forensic_get",
] as const;

const INVERSE_ACTIONS = [
  "inverse_solve", "inverse_surface", "inverse_tool_life",
  "inverse_dimensional", "inverse_chatter", "inverse_troubleshoot",
  "inverse_history", "inverse_get",
] as const;

const GENPLAN_ACTIONS = [
  "genplan_plan", "genplan_features", "genplan_setups", "genplan_operations",
  "genplan_optimize", "genplan_tools", "genplan_cycle", "genplan_cost",
  "genplan_risk", "genplan_get",
] as const;

const SUSTAIN_ACTIONS = [
  "sustain_optimize", "sustain_compare", "sustain_energy", "sustain_carbon",
  "sustain_coolant", "sustain_nearnet", "sustain_report", "sustain_materials",
  "sustain_history", "sustain_get",
] as const;

// -- Scrap Root Cause + Tool Substitution Risk (0-D-7b: U-PROC3) --
const SCRAP_RISK_ACTIONS = [
  "scrap_analyze", "scrap_trend", "tool_substitution_assess",
] as const;

// -- Alarm Intelligence (HBK-MS3) --
const ALARM_INTEL_ACTIONS = [
  "alarm_intel_build_index", "alarm_intel_query", "alarm_intel_by_machine",
  "alarm_intel_stats", "alarm_intel_cross_ref", "alarm_intel_rank_remediation",
  "alarm_intel_lookup", "alarm_intel_batch", "alarm_intel_search",
] as const;

// -- Error Remediation (learned failure pattern → fix suggestions) --
const REMEDIATION_ACTIONS = [
  "error_remediation_suggest", "error_remediation_apply", "error_remediation_known_errors",
] as const;

// -- Alarm Escalation (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ALARM-ESCALATION) --
// AlarmEscalationEngine (RT-MS2 Real-Time Notifications, 264 LOC, was orphan).
// Distinct from ALARM_INTEL_ACTIONS (HBK-MS3 handbook lookup) — this is the
// live-state alarm trigger/escalate/acknowledge pipeline.
const ALARM_ESC_ACTIONS = [
  "alarm_esc_trigger", "alarm_esc_acknowledge", "alarm_esc_resolve",
  "alarm_esc_active", "alarm_esc_history", "alarm_esc_rules", "alarm_esc_stats",
] as const;

// -- WIRE-SUSTAIN-DIRECT-MS0/U-VICTOR-SUSTAIN-DIRECT (slot:victor, 2026-05-26) --
// Wires three previously-unwired sub-engines that overlap the SustainabilityEngine
// domain but expose distinct, more specialized APIs (L2-P4-MS1/P0-U05 Batch 9).
// SustainabilityEngine = high-level aggregator; these 3 are the specialized
// calculators it COULD compose but doesn't today. Operator can A/B compare
// the two implementations once both are exposed.
//   sustain_params_optimize  → SustainOptimizeEngine.optimize(SustainInput)
//   sustain_carbon_calculate → SustainCarbonEngine.calculate(CarbonInput)
//   sustain_energy_analyze   → SustainEnergyEngine.analyze(EnergyAnalysisInput)
const SUSTAIN_DIRECT_ACTIONS = [
  "sustain_params_optimize", "sustain_carbon_calculate", "sustain_energy_analyze",
] as const;

const ACTIONS = [
  ...FORENSIC_ACTIONS,
  ...INVERSE_ACTIONS,
  ...GENPLAN_ACTIONS,
  ...SUSTAIN_ACTIONS,
  ...SCRAP_RISK_ACTIONS,
  ...ALARM_INTEL_ACTIONS,
  ...REMEDIATION_ACTIONS,
  ...ALARM_ESC_ACTIONS,
  ...SUSTAIN_DIRECT_ACTIONS,
] as const;

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function diagnosisExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // Forensics
    case "forensic_tool_autopsy":
    case "forensic_chip_analysis":
    case "forensic_surface_defect":
    case "forensic_crash":
      return { id: result.diagnosis_id, category: result.category, mode: result.failure_mode, severity: result.severity, actions: result.corrective_actions?.length };
    case "forensic_failure_modes":
    case "forensic_chip_types":
    case "forensic_surface_types":
    case "forensic_crash_types":
      return { total: result.total };
    case "forensic_history":
      return { total: result.total, by_category: result.by_category };
    case "forensic_get":
      return { id: result.diagnosis_id, category: result.category, mode: result.failure_mode };
    // Inverse
    case "inverse_solve":
    case "inverse_surface":
    case "inverse_tool_life":
    case "inverse_dimensional":
    case "inverse_chatter":
    case "inverse_troubleshoot":
      return { id: result.problem_id, type: result.problem_type, primary_cause: result.primary_cause, fix: result.recommended_fix, confidence: result.confidence };
    case "inverse_history":
      return { total: result.total, by_type: result.by_type };
    case "inverse_get":
      return { id: result.problem_id, type: result.problem_type, primary_cause: result.primary_cause };
    // Generative Process Planning
    case "genplan_plan":
      return { plan_id: result.plan_id, features: result.feature_count, setups: result.setup_count, ops: result.operation_count, tools: result.tool_count, cycle: result.total_cycle_time_min, cost: result.total_cost_usd };
    case "genplan_features":
      return { count: result.feature_count, simple: result.complexity_summary?.simple, moderate: result.complexity_summary?.moderate, complex: result.complexity_summary?.complex };
    case "genplan_setups":
      return { count: result.setup_count };
    case "genplan_operations":
      return { count: result.operation_count };
    case "genplan_optimize":
      return { total: result.optimization_summary?.total_operations, tools: result.optimization_summary?.unique_tools };
    case "genplan_tools":
      return { count: result.tool_count, changes: result.tool_change_count };
    case "genplan_cycle":
      return { cutting: result.cutting_time_min, tool_change: result.tool_change_time_min, total: result.total_cycle_time_min };
    case "genplan_cost":
      return { per_part: result.cost_breakdown?.total_per_part_usd, batch: result.cost_breakdown?.total_batch_usd };
    case "genplan_risk":
      return { overall: result.risk_summary?.overall_risk, high: result.risk_summary?.high_risk_operations, medium: result.risk_summary?.medium_risk_operations };
    case "genplan_get":
      return { plan_id: result.plan_id, material: result.material, features: result.features?.length };
    // Sustainability
    case "sustain_optimize":
      return { id: result.optimization_id, material: result.material, mode: result.mode, cost_delta: result.savings?.cost_delta_pct, energy_saved: result.savings?.energy_saved_pct, carbon_saved: result.savings?.carbon_saved_pct };
    case "sustain_compare":
      return { total: result.total };
    case "sustain_energy":
      return { material: result.material, savings_kwh: result.savings_kwh, savings_pct: result.savings_pct };
    case "sustain_carbon":
      return { material: result.material, savings_kg: result.savings_kg_co2, savings_pct: result.savings_pct };
    case "sustain_coolant":
      return { current: result.current_type, recommended: result.recommended_type, savings_usd: result.annual_savings_usd };
    case "sustain_nearnet":
      return { id: result.analysis_id, material: result.material, best: result.best_option, options: result.stock_options?.length };
    case "sustain_report":
      return { material: result.material, batch: result.batch_size, energy_saved: result.batch_totals?.energy_saved_kwh, carbon_saved: result.batch_totals?.carbon_saved_kg };
    case "sustain_materials":
      return { name: result.name, total: result.total };
    case "sustain_history":
      return { total: result.total };
    case "sustain_get":
      return { id: result.optimization_id, material: result.material, mode: result.mode };
    // Scrap Root Cause + Tool Substitution Risk (0-D-7b)
    case "scrap_analyze":
      return { pattern: result.pattern_type, top_cause: result.probable_causes?.[0]?.cause, probability: result.probable_causes?.[0]?.probability, thermal_mm: result.physics_analysis?.thermal_growth_mm };
    case "scrap_trend":
      return { trend: result.trend, common: result.common_causes?.length, systemic: result.systemic_issues?.length, cost_month: result.estimated_cost_impact_per_month };
    case "tool_substitution_assess":
      return { risk: result.overall_risk, deflection_delta: result.risk_factors?.deflection_delta_mm, finish_delta: result.risk_factors?.finish_impact_Ra_delta, approval: result.approval_recommended };
    // Alarm Intelligence
    case "alarm_intel_build_index":
      return { machines: result.machines_indexed, alarms: result.total_alarms };
    case "alarm_intel_query":
    case "alarm_intel_by_machine":
    case "alarm_intel_search":
      return { total: result.total ?? result.length, results: result.results?.length ?? result.length };
    case "alarm_intel_stats":
      return { machines: result.machines_indexed, total_alarms: result.total_alarms };
    case "alarm_intel_cross_ref":
      return { alarm_code: result.alarm_code, sources: result.sources?.length };
    case "alarm_intel_rank_remediation":
      return { alarm_code: result.alarm_code, steps: result.steps?.length };
    case "alarm_intel_lookup":
      return { alarm_code: result.alarm_code, severity: result.severity, sources: result.sources?.length };
    case "alarm_intel_batch":
      return { total: result.results?.length ?? result.length };
    // Error Remediation
    case "error_remediation_suggest":
      return { count: result.suggestions?.length, top_confidence: result.suggestions?.[0]?.confidence, top_pattern: result.suggestions?.[0]?.errorPattern };
    case "error_remediation_apply":
      return { adjusted_params: Object.keys(result.adjusted || {}).length };
    case "error_remediation_known_errors":
      return { count: result.errors?.length };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers diagnosis dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerDiagnosisDispatcher(server: any): void {
  server.tool(
    "prism_diagnosis",
    "Diagnostics & analysis: failure forensics (tool autopsy, chip/surface/crash), inverse problem solving, generative process planning, sustainability optimization. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_diagnosis] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, DIAGNOSIS_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_diagnosis"
          );
        }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "diagnosis" as const, id: action, data: params },
          metadata: { dispatcher: "diagnosisDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        // Route to engine
        let result: any;
        if (action === "scrap_analyze") {
          const { scrapRootCauseEngine } = await import("../../engines/ScrapRootCauseEngine.js");
          result = scrapRootCauseEngine.analyzeScrapEvent(params as any);
        } else if (action === "scrap_trend") {
          const { scrapRootCauseEngine: srcTrend } = await import("../../engines/ScrapRootCauseEngine.js");
          result = srcTrend.analyzeTrend(params as any);
        } else if (action === "tool_substitution_assess") {
          const { toolSubstitutionRiskEngine } = await import("../../engines/ToolSubstitutionRiskEngine.js");
          result = toolSubstitutionRiskEngine.assessSubstitution(params as any);
        } else if (ALARM_INTEL_ACTIONS.includes(action as ActionString as typeof ALARM_INTEL_ACTIONS[number])) {
          const { alarmIntelligenceEngine } = await import("../../engines/AlarmIntelligenceEngine.js");
          switch (action) {
            case "alarm_intel_build_index": {
              const index = alarmIntelligenceEngine.buildAlarmIndex();
              result = { total_alarms: index.length, machines_indexed: new Set(index.map((a: any) => a.machine_id)).size, alarms: index };
              break;
            }
            case "alarm_intel_query": result = alarmIntelligenceEngine.queryAlarmIndex(params as any); break;
            case "alarm_intel_by_machine": result = alarmIntelligenceEngine.getAlarmsByMachine(params.machine_id); break;
            case "alarm_intel_stats": result = alarmIntelligenceEngine.getAlarmIntelligenceStats(); break;
            case "alarm_intel_cross_ref": result = alarmIntelligenceEngine.crossReferenceAlarm(params.alarm_code ?? params.code, params.machine_id, params.controller); break;
            case "alarm_intel_rank_remediation": {
              const xref = alarmIntelligenceEngine.crossReferenceAlarm(params.alarm_code ?? params.code, params.machine_id, params.controller);
              result = alarmIntelligenceEngine.rankRemediationSteps(xref);
              break;
            }
            case "alarm_intel_lookup": result = alarmIntelligenceEngine.lookupAlarmEnhanced(params as any); break;
            case "alarm_intel_batch": result = alarmIntelligenceEngine.batchLookup(params.machine_id, params.codes ?? params.alarm_codes ?? [], params.controller); break;
            case "alarm_intel_search": result = alarmIntelligenceEngine.searchAlarmIntelligence(params.query ?? "", params.machine_id, params.limit); break;
          }
        } else if (ALARM_ESC_ACTIONS.includes(action as ActionString as typeof ALARM_ESC_ACTIONS[number])) {
          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ALARM-ESCALATION
          const { alarmEscalationEngine } = await import("../../engines/AlarmEscalationEngine.js");
          switch (action) {
            case "alarm_esc_trigger": {
              const alarm = alarmEscalationEngine.trigger(
                String(params.rule_id),
                String(params.source),
                String(params.message),
                (params.details as Record<string, unknown>) ?? {},
              );
              result = { success: true, alarm };
              break;
            }
            case "alarm_esc_acknowledge": {
              const alarm = alarmEscalationEngine.acknowledge(
                String(params.alarm_id),
                String(params.user_id),
              );
              result = alarm
                ? { success: true, alarm }
                : { success: false, error: "alarm_not_found_or_not_active", alarm_id: String(params.alarm_id) };
              break;
            }
            case "alarm_esc_resolve": {
              const alarm = alarmEscalationEngine.resolve(String(params.alarm_id));
              result = alarm
                ? { success: true, alarm }
                : { success: false, error: "alarm_not_found", alarm_id: String(params.alarm_id) };
              break;
            }
            case "alarm_esc_active": {
              const filter: { severity?: "info" | "warn" | "critical" | "emergency"; source?: string } = {};
              if (params.severity) filter.severity = params.severity as typeof filter.severity;
              if (params.source) filter.source = String(params.source);
              const alarms = alarmEscalationEngine.getActive(Object.keys(filter).length ? filter : undefined);
              result = { success: true, count: alarms.length, alarms };
              break;
            }
            case "alarm_esc_history": {
              const limit = typeof params.limit === "number" ? params.limit : 50;
              const alarms = alarmEscalationEngine.history(limit);
              result = { success: true, count: alarms.length, limit, alarms };
              break;
            }
            case "alarm_esc_rules": {
              const rules = alarmEscalationEngine.getRules();
              result = { success: true, count: rules.length, rules };
              break;
            }
            case "alarm_esc_stats": {
              result = { success: true, stats: alarmEscalationEngine.stats() };
              break;
            }
          }
        } else if (REMEDIATION_ACTIONS.includes(action as ActionString as typeof REMEDIATION_ACTIONS[number])) {
          const { errorRemediationEngine } = await import("../../engines/ErrorRemediationEngine.js");
          switch (action) {
            case "error_remediation_suggest": {
              const suggestions = errorRemediationEngine.getRemediation(
                params.action_path ?? params.actionPath ?? "",
                params.error_code ?? params.errorCode ?? "",
                params.original_params ?? params.originalParams ?? {},
              );
              result = { suggestions, formatted: suggestions.map(s => errorRemediationEngine.formatRemediation(s)) };
              break;
            }
            case "error_remediation_apply": {
              const adjusted = errorRemediationEngine.applyAdjustments(
                params.original_params ?? params.originalParams ?? {},
                params.adjustments ?? {},
              );
              result = { adjusted };
              break;
            }
            case "error_remediation_known_errors": {
              const errors = errorRemediationEngine.getKnownErrors(params.action_path ?? params.actionPath ?? "");
              result = { errors, action_path: params.action_path ?? params.actionPath };
              break;
            }
          }
        } else if (SUSTAIN_DIRECT_ACTIONS.includes(action as ActionString as typeof SUSTAIN_DIRECT_ACTIONS[number])) {
          // WIRE-SUSTAIN-DIRECT-MS0/U-VICTOR-SUSTAIN-DIRECT (slot:victor 2026-05-26):
          // route to the 3 specialized sub-engines (vs the high-level SustainabilityEngine
          // composed in the fallthrough below). Each engine uses static methods.
          switch (action) {
            case "sustain_params_optimize": {
              const { SustainOptimizeEngine } = await import("../../engines/SustainOptimizeEngine.js");
              result = SustainOptimizeEngine.optimize(params as any);
              break;
            }
            case "sustain_carbon_calculate": {
              const { SustainCarbonEngine } = await import("../../engines/SustainCarbonEngine.js");
              result = SustainCarbonEngine.calculate(params as any);
              break;
            }
            case "sustain_energy_analyze": {
              const { SustainEnergyEngine } = await import("../../engines/SustainEnergyEngine.js");
              result = SustainEnergyEngine.analyze(params as any);
              break;
            }
          }
        } else {
          result = FORENSIC_ACTIONS.includes(action as ActionString as typeof FORENSIC_ACTIONS[number])
            ? await (await getDiagnosisEngine("failureForensics"))(action, params)
            : INVERSE_ACTIONS.includes(action as ActionString as typeof INVERSE_ACTIONS[number])
            ? await (await getDiagnosisEngine("inverseSolver"))(action, params)
            : GENPLAN_ACTIONS.includes(action as ActionString as typeof GENPLAN_ACTIONS[number])
            ? await (await getDiagnosisEngine("generativeProcess"))(action, params)
            : await (await getDiagnosisEngine("sustainabilityEngine"))(action, params);
        }

        // Post-hooks
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // Response formatting
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => diagnosisExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_diagnosis] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_diagnosis");
      }
    }
  );
}
