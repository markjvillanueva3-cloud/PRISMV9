/**
 * DreamLoopProposalEngine — HSE06 soul-coupled dream loop proposer.
 *
 * Pure-core: the missing Hermes-pattern "dream loop" — given session
 * corrections + error patterns + the current slot soul, propose new
 * refuse-list rules and new skill candidates that the operator promotes.
 *
 * The Hermes Agent pattern (NousResearch) names this the "dream" loop:
 * the overnight/idle reasoning that turns observed corrections into new
 * doctrine.  PRISM already had soul-evolution.mjs for refuse-rule
 * candidates; this engine generalizes it to ALSO propose skills, and is
 * dispatcher-callable (the .mjs lib was not).
 *
 * @module engines/DreamLoopProposalEngine
 */

import { z } from "zod";

export const CorrectionSchema = z.object({
  text: z.string().min(1).max(500),
  source: z.string().min(1).max(60),
  at: z.string().max(40).optional(),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const ErrorPatternSchema = z.object({
  pattern: z.string().min(1).max(200),
  count: z.number().int().min(1).max(10_000),
});
export type ErrorPattern = z.infer<typeof ErrorPatternSchema>;

export const DreamProposalRequestSchema = z.object({
  slot: z.string().min(1).max(60),
  current_refuse_list: z.array(z.string()).max(40),
  corrections: z.array(CorrectionSchema).max(200),
  error_patterns: z.array(ErrorPatternSchema).max(200),
  /** Minimum repetitions before a correction can graduate into a refuse-rule. */
  min_repetitions: z.number().int().min(1).max(20).optional(),
});
export type DreamProposalRequest = z.infer<typeof DreamProposalRequestSchema>;

export interface RefuseRuleProposal {
  rule: string;
  source_correction: string;
  observed_count: number;
}

export interface SkillProposal {
  name: string;
  reason: string;
  triggering_pattern: string;
  observed_count: number;
}

export interface DreamProposalBatch {
  slot: string;
  refuse_rules: RefuseRuleProposal[];
  skills: SkillProposal[];
  /** Corrections that did not graduate — too few observations OR already covered. */
  filtered_correction_count: number;
}

const STOPWORD = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "for", "and", "or", "in", "on", "at"]);

function corrToken(text: string): string {
  // Project a correction into a stable token: lowercase + strip stopwords + collapse spaces.
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORD.has(w))
    .slice(0, 6)
    .join("-")
    .slice(0, 96);
}

export class DreamLoopProposalEngine {
  static propose(req: DreamProposalRequest): DreamProposalBatch {
    const v = DreamProposalRequestSchema.parse(req);
    const minRep = v.min_repetitions ?? 2;

    // Bucket corrections by their projected token.
    const buckets = new Map<string, Correction[]>();
    for (const c of v.corrections) {
      const t = corrToken(c.text);
      if (!t) continue;
      const list = buckets.get(t) || [];
      list.push(c);
      buckets.set(t, list);
    }

    const existing = new Set(v.current_refuse_list.map((r) => r.toLowerCase()));
    const refuse_rules: RefuseRuleProposal[] = [];
    let filtered = 0;

    for (const [token, corrs] of buckets.entries()) {
      if (corrs.length < minRep) {
        filtered += corrs.length;
        continue;
      }
      if (existing.has(token)) {
        filtered += corrs.length;
        continue;
      }
      refuse_rules.push({
        rule: token,
        source_correction: corrs[0].text.slice(0, 200),
        observed_count: corrs.length,
      });
    }
    refuse_rules.sort((a, b) => b.observed_count - a.observed_count);

    // Skill proposals: error patterns that repeat ≥ minRep × 2 and aren't yet refused.
    const skillThresh = minRep * 2;
    const skills: SkillProposal[] = [];
    for (const ep of v.error_patterns) {
      if (ep.count < skillThresh) continue;
      const tok = corrToken(ep.pattern);
      if (!tok || existing.has(tok)) continue;
      skills.push({
        name: `skill-${tok.slice(0, 40)}`,
        reason: `recurring error pattern observed ${ep.count}× across sessions`,
        triggering_pattern: ep.pattern.slice(0, 200),
        observed_count: ep.count,
      });
    }
    skills.sort((a, b) => b.observed_count - a.observed_count);

    return {
      slot: v.slot,
      refuse_rules,
      skills,
      filtered_correction_count: filtered,
    };
  }

  static renderBatch(b: DreamProposalBatch): string {
    return `[DREAM ${b.slot}] new-refuses=${b.refuse_rules.length} new-skills=${b.skills.length} filtered=${b.filtered_correction_count}`;
  }
}

export const dreamLoopProposalEngine = DreamLoopProposalEngine;
