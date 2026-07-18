/**
 * SoulAwareFanoutExtenderEngine — HZP05 soul-aware extension of HZP01 fanout planner.
 *
 * Pure-core: takes the wave_1 assignments emitted by
 * HermesParallelFanoutPlannerEngine.plan and, for each assignment whose
 * slot has a SlotSoul, consults SoulSubagentRouter to obtain the
 * preferred_subagent_type when the soul's domain_filter matches the
 * underlying subtask.  The output AgentAssignment carries the resolved
 * `hermes_role` (was "specialist" by default) and the resolved
 * `subagent_type` for Agent-tool spawning.
 *
 * Closes the gap noted while shipping HZP01: souls declare
 * `preferred_subagent_type` but the fanout planner never read it.
 *
 * @module engines/SoulAwareFanoutExtenderEngine
 */

import { z } from "zod";
import { SoulSubagentRouterEngine } from "./SoulSubagentRouterEngine.js";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export const ExtenderRequestSchema = z.object({
  wave_1: z.array(z.object({
    subtask_id: z.string().min(1).max(120),
    slot: z.string().min(1).max(60),
    hermes_role: z.string().min(1).max(60),
    score: z.number(),
    reason: z.string().max(200),
  })).min(1).max(20),
  /** Subtask descriptors keyed by subtask_id. */
  subtasks: z.array(z.object({
    subtask_id: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    domain: z.string().min(1).max(60),
  })).min(1).max(20),
});
export type ExtenderRequest = z.infer<typeof ExtenderRequestSchema>;

export interface SoulAwareAssignment {
  subtask_id: string;
  slot: string;
  hermes_role: string;
  subagent_type: string | null;
  score: number;
  reason: string;
  /** True when the subagent_type came from the slot's soul; false when the soul had no preference. */
  soul_routed: boolean;
}

export interface ExtenderResult {
  /** Assignments with subagent_type filled in (when the slot soul has a preference). */
  assignments: SoulAwareAssignment[];
  /** Slots whose souls were not resolvable (no soul map entry). */
  unresolved_slots: string[];
  /** Assignments where the soul refused the task (refuse_list hit on description). */
  refused: Array<{ subtask_id: string; slot: string; refusal: string }>;
}

export class SoulAwareFanoutExtenderEngine {
  /**
   * `souls` is a map slot → SlotSoul (caller-supplied; engine is pure).
   * Missing souls are reported in `unresolved_slots`.
   */
  static extend(req: ExtenderRequest, souls: Record<string, SlotSoul>): ExtenderResult {
    if (!souls || typeof souls !== "object") {
      throw new Error("SoulAwareFanoutExtender.extend: souls map required");
    }
    const v = ExtenderRequestSchema.parse(req);

    const stMap = new Map(v.subtasks.map((s) => [s.subtask_id, s]));
    const assignments: SoulAwareAssignment[] = [];
    const unresolved_slots: string[] = [];
    const refused: Array<{ subtask_id: string; slot: string; refusal: string }> = [];

    for (const wave of v.wave_1) {
      const soul = souls[wave.slot];
      const subtask = stMap.get(wave.subtask_id);
      if (!subtask) {
        throw new Error(`SoulAwareFanoutExtender: wave.subtask_id ${wave.subtask_id} has no subtask`);
      }
      if (!soul) {
        unresolved_slots.push(wave.slot);
        assignments.push({
          subtask_id: wave.subtask_id,
          slot: wave.slot,
          hermes_role: wave.hermes_role,
          subagent_type: null,
          score: wave.score,
          reason: `${wave.reason}; soul unresolved`,
          soul_routed: false,
        });
        continue;
      }

      // Refuse-list check — if any refusal token appears in the description, surface a refusal.
      const lowerDesc = subtask.description.toLowerCase();
      const hitRefusal = (soul.refuse_list || []).find((r) => lowerDesc.includes(r.toLowerCase()));
      if (hitRefusal) {
        refused.push({ subtask_id: wave.subtask_id, slot: wave.slot, refusal: hitRefusal });
        continue;
      }

      const verdict = SoulSubagentRouterEngine.route(soul, {
        task_text: subtask.description,
        task_domain: subtask.domain,
      });

      assignments.push({
        subtask_id: wave.subtask_id,
        slot: wave.slot,
        // Promote soul.hermes_role over fanout-planner default ("specialist").
        hermes_role: soul.hermes_role || wave.hermes_role,
        subagent_type: verdict.subagent_type,
        score: wave.score,
        reason: `${wave.reason}; ${verdict.reason}`,
        soul_routed: verdict.subagent_type !== null,
      });
    }

    return { assignments, unresolved_slots: [...new Set(unresolved_slots)].sort(), refused };
  }

  static renderResult(r: ExtenderResult): string {
    const routed = r.assignments.filter((a) => a.soul_routed).length;
    return `[SOUL-EXTEND] assignments=${r.assignments.length} routed=${routed} unresolved=${r.unresolved_slots.length} refused=${r.refused.length}`;
  }
}

export const soulAwareFanoutExtenderEngine = SoulAwareFanoutExtenderEngine;
