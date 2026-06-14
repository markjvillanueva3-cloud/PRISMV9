/**
 * ContextBlockPackerEngine — HMEMV07 per-block token budget packer.
 *
 * Pure-core packer: caller supplies the LLM's max-context token budget plus
 * a list of candidate blocks (system prompt, tool defs, conversation,
 * recall results, scratchpad) with priorities + token estimates; engine
 * returns a packing plan that fits within the budget and reports what was
 * dropped.  Greedy by priority DESC (highest priority included first).
 *
 * Complements the existing `ContextBudgetEngine` (which manages per-category
 * aggregate budgets across dispatchers): this engine operates at the
 * per-block packing layer that produces a single LLM call's context.
 *
 * @module engines/ContextBlockPackerEngine
 */

import { z } from "zod";

export const ContextBlockSchema = z.object({
  block_id: z.string().min(1).max(120),
  kind: z.string().min(1).max(40),
  tokens: z.number().int().min(0).max(1_000_000),
  priority: z.number().int().min(0).max(100),
  required: z.boolean().default(false),
});
export type ContextBlock = z.infer<typeof ContextBlockSchema>;

export interface PackingPlan {
  budget_tokens: number;
  used_tokens: number;
  remaining_tokens: number;
  kept: ContextBlock[];
  dropped: ContextBlock[];
  overflow: boolean;
}

export class ContextBlockPackerEngine {
  static validateBlock(b: unknown): ContextBlock { return ContextBlockSchema.parse(b); }

  /** Pack blocks into the budget; required blocks always included (overflow if needed). */
  static plan(blocks: readonly ContextBlock[], budget_tokens: number): PackingPlan {
    if (!Array.isArray(blocks)) throw new Error("ContextBlockPacker.plan: blocks must be an array");
    if (!Number.isFinite(budget_tokens) || budget_tokens < 0) {
      throw new Error("ContextBlockPacker.plan: budget_tokens must be a finite non-negative number");
    }
    for (const b of blocks) ContextBlockSchema.parse(b);

    const required = blocks.filter((b) => b.required);
    const optional = blocks.filter((b) => !b.required);

    let used = required.reduce((s, b) => s + b.tokens, 0);
    const overflow = used > budget_tokens;
    const kept: ContextBlock[] = [...required];

    // Greedy: include optional blocks in priority DESC order (highest first).
    const ordered = [...optional].sort((a, b) => b.priority - a.priority);
    const dropped: ContextBlock[] = [];
    for (const b of ordered) {
      if (used + b.tokens <= budget_tokens) {
        kept.push(b);
        used += b.tokens;
      } else {
        dropped.push(b);
      }
    }

    return {
      budget_tokens,
      used_tokens: used,
      remaining_tokens: Math.max(0, budget_tokens - used),
      kept,
      dropped,
      overflow,
    };
  }

  /** Render plan for operator audit. */
  static renderPlan(plan: PackingPlan): string {
    const status = plan.overflow ? "OVERFLOW" : "OK";
    return [
      `[PACK ${status}] budget=${plan.budget_tokens} used=${plan.used_tokens} remaining=${plan.remaining_tokens}`,
      `  kept ${plan.kept.length}: ${plan.kept.map((b) => `${b.block_id}(${b.tokens})`).join(", ")}`,
      `  dropped ${plan.dropped.length}: ${plan.dropped.map((b) => `${b.block_id}(${b.tokens})`).join(", ")}`,
    ].join("\n");
  }
}

export const contextBlockPackerEngine = ContextBlockPackerEngine;
