/**
 * LocalLearningEngine — LOCAL-LLM-MS0 Session 3
 * ==============================================
 *
 * Exposes error→fix pattern memory via MCP actions and enables
 * Ollama-enhanced pattern extraction for deeper learning.
 *
 * Features:
 * - learn_pattern: Store error→fix patterns with optional Ollama extraction
 * - search_patterns: Find relevant patterns by error signature or keywords
 * - trajectory_start/step/end: SONA-style reinforcement learning
 * - get_stats: Learning statistics and pattern counts
 *
 * Integrates with existing error-pattern-memory.mjs hook data.
 *
 * @module engines/LocalLearningEngine
 * @milestone LOCAL-LLM-MS0 Session 3
 */

import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { log } from "../utils/Logger.js";

// ============================================================================
// Schemas
// ============================================================================

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
  context: z.string().optional().describe("Additional context for pattern extraction"),
  useOllama: z.boolean().default(false).describe("Use Ollama for deeper pattern extraction"),
});

export const SearchPatternsInputSchema = z.object({
  query: z.string().min(1).describe("Error message or keywords to search"),
  errorType: z.string().optional().describe("Filter by error type"),
  limit: z.number().int().min(1).max(20).default(5).describe("Max results"),
  minConfidence: z.number().min(0).max(1).default(0.3).describe("Min confidence threshold"),
});

export const TrajectoryStartInputSchema = z.object({
  task: z.string().min(1).describe("Task description"),
  agent: z.string().optional().describe("Agent performing the task"),
});

export const TrajectoryStepInputSchema = z.object({
  trajectoryId: z.string().describe("Trajectory ID from start"),
  action: z.string().describe("Action taken"),
  result: z.string().optional().describe("Action result"),
  quality: z.number().min(0).max(1).optional().describe("Quality score 0-1"),
});

export const TrajectoryEndInputSchema = z.object({
  trajectoryId: z.string().describe("Trajectory ID"),
  success: z.boolean().describe("Overall success"),
  feedback: z.string().optional().describe("Optional feedback"),
});

export type LearnPatternInput = z.infer<typeof LearnPatternInputSchema>;
export type SearchPatternsInput = z.infer<typeof SearchPatternsInputSchema>;
export type TrajectoryStartInput = z.infer<typeof TrajectoryStartInputSchema>;
export type TrajectoryStepInput = z.infer<typeof TrajectoryStepInputSchema>;
export type TrajectoryEndInput = z.infer<typeof TrajectoryEndInputSchema>;

// ============================================================================
// Types
// ============================================================================

interface ErrorPattern {
  key: string;
  error: string;
  errorType: string;
  fix: string;
  file?: string;
  extractedPattern?: string;
  prevention?: string;
  successCount: number;
  lastUsed: string;
  created: string;
}

interface Trajectory {
  id: string;
  task: string;
  agent?: string;
  steps: Array<{
    action: string;
    result?: string;
    quality?: number;
    timestamp: string;
  }>;
  startTime: string;
  endTime?: string;
  success?: boolean;
  feedback?: string;
}

