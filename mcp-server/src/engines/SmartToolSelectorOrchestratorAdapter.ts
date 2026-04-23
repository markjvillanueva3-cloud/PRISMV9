/**
 * SmartToolSelectorOrchestratorAdapter — CAMX-MS0.3 / U-CAMX03
 *
 * Bridges SmartToolSelectorEngine (physics-scored tool ranker against the
 * real tool catalog) with PipelineDecisionOrchestratorEngine (universal
 * decision wrapper with audit trail, 5-axis scoring, safety veto,
 * justification, and alternatives).
 *
 * Every milling tool decision inside PrintToProgram / PartGeometry / CAMKernel
 * flows through this adapter instead of inline `if (material === X) return
 * tool Y` heuristics. The adapter:
 *   1. Calls SmartToolSelectorEngine.select() to harvest top-N physics-
 *      scored candidates from the 46,590-tool catalog.
 *   2. Maps each SmartToolResult → DecisionCandidate with pre_scores
 *      derived from the smart selector's 7-axis breakdown.
 *   3. Calls PipelineDecisionOrchestratorEngine.decide() with
 *      category="tool_select" so the same audit log, safety veto, and
 *      justification apparatus that covers every other pipeline decision
 *      also covers tool selection.
 *   4. Returns a unified result: the orchestrator decision record PLUS
 *      the raw SmartToolResult for the winner (physics + recommended S/F).
 *
 * Call sites
 *   PrintToProgram.selectRoughingTool()   → decision_point "p2p.tool_select_rough"
 *   PrintToProgram.selectFinishingTool()  → decision_point "p2p.tool_select_finish"
 *   PrintToProgram.selectDrillingTool()   → decision_point "p2p.tool_select_drill"
 *   MultiAxis.selectUndercutTool()        → decision_point "mx.tool_select_undercut"
 *   PartGeometry.matchToolToFeature()     → decision_point forwarded by caller
 *   CAMKernel.resolveToolBinding()        → decision_point forwarded by caller
 */

import { smartToolSelectorEngine } from "./SmartToolSelectorEngine.js";
import type { SmartToolRequest, SmartToolResult } from "./SmartToolSelectorEngine.js";
import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

/**
 * Pipeline-level tool-selection request — thin wrapper around SmartToolRequest
 * augmented with decision-audit metadata used by the orchestrator.
 */
export interface OrchestratedToolRequest extends SmartToolRequest {
  /** Stable decision_point id from pipelineDecisionTaxonomy (e.g. "p2p.tool_select_rough"). */
  decision_point: string;
  /** Pipeline stage reporting the decision (e.g. "roughing"). */
  pipeline_stage?: string;
  /** Caller identity (engine + method) for audit trail. */
  caller?: string;
  /** Objective modifier forwarded to the orchestrator scorer. */
  objective?: "speed" | "quality" | "cost" | "balanced" | "tool_life";
  /** Populate XAI feature importance (expensive). Default false. */
  explain?: boolean;
}

export interface OrchestratedToolDecision {
  /** The winning SmartToolResult — physics + recommended S/F. */
  smart_result: SmartToolResult;
  /** Full orchestrator decision record — audit_id + score breakdown + alternatives. */
  decision: any;
  /** True when SmartToolSelector produced zero candidates. */
  no_candidates: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/** Map a SmartToolResult (7-axis breakdown) → orchestrator pre_scores (5 axes). */
function smartResultToPreScores(r: SmartToolResult): Record<string, number> {
  const sb = r.score_breakdown;
  // Logical consistency ← geometric + material fit (both measure fit to context)
  const logical = (sb.geometric_fit + sb.material_match) / 2;
  // Safety ← physics_performance + machine_fit (both measure viability)
  const machineValidation = r.machine_validation;
  const mvOk =
    (machineValidation.rpm_ok ? 1 : 0) +
    (machineValidation.power_ok ? 1 : 0) +
    (machineValidation.torque_ok ? 1 : 0) +
    (machineValidation.tool_fits ? 1 : 0);
  const mvScore = mvOk / 4;
  const safety = r.physics.deflection_ok ? (sb.machine_fit + mvScore) / 2 : 0.25;
  return {
    optimal_performance: sb.physics_performance,
    logical_consistency: logical,
    safety,
    cost_efficiency: sb.cost_efficiency,
    robustness: (sb.playbook_compliance + sb.holder_availability) / 2,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Engine / adapter
// ────────────────────────────────────────────────────────────────────────

export class SmartToolSelectorOrchestratorAdapter {
  /**
   * Run a physics-scored tool selection through the orchestrator so the
   * decision is logged, justified, and comparable with every other
   * pipeline decision.
   */
  selectToolOrchestrated(req: OrchestratedToolRequest): OrchestratedToolDecision {
    const { decision_point, pipeline_stage, caller, objective, explain, ...smartReq } = req;
    // Harvest at least 5 candidates so the orchestrator has alternatives to
    // justify against. Cap at 10 to keep scoring tight.
    const maxResults = Math.min(10, Math.max(5, smartReq.max_results || 5));
    const smart = smartToolSelectorEngine.select({ ...smartReq, max_results: maxResults });

    if (!smart.candidates || smart.candidates.length === 0) {
      return {
        smart_result: null as any,
        decision: null,
        no_candidates: true,
      };
    }

    const candidates = smart.candidates.map((c) => ({
      id: c.tool_id,
      label: `${c.manufacturer} ${c.designation} (${c.type}, Ø${c.diameter_mm}mm)`,
      data: {
        diameter_mm: c.diameter_mm,
        flute_length_mm: c.flute_length_mm,
        flute_count: c.flute_count,
        coating: c.coating,
        cutting_force_n: c.physics.cutting_force_N,
        power_kw: c.physics.cutting_power_kW,
        deflection_mm: c.physics.deflection_mm,
        tool_life_min: c.physics.tool_life_estimate_min,
        iso_groups: [smartReq.material_iso_group],
        operation_types: [smartReq.operation_type],
      },
      pre_scores: smartResultToPreScores(c),
    }));

    const decision = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "tool_select",
      context: {
        material: {
          iso_group: smartReq.material_iso_group,
          name: smartReq.material_name,
          hardness_hrc: smartReq.material_hardness_hrc,
        },
        machine: {
          name: smartReq.machine_name,
          id: smartReq.machine_id,
          spindle_power_kw: smartReq.max_power_kw,
        },
        operation: smartReq.operation_type,
        feature: {
          diameter_mm: smartReq.feature_diameter_mm,
          depth_mm: smartReq.feature_depth_mm,
          width_mm: smartReq.feature_width_mm,
        },
      },
      candidates,
      objective: objective ?? (smartReq.optimize_for === "cost" ? "cost" :
                             smartReq.optimize_for === "speed" ? "speed" :
                             smartReq.optimize_for === "surface_finish" ? "quality" :
                             smartReq.optimize_for === "tool_life" ? "tool_life" : "balanced"),
      explain: explain ?? false,
      pipeline_stage,
      caller,
      constraints: {
        max_power_kw: smartReq.max_power_kw,
        max_deflection_mm: 0.05, // 50μm default cap
      },
    });

    // The orchestrator's winning id matches the SmartToolResult's tool_id —
    // find it back.
    const winnerId = decision?.choice?.id;
    const smartWinner = smart.candidates.find((c) => c.tool_id === winnerId) ?? smart.best_tool;

    return {
      smart_result: smartWinner,
      decision,
      no_candidates: false,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────
export const smartToolSelectorOrchestratorAdapter = new SmartToolSelectorOrchestratorAdapter();
