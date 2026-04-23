/**
 * LoRA Adapter & Inference-Gate Schema — U-LEARN-07
 * ==================================================
 *
 * The belt that connects trained LoRAs to live inference. Utilization
 * Architect scrutiny (0.18 — the lowest score in any pass) said PRISM
 * trains LoRAs that never reach inference. This schema + the
 * LoRAAdapterRegistryEngine + InferenceLoRAGateEngine close that gap.
 *
 * Every recommendation engine (SpeedFeed, Kienzle, PostProcessor, …) runs
 * its baseline through the gate; if an adapter matches the request context
 * the gate applies a learned residual correction and tags provenance so
 * operators and downstream consumers can see whether a recommendation
 * came from physics alone, or physics + LoRA.
 *
 * @module schemas/loraAdapterSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-07
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Context that scopes an adapter. `material`, `operation`, `machine` are the
 * primary match keys (JM Die runs parts keyed on these three). Others are
 * optional cross-cuts (customer, hardness, tool_geometry_class).
 */
export const AdapterContextSchema = z
  .object({
    material: z.string().optional(),
    operation: z.string().optional(),
    machine: z.string().optional(),
    customer: z.string().optional(),
    hardness_hrc: z.number().optional(),
    tool_geometry_class: z.string().optional(),
  })
  .passthrough();
export type AdapterContext = z.infer<typeof AdapterContextSchema>;

/**
 * Lifecycle states. Only one adapter per (domain, context-key) is active
 * at a time. Rollback flips active ↔ archived.
 */
export const AdapterStatus = z.enum([
  "staged",         // trained, not yet gated
  "shadow",         // runs in parallel; outputs logged, not used
  "canary",         // serves a fraction of traffic
  "active",         // default serving adapter for this context
  "archived",       // superseded; kept for rollback
  "disabled",       // explicitly disabled
]);
export type AdapterStatusT = z.infer<typeof AdapterStatus>;

/**
 * A residual correction applied to a baseline recommendation. Additive,
 * multiplicative, or replacement. Recommendation engines emit numeric
 * outputs keyed by field name (sfm, ipt, doc, …); the residual map
 * applies per-field to produce the adapted value.
 *
 * Actual neural-weight loading is deliberately out of scope for this
 * unit — the field-level residual is a structured interface the
 * learned model populates. Stub implementations can use fixed residuals;
 * production uses measured deltas from the PhysicsOutcomeCalibrator.
 */
export const ResidualFieldSchema = z.object({
  kind: z.enum(["additive", "multiplicative", "replace", "clamp"]),
  value: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type ResidualField = z.infer<typeof ResidualFieldSchema>;

export const ResidualMapSchema = z.record(z.string(), ResidualFieldSchema);
export type ResidualMap = z.infer<typeof ResidualMapSchema>;

export const LoRAAdapterSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  adapter_id: z.string().min(1),
  domain: OutcomeDomain,
  version: z.string().regex(/^v\d+$/, { message: "use 'v<N>'" }),
  context: AdapterContextSchema,
  status: AdapterStatus,
  model_checkpoint_id: z.string().optional(),    // points into MLLineage
  residual: ResidualMapSchema.default({}),
  training_brier: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  created_ts: IsoTimestamp,
  updated_ts: IsoTimestamp,
  notes: z.string().optional(),
});
export type LoRAAdapter = z.infer<typeof LoRAAdapterSchema>;

// -------------------------- Input schemas --------------------------

export const RegisterAdapterInputSchema = z.object({
  adapter_id: z.string().min(1),
  domain: OutcomeDomain,
  version: z.string().regex(/^v\d+$/).default("v1"),
  context: AdapterContextSchema.default({}),
  model_checkpoint_id: z.string().optional(),
  residual: ResidualMapSchema.optional(),
  status: AdapterStatus.default("staged"),
  training_brier: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});
export type RegisterAdapterInput = z.infer<typeof RegisterAdapterInputSchema>;

export const SetStatusInputSchema = z.object({
  adapter_id: z.string().min(1),
  status: AdapterStatus,
  reason: z.string().optional(),
});
export type SetStatusInput = z.infer<typeof SetStatusInputSchema>;

export const ResolveAdapterInputSchema = z.object({
  domain: OutcomeDomain,
  context: AdapterContextSchema,
  require_status: z.array(AdapterStatus).default(["active", "canary"]),
});
export type ResolveAdapterInput = z.infer<typeof ResolveAdapterInputSchema>;

// -------------------------- Inference gate --------------------------

export const ApplyGateInputSchema = z.object({
  engine_name: z.string().min(1),
  domain: OutcomeDomain,
  context: AdapterContextSchema,
  baseline: z.record(z.string(), z.number()),
  lineage_id: z.string().optional(),
});
export type ApplyGateInput = z.infer<typeof ApplyGateInputSchema>;

export const ApplyGateResultSchema = z.object({
  adapted: z.record(z.string(), z.number()),
  baseline: z.record(z.string(), z.number()),
  adapter_used: z.string().nullable(),
  adapter_status: AdapterStatus.nullable(),
  residual_applied: z.record(z.string(), z.number()),
  confidence: z.number().min(0).max(1),
  provenance: z.object({
    engine_name: z.string(),
    domain: OutcomeDomain,
    context: AdapterContextSchema,
    gate_version: z.string(),
    timestamp: IsoTimestamp,
    lineage_id: z.string().optional(),
  }),
});
export type ApplyGateResult = z.infer<typeof ApplyGateResultSchema>;
