/**
 * SoulSubagentRouterEngine — HSE02 subagent-type router from slot soul.
 *
 * Pure-core: given a SlotSoul + a task descriptor, returns the
 * subagent_type the slot prefers (or null when the soul has no preference
 * OR the task's domain falls outside the slot's domain_filter regex).
 *
 * Wires the existing `preferred_subagent_type` frontmatter field — which
 * has been declared on every slot soul since U-HERMES02 but never read by
 * Agent-tool callers.
 *
 * @module engines/SoulSubagentRouterEngine
 */

import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export const RouteRequestSchema = z.object({
  task_text: z.string().min(1).max(4000),
  task_domain: z.string().max(60).optional(),
});
export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export interface RouteVerdict {
  slot: string;
  subagent_type: string | null;
  matched_domain: boolean;
  reason: string;
}

export class SoulSubagentRouterEngine {
  /**
   * Decide the subagent_type for a task given this slot's soul.
   *
   * - No preferred_subagent_type → null (`reason: "soul has no preference"`).
   * - Has preference + no domain_filter → return preference (`reason: "preference-only"`).
   * - Has preference + domain_filter matches text/domain → return preference (`reason: "domain-match"`).
   * - Has preference + domain_filter does NOT match → null (`reason: "domain-mismatch"`).
   */
  static route(soul: SlotSoul, req: RouteRequest): RouteVerdict {
    if (!soul || typeof soul !== "object") throw new Error("SoulSubagentRouter.route: soul required");
    const v = RouteRequestSchema.parse(req);
    const slot = soul.slot;
    const pref = soul.preferred_subagent_type ?? null;

    if (!pref) {
      return { slot, subagent_type: null, matched_domain: false, reason: "soul has no preference" };
    }

    // No filter → preference applies universally.
    if (!soul.domain_filter || soul.domain_filter.length === 0) {
      return { slot, subagent_type: pref, matched_domain: true, reason: "preference-only" };
    }

    let matched = false;
    try {
      const re = new RegExp(soul.domain_filter, "i");
      const haystack = `${v.task_text} ${v.task_domain ?? ""}`;
      matched = re.test(haystack);
    } catch {
      // Bad regex → treat as no-filter (fail-soft, never throw on soul-author error).
      return { slot, subagent_type: pref, matched_domain: false, reason: "preference-only (filter regex invalid)" };
    }

    if (matched) {
      return { slot, subagent_type: pref, matched_domain: true, reason: "domain-match" };
    }
    return { slot, subagent_type: null, matched_domain: false, reason: "domain-mismatch" };
  }

  static renderVerdict(v: RouteVerdict): string {
    const sub = v.subagent_type ?? "—";
    return `[SOUL-ROUTE ${v.slot}] subagent=${sub} match=${v.matched_domain} (${v.reason})`;
  }
}

export const soulSubagentRouterEngine = SoulSubagentRouterEngine;
