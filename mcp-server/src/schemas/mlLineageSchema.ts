/**
 * ML Lineage Schema — U-LEARN-02 (companion to FeatureStore)
 * ============================================================
 *
 * Every ML prediction PRISM ever emits must be traceable back to the
 * raw events → features → training examples → model checkpoint that
 * caused it, AND traceable forward to the outcome event that validated
 * (or invalidated) it.
 *
 * Data-Pipeline scrutiny (0.28) called this the load-bearing gap:
 * "we can't answer 'which training example caused this bad prediction'
 * in one query." This schema + MLLineageEngine close that gap.
 *
 * Graph model:
 *   NODE    = typed reference to a concrete artifact
 *   EDGE    = directed causal relation between two nodes
 *
 * The graph is append-only and stored as JSONL edges at
 *   state/lineage/edges.jsonl
 * Consumers walk the graph in-memory with O(edges) scans. At 10k
 * predictions/day this stays under 20MB/year uncompressed.
 *
 * @module schemas/mlLineageSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-02 (lineage subunit)
 */

import { z } from "zod";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Node kinds — the seven canonical artifact classes in the ML pipeline.
 * Each carries an opaque id (string) identifying the concrete artifact.
 */
export const LineageNodeKind = z.enum([
  "raw_event",           // OutcomeCaptureBus event_id
  "feature_row",         // FeatureStore row key
  "training_example",    // a row in a training dataset snapshot
  "model_checkpoint",    // a LoRA / transformer weight bundle id
  "prediction",          // a recommendation emitted by an engine
  "outcome_event",       // an OutcomeCaptureBus event validating a prediction
  "deployment",          // a registry entry pinning a model to prod
]);
export type LineageNodeKindT = z.infer<typeof LineageNodeKind>;

/**
 * Relation kinds — the allowed directed edges between node kinds. We
 * intentionally keep this list closed so the graph stays reasonable to
 * reason about.
 */
export const LineageRelation = z.enum([
  "derived_from",        // feature_row derived_from raw_event
  "included_in",         // feature_row included_in training_example
  "trained_on",          // model_checkpoint trained_on training_example
  "produced_by",         // prediction produced_by model_checkpoint
  "validated_by",        // prediction validated_by outcome_event
  "deployed_as",         // model_checkpoint deployed_as deployment
  "served_by",           // prediction served_by deployment
]);
export type LineageRelationT = z.infer<typeof LineageRelation>;

export const LineageNodeRefSchema = z.object({
  kind: LineageNodeKind,
  id: z.string().min(1),
});
export type LineageNodeRef = z.infer<typeof LineageNodeRefSchema>;

export const LineageEdgeSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  edge_id: z.string().min(1),
  from: LineageNodeRefSchema,
  to: LineageNodeRefSchema,
  relation: LineageRelation,
  lineage_id: z.string().optional(),           // the run/session threading token
  created_ts: IsoTimestamp,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LineageEdge = z.infer<typeof LineageEdgeSchema>;

export const LinkInputSchema = z.object({
  from: LineageNodeRefSchema,
  to: LineageNodeRefSchema,
  relation: LineageRelation,
  lineage_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LinkInput = z.infer<typeof LinkInputSchema>;

export const TraceInputSchema = z.object({
  node: LineageNodeRefSchema,
  direction: z.enum(["forward", "backward"]),
  max_depth: z.number().int().positive().max(32).default(6),
  relations: z.array(LineageRelation).optional(),
});
export type TraceInput = z.infer<typeof TraceInputSchema>;

export const TraceResultSchema = z.object({
  root: LineageNodeRefSchema,
  direction: z.enum(["forward", "backward"]),
  edges: z.array(LineageEdgeSchema),
  nodes: z.array(LineageNodeRefSchema),
  truncated_at_depth: z.boolean(),
});
export type TraceResult = z.infer<typeof TraceResultSchema>;
