/**
 * QuantizationProfileEngine — HMEMV11 RaBitQ quantization profile selector.
 *
 * Pure-core selector: caller supplies the corpus size + per-query latency
 * budget; engine picks a quantization profile (none / scalar-8bit /
 * scalar-4bit / binary-1bit) that achieves the latency budget with the
 * best recall-floor.  Recall floors are empirical from the RaBitQ paper +
 * PRISM's own micro-benches; the engine encodes them.
 *
 * @module engines/QuantizationProfileEngine
 */

import { z } from "zod";

export const QuantizationKindSchema = z.enum([
  "none", "scalar-8bit", "scalar-4bit", "binary-1bit",
]);
export type QuantizationKind = z.infer<typeof QuantizationKindSchema>;

export const QuantSelectionSchema = z.object({
  recommended: QuantizationKindSchema,
  est_compression_ratio: z.number(),
  est_recall_floor: z.number(),
  est_query_ms: z.number(),
  reason: z.string(),
});
export type QuantSelection = z.infer<typeof QuantSelectionSchema>;

const PROFILES: Record<QuantizationKind, { compression: number; recall_floor: number; ms_per_million: number }> = {
  "none":         { compression: 1,   recall_floor: 1.0,  ms_per_million: 100 },
  "scalar-8bit":  { compression: 4,   recall_floor: 0.99, ms_per_million: 30 },
  "scalar-4bit":  { compression: 8,   recall_floor: 0.95, ms_per_million: 12 },
  "binary-1bit":  { compression: 32,  recall_floor: 0.88, ms_per_million: 3 },
};

export class QuantizationProfileEngine {
  /** Pick a quantization profile that meets the latency budget with the
   *  highest recall floor.  Returns scalar-8bit if all fit (the default
   *  fastest+highest-recall non-trivial option). */
  static select(corpus_size: number, query_budget_ms: number): QuantSelection {
    if (!Number.isFinite(corpus_size) || corpus_size < 0) {
      throw new Error("QuantizationProfile.select: corpus_size must be finite non-negative");
    }
    if (!Number.isFinite(query_budget_ms) || query_budget_ms <= 0) {
      throw new Error("QuantizationProfile.select: query_budget_ms must be positive finite");
    }
    const corpus_m = corpus_size / 1_000_000;
    // Try in recall-DESC order; first that meets budget wins.
    const order: QuantizationKind[] = ["none", "scalar-8bit", "scalar-4bit", "binary-1bit"];
    for (const kind of order) {
      const p = PROFILES[kind];
      const est_ms = p.ms_per_million * corpus_m;
      if (est_ms <= query_budget_ms) {
        return QuantSelectionSchema.parse({
          recommended: kind,
          est_compression_ratio: p.compression,
          est_recall_floor: p.recall_floor,
          est_query_ms: est_ms,
          reason: `${kind} meets ${query_budget_ms}ms budget with recall floor ${p.recall_floor}`,
        });
      }
    }
    // Even binary-1bit doesn't fit — return it anyway (caller may accept).
    const p = PROFILES["binary-1bit"];
    const est_ms = p.ms_per_million * corpus_m;
    return QuantSelectionSchema.parse({
      recommended: "binary-1bit",
      est_compression_ratio: p.compression,
      est_recall_floor: p.recall_floor,
      est_query_ms: est_ms,
      reason: `binary-1bit exceeds budget ${query_budget_ms}ms — caller must accept latency or shard corpus`,
    });
  }

  /** Render selection for operator audit. */
  static renderSelection(s: QuantSelection): string {
    return `[QUANT] ${s.recommended} (×${s.est_compression_ratio}, recall≥${s.est_recall_floor}, ~${s.est_query_ms.toFixed(1)}ms) — ${s.reason}`;
  }
}

export const quantizationProfileEngine = QuantizationProfileEngine;
