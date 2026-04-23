/**
 * InferenceLoRAGateEngine — U-LEARN-07
 * =====================================
 *
 * Wraps every recommendation engine's output. Given (engine, domain, context,
 * baseline), it resolves the best-matching active/canary adapter from the
 * registry, applies the residual per-field to the baseline, and emits a
 * provenance-tagged result. Provenance tells the operator (and downstream
 * auditors) whether a recommendation came from physics alone or physics
 * plus a LoRA — and which adapter was used.
 *
 * Residual kinds applied per field:
 *   - additive:       adapted = baseline + value
 *   - multiplicative: adapted = baseline * value
 *   - replace:        adapted = value
 *   - clamp:          adapted = min(max(baseline, min), max)
 *
 * If no adapter matches, the gate passes the baseline through unchanged with
 * `adapter_used: null` — the engine still benefits from provenance + a
 * single audit hook without needing adapter coverage everywhere on day one.
 *
 * @module engines/InferenceLoRAGateEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-07
 */

import {
  ApplyGateInputSchema,
  type ApplyGateInput,
  type ApplyGateResult,
  type LoRAAdapter,
  type ResidualField,
} from "../schemas/loraAdapterSchema.js";
import { loraAdapterRegistryEngine, LoRAAdapterRegistryEngine } from "./LoRAAdapterRegistryEngine.js";

const GATE_VERSION = "1.0.0" as const;

export class InferenceLoRAGateEngine {
  constructor(private readonly registry: LoRAAdapterRegistryEngine = loraAdapterRegistryEngine) {}

  /**
   * Main entry: apply the gate to a baseline recommendation.
   */
  apply(input: ApplyGateInput): ApplyGateResult {
    const parsed = ApplyGateInputSchema.safeParse(input);
    const baseline = parsed.success ? parsed.data.baseline : (input.baseline ?? {});
    const timestamp = new Date().toISOString();

    if (!parsed.success) {
      // Bad input → pass through baseline with explicit null adapter
      return {
        adapted: { ...baseline },
        baseline: { ...baseline },
        adapter_used: null,
        adapter_status: null,
        residual_applied: {},
        confidence: 0,
        provenance: {
          engine_name: input.engine_name ?? "unknown",
          domain: input.domain ?? "other",
          context: input.context ?? {},
          gate_version: GATE_VERSION,
          timestamp,
          lineage_id: input.lineage_id,
        },
      };
    }

    const { adapter, match_score } = this.registry.resolve({
      domain: parsed.data.domain,
      context: parsed.data.context,
      require_status: ["active", "canary"],
    });

    if (!adapter || match_score <= 0) {
      return {
        adapted: { ...baseline },
        baseline: { ...baseline },
        adapter_used: null,
        adapter_status: null,
        residual_applied: {},
        confidence: 0,
        provenance: {
          engine_name: parsed.data.engine_name,
          domain: parsed.data.domain,
          context: parsed.data.context,
          gate_version: GATE_VERSION,
          timestamp,
          lineage_id: parsed.data.lineage_id,
        },
      };
    }

    const { adapted, residual_applied } = applyResidual(baseline, adapter);
    return {
      adapted,
      baseline: { ...baseline },
      adapter_used: adapter.adapter_id,
      adapter_status: adapter.status,
      residual_applied,
      confidence: adapter.confidence ?? 0.5,
      provenance: {
        engine_name: parsed.data.engine_name,
        domain: parsed.data.domain,
        context: parsed.data.context,
        gate_version: GATE_VERSION,
        timestamp,
        lineage_id: parsed.data.lineage_id,
      },
    };
  }

  static getSelfAwareness() {
    return {
      name: "InferenceLoRAGateEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-07",
      capabilities: ["apply"],
      dependencies: ["loraAdapterSchema", "LoRAAdapterRegistryEngine"],
      dataSourcesUsed: ["state/adapters/registry.jsonl (via LoRAAdapterRegistryEngine)"],
    };
  }
}

function applyResidual(
  baseline: Record<string, number>,
  adapter: LoRAAdapter,
): { adapted: Record<string, number>; residual_applied: Record<string, number> } {
  const adapted: Record<string, number> = { ...baseline };
  const residualApplied: Record<string, number> = {};
  for (const [field, residual] of Object.entries(adapter.residual ?? {})) {
    const before = adapted[field];
    if (typeof before !== "number" || Number.isNaN(before)) continue;
    const after = computeAdapted(before, residual);
    if (typeof after !== "number" || Number.isNaN(after)) continue;
    adapted[field] = after;
    residualApplied[field] = after - before;
  }
  return { adapted, residual_applied: residualApplied };
}

function computeAdapted(before: number, r: ResidualField): number {
  switch (r.kind) {
    case "additive":
      return typeof r.value === "number" ? before + r.value : before;
    case "multiplicative":
      return typeof r.value === "number" ? before * r.value : before;
    case "replace":
      return typeof r.value === "number" ? r.value : before;
    case "clamp": {
      let out = before;
      if (typeof r.min === "number" && out < r.min) out = r.min;
      if (typeof r.max === "number" && out > r.max) out = r.max;
      return out;
    }
    default:
      return before;
  }
}

export const inferenceLoRAGateEngine = new InferenceLoRAGateEngine();
