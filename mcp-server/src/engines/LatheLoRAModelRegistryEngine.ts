/**
 * LatheLoRAModelRegistryEngine — LATHE-LORA-MS0 U-LLR19
 * =====================================================
 *
 * Central registry for LatheLoRA models and adapters.
 * Tracks versions, lineage, metrics, and deployment status.
 *
 * Features:
 *   - Model version tracking
 *   - Adapter lineage (parent-child relationships)
 *   - Benchmark score storage
 *   - Deployment status tracking
 *   - Model comparison utilities
 *
 * @module engines/LatheLoRAModelRegistryEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Model status */
export type ModelStatus = "training" | "evaluating" | "ready" | "deployed" | "deprecated" | "failed";

/** Registered model entry */
export interface RegisteredModel {
  id: string;
  name: string;
  version: string;
  base_model: string;
  created_at: number;
  updated_at: number;
  status: ModelStatus;
  type: "base" | "lora" | "merged" | "quantized";

  // Training info
  training?: {
    dataset_id: string;
    epochs: number;
    final_loss: number;
    training_time_hours: number;
  };

  // LoRA specifics
  lora_config?: {
    rank: number;
    alpha: number;
    target_modules: string[];
    dropout: number;
  };

  // Quantization info
  quantization?: {
    format: string;
    level: string;
    original_size_gb: number;
    quantized_size_gb: number;
  };

  // Benchmark scores
  benchmarks?: {
    physics_score: number;
    safety_score: number;
    reasoning_score: number;
    combined_score: number;
    benchmark_id: string;
    evaluated_at: number;
  };

  // Lineage
  parent_id?: string;
  children_ids: string[];

  // Deployment
  deployment?: {
    deployed_at: number;
    endpoint: string;
    platform: string;
    active: boolean;
  };

  // Metadata
  tags: string[];
  description: string;
  artifacts: {
    model_path?: string;
    adapter_path?: string;
    config_path?: string;
    tokenizer_path?: string;
  };
}

/** Registry query filters */
export interface RegistryQuery {
  status?: ModelStatus[];
  type?: string[];
  base_model?: string;
  min_physics_score?: number;
  min_safety_score?: number;
  tags?: string[];
  sort_by?: "created_at" | "physics_score" | "safety_score" | "combined_score";
  sort_order?: "asc" | "desc";
  limit?: number;
}

/** Comparison result */
export interface ModelComparison {
  models: string[];
  winner: string;
  metrics: Record<string, Record<string, number>>;
  recommendation: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAModelRegistryEngine {
  private models: Map<string, RegisteredModel> = new Map();
  private deployments: Map<string, string> = new Map(); // endpoint -> modelId

  /**
   * Register a new model
   */
  register(model: Omit<RegisteredModel, "created_at" | "updated_at" | "children_ids">): RegisteredModel {
    const now = Date.now();
    const fullModel: RegisteredModel = {
      ...model,
      created_at: now,
      updated_at: now,
      children_ids: [],
    };

    // Update parent's children list
    if (model.parent_id) {
      const parent = this.models.get(model.parent_id);
      if (parent) {
        parent.children_ids.push(model.id);
        parent.updated_at = now;
      }
    }

    this.models.set(model.id, fullModel);
    log.info(`Registered model: ${model.id} (${model.type}, ${model.status})`);

    return fullModel;
  }

  /**
   * Get model by ID
   */
  get(id: string): RegisteredModel | undefined {
    return this.models.get(id);
  }

  /**
   * Update model
   */
  update(id: string, updates: Partial<RegisteredModel>): RegisteredModel | undefined {
    const model = this.models.get(id);
    if (!model) return undefined;

    const updated = {
      ...model,
      ...updates,
      id: model.id, // Prevent ID change
      created_at: model.created_at, // Prevent creation date change
      updated_at: Date.now(),
    };

    this.models.set(id, updated);
    return updated;
  }

  /**
   * Update model status
   */
  updateStatus(id: string, status: ModelStatus): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    model.status = status;
    model.updated_at = Date.now();
    return true;
  }

  /**
   * Add benchmark scores
   */
  addBenchmarks(
    id: string,
    scores: {
      physics_score: number;
      safety_score: number;
      reasoning_score: number;
      benchmark_id: string;
    }
  ): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    model.benchmarks = {
      ...scores,
      combined_score: (scores.physics_score + scores.safety_score + scores.reasoning_score) / 3,
      evaluated_at: Date.now(),
    };
    model.updated_at = Date.now();

