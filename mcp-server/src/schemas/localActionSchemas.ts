/**
 * Local LLM Action Schemas — LOCAL-LLM-MS0
 * =========================================
 *
 * Zod schemas for prism_local dispatcher actions:
 * - validate_code: Validate code against CLAUDE.md rules (via Ollama)
 * - local_health: Check Ollama/Docker stack health
 * - offload_classify: Classify if task can be offloaded to local LLM
 *
 * @module schemas/localActionSchemas
 * @milestone LOCAL-LLM-MS0 Session 2
 */

import { z } from "zod";

export const LOCAL_ACTIONS = [
  "validate_code",
  "local_health",
  "offload_classify",
  "learn_pattern",
  "search_patterns",
  "trajectory_start",
  "trajectory_step",
  "trajectory_end",
  "learning_stats",
  "enforce_rules",
    "aggregate_hooks",
  "awareness_route",
  "suggest_commit",
  // local_generate -- general-purpose Ollama prompt -> text, so ANY local-LLM call routes through MCP (LOCAL-LLM-MS1)
  "local_generate",
  // DeepSeek V4 hybrid backend actions (LOCAL-LLM-MS0 Phase 1)
  "execute_deepseek",
  "deepseek_health",
  "backend_route",
  "backend_config",
  "routing_stats",
] as const;

export type LocalAction = (typeof LOCAL_ACTIONS)[number];

export const LocalActionEnum = z.enum(LOCAL_ACTIONS);

// validate_code — Validate code against CLAUDE.md rules
export const ValidateCodeInputSchema = z.object({
  code: z.string().min(1).describe("Code to validate"),
  checks: z.array(z.enum([
    "naming",
    "complexity",
    "types",
    "magic",
    "patterns",
    "references",
  ])).optional().describe("Specific checks to run (default: all)"),
  filePath: z.string().optional().describe("Optional file path for context"),
  language: z.enum(["typescript", "javascript", "python", "go", "rust"])
    .default("typescript")
    .describe("Programming language"),
});

export const ValidateCodeOutputSchema = z.object({
  passed: z.boolean().describe("True if no errors found"),
  issues: z.array(z.object({
    check: z.string().describe("Check type that found this issue"),
    severity: z.enum(["error", "warning", "info"]).describe("Issue severity"),
    line: z.number().optional().describe("Line number"),
    column: z.number().optional().describe("Column number"),
    message: z.string().describe("Issue description"),
    suggestion: z.string().optional().describe("Fix suggestion"),
    codeSnippet: z.string().optional().describe("Code context"),
  })).describe("List of validation issues"),
  checksRun: z.array(z.string()).describe("Checks that were executed"),
  ollamaUsed: z.boolean().describe("Whether Ollama enhanced validation"),
  modelUsed: z.string().nullable().describe("Ollama model used, if any"),
  latencyMs: z.number().describe("Validation time in milliseconds"),
  tokensSaved: z.number().describe("Estimated Claude tokens saved"),
});

// local_health — Check Ollama/Docker health
export const LocalHealthInputSchema = z.object({
  checkDocker: z.boolean().default(true).describe("Check Docker status"),
  checkOllama: z.boolean().default(true).describe("Check Ollama status"),
  checkModels: z.boolean().default(true).describe("List available models"),
});

export const LocalHealthOutputSchema = z.object({
  healthy: z.boolean().describe("Overall health status"),
  docker: z.object({
    running: z.boolean(),
    version: z.string().optional(),
  }).optional().describe("Docker status"),
  ollama: z.object({
    available: z.boolean(),
    models: z.array(z.string()),
    preferredModel: z.string(),
    preferredModelAvailable: z.boolean(),
  }).optional().describe("Ollama status"),
  timestamp: z.string().describe("Health check timestamp"),
});

// offload_classify — Classify task for offloading
export const OffloadClassifyInputSchema = z.object({
  task: z.string().min(1).describe("Task description to classify"),
});

