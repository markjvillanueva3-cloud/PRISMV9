// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
/**
 * AdaLoRA Rank Allocator Engine — U-LEARN-05
 * ============================================
 *
 * Adaptive rank allocation using SVD-based importance scoring.
 * Dynamically allocates rank budget across layers based on:
 * - Singular value decomposition importance
 * - Gradient magnitude
 * - Fisher information
 *
 * This allows important layers to have higher rank while constraining
 * total parameter count.
 *
 * @module engines/AdaLoRARankAllocatorEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import type {
  AdaLoRAConfig,
  RankAllocation,
} from "../schemas/loraCompositionSchema.js";

interface AllocationState {
  config: AdaLoRAConfig;
  allocation: RankAllocation;
  stepCount: number;
  layerGradients: Map<string, number[]>;
}

class AdaLoRARankAllocatorEngine {
  private allocations: Map<string, AllocationState> = new Map();

  createAllocation(
    config: AdaLoRAConfig,
    layerNames: string[]
  ): RankAllocation {
    const evenRank = Math.floor(config.total_rank_budget / layerNames.length);
    const clampedRank = Math.max(
      config.min_rank ?? 1,
      Math.min(evenRank, config.max_rank ?? 64)
    );

    const layerRanks: Record<string, number> = {};
    for (const layer of layerNames) {
      layerRanks[layer] = clampedRank;
    }

    const allocation: RankAllocation = {
      adapter_id: config.adapter_id,
      layer_ranks: layerRanks,
      total_rank_budget: config.total_rank_budget,
      importance_scores: {},
    };

    this.allocations.set(config.adapter_id, {
      // Default importance_metric to the engine's canonical SVD scoring (see file header)
      // so reallocateRanks differentiates ranks by importance even when the caller omits
      // the metric. Without this, an unspecified metric leaves every importance score at 0
      // (updateImportance's switch matches no case) -> totalImportance 0 -> reallocation
      // degenerates to the even 1/n split (the "expected 10 to be greater than 10" bug).
      config: { ...config, importance_metric: config.importance_metric ?? "svd" },
      allocation,
      stepCount: 0,
      layerGradients: new Map(),
    });

    return allocation;
  }

  private computeSVDImportance(matrix: number[][]): number {
    if (matrix.length === 0 || matrix[0].length === 0) return 0;

    let frobeniusNorm = 0;
    for (const row of matrix) {
      for (const val of row) {
        frobeniusNorm += val * val;
      }
    }
    return Math.sqrt(frobeniusNorm);
  }

  private computeGradientImportance(gradients: number[]): number {
    if (gradients.length === 0) return 0;
    const sumSquares = gradients.reduce((sum, g) => sum + g * g, 0);
    return Math.sqrt(sumSquares / gradients.length);
  }

  updateImportance(
    adapterId: string,
    layerName: string,
    data: {
      weights?: number[][];
      gradients?: number[];
    }
  ): number {
    const state = this.allocations.get(adapterId);
    if (!state) {
      throw new Error(`Allocation not found: ${adapterId}`);
    }

    let importance = 0;

    switch (state.config.importance_metric) {
      case "svd":
        if (data.weights) {
          importance = this.computeSVDImportance(data.weights);
        }
        break;
      case "gradient":
        if (data.gradients) {
          importance = this.computeGradientImportance(data.gradients);
          state.layerGradients.set(layerName, data.gradients);
        }
        break;
      case "fisher":
        if (data.gradients) {
          importance = data.gradients.reduce((sum, g) => sum + g * g, 0);
        }
        break;
    }

    state.allocation.importance_scores![layerName] = importance;
    return importance;
  }

  reallocateRanks(adapterId: string): RankAllocation {
    const state = this.allocations.get(adapterId);
    if (!state) {
      throw new Error(`Allocation not found: ${adapterId}`);
    }

    const { config, allocation } = state;
    const layerNames = Object.keys(allocation.layer_ranks);
    const importanceScores = allocation.importance_scores ?? {};

    const totalImportance = Object.values(importanceScores).reduce(
      (sum, s) => sum + s,
      0
    );

    if (totalImportance === 0) {
      return allocation;
    }

    const minRank = config.min_rank ?? 1;
    const maxRank = config.max_rank ?? 64;
    const totalBudget = config.total_rank_budget;

    let reservedForMin = layerNames.length * minRank;
    let distributableBudget = totalBudget - reservedForMin;

    if (distributableBudget < 0) {
      distributableBudget = 0;
      reservedForMin = totalBudget;
    }

    const newRanks: Record<string, number> = {};
    let allocated = 0;

    for (const layer of layerNames) {
      const importance = importanceScores[layer] ?? 0;
      const proportion = totalImportance > 0 ? importance / totalImportance : 1 / layerNames.length;

      let rank = minRank + Math.floor(proportion * distributableBudget);
      rank = Math.max(minRank, Math.min(rank, maxRank));
      newRanks[layer] = rank;
      allocated += rank;
    }

    if (allocated < totalBudget) {
      const sortedLayers = layerNames.sort(
        (a, b) => (importanceScores[b] ?? 0) - (importanceScores[a] ?? 0)
      );
      let remaining = totalBudget - allocated;
      for (const layer of sortedLayers) {
        if (remaining <= 0) break;
        if (newRanks[layer] < maxRank) {
          const add = Math.min(remaining, maxRank - newRanks[layer]);
          newRanks[layer] += add;
          remaining -= add;
        }
      }
    }

    allocation.layer_ranks = newRanks;
    state.stepCount++;

    return allocation;
  }

  step(
    adapterId: string,
    layerData: Record<string, { weights?: number[][]; gradients?: number[] }>
  ): RankAllocation | null {
    const state = this.allocations.get(adapterId);
    if (!state) return null;

    for (const [layerName, data] of Object.entries(layerData)) {
      this.updateImportance(adapterId, layerName, data);
    }

    state.stepCount++;

    const interval = state.config.reallocation_interval ?? 100;
    if (state.stepCount % interval === 0) {
      return this.reallocateRanks(adapterId);
    }

    return state.allocation;
  }

  getAllocation(adapterId: string): RankAllocation | null {
    return this.allocations.get(adapterId)?.allocation ?? null;
  }

  getConfig(adapterId: string): AdaLoRAConfig | null {
    return this.allocations.get(adapterId)?.config ?? null;
  }

  getTotalAllocatedRank(adapterId: string): number {
    const allocation = this.getAllocation(adapterId);
    if (!allocation) return 0;
    return Object.values(allocation.layer_ranks).reduce((sum, r) => sum + r, 0);
  }

  getRankDistribution(adapterId: string): {
    min: number;
    max: number;
    mean: number;
    std: number;
  } | null {
    const allocation = this.getAllocation(adapterId);
    if (!allocation) return null;

    const ranks = Object.values(allocation.layer_ranks);
    if (ranks.length === 0) return null;

    const min = Math.min(...ranks);
    const max = Math.max(...ranks);
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance =
      ranks.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ranks.length;
    const std = Math.sqrt(variance);

    return { min, max, mean, std };
  }

  listAllocations(): string[] {
    return Array.from(this.allocations.keys());
  }

  deleteAllocation(adapterId: string): boolean {
    return this.allocations.delete(adapterId);
  }

  clear(): void {
    this.allocations.clear();
  }
}

export const adaLoRARankAllocatorEngine = new AdaLoRARankAllocatorEngine();
export type { AdaLoRAConfig, RankAllocation };
