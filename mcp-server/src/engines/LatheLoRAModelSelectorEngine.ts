/**
 * LatheLoRAModelSelectorEngine — LATHE-LORA-MS0 U-LLR43
 * ======================================================
 *
 * Selects the best LoRA adapter(s) for a given input context.
 * Uses specialization metadata, historical performance, and load.
 *
 * Features:
 *   - Context-based routing
 *   - Performance-weighted selection
 *   - Load balancing
 *   - Fallback chains
 *
 * @module engines/LatheLoRAModelSelectorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Model specialization tags */
export type SpecializationTag =
  | "threading"
  | "turning"
  | "facing"
  | "drilling"
  | "grooving"
  | "boring"
  | "okuma"
  | "fanuc"
  | "steel"
  | "titanium"
  | "inconel"
  | "aluminum"
  | "general";

/** Model descriptor */
export interface ModelDescriptor {
  id: string;
  name: string;
  specializations: SpecializationTag[];
  avg_accuracy: number;
  avg_latency_ms: number;
  current_load: number;
  max_concurrent: number;
  enabled: boolean;
  registered_at: number;
  success_count: number;
  failure_count: number;
}

/** Selection context */
export interface SelectionContext {
  operation?: string;
  material?: string;
  dialect?: string;
  priority?: "speed" | "accuracy" | "balanced";
  required_tags?: SpecializationTag[];
}

/** Selection result */
export interface SelectionResult {
  id: string;
  selected_model: ModelDescriptor;
  backup_models: ModelDescriptor[];
  selection_score: number;
  rationale: string;
  context: SelectionContext;
  selected_at: number;
}

