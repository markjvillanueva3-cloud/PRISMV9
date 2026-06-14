/**
 * prism_local — Local LLM Dispatcher — LOCAL-LLM-MS0
 * ===================================================
 *
 * Dispatch actions to local Ollama/Qwen for token savings:
 * - validate_code: Validate code against CLAUDE.md rules (FREE via Ollama)
 * - local_health: Check Ollama/Docker stack health
 * - offload_classify: Classify if task can be offloaded to local LLM
 *
 * Token savings: 40-60% for typical development sessions by:
 * - Running code validation locally instead of via Claude hooks
 * - Offloading explanations/summaries to local models
 * - Using local embeddings for pattern matching
 *
 * @module tools/dispatchers/localDispatcher
 * @milestone LOCAL-LLM-MS0 Session 2
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import {
  LOCAL_ACTIONS,
  LocalActionEnum,
  ValidateCodeInputSchema,
  LocalHealthInputSchema,
  OffloadClassifyInputSchema,
  LearnPatternInputSchema,
  SearchPatternsInputSchema,
  TrajectoryStartInputSchema,
  TrajectoryStepInputSchema,
  TrajectoryEndInputSchema,
  LearningStatsInputSchema,
  EnforceRulesInputSchema,
  AggregateHooksInputSchema,
  AwarenessInputSchema,
  CommitInputSchema,
  LocalGenerateInputSchema,
  // DeepSeek V4 hybrid backend schemas
  ExecuteDeepseekInputSchema,
  DeepseekHealthInputSchema,
  BackendRouteInputSchema,
  BackendConfigInputSchema,
  RoutingStatsInputSchema,
} from "../../schemas/localActionSchemas.js";

// Build input schema map for validateActionParams
const INPUT_SCHEMAS: Record<string, import("zod").ZodTypeAny> = {
  validate_code: ValidateCodeInputSchema,
  local_health: LocalHealthInputSchema,
  offload_classify: OffloadClassifyInputSchema,
  learn_pattern: LearnPatternInputSchema,
  search_patterns: SearchPatternsInputSchema,
  trajectory_start: TrajectoryStartInputSchema,
  trajectory_step: TrajectoryStepInputSchema,
  trajectory_end: TrajectoryEndInputSchema,
  learning_stats: LearningStatsInputSchema,
  enforce_rules: EnforceRulesInputSchema,
  aggregate_hooks: AggregateHooksInputSchema,
  awareness_route: AwarenessInputSchema,
  suggest_commit: CommitInputSchema,
  local_generate: LocalGenerateInputSchema,
};

// Lazy-loaded engine references
let _localValidation: typeof import("../../engines/LocalValidationEngine.js").localValidationEngine | null = null;
let _offloader: typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine | null = null;
let _localLearning: typeof import("../../engines/LocalLearningEngine.js").localLearningEngine | null = null;
let _hookAggregator: typeof import("../../engines/LocalHookAggregatorEngine.js").localHookAggregatorEngine | null = null;
let _awarenessRouter: typeof import("../../engines/LocalAwarenessRouterEngine.js").localAwarenessRouterEngine | null = null;
let _commitMessage: typeof import("../../engines/LocalCommitMessageEngine.js").localCommitMessageEngine | null = null;
let _deepSeek: typeof import("../../engines/DeepSeekInferenceEngine.js").deepSeekInferenceEngine | null = null;
let _backendRouter: typeof import("../../engines/BackendRouterEngine.js").backendRouterEngine | null = null;

async function getEngine(name: string): Promise<unknown> {
  switch (name) {
    case "localValidation":
      return _localValidation ??= (await import("../../engines/LocalValidationEngine.js")).localValidationEngine;
    case "offloader":
      return _offloader ??= (await import("../../engines/OllamaTaskOffloaderEngine.js")).ollamaTaskOffloaderEngine;
    case "localLearning":
      return _localLearning ??= (await import("../../engines/LocalLearningEngine.js")).localLearningEngine;
    case "hookAggregator":
      return _hookAggregator ??= (await import("../../engines/LocalHookAggregatorEngine.js")).localHookAggregatorEngine;
    case "awarenessRouter":
      return _awarenessRouter ??= (await import("../../engines/LocalAwarenessRouterEngine.js")).localAwarenessRouterEngine;
    case "commitMessage":
      return _commitMessage ??= (await import("../../engines/LocalCommitMessageEngine.js")).localCommitMessageEngine;
    case "deepSeek":
      return _deepSeek ??= (await import("../../engines/DeepSeekInferenceEngine.js")).deepSeekInferenceEngine;
    case "backendRouter":
      return _backendRouter ??= (await import("../../engines/BackendRouterEngine.js")).backendRouterEngine;
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

export interface LocalDispatcherResult {
  success: boolean;
  action: string;
  data?: unknown;
  error?: string;
  metadata?: {
    latencyMs?: number;
    tokensSaved?: number;
    ollamaUsed?: boolean;
  };
}

/**
 * Dispatch local LLM actions
 *
 * @param action - Action name from LOCAL_ACTIONS
 * @param params - Action-specific parameters
 * @returns Dispatch result with data or error
 */
