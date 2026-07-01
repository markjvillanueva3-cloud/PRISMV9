/**
 * cadSchema.ts -- Zod schemas for BlueprintOCRAdapter and SFCInferenceGateWireEngine
 * wiring actions in prism_cad.
 *
 * Two new actions wired in U-INDIA-WIRE-4-UNWIRED:
 *
 *   blueprint_ocr_schema_get
 *     Exposes the BlueprintOCRAdapter contract: returns the type schema
 *     (field names + descriptions) and calls summarizeConfidence on a
 *     caller-supplied confidence array. Pure -- no backend, no I/O.
 *     Natural home: prism_cad (blueprint domain, same dispatcher as
 *     cad_live_blueprint_ocr). Does NOT invoke a concrete OCR backend
 *     (implementations are deferred per U-OCR-EDOCR2-IMPL).
 *
 *   sfc_inference_gate_apply
 *     Apply the SFCInferenceGateWireEngine to a caller-supplied SFC
 *     baseline. Returns adapted values + adapter_used + residual_applied +
 *     adapter_hit + confidence. Natural home: prism_cad (speed-feed-to-CAD
 *     inference layer; the oscar slot owns the full SFC stack but this
 *     engine's output feeds the CAD/program pipeline).
 *     NOTE: the canonical deep wiring (prism_calc:ultimate_speed_feed ->
 *     this engine) lives on slot/india and is not yet merged. This action
 *     exposes the engine surface directly via prism_cad in the interim,
 *     consistent with the adapter's "wraps SFC outputs" role in the
 *     print-to-program pipeline.
 *
 * All schemas use .passthrough() so extra debug/metadata keys flow through.
 */

import { z } from "zod";

// ============================================================================
// blueprint_ocr_schema_get
// Returns the BlueprintOCRAdapter contract schema + confidence summary helper.
// No concrete OCR backend is invoked -- pure metadata + math.
// ============================================================================

export const blueprint_ocr_schema_get = z
  .object({
    op: z
      .enum(["schema", "summarize_confidence"])
      .optional()
      .describe(
        "Operation. " +
        "'schema' (default): return the BlueprintOCRAdapter field contract " +
        "(ExtractedDimension / GDTCallout / PMIAnnotation / BlueprintOCRResult types). " +
        "'summarize_confidence': aggregate a caller-supplied array of per-field " +
        "confidence scores into { overall, min, low_confidence_count, missing_confidence_count }."
      ),
    // -- summarize_confidence fields --
    confidences: z
      .array(z.number().min(0).max(1))
      .optional()
      .describe(
        "Per-field confidence values in [0, 1] (required when op='summarize_confidence'). " +
        "The engine computes geometric mean (overall), min, low-count (< low_threshold), " +
        "and missing-count (NaN/non-numeric)."
      ),
    low_threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "Confidence threshold below which a field is counted as low-confidence. " +
        "Default 0.7 (per BlueprintOCRAdapter contract)."
      ),
  })
  .passthrough();

// ============================================================================
// sfc_inference_gate_apply
// Apply SFCInferenceGateWireEngine to an SFC baseline.
// Returns adapted values + adapter_used + residual_applied + confidence.
// NEVER BLOCKS: gate-miss falls back to baseline with adapter_hit: false.
// ============================================================================

export const sfc_inference_gate_apply = z
  .object({
    // -- required baseline --
    baseline: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        "Flat numeric SFC baseline fields to adapt. " +
        "Standard keys: vc (m/min), rpm, fpt (mm), fpr (mm), feed_rate (mm/min), " +
        "doc (mm), woc (mm), mrr (cm3/min), sfm. " +
        "Non-numeric / NaN values are silently skipped."
      ),
    // -- context for adapter matching --
    material: z
      .string()
      .optional()
      .describe("Material name or grade (e.g. '1045', 'Ti-6Al-4V'). Alias: iso_group."),
    iso_group: z
      .string()
      .optional()
      .describe("ISO material group (P/M/K/N/S/H). Used when material is absent."),
    operation: z
      .string()
      .optional()
      .describe(
        "Machining operation type (e.g. 'roughing', 'finishing', 'drilling', 'threading')."
      ),
    machine_id: z
      .string()
      .optional()
      .describe("Machine identifier (e.g. 'VMC-01', 'MULTUS-B250'). Alias: machine_type."),
    machine_type: z.string().optional().describe("Alias for machine_id."),
    tool_class: z
      .string()
      .optional()
      .describe(
        "Tool geometry class (e.g. 'end_mill_4fl', 'insert_CNMG', 'drill_carbide')."
      ),
    customer: z.string().optional().describe("Customer name for adapter matching context."),
    engine: z
      .string()
      .optional()
      .describe(
        "Originating SFC engine name (e.g. 'UltimateSpeedFeedEngine'). " +
        "Defaults to 'SFCEngine' when absent."
      ),
    lineage_id: z
      .string()
      .optional()
      .describe(
        "Caller-supplied lineage id for provenance tracing " +
        "(flows through to SFCProvenanceWireEngine)."
      ),
  })
  .passthrough();

export const CAD_INDIA_WIRE_SCHEMAS = {
  blueprint_ocr_schema_get,
  sfc_inference_gate_apply,
} as const;
