// WIRE-EXEMPT: tests in ProtoMAMLEngines.test.ts
/**
 * Prototypical Network Engine — U-LEARN-11
 * =========================================
 *
 * Implements Prototypical Networks for few-shot learning in manufacturing.
 * Computes class prototypes from support set and predicts via Euclidean
 * distance in embedding space.
 *
 * Reference: Snell et al. 2017 "Prototypical Networks for Few-shot Learning"
 *
 * Key equations:
 * - Prototype: c_k = (1/|S_k|) * Σ_{x∈S_k} f_φ(x)
 * - Distance: d(x, c_k) = ||f_φ(x) - c_k||²
 * - Prediction: p(y=k|x) = softmax(-d(x, c_k))
 *
 * Manufacturing use case:
 * - Support set: 3-10 examples from new customer
 * - Prototype: mean embedding per (customer, material, operation) tuple
 * - Query: new part for quote → predict optimal parameters
 *
 * @module engines/PrototypicalNetworkEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-11
 */

import {
  PrototypeSupportSetSchema,
  PrototypeQuerySchema,
  PrototypePredictionSchema,
  type PrototypeSupportSet,
  type PrototypeQuery,
  type PrototypePrediction,
  type PrototypeSupportExample,
} from "../schemas/continualLearningSchema.js";

interface Prototype {
  classId: string;
  centroid: number[];
  supportCount: number;
  meanTarget: number;
  targetVariance: number;
}

interface TaskState {
  domain: string;
  prototypes: Map<string, Prototype>;
  featureDim: number;
  createdAt: string;
}

class PrototypicalNetworkEngine {
  private tasks: Map<string, TaskState> = new Map();

  /**
   * Compute prototypes from support set.
   * @param supportSet - Support set with examples per class
   * @returns Prototype computation result
   */
  computePrototypes(supportSet: PrototypeSupportSet): {
    task_id: string;
    domain: string;
    prototype_count: number;
    prototypes: Array<{ class_id: string; support_count: number; mean_target: number }>;
  } {
    const parsed = PrototypeSupportSetSchema.parse(supportSet);

    const groupedByClass = new Map<string, PrototypeSupportExample[]>();
    for (const example of parsed.examples) {
      const existing = groupedByClass.get(example.class_id) || [];
      existing.push(example);
      groupedByClass.set(example.class_id, existing);
    }

    const featureDim = parsed.examples[0]?.features.length || 0;
    if (featureDim === 0) {
      throw new Error("Support set examples must have non-empty features");
    }

    const prototypes = new Map<string, Prototype>();

    for (const [classId, examples] of groupedByClass) {
      const centroid = new Array(featureDim).fill(0);
      let targetSum = 0;
      let targetSumSq = 0;

      for (const ex of examples) {
        if (ex.features.length !== featureDim) {
          throw new Error(`Feature dimension mismatch: expected ${featureDim}, got ${ex.features.length}`);
        }
        for (let i = 0; i < featureDim; i++) {
          centroid[i] += ex.features[i];
        }
        targetSum += ex.target;
        targetSumSq += ex.target * ex.target;
      }

      const n = examples.length;
      for (let i = 0; i < featureDim; i++) {
        centroid[i] /= n;
      }

      const meanTarget = targetSum / n;
      const targetVariance = n > 1 ? (targetSumSq / n - meanTarget * meanTarget) : 0;

      prototypes.set(classId, {
        classId,
        centroid,
        supportCount: n,
        meanTarget,
        targetVariance,
      });
    }

    this.tasks.set(parsed.task_id, {
      domain: parsed.domain,
      prototypes,
      featureDim,
      createdAt: new Date().toISOString(),
    });

    return {
      task_id: parsed.task_id,
      domain: parsed.domain,
      prototype_count: prototypes.size,
      prototypes: Array.from(prototypes.values()).map((p) => ({
        class_id: p.classId,
        support_count: p.supportCount,
        mean_target: p.meanTarget,
      })),
    };
  }

  /**
   * Predict using distance to prototypes.
   * @param query - Query point for prediction
   * @returns Prediction with confidence and prototype weights
   */
  predict(query: PrototypeQuery): PrototypePrediction {
    const parsed = PrototypeQuerySchema.parse(query);

    const task = this.tasks.get(parsed.task_id);
    if (!task) throw new Error(`Task not found: ${parsed.task_id}`);

    if (parsed.query_features.length !== task.featureDim) {
      throw new Error(`Feature dimension mismatch: expected ${task.featureDim}, got ${parsed.query_features.length}`);
    }

    if (task.prototypes.size === 0) {
      throw new Error("No prototypes computed for task");
    }

    const distances: Array<{ classId: string; distance: number; target: number }> = [];

    for (const [classId, proto] of task.prototypes) {
      let dist = 0;
      for (let i = 0; i < task.featureDim; i++) {
        const diff = parsed.query_features[i] - proto.centroid[i];
        dist += diff * diff;
      }
      distances.push({ classId, distance: dist, target: proto.meanTarget });
    }

    distances.sort((a, b) => a.distance - b.distance);
    const nearest = distances[0];

    const negDistances = distances.map((d) => -d.distance);
    const maxNegDist = Math.max(...negDistances);
    const expScores = negDistances.map((nd) => Math.exp(nd - maxNegDist));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const softmax = expScores.map((e) => e / sumExp);

    let predictedValue = 0;
    const prototypeWeights: Record<string, number> = {};
    for (let i = 0; i < distances.length; i++) {
      predictedValue += softmax[i] * distances[i].target;
      prototypeWeights[distances[i].classId] = softmax[i];
    }

    return PrototypePredictionSchema.parse({
      task_id: parsed.task_id,
      predicted_value: predictedValue,
      nearest_prototype: nearest.classId,
      distance: nearest.distance,
      confidence: softmax[0],
      prototype_weights: prototypeWeights,
    });
  }

  /**
   * Get task state for inspection.
   * @param taskId - Task identifier
   * @returns Task state or null
   */
  getTaskState(taskId: string): {
    task_id: string;
    domain: string;
    prototype_count: number;
    feature_dim: number;
    created_at: string;
  } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return {
      task_id: taskId,
      domain: task.domain,
      prototype_count: task.prototypes.size,
      feature_dim: task.featureDim,
      created_at: task.createdAt,
    };
  }

  /**
   * Clear task to free memory.
   * @param taskId - Task identifier
   * @returns Whether task was deleted
   */
  clearTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * List all active tasks.
   * @returns Array of task IDs
   */
  listTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export const prototypicalNetworkEngine = new PrototypicalNetworkEngine();
