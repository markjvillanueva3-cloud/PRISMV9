// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
/**
 * LoRA Composition Engine — U-LEARN-05
 * ======================================
 *
 * Orchestrator that composes multiple LoRA adapters into a single forward pass.
 * Combines outputs from the component engines:
 * - LoRAMoEGatingEngine: expert selection
 * - DoRAAdapterEngine: magnitude/direction decomposition
 * - AdaLoRARankAllocatorEngine: dynamic rank allocation
 * - OrthogonalLoRAEngine: forgetting prevention
 *
 * Composition modes:
 * - weighted_sum: ΔW = Σ wᵢ ΔWᵢ
 * - cascade: sequential application
 * - residual: ΔW = ΔW_base + α Σ wᵢ ΔWᵢ
 * - attention: cross-attention weighted
 *
 * Target: <50ms single forward pass composing top-3 experts
 *
 * @module engines/LoRACompositionEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import type {
  CompositionInput,
  CompositionResult,
  Expert,
  GatingResult,
} from "../schemas/loraCompositionSchema.js";

import { loraMoEGatingEngine } from "./LoRAMoEGatingEngine.js";
import { doRAAdapterEngine } from "./DoRAAdapterEngine.js";
import { orthogonalLoRAEngine } from "./OrthogonalLoRAEngine.js";

type CompositionMode = "weighted_sum" | "cascade" | "residual" | "attention";

interface CompositionConfig {
  residual_alpha: number;
  attention_temperature: number;
  enforce_orthogonality: boolean;
  orthogonality_threshold: number;
}

const DEFAULT_CONFIG: CompositionConfig = {
  residual_alpha: 0.5,
  attention_temperature: 1.0,
  enforce_orthogonality: true,
  orthogonality_threshold: 0.1,
};

class LoRACompositionEngine {
  private config: CompositionConfig = { ...DEFAULT_CONFIG };
  private adapterDeltas: Map<string, Record<string, number>> = new Map();

  configure(config: Partial<CompositionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CompositionConfig {
    return { ...this.config };
  }

  registerAdapterDelta(
    adapterId: string,
    delta: Record<string, number>
  ): void {
    this.adapterDeltas.set(adapterId, delta);
  }

  registerAdapterDeltas(
    deltas: Array<{ adapter_id: string; delta: Record<string, number> }>
  ): { registered: number } {
    for (const { adapter_id, delta } of deltas) {
      this.registerAdapterDelta(adapter_id, delta);
    }
    return { registered: deltas.length };
  }

  private weightedSumCompose(
    baseValues: Record<string, number>,
    experts: Array<{ adapter_id: string; weight: number }>
  ): Record<string, number> {
    const result = { ...baseValues };

    for (const { adapter_id, weight } of experts) {
      const delta = this.adapterDeltas.get(adapter_id);
      if (!delta) continue;

      for (const [key, value] of Object.entries(delta)) {
        result[key] = (result[key] ?? 0) + weight * value;
      }
    }

    return result;
  }

  private cascadeCompose(
    baseValues: Record<string, number>,
    experts: Array<{ adapter_id: string; weight: number }>
  ): Record<string, number> {
    let result = { ...baseValues };

    for (const { adapter_id, weight } of experts) {
      const delta = this.adapterDeltas.get(adapter_id);
      if (!delta) continue;

      for (const [key, value] of Object.entries(delta)) {
        result[key] = (result[key] ?? 0) + weight * value;
      }
    }

    return result;
  }

  private residualCompose(
    baseValues: Record<string, number>,
    experts: Array<{ adapter_id: string; weight: number }>
  ): Record<string, number> {
    const alpha = this.config.residual_alpha;
    const result = { ...baseValues };

    let expertContribution: Record<string, number> = {};
    for (const { adapter_id, weight } of experts) {
      const delta = this.adapterDeltas.get(adapter_id);
      if (!delta) continue;

      for (const [key, value] of Object.entries(delta)) {
        expertContribution[key] = (expertContribution[key] ?? 0) + weight * value;
      }
    }

    for (const [key, value] of Object.entries(expertContribution)) {
      result[key] = (result[key] ?? 0) + alpha * value;
    }

    return result;
  }

  private attentionCompose(
    baseValues: Record<string, number>,
    experts: Array<{ adapter_id: string; weight: number }>
  ): Record<string, number> {
    const temperature = this.config.attention_temperature;
    const scaledWeights = experts.map((e) => ({
      ...e,
      weight: Math.exp(e.weight / temperature),
    }));
    const weightSum = scaledWeights.reduce((sum, e) => sum + e.weight, 0);
    const normalizedExperts = scaledWeights.map((e) => ({
      ...e,
      weight: e.weight / weightSum,
    }));

    return this.weightedSumCompose(baseValues, normalizedExperts);
  }

  compose(input: CompositionInput): CompositionResult {
    const startTime = performance.now();

    const gatingResult = loraMoEGatingEngine.gate({
      domain: input.domain,
      material: input.context.material,
      machine: input.context.machine,
      operation: input.context.operation,
      top_k: input.max_experts,
      temperature: this.config.attention_temperature,
    });

    if (this.config.enforce_orthogonality) {
      const violations = orthogonalLoRAEngine.getViolations(
        this.config.orthogonality_threshold
      );
      if (violations.length > 0) {
        orthogonalLoRAEngine.orthogonalizeAll();
      }
    }

    const mode = input.composition_mode ?? "weighted_sum";
    let adaptedValues: Record<string, number>;

    switch (mode) {
      case "cascade":
        adaptedValues = this.cascadeCompose(
          input.base_values,
          gatingResult.selected_experts
        );
        break;
      case "residual":
        adaptedValues = this.residualCompose(
          input.base_values,
          gatingResult.selected_experts
        );
        break;
      case "attention":
        adaptedValues = this.attentionCompose(
          input.base_values,
          gatingResult.selected_experts
        );
        break;
      case "weighted_sum":
      default:
        adaptedValues = this.weightedSumCompose(
          input.base_values,
          gatingResult.selected_experts
        );
        break;
    }

    const expertsUsed = gatingResult.selected_experts.map((expert) => {
      const delta = this.adapterDeltas.get(expert.adapter_id) ?? {};
      const contribution: Record<string, number> = {};
      for (const [key, value] of Object.entries(delta)) {
        contribution[key] = expert.weight * value;
      }
      return {
        adapter_id: expert.adapter_id,
        weight: expert.weight,
        contribution,
      };
    });

    return {
      adapted_values: adaptedValues,
      experts_used: expertsUsed,
      composition_time_ms: performance.now() - startTime,
      provenance: {
        mode,
        total_experts_available: gatingResult.total_experts,
        experts_selected: gatingResult.selected_experts.length,
      },
    };
  }

  batchCompose(
    inputs: CompositionInput[]
  ): Array<CompositionResult & { input_index: number }> {
    return inputs.map((input, index) => ({
      ...this.compose(input),
      input_index: index,
    }));
  }

  precomputeDeltas(
    adapterIds: string[]
  ): Map<string, Record<string, number> | null> {
    const results = new Map<string, Record<string, number> | null>();

    for (const adapterId of adapterIds) {
      const deltaW = doRAAdapterEngine.computeDeltaW(adapterId);
      if (deltaW) {
        const flatDelta: Record<string, number> = {};
        for (let i = 0; i < deltaW.length; i++) {
          for (let j = 0; j < deltaW[i].length; j++) {
            flatDelta[`${i}_${j}`] = deltaW[i][j];
          }
        }
        results.set(adapterId, flatDelta);
        this.adapterDeltas.set(adapterId, flatDelta);
      } else {
        results.set(adapterId, null);
      }
    }

    return results;
  }

  getStats(): {
    registered_deltas: number;
    gating_stats: ReturnType<typeof loraMoEGatingEngine.getStats>;
    orthogonality_violations: number;
    config: CompositionConfig;
  } {
    return {
      registered_deltas: this.adapterDeltas.size,
      gating_stats: loraMoEGatingEngine.getStats(),
      orthogonality_violations: orthogonalLoRAEngine.getViolations(
        this.config.orthogonality_threshold
      ).length,
      config: this.config,
    };
  }

  clearDeltas(): void {
    this.adapterDeltas.clear();
  }

  clear(): void {
    this.adapterDeltas.clear();
    loraMoEGatingEngine.clear();
    orthogonalLoRAEngine.clear();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const loraCompositionEngine = new LoRACompositionEngine();
export type { CompositionInput, CompositionResult, CompositionConfig };
