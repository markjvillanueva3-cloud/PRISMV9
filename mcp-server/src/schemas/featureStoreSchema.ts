/**
 * Feature Store Schema — U-LEARN-02
 * ==================================
 *
 * Every ML model PRISM trains reads features from the FeatureStoreEngine.
 * The schema keeps writes append-only and point-in-time correct so that a
 * training job at t=T0 only sees features observable at t=T0 (no future
 * leakage — call-out from the Evaluation-Scientist scrutiny).
 *
 * A feature row is keyed on (entity_id, event_ts) and scoped to a
 * (domain, feature_group, version) shard.  Consumers query by
 *   { entities: [...], as_of_ts, domain, feature_group }
 * and get AS-OF values — i.e. the most recent row per entity with
 * event_ts ≤ as_of_ts.
 *
 * @module schemas/featureStoreSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * A single feature-store row. Values are arbitrary JSON so any physics /
 * cost / cycle-time signal can land without schema churn. `feature_values`
 * is a flat map; consumers can pick specific keys.
 */
export const FeatureRowSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  domain: OutcomeDomain,
  feature_group: z.string().min(1),
  feature_group_version: z.string().regex(/^v\d+$/, { message: "use 'v<N>'" }),
  entity_id: z.string().min(1),
  event_ts: IsoTimestamp,
  write_ts: IsoTimestamp,
  lineage_id: z.string().optional(),
  feature_values: z.record(z.string(), z.unknown()),
  source_event_id: z.string().optional(),
});
export type FeatureRow = z.infer<typeof FeatureRowSchema>;

/**
 * Point-in-time query — AS-OF semantics prevent future leakage.
 */
export const FeatureQuerySchema = z.object({
  domain: OutcomeDomain,
  feature_group: z.string().min(1),
  feature_group_version: z.string().regex(/^v\d+$/).optional(),
  entity_ids: z.array(z.string().min(1)).min(1),
  as_of_ts: IsoTimestamp.optional(),
  feature_keys: z.array(z.string()).optional(),   // if set, project only these keys
  limit_per_entity: z.number().int().positive().default(1),
});
export type FeatureQuery = z.infer<typeof FeatureQuerySchema>;

/**
 * Put input — stored atomically to the shard file. Writer provides event_ts;
 * write_ts is stamped by the engine.
 */
export const PutFeatureInputSchema = z.object({
  domain: OutcomeDomain,
  feature_group: z.string().min(1),
  feature_group_version: z.string().regex(/^v\d+$/).default("v1"),
  entity_id: z.string().min(1),
  event_ts: IsoTimestamp,
  lineage_id: z.string().optional(),
  feature_values: z.record(z.string(), z.unknown()),
  source_event_id: z.string().optional(),
});
export type PutFeatureInput = z.infer<typeof PutFeatureInputSchema>;

/**
 * Response row (returned by `getHistoricalFeatures`).
 */
export const FeatureQueryResultRowSchema = z.object({
  entity_id: z.string(),
  event_ts: IsoTimestamp,
  feature_values: z.record(z.string(), z.unknown()),
  lineage_id: z.string().optional(),
  source_event_id: z.string().optional(),
});
export type FeatureQueryResultRow = z.infer<typeof FeatureQueryResultRowSchema>;

export const FeatureQueryResultSchema = z.object({
  domain: OutcomeDomain,
  feature_group: z.string(),
  feature_group_version: z.string(),
  as_of_ts: IsoTimestamp.optional(),
  rows: z.array(FeatureQueryResultRowSchema),
  misses: z.array(z.string()),   // entity_ids with no rows satisfying the AS-OF constraint
});
export type FeatureQueryResult = z.infer<typeof FeatureQueryResultSchema>;
