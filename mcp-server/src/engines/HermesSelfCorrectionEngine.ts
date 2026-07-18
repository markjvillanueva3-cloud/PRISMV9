/**
 * HermesSelfCorrectionEngine — HZP07 failure → corrected-approach proposer.
 *
 * Pure-core: given a failed task attempt (description + failure reason +
 * the slot's soul) and the broader fleet's recent corrections on similar
 * tasks, propose a corrected approach: which subagent to dispatch, which
 * refuse-rules to consult, and what to AVOID this time.
 *
 * Closes the "self-correction" loop named in the NousResearch Hermes pattern.
 *
 * @module engines/HermesSelfCorrectionEngine
 */

import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export const FailureRecordSchema = z.object({
  task_id: z.string().min(1).max(120),
  task_text: z.string().min(1).max(2000),
  failure_reason: z.string().min(1).max(500),
  attempts_so_far: z.number().int().min(1).max(20),
});
export type FailureRecord = z.infer<typeof FailureRecordSchema>;

export const RecentCorrectionSchema = z.object({
  text: z.string().min(1).max(500),
  /** Rerank score 0..1 vs the failing task's text (caller-supplied). */
  similarity: z.number().min(0).max(1),
});
export type RecentCorrection = z.infer<typeof RecentCorrectionSchema>;

export const CorrectionRequestSchema = z.object({
  failure: FailureRecordSchema,
  recent_corrections: z.array(RecentCorrectionSchema).max(40),
  /** Refuse rules to consult — typically the slot's refuse_list. */
  applicable_refuses: z.array(z.string().min(1).max(120)).max(40),
});
export type CorrectionRequest = z.infer<typeof CorrectionRequestSchema>;

export interface CorrectionProposal {
  task_id: string;
  /** Steps the chat should follow next attempt, in order. */
  steps: string[];
  /** Subagent the soul (if any) suggests dispatching. */
  recommend_subagent: string | null;
  /** Patterns observed in past corrections that apply to this failure. */
  matched_corrections: RecentCorrection[];
  /** Refuse-rules that already cover the failure mode (caller should not violate). */
  active_refuses: string[];
  /** True when ≥ 3 attempts have failed — escalate to human review. */
  escalate_to_human: boolean;
}

const SIMILARITY_THRESHOLD = 0.6;
const ESCALATION_ATTEMPT_THRESHOLD = 3;

export class HermesSelfCorrectionEngine {
  static propose(req: CorrectionRequest, soul: SlotSoul | null): CorrectionProposal {
    const v = CorrectionRequestSchema.parse(req);

    const matched = v.recent_corrections
      .filter((c) => c.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const steps: string[] = [];
    const lowerReason = v.failure.failure_reason.toLowerCase();
    const lowerText = v.failure.task_text.toLowerCase();

    // Step 1: re-read the constraint the failure named.
    if (lowerReason.includes("timeout")) {
      steps.push("Reduce scope or batch the work — last attempt timed out.");
    } else if (lowerReason.includes("schema") || lowerReason.includes("zod")) {
      steps.push("Re-read the input schema; the previous payload was rejected by validation.");
    } else if (lowerReason.includes("permission") || lowerReason.includes("denied") || lowerReason.includes("forbid")) {
      steps.push("Check the sandbox policy / capability allowlist before retry.");
    } else if (lowerReason.includes("conflict") || lowerReason.includes("lock")) {
      steps.push("Wait for the contended resource to clear OR isolate to a different worktree.");
    } else {
      steps.push(`Re-examine the failure reason: ${v.failure.failure_reason.slice(0, 160)}`);
    }

    // Step 2: apply soul guardrails.
    const active_refuses: string[] = [];
    if (soul && Array.isArray(soul.refuse_list)) {
      for (const r of soul.refuse_list) {
        if (lowerText.includes(r.toLowerCase()) || lowerReason.includes(r.toLowerCase())) {
          active_refuses.push(r);
        }
      }
      if (active_refuses.length > 0) {
        steps.push(`Honor the slot's refuse rules in this domain: ${active_refuses.join(", ")}.`);
      }
    }

    // Step 3: if matched corrections exist, apply them.
    if (matched.length > 0) {
      steps.push(`Apply ${matched.length} prior correction(s) that matched this task pattern.`);
    }

    // Step 4: dispatch the soul-recommended subagent if any.
    const recommend_subagent = soul?.preferred_subagent_type ?? null;
    if (recommend_subagent) {
      steps.push(`Dispatch ${recommend_subagent} subagent BEFORE the next attempt.`);
    }

    // Step 5: escalation gate.
    const escalate_to_human = v.failure.attempts_so_far >= ESCALATION_ATTEMPT_THRESHOLD;
    if (escalate_to_human) {
      steps.push(`Escalate to human review — ${v.failure.attempts_so_far} attempts have failed.`);
    }

    return {
      task_id: v.failure.task_id,
      steps,
      recommend_subagent,
      matched_corrections: matched,
      active_refuses,
      escalate_to_human,
    };
  }

  static renderProposal(p: CorrectionProposal): string {
    const tag = p.escalate_to_human ? "[CORRECTION ESCALATE]" : "[CORRECTION PLAN]";
    return `${tag} ${p.task_id} steps=${p.steps.length} subagent=${p.recommend_subagent ?? "—"} active_refuses=${p.active_refuses.length}`;
  }
}

export const hermesSelfCorrectionEngine = HermesSelfCorrectionEngine;
