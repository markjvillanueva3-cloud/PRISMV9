/**
 * PPG Inference Gate Schema — U-PPG-SFC-06
 * =========================================
 *
 * Schema for PPGInferenceGateWireEngine inputs and outputs.
 * Defines the baseline extraction from PPG results and adapter application.
 * Adapter resolution keyed on (controller × machine_class × dialect_family).
 *
 * @module schemas/ppgInferenceGateSchema
 * @milestone PSAU-PPG-SFC U-PPG-SFC-06
 */

import { z } from "zod";

// ─── PPG Baseline Fields ────────────────────────────────────────────────
// These are the numeric/categorical fields from PPG outputs for LoRA adaptation

export const PPG_BASELINE_FIELDS = [
  "feed_rate_override",     // % override suggestion
  "spindle_override",       // % override suggestion
  "rapid_override",         // % override suggestion
  "coolant_pressure",       // bar
  "dwell_time",             // ms per block type
  "retract_height",         // mm
  "approach_feed",          // mm/min
  "plunge_feed",            // mm/min
  "lead_in_radius",         // mm
  "lead_out_radius",        // mm
] as const;

export type PPGBaselineField = (typeof PPG_BASELINE_FIELDS)[number];

// ─── Controller Dialect ─────────────────────────────────────────────────

export const PPGControllerDialectSchema = z.enum([
  "fanuc",
  "okuma",
  "siemens",
  "haas",
  "heidenhain",
  "mazak",
  "hurco",
  "fadal",
  "brother",
  "doosan",
  "dmg_mori",
  "makino",
  "mitsubishi",
  "generic",
]);

export type PPGControllerDialect = z.infer<typeof PPGControllerDialectSchema>;

// ─── Input Schema ───────────────────────────────────────────────────────

export const PPGInferenceGateInputSchema = z.object({
  // Engine context
  engine: z.string().describe("Source PPG engine name"),
  lineage_id: z.string().optional().describe("Outcome lineage tracking ID"),

  // Baseline values - what the post processor template produces
  baseline: z.object({
    feed_rate_override: z.number().optional(),
    spindle_override: z.number().optional(),
    rapid_override: z.number().optional(),
    coolant_pressure: z.number().optional(),
    dwell_time: z.number().optional(),
    retract_height: z.number().optional(),
    approach_feed: z.number().optional(),
    plunge_feed: z.number().optional(),
    lead_in_radius: z.number().optional(),
    lead_out_radius: z.number().optional(),
  }).passthrough().describe("Baseline PPG values from post processor template"),

  // Context for adapter matching (controller × machine_class × dialect_family)
  controller: z.string().optional().describe("Controller manufacturer (fanuc, okuma, siemens, etc.)"),
  controller_version: z.string().optional().describe("Controller version (e.g., '31i-B', 'OSP-P300')"),
  dialect_family: z.string().optional().describe("Dialect family for sub-variants"),
  machine_class: z.string().optional().describe("Machine class (vmc, hmc, lathe, mill_turn, 5axis)"),
  machine_id: z.string().optional().describe("Specific machine identifier"),
  material: z.string().optional().describe("Material being cut"),
  operation: z.string().optional().describe("Operation type (roughing, finishing, drilling)"),
  customer: z.string().optional().describe("Customer for customer-specific adapters"),

  // G-code context
  block_type: z.string().optional().describe("Current block type (motion, cycle, tool_change)"),
  axis_count: z.number().optional().describe("Number of axes (3, 4, 5)"),
});

export type PPGInferenceGateInput = z.infer<typeof PPGInferenceGateInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────────

export const PPGInferenceGateOutputSchema = z.object({
  ok: z.literal(true),

  // Adapted values
  adapted: z.object({
    feed_rate_override: z.number().optional(),
    spindle_override: z.number().optional(),
    rapid_override: z.number().optional(),
    coolant_pressure: z.number().optional(),
    dwell_time: z.number().optional(),
    retract_height: z.number().optional(),
    approach_feed: z.number().optional(),
    plunge_feed: z.number().optional(),
    lead_in_radius: z.number().optional(),
    lead_out_radius: z.number().optional(),
  }).passthrough().describe("Adapted PPG values after LoRA application"),

  // Original baseline for comparison
  baseline: z.object({
    feed_rate_override: z.number().optional(),
    spindle_override: z.number().optional(),
    rapid_override: z.number().optional(),
    coolant_pressure: z.number().optional(),
    dwell_time: z.number().optional(),
    retract_height: z.number().optional(),
    approach_feed: z.number().optional(),
    plunge_feed: z.number().optional(),
    lead_in_radius: z.number().optional(),
    lead_out_radius: z.number().optional(),
  }).passthrough(),

  // Adapter info for provenance
  adapter_used: z.string().nullable().describe("Adapter ID if one was applied"),
  adapter_status: z.enum(["staged", "shadow", "canary", "active", "archived", "disabled"]).nullable(),
  adapter_hit: z.boolean().describe("Whether an adapter matched the context"),
  residual_applied: z.record(z.string(), z.number()).describe("Per-field residual deltas"),
  confidence: z.number().min(0).max(1).describe("Adapter confidence score"),

  // Context used for matching
  match_context: z.object({
    controller: z.string().optional(),
    machine_class: z.string().optional(),
    dialect_family: z.string().optional(),
    customer: z.string().optional(),
  }),

  // Gate metadata
  gate_version: z.string(),
  timestamp: z.string(),
  lineage_id: z.string().optional(),
});

export type PPGInferenceGateOutput = z.infer<typeof PPGInferenceGateOutputSchema>;

// ─── Combined result type ───────────────────────────────────────────────

export type PPGInferenceGateResult = PPGInferenceGateOutput;
