// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * Federated LoRA Engine — U-LEARN-10
 * ====================================
 *
 * FedAvg aggregation over LoRA-A matrices when multiple customers share
 * (material, operation, machine-class). Enables cross-customer learning
 * without sharing raw data.
 *
 * Reference: McMahan 2017 "Communication-Efficient Learning" + 2024 FedLoRA patterns
 *
 * Key equations:
 * - FedAvg: A_global = Σ_k (n_k / n) * A_k
 * - FedProx: A_global + μ/2 * ||A - A_global||²
 *
 * @module engines/FederatedLoRAEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  FedLoRAClientSchema,
  FedLoRAAggregateSchema,
  FedLoRAAggregateResultSchema,
  type FedLoRAClient,
  type FedLoRAAggregate,
  type FedLoRAAggregateResult,
} from "../schemas/continualLearningSchema.js";

interface RoundHistory {
  roundId: string;
  clientsAggregated: number;
  totalSamples: number;
  timestamp: string;
}

class FederatedLoRAEngine {
  private globalWeights: Map<string, number[][]> = new Map();
  private roundHistory: RoundHistory[] = [];

  /**
   * Aggregate LoRA-A matrices from multiple clients.
   * @param input - Aggregation request with client weights
   * @returns Aggregated global weights
   */
  aggregate(input: FedLoRAAggregate): FedLoRAAggregateResult {
    const parsed = FedLoRAAggregateSchema.parse(input);

    if (parsed.clients.length === 0) {
      throw new Error("No clients provided for aggregation");
    }

    const validClients = parsed.clients.filter(c =>
      c.lora_a_weights.length > 0 && c.sample_count > 0
    );

    if (validClients.length === 0) {
      throw new Error("No valid clients with weights and samples");
    }

    const totalSamples = validClients.reduce((sum, c) => sum + c.sample_count, 0);

    const dims = validClients[0].lora_a_weights;
    const rows = dims.length;
    const cols = dims[0]?.length ?? 0;

    const globalA: number[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0)
    );

    const divergences: Array<{ client_id: string; divergence: number }> = [];

    for (const client of validClients) {
      const weight = client.sample_count / totalSamples;
      const clientA = client.lora_a_weights;

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const val = clientA[i]?.[j] ?? 0;
          globalA[i][j] += weight * val;
        }
      }
    }

    if (parsed.aggregation_method === "fedprox") {
      const prevGlobal = this.globalWeights.get(this.getKey(validClients[0]));
      if (prevGlobal) {
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            globalA[i][j] += parsed.mu * (prevGlobal[i]?.[j] ?? 0);
          }
        }
      }
    }

    for (const client of validClients) {
      let divergence = 0;
      const clientA = client.lora_a_weights;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const diff = (clientA[i]?.[j] ?? 0) - globalA[i][j];
          divergence += diff * diff;
        }
      }
      divergences.push({
        client_id: client.client_id,
        divergence: Math.sqrt(divergence / (rows * cols)),
      });
    }

    const key = this.getKey(validClients[0]);
    this.globalWeights.set(key, globalA);

    this.roundHistory.push({
      roundId: parsed.round_id,
      clientsAggregated: validClients.length,
      totalSamples,
      timestamp: new Date().toISOString(),
    });

    return FedLoRAAggregateResultSchema.parse({
      round_id: parsed.round_id,
      global_lora_a: globalA,
      clients_aggregated: validClients.length,
      total_samples: totalSamples,
      divergence_scores: divergences,
    });
  }

  private getKey(client: FedLoRAClient): string {
    return `${client.material_class}:${client.operation_type}:${client.machine_class}`;
  }

  /**
   * Get global weights for a configuration.
   */
  getGlobalWeights(materialClass: string, operationType: string, machineClass: string): number[][] | null {
    const key = `${materialClass}:${operationType}:${machineClass}`;
    return this.globalWeights.get(key) ?? null;
  }

  /**
   * Get aggregation history.
   */
  getHistory(): RoundHistory[] {
    return [...this.roundHistory];
  }

  /**
   * Get statistics.
   */
  getStats(): { configurations: number; total_rounds: number; total_samples: number } {
    const totalSamples = this.roundHistory.reduce((sum, r) => sum + r.totalSamples, 0);
    return {
      configurations: this.globalWeights.size,
      total_rounds: this.roundHistory.length,
      total_samples: totalSamples,
    };
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.globalWeights.clear();
    this.roundHistory = [];
  }

  static getSelfAwareness() {
    return {
      name: "FederatedLoRAEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["aggregate", "getGlobalWeights", "getHistory"],
      reference: "McMahan 2017 + 2024 FedLoRA patterns",
    };
  }
}

export const federatedLoRAEngine = new FederatedLoRAEngine();