/** Engine configuration */
export interface SelectorConfig {
  prefer_least_loaded: boolean;
  accuracy_weight: number;
  latency_weight: number;
  load_weight: number;
  min_accuracy: number;
  max_backups: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: SelectorConfig = {
  prefer_least_loaded: true,
  accuracy_weight: 0.5,
  latency_weight: 0.2,
  load_weight: 0.3,
  min_accuracy: 0.6,
  max_backups: 2,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAModelSelectorEngine {
  private config: SelectorConfig = DEFAULT_CONFIG;
  private models: Map<string, ModelDescriptor> = new Map();
  private selectionHistory: SelectionResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<SelectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): SelectorConfig {
    return { ...this.config };
  }

  /**
   * Register a model
   */
  registerModel(model: Omit<ModelDescriptor, "registered_at" | "success_count" | "failure_count" | "current_load">): ModelDescriptor {
    const descriptor: ModelDescriptor = {
      ...model,
      current_load: 0,
      success_count: 0,
      failure_count: 0,
      registered_at: Date.now(),
    };
    this.models.set(descriptor.id, descriptor);
    return descriptor;
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): boolean {
    return this.models.delete(modelId);
  }

  /**
   * Update model stats after inference
   */
  recordOutcome(modelId: string, success: boolean, latencyMs?: number): boolean {
    const m = this.models.get(modelId);
    if (!m) return false;
    if (success) m.success_count++;
    else m.failure_count++;

    // Update accuracy (exponential moving average)
    const total = m.success_count + m.failure_count;
    if (total > 0) {
      m.avg_accuracy = m.success_count / total;
    }

    if (latencyMs !== undefined) {
      m.avg_latency_ms = m.avg_latency_ms * 0.9 + latencyMs * 0.1;
    }

    return true;
  }

  /**
   * Score a model for a given context
   */
  scoreModel(model: ModelDescriptor, context: SelectionContext): number {
    if (!model.enabled) return 0;
    if (model.avg_accuracy < this.config.min_accuracy) return 0;
    if (model.current_load >= model.max_concurrent) return 0;

    // Specialization match
    let specializationScore = 0;
    if (context.operation && model.specializations.includes(context.operation as SpecializationTag)) {
      specializationScore += 0.3;
    }
    if (context.material && model.specializations.includes(context.material as SpecializationTag)) {
      specializationScore += 0.3;
    }
    if (context.dialect && model.specializations.includes(context.dialect as SpecializationTag)) {
      specializationScore += 0.2;
    }
    if (context.required_tags) {
      for (const tag of context.required_tags) {
        if (!model.specializations.includes(tag)) return 0; // hard requirement
      }
    }

    // Performance scores
    const accuracyScore = model.avg_accuracy * this.config.accuracy_weight;
    const loadRatio = model.current_load / model.max_concurrent;
    const loadScore = (1 - loadRatio) * this.config.load_weight;

    // Latency score (inverted, normalized to 1000ms baseline)
    const latencyScore = Math.max(0, 1 - model.avg_latency_ms / 1000) * this.config.latency_weight;

    // Priority adjustment
    let priorityMultiplier = 1.0;
    if (context.priority === "speed" && model.avg_latency_ms < 500) priorityMultiplier = 1.2;
    if (context.priority === "accuracy" && model.avg_accuracy > 0.8) priorityMultiplier = 1.2;

    return (specializationScore + accuracyScore + loadScore + latencyScore) * priorityMultiplier;
  }

  /**
   * Select best model for context
   */
  select(context: SelectionContext): SelectionResult | null {
    if (this.models.size === 0) return null;

    const scored = Array.from(this.models.values())
      .map(m => ({ model: m, score: this.scoreModel(m, context) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const selected = scored[0].model;
    const backups = scored.slice(1, 1 + this.config.max_backups).map(s => s.model);

    const rationale = this.generateRationale(selected, context, scored[0].score);

    const result: SelectionResult = {
      id: `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      selected_model: selected,
      backup_models: backups,
      selection_score: scored[0].score,
      rationale,
      context,
      selected_at: Date.now(),
    };

    this.selectionHistory.push(result);
    if (this.selectionHistory.length > 1000) {
      this.selectionHistory = this.selectionHistory.slice(-500);
    }

    // Increment load
    selected.current_load++;

    return result;
  }

  /**
   * Release a model (decrement load)
   */
  release(modelId: string): boolean {
    const m = this.models.get(modelId);
    if (!m) return false;
    if (m.current_load > 0) m.current_load--;
    return true;
  }

  /**
   * Generate rationale text
   */
  private generateRationale(model: ModelDescriptor, context: SelectionContext, score: number): string {
    const parts: string[] = [];
    parts.push(`Selected ${model.name} (score: ${score.toFixed(3)})`);

    if (context.operation && model.specializations.includes(context.operation as SpecializationTag)) {
      parts.push(`specialized for ${context.operation}`);
    }
    if (context.material && model.specializations.includes(context.material as SpecializationTag)) {
      parts.push(`knows ${context.material}`);
    }
    parts.push(`accuracy ${(model.avg_accuracy * 100).toFixed(1)}%`);
    parts.push(`latency ${model.avg_latency_ms.toFixed(0)}ms`);
    parts.push(`load ${model.current_load}/${model.max_concurrent}`);

    return parts.join(", ");
  }

  /**
   * Get registered models
   */
  getModels(): ModelDescriptor[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelDescriptor | undefined {
    return this.models.get(modelId);
  }

  /**
   * Find models by specialization
   */
  findBySpecialization(tag: SpecializationTag): ModelDescriptor[] {
    return Array.from(this.models.values()).filter(m => m.specializations.includes(tag));
  }

  /**
   * Get stats
   */
  getStats(): {
    total_models: number;
    enabled_models: number;
    avg_accuracy: number;
    avg_latency_ms: number;
    total_load: number;
    total_capacity: number;
    total_selections: number;
  } {
    const all = Array.from(this.models.values());
    const enabled = all.filter(m => m.enabled);
    const total = all.length;

    return {
      total_models: total,
      enabled_models: enabled.length,
      avg_accuracy: enabled.length > 0 ? enabled.reduce((s, m) => s + m.avg_accuracy, 0) / enabled.length : 0,
      avg_latency_ms: enabled.length > 0 ? enabled.reduce((s, m) => s + m.avg_latency_ms, 0) / enabled.length : 0,
      total_load: all.reduce((s, m) => s + m.current_load, 0),
      total_capacity: all.reduce((s, m) => s + m.max_concurrent, 0),
      total_selections: this.selectionHistory.length,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Model Selector Summary",
      "======================",
      `Models: ${stats.total_models} (${stats.enabled_models} enabled)`,
      `Avg Accuracy: ${(stats.avg_accuracy * 100).toFixed(1)}%`,
      `Avg Latency: ${stats.avg_latency_ms.toFixed(0)}ms`,
      `Load: ${stats.total_load}/${stats.total_capacity}`,
      `Total Selections: ${stats.total_selections}`,
    ].join("\n");
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.selectionHistory = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.models.clear();
    this.selectionHistory = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAModelSelectorEngine = new LatheLoRAModelSelectorEngine();
