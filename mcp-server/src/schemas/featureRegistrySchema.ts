/**
 * Feature Registry Schema — U-LEARN-02
 * =====================================
 *
 * Declarative contract for every feature group the FeatureStoreEngine
 * accepts. DataQualityEngine reads these contracts to validate writes;
 * TrainingDatasetSnapshotEngine reads them to discover group versions;
 * StreamVsBatchReconciliationEngine reads them to know which keys to
 * compare.
 *
 * Persisted at `mcp-server/data/contracts/<domain>/<feature_group>.json`
 * and registered/read via FeatureRegistryEngine.
 *
 * @module schemas/featureRegistrySchema
 * @milestone PSAU P2.5-LEARN U-LEARN-02
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

export const FeatureType = z.enum([
  "number",
  "integer",
  "string",
  "boolean",
  "timestamp",
  "categorical",
  "json",
]);
export type FeatureTypeT = z.infer<typeof FeatureType>;

/**
 * A single feature's contract. Every feature row in the store is
 * validated against the contract for its (domain, feature_group, version).
 *
 *   - `type`        → structural shape (number, string, boolean, ...)
 *   - `nullable`    → whether missing is allowed (default: false)
 *   - `range`       → [min, max] for numeric types
 *   - `categories`  → allowed literal values for categorical
 *   - `regex`       → pattern for strings
 *   - `drift`       → drift-detection config (PSI/KS thresholds)
 */
export const FeatureContractSchema = z.object({
  name: z.string().min(1),
  type: FeatureType,
  nullable: z.boolean().default(false),
  description: z.string().optional(),
  range: z.tuple([z.number(), z.number()]).optional(),
  categories: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  regex: z.string().optional(),
  drift: z
    .object({
      /** Population Stability Index red threshold (>= triggers fail). */
      psi_red: z.number().positive().default(0.25),
      /** PSI yellow threshold (>= triggers warn, < psi_red). */
      psi_yellow: z.number().positive().default(0.10),
      /** Kolmogorov-Smirnov D red threshold. */
      ks_red: z.number().positive().max(1).default(0.20),
    })
    .optional(),
});
export type FeatureContract = z.infer<typeof FeatureContractSchema>;

/**
 * A feature group contract — one entry per (domain, feature_group, version).
 * The registry lists these; DQ validates rows against them.
 */
export const FeatureGroupContractSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  domain: OutcomeDomain,
  feature_group: z.string().min(1),
  feature_group_version: z.string().regex(/^v\d+$/, { message: "use 'v<N>'" }),
  owner: z.string().optional(),
  description: z.string().optional(),
  /** Keys required on every row. Must all appear in `features`. */
  required_keys: z.array(z.string()).default([]),
  /** All feature contracts, keyed by name (duplicate `name` values are caught at validate). */
  features: z.array(FeatureContractSchema).min(1),
  /** Human-friendly tags for dashboards. */
  tags: z.array(z.string()).optional(),
  /** Immutable after first write — set to true once the shape is frozen. */
  sealed: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type FeatureGroupContract = z.infer<typeof FeatureGroupContractSchema>;

/**
 * Input to `register()` — server stamps created_at/updated_at.
 */
export const RegisterContractInputSchema = FeatureGroupContractSchema.omit({
  schemaVersion: true,
  created_at: true,
  updated_at: true,
});
export type RegisterContractInput = z.infer<typeof RegisterContractInputSchema>;

/**
 * List filter — all fields optional. Returns contracts matching every set
 * filter. Unset filters match all.
 */
export const ListContractsQuerySchema = z.object({
  domain: OutcomeDomain.optional(),
  feature_group: z.string().optional(),
  tag: z.string().optional(),
  sealed: z.boolean().optional(),
});
export type ListContractsQuery = z.infer<typeof ListContractsQuerySchema>;
