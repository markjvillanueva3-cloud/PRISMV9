// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * Cross-Customer Policy Transfer Engine — U-LEARN-10
 * ====================================================
 *
 * Enables policy transfer between customers when they share
 * (material_class, operation_type, machine_class). Finds similar
 * source policies and creates weighted ensemble for target customer.
 *
 * Transfer criteria:
 * - Material class match (ISO P/M/K/N/S/H or specific alloy family)
 * - Operation type match (roughing, finishing, threading, etc.)
 * - Machine class match (VMC, HMC, lathe, WEDM, etc.)
 * - Performance threshold on source policy
 *
 * @module engines/CrossCustomerPolicyTransferEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  PolicyTransferSourceSchema,
  PolicyTransferRequestSchema,
  PolicyTransferResultSchema,
  type PolicyTransferSource,
  type PolicyTransferRequest,
  type PolicyTransferResult,
} from "../schemas/continualLearningSchema.js";

interface TransferRecord {
  targetCustomer: string;
  transferredPolicyId: string;
  sourcesUsed: string[];
  timestamp: string;
}

class CrossCustomerPolicyTransferEngine {
  private sources: Map<string, PolicyTransferSource> = new Map();
  private transfers: TransferRecord[] = [];

  /**
   * Register a source policy for potential transfer.
   * @param source - Source policy metadata
   * @returns Registration confirmation
   */
  registerSource(source: PolicyTransferSource): { source_policy_id: string; registered: boolean } {
    const parsed = PolicyTransferSourceSchema.parse(source);
    this.sources.set(parsed.source_policy_id, parsed);
    return { source_policy_id: parsed.source_policy_id, registered: true };
  }

  /**
   * Find and transfer policies to target customer.
   * @param request - Transfer request
   * @returns Transfer result with new policy
   */
  transfer(request: PolicyTransferRequest): PolicyTransferResult {
    const parsed = PolicyTransferRequestSchema.parse(request);

    const candidates: Array<PolicyTransferSource & { similarity: number }> = [];

    for (const source of this.sources.values()) {
      if (source.material_class !== parsed.material_class) continue;
      if (source.operation_type !== parsed.operation_type) continue;
      if (source.machine_class !== parsed.machine_class) continue;
      if (source.source_customer === parsed.target_customer) continue;

      const similarity = this.computeSimilarity(source, parsed);
      if (similarity >= parsed.min_similarity) {
        candidates.push({ ...source, similarity });
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const selected = candidates.slice(0, parsed.max_sources);

    if (selected.length === 0) {
      return PolicyTransferResultSchema.parse({
        target_customer: parsed.target_customer,
        sources_used: [],
        transferred_policy_id: `${parsed.target_customer}_transfer_empty`,
        expected_performance: 0.5,
        adaptation_required: true,
      });
    }

    const totalWeight = selected.reduce((sum, s) => sum + s.similarity * s.sample_count, 0);
    const sourcesUsed = selected.map(s => ({
      source_customer: s.source_customer,
      source_policy_id: s.source_policy_id,
      similarity: s.similarity,
      weight: (s.similarity * s.sample_count) / totalWeight,
    }));

    const expectedPerformance = selected.reduce(
      (sum, s) => sum + s.performance_score * ((s.similarity * s.sample_count) / totalWeight),
      0
    );

    const transferredPolicyId = `${parsed.target_customer}_${parsed.material_class}_${parsed.operation_type}_transfer`;

    this.transfers.push({
      targetCustomer: parsed.target_customer,
      transferredPolicyId,
      sourcesUsed: selected.map(s => s.source_policy_id),
      timestamp: new Date().toISOString(),
    });

    return PolicyTransferResultSchema.parse({
      target_customer: parsed.target_customer,
      sources_used: sourcesUsed,
      transferred_policy_id: transferredPolicyId,
      expected_performance: expectedPerformance,
      adaptation_required: expectedPerformance < 0.8,
    });
  }

  private computeSimilarity(source: PolicyTransferSource, request: PolicyTransferRequest): number {
    let similarity = 1.0;

    if (source.material_class === request.material_class) similarity *= 1.0;
    if (source.operation_type === request.operation_type) similarity *= 1.0;
    if (source.machine_class === request.machine_class) similarity *= 1.0;

    similarity *= source.performance_score;
    similarity *= Math.min(1, source.sample_count / 100);

    return similarity;
  }

  /**
   * Find similar source policies without transferring.
   */
  findSimilar(request: PolicyTransferRequest): Array<{ source_policy_id: string; similarity: number }> {
    const parsed = PolicyTransferRequestSchema.parse(request);
    const results: Array<{ source_policy_id: string; similarity: number }> = [];

    for (const source of this.sources.values()) {
      if (source.material_class !== parsed.material_class) continue;
      if (source.operation_type !== parsed.operation_type) continue;
      if (source.machine_class !== parsed.machine_class) continue;

      const similarity = this.computeSimilarity(source, parsed);
      if (similarity >= parsed.min_similarity) {
        results.push({ source_policy_id: source.source_policy_id, similarity });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, parsed.max_sources);
  }

  /**
   * Get transfer history.
   */
  getTransferHistory(targetCustomer?: string): TransferRecord[] {
    if (targetCustomer) {
      return this.transfers.filter(t => t.targetCustomer === targetCustomer);
    }
    return [...this.transfers];
  }

  /**
   * Get statistics.
   */
  getStats(): { source_count: number; transfer_count: number; unique_targets: number } {
    const uniqueTargets = new Set(this.transfers.map(t => t.targetCustomer));
    return {
      source_count: this.sources.size,
      transfer_count: this.transfers.length,
      unique_targets: uniqueTargets.size,
    };
  }

  /**
   * List registered sources.
   */
  listSources(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Delete a source.
   */
  deleteSource(policyId: string): boolean {
    return this.sources.delete(policyId);
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.sources.clear();
    this.transfers = [];
  }

  static getSelfAwareness() {
    return {
      name: "CrossCustomerPolicyTransferEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["registerSource", "transfer", "findSimilar", "getTransferHistory"],
    };
  }
}

export const crossCustomerPolicyTransferEngine = new CrossCustomerPolicyTransferEngine();
