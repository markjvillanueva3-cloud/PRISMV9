/**
 * MillingAILearningOrchestratorEngine — L2 AI/ML Aggregator
 * ==========================================================
 * Single entry point that routes to ALL milling AI/ML sub-engines.
 * Uses dynamic imports so it stays functional even when a sub-engine
 * has not yet been built — each route returns a status marker.
 *
 * Aggregated engines (38 total target):
 *   - MillingUltimateAIEngine (ultimate AI reasoning)
 *   - MillingStrategyLibraryEngine (strategy catalog)
 *   - MillingReinforcementLearningEngine (RL training)
 *   - MillPatternMinerEngine (pattern mining)
 *   - MillingOnlineLearningTrackerEngine (online learning)
 *   - MillingReasoningTraceLedgerEngine (reasoning ledger)
 *   - MillingMetaLearningEngine (meta-learning)
 *   - MillingAGIMasterEngine (AGI reasoning) [EXISTS]
 *   - MillStrategyNeuralEngine (neural strategy)
 *   - MillDeepLearningEngine (deep learning predictions)
 *   - + 28 more future AI engines
 *
 * Request types (9):
 *   1. ai_reasoning      — AGI-level reasoning
 *   2. strategy_lookup   — Query strategy library
 *   3. rl_train         — Reinforcement learning training
 *   4. pattern_mine     — Pattern discovery
 *   5. online_update    — Online learning model update
 *   6. reasoning_trace  — Query reasoning history
 *   7. meta_learn       — Meta-learning insights
 *   8. neural_predict   — Neural network prediction
 *   9. deep_predict     — Deep learning prediction
 *
 * @module engines/MillingAILearningOrchestratorEngine
 * @milestone MILL-MASTER/P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type MillingAIRequestType =
  | "ai_reasoning"
  | "strategy_lookup"
  | "rl_train"
  | "pattern_mine"
  | "online_update"
  | "reasoning_trace"
  | "meta_learn"
  | "neural_predict"
  | "deep_predict";

export interface MillingAIRequest {
  request_type: MillingAIRequestType;
  intent?: string;
  context?: Record<string, unknown>;
  dataset_id?: string;
  episode_count?: number;
  reward?: number;
  query?: string;
  features?: Record<string, unknown>;
  model_id?: string;
}

export interface MillingAIResponse {
  success: boolean;
  request_type: MillingAIRequestType;
  engine: string;
  result: unknown;
  provenance: {
    engines_invoked: string[];
    processing_time_ms: number;
    engine_available: boolean;
    ts: string;
  };
  warnings: string[];
}

interface RouteEntry {
  engine_name: string;
  module_path: string;
  export_name: string;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class MillingAILearningOrchestratorEngine {
  private readonly routes: Map<MillingAIRequestType, RouteEntry> = new Map([
    ["ai_reasoning", {
      engine_name: "MillingAGIMasterEngine",
      module_path: "./MillingAGIMasterEngine.js",
      export_name: "millingAGIMasterEngine",
      method: "reason",
    }],
    ["strategy_lookup", {
      engine_name: "MillingStrategyLibraryEngine",
      module_path: "./MillingStrategyLibraryEngine.js",
      export_name: "millingStrategyLibraryEngine",
      method: "lookup",
    }],
    ["rl_train", {
      engine_name: "MillingReinforcementLearningEngine",
      module_path: "./MillingReinforcementLearningEngine.js",
      export_name: "millingReinforcementLearningEngine",
      method: "train",
    }],
    ["pattern_mine", {
      engine_name: "MillPatternMinerEngine",
      module_path: "./MillPatternMinerEngine.js",
      export_name: "millPatternMinerEngine",
      method: "mine",
    }],
    ["online_update", {
      engine_name: "MillingOnlineLearningTrackerEngine",
      module_path: "./MillingOnlineLearningTrackerEngine.js",
      export_name: "millingOnlineLearningTrackerEngine",
      method: "update",
    }],
    ["reasoning_trace", {
      engine_name: "MillingReasoningTraceLedgerEngine",
      module_path: "./MillingReasoningTraceLedgerEngine.js",
      export_name: "millingReasoningTraceLedgerEngine",
      method: "query",
    }],
    ["meta_learn", {
      engine_name: "MillingMetaLearningEngine",
      module_path: "./MillingMetaLearningEngine.js",
      export_name: "millingMetaLearningEngine",
      method: "learn",
    }],
    ["neural_predict", {
      engine_name: "MillStrategyNeuralEngine",
      module_path: "./MillStrategyNeuralEngine.js",
      export_name: "millStrategyNeuralEngine",
      method: "predict",
    }],
    ["deep_predict", {
      engine_name: "MillDeepLearningEngine",
      module_path: "./MillDeepLearningEngine.js",
      export_name: "millDeepLearningEngine",
      method: "predict",
    }],
  ]);

  private invocationCount = 0;
  private readonly registry: Set<string> = new Set();

  constructor() {
    // Pre-register all known routes into the engine registry
    for (const route of this.routes.values()) {
      this.registry.add(route.engine_name);
    }
  }

  /**
   * Main entry — routes AI/ML request to appropriate sub-engine
   */
  async orchestrate(request: MillingAIRequest): Promise<MillingAIResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];

    log.info(`[MillingAILearning] Routing ${request.request_type}`);
    this.invocationCount++;

    const route = this.routes.get(request.request_type);
    if (!route) {
      return {
        success: false,
        request_type: request.request_type,
        engine: "unknown",
        result: null,
        provenance: {
          engines_invoked: [],
          processing_time_ms: Date.now() - startTime,
          engine_available: false,
          ts: new Date().toISOString(),
        },
        warnings: [`Unknown request_type: ${request.request_type}`],
      };
    }

    try {
      const mod = await import(route.module_path);
      const engine = mod[route.export_name];

      if (!engine) {
        warnings.push(`Engine ${route.engine_name} exported but not instantiated`);
        return this.buildUnavailableResponse(request.request_type, route, startTime, warnings);
      }

      if (typeof engine[route.method] !== "function") {
        warnings.push(`${route.engine_name}.${route.method} is not a function`);
        return this.buildUnavailableResponse(request.request_type, route, startTime, warnings);
      }

      const result = await engine[route.method](request);

      return {
        success: true,
        request_type: request.request_type,
        engine: route.engine_name,
        result,
        provenance: {
          engines_invoked: [route.engine_name],
          processing_time_ms: Date.now() - startTime,
          engine_available: true,
          ts: new Date().toISOString(),
        },
        warnings,
      };
    } catch (err: any) {
      // Engine module doesn't exist yet — graceful fallback
      warnings.push(`Module ${route.module_path} unavailable: ${err.message}`);
      return this.buildUnavailableResponse(request.request_type, route, startTime, warnings);
    }
  }

  /**
   * List all AI/ML engines this aggregator routes to
   */
  getRegisteredEngines(): string[] {
    return Array.from(this.registry).sort();
  }

  /**
   * Get supported request types
   */
  getSupportedTypes(): MillingAIRequestType[] {
    return Array.from(this.routes.keys());
  }

  /**
   * Get aggregator statistics
   */
  getStats(): { engines: number; request_types: number; invocations: number } {
    return {
      engines: this.registry.size,
      request_types: this.routes.size,
      invocations: this.invocationCount,
    };
  }

  /**
   * Reset invocation counter (testing)
   */
  resetStats(): void {
    this.invocationCount = 0;
  }

  /**
   * Check whether a specific sub-engine is available at runtime
   */
  async checkEngineAvailability(type: MillingAIRequestType): Promise<boolean> {
    const route = this.routes.get(type);
    if (!route) return false;
    try {
      const mod = await import(route.module_path);
      const engine = mod[route.export_name];
      return !!engine && typeof engine[route.method] === "function";
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  private buildUnavailableResponse(
    type: MillingAIRequestType,
    route: RouteEntry,
    startTime: number,
    warnings: string[]
  ): MillingAIResponse {
    return {
      success: false,
      request_type: type,
      engine: route.engine_name,
      result: { status: "engine_not_built", routed_to: route.engine_name },
      provenance: {
        engines_invoked: [route.engine_name],
        processing_time_ms: Date.now() - startTime,
        engine_available: false,
        ts: new Date().toISOString(),
      },
      warnings,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
export const millingAILearningOrchestratorEngine = new MillingAILearningOrchestratorEngine();