export async function localDispatcher(
  action: string,
  params: unknown
): Promise<LocalDispatcherResult> {
  const startTime = Date.now();

  // Validate action
  const parseResult = LocalActionEnum.safeParse(action);
  if (!parseResult.success) {
    return dispatcherError(
      `Invalid action. Valid actions: ${LOCAL_ACTIONS.join(", ")}`,
      action,
      "prism_local"
    );
  }

  const validAction = parseResult.data;

  try {
    switch (validAction) {
      case "validate_code": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localValidation") as typeof import("../../engines/LocalValidationEngine.js").localValidationEngine;
        const result = await engine.validateCode(validated.data as Parameters<typeof engine.validateCode>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: {
            latencyMs: result.latencyMs,
            tokensSaved: result.tokensSaved,
            ollamaUsed: result.ollamaUsed,
          },
        });
      }

      case "local_health": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }
        const p = validated.data as { checkDocker?: boolean; checkOllama?: boolean };

        const engine = await getEngine("localValidation") as typeof import("../../engines/LocalValidationEngine.js").localValidationEngine;
        const ollamaHealth = await engine.healthCheck();

        // Check Docker if requested
        let dockerStatus: { running: boolean; version?: string } | undefined;
        if (p.checkDocker) {
          try {
            const { execSync } = await import("node:child_process");
            const version = execSync("docker version --format '{{.Server.Version}}'", {
              encoding: "utf8",
              timeout: 2000,
            }).trim();
            dockerStatus = { running: true, version };
          } catch {
            dockerStatus = { running: false };
          }
        }

        return slimResponse({
          success: true,
          action: validAction,
          data: {
            healthy: ollamaHealth.healthy && (dockerStatus?.running ?? true),
            docker: dockerStatus,
            ollama: p.checkOllama ? ollamaHealth : undefined,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            latencyMs: Date.now() - startTime,
          },
        });
      }

      case "offload_classify": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("offloader") as typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine;
        const decision = await engine.decide((validated.data as { task: string }).task);

        return slimResponse({
          success: true,
          action: validAction,
          data: decision,
          metadata: {
            latencyMs: Date.now() - startTime,
            tokensSaved: decision.estimatedTokenSavings,
          },
        });
      }

      case "learn_pattern": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const result = await engine.learnPattern(validated.data as Parameters<typeof engine.learnPattern>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "search_patterns": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const results = engine.searchPatterns(validated.data as Parameters<typeof engine.searchPatterns>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: { results, totalPatterns: results.length },
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "trajectory_start": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const result = engine.startTrajectory(validated.data as Parameters<typeof engine.startTrajectory>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "trajectory_step": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const result = engine.recordStep(validated.data as Parameters<typeof engine.recordStep>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "trajectory_end": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const result = engine.endTrajectory(validated.data as Parameters<typeof engine.endTrajectory>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "learning_stats": {
        const engine = await getEngine("localLearning") as typeof import("../../engines/LocalLearningEngine.js").localLearningEngine;
        const stats = engine.getStats();

        return slimResponse({
          success: true,
          action: validAction,
          data: stats,
          metadata: { latencyMs: Date.now() - startTime },
        });
      }

      case "enforce_rules": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("localValidation") as typeof import("../../engines/LocalValidationEngine.js").localValidationEngine;
        const result = await engine.enforceRules(validated.data as Parameters<typeof engine.enforceRules>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: {
            latencyMs: result.latencyMs,
            ollamaUsed: result.ollamaUsed,
          },
        });
      }

      case "aggregate_hooks": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("hookAggregator") as typeof import("../../engines/LocalHookAggregatorEngine.js").localHookAggregatorEngine;
        const result = await engine.aggregate(validated.data as Parameters<typeof engine.aggregate>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: {
            latencyMs: result.latencyMs,
            ollamaUsed: result.ollamaUsed,
          },
        });
      }

      case "awareness_route": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("awarenessRouter") as typeof import("../../engines/LocalAwarenessRouterEngine.js").localAwarenessRouterEngine;
        const result = await engine.brief(validated.data as Parameters<typeof engine.brief>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: {
            latencyMs: result.latencyMs,
            ollamaUsed: result.ollamaUsed,
          },
        });
      }

      case "suggest_commit": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }

        const engine = await getEngine("commitMessage") as typeof import("../../engines/LocalCommitMessageEngine.js").localCommitMessageEngine;
        const result = await engine.suggest(validated.data as Parameters<typeof engine.suggest>[0]);

        return slimResponse({
          success: true,
          action: validAction,
          data: result,
          metadata: {
            latencyMs: result.latencyMs,
            ollamaUsed: result.ollamaUsed,
          },
        });
      }

      case "local_generate": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) {
          return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        }
        const p = validated.data as {
          prompt: string; model: string; system: string;
          temperature: number; maxTokens: number; timeoutMs: number; numCtx?: number;
        };

        const engine = await getEngine("offloader") as typeof import("../../engines/OllamaTaskOffloaderEngine.js").ollamaTaskOffloaderEngine;
        const result = await engine.executeOffloaded(p.prompt, p.system, p.model, {
          temperature: p.temperature,
          maxTokens: p.maxTokens,
          timeoutMs: p.timeoutMs,
          numCtx: p.numCtx,
        });
        const ok = result.success;
        // Approx Claude tokens saved by serving this generation locally (~4 chars/token, prompt + output).
        const tokensSaved = ok ? Math.round((p.prompt.length + result.result.length) / 4) : 0;

        return slimResponse({
          success: ok,
          action: validAction,
          data: {
            success: ok,
            // On failure, the cause goes in `error` (NOT `content`) so an Ollama HTTP/network
            // error is never mistaken for model output (R12 -- fail loud in the right field).
            content: ok ? result.result : "",
            error: ok ? undefined : result.result,
            model: result.model,
            latencyMs: result.latencyMs,
            ollamaUsed: ok,
            tokensSaved,
          },
          metadata: {
            latencyMs: result.latencyMs,
            tokensSaved,
            ollamaUsed: ok,
          },
        });
      }

      // DeepSeek V4 hybrid backend actions
      case "execute_deepseek": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        const engine = await getEngine("deepSeek") as typeof import("../../engines/DeepSeekInferenceEngine.js").deepSeekInferenceEngine;
        const result = await engine.generate(validated.data as Parameters<typeof engine.generate>[0]);
        return slimResponse({ success: result.success, action: validAction, data: result, metadata: { latencyMs: result.latencyMs } });
      }

      case "deepseek_health": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        const engine = await getEngine("deepSeek") as typeof import("../../engines/DeepSeekInferenceEngine.js").deepSeekInferenceEngine;
        const result = await engine.health(validated.data as Parameters<typeof engine.health>[0]);
        return slimResponse({ success: true, action: validAction, data: result, metadata: { latencyMs: result.latencyMs } });
      }

      case "backend_route": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        const engine = await getEngine("backendRouter") as typeof import("../../engines/BackendRouterEngine.js").backendRouterEngine;
        const result = engine.route(validated.data as Parameters<typeof engine.route>[0]);
        return slimResponse({ success: true, action: validAction, data: result, metadata: { latencyMs: Date.now() - startTime } });
      }

      case "backend_config": {
        const validated = validateActionParams(validAction, params as Record<string, unknown>, INPUT_SCHEMAS);
        if (!validated.valid) return dispatcherError(validated.errorMessage || "Validation failed", action, "prism_local");
        const router = await getEngine("backendRouter") as typeof import("../../engines/BackendRouterEngine.js").backendRouterEngine;
        const deepseek = await getEngine("deepSeek") as typeof import("../../engines/DeepSeekInferenceEngine.js").deepSeekInferenceEngine;
        const p = validated.data as { action?: string; updates?: Record<string, unknown> };
        if (p.action === "update" && p.updates) router.updateThresholds(p.updates);
        return slimResponse({ success: true, action: validAction, data: { config: router.getThresholds(), deepseekConfigured: deepseek.isConfigured(), ollamaAvailable: true, updated: p.action === "update" }, metadata: { latencyMs: Date.now() - startTime } });
      }

      case "routing_stats": {
        const engine = await getEngine("backendRouter") as typeof import("../../engines/BackendRouterEngine.js").backendRouterEngine;
        const result = engine.getStats();
        return slimResponse({ success: true, action: validAction, data: result, metadata: { latencyMs: Date.now() - startTime } });
      }

      default: {
        const exhaustiveCheck: never = validAction;
        return dispatcherError(`Unhandled action: ${exhaustiveCheck}`, action, "prism_local");
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`[prism_local] ${action} failed: ${message}`);
    return dispatcherError(message, action, "prism_local");
  }
}

/**
 * Register prism_local as an MCP tool
 */
export function registerLocalDispatcher(server: any): void {
  server.tool(
    "prism_local",
    `Local LLM operations for token savings + learning. Actions: ${LOCAL_ACTIONS.join(", ")}. ` +
    `validate_code: Validate code via local Ollama. local_health: Check Ollama/Docker. ` +
    `offload_classify: Classify offloadable tasks. learn_pattern: Store error→fix patterns. ` +
    `search_patterns: Find relevant patterns. trajectory_*: SONA reinforcement learning. ` +
    `learning_stats: Get learning statistics. ` +
    `local_generate: Run an arbitrary prompt through a local Ollama model (route any local-LLM call through MCP).`,
    {
      action: z.enum(LOCAL_ACTIONS).describe("Local LLM action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async ({ action, params = {} }: { action: string; params: Record<string, unknown> }) => {
      log.info(`[prism_local] Action: ${action}`);
      const result = await localDispatcher(action, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

export default localDispatcher;
