// ORPHAN ON THIS BRANCH (2026-06-22 audit, U-SFC-WIRE-EXEMPT-AUDIT): the prior "called by SFC engines
// internally" WIRE-EXEMPT was misleading -- grep-verified NO file on cad-fusion-live-ms0 imports
// sfcInferenceGateWireEngine (refs are reverse-direction metadata strings only). NOTE: the real wiring
// (prism_calc:ultimate_speed_feed -> this engine, U-LA1-SFC-GATE-WIRE 3d470ac75f) EXISTS on slot/india but
// is NOT merged here (india verified 2026-06-15, [[reference_sfc_inference_gate_wire_la1_2026_06_01]]).
// Fix = MERGE/PORT that wiring, not build new. Keyword removed so the unwired audit surfaces the gap honestly.
/**
 * SFCInferenceGateWireEngine — U-PPG-SFC-05
 * ==========================================
 *
 * Wraps SFC engine outputs through the InferenceLoRAGate for adapter delivery.
 * Every SFC recommendation passes through this gate; if an adapter matches
 * the (material × tool_class × machine_id × op_type) context, the gate applies
 * learned residual corrections to the baseline physics values.
 *
 * Design invariants:
 *   1. NEVER BLOCK. Gate-miss falls back to baseline gracefully.
 *   2. ADAPTER INFO SURFACES. adapter_used, residual_applied always populated.
 *   3. PROVENANCE INTEGRATION. Output feeds into SFCProvenanceWireEngine.
 *   4. CONFIDENCE PROPAGATES. Adapter confidence flows to provenance.
 *
 * The belt connecting trained SFC LoRAs to live inference:
 *   UltimateSpeedFeedEngine.calculate() → baseline
 *   SFCInferenceGateWireEngine.apply() → adapted + adapter_info
 *   SFCProvenanceWireEngine.cite() → full provenance
 *
 * @module engines/SFCInferenceGateWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-05
 */

import {
  InferenceLoRAGateEngine,
  inferenceLoRAGateEngine,
} from "./InferenceLoRAGateEngine.js";
import type { AdapterContext } from "../schemas/loraAdapterSchema.js";
import {
  SFCInferenceGateInputSchema,
  type SFCInferenceGateInput,
  type SFCInferenceGateResult,
  SFC_BASELINE_FIELDS,
} from "../schemas/sfcInferenceGateSchema.js";

const GATE_VERSION = "1.0.0" as const;

// ─── Singleton ──────────────────────────────────────────────────────────

export class SFCInferenceGateWireEngine {
  private readonly gate: InferenceLoRAGateEngine;

  constructor(gate: InferenceLoRAGateEngine = inferenceLoRAGateEngine) {
    this.gate = gate;
  }

  /**
   * Apply the inference gate to SFC baseline values.
   * If an adapter matches the context, applies learned residuals.
   * Gate-miss falls back to baseline with adapter_hit: false.
   */
  apply(input: SFCInferenceGateInput): SFCInferenceGateResult {
    const parsed = SFCInferenceGateInputSchema.safeParse(input);
    const timestamp = new Date().toISOString();

    // Extract baseline as Record<string, number>
    const baseline = this.extractBaseline(parsed.success ? parsed.data.baseline : input.baseline ?? {});

    // Build context for adapter matching
    const matchContext: AdapterContext = {
      material: input.material ?? input.iso_group,
      operation: input.operation,
      machine: input.machine_id ?? input.machine_type,
      customer: input.customer,
      tool_geometry_class: input.tool_class,
    };

    // Call the inference gate
    const gateResult = this.gate.apply({
      engine_name: input.engine ?? "SFCEngine",
      domain: "speed_feed",
      context: matchContext,
      baseline,
      lineage_id: input.lineage_id,
    });

    const adapterHit = gateResult.adapter_used !== null;

    return {
      ok: true,
      adapted: gateResult.adapted,
      baseline: gateResult.baseline,
      adapter_used: gateResult.adapter_used,
      adapter_status: gateResult.adapter_status,
      adapter_hit: adapterHit,
      residual_applied: gateResult.residual_applied,
      confidence: gateResult.confidence,
      match_context: {
        material: matchContext.material,
        operation: matchContext.operation,
        machine: matchContext.machine,
        customer: matchContext.customer,
      },
      gate_version: GATE_VERSION,
      timestamp,
      lineage_id: input.lineage_id,
    };
  }

  /**
   * Convenience method: apply gate and merge adapted values back into
   * a UltimateSpeedFeedResult-like structure.
   */
  applyToSFCResult<T extends Record<string, unknown>>(
    sfcResult: T,
    input: Omit<SFCInferenceGateInput, "baseline">,
  ): { result: T; gateOutput: SFCInferenceGateResult } {
    // Extract baseline from nested OptimizedValue structures
    const baseline = this.extractFromOptimizedValues(sfcResult);

    const gateOutput = this.apply({
      ...input,
      baseline,
    });

    // Merge adapted values back
    // Filter to only defined numeric values
    const adaptedNumbers: Record<string, number> = {};
    for (const [k, v] of Object.entries(gateOutput.adapted)) {
      if (typeof v === "number") adaptedNumbers[k] = v;
    }
    const result = this.mergeAdaptedValues(sfcResult, adaptedNumbers);

    return { result, gateOutput };
  }