export const OffloadClassifyOutputSchema = z.object({
  task: z.string().describe("Original task"),
  category: z.string().describe("Task category"),
  offloadable: z.boolean().describe("Can be offloaded to local LLM"),
  targetModel: z.string().nullable().describe("Recommended model"),
  reason: z.string().describe("Classification reasoning"),
  estimatedTokenSavings: z.number().describe("Estimated tokens saved"),
  confidence: z.number().describe("Classification confidence 0-1"),
});

// learn_pattern — Store error→fix pattern
export const LearnPatternInputSchema = z.object({
  error: z.string().min(1).describe("Error message or signature"),
  fix: z.string().min(1).describe("Fix that resolved the error"),
  errorType: z.enum([
    "typescript",
    "module",
    "test",
    "lint",
    "assertion",
    "runtime",
    "generic",
  ]).optional().describe("Error category"),
  file: z.string().optional().describe("File where error occurred"),
  context: z.string().optional().describe("Additional context"),
  useOllama: z.boolean().default(false).describe("Use Ollama for pattern extraction"),
});

export const LearnPatternOutputSchema = z.object({
  success: z.boolean().describe("Pattern stored successfully"),
  key: z.string().describe("Pattern key"),
  isNew: z.boolean().describe("True if new pattern, false if updated"),
  extractedPattern: z.string().optional().describe("Ollama-extracted pattern"),
  prevention: z.string().optional().describe("Prevention suggestion"),
  ollamaUsed: z.boolean().describe("Whether Ollama was used"),
});

// search_patterns — Find relevant patterns
export const SearchPatternsInputSchema = z.object({
  query: z.string().min(1).describe("Error message or keywords"),
  errorType: z.string().optional().describe("Filter by error type"),
  limit: z.number().int().min(1).max(20).default(5).describe("Max results"),
  minConfidence: z.number().min(0).max(1).default(0.3).describe("Min confidence"),
});

export const SearchPatternsOutputSchema = z.object({
  results: z.array(z.object({
    key: z.string(),
    error: z.string(),
    fix: z.string(),
    extractedPattern: z.string().optional(),
    prevention: z.string().optional(),
    confidence: z.number(),
    successCount: z.number(),
  })).describe("Matching patterns"),
  totalPatterns: z.number().describe("Total patterns in memory"),
});

// trajectory_start — Begin SONA trajectory
export const TrajectoryStartInputSchema = z.object({
  task: z.string().min(1).describe("Task description"),
  agent: z.string().optional().describe("Agent performing task"),
});

export const TrajectoryStartOutputSchema = z.object({
  trajectoryId: z.string().describe("Trajectory ID for subsequent calls"),
});

// trajectory_step — Record step in trajectory
export const TrajectoryStepInputSchema = z.object({
  trajectoryId: z.string().describe("Trajectory ID"),
  action: z.string().describe("Action taken"),
  result: z.string().optional().describe("Action result"),
  quality: z.number().min(0).max(1).optional().describe("Quality score"),
});

export const TrajectoryStepOutputSchema = z.object({
  success: z.boolean().describe("Step recorded"),
  stepIndex: z.number().describe("Step index in trajectory"),
});

// trajectory_end — End trajectory and trigger learning
export const TrajectoryEndInputSchema = z.object({
  trajectoryId: z.string().describe("Trajectory ID"),
  success: z.boolean().describe("Overall success"),
  feedback: z.string().optional().describe("Optional feedback"),
});

export const TrajectoryEndOutputSchema = z.object({
  success: z.boolean().describe("Trajectory ended"),
  duration: z.number().describe("Duration in ms"),
  stepCount: z.number().describe("Number of steps"),
  averageQuality: z.number().describe("Average quality score"),
});

// learning_stats — Get learning statistics
export const LearningStatsInputSchema = z.object({});

