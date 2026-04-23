/**
 * LatheLoRANeuralBridgeEngine — LATHE-LORA-MS0 U-LLR33
 * =====================================================
 *
 * Bridges LatheLoRA model with PRISM's physics engines.
 * Enables tight coupling between LLM outputs and physics validation.
 *
 * Features:
 *   - Bidirectional data flow between LLM and physics
 *   - Neural hook registration
 *   - Confidence-weighted fusion
 *   - Fallback routing
 *
 * @module engines/LatheLoRANeuralBridgeEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Bridge direction */
export type BridgeDirection = "llm_to_physics" | "physics_to_llm" | "bidirectional";

/** Hook type */
export type NeuralHookType =
  | "pre_inference"
  | "post_inference"
  | "pre_physics"
  | "post_physics"
  | "fusion"
  | "fallback";

/** Neural hook */
export interface NeuralHook {
  id: string;
  type: NeuralHookType;
  name: string;
  priority: number;
  handler_id: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/** Bridge request */
export interface BridgeRequest {
  id: string;
  direction: BridgeDirection;
  llm_output?: Record<string, unknown>;
  physics_data?: Record<string, unknown>;
  context: {
    material?: string;
    tool?: string;
    operation?: string;
    machine?: string;
  };
}

/** Fusion result */
export interface FusionResult {
  combined_value: number;
  llm_value?: number;
  physics_value?: number;
  llm_confidence: number;
  physics_confidence: number;
  fusion_weight_llm: number;
  fusion_weight_physics: number;
  divergence: number;
  method: "weighted_avg" | "physics_priority" | "llm_priority" | "consensus";
}

/** Engine configuration */
export interface BridgeConfig {
  default_fusion_method: FusionResult["method"];
  divergence_threshold: number;
  prefer_physics_when_uncertain: boolean;
  enable_fallback: boolean;
  max_hooks_per_type: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: BridgeConfig = {
  default_fusion_method: "weighted_avg",
  divergence_threshold: 0.3, // 30% relative divergence
  prefer_physics_when_uncertain: true,
  enable_fallback: true,
  max_hooks_per_type: 10,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRANeuralBridgeEngine {
  private config: BridgeConfig = DEFAULT_CONFIG;
  private hooks: Map<string, NeuralHook> = new Map();
  private requests: Map<string, BridgeRequest> = new Map();
  private fusionHistory: FusionResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<BridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  /**
   * Register a neural hook
   */
  registerHook(hook: Omit<NeuralHook, "id">): NeuralHook {
    // Check limit
    const existingOfType = Array.from(this.hooks.values()).filter(h => h.type === hook.type);
    if (existingOfType.length >= this.config.max_hooks_per_type) {
      throw new Error(`Max hooks for type ${hook.type} exceeded: ${this.config.max_hooks_per_type}`);
    }

    const newHook: NeuralHook = {
      id: `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...hook,
    };

    this.hooks.set(newHook.id, newHook);
    log.info(`Registered neural hook: ${newHook.name} (${newHook.type})`);

    return newHook;
  }

  /**
   * Unregister a hook
   */
  unregisterHook(hookId: string): boolean {
    return this.hooks.delete(hookId);
  }

  /**
   * Get hooks by type (sorted by priority)
   */
  getHooksByType(type: NeuralHookType): NeuralHook[] {
    return Array.from(this.hooks.values())
      .filter(h => h.type === type && h.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable/disable hook
   */
  setHookEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;
    hook.enabled = enabled;
    return true;
  }

  /**
   * Create bridge request
   */
  createRequest(request: Omit<BridgeRequest, "id">): BridgeRequest {
    const newRequest: BridgeRequest = {
      id: `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...request,
    };

    this.requests.set(newRequest.id, newRequest);
    return newRequest;
  }

  /**
   * Fuse LLM and physics values
   */
  fuseValues(
    llmValue: number,
    physicsValue: number,
    llmConfidence: number,
    physicsConfidence: number,
    method?: FusionResult["method"]
  ): FusionResult {
    const fusionMethod = method || this.config.default_fusion_method;

    // Calculate divergence (relative)
    const divergence =
      Math.abs(physicsValue) > 1e-6
        ? Math.abs(llmValue - physicsValue) / Math.abs(physicsValue)
        : 0;

    let combined: number;
    let weightLlm = 0.5;
    let weightPhysics = 0.5;

    switch (fusionMethod) {
      case "weighted_avg":
        // Weight by confidence
        const totalConf = llmConfidence + physicsConfidence;
        if (totalConf > 0) {
          weightLlm = llmConfidence / totalConf;
          weightPhysics = physicsConfidence / totalConf;
        }
        combined = llmValue * weightLlm + physicsValue * weightPhysics;
        break;

      case "physics_priority":
        weightLlm = 0.1;
        weightPhysics = 0.9;
        combined = llmValue * weightLlm + physicsValue * weightPhysics;
        break;

      case "llm_priority":
        weightLlm = 0.9;
        weightPhysics = 0.1;
        combined = llmValue * weightLlm + physicsValue * weightPhysics;
        break;

      case "consensus":
        // Only use if divergence is low
        if (divergence < this.config.divergence_threshold) {
          weightLlm = 0.5;
          weightPhysics = 0.5;
          combined = (llmValue + physicsValue) / 2;
        } else {
          // Fall back to physics
          weightLlm = 0;
          weightPhysics = 1.0;
          combined = physicsValue;
        }
        break;

      default:
        combined = physicsValue;
    }

    const result: FusionResult = {
      combined_value: combined,
      llm_value: llmValue,
      physics_value: physicsValue,
      llm_confidence: llmConfidence,
      physics_confidence: physicsConfidence,
      fusion_weight_llm: weightLlm,
      fusion_weight_physics: weightPhysics,
      divergence,
      method: fusionMethod,
    };

    this.fusionHistory.push(result);

    // Trim history
    if (this.fusionHistory.length > 1000) {
      this.fusionHistory = this.fusionHistory.slice(-500);
    }

    return result;
  }

  /**
   * Detect high divergence
   */
  isHighDivergence(result: FusionResult): boolean {
    return result.divergence > this.config.divergence_threshold;
  }

  /**
   * Get fusion history
   */
  getFusionHistory(limit?: number): FusionResult[] {
    return limit ? this.fusionHistory.slice(-limit) : [...this.fusionHistory];
  }

  /**
   * Get divergence statistics
   */
  getDivergenceStats(): {
    total: number;
    high_divergence_count: number;
    high_divergence_rate: number;
    avg_divergence: number;
    max_divergence: number;
  } {
    const total = this.fusionHistory.length;
    if (total === 0) {
      return {
        total: 0,
        high_divergence_count: 0,
        high_divergence_rate: 0,
        avg_divergence: 0,
        max_divergence: 0,
      };
    }

    const high = this.fusionHistory.filter(r => this.isHighDivergence(r)).length;
    const sum = this.fusionHistory.reduce((s, r) => s + r.divergence, 0);
    const max = Math.max(...this.fusionHistory.map(r => r.divergence));

    return {
      total,
      high_divergence_count: high,
      high_divergence_rate: high / total,
      avg_divergence: sum / total,
      max_divergence: max,
    };
  }

  /**
   * Recommend fusion method based on context
   */
  recommendFusion(context: BridgeRequest["context"]): FusionResult["method"] {
    // Safety-critical operations prefer physics
    if (context.operation === "roughing" || context.operation === "heavy_cut") {
      return "physics_priority";
    }

    // Material properties well-known - use consensus
    if (context.material === "steel" || context.material === "aluminum") {
      return "consensus";
    }

    // Exotic materials - LLM may have better data
    if (context.material === "inconel" || context.material === "titanium") {
      return "weighted_avg";
    }

    return this.config.default_fusion_method;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getDivergenceStats();
    const hookCounts: Record<string, number> = {};
    for (const hook of this.hooks.values()) {
      hookCounts[hook.type] = (hookCounts[hook.type] || 0) + 1;
    }

    const lines = [
      "Neural Bridge Summary",
      "=====================",
      `Hooks: ${this.hooks.size}`,
    ];

    for (const [type, count] of Object.entries(hookCounts)) {
      lines.push(`  ${type}: ${count}`);
    }

    lines.push(
      "",
      "Fusion Stats:",
      `  Total: ${stats.total}`,
      `  High Divergence: ${stats.high_divergence_count} (${(stats.high_divergence_rate * 100).toFixed(1)}%)`,
      `  Avg Divergence: ${(stats.avg_divergence * 100).toFixed(2)}%`,
      `  Max Divergence: ${(stats.max_divergence * 100).toFixed(2)}%`
    );

    return lines.join("\n");
  }

  /**
   * Clear fusion history
   */
  clearHistory(): void {
    this.fusionHistory = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.hooks.clear();
    this.requests.clear();
    this.fusionHistory = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRANeuralBridgeEngine = new LatheLoRANeuralBridgeEngine();