    return true;
  }

  /**
   * Mark model as deployed
   */
  markDeployed(id: string, endpoint: string, platform: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    model.deployment = {
      deployed_at: Date.now(),
      endpoint,
      platform,
      active: true,
    };
    model.status = "deployed";
    model.updated_at = Date.now();

    this.deployments.set(endpoint, id);
    return true;
  }

  /**
   * Deactivate deployment
   */
  deactivateDeployment(id: string): boolean {
    const model = this.models.get(id);
    if (!model || !model.deployment) return false;

    model.deployment.active = false;
    model.status = "ready";
    model.updated_at = Date.now();

    if (model.deployment.endpoint) {
      this.deployments.delete(model.deployment.endpoint);
    }

    return true;
  }

  /**
   * Query models
   */
  query(filters: RegistryQuery = {}): RegisteredModel[] {
    let results = Array.from(this.models.values());

    // Apply filters
    if (filters.status?.length) {
      results = results.filter(m => filters.status!.includes(m.status));
    }
    if (filters.type?.length) {
      results = results.filter(m => filters.type!.includes(m.type));
    }
    if (filters.base_model) {
      results = results.filter(m => m.base_model === filters.base_model);
    }
    if (filters.min_physics_score !== undefined) {
      results = results.filter(m => (m.benchmarks?.physics_score || 0) >= filters.min_physics_score!);
    }
    if (filters.min_safety_score !== undefined) {
      results = results.filter(m => (m.benchmarks?.safety_score || 0) >= filters.min_safety_score!);
    }
    if (filters.tags?.length) {
      results = results.filter(m => filters.tags!.some(t => m.tags.includes(t)));
    }

    // Sort
    if (filters.sort_by) {
      results.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (filters.sort_by) {
          case "created_at":
            aVal = a.created_at;
            bVal = b.created_at;
            break;
          case "physics_score":
            aVal = a.benchmarks?.physics_score || 0;
            bVal = b.benchmarks?.physics_score || 0;
            break;
          case "safety_score":
            aVal = a.benchmarks?.safety_score || 0;
            bVal = b.benchmarks?.safety_score || 0;
            break;
          case "combined_score":
            aVal = a.benchmarks?.combined_score || 0;
            bVal = b.benchmarks?.combined_score || 0;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        return filters.sort_order === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    // Limit
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get all models
   */
  listAll(): RegisteredModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model lineage (ancestors and descendants)
   */
  getLineage(id: string): {
    model: RegisteredModel;
    ancestors: RegisteredModel[];
    descendants: RegisteredModel[];
  } | undefined {
    const model = this.models.get(id);
    if (!model) return undefined;

    const ancestors: RegisteredModel[] = [];
    let currentId = model.parent_id;
    while (currentId) {
      const parent = this.models.get(currentId);
      if (parent) {
        ancestors.push(parent);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }

    const descendants: RegisteredModel[] = [];
    const collectDescendants = (parentId: string) => {
      const parent = this.models.get(parentId);
      if (parent) {
        for (const childId of parent.children_ids) {
          const child = this.models.get(childId);
          if (child) {
            descendants.push(child);
            collectDescendants(childId);
          }
        }
      }
    };
    collectDescendants(id);

    return { model, ancestors, descendants };
  }

  /**
   * Compare models
   */
  compareModels(modelIds: string[]): ModelComparison {
    const models = modelIds.map(id => this.models.get(id)).filter(Boolean) as RegisteredModel[];

    const metrics: Record<string, Record<string, number>> = {};
    for (const model of models) {
      metrics[model.id] = {
        physics: model.benchmarks?.physics_score || 0,
        safety: model.benchmarks?.safety_score || 0,
        reasoning: model.benchmarks?.reasoning_score || 0,
        combined: model.benchmarks?.combined_score || 0,
      };
    }

    // Find winner by combined score
    let winner = models[0]?.id || "";
    let maxScore = 0;
    for (const model of models) {
      const score = model.benchmarks?.combined_score || 0;
      if (score > maxScore) {
        maxScore = score;
        winner = model.id;
      }
    }

    // Generate recommendation
    let recommendation: string;
    if (models.length === 0) {
      recommendation = "No models to compare";
    } else if (models.length === 1) {
      recommendation = `Only one model provided: ${models[0].id}`;
    } else {
      const winnerModel = this.models.get(winner);
      recommendation = `${winner} is recommended with combined score ${maxScore.toFixed(1)}`;
      if (winnerModel?.status === "deployed") {
        recommendation += " (currently deployed)";
      }
    }

    return {
      models: modelIds,
      winner,
      metrics,
      recommendation,
    };
  }

  /**
   * Get best model for deployment
   */
  getBestForDeployment(
    constraints: {
      min_physics_score?: number;
      min_safety_score?: number;
      quantized_only?: boolean;
    } = {}
  ): RegisteredModel | undefined {
    let candidates = this.query({
      status: ["ready"],
      min_physics_score: constraints.min_physics_score,
      min_safety_score: constraints.min_safety_score,
      sort_by: "combined_score",
      sort_order: "desc",
    });

    if (constraints.quantized_only) {
      candidates = candidates.filter(m => m.type === "quantized" || m.quantization);
    }

    return candidates[0];
  }

  /**
   * Get active deployments
   */
  getActiveDeployments(): Array<{ endpoint: string; model: RegisteredModel }> {
    const result: Array<{ endpoint: string; model: RegisteredModel }> = [];

    for (const [endpoint, modelId] of this.deployments) {
      const model = this.models.get(modelId);
      if (model && model.deployment?.active) {
        result.push({ endpoint, model });
      }
    }

    return result;
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    total_models: number;
    by_status: Record<ModelStatus, number>;
    by_type: Record<string, number>;
    active_deployments: number;
    avg_physics_score: number;
    avg_safety_score: number;
  } {
    const models = this.listAll();

    const by_status: Record<string, number> = {};
    const by_type: Record<string, number> = {};
    let totalPhysics = 0;
    let totalSafety = 0;
    let benchmarked = 0;

    for (const model of models) {
      by_status[model.status] = (by_status[model.status] || 0) + 1;
      by_type[model.type] = (by_type[model.type] || 0) + 1;

      if (model.benchmarks) {
        totalPhysics += model.benchmarks.physics_score;
        totalSafety += model.benchmarks.safety_score;
        benchmarked++;
      }
    }

    return {
      total_models: models.length,
      by_status: by_status as Record<ModelStatus, number>,
      by_type,
      active_deployments: this.getActiveDeployments().length,
      avg_physics_score: benchmarked > 0 ? totalPhysics / benchmarked : 0,
      avg_safety_score: benchmarked > 0 ? totalSafety / benchmarked : 0,
    };
  }

  /**
   * Generate model card
   */
  generateModelCard(id: string): string {
    const model = this.models.get(id);
    if (!model) return `Model not found: ${id}`;

    const lines = [
      `# ${model.name}`,
      ``,
      `**ID:** ${model.id}`,
      `**Version:** ${model.version}`,
      `**Type:** ${model.type}`,
      `**Status:** ${model.status}`,
      `**Base Model:** ${model.base_model}`,
      ``,
    ];

    if (model.description) {
      lines.push(`## Description`, ``, model.description, ``);
    }

    if (model.lora_config) {
      lines.push(
        `## LoRA Configuration`,
        ``,
        `- Rank: ${model.lora_config.rank}`,
        `- Alpha: ${model.lora_config.alpha}`,
        `- Target Modules: ${model.lora_config.target_modules.join(", ")}`,
        `- Dropout: ${model.lora_config.dropout}`,
        ``
      );
    }

    if (model.training) {
      lines.push(
        `## Training`,
        ``,
        `- Dataset: ${model.training.dataset_id}`,
        `- Epochs: ${model.training.epochs}`,
        `- Final Loss: ${model.training.final_loss.toFixed(4)}`,
        `- Training Time: ${model.training.training_time_hours.toFixed(1)} hours`,
        ``
      );
    }

    if (model.benchmarks) {
      lines.push(
        `## Benchmark Scores`,
        ``,
        `| Metric | Score |`,
        `|--------|-------|`,
        `| Physics | ${model.benchmarks.physics_score.toFixed(1)} |`,
        `| Safety | ${model.benchmarks.safety_score.toFixed(1)} |`,
        `| Reasoning | ${model.benchmarks.reasoning_score.toFixed(1)} |`,
        `| **Combined** | **${model.benchmarks.combined_score.toFixed(1)}** |`,
        ``
      );
    }

    if (model.quantization) {
      lines.push(
        `## Quantization`,
        ``,
        `- Format: ${model.quantization.format}`,
        `- Level: ${model.quantization.level}`,
        `- Size: ${model.quantization.original_size_gb.toFixed(1)}GB → ${model.quantization.quantized_size_gb.toFixed(1)}GB`,
        ``
      );
    }

    if (model.deployment?.active) {
      lines.push(
        `## Deployment`,
        ``,
        `- Platform: ${model.deployment.platform}`,
        `- Endpoint: ${model.deployment.endpoint}`,
        ``
      );
    }

    if (model.tags.length > 0) {
      lines.push(`## Tags`, ``, model.tags.map(t => `\`${t}\``).join(" "), ``);
    }

    lines.push(`---`, `Created: ${new Date(model.created_at).toISOString()}`);

    return lines.join("\n");
  }

  /**
   * Delete model
   */
  delete(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    // Remove from parent's children
    if (model.parent_id) {
      const parent = this.models.get(model.parent_id);
      if (parent) {
        parent.children_ids = parent.children_ids.filter(cid => cid !== id);
      }
    }

    // Remove deployment
    if (model.deployment?.endpoint) {
      this.deployments.delete(model.deployment.endpoint);
    }

    this.models.delete(id);
    return true;
  }

  /**
   * Reset registry
   */
  reset(): void {
    this.models.clear();
    this.deployments.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAModelRegistryEngine = new LatheLoRAModelRegistryEngine();
