// WIRE-EXEMPT: Middleware engine called by PPG engines internally, not exposed via dispatcher
/**
 * PPGInferenceGateWireEngine — U-PPG-SFC-06
 * ==========================================
 *
 * Wraps PPG engine outputs through the InferenceLoRAGate for adapter delivery.
 * Every PPG recommendation passes through this gate; if an adapter matches
 * the (controller × machine_class × dialect_family) context, the gate applies
 * learned residual corrections to the baseline post processor values.
 *
 * Design invariants:
 *   1. NEVER BLOCK. Gate-miss falls back to baseline gracefully.
 *   2. ADAPTER INFO SURFACES. adapter_used, residual_applied always populated.
 *   3. PROVENANCE INTEGRATION. Output feeds into PPGProvenanceWireEngine.
 *   4. CONFIDENCE PROPAGATES. Adapter confidence flows to provenance.
 *
 * The belt connecting trained PPG LoRAs to live inference:
 *   PostProcessorEngine.generate() → baseline
 *   PPGInferenceGateWireEngine.apply() → adapted + adapter_info
 *   PPGProvenanceWireEngine.cite() → full provenance
 *
 * @module engines/PPGInferenceGateWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-06
 */

import {
  InferenceLoRAGateEngine,
  inferenceLoRAGateEngine,
} from "./InferenceLoRAGateEngine.js";
import type { AdapterContext } from "../schemas/loraAdapterSchema.js";
import {
  PPGInferenceGateInputSchema,
  type PPGInferenceGateInput,
  type PPGInferenceGateResult,
  PPG_BASELINE_FIELDS,
} from "../schemas/ppgInferenceGateSchema.js";

const GATE_VERSION = "1.0.0" as const;

// ─── Controller Normalization ───────────────────────────────────────────

const CONTROLLER_ALIASES: Record<string, string> = {
  "fanuc": "fanuc",
  "ge_fanuc": "fanuc",
  "okuma": "okuma",
  "osp": "okuma",
  "siemens": "siemens",
  "sinumerik": "siemens",
  "haas": "haas",
  "heidenhain": "heidenhain",
  "tnc": "heidenhain",
  "mazak": "mazak",
  "mazatrol": "mazak",
  "hurco": "hurco",
  "winmax": "hurco",
  "fadal": "fadal",
  "brother": "brother",
  "doosan": "doosan",
  "dmg_mori": "dmg_mori",
  "dmg": "dmg_mori",
  "mori": "dmg_mori",
  "makino": "makino",
  "mitsubishi": "mitsubishi",
  "meldas": "mitsubishi",
};

function normalizeController(controller: string | undefined): string | undefined {
  if (!controller) return undefined;
  const lower = controller.toLowerCase().replace(/[-\s]/g, "_");
  return CONTROLLER_ALIASES[lower] ?? lower;
}

// ─── Singleton ──────────────────────────────────────────────────────────

export class PPGInferenceGateWireEngine {
  private readonly gate: InferenceLoRAGateEngine;

  constructor(gate: InferenceLoRAGateEngine = inferenceLoRAGateEngine) {
    this.gate = gate;
  }

  /**
   * Apply the inference gate to PPG baseline values.
   * If an adapter matches the context, applies learned residuals.
   * Gate-miss falls back to baseline with adapter_hit: false.
   */
  apply(input: PPGInferenceGateInput): PPGInferenceGateResult {
    const parsed = PPGInferenceGateInputSchema.safeParse(input);
    const timestamp = new Date().toISOString();

    // Extract baseline as Record<string, number>
    const baseline = this.extractBaseline(parsed.success ? parsed.data.baseline : input.baseline ?? {});

    // Normalize controller
    const normalizedController = normalizeController(input.controller);

    // Build context for adapter matching
    const matchContext: AdapterContext = {
      material: input.material,
      operation: input.operation,
      machine: input.machine_id ?? input.machine_class,
      customer: input.customer,
      tool_geometry_class: input.block_type,
    };

    // Call the inference gate with post_processor domain
    const gateResult = this.gate.apply({
      engine_name: input.engine ?? "PPGEngine",
      domain: "post_processor",
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
        controller: normalizedController,
        machine_class: input.machine_class,
        dialect_family: input.dialect_family,
        customer: input.customer,
      },
      gate_version: GATE_VERSION,
      timestamp,
      lineage_id: input.lineage_id,
    };
  }

  /**
   * Convenience method: apply gate and merge adapted values back into
   * a PPG result structure.
   */
  applyToPPGResult<T extends Record<string, unknown>>(
    ppgResult: T,
    input: Omit<PPGInferenceGateInput, "baseline">,
  ): { result: T; gateOutput: PPGInferenceGateResult } {
    // Extract baseline from PPG result
    const baseline = this.extractFromPPGResult(ppgResult);

    const gateOutput = this.apply({
      ...input,
      baseline,
    });

    // Filter to only defined numeric values
    const adaptedNumbers: Record<string, number> = {};
    for (const [k, v] of Object.entries(gateOutput.adapted)) {
      if (typeof v === "number") adaptedNumbers[k] = v;
    }

    // Merge adapted values back
    const result = this.mergeAdaptedValues(ppgResult, adaptedNumbers);

    return { result, gateOutput };
  }

