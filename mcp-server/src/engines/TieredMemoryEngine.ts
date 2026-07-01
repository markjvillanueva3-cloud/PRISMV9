/**
 * TieredMemoryEngine — HMEMV01 3-tier memory store (working/episodic/semantic).
 *
 * Pure-core Mnemosyne-pattern tiered store: working memory (fast, small,
 * volatile), episodic memory (medium-term per-session), semantic memory
 * (long-term durable).  Entries promote across tiers on access frequency +
 * age; demote on staleness.  No I/O — caller supplies persistence.
 *
 * Composes with U-HAGI08 SourceChainEngine for provenance; every entry
 * carries an optional source_chain.
 *
 * @module engines/TieredMemoryEngine
 */

import { z } from "zod";

export const MemoryTierSchema = z.enum(["working", "episodic", "semantic"]);
export type MemoryTier = z.infer<typeof MemoryTierSchema>;

export const MemoryEntrySchema = z.object({
  entry_id: z.string().min(1).max(120),
  key: z.string().min(1).max(200),
  value: z.unknown(),
  tier: MemoryTierSchema,
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  accessed_at: z.string().min(1),
  access_count: z.number().int().min(0),
  ttl_ms: z.number().int().min(0).optional(),
  source_chain_id: z.string().max(120).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
});
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export interface TieredMemoryState {
  working: MemoryEntry[];
  episodic: MemoryEntry[];
  semantic: MemoryEntry[];
}

export interface PromotionPolicy {
  /** Min access_count to promote from working → episodic. Default 3. */
  workingToEpisodicMinAccess: number;
  /** Min access_count to promote from episodic → semantic. Default 8. */
  episodicToSemanticMinAccess: number;
  /** Max working tier size before LRU eviction to episodic. Default 50. */
  workingTierMaxSize: number;
}

const DEFAULT_POLICY: PromotionPolicy = {
  workingToEpisodicMinAccess: 3,
  episodicToSemanticMinAccess: 8,
  workingTierMaxSize: 50,
};

export class TieredMemoryEngine {
  static validateEntry(e: unknown): MemoryEntry { return MemoryEntrySchema.parse(e); }

  static empty(): TieredMemoryState {
    return { working: [], episodic: [], semantic: [] };
  }

  /** Insert a new entry into the working tier.  Throws on duplicate entry_id. */
  static insert(
    state: TieredMemoryState,
    entry: Omit<MemoryEntry, "tier" | "access_count" | "accessed_at" | "updated_at">,
    at: string = new Date().toISOString(),
  ): TieredMemoryState {
    const all = [...state.working, ...state.episodic, ...state.semantic];
    if (all.some((e) => e.entry_id === entry.entry_id)) {
      throw new Error(`TieredMemory.insert: duplicate entry_id ${entry.entry_id}`);
    }
    const full: MemoryEntry = {
      ...entry,
      tier: "working",
      access_count: 0,
      accessed_at: at,
      updated_at: at,
    };
    MemoryEntrySchema.parse(full);
    return { ...state, working: [...state.working, full] };
  }

  /** Look up an entry by key across all tiers.  Returns the entry plus its
   *  tier; increments access_count + accessed_at on hit.  Returns null on miss. */
  static recall(
    state: TieredMemoryState,
    key: string,
    at: string = new Date().toISOString(),
  ): { state: TieredMemoryState; entry: MemoryEntry | null } {
    for (const tier of ["working", "episodic", "semantic"] as const) {
      const list = state[tier];
      const idx = list.findIndex((e) => e.key === key);
      if (idx >= 0) {
        const hit: MemoryEntry = {
          ...list[idx],
          access_count: list[idx].access_count + 1,
          accessed_at: at,
        };
        const newList = [...list];
        newList[idx] = hit;
        return { state: { ...state, [tier]: newList }, entry: hit };
      }
    }
    return { state, entry: null };
  }

