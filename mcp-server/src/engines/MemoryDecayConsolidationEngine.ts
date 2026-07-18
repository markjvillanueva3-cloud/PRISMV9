/**
 * MemoryDecayConsolidationEngine — HMEMV05 decay-driven consolidation.
 *
 * Pure-core consolidation reducer: takes a batch of fresh memories, applies
 * confidence decay, groups by key, merges via caller-supplied reducer, drops
 * entries below the confidence floor.  Mirrors hippocampal-cortical
 * consolidation: many ephemeral → fewer durable.
 *
 * Distinct from MemoryConsolidationEngine (pattern-distillation over a
 * MemoryGraph): this engine is the *decay-floor reducer* over a flat
 * entry batch — composable with U-HMEMV01 TieredMemoryEngine's promote pass.
 *
 * @module engines/MemoryDecayConsolidationEngine
 */

import { z } from "zod";

export const ConsolidationEntrySchema = z.object({
  key: z.string().min(1).max(200),
  value: z.unknown(),
  created_at: z.string().min(1),
  access_count: z.number().int().min(0),
  confidence: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
});
export type ConsolidationEntry = z.infer<typeof ConsolidationEntrySchema>;

export interface ConsolidationResult {
  consolidated: ConsolidationEntry[];
  decayed_count: number;
  merged_count: number;
  dropped_count: number;
}

export interface ConsolidationOptions {
  /** Confidence floor — below this, entries are dropped. Default 0.1. */
  minConfidence: number;
  /** Half-life for decay in milliseconds. Default 7 days. */
  decayHalfLifeMs: number;
  /** Merge reducer for same-key entries. Default: keep highest confidence. */
  mergeReducer?: (a: ConsolidationEntry, b: ConsolidationEntry) => ConsolidationEntry;
}

const DEFAULT_DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MIN_CONFIDENCE = 0.1;

export class MemoryDecayConsolidationEngine {
  static validateEntry(e: unknown): ConsolidationEntry { return ConsolidationEntrySchema.parse(e); }

  /** Apply exponential confidence decay based on age. */
  static decayConfidence(entry: ConsolidationEntry, now_at: string, halfLifeMs: number): number {
    const ageMs = Math.max(0, Date.parse(now_at) - Date.parse(entry.created_at));
    return entry.confidence * Math.pow(0.5, ageMs / halfLifeMs);
  }

  /** Consolidate a batch: decay → group by key → merge → drop below threshold. */
  static consolidate(
    entries: readonly ConsolidationEntry[],
    now_at: string = new Date().toISOString(),
    opts: Partial<ConsolidationOptions> = {},
  ): ConsolidationResult {
    if (!Array.isArray(entries)) throw new Error("MemoryDecayConsolidation.consolidate: entries must be an array");
    const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const halfLifeMs = opts.decayHalfLifeMs ?? DEFAULT_DECAY_HALF_LIFE_MS;
    const mergeReducer = opts.mergeReducer;
    for (const e of entries) ConsolidationEntrySchema.parse(e);

    // Step 1: decay confidence.
    const decayed = entries.map((e) => ({
      ...e,
      confidence: MemoryDecayConsolidationEngine.decayConfidence(e, now_at, halfLifeMs),
    }));
    const decayed_count = decayed.filter((e, i) => e.confidence < entries[i].confidence).length;

    // Step 2: group by key + merge.
    const byKey = new Map<string, ConsolidationEntry>();
    let merged_count = 0;
    for (const e of decayed) {
      const existing = byKey.get(e.key);
      if (existing) {
        merged_count += 1;
        const merged = mergeReducer
          ? mergeReducer(existing, e)
          : (e.confidence > existing.confidence ? e : existing);
        byKey.set(e.key, merged);
      } else {
        byKey.set(e.key, e);
      }
    }

    // Step 3: drop below threshold.
    const consolidated: ConsolidationEntry[] = [];
    let dropped_count = 0;
    for (const e of byKey.values()) {
      if (e.confidence >= minConfidence) consolidated.push(e);
      else dropped_count += 1;
    }

    return { consolidated, decayed_count, merged_count, dropped_count };
  }
}

export const memoryDecayConsolidationEngine = MemoryDecayConsolidationEngine;
