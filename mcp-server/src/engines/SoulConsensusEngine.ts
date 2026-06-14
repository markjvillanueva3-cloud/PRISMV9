/**
 * SoulConsensusEngine — HSE08 cross-soul consensus on refusals + roles.
 *
 * Pure-core: given N SlotSouls, identify (a) refusal tokens shared by a
 * majority of the fleet (candidate for promotion to fleet-wide doctrine),
 * (b) divergences where slots in the SAME hermes_role disagree on
 * refusals (a soul-consistency smell), (c) refusals held by a single slot
 * (singleton-doctrine — may need socialization).
 *
 * Wires into the dream loop: a singleton refusal observed for 30+ nights
 * across N slots should graduate into fleet-doctrine in CLAUDE.md.
 *
 * @module engines/SoulConsensusEngine
 */

import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

export interface ConsensusResult {
  total_souls: number;
  /** Refusal tokens held by ≥ majority of the fleet (n/2 + 1). */
  fleet_doctrine_candidates: Array<{ refusal: string; slots: string[]; coverage_pct: number }>;
  /** hermes_role → refusal disagreements between same-role slots. */
  role_divergences: Array<{ role: string; refusal: string; holders: string[]; missing_from: string[] }>;
  /** Singleton refusals — held by exactly one slot.  Candidates for socialization. */
  singleton_refusals: Array<{ refusal: string; slot: string }>;
  /** Number of distinct refusal tokens across the fleet. */
  distinct_refusal_count: number;
}

export class SoulConsensusEngine {
  static analyze(souls: SlotSoul[]): ConsensusResult {
    if (!Array.isArray(souls)) throw new Error("SoulConsensus.analyze: souls must be array");
    if (souls.length === 0) throw new Error("SoulConsensus.analyze: souls must be non-empty");

    const refMap = new Map<string, string[]>();
    const roleMap = new Map<string, string[]>();
    const roleRefMap = new Map<string, Map<string, string[]>>();

    for (const s of souls) {
      const role = s.hermes_role;
      const roleList = roleMap.get(role) || [];
      if (!roleList.includes(s.slot)) roleList.push(s.slot);
      roleMap.set(role, roleList);

      const innerMap = roleRefMap.get(role) || new Map<string, string[]>();
      roleRefMap.set(role, innerMap);

      for (const r of s.refuse_list || []) {
        const list = refMap.get(r) || [];
        if (!list.includes(s.slot)) list.push(s.slot);
        refMap.set(r, list);

        const inner = innerMap.get(r) || [];
        if (!inner.includes(s.slot)) inner.push(s.slot);
        innerMap.set(r, inner);
      }
    }

    const majorityThreshold = Math.floor(souls.length / 2) + 1;
    const fleet_doctrine_candidates: ConsensusResult["fleet_doctrine_candidates"] = [];
    const singleton_refusals: ConsensusResult["singleton_refusals"] = [];

    for (const [refusal, slots] of refMap.entries()) {
      if (slots.length >= majorityThreshold) {
        fleet_doctrine_candidates.push({
          refusal,
          slots: [...slots].sort(),
          coverage_pct: Math.round((slots.length / souls.length) * 100),
        });
      } else if (slots.length === 1) {
        singleton_refusals.push({ refusal, slot: slots[0] });
      }
    }
    fleet_doctrine_candidates.sort((a, b) => b.slots.length - a.slots.length);
    singleton_refusals.sort((a, b) => a.refusal.localeCompare(b.refusal));

    const role_divergences: ConsensusResult["role_divergences"] = [];
    for (const [role, roleSlots] of roleMap.entries()) {
      if (roleSlots.length < 2) continue;
      const innerMap = roleRefMap.get(role);
      if (!innerMap) continue;
      for (const [refusal, holders] of innerMap.entries()) {
        if (holders.length === 0 || holders.length === roleSlots.length) continue;
        role_divergences.push({
          role,
          refusal,
          holders: [...holders].sort(),
          missing_from: roleSlots.filter((s) => !holders.includes(s)).sort(),
        });
      }
    }
    role_divergences.sort((a, b) =>
      a.role === b.role ? a.refusal.localeCompare(b.refusal) : a.role.localeCompare(b.role),
    );

    return {
      total_souls: souls.length,
      fleet_doctrine_candidates,
      role_divergences,
      singleton_refusals,
      distinct_refusal_count: refMap.size,
    };
  }

  static renderResult(r: ConsensusResult): string {
    return `[SOUL-CONSENSUS] n=${r.total_souls} doctrine=${r.fleet_doctrine_candidates.length} divergences=${r.role_divergences.length} singletons=${r.singleton_refusals.length}`;
  }
}

export const soulConsensusEngine = SoulConsensusEngine;
