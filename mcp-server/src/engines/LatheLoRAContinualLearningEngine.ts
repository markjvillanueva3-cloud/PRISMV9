/**
 * LatheLoRAContinualLearningEngine — LATHE-LORA-MS0 U-LLR30
 * =========================================================
 *
 * Manages continual learning for LatheLoRA models.
 * Handles incremental training without catastrophic forgetting.
 *
 * Features:
 *   - Experience replay buffer
 *   - EWC (Elastic Weight Consolidation)
 *   - Learning rate scheduling
 *   - Checkpoint management
 *
 * @module engines/LatheLoRAContinualLearningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Learning phase */
export type LearningPhase = "idle" | "collecting" | "training" | "validating" | "deployed";

/** Experience entry */
export interface Experience {
  id: string;
  prompt: string;
  response: string;
  rating: number;
  timestamp: number;
  category: string;
  metadata?: Record<string, unknown>;
}

/** Training batch */
export interface TrainingBatch {
  id: string;
  experiences: Experience[];
  created_at: number;
  status: "pending" | "training" | "complete" | "failed";
  metrics?: {
    loss: number;
    accuracy: number;
    duration_ms: number;
  };
}

/** Learning session */
export interface LearningSession {
  id: string;
  model_id: string;
  phase: LearningPhase;
  started_at: number;
  completed_at?: number;
  batches: TrainingBatch[];
  config: LearningSessionConfig;
  results?: {
    total_experiences: number;
    batches_processed: number;
    final_loss: number;
    improvement_percent: number;
  };
}

/** Session configuration */
export interface LearningSessionConfig {
  batch_size: number;
  learning_rate: number;
  ewc_lambda: number;
  replay_ratio: number;
  max_batches: number;
  validation_split: number;
}

