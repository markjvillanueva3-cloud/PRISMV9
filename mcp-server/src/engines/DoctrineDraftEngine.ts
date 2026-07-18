/**
 * DoctrineDraftEngine — HZP08 fleet-consensus → CLAUDE.md doctrine drafter.
 *
 * Pure-core: given the output of SoulConsensusEngine.analyze (fleet doctrine
 * candidates, role divergences, singletons) and a minimum coverage threshold,
 * emit a markdown section ready to be reviewed by the operator and pasted
 * into CLAUDE.md as a new doctrine block.
 *
 * Closes the loop from HSE08 SoulConsensus → CLAUDE.md.  Never mutates
 * CLAUDE.md directly — operator-promote only (per the same rule as the
 * dream-loop proposer).
 *
 * @module engines/DoctrineDraftEngine.ts
 */

import { z } from "zod";

export const DoctrineCandidateSchema = z.object({
  refusal: z.string().min(1).max(120),
  slots: z.array(z.string().min(1).max(60)).min(1).max(40),
  coverage_pct: z.number().int().min(0).max(100),
});
export type DoctrineCandidate = z.infer<typeof DoctrineCandidateSchema>;

export const RoleDivergenceSchema = z.object({
  role: z.string().min(1).max(60),
  refusal: z.string().min(1).max(120),
  holders: z.array(z.string().min(1).max(60)),
  missing_from: z.array(z.string().min(1).max(60)),
});
export type RoleDivergence = z.infer<typeof RoleDivergenceSchema>;

export const DoctrineDraftRequestSchema = z.object({
  fleet_doctrine_candidates: z.array(DoctrineCandidateSchema),
  role_divergences: z.array(RoleDivergenceSchema),
  /** Minimum coverage_pct to include in the draft (default 60). */
  min_coverage_pct: z.number().int().min(50).max(100).optional(),
  /** Date stamp for the draft (caller-supplied for determinism). */
  date_iso: z.string().min(8).max(30),
});
export type DoctrineDraftRequest = z.infer<typeof DoctrineDraftRequestSchema>;

export interface DoctrineDraft {
  date_iso: string;
  included_count: number;
  excluded_below_threshold: number;
  markdown: string;
  /** Action items for the operator (e.g. "resolve divergence in specialist-mill"). */
  action_items: string[];
}

const DEFAULT_MIN_COVERAGE = 60;

export class DoctrineDraftEngine {
  static draft(req: DoctrineDraftRequest): DoctrineDraft {
    const v = DoctrineDraftRequestSchema.parse(req);
    const minCov = v.min_coverage_pct ?? DEFAULT_MIN_COVERAGE;

    const included = v.fleet_doctrine_candidates.filter((c) => c.coverage_pct >= minCov);
    const excluded = v.fleet_doctrine_candidates.length - included.length;

    const lines: string[] = [];
    lines.push(`## Fleet Doctrine — draft (${v.date_iso})`);
    lines.push("");
    lines.push(`Auto-drafted by HZP08 DoctrineDraftEngine. Review before merging into CLAUDE.md.`);
    lines.push("");

    if (included.length === 0) {
      lines.push(`> No refusal token reached the ${minCov}% coverage threshold this cycle. No doctrine to promote.`);
    } else {
      lines.push(`### Refusals held by ≥${minCov}% of the fleet`);
      lines.push("");
      lines.push("| Refusal | Coverage | Slots |");
      lines.push("|---|---|---|");
      for (const c of included) {
        lines.push(`| \`${c.refusal}\` | ${c.coverage_pct}% (${c.slots.length}/${Math.round(c.slots.length * 100 / c.coverage_pct)}) | ${c.slots.join(", ")} |`);
      }
      lines.push("");
      lines.push(`These tokens are de-facto fleet doctrine. Consider promoting to a CLAUDE.md \`## Standing doctrine\` bullet so all chats see the rule without slot-soul lookup.`);
    }

    const action_items: string[] = [];
    if (v.role_divergences.length > 0) {
      lines.push("");
      lines.push("### Role divergences — same-role slots disagree on refusals");
      lines.push("");
      lines.push("These are soul-consistency smells: slots playing the same `hermes_role` should generally share refuse_lists. Either (a) graduate the refusal to all role-mates' souls, or (b) decide the holders are wrong and remove it.");
      lines.push("");
      for (const d of v.role_divergences.slice(0, 20)) {
        lines.push(`- **${d.role}** disagrees on \`${d.refusal}\`: holders=[${d.holders.join(", ")}] missing=[${d.missing_from.join(", ")}]`);
        action_items.push(`Resolve divergence in role '${d.role}' for refusal '${d.refusal}' — held by ${d.holders.length}, missing from ${d.missing_from.length}.`);
      }
      if (v.role_divergences.length > 20) lines.push(`- _(${v.role_divergences.length - 20} more divergences truncated)_`);
    }

    return {
      date_iso: v.date_iso,
      included_count: included.length,
      excluded_below_threshold: excluded,
      markdown: lines.join("\n") + "\n",
      action_items,
    };
  }

  static renderSummary(d: DoctrineDraft): string {
    return `[DOCTRINE-DRAFT ${d.date_iso}] included=${d.included_count} excluded=${d.excluded_below_threshold} action-items=${d.action_items.length}`;
  }
}

export const doctrineDraftEngine = DoctrineDraftEngine;