export const LearningStatsOutputSchema = z.object({
  totalPatterns: z.number().describe("Total patterns stored"),
  totalTrajectories: z.number().describe("Total trajectories"),
  successRate: z.number().describe("Trajectory success rate"),
  topErrorTypes: z.array(z.object({
    type: z.string(),
    count: z.number(),
  })).describe("Most common error types"),
  ollamaAvailable: z.boolean().describe("Ollama availability"),
  lastUpdated: z.string().describe("Last update timestamp"),
});

// enforce_rules — Validate code against CLAUDE.md rules via Qwen
export const EnforceRulesInputSchema = z.object({
  code: z.string().min(1).describe("Code to validate against CLAUDE.md rules"),
  claudeMdPath: z.string().optional().describe("Path to CLAUDE.md (default: auto-detect)"),
  strictness: z.enum(["lenient", "standard", "strict"]).default("standard")
    .describe("Strictness level (lenient=warnings, standard=default, strict=all)"),
});

export const EnforceRulesOutputSchema = z.object({
  passed: z.boolean().describe("True if no violations found"),
  violations: z.array(z.object({
    rule: z.string().describe("Rule name from CLAUDE.md"),
    severity: z.enum(["error", "warning", "info"]).describe("Violation severity"),
    line: z.number().optional().describe("Line number"),
    message: z.string().describe("Violation description"),
    suggestion: z.string().optional().describe("How to fix"),
    ruleSource: z.string().optional().describe("Section in CLAUDE.md"),
  })).describe("List of rule violations"),
  rulesChecked: z.number().describe("Number of rules evaluated"),
  ollamaUsed: z.boolean().describe("Whether Ollama was used for validation"),
  latencyMs: z.number().describe("Validation time in milliseconds"),
});

// aggregate_hooks — Aggregate disabled hook checks via Qwen
export const AggregateHooksInputSchema = z.object({
  code: z.string().min(1).describe("Code to check with aggregated hooks"),
  filePath: z.string().optional().describe("Optional file path for context"),
  hookTypes: z.array(z.enum([
    "naming",
    "types",
    "complexity",
    "magic",
    "async",
    "performance",
    "returns",
    "api",
    "all",
  ])).default(["all"]).describe("Hook types to run (default: all)"),
  maxIssues: z.number().int().min(1).max(20).default(5)
    .describe("Maximum issues to return (default: 5)"),
});

export const AggregateHooksOutputSchema = z.object({
  passed: z.boolean().describe("True if no errors found"),
  issues: z.array(z.object({
    hookType: z.string().describe("Hook type that found this issue"),
    severity: z.enum(["error", "warning", "info"]).describe("Issue severity"),
    line: z.number().optional().describe("Line number"),
    message: z.string().describe("Issue description"),
    suggestion: z.string().optional().describe("Fix suggestion"),
  })).describe("List of aggregated issues"),
  summary: z.string().describe("One-line summary of issues"),
  hooksChecked: z.array(z.string()).describe("Hook types that were checked"),
  issueCount: z.number().describe("Total issues found (may exceed maxIssues)"),
  ollamaUsed: z.boolean().describe("Whether Ollama enhanced analysis"),
  latencyMs: z.number().describe("Aggregation time in milliseconds"),
});

// local_generate -- general-purpose prompt -> text via a local Ollama model.
// This is the action that lets the miner / ask-ollama / any caller route an
// arbitrary local-LLM generation THROUGH the MCP server (LOCAL-LLM-MS1).
export const LocalGenerateInputSchema = z.object({
  prompt: z.string().min(1).describe("User prompt to send to the local model"),
  model: z.string().min(1).default("gpt-oss:20b")
    .describe("Ollama model tag (must be pulled; e.g. gpt-oss:20b, gpt-oss:120b, qwen2.5-coder:32b)"),
  system: z.string().default("You are a concise, accurate assistant.")
    .describe("System prompt for context"),
  temperature: z.number().min(0).max(2).default(0.2).describe("Sampling temperature"),
  maxTokens: z.number().int().min(1).max(32768).default(2048)
    .describe("Max output tokens (Ollama num_predict)"),
  numCtx: z.number().int().min(256).max(131072).optional()
    .describe("Ollama context window (num_ctx). Omit to use the model's default; set higher (e.g. 32768) for large-context tasks like transcript mining that would otherwise truncate"),
  timeoutMs: z.number().int().min(1000).max(600000).default(120000)
    .describe("Request timeout in milliseconds"),
});