  /**
   * Extract numeric baseline from SFC result with OptimizedValue structures.
   */
  private extractFromOptimizedValues(sfcResult: Record<string, unknown>): Record<string, number> {
    const baseline: Record<string, number> = {};

    // Map from SFC result field names to baseline field names
    const fieldMappings: Record<string, string> = {
      cutting_speed: "vc",
      spindle_rpm: "rpm",
      feed_per_tooth: "fpt",
      feed_per_rev: "fpr",
      feed_rate: "feed_rate",
      axial_depth: "doc",
      radial_depth: "woc",
      mrr: "mrr",
    };

    for (const [resultField, baselineField] of Object.entries(fieldMappings)) {
      const field = sfcResult[resultField];
      if (field && typeof field === "object" && "value" in field) {
        const value = (field as { value: unknown }).value;
        if (typeof value === "number" && !Number.isNaN(value)) {
          baseline[baselineField] = value;
        }
      }
    }

    // Also extract sfm if cutting_speed exists (convert m/min to sfm)
    if (baseline.vc !== undefined) {
      baseline.sfm = baseline.vc * 3.281; // m/min to ft/min
    }

    return baseline;
  }

  /**
   * Merge adapted values back into SFC result structure.
   */
  private mergeAdaptedValues<T extends Record<string, unknown>>(
    sfcResult: T,
    adapted: Record<string, number>,
  ): T {
    const result = { ...sfcResult } as Record<string, unknown>;

    // Reverse mapping
    const reverseMappings: Record<string, string> = {
      vc: "cutting_speed",
      rpm: "spindle_rpm",
      fpt: "feed_per_tooth",
      fpr: "feed_per_rev",
      feed_rate: "feed_rate",
      doc: "axial_depth",
      woc: "radial_depth",
      mrr: "mrr",
    };

    for (const [baselineField, adaptedValue] of Object.entries(adapted)) {
      const resultField = reverseMappings[baselineField];
      if (resultField && result[resultField]) {
        const existing = result[resultField] as Record<string, unknown>;
        if (typeof existing === "object" && "value" in existing) {
          result[resultField] = {
            ...existing,
            value: adaptedValue,
            adapted: true,
          };
        }
      }
    }

    return result as T;
  }

  /**
   * Extract flat baseline from input baseline object.
   */
  private extractBaseline(input: Record<string, unknown>): Record<string, number> {
    const baseline: Record<string, number> = {};

    for (const field of SFC_BASELINE_FIELDS) {
      const value = input[field];
      if (typeof value === "number" && !Number.isNaN(value)) {
        baseline[field] = value;
      }
    }

    return baseline;
  }

  /**
   * Check if an adapter would match the given context without applying.
   * Useful for provenance planning.
   */
  wouldMatch(input: Pick<SFCInferenceGateInput, "material" | "iso_group" | "tool_class" | "machine_id" | "machine_type" | "operation" | "customer">): boolean {
    const result = this.apply({
      engine: "probe",
      baseline: { vc: 100 }, // dummy baseline
      ...input,
    });
    return result.adapter_hit;
  }

  /**
   * Get adapter hit rate statistics for a batch of contexts.
   * Used for testing adapter coverage requirements.
   */
  measureHitRate(
    contexts: Array<Pick<SFCInferenceGateInput, "material" | "iso_group" | "tool_class" | "machine_id" | "operation">>,
  ): { hit_rate: number; hits: number; misses: number } {
    let hits = 0;
    let misses = 0;

    for (const ctx of contexts) {
      if (this.wouldMatch(ctx)) {
        hits++;
      } else {
        misses++;
      }
    }

    const total = hits + misses;
    return {
      hit_rate: total > 0 ? hits / total : 0,
      hits,
      misses,
    };
  }

  static getSelfAwareness() {
    return {
      name: "SFCInferenceGateWireEngine",
      version: "1.0.0",
      milestone: "PSAU-PPG-SFC U-PPG-SFC-05",
      capabilities: ["apply", "applyToSFCResult", "wouldMatch", "measureHitRate"],
      dependencies: [
        "InferenceLoRAGateEngine",
        "LoRAAdapterRegistryEngine",
        "sfcInferenceGateSchema",
      ],
      surfaces_into: ["SFCProvenanceWireEngine.adapter_info"],
      description:
        "Wraps SFC outputs through InferenceLoRAGate for LoRA adapter delivery. " +
        "Adapter resolution keyed on (material × tool_class × machine_id × op_type). " +
        "Returns adapted values + adapter_used + residual for provenance.",
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const sfcInferenceGateWireEngine = new SFCInferenceGateWireEngine();
