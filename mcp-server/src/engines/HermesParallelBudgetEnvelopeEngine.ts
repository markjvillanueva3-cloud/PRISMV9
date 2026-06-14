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

export const FanoutBudgetRequestSchema = z.object({
  agents: z.array(AgentBudgetRequestSchema).min(1).max(20),
  remaining_budget_tokens: z.number().int().min(0).max(10_000_000),
  /** Reserve a percentage for the parent's post-aggregation work. */
  parent_reserve_pct: z.number().min(0).max(0.5).optional(),
});
export type FanoutBudgetRequest = z.infer<typeof FanoutBudgetRequestSchema>;

/** Conservative per-agent ceiling — based on observed Sonnet 4.6 subagent costs. */
const COST_BY_SIZE: Record<SizeHint, number> = {
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

    const per_agent_estimate = v.agents.map((a) => ({
      agent_id: a.agent_id,
      tokens: COST_BY_SIZE[a.size_hint],
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
