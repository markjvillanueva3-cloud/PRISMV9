// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * DER++ Engine — U-LEARN-10
 * ==========================
 *
 * Dark Experience Replay++ for continual learning. Stores past experiences
 * with their logits and uses KL-divergence distillation to prevent forgetting.
 *
 * Reference: Buzzega et al. 2020 "Dark Experience for General Continual Learning"
 *            Extended 2023 with KL-distillation on replayed logits
 *
 * Key equations:
 * - DER loss: L = L_task + α * MSE(f(x_buf), logits_buf) + β * CE(y_buf, f(x_buf))
 * - KL variant: L_KL = KL(softmax(logits_buf/T) || softmax(f(x_buf)/T))
 *
 * @module engines/DERPlusPlusEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  DERBufferConfigSchema,
  DERExperienceSchema,
  DERSampleSchema,
  DERLossSchema,
  DERLossResultSchema,
  type DERBufferConfig,
  type DERExperience,
  type DERSample,
  type DERLoss,
  type DERLossResult,
} from "../schemas/continualLearningSchema.js";

interface BufferState {
  maxSize: number;
  alpha: number;
  beta: number;
  experiences: DERExperience[];
  taskCounts: Map<string, number>;
  insertIndex: number;
}

class DERPlusPlusEngine {
  private buffers: Map<string, BufferState> = new Map();

  /**
   * Create a DER++ replay buffer.
   * @param config - Buffer configuration
   * @returns Buffer creation confirmation
   */
  createBuffer(config: DERBufferConfig): { buffer_id: string; max_size: number; created: boolean } {
    const parsed = DERBufferConfigSchema.parse(config);

    this.buffers.set(parsed.buffer_id, {
      maxSize: parsed.max_size,
      alpha: parsed.alpha,
      beta: parsed.beta,
      experiences: [],
      taskCounts: new Map(),
      insertIndex: 0,
    });

    return {
      buffer_id: parsed.buffer_id,
      max_size: parsed.max_size,
      created: true,
    };
  }

  /**
   * Add experience with logits to buffer.
   * Uses reservoir sampling for balanced task representation.
   * @param bufferId - Buffer identifier
   * @param experience - Experience with logits
   */
  addExperience(bufferId: string, experience: DERExperience): { added: boolean; buffer_size: number } {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) throw new Error(`Buffer not found: ${bufferId}`);

    const parsed = DERExperienceSchema.parse(experience);

    if (buffer.experiences.length < buffer.maxSize) {
      buffer.experiences.push(parsed);
    } else {
      const replaceIdx = Math.floor(Math.random() * buffer.insertIndex);
      if (replaceIdx < buffer.maxSize) {
        buffer.experiences[replaceIdx] = parsed;
      }
    }

    buffer.insertIndex++;
    const count = buffer.taskCounts.get(parsed.task_id) ?? 0;
    buffer.taskCounts.set(parsed.task_id, count + 1);

    return {
      added: true,
      buffer_size: buffer.experiences.length,
    };
  }

  /**
   * Sample batch from buffer.
   * @param input - Sample configuration
   * @returns Sampled experiences with indices
   */
  sample(input: DERSample): { experiences: DERExperience[]; indices: number[] } {
    const parsed = DERSampleSchema.parse(input);
    const buffer = this.buffers.get(parsed.buffer_id);
    if (!buffer) throw new Error(`Buffer not found: ${parsed.buffer_id}`);

    if (buffer.experiences.length === 0) {
      return { experiences: [], indices: [] };
    }

    let candidates = buffer.experiences;
    if (parsed.task_id) {
      candidates = buffer.experiences.filter(e => e.task_id === parsed.task_id);
    }

    const sampleSize = Math.min(parsed.batch_size, candidates.length);
    const indices: number[] = [];
    const experiences: DERExperience[] = [];

    const shuffled = [...candidates.keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < sampleSize; i++) {
      const idx = shuffled[i];
      indices.push(idx);
      experiences.push(candidates[idx]);
    }

    return { experiences, indices };
  }

  /**
   * Compute DER++ loss: KL + MSE distillation.
   * @param input - Current logits and sample indices
   * @returns Loss components
   */
  computeLoss(input: DERLoss): DERLossResult {
    const parsed = DERLossSchema.parse(input);
    const buffer = this.buffers.get(parsed.buffer_id);
    if (!buffer) throw new Error(`Buffer not found: ${parsed.buffer_id}`);

    if (parsed.sample_indices.length === 0 || parsed.current_logits.length === 0) {
      return DERLossResultSchema.parse({
        kl_loss: 0,
        mse_loss: 0,
        combined_loss: 0,
        samples_used: 0,
      });
    }

    let klLoss = 0;
    let mseLoss = 0;
    let count = 0;

    for (let i = 0; i < parsed.sample_indices.length; i++) {
      const idx = parsed.sample_indices[i];
      if (idx >= buffer.experiences.length) continue;

      const stored = buffer.experiences[idx];
      const current = parsed.current_logits[i];
      if (!current || current.length !== stored.logits.length) continue;

      const storedSoftmax = this.softmax(stored.logits, 2.0);
      const currentSoftmax = this.softmax(current, 2.0);
      for (let j = 0; j < storedSoftmax.length; j++) {
        if (storedSoftmax[j] > 1e-10) {
          klLoss += storedSoftmax[j] * Math.log(storedSoftmax[j] / Math.max(currentSoftmax[j], 1e-10));
        }
      }

      for (let j = 0; j < stored.logits.length; j++) {
        const diff = current[j] - stored.logits[j];
        mseLoss += diff * diff;
      }

      count++;
    }

    if (count > 0) {
      klLoss /= count;
      mseLoss /= count;
    }

    const combined = buffer.alpha * mseLoss + buffer.beta * klLoss;

    return DERLossResultSchema.parse({
      kl_loss: klLoss,
      mse_loss: mseLoss,
      combined_loss: combined,
      samples_used: count,
    });
  }

  private softmax(logits: number[], temperature: number): number[] {
    const scaled = logits.map(l => l / temperature);
    const maxVal = Math.max(...scaled);
    const exps = scaled.map(l => Math.exp(l - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  /**
   * Get buffer statistics.
   */
  getStats(bufferId: string): { size: number; tasks: string[]; task_distribution: Record<string, number> } | null {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return null;

    const dist: Record<string, number> = {};
    buffer.taskCounts.forEach((v, k) => { dist[k] = v; });

    return {
      size: buffer.experiences.length,
      tasks: Array.from(buffer.taskCounts.keys()),
      task_distribution: dist,
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
      name: "DERPlusPlusEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["createBuffer", "addExperience", "sample", "computeLoss"],
      reference: "Buzzega et al. 2020 - Dark Experience for General Continual Learning",
    };
  }
}

export const derPlusPlusEngine = new DERPlusPlusEngine();
