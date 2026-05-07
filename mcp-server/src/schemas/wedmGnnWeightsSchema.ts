/**
 * WEDM GNN Weights Schema — v1
 *
 * Schema for `data/state/WEDM_GNN_WEIGHTS.json`, the trained Graph-Attention
 * weights produced by `WEDMGraphAttentionEngine` (MS-P5-GNN / U-P5-GNN-02).
 *
 * Layer shape (per Veličković 2017 GAT, h=4 multi-head):
 *   - heads = 4
 *   - inDim  = 64  (matches LATTICE_EMBEDDING_DIM)
 *   - perHeadDim = 16
 *   - outDim = heads × perHeadDim = 64
 *   - W^k  ∈ ℝ^(perHeadDim × inDim)        — feature transform per head k
 *   - a^k  ∈ ℝ^(2 × perHeadDim)            — attention vector per head k
 *
 * Total trainable params per head: 16·64 + 2·16 = 1056. Total layer: 4224.
 *
 * @module schemas/wedmGnnWeightsSchema
 */

import { z } from "zod";

export const WEDM_GNN_HEADS = 4 as const;
export const WEDM_GNN_IN_DIM = 64 as const;
export const WEDM_GNN_PER_HEAD_DIM = 16 as const;
export const WEDM_GNN_OUT_DIM = WEDM_GNN_HEADS * WEDM_GNN_PER_HEAD_DIM; // 64

/** A single attention head: W and a vectors. */
export const WEDMGnnHeadSchema = z.object({
  /** Feature transform W^k of shape [perHeadDim][inDim]. */
  W: z.array(z.array(z.number().finite()).length(WEDM_GNN_IN_DIM)).length(WEDM_GNN_PER_HEAD_DIM),
  /** Attention vector a^k of shape [2 * perHeadDim]. */
  a: z.array(z.number().finite()).length(2 * WEDM_GNN_PER_HEAD_DIM),
}).strict();
export type WEDMGnnHead = z.infer<typeof WEDMGnnHeadSchema>;

export const WEDMGnnWeightsSchema = z.object({
  schemaVersion: z.literal(1),
  /** ISO-8601 of the weight snapshot. */
  generatedAt: z.string().datetime(),
  /** Layer shape. */
  heads: z.literal(WEDM_GNN_HEADS),
  inDim: z.literal(WEDM_GNN_IN_DIM),
  perHeadDim: z.literal(WEDM_GNN_PER_HEAD_DIM),
  /** Per-head weights array (length = heads). */
  layer: z.array(WEDMGnnHeadSchema).length(WEDM_GNN_HEADS),
  /** Number of training steps taken. */
  steps: z.number().finite().nonnegative().int(),
  /** Last loss observed (BCE on edge prediction). */
  lastLoss: z.number().finite().nonnegative(),
  /** Number of training jobs ingested at last train. */
  trainedOnJobs: z.number().finite().nonnegative().int(),
  /** Number of training edges seen at last train. */
  trainedOnEdges: z.number().finite().nonnegative().int(),
  /** RNG seed used for init (kept for reproducibility). */
  seed: z.number().finite().int(),
}).strict();
export type WEDMGnnWeights = z.infer<typeof WEDMGnnWeightsSchema>;
