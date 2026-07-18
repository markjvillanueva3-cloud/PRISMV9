/**
 * HermesParallelBudgetEnvelopeEngine — HZP03 parallel fan-out budget envelope.
 *
 * Before a caller fires N parallel agents in one tool block, this engine
 * answers: "will the aggregate token spend fit my remaining budget?"
 *
 * Pure-core: per-size-hint cost table × agent count = envelope.  Compares
 * against a remaining budget and returns within / over / refused, with the
 * suggested max parallelism that DOES fit (so the caller can degrade
 * gracefully instead of failing the whole fan-out).
 *
 * @module engines/HermesParallelBudgetEnvelopeEngine
 */

import { z } from "zod";

export const SizeHintSchema = z.enum(["short", "medium", "large"]);
export type SizeHint = z.infer<typeof SizeHintSchema>;

export const AgentBudgetRequestSchema = z.object({
  agent_id: z.string().min(1).max(120),
  size_hint: SizeHintSchema,
});
export type AgentBudgetRequest = z.infer<typeof AgentBudgetRequestSchema>;

/**
 * Per-size token cost table. Defaults to the Sonnet baseline; a caller (e.g.
 * OpusFastMaxAgentSpecEngine) passes a higher-cost OPUS table to size a fan-out of
 * opus-fast-max agents. Ceiling 2,000,000 tokens/agent comfortably covers an opus
 * "large" subtask (Sonnet large 30k x ~5 opus ratio = 150k, with headroom).
 */
export const CostTableSchema = z.object({
  short: z.number().int().min(0).max(2_000_000),
  medium: z.number().int().min(0).max(2_000_000),
  large: z.number().int().min(0).max(2_000_000),
});
export type CostTable = z.infer<typeof CostTableSchema>;

export const FanoutBudgetRequestSchema = z.object({
  agents: z.array(AgentBudgetRequestSchema).min(1).max(20),
  remaining_budget_tokens: z.number().int().min(0).max(10_000_000),
  /** Reserve a percentage for the parent's post-aggregation work. */
  parent_reserve_pct: z.number().min(0).max(0.5).optional(),
  /**
   * Optional per-size cost override. Absent -> the Sonnet baseline (back-compat:
   * every pre-existing caller behaves identically). Present -> sizes the envelope
   * against that table (the opus-fast-max tier the operator asked for).
   */
  cost_table: CostTableSchema.optional(),
});
export type FanoutBudgetRequest = z.infer<typeof FanoutBudgetRequestSchema>;

/**
 * Conservative per-agent ceiling -- based on observed Sonnet 4.6 subagent costs.
 * EXPORTED as the single source of truth for the Sonnet baseline so a higher tier
 * (opus) is derived by scaling THIS table by the OpusCapabilityEngine cost ratio,
 * never by re-inlining absolute opus numbers.
 */
export const SONNET_COST_BY_SIZE: Record<SizeHint, number> = {
  short: 4_000,
  medium: 12_000,
  large: 30_000,
};

export interface BudgetVerdict {
  total_estimate_tokens: number;
  available_tokens: number;
  parent_reserve_tokens: number;
  verdict: "within" | "over" | "refused";
  /** Largest prefix of `agents` that fits the budget — caller may use this to degrade. */
  max_parallel_fits: number;
  per_agent_estimate: Array<{ agent_id: string; tokens: number }>;
}

export class HermesParallelBudgetEnvelopeEngine {
  static estimate(req: FanoutBudgetRequest): BudgetVerdict {
    const v = FanoutBudgetRequestSchema.parse(req);
    const reservePct = v.parent_reserve_pct ?? 0.10;
    const parent_reserve_tokens = Math.floor(v.remaining_budget_tokens * reservePct);
    const available_tokens = v.remaining_budget_tokens - parent_reserve_tokens;

    // Resolve the cost table: explicit override (e.g. the opus tier) or the
    // Sonnet baseline. Back-compat -- absent override == prior behavior exactly.
    const costTable = v.cost_table ?? SONNET_COST_BY_SIZE;

    const per_agent_estimate = v.agents.map((a) => ({
      agent_id: a.agent_id,
      tokens: costTable[a.size_hint],
    }));

    // Walk agents in input order, accumulate, find largest prefix that fits.
    let running = 0;
    let max_parallel_fits = 0;
    for (const e of per_agent_estimate) {
      if (running + e.tokens > available_tokens) break;
      running += e.tokens;
      max_parallel_fits += 1;
    }

    const total_estimate_tokens = per_agent_estimate.reduce((s, e) => s + e.tokens, 0);

    let verdict: BudgetVerdict["verdict"];
    if (total_estimate_tokens <= available_tokens) verdict = "within";
    else if (max_parallel_fits === 0) verdict = "refused";
    else verdict = "over";

    return {
      total_estimate_tokens,
      available_tokens,
      parent_reserve_tokens,
      verdict,
      max_parallel_fits,
      per_agent_estimate,
    };
  }

  static renderVerdict(v: BudgetVerdict): string {
    return `[BUDGET ${v.verdict.toUpperCase()}] total=${v.total_estimate_tokens} available=${v.available_tokens} fits=${v.max_parallel_fits}`;
  }
}

export const hermesParallelBudgetEnvelopeEngine = HermesParallelBudgetEnvelopeEngine;
