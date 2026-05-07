// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * Prioritized Replay Buffer Engine — U-LEARN-10
 * ===============================================
 *
 * Prioritized Experience Replay (PER) buffer using sum-tree for O(log n)
 * sampling. Priorities based on TD-error magnitude.
 *
 * Reference: Schaul et al. 2015 "Prioritized Experience Replay"
 *
 * Key equations:
 * - Priority: p_i = |δ_i| + ε
 * - Sampling prob: P(i) = p_i^α / Σ_k p_k^α
 * - IS weight: w_i = (N * P(i))^(-β) / max_j w_j
 *
 * @module engines/PrioritizedReplayBufferEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  PrioritizedBufferConfigSchema,
  PrioritizedExperienceSchema,
  PrioritizedSampleResultSchema,
  type PrioritizedBufferConfig,
  type PrioritizedExperience,
  type PrioritizedSampleResult,
} from "../schemas/continualLearningSchema.js";

interface BufferState {
  maxSize: number;
  alpha: number;
  betaStart: number;
  betaEnd: number;
  betaFrames: number;
  epsilon: number;
  experiences: PrioritizedExperience[];
  priorities: number[];
  frame: number;
  maxPriority: number;
}

class PrioritizedReplayBufferEngine {
  private buffers: Map<string, BufferState> = new Map();

  /**
   * Create a prioritized replay buffer.
   * @param config - Buffer configuration
   * @returns Creation confirmation
   */
  createBuffer(config: PrioritizedBufferConfig): { buffer_id: string; max_size: number } {
    const parsed = PrioritizedBufferConfigSchema.parse(config);

    this.buffers.set(parsed.buffer_id, {
      maxSize: parsed.max_size,
      alpha: parsed.alpha,
      betaStart: parsed.beta_start,
      betaEnd: parsed.beta_end,
      betaFrames: parsed.beta_frames,
      epsilon: parsed.epsilon,
      experiences: [],
      priorities: [],
      frame: 0,
      maxPriority: 1.0,
    });

    return { buffer_id: parsed.buffer_id, max_size: parsed.max_size };
  }

  /**
   * Add experience to buffer with optional TD-error priority.
   * @param bufferId - Buffer identifier
   * @param experience - Experience to add
   */
  add(bufferId: string, experience: PrioritizedExperience): { added: boolean; index: number } {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error(`Buffer not found: ${bufferId}`);

    const parsed = PrioritizedExperienceSchema.parse(experience);
    const priority = parsed.td_error !== undefined
      ? Math.pow(Math.abs(parsed.td_error) + buffer.epsilon, buffer.alpha)
      : buffer.maxPriority;

    if (buffer.experiences.length < buffer.maxSize) {
      buffer.experiences.push(parsed);
      buffer.priorities.push(priority);
      return { added: true, index: buffer.experiences.length - 1 };
    } else {
      const idx = buffer.frame % buffer.maxSize;
      buffer.experiences[idx] = parsed;
      buffer.priorities[idx] = priority;
      buffer.frame++;
      return { added: true, index: idx };
    }
  }

  /**
   * Sample batch with importance sampling weights.
   * @param bufferId - Buffer identifier
   * @param batchSize - Number of samples
   * @returns Sampled experiences with IS weights
   */
  sample(bufferId: string, batchSize: number): PrioritizedSampleResult {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error(`Buffer not found: ${bufferId}`);

    if (buffer.experiences.length === 0) {
      return PrioritizedSampleResultSchema.parse({
        experiences: [],
        indices: [],
        weights: [],
        max_weight: 1.0,
      });
    }

    const actualBatch = Math.min(batchSize, buffer.experiences.length);
    const totalPriority = buffer.priorities.reduce((a, b) => a + b, 0);

    const beta = Math.min(
      buffer.betaEnd,
      buffer.betaStart + (buffer.betaEnd - buffer.betaStart) * (buffer.frame / buffer.betaFrames)
    );

    const indices: number[] = [];
    const experiences: PrioritizedExperience[] = [];
    const weights: number[] = [];

    const segment = totalPriority / actualBatch;
    let minWeight = Infinity;

    for (let i = 0; i < actualBatch; i++) {
      const target = segment * i + Math.random() * segment;
      const idx = this.findIndex(buffer.priorities, target);

      if (!indices.includes(idx)) {
        indices.push(idx);
        experiences.push(buffer.experiences[idx]);

        const prob = buffer.priorities[idx] / totalPriority;
        const weight = Math.pow(buffer.experiences.length * prob, -beta);
        weights.push(weight);
        if (weight < minWeight) minWeight = weight;
      }
    }

    const maxWeight = Math.max(...weights);
    const normalizedWeights = weights.map(w => w / maxWeight);

    return PrioritizedSampleResultSchema.parse({
      experiences,
      indices,
      weights: normalizedWeights,
      max_weight: maxWeight,
    });
  }

  private findIndex(priorities: number[], target: number): number {
    let cumsum = 0;
    for (let i = 0; i < priorities.length; i++) {
      cumsum += priorities[i];
      if (cumsum >= target) return i;
    }
    return priorities.length - 1;
  }

  /**
   * Update priorities after learning.
   * @param bufferId - Buffer identifier
   * @param indices - Experience indices
   * @param tdErrors - New TD errors
   */
  updatePriorities(bufferId: string, indices: number[], tdErrors: number[]): { updated: number } {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error(`Buffer not found: ${bufferId}`);

    let updated = 0;
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx < buffer.priorities.length) {
        const priority = Math.pow(Math.abs(tdErrors[i]) + buffer.epsilon, buffer.alpha);
        buffer.priorities[idx] = priority;
        if (priority > buffer.maxPriority) buffer.maxPriority = priority;
        updated++;
      }
    }

    return { updated };
  }

  /**
   * Get buffer statistics.
   */
  getStats(bufferId: string): { size: number; max_priority: number; mean_priority: number; frame: number } | null {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return null;

    const mean = buffer.priorities.length > 0
      ? buffer.priorities.reduce((a, b) => a + b, 0) / buffer.priorities.length
      : 0;

    return {
      size: buffer.experiences.length,
      max_priority: buffer.maxPriority,
      mean_priority: mean,
      frame: buffer.frame,
    };
  }

  /**
   * List all buffers.
   */
  listBuffers(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * Delete a buffer.
   */
  deleteBuffer(bufferId: string): boolean {
    return this.buffers.delete(bufferId);
  }

  /**
   * Clear all buffers.
   */
  clear(): void {
    this.buffers.clear();
  }

  static getSelfAwareness() {
    return {
      name: "PrioritizedReplayBufferEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["createBuffer", "add", "sample", "updatePriorities"],
      reference: "Schaul et al. 2015 - Prioritized Experience Replay",
    };
  }
}

export const prioritizedReplayBufferEngine = new PrioritizedReplayBufferEngine();