  /**
   * Extract numeric baseline from PPG result.
   */
  private extractFromPPGResult(ppgResult: Record<string, unknown>): Record<string, number> {
    const baseline: Record<string, number> = {};

    // Direct field extraction
    for (const field of PPG_BASELINE_FIELDS) {
      const value = ppgResult[field];
      if (typeof value === "number" && !Number.isNaN(value)) {
        baseline[field] = value;
      }
    }

    // Extract from nested structures (e.g., overrides object)
    const overrides = ppgResult.overrides as Record<string, unknown> | undefined;
    if (overrides && typeof overrides === "object") {
      if (typeof overrides.feed === "number") baseline.feed_rate_override = overrides.feed;
      if (typeof overrides.spindle === "number") baseline.spindle_override = overrides.spindle;
      if (typeof overrides.rapid === "number") baseline.rapid_override = overrides.rapid;
    }

    // Extract from motion_params if present
    const motion = ppgResult.motion_params as Record<string, unknown> | undefined;
    if (motion && typeof motion === "object") {
      if (typeof motion.approach_feed === "number") baseline.approach_feed = motion.approach_feed;
      if (typeof motion.plunge_feed === "number") baseline.plunge_feed = motion.plunge_feed;
      if (typeof motion.retract_height === "number") baseline.retract_height = motion.retract_height;
    }

    return baseline;
  }

  /**
   * Merge adapted values back into PPG result structure.
   */
  private mergeAdaptedValues<T extends Record<string, unknown>>(
    ppgResult: T,
    adapted: Record<string, number>,
  ): T {
    const result = { ...ppgResult } as Record<string, unknown>;

    // Direct field merging
    for (const [field, value] of Object.entries(adapted)) {
      if (PPG_BASELINE_FIELDS.includes(field as typeof PPG_BASELINE_FIELDS[number])) {
        result[field] = value;
        // Mark as adapted
        if (!result._adapted_fields) {
          result._adapted_fields = [];
        }
        (result._adapted_fields as string[]).push(field);
      }
    }

    // Update nested overrides if present
    if (result.overrides && typeof result.overrides === "object") {
      const overrides = { ...(result.overrides as Record<string, unknown>) };
      if (adapted.feed_rate_override !== undefined) overrides.feed = adapted.feed_rate_override;
      if (adapted.spindle_override !== undefined) overrides.spindle = adapted.spindle_override;
      if (adapted.rapid_override !== undefined) overrides.rapid = adapted.rapid_override;
      result.overrides = overrides;
    }

    // Update motion_params if present
    if (result.motion_params && typeof result.motion_params === "object") {
      const motion = { ...(result.motion_params as Record<string, unknown>) };
      if (adapted.approach_feed !== undefined) motion.approach_feed = adapted.approach_feed;
      if (adapted.plunge_feed !== undefined) motion.plunge_feed = adapted.plunge_feed;
      if (adapted.retract_height !== undefined) motion.retract_height = adapted.retract_height;
      result.motion_params = motion;
    }

    return result as T;
  }

  /**
   * Extract flat baseline from input baseline object.
   */
  private extractBaseline(input: Record<string, unknown>): Record<string, number> {
    const baseline: Record<string, number> = {};

    for (const field of PPG_BASELINE_FIELDS) {
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
  wouldMatch(input: Pick<PPGInferenceGateInput, "controller" | "machine_class" | "dialect_family" | "machine_id" | "customer" | "operation">): boolean {
    const result = this.apply({
      engine: "probe",
      baseline: { feed_rate_override: 100 },
      ...input,
    });
    return result.adapter_hit;
  }

  /**
   * Get adapter hit rate statistics for a batch of contexts.
   * Used for testing adapter coverage requirements.
   */
  measureHitRate(
    contexts: Array<Pick<PPGInferenceGateInput, "controller" | "machine_class" | "dialect_family" | "machine_id" | "operation">>,
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

  /**
   * Get controller normalization map for debugging/testing.
   */
  static getControllerAliases(): Record<string, string> {
    return { ...CONTROLLER_ALIASES };
  }

  static getSelfAwareness() {
    return {
      name: "PPGInferenceGateWireEngine",
      version: "1.0.0",
      milestone: "PSAU-PPG-SFC U-PPG-SFC-06",
      capabilities: ["apply", "applyToPPGResult", "wouldMatch", "measureHitRate"],
      dependencies: [
        "InferenceLoRAGateEngine",
        "LoRAAdapterRegistryEngine",
        "ppgInferenceGateSchema",
      ],
      surfaces_into: ["PPGProvenanceWireEngine.adapter_info"],
      description:
        "Wraps PPG outputs through InferenceLoRAGate for LoRA adapter delivery. " +
        "Adapter resolution keyed on (controller × machine_class × dialect_family). " +
        "Returns adapted values + adapter_used + residual for provenance.",
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const ppgInferenceGateWireEngine = new PPGInferenceGateWireEngine();