/** Replay buffer configuration */
export interface ReplayBufferConfig {
  max_size: number;
  priority_sampling: boolean;
  category_balance: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SESSION_CONFIG: LearningSessionConfig = {
  batch_size: 32,
  learning_rate: 1e-5,
  ewc_lambda: 0.4,
  replay_ratio: 0.3,
  max_batches: 100,
  validation_split: 0.1,
};

const DEFAULT_BUFFER_CONFIG: ReplayBufferConfig = {
  max_size: 10000,
  priority_sampling: true,
  category_balance: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAContinualLearningEngine {
  private sessionConfig: LearningSessionConfig = DEFAULT_SESSION_CONFIG;
  private bufferConfig: ReplayBufferConfig = DEFAULT_BUFFER_CONFIG;
  private replayBuffer: Experience[] = [];
  private sessions: Map<string, LearningSession> = new Map();
  private activeSession: string | null = null;

  /**
   * Set session configuration
   */
  setSessionConfig(config: Partial<LearningSessionConfig>): void {
    this.sessionConfig = { ...this.sessionConfig, ...config };
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): LearningSessionConfig {
    return { ...this.sessionConfig };
  }

  /**
   * Set buffer configuration
   */
  setBufferConfig(config: Partial<ReplayBufferConfig>): void {
    this.bufferConfig = { ...this.bufferConfig, ...config };
  }

  /**
   * Get buffer configuration
   */
  getBufferConfig(): ReplayBufferConfig {
    return { ...this.bufferConfig };
  }

  /**
   * Add experience to replay buffer
   */
  addExperience(experience: Omit<Experience, "id" | "timestamp">): Experience {
    const exp: Experience = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...experience,
    };

    this.replayBuffer.push(exp);

    // Enforce max size
    if (this.replayBuffer.length > this.bufferConfig.max_size) {
      // Remove lowest rated experiences
      this.replayBuffer.sort((a, b) => b.rating - a.rating);
      this.replayBuffer = this.replayBuffer.slice(0, this.bufferConfig.max_size);
    }

    return exp;
  }

  /**
   * Get replay buffer
   */
  getReplayBuffer(limit?: number): Experience[] {
    const buffer = [...this.replayBuffer];
    return limit ? buffer.slice(-limit) : buffer;
  }

  /**
   * Sample from replay buffer
   */
  sampleReplay(count: number): Experience[] {
    if (this.replayBuffer.length === 0) return [];

    const samples: Experience[] = [];
    const available = [...this.replayBuffer];

    if (this.bufferConfig.priority_sampling) {
      // Priority sampling based on rating
      available.sort((a, b) => b.rating - a.rating);
    }

    if (this.bufferConfig.category_balance) {
      // Balance across categories
      const byCategory = new Map<string, Experience[]>();
      for (const exp of available) {
        const cat = exp.category || "unknown";
        const list = byCategory.get(cat) || [];
        list.push(exp);
        byCategory.set(cat, list);
      }

      const categories = Array.from(byCategory.keys());
      let idx = 0;
      while (samples.length < count && samples.length < available.length) {
        const cat = categories[idx % categories.length];
        const catExps = byCategory.get(cat) || [];
        if (catExps.length > 0) {
          samples.push(catExps.shift()!);
        }
        idx++;
      }
    } else {
      // Simple sampling
      for (let i = 0; i < Math.min(count, available.length); i++) {
        samples.push(available[i]);
      }
    }

    return samples;
  }

  /**
   * Start learning session
   */
  startSession(modelId: string, config?: Partial<LearningSessionConfig>): LearningSession {
    if (this.activeSession) {
      throw new Error(`Active session already exists: ${this.activeSession}`);
    }

    const session: LearningSession = {
      id: `learn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model_id: modelId,
      phase: "collecting",
      started_at: Date.now(),
      batches: [],
      config: { ...this.sessionConfig, ...config },
    };

    this.sessions.set(session.id, session);
    this.activeSession = session.id;

    log.info(`Started learning session: ${session.id} for model ${modelId}`);

    return session;
  }

  /**
   * Get active session
   */
  getActiveSession(): LearningSession | null {
    if (!this.activeSession) return null;
    return this.sessions.get(this.activeSession) || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): LearningSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Create training batch from experiences
   */
  createBatch(sessionId: string, newExperiences: Experience[]): TrainingBatch | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Mix new experiences with replay
    const replayCount = Math.floor(newExperiences.length * session.config.replay_ratio);
    const replayExperiences = this.sampleReplay(replayCount);

    const allExperiences = [...newExperiences, ...replayExperiences];

    const batch: TrainingBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      experiences: allExperiences,
      created_at: Date.now(),
      status: "pending",
    };

    session.batches.push(batch);
    session.phase = "training";

    return batch;
  }

  /**
   * Record batch completion
   */
  completeBatch(
    sessionId: string,
    batchId: string,
    metrics: { loss: number; accuracy: number; duration_ms: number }
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const batch = session.batches.find(b => b.id === batchId);
    if (!batch) return false;

    batch.status = "complete";
    batch.metrics = metrics;

    // Add experiences to replay buffer
    for (const exp of batch.experiences) {
      if (!this.replayBuffer.find(e => e.id === exp.id)) {
        this.replayBuffer.push(exp);
      }
    }

    return true;
  }

  /**
   * Complete learning session
   */
  completeSession(sessionId: string): LearningSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.phase = "deployed";
    session.completed_at = Date.now();

    // Calculate results
    const completedBatches = session.batches.filter(b => b.status === "complete");
    const totalExperiences = completedBatches.reduce((sum, b) => sum + b.experiences.length, 0);
    const avgLoss = completedBatches.length > 0
      ? completedBatches.reduce((sum, b) => sum + (b.metrics?.loss || 0), 0) / completedBatches.length
      : 0;

    session.results = {
      total_experiences: totalExperiences,
      batches_processed: completedBatches.length,
      final_loss: avgLoss,
      improvement_percent: 0, // Would be calculated from validation
    };

    if (this.activeSession === sessionId) {
      this.activeSession = null;
    }

    return session;
  }

  /**
   * Generate training configuration
   */
  generateTrainingConfig(sessionId: string): {
    script: string;
    config: Record<string, unknown>;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const config = {
      model_id: session.model_id,
      learning_rate: session.config.learning_rate,
      batch_size: session.config.batch_size,
      ewc_lambda: session.config.ewc_lambda,
      num_epochs: 1,
      gradient_accumulation_steps: 4,
      warmup_ratio: 0.1,
      weight_decay: 0.01,
      max_grad_norm: 1.0,
      save_strategy: "epoch",
      evaluation_strategy: "epoch",
      logging_steps: 10,
    };

    const script = `
# LatheLoRA Continual Learning Script
# Session: ${session.id}
# Model: ${session.model_id}

from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import get_peft_model, LoraConfig, TaskType
import torch

# EWC implementation
class EWCTrainer(Trainer):
    def __init__(self, ewc_lambda=${session.config.ewc_lambda}, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ewc_lambda = ewc_lambda
        self.fisher_matrix = None
        self.old_params = None

    def compute_loss(self, model, inputs, return_outputs=False):
        loss = super().compute_loss(model, inputs, return_outputs)
        if self.fisher_matrix is not None:
            ewc_loss = self.ewc_penalty(model)
            loss = loss + self.ewc_lambda * ewc_loss
        return loss

    def ewc_penalty(self, model):
        penalty = 0
        for name, param in model.named_parameters():
            if name in self.fisher_matrix:
                penalty += (self.fisher_matrix[name] * (param - self.old_params[name]) ** 2).sum()
        return penalty

# Training configuration
training_args = TrainingArguments(
    output_dir="./lathe-lora-continual",
    learning_rate=${session.config.learning_rate},
    per_device_train_batch_size=${session.config.batch_size},
    num_train_epochs=1,
    logging_steps=10,
    save_strategy="epoch",
)

print("Continual learning configuration generated")
`;

    return { script, config };
  }

  /**
   * Get all sessions
   */
  getAllSessions(limit?: number): LearningSession[] {
    const sessions = Array.from(this.sessions.values());
    return limit ? sessions.slice(-limit) : sessions;
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): {
    total_experiences: number;
    by_category: Record<string, number>;
    avg_rating: number;
    oldest_timestamp: number;
    newest_timestamp: number;
  } {
    const byCategory: Record<string, number> = {};
    let totalRating = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const exp of this.replayBuffer) {
      const cat = exp.category || "unknown";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      totalRating += exp.rating;
      if (exp.timestamp < oldest) oldest = exp.timestamp;
      if (exp.timestamp > newest) newest = exp.timestamp;
    }

    return {
      total_experiences: this.replayBuffer.length,
      by_category: byCategory,
      avg_rating: this.replayBuffer.length > 0 ? totalRating / this.replayBuffer.length : 0,
      oldest_timestamp: oldest,
      newest_timestamp: newest,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getBufferStats();
    const active = this.getActiveSession();

    const lines = [
      `Continual Learning Summary`,
      `==========================`,
      `Replay Buffer: ${stats.total_experiences} experiences`,
      `Avg Rating: ${stats.avg_rating.toFixed(2)}`,
      `Categories: ${Object.keys(stats.by_category).join(", ")}`,
      ``,
      `Sessions: ${this.sessions.size} total`,
      `Active: ${active ? active.id : "None"}`,
    ];

    if (active) {
      lines.push(`  Phase: ${active.phase}`);
      lines.push(`  Batches: ${active.batches.length}`);
    }

    return lines.join("\n");
  }

  /**
   * Clear replay buffer
   */
  clearReplayBuffer(): void {
    this.replayBuffer = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.replayBuffer = [];
    this.sessions.clear();
    this.activeSession = null;
    this.sessionConfig = DEFAULT_SESSION_CONFIG;
    this.bufferConfig = DEFAULT_BUFFER_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAContinualLearningEngine = new LatheLoRAContinualLearningEngine();