export const LocalGenerateOutputSchema = z.object({
  success: z.boolean().describe("True if the model returned content"),
  content: z.string().describe("Generated text (empty string on failure)"),
  error: z.string().optional()
    .describe("Failure cause (Ollama HTTP/network error); present only when success is false"),
  model: z.string().describe("Model that produced the response"),
  latencyMs: z.number().describe("Generation time in milliseconds"),
  ollamaUsed: z.boolean()
    .describe("Whether local Ollama served the request successfully (false on network OR HTTP error)"),
  tokensSaved: z.number().describe("Approx Claude tokens saved by local inference (0 on failure)"),
});

// ============================================================================
// DeepSeek V4 Hybrid Backend Schemas (LOCAL-LLM-MS0 Phase 1)
// ============================================================================

// execute_deepseek — Generate text using DeepSeek V4 API
export const ExecuteDeepseekInputSchema = z.object({
  prompt: z.string().min(1).describe("Prompt to send to DeepSeek"),
  model: z.enum(["flash", "pro"]).default("flash").describe("Model: flash (free) or pro (paid)"),
  systemPrompt: z.string().optional().describe("System prompt for context"),
  temperature: z.number().min(0).max(2).default(0.3).describe("Sampling temperature"),
  maxTokens: z.number().int().min(1).max(32768).default(4096).describe("Max output tokens"),
  thinkingMode: z.boolean().default(false).describe("Enable thinking mode for complex reasoning"),
});

export const ExecuteDeepseekOutputSchema = z.object({
  success: z.boolean(),
  content: z.string().describe("Generated response"),
  model: z.string().describe("Model used"),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  thinkingContent: z.string().optional().describe("Thinking output if enabled"),
  latencyMs: z.number(),
  cached: z.boolean().describe("Whether response was cached"),
  error: z.string().optional(),
});

// deepseek_health — Check DeepSeek API health
export const DeepseekHealthInputSchema = z.object({
  checkModels: z.boolean().default(true).describe("Check model availability"),
  checkQuota: z.boolean().default(true).describe("Check API quota remaining"),
});

export const DeepseekHealthOutputSchema = z.object({
  healthy: z.boolean(),
  apiReachable: z.boolean(),
  apiKeyConfigured: z.boolean(),
  models: z.array(z.object({
    id: z.string(),
    available: z.boolean(),
    contextWindow: z.number(),
  })).optional(),
  latencyMs: z.number(),
  error: z.string().optional(),
});

// backend_route — Route task to optimal backend
export const BackendRouteInputSchema = z.object({
  task: z.string().min(1).describe("Task description"),
  contextLength: z.number().int().min(0).default(0).describe("Estimated context length in tokens"),
  tags: z.array(z.string()).default([]).describe("Task tags (critical, agentic, code, etc.)"),
  preferLocal: z.boolean().default(true).describe("Prefer local inference when possible"),
  maxLatencyMs: z.number().int().optional().describe("Maximum acceptable latency"),
});

export const BackendRouteOutputSchema = z.object({
  backend: z.enum(["qwen", "deepseek-flash", "deepseek-pro"]).describe("Recommended backend"),
  reason: z.string().describe("Why this backend was selected"),
  complexity: z.enum(["simple", "moderate", "complex", "critical"]).describe("Task complexity"),
  estimatedLatencyMs: z.number(),
  estimatedCost: z.number().describe("Cost in USD (0 for local/free)"),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.object({
    backend: z.enum(["qwen", "deepseek-flash", "deepseek-pro"]),
    reason: z.string(),
  })),
});