  /** Run promotion + LRU-eviction pass.  Working→episodic by access threshold,
   *  episodic→semantic by access threshold, working LRU eviction to episodic
   *  when working tier exceeds maxSize.  Returns the new state. */
  static promote(
    state: TieredMemoryState,
    policy: Partial<PromotionPolicy> = {},
  ): TieredMemoryState {
    const p = { ...DEFAULT_POLICY, ...policy };
    let working = [...state.working];
    let episodic = [...state.episodic];
    let semantic = [...state.semantic];

    // Pass 1: working → episodic by access threshold.
    const promoteW: MemoryEntry[] = [];
    working = working.filter((e) => {
      if (e.access_count >= p.workingToEpisodicMinAccess) {
        promoteW.push({ ...e, tier: "episodic" });
        return false;
      }
      return true;
    });
    episodic = [...episodic, ...promoteW];

    // Pass 2: episodic → semantic by access threshold.
    const promoteE: MemoryEntry[] = [];
    episodic = episodic.filter((e) => {
      if (e.access_count >= p.episodicToSemanticMinAccess) {
        promoteE.push({ ...e, tier: "semantic" });
        return false;
      }
      return true;
    });
    semantic = [...semantic, ...promoteE];

    // Pass 3: LRU eviction of working → episodic when over capacity.
    if (working.length > p.workingTierMaxSize) {
      // Sort working by accessed_at ASC (oldest first) and evict the head until under cap.
      const sorted = [...working].sort((a, b) => a.accessed_at.localeCompare(b.accessed_at));
      const evictCount = working.length - p.workingTierMaxSize;
      const evict = sorted.slice(0, evictCount);
      const keep = sorted.slice(evictCount);
      working = keep;
      episodic = [...episodic, ...evict.map((e) => ({ ...e, tier: "episodic" as const }))];
    }

    return { working, episodic, semantic };
  }

  /** Drop entries whose TTL has expired (entry.created_at + ttl_ms < now). */
  static expire(
    state: TieredMemoryState,
    at: string = new Date().toISOString(),
  ): { state: TieredMemoryState; expired: MemoryEntry[] } {
    const nowMs = Date.parse(at);
    const expired: MemoryEntry[] = [];
    const filter = (list: MemoryEntry[]): MemoryEntry[] => list.filter((e) => {
      if (e.ttl_ms === undefined) return true;
      const expiresAt = Date.parse(e.created_at) + e.ttl_ms;
      if (expiresAt <= nowMs) {
        expired.push(e);
        return false;
      }
      return true;
    });
    return {
      state: {
        working: filter(state.working),
        episodic: filter(state.episodic),
        semantic: filter(state.semantic),
      },
      expired,
    };
  }

  /** Aggregate counts per tier for operator dashboards. */
  static stats(state: TieredMemoryState): { working: number; episodic: number; semantic: number; total: number } {
    const w = state.working.length;
    const e = state.episodic.length;
    const s = state.semantic.length;
    return { working: w, episodic: e, semantic: s, total: w + e + s };
  }

  /** Render tiered-memory state for operator audit. */
  static renderState(state: TieredMemoryState): string {
    const s = TieredMemoryEngine.stats(state);
    return [
      `[TIERED-MEMORY] total=${s.total} working=${s.working} episodic=${s.episodic} semantic=${s.semantic}`,
      `  working: ${state.working.map((e) => e.key).slice(0, 5).join(", ")}${state.working.length > 5 ? ", …" : ""}`,
      `  episodic: ${state.episodic.map((e) => e.key).slice(0, 5).join(", ")}${state.episodic.length > 5 ? ", …" : ""}`,
      `  semantic: ${state.semantic.map((e) => e.key).slice(0, 5).join(", ")}${state.semantic.length > 5 ? ", …" : ""}`,
    ].join("\n");
  }
}

export const tieredMemoryEngine = TieredMemoryEngine;
