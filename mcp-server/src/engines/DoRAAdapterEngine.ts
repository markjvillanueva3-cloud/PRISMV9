// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
/**
 * DoRA Adapter Engine — U-LEARN-05
 * ==================================
 *
 * Decomposed LoRA (DoRA) implementation that separates:
 * - Magnitude (m): scalar scaling per output dimension
 * - Direction (A, B): normalized LoRA matrices
 *
 * This decomposition improves training stability and allows independent
 * learning rates for magnitude vs direction components.
 *
 * Formula: W' = W + m * (BA / ||BA||)
 *
 * @module engines/DoRAAdapterEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import type { DoRAConfig, DoRAWeights } from "../schemas/loraCompositionSchema.js";

interface AdapterStore {
  config: DoRAConfig;
  weights: DoRAWeights | null;
}

class DoRAAdapterEngine {
  private adapters: Map<string, AdapterStore> = new Map();

  createAdapter(config: DoRAConfig): { adapter_id: string; rank: number } {
    this.adapters.set(config.adapter_id, {
      config,
      weights: null,
    });
    return { adapter_id: config.adapter_id, rank: config.rank };
  }

  initializeWeights(
    adapterId: string,
    inputDim: number,
    outputDim: number,
    initScale: number = 0.01
  ): DoRAWeights {
    const store = this.adapters.get(adapterId);
    if (!store) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const rank = store.config.rank;

    const magnitude = new Array(outputDim).fill(1.0);

    const directionA: number[][] = [];
    for (let i = 0; i < rank; i++) {
      const row: number[] = [];
      for (let j = 0; j < inputDim; j++) {
        row.push((Math.random() - 0.5) * 2 * initScale);
      }
      directionA.push(row);
    }

    const directionB: number[][] = [];
    for (let i = 0; i < outputDim; i++) {
      const row: number[] = [];
      for (let j = 0; j < rank; j++) {
        row.push(0);
      }
      directionB.push(row);
    }

    const weights: DoRAWeights = {
      adapter_id: adapterId,
      magnitude,
      direction_A: directionA,
      direction_B: directionB,
    };

    store.weights = weights;
    return weights;
  }

  setWeights(weights: DoRAWeights): void {
    const store = this.adapters.get(weights.adapter_id);
    if (!store) {
      throw new Error(`Adapter not found: ${weights.adapter_id}`);
    }
    store.weights = weights;
  }

  getWeights(adapterId: string): DoRAWeights | null {
    return this.adapters.get(adapterId)?.weights ?? null;
  }

  getConfig(adapterId: string): DoRAConfig | null {
    return this.adapters.get(adapterId)?.config ?? null;
  }

  private matMul(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0]?.length ?? 0;
    const colsB = B[0]?.length ?? 0;

    const result: number[][] = [];
    for (let i = 0; i < rowsA; i++) {
      const row: number[] = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        row.push(sum);
      }
      result.push(row);
    }
    return result;
  }

  private frobeniusNorm(M: number[][]): number {
    let sum = 0;
    for (const row of M) {
      for (const val of row) {
        sum += val * val;
      }
    }
    return Math.sqrt(sum);
  }

  computeDeltaW(adapterId: string): number[][] | null {
    const store = this.adapters.get(adapterId);
    if (!store || !store.weights) return null;

    const { magnitude, direction_A, direction_B } = store.weights;
    const alpha = store.config.alpha;

    const BA = this.matMul(direction_B, direction_A);

    const norm = this.frobeniusNorm(BA);
    const normalizedBA: number[][] = [];
    for (let i = 0; i < BA.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < BA[i].length; j++) {
        const normalized = norm > 1e-8 ? BA[i][j] / norm : 0;
        row.push(magnitude[i] * normalized * alpha);
      }
      normalizedBA.push(row);
    }

    return normalizedBA;
  }

  forward(adapterId: string, input: number[]): number[] | null {
    const deltaW = this.computeDeltaW(adapterId);
    if (!deltaW) return null;

    const output: number[] = [];
    for (let i = 0; i < deltaW.length; i++) {
      let sum = 0;
      for (let j = 0; j < input.length; j++) {
        sum += deltaW[i][j] * input[j];
      }
      output.push(sum);
    }
    return output;
  }

  batchForward(
    adapterId: string,
    inputs: number[][]
  ): number[][] | null {
    const deltaW = this.computeDeltaW(adapterId);
    if (!deltaW) return null;

    return inputs.map((input) => {
      const output: number[] = [];
      for (let i = 0; i < deltaW.length; i++) {
        let sum = 0;
        for (let j = 0; j < input.length; j++) {
          sum += deltaW[i][j] * input[j];
        }
        output.push(sum);
      }
      return output;
    });
  }

  getMagnitudeStats(adapterId: string): {
    min: number;
    max: number;
    mean: number;
    std: number;
  } | null {
    const weights = this.getWeights(adapterId);
    if (!weights) return null;

    const m = weights.magnitude;
    const min = Math.min(...m);
    const max = Math.max(...m);
    const mean = m.reduce((a, b) => a + b, 0) / m.length;
    const variance =
      m.reduce((sum, val) => sum + (val - mean) ** 2, 0) / m.length;
    const std = Math.sqrt(variance);

    return { min, max, mean, std };
  }

  listAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  deleteAdapter(adapterId: string): boolean {
    return this.adapters.delete(adapterId);
  }

  clear(): void {
    this.adapters.clear();
  }
}

export const doRAAdapterEngine = new DoRAAdapterEngine();
export type { DoRAConfig, DoRAWeights };
