/**
 * ToolLifeBudgetEngine — closes PreCut axis #10 (tool life budget OK)
 *
 * For every tool in the program's required list, computes:
 *   - predicted_use_min_per_part × parts_in_run = total_use_min
 *   - remaining_life_min (from offset table / Weibull distribution)
 *   - budget_ok = remaining ≥ total_use × safety_factor (default 1.2)
 *   - mid_run_change_point (if any) — when to swap to spare tool
 *   - recommend_pre_stage_count — how many spares to load before run
 *
 * Reference: Sandvik Coromant tool-life best-practice §4 (life budgeting);
 *   StochasticToolLife Weibull distribution (β,η from tool-life corpus);
 *   ISO 3685 (tool-life testing) §6 reliability factor; Taylor equation extension
 *   from `mcp-server/src/physics/constants.ts` (do NOT inline).
 *
 * @version 1.0.0
 * @module ToolLifeBudgetEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface ToolBudgetInput {
  tool_id: string;
  /** Predicted minutes of cut per single part */
  predicted_use_min_per_part: number;
  /** Total parts in this run */
  parts_in_run: number;
  /** Currently-remaining tool life (min) per offset table / Weibull p50 */
  remaining_life_min: number;
  /** Optional spare-tool count already loaded in magazine */
  spares_loaded?: number;
  /** Per-spare remaining life (min) */
  spare_life_min?: number;
}

export interface ToolBudgetVerdict {
  tool_id: string;
  total_use_min: number;
  remaining_life_min: number;
  safety_margin_pct: number;
  budget_ok: boolean;
  mid_run_change_at_part: number | null;
  recommend_pre_stage: number;
  reasoning: string;
}

export interface ToolLifeBudgetInput {
  program_id: string;
  tools: ToolBudgetInput[];
  /** Safety factor — multiplier on predicted use (default 1.2 = 20% margin) */
  safety_factor?: number;
}

export interface ToolLifeBudgetResult {
  program_id: string;
  total_tools: number;
  tools: ToolBudgetVerdict[];
  insufficient_count: number;
  pre_stage_total: number;
  verdict: "budget_ok" | "budget_warn" | "budget_block";
  confidence: AtomicValue;
  source: string;
}

const DEFAULT_SAFETY_FACTOR = 1.2;

export class ToolLifeBudgetEngine {
  budget(input: ToolLifeBudgetInput): ToolLifeBudgetResult {
    if (!input || !input.program_id || !Array.isArray(input.tools)) {
      throw new Error("ToolLifeBudgetEngine.budget: program_id + tools[] required");
    }
    const sf = input.safety_factor ?? DEFAULT_SAFETY_FACTOR;
    const verdicts: ToolBudgetVerdict[] = [];

    for (const t of input.tools) {
      const totalUse = t.predicted_use_min_per_part * t.parts_in_run;
      const required = totalUse * sf;
      const ok = t.remaining_life_min >= required;
      const margin = totalUse > 0
        ? ((t.remaining_life_min - totalUse) / totalUse) * 100
        : 100;

      // Mid-run change-point: at which part does life run out?
      let midChange: number | null = null;
      if (!ok && t.predicted_use_min_per_part > 0) {
        const partsBeforeFailure = Math.floor(t.remaining_life_min / (t.predicted_use_min_per_part * sf));
        if (partsBeforeFailure < t.parts_in_run) {
          midChange = partsBeforeFailure;
        }
      }

      // Recommend pre-stage spares
      let preStage = 0;
      if (!ok) {
        const totalAvailable = t.remaining_life_min + (t.spares_loaded ?? 0) * (t.spare_life_min ?? 0);
        const stillShort = required - totalAvailable;
        if (stillShort > 0 && (t.spare_life_min ?? 0) > 0) {
          preStage = Math.ceil(stillShort / t.spare_life_min!);
        } else if (stillShort > 0) {
          // No spare life data — recommend 1 spare per missing 30 min
          preStage = Math.max(1, Math.ceil(stillShort / 30));
        }
      }

      const reasoning = ok
        ? `${t.remaining_life_min.toFixed(0)} min remaining ≥ ${required.toFixed(0)} min required (sf=${sf})`
        : `${t.remaining_life_min.toFixed(0)} min remaining < ${required.toFixed(0)} min required — pre-stage ${preStage} spare(s)`;

      verdicts.push({
        tool_id: t.tool_id,
        total_use_min: Number(totalUse.toFixed(2)),
        remaining_life_min: t.remaining_life_min,
        safety_margin_pct: Number(margin.toFixed(1)),
        budget_ok: ok,
        mid_run_change_at_part: midChange,
        recommend_pre_stage: preStage,
        reasoning,
      });
    }

    const insufficient = verdicts.filter(v => !v.budget_ok).length;
    const preStageTotal = verdicts.reduce((sum, v) => sum + v.recommend_pre_stage, 0);
    let verdict: ToolLifeBudgetResult["verdict"];
    if (insufficient === 0) verdict = "budget_ok";
    else if (insufficient <= verdicts.length / 2 && preStageTotal > 0) verdict = "budget_warn";
    else verdict = "budget_block";

    const confidence = verdicts.length > 0
      ? Math.max(0, 1 - insufficient / verdicts.length)
      : 1;

    return {
      program_id: input.program_id,
      total_tools: verdicts.length,
      tools: verdicts,
      insufficient_count: insufficient,
      pre_stage_total: preStageTotal,
      verdict,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "1 - insufficient / total",
      },
      source: "ToolLifeBudgetEngine — Sandvik §4 life-budget + ISO 3685 §6 reliability + Taylor extension",
    };
  }
}

export const toolLifeBudgetEngine = new ToolLifeBudgetEngine();
