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
} as const;
