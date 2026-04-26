/**
 * SFC Inference Gate Schema — U-PPG-SFC-05
 * =========================================
 *
 * Schema for SFCInferenceGateWireEngine inputs and outputs.
 * Defines the baseline extraction from SFC results and adapter application.
 *
 * @module schemas/sfcInferenceGateSchema
 * @milestone PSAU-PPG-SFC U-PPG-SFC-05
 */

import { z } from "zod";

// ─── SFC Baseline Fields ────────────────────────────────────────────────
// These are the numeric fields extracted from SFC results for LoRA adaptation

export const SFC_BASELINE_FIELDS = [
  "sfm",           // surface feet per minute / cutting speed
  "vc",            // cutting speed m/min (metric)
  "rpm",           // spindle RPM
  "fpt",           // feed per tooth (mm)
  "fpr",           // feed per rev (mm) - turning/drilling
  "feed_rate",     // table feed mm/min
  "doc",           // depth of cut / axial depth (mm)
  "woc",           // width of cut / radial depth (mm)
  "mrr",           // material removal rate cm³/min
] as const;

export type SFCBaselineField = (typeof SFC_BASELINE_FIELDS)[number];

// ─── Input Schema ───────────────────────────────────────────────────────

export const SFCInferenceGateInputSchema = z.object({
  // Engine context
  engine: z.string().describe("Source SFC engine name"),
  lineage_id: z.string().optional().describe("Outcome lineage tracking ID"),

  // Baseline values - what the formula/physics calculated
  baseline: z.object({
    sfm: z.number().optional(),
    vc: z.number().optional(),
    rpm: z.number().optional(),
    fpt: z.number().optional(),
    fpr: z.number().optional(),
    feed_rate: z.number().optional(),
    doc: z.number().optional(),
    woc: z.number().optional(),
    mrr: z.number().optional(),
  }).passthrough().describe("Baseline SFC values from physics calculation"),

  // Context for adapter matching
  material: z.string().optional().describe("Material name or grade"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  tool_class: z.string().optional().describe("Tool class (endmill, drill, insert, etc.)"),
  tool_material: z.string().optional().describe("Tool material (carbide, HSS, ceramic)"),
  machine_id: z.string().optional().describe("Machine identifier"),
  machine_type: z.string().optional().describe("Machine type (vmc, hmc, lathe)"),
  operation: z.string().optional().describe("Operation type (roughing, finishing, slotting)"),
  customer: z.string().optional().describe("Customer for customer-specific adapters"),
});

export type SFCInferenceGateInput = z.infer<typeof SFCInferenceGateInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────────

export const SFCInferenceGateOutputSchema = z.object({
  ok: z.literal(true),

  // Adapted values
  adapted: z.object({
    sfm: z.number().optional(),
    vc: z.number().optional(),
    rpm: z.number().optional(),
    fpt: z.number().optional(),
    fpr: z.number().optional(),
    feed_rate: z.number().optional(),
    doc: z.number().optional(),
    woc: z.number().optional(),
    mrr: z.number().optional(),
  }).passthrough().describe("Adapted SFC values after LoRA application"),

  // Original baseline for comparison
  baseline: z.object({
    sfm: z.number().optional(),
    vc: z.number().optional(),
    rpm: z.number().optional(),
    fpt: z.number().optional(),
    fpr: z.number().optional(),
    feed_rate: z.number().optional(),
    doc: z.number().optional(),
    woc: z.number().optional(),
    mrr: z.number().optional(),
  }).passthrough(),

  // Adapter info for provenance
  adapter_used: z.string().nullable().describe("Adapter ID if one was applied"),
  adapter_status: z.enum(["staged", "shadow", "canary", "active", "archived", "disabled"]).nullable(),
  adapter_hit: z.boolean().describe("Whether an adapter matched the context"),
  residual_applied: z.record(z.string(), z.number()).describe("Per-field residual deltas"),
  confidence: z.number().min(0).max(1).describe("Adapter confidence score"),

  // Context used for matching
  match_context: z.object({
    material: z.string().optional(),
    operation: z.string().optional(),
    machine: z.string().optional(),
    customer: z.string().optional(),
  }),

  // Gate metadata
  gate_version: z.string(),
  timestamp: z.string(),
  lineage_id: z.string().optional(),
});

export type SFCInferenceGateOutput = z.infer<typeof SFCInferenceGateOutputSchema>;

// ─── Fallback output for gate-miss ──────────────────────────────────────

export const SFCInferenceGateFallbackSchema = z.object({
  ok: z.literal(true),
  adapted: z.record(z.string(), z.number().optional()),
  baseline: z.record(z.string(), z.number().optional()),
  adapter_used: z.null(),
  adapter_status: z.null(),
  adapter_hit: z.literal(false),
  residual_applied: z.object({}),
  confidence: z.literal(0),
  match_context: z.object({
    material: z.string().optional(),
    operation: z.string().optional(),
    machine: z.string().optional(),
    customer: z.string().optional(),
  }),
  gate_version: z.string(),
  timestamp: z.string(),
  lineage_id: z.string().optional(),
});

// ─── Combined result type ───────────────────────────────────────────────

export type SFCInferenceGateResult = SFCInferenceGateOutput;
