/**
 * SoulEscalationCheckerEngine — HSE03 enforce slot soul's escalation_path.
 *
 * Pure-core: given a slot soul + a proposed edit (filepath + intent
 * keywords), returns the list of escalation-path requirements not yet
 * satisfied (e.g. "physics-reviewer agent not dispatched yet in this session").
 *
 * Wires the `escalation_path` field, which has been declared on every
 * slot soul since U-HERMES02 but never enforced.  Caller supplies the
 * session-side evidence (which subagent types were already dispatched).
 *
 * @module engines/SoulEscalationCheckerEngine
 */

import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export const EscalationContextSchema = z.object({
  filepath: z.string().min(1).max(500),
  intent_keywords: z.array(z.string().min(1).max(60)).max(40),
  /** Which subagent_types have already been spawned in the session. */
  spawned_subagent_types: z.array(z.string()).max(40),
});
export type EscalationContext = z.infer<typeof EscalationContextSchema>;

export interface EscalationCheck {
  slot: string;
  satisfied: boolean;
  required_subagent_types: string[];
  missing_subagent_types: string[];
  /** True when escalation_path also names "validate-..." rules that the file/intent triggers. */
  validation_required: boolean;
  reasons: string[];
}

const SUBAGENT_HINT_RE = /defer-([a-z]+(?:-[a-z]+)*)-to-([a-z]+(?:-[a-z]+)*)/g;

export class SoulEscalationCheckerEngine {
  /** Inspect the soul's escalation_path against the edit context. */
  static check(soul: SlotSoul, ctx: EscalationContext): EscalationCheck {
    if (!soul || typeof soul !== "object") throw new Error("SoulEscalationChecker.check: soul required");
    const v = EscalationContextSchema.parse(ctx);

    const escalation = (soul.escalation_path ?? "").toLowerCase();
    const required = new Set<string>();
    const reasons: string[] = [];

    // Pattern 1: preferred_subagent_type itself is required when soul declares one + file/intent matches domain_filter.
    if (soul.preferred_subagent_type && soul.domain_filter) {
      let domainMatch = false;
      try {
        const re = new RegExp(soul.domain_filter, "i");
        domainMatch =
          re.test(v.filepath) ||
          v.intent_keywords.some((k) => re.test(k));
      } catch {
        // soul-author error — ignore (fail-soft).
      }
      if (domainMatch) {
        required.add(soul.preferred_subagent_type);
        reasons.push(`domain_filter matched ${soul.preferred_subagent_type}`);
      }
    }

    // Pattern 2: explicit "defer-X-to-Y" lexemes in escalation_path.
    for (const m of escalation.matchAll(SUBAGENT_HINT_RE)) {
      const subagent = m[2];
      required.add(subagent);
      reasons.push(`escalation rule '${m[0]}' requires ${subagent}`);
    }

    const required_subagent_types = Array.from(required).sort();
    const spawned = new Set(v.spawned_subagent_types);
    const missing_subagent_types = required_subagent_types.filter((s) => !spawned.has(s));

    // Pattern 3: "validate-X-before-edit" → flag validation_required.
    const validation_required = /validate-[a-z-]+-before-(edit|merge|commit)/.test(escalation);
    if (validation_required) reasons.push("validation-before-edit clause present");

    return {
      slot: soul.slot,
      satisfied: missing_subagent_types.length === 0,
      required_subagent_types,
      missing_subagent_types,
      validation_required,
      reasons,
    };
  }

  static renderCheck(c: EscalationCheck): string {
    const tag = c.satisfied ? "[ESCALATION OK]" : "[ESCALATION MISSING]";
    return `${tag} ${c.slot} required=${c.required_subagent_types.length} missing=${c.missing_subagent_types.length} validate=${c.validation_required}`;
  }
}

export const soulEscalationCheckerEngine = SoulEscalationCheckerEngine;