interface LearningMemory {
  patterns: Record<string, ErrorPattern>;
  trajectories: Trajectory[];
  stats: {
    totalPatterns: number;
    totalTrajectories: number;
    successfulTrajectories: number;
    lastUpdated: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const PATTERN_PATH = "H:/prism/mcp-server/data/state/learning-patterns.json";
const ERROR_MEMORY_PATH = "H:/prism/mcp-server/data/state/error-memory.json";
const TRAJECTORY_PATH = "H:/prism/mcp-server/data/state/sona-trajectories.jsonl";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const PREFERRED_MODEL = "qwen2.5-coder:32b";
const MAX_PATTERNS = 500;
const MAX_TRAJECTORIES = 100;

// ============================================================================
// LocalLearningEngine
// ============================================================================

class LocalLearningEngine {
  private memory: LearningMemory;
  private ollamaAvailable: boolean | null = null;

  constructor() {
    this.memory = this.loadMemory();
  }

  // --------------------------------------------------------------------------
  // Memory persistence
  // --------------------------------------------------------------------------

  private loadMemory(): LearningMemory {
    try {
      if (existsSync(PATTERN_PATH)) {
        const data = JSON.parse(readFileSync(PATTERN_PATH, "utf8"));
        return {
          patterns: data.patterns || {},
          trajectories: data.trajectories || [],
          stats: data.stats || {
            totalPatterns: 0,
            totalTrajectories: 0,
            successfulTrajectories: 0,
            lastUpdated: new Date().toISOString(),
          },
        };
      }
    } catch (err) {
      log.warn(`[LocalLearning] Failed to load memory: ${err}`);
    }

    // Also import patterns from existing error-memory.json
    return this.importFromErrorMemory();
  }

  private importFromErrorMemory(): LearningMemory {
    const memory: LearningMemory = {
      patterns: {},
      trajectories: [],
      stats: {
        totalPatterns: 0,
        totalTrajectories: 0,
        successfulTrajectories: 0,
        lastUpdated: new Date().toISOString(),
      },
    };

    try {
      if (existsSync(ERROR_MEMORY_PATH)) {
        const errorData = JSON.parse(readFileSync(ERROR_MEMORY_PATH, "utf8"));
        const fixes = errorData.fixes || {};

        for (const [key, fix] of Object.entries(fixes)) {
          const fixData = fix as { fix: string; file?: string; successCount?: number; timestamp?: string };
          const parts = key.split(":");
          memory.patterns[key] = {
            key,
            error: parts.slice(2).join(":") || key,
            errorType: parts[0] || "generic",
            fix: fixData.fix,
            file: fixData.file,
            successCount: fixData.successCount || 1,
            lastUsed: fixData.timestamp || new Date().toISOString(),
            created: fixData.timestamp || new Date().toISOString(),
          };
        }

        memory.stats.totalPatterns = Object.keys(memory.patterns).length;
        log.info(`[LocalLearning] Imported ${memory.stats.totalPatterns} patterns from error-memory.json`);
      }
    } catch (err) {
      log.warn(`[LocalLearning] Failed to import from error-memory: ${err}`);
    }

    return memory;
  }

  private saveMemory(): void {
    try {
      const dir = dirname(PATTERN_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      this.memory.stats.lastUpdated = new Date().toISOString();
      this.memory.stats.totalPatterns = Object.keys(this.memory.patterns).length;
      this.memory.stats.totalTrajectories = this.memory.trajectories.length;

      writeFileSync(PATTERN_PATH, JSON.stringify(this.memory, null, 2));
    } catch (err) {
      log.error(`[LocalLearning] Failed to save memory: ${err}`);
    }
  }

  // --------------------------------------------------------------------------
  // Ollama integration
  // --------------------------------------------------------------------------

  private async checkOllama(): Promise<boolean> {
    if (this.ollamaAvailable !== null) {
      return this.ollamaAvailable;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      this.ollamaAvailable = response.ok;
      return this.ollamaAvailable;
    } catch {
      this.ollamaAvailable = false;
      return false;
    }
  }

  private async extractPatternWithOllama(
    error: string,
    fix: string,
    context?: string
  ): Promise<{ pattern: string; prevention: string } | null> {
    if (!(await this.checkOllama())) {
      return null;
    }

    try {
      const prompt = `Extract a reusable pattern from this error-fix pair.

ERROR: ${error}
FIX: ${fix}
${context ? `CONTEXT: ${context}` : ""}

Output ONLY valid JSON (no markdown, no explanation):
{"pattern": "one-line description of the error pattern", "prevention": "how to prevent this in future code"}`;

      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: PREFERRED_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 200 },
        }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as unknown as { response?: string };
      const text = data.response?.trim() || "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          pattern: parsed.pattern || "",
          prevention: parsed.prevention || "",
        };
      }
    } catch (err) {
      log.warn(`[LocalLearning] Ollama extraction failed: ${err}`);
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Pattern key generation
  // --------------------------------------------------------------------------

  private generateKey(error: string, errorType: string): string {
    const normalized = error
      .toLowerCase()
      .replace(/\d+/g, "N")
      .replace(/['"`]/g, "")
      .slice(0, 80);
    return `${errorType}:${normalized}`;
  }

  // --------------------------------------------------------------------------
  // Public API: learnPattern
  // --------------------------------------------------------------------------

  async learnPattern(input: LearnPatternInput): Promise<{
    success: boolean;
    key: string;
    isNew: boolean;
    extractedPattern?: string;
    prevention?: string;
    ollamaUsed: boolean;
  }> {
    const errorType = input.errorType || "generic";
    const key = this.generateKey(input.error, errorType);

    const existing = this.memory.patterns[key];
    const isNew = !existing;

    let extractedPattern: string | undefined;
    let prevention: string | undefined;
    let ollamaUsed = false;

    // Try Ollama extraction if requested
    if (input.useOllama) {
      const extracted = await this.extractPatternWithOllama(
        input.error,
        input.fix,
        input.context
      );
      if (extracted) {
        extractedPattern = extracted.pattern;
        prevention = extracted.prevention;
        ollamaUsed = true;
      }
    }

    // Store or update pattern
    this.memory.patterns[key] = {
      key,
      error: input.error.slice(0, 200),
      errorType,
      fix: input.fix.slice(0, 500),
      file: input.file,
      extractedPattern,
      prevention,
      successCount: existing ? existing.successCount + 1 : 1,
      lastUsed: new Date().toISOString(),
      created: existing?.created || new Date().toISOString(),
    };

    // Prune if over limit
    this.prunePatterns();
    this.saveMemory();

    return {
      success: true,
      key,
      isNew,
      extractedPattern,
      prevention,
      ollamaUsed,
    };
  }

  private prunePatterns(): void {
    const keys = Object.keys(this.memory.patterns);
    if (keys.length <= MAX_PATTERNS) return;

    // Sort by successCount (keep most successful)
    const sorted = keys.sort(
      (a, b) =>
        (this.memory.patterns[b].successCount || 0) -
        (this.memory.patterns[a].successCount || 0)
    );

    const toRemove = sorted.slice(MAX_PATTERNS);
    for (const key of toRemove) {
      delete this.memory.patterns[key];
    }
  }

  // --------------------------------------------------------------------------
  // Public API: searchPatterns
  // --------------------------------------------------------------------------

  searchPatterns(input: SearchPatternsInput): Array<{
    key: string;
    error: string;
    fix: string;
    extractedPattern?: string;
    prevention?: string;
    confidence: number;
    successCount: number;
  }> {
    const query = input.query.toLowerCase();
    const results: Array<{
      pattern: ErrorPattern;
      score: number;
    }> = [];

    for (const pattern of Object.values(this.memory.patterns)) {
      // Filter by error type if specified
      if (input.errorType && pattern.errorType !== input.errorType) {
        continue;
      }

      // Calculate relevance score
      let score = 0;
      const errorLower = pattern.error.toLowerCase();
      const fixLower = pattern.fix.toLowerCase();

      // Exact match in error
      if (errorLower.includes(query)) {
        score += 0.5;
      }

      // Partial word match
      const queryWords = query.split(/\s+/);
      for (const word of queryWords) {
        if (word.length < 3) continue;
        if (errorLower.includes(word)) score += 0.2;
        if (fixLower.includes(word)) score += 0.1;
        if (pattern.extractedPattern?.toLowerCase().includes(word)) score += 0.15;
      }

      // Boost by success count
      score += Math.min(pattern.successCount * 0.05, 0.3);

      if (score >= input.minConfidence) {
        results.push({ pattern, score: Math.min(score, 1) });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, input.limit).map(({ pattern, score }) => ({
      key: pattern.key,
      error: pattern.error,
      fix: pattern.fix,
      extractedPattern: pattern.extractedPattern,
      prevention: pattern.prevention,
      confidence: Math.round(score * 100) / 100,
      successCount: pattern.successCount,
    }));
  }

  // --------------------------------------------------------------------------
  // Public API: Trajectory tracking (SONA-style)
  // --------------------------------------------------------------------------

  startTrajectory(input: TrajectoryStartInput): { trajectoryId: string } {
    const id = `traj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.memory.trajectories.push({
      id,
      task: input.task,
      agent: input.agent,
      steps: [],
      startTime: new Date().toISOString(),
    });

    // Prune old trajectories
    if (this.memory.trajectories.length > MAX_TRAJECTORIES) {
      this.memory.trajectories = this.memory.trajectories.slice(-MAX_TRAJECTORIES);
    }

    this.saveMemory();
    return { trajectoryId: id };
  }

  recordStep(input: TrajectoryStepInput): { success: boolean; stepIndex: number } {
    const trajectory = this.memory.trajectories.find((t) => t.id === input.trajectoryId);
    if (!trajectory) {
      return { success: false, stepIndex: -1 };
    }

    trajectory.steps.push({
      action: input.action,
      result: input.result,
      quality: input.quality,
      timestamp: new Date().toISOString(),
    });

    this.saveMemory();
    return { success: true, stepIndex: trajectory.steps.length - 1 };
  }

  endTrajectory(input: TrajectoryEndInput): {
    success: boolean;
    duration: number;
    stepCount: number;
    averageQuality: number;
  } {
    const trajectory = this.memory.trajectories.find((t) => t.id === input.trajectoryId);
    if (!trajectory) {
      return { success: false, duration: 0, stepCount: 0, averageQuality: 0 };
    }

    trajectory.endTime = new Date().toISOString();
    trajectory.success = input.success;
    trajectory.feedback = input.feedback;

    // Update stats
    if (input.success) {
      this.memory.stats.successfulTrajectories++;
    }

    // Calculate metrics
    const duration =
      new Date(trajectory.endTime).getTime() - new Date(trajectory.startTime).getTime();
    const stepCount = trajectory.steps.length;
    const qualities = trajectory.steps
      .map((s) => s.quality)
      .filter((q): q is number => q !== undefined);
    const averageQuality =
      qualities.length > 0
        ? qualities.reduce((a, b) => a + b, 0) / qualities.length
        : 0;

    // Append to JSONL for long-term storage
    this.appendTrajectoryToLog(trajectory);
    this.saveMemory();

    return {
      success: true,
      duration,
      stepCount,
      averageQuality: Math.round(averageQuality * 100) / 100,
    };
  }

  private appendTrajectoryToLog(trajectory: Trajectory): void {
    try {
      const dir = dirname(TRAJECTORY_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const line = JSON.stringify(trajectory) + "\n";
      const { appendFileSync } = require("node:fs");
      appendFileSync(TRAJECTORY_PATH, line);
    } catch (err) {
      log.warn(`[LocalLearning] Failed to append trajectory: ${err}`);
    }
  }

  // --------------------------------------------------------------------------
  // Public API: getStats
  // --------------------------------------------------------------------------

  getStats(): {
    totalPatterns: number;
    totalTrajectories: number;
    successRate: number;
    topErrorTypes: Array<{ type: string; count: number }>;
    ollamaAvailable: boolean;
    lastUpdated: string;
  } {
    const typeCount: Record<string, number> = {};
    for (const pattern of Object.values(this.memory.patterns)) {
      typeCount[pattern.errorType] = (typeCount[pattern.errorType] || 0) + 1;
    }

    const topErrorTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    const successRate =
      this.memory.stats.totalTrajectories > 0
        ? this.memory.stats.successfulTrajectories / this.memory.stats.totalTrajectories
        : 0;

    return {
      totalPatterns: this.memory.stats.totalPatterns,
      totalTrajectories: this.memory.stats.totalTrajectories,
      successRate: Math.round(successRate * 100) / 100,
      topErrorTypes,
      ollamaAvailable: this.ollamaAvailable ?? false,
      lastUpdated: this.memory.stats.lastUpdated,
    };
  }

  // --------------------------------------------------------------------------
  // Health check
  // --------------------------------------------------------------------------

  async healthCheck(): Promise<{
    healthy: boolean;
    ollamaAvailable: boolean;
    patternCount: number;
    trajectoryCount: number;
  }> {
    const ollamaAvailable = await this.checkOllama();

    return {
      healthy: true,
      ollamaAvailable,
      patternCount: Object.keys(this.memory.patterns).length,
      trajectoryCount: this.memory.trajectories.length,
    };
  }
}

// ============================================================================
// Singleton export
// ============================================================================

export const localLearningEngine = new LocalLearningEngine();
export default localLearningEngine;
