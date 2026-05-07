// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
/**
 * Orthogonal LoRA Engine — U-LEARN-05
 * =====================================
 *
 * Enforces orthogonality constraints between LoRA adapters to prevent
 * catastrophic forgetting. When multiple adapters are active, their
 * update directions should be orthogonal to preserve prior knowledge.
 *
 * Key techniques:
 * - Cosine similarity monitoring between adapter pairs
 * - Orthogonality loss computation for training
 * - Subspace overlap analysis
 * - Gram-Schmidt orthogonalization for correction
 *
 * @module engines/OrthogonalLoRAEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import type {
  OrthogonalConstraint,
  OrthogonalityMetrics,
} from "../schemas/loraCompositionSchema.js";

interface AdapterDirection {
  adapter_id: string;
  direction: number[];
  domain?: string;
}

class OrthogonalLoRAEngine {
  private directions: Map<string, AdapterDirection> = new Map();
  private constraints: OrthogonalConstraint[] = [];

  registerDirection(
    adapterId: string,
    direction: number[],
    domain?: string
  ): void {
    this.directions.set(adapterId, {
      adapter_id: adapterId,
      direction,
      domain,
    });
  }

  registerDirections(
    adapters: Array<{ adapter_id: string; direction: number[]; domain?: string }>
  ): { registered: number } {
    for (const adapter of adapters) {
      this.registerDirection(adapter.adapter_id, adapter.direction, adapter.domain);
    }
    return { registered: adapters.length };
  }

  addConstraint(constraint: OrthogonalConstraint): void {
    this.constraints.push(constraint);
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private magnitude(v: number[]): number {
    return Math.sqrt(this.dotProduct(v, v));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return this.dotProduct(a, b) / (magA * magB);
  }

  computeOrthogonality(
    adapterId1: string,
    adapterId2: string
  ): OrthogonalityMetrics | null {
    const dir1 = this.directions.get(adapterId1);
    const dir2 = this.directions.get(adapterId2);

    if (!dir1 || !dir2) return null;

    const cosine = this.cosineSimilarity(dir1.direction, dir2.direction);

    const orthogonalityLoss = cosine * cosine;

    const absCosine = Math.abs(cosine);
    const subspaceOverlap = absCosine;

    return {
      adapter_pair: [adapterId1, adapterId2],
      cosine_similarity: cosine,
      orthogonality_loss: orthogonalityLoss,
      subspace_overlap: subspaceOverlap,
    };
  }

  computeAllPairwiseMetrics(): OrthogonalityMetrics[] {
    const adapterIds = Array.from(this.directions.keys());
    const metrics: OrthogonalityMetrics[] = [];

    for (let i = 0; i < adapterIds.length; i++) {
      for (let j = i + 1; j < adapterIds.length; j++) {
        const m = this.computeOrthogonality(adapterIds[i], adapterIds[j]);
        if (m) metrics.push(m);
      }
    }

    return metrics;
  }

  computeConstrainedLoss(): {
    total_loss: number;
    per_constraint: Array<{ constraint_index: number; loss: number }>;
  } {
    let totalLoss = 0;
    const perConstraint: Array<{ constraint_index: number; loss: number }> = [];

    for (let i = 0; i < this.constraints.length; i++) {
      const constraint = this.constraints[i];
      let constraintLoss = 0;

      for (let j = 0; j < constraint.adapter_ids.length; j++) {
        for (let k = j + 1; k < constraint.adapter_ids.length; k++) {
          const metrics = this.computeOrthogonality(
            constraint.adapter_ids[j],
            constraint.adapter_ids[k]
          );
          if (metrics) {
            constraintLoss +=
              metrics.orthogonality_loss * constraint.constraint_strength;
          }
        }
      }

      totalLoss += constraintLoss;
      perConstraint.push({ constraint_index: i, loss: constraintLoss });
    }

    return { total_loss: totalLoss, per_constraint: perConstraint };
  }

  orthogonalize(adapterId: string, referenceIds: string[]): number[] | null {
    const target = this.directions.get(adapterId);
    if (!target) return null;

    let result = [...target.direction];

    for (const refId of referenceIds) {
      const ref = this.directions.get(refId);
      if (!ref || refId === adapterId) continue;

      const projCoeff =
        this.dotProduct(result, ref.direction) /
        this.dotProduct(ref.direction, ref.direction);

      for (let i = 0; i < result.length; i++) {
        result[i] -= projCoeff * (ref.direction[i] ?? 0);
      }
    }

    const mag = this.magnitude(result);
    if (mag > 1e-8) {
      result = result.map((v) => v / mag);
    }

    return result;
  }

  orthogonalizeAll(): Map<string, number[]> {
    const adapterIds = Array.from(this.directions.keys());
    const result = new Map<string, number[]>();

    for (let i = 0; i < adapterIds.length; i++) {
      const adapterId = adapterIds[i];
      const referenceIds = adapterIds.slice(0, i);
      const orthogonalized = this.orthogonalize(adapterId, referenceIds);
      if (orthogonalized) {
        result.set(adapterId, orthogonalized);
        this.directions.get(adapterId)!.direction = orthogonalized;
      }
    }

    return result;
  }

  getViolations(threshold: number = 0.1): OrthogonalityMetrics[] {
    const allMetrics = this.computeAllPairwiseMetrics();
    return allMetrics.filter((m) => Math.abs(m.cosine_similarity) > threshold);
  }

  getDomainOrthogonality(domain: string): {
    domain: string;
    adapter_count: number;
    avg_cosine: number;
    max_overlap: number;
  } | null {
    const domainAdapters = Array.from(this.directions.values()).filter(
      (d) => d.domain === domain
    );

    if (domainAdapters.length < 2) {
      return {
        domain,
        adapter_count: domainAdapters.length,
        avg_cosine: 0,
        max_overlap: 0,
      };
    }

    let sumCosine = 0;
    let maxOverlap = 0;
    let pairCount = 0;

    for (let i = 0; i < domainAdapters.length; i++) {
      for (let j = i + 1; j < domainAdapters.length; j++) {
        const metrics = this.computeOrthogonality(
          domainAdapters[i].adapter_id,
          domainAdapters[j].adapter_id
        );
        if (metrics) {
          sumCosine += Math.abs(metrics.cosine_similarity);
          maxOverlap = Math.max(maxOverlap, metrics.subspace_overlap);
          pairCount++;
        }
      }
    }

    return {
      domain,
      adapter_count: domainAdapters.length,
      avg_cosine: pairCount > 0 ? sumCosine / pairCount : 0,
      max_overlap: maxOverlap,
    };
  }

  listAdapters(): string[] {
    return Array.from(this.directions.keys());
  }

  getDirection(adapterId: string): number[] | null {
    return this.directions.get(adapterId)?.direction ?? null;
  }

  removeAdapter(adapterId: string): boolean {
    return this.directions.delete(adapterId);
  }

  clearConstraints(): void {
    this.constraints = [];
  }

  clear(): void {
    this.directions.clear();
    this.constraints = [];
  }
}

export const orthogonalLoRAEngine = new OrthogonalLoRAEngine();
export type { OrthogonalConstraint, OrthogonalityMetrics };