// backend_config — Get/update backend configuration
export const BackendConfigInputSchema = z.object({
  action: z.enum(["get", "update"]).default("get").describe("Get or update config"),
  updates: z.object({
    contextUpgradeTokens: z.number().int().optional(),
    complexityUpgradeTags: z.array(z.string()).optional(),
    criticalTags: z.array(z.string()).optional(),
  }).optional().describe("Config updates (for action=update)"),
});

export const BackendConfigOutputSchema = z.object({
  config: z.object({
    contextUpgradeTokens: z.number(),
    complexityUpgradeTags: z.array(z.string()),
    criticalTags: z.array(z.string()),
    maxLocalContextTokens: z.number(),
  }),
  deepseekConfigured: z.boolean(),
  ollamaAvailable: z.boolean(),
  updated: z.boolean().optional(),
});

// routing_stats — Get routing statistics
export const RoutingStatsInputSchema = z.object({});

export const RoutingStatsOutputSchema = z.object({
  totalRoutes: z.number(),
  byBackend: z.record(z.string(), z.number()),
  successRates: z.record(z.string(), z.number()),
  avgLatencies: z.record(z.string(), z.number()),
  learnedPatterns: z.number(),
});

// Combined schema map for dispatcher
export const ACTION_LOCAL_SCHEMAS = {
  validate_code: {
    input: ValidateCodeInputSchema,
    output: ValidateCodeOutputSchema,
  },
  local_health: {
    input: LocalHealthInputSchema,
    output: LocalHealthOutputSchema,
  },
  offload_classify: {
    input: OffloadClassifyInputSchema,
    output: OffloadClassifyOutputSchema,
  },
  learn_pattern: {
    input: LearnPatternInputSchema,
    output: LearnPatternOutputSchema,
  },
  search_patterns: {
    input: SearchPatternsInputSchema,
    output: SearchPatternsOutputSchema,
  },
  trajectory_start: {
    input: TrajectoryStartInputSchema,
    output: TrajectoryStartOutputSchema,
  },
  trajectory_step: {
    input: TrajectoryStepInputSchema,
    output: TrajectoryStepOutputSchema,
  },
  trajectory_end: {
    input: TrajectoryEndInputSchema,
    output: TrajectoryEndOutputSchema,
  },
  learning_stats: {
    input: LearningStatsInputSchema,
    output: LearningStatsOutputSchema,
  },
  enforce_rules: {
    input: EnforceRulesInputSchema,
    output: EnforceRulesOutputSchema,
  },
  aggregate_hooks: {
    input: AggregateHooksInputSchema,
    output: AggregateHooksOutputSchema,
  },
  local_generate: {
    input: LocalGenerateInputSchema,
    output: LocalGenerateOutputSchema,
  },
  // DeepSeek V4 hybrid backend
  execute_deepseek: {
    input: ExecuteDeepseekInputSchema,
    output: ExecuteDeepseekOutputSchema,
  },
  deepseek_health: {
    input: DeepseekHealthInputSchema,
    output: DeepseekHealthOutputSchema,
  },
  backend_route: {
    input: BackendRouteInputSchema,
    output: BackendRouteOutputSchema,
  },
  backend_config: {
    input: BackendConfigInputSchema,
    output: BackendConfigOutputSchema,
  },
  routing_stats: {
    input: RoutingStatsInputSchema,
    output: RoutingStatsOutputSchema,
  },
} as const;

// Re-export schemas from engines for dispatcher use
export { AwarenessInputSchema } from "../engines/LocalAwarenessRouterEngine.js";
export { CommitInputSchema } from "../engines/LocalCommitMessageEngine.js";
