/**
 * PRISM MCP Server - Script Executor Engine
 * Session 5.2: Script Execution Engine
 * 
 * Features:
 * - Script execution with parameter injection
 * - Execution queue with priority scheduling
 * - Output capture and parsing
 * - Execution history and tracking
 * - Task-based script recommendations
 * - Safety validation before execution
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { scriptRegistry, Script, ScriptCategory, ScriptLanguage, ScriptParameter } from "../registries/ScriptRegistry.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionParams {
  [key: string]: string | number | boolean | undefined;
}

export interface ExecutionOptions {
  timeout_ms?: number;
  working_dir?: string;
  env?: Record<string, string>;
  capture_output?: boolean;
  on_stdout?: (data: string) => void;
  on_stderr?: (data: string) => void;
}

export interface ExecutionResult {
  success: boolean;
  script_id: string;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  params_used: ExecutionParams;
  error?: string;
}

export interface QueuedExecution {
  id: string;
  script_id: string;
  params: ExecutionParams;
  options: ExecutionOptions;
  priority: number;
  queued_at: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: ExecutionResult;
}

export interface ScriptRecommendation {
  script_id: string;
  name: string;
  category: ScriptCategory;
  relevance_score: number;
  match_reasons: string[];
  usage_example: string;
}

export interface ExecutorConfig {
  max_concurrent: number;
  default_timeout_ms: number;
  max_queue_size: number;
  enable_history: boolean;
  max_history_entries: number;
  safe_mode: boolean;  // Require explicit approval for destructive scripts
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ExecutorConfig = {
  max_concurrent: 3,
  default_timeout_ms: 60000,  // 1 minute
  max_queue_size: 100,
  enable_history: true,
  max_history_entries: 500,
  safe_mode: true
};

// Script patterns for task matching
const TASK_SCRIPT_PATTERNS: Record<string, { patterns: RegExp[]; scripts: string[] }> = {
  session: {
    patterns: [/session/i, /startup/i, /resume/i, /checkpoint/i, /gsd/i],
    scripts: ["gsd_startup", "session_memory_manager", "prism_unified_system_v6"]
  },
  skill: {
    patterns: [/skill/i, /select.*skill/i, /recommend.*skill/i],
    scripts: ["intelligent_skill_selector", "format_skills_for_upload", "wire_new_skills"]
  },
  audit: {
    patterns: [/audit/i, /analyze/i, /check/i, /verify/i],
    scripts: ["comprehensive_audit", "mcp_resource_audit", "deep_dive_uncategorized"]
  },
  sync: {
    patterns: [/sync/i, /pipeline/i, /update.*data/i],
    scripts: ["master_sync"]
  },
  extract: {
    patterns: [/extract/i, /pull/i, /migrate/i],
    scripts: ["bulk_extract_modules", "analyze_extraction_priority"]
  },
  api: {
    patterns: [/api/i, /swarm/i, /parallel/i, /agent/i],
    scripts: ["api_parallel_test", "api_swarm_executor"]
  },
  plan: {
    patterns: [/plan/i, /roadmap/i, /strategy/i],
    scripts: ["ultimate_plan"]
  }
};

// Potentially destructive scripts that require safe_mode approval
const DESTRUCTIVE_SCRIPTS = new Set([
  "bulk_extract_modules",
  "wire_new_skills",
  "master_sync"
]);

// ============================================================================
// SCRIPT EXECUTOR ENGINE
// ============================================================================

export class ScriptExecutor {
  private config: ExecutorConfig;
  private queue: Map<string, QueuedExecution>;
  private history: ExecutionResult[];
  private running: Map<string, { process: ChildProcess; execution: QueuedExecution }>;
  private initialized: boolean = false;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new Map();
    this.history = [];
    this.running = new Map();
  }

  /**
   * Initialize the script executor
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("Initializing ScriptExecutor...");

    // Ensure script registry is loaded
    await scriptRegistry.load();

    this.initialized = true;
    log.info(`ScriptExecutor initialized with ${scriptRegistry.size} scripts available`);

    // Emit initialization event
    await eventBus.publish("script_executor.initialized", { scripts_available: scriptRegistry.size }, { source: "ScriptExecutor" });
  }

  // ==========================================================================
  // SCRIPT EXECUTION
  // ==========================================================================

  /**
   * Execute a script by ID
   */
  async executeScript(
    scriptId: string,
    params: ExecutionParams = {},
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    await this.initialize();

    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    try {
      // Get script from registry
      const script = scriptRegistry.getScript(scriptId);
      if (!script) {
        return this.createErrorResult(scriptId, `Script not found: ${scriptId}`, params, startTime, startedAt);
      }

      if (!script.enabled) {
        return this.createErrorResult(scriptId, `Script is disabled: ${scriptId}`, params, startTime, startedAt);
      }

      // Check safe mode for destructive scripts
      if (this.config.safe_mode && DESTRUCTIVE_SCRIPTS.has(scriptId)) {
        return this.createErrorResult(
          scriptId, 
          `Script ${scriptId} requires safe_mode approval (potentially destructive)`,
          params, startTime, startedAt
        );
      }

      // Validate parameters
      const validationError = this.validateParams(script, params);
      if (validationError) {
        return this.createErrorResult(scriptId, validationError, params, startTime, startedAt);
      }

      // Build command
      const command = this.buildCommand(script, params);
      const timeout = options.timeout_ms || this.config.default_timeout_ms;

      // Execute
      const result = await this.runProcess(script, command, timeout, options);
      result.params_used = params;
      result.started_at = startedAt;

      // Track history
      if (this.config.enable_history) {
        this.addToHistory(result);
      }

      // Emit completion event
      await eventBus.publish(
        result.success ? "script.execution.success" : "script.execution.failed",
        { script_id: scriptId, duration_ms: result.duration_ms, exit_code: result.exit_code },
        { source: "ScriptExecutor" }
      );

      return result;

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return this.createErrorResult(scriptId, error, params, startTime, startedAt);
    }
  }

  /**
   * Build command with parameters
   */
  private buildCommand(script: Script, params: ExecutionParams): string[] {
    const args: string[] = [];

    // Add interpreter
    const interpreterParts = script.interpreter.split(" ");
    
    // Add script path
    args.push(script.path);

    // Add parameters
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (key.startsWith("-")) {
        // Named parameter
        if (typeof value === "boolean") {
          if (value) args.push(key);
        } else {
          args.push(key, String(value));
        }
      } else {
        // Positional parameter
        args.push(String(value));
      }
    }

    return [interpreterParts[0], ...interpreterParts.slice(1), ...args];
  }

  /**
   * Run the actual process
   */
  private runProcess(
    script: Script,
    command: string[],
    timeout: number,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const [cmd, ...args] = command;

      let stdout = "";
      let stderr = "";
      let killed = false;

      const proc = spawn(cmd, args, {
        cwd: options.working_dir || path.dirname(script.path),
        env: { ...process.env, ...options.env },
        shell: true
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
      }, timeout);

      // Capture stdout
      proc.stdout?.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        options.on_stdout?.(chunk);
      });

      // Capture stderr
      proc.stderr?.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
        options.on_stderr?.(chunk);
      });

      // Handle completion
      proc.on("close", (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        resolve({
          success: code === 0 && !killed,
          script_id: script.script_id,
          exit_code: code,
          stdout: options.capture_output !== false ? stdout : "[output captured by callback]",
          stderr: options.capture_output !== false ? stderr : "[output captured by callback]",
          duration_ms: duration,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          params_used: {},
          error: killed ? `Script timed out after ${timeout}ms` : undefined
        });
      });

      // Handle errors
      proc.on("error", (err) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        resolve({
          success: false,
          script_id: script.script_id,
          exit_code: null,
          stdout,
          stderr,
          duration_ms: duration,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          params_used: {},
          error: err.message
        });
      });
    });
  }

  /**
   * Validate parameters against script definition
   */
  private validateParams(script: Script, params: ExecutionParams): string | null {
    for (const paramDef of script.parameters) {
      if (paramDef.required) {
        const key = paramDef.name.replace(/^-+/, "");
        const hasParam = params[paramDef.name] !== undefined || params[key] !== undefined;
        if (!hasParam && paramDef.default === undefined) {
          return `Required parameter missing: ${paramDef.name}`;
        }
      }
    }
    return null;
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    scriptId: string,
    error: string,
    params: ExecutionParams,
    startTime: number,
    startedAt: string
  ): ExecutionResult {
    return {
      success: false,
      script_id: scriptId,
      exit_code: null,
      stdout: "",
      stderr: "",
      duration_ms: Date.now() - startTime,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      params_used: params,
      error
    };
  }

  // ==========================================================================
  // QUEUE MANAGEMENT
  // ==========================================================================

  /**
   * Queue a script for execution
   */
  queueScript(
    scriptId: string,
    params: ExecutionParams = {},
    options: ExecutionOptions = {},
    priority: number = 5
  ): QueuedExecution {
    const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const execution: QueuedExecution = {
      id,
      script_id: scriptId,
      params,
      options,
      priority,
      queued_at: new Date().toISOString(),
      status: "pending"
    };

    // Check queue size
    if (this.queue.size >= this.config.max_queue_size) {
      // Remove lowest priority pending item
      let lowestId: string | null = null;
      let lowestPriority = Infinity;

      for (const [qId, q] of this.queue) {
        if (q.status === "pending" && q.priority < lowestPriority) {
          lowestPriority = q.priority;
          lowestId = qId;
        }
      }

      if (lowestId && lowestPriority < priority) {
        this.queue.delete(lowestId);
      }
    }

    this.queue.set(id, execution);
    return execution;
  }

  /**
   * Process the queue
   */
  async processQueue(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    // Get pending executions sorted by priority (descending)
    const pending = Array.from(this.queue.values())
      .filter(e => e.status === "pending")
      .sort((a, b) => b.priority - a.priority);

    // Process up to max_concurrent
    const toProcess = pending.slice(0, this.config.max_concurrent - this.running.size);

    for (const execution of toProcess) {
      execution.status = "running";
      
      const result = await this.executeScript(
        execution.script_id,
        execution.params,
        execution.options
      );

      execution.status = result.success ? "completed" : "failed";
      execution.result = result;
      results.push(result);
    }

    return results;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const statuses = { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };

    for (const e of this.queue.values()) {
      statuses.total++;
      statuses[e.status as keyof typeof statuses]++;
    }

    return statuses;
  }

  /**
   * Cancel a queued execution
   */
  cancelExecution(id: string): boolean {
    const execution = this.queue.get(id);
    if (!execution || execution.status !== "pending") return false;

    execution.status = "cancelled";
    return true;
  }

  /**
   * Clear completed/failed executions from queue
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const [id, e] of this.queue) {
      if (e.status === "completed" || e.status === "failed" || e.status === "cancelled") {
        this.queue.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  // ==========================================================================
  // SCRIPT RECOMMENDATIONS
  // ==========================================================================

  /**
   * Get script recommendations for a task
   */
  async recommendScripts(taskDescription: string): Promise<ScriptRecommendation[]> {
    await this.initialize();

    const task = taskDescription.toLowerCase();
    const recommendations: Map<string, ScriptRecommendation> = new Map();

    // Match against task patterns
    for (const [category, config] of Object.entries(TASK_SCRIPT_PATTERNS)) {
      const matches = config.patterns.some(p => p.test(task));
      if (matches) {
        for (const scriptId of config.scripts) {
          const script = scriptRegistry.getScript(scriptId);
          if (script && script.enabled) {
            this.addScriptRecommendation(recommendations, script, `Matches ${category} pattern`, 0.4);
          }
        }
      }
    }

    // Search registry for additional matches
    const searchResults = scriptRegistry.search({ query: taskDescription.split(" ")[0], limit: 10 });
    for (const script of searchResults.scripts) {
      if (script.enabled) {
        this.addScriptRecommendation(recommendations, script, "Name/description match", 0.3);
      }
    }

    // Convert to array and sort
    const results = Array.from(recommendations.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 10);

    return results;
  }

  /**
   * Add or update a script recommendation
   */
  private addScriptRecommendation(
    map: Map<string, ScriptRecommendation>,
    script: Script,
    reason: string,
    scoreBoost: number
  ): void {
    const existing = map.get(script.script_id);
    if (existing) {
      existing.relevance_score = Math.min(1.0, existing.relevance_score + scoreBoost);
      if (!existing.match_reasons.includes(reason)) {
        existing.match_reasons.push(reason);
      }
    } else {
      map.set(script.script_id, {
        script_id: script.script_id,
        name: script.name,
        category: script.category,
        relevance_score: scoreBoost,
        match_reasons: [reason],
        usage_example: script.usage_examples[0] || 
          scriptRegistry.getExecutionCommand(script.script_id) || 
          `${script.interpreter} ${script.path}`
      });
    }
  }

  // ==========================================================================
  // HISTORY & STATISTICS
  // ==========================================================================

  /**
   * Add result to history
   */
  private addToHistory(result: ExecutionResult): void {
    this.history.push(result);

    // Trim history if needed
    while (this.history.length > this.config.max_history_entries) {
      this.history.shift();
    }
  }

  /**
   * Get execution history
   */
  getHistory(options?: {
    script_id?: string;
    success?: boolean;
    limit?: number;
  }): ExecutionResult[] {
    let results = [...this.history];

    if (options?.script_id) {
      results = results.filter(r => r.script_id === options.script_id);
    }

    if (options?.success !== undefined) {
      results = results.filter(r => r.success === options.success);
    }

    // Return most recent first
    results.reverse();

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    scripts_available: number;
    queue: { total: number; pending: number; running: number; completed: number; failed: number };
    history: { total: number; success_count: number; failure_count: number; avg_duration_ms: number };
    most_executed: { script_id: string; count: number }[];
  } {
    const queueStatus = this.getQueueStatus();

    // Calculate history stats
    const successCount = this.history.filter(r => r.success).length;
    const avgDuration = this.history.length > 0
      ? this.history.reduce((sum, r) => sum + r.duration_ms, 0) / this.history.length
      : 0;

    // Calculate most executed
    const executionCounts = new Map<string, number>();
    for (const r of this.history) {
      executionCounts.set(r.script_id, (executionCounts.get(r.script_id) || 0) + 1);
    }

    const mostExecuted = Array.from(executionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([script_id, count]) => ({ script_id, count }));

    return {
      scripts_available: scriptRegistry.size,
      queue: queueStatus,
      history: {
        total: this.history.length,
        success_count: successCount,
        failure_count: this.history.length - successCount,
        avg_duration_ms: Math.round(avgDuration)
      },
      most_executed: mostExecuted
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get all available script categories
   */
  getCategories(): ScriptCategory[] {
    const categories = new Set<ScriptCategory>();
    for (const script of scriptRegistry.all()) {
      categories.add(script.category);
    }
    return Array.from(categories);
  }

  /**
   * Get scripts by category
   */
  getByCategory(category: ScriptCategory): Script[] {
    return scriptRegistry.getByCategory(category);
  }

  /**
   * Search scripts
   */
  searchScripts(query: string, options?: { category?: ScriptCategory; language?: ScriptLanguage; limit?: number }): Script[] {
    const result = scriptRegistry.search({
      query,
      category: options?.category,
      language: options?.language,
      limit: options?.limit || 20
    });
    return result.scripts;
  }

  /**
   * Get script by ID
   */
  getScript(scriptId: string): Script | undefined {
    return scriptRegistry.getScript(scriptId);
  }

  /**
   * Get execution command for a script
   */
  getCommand(scriptId: string, params?: ExecutionParams): string | undefined {
    return scriptRegistry.getExecutionCommand(scriptId, params);
  }

  /**
   * Check if a script is destructive
   */
  isDestructive(scriptId: string): boolean {
    return DESTRUCTIVE_SCRIPTS.has(scriptId);
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.history = [];
    log.info("Execution history cleared");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const scriptExecutor = new ScriptExecutor();

// Types are already exported at their declarations above

// ============================================================================
// SOURCE FILE CATALOG — LOW-priority extracted JS modules targeting ScriptExecutor
// ============================================================================

export const SCRIPT_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  // ── extracted/engines/infrastructure/ (2 files) ─────────────────────────────

  PRISM_DB_MANAGER: {
    filename: "PRISM_DB_MANAGER.js",
    source_dir: "extracted/engines/infrastructure",
    category: "engines",
    lines: 258,
    safety_class: "LOW",
    description: "Database connection manager with pooling, migrations, and health checks",
  },
  PRISM_EVENT_MANAGER: {
    filename: "PRISM_EVENT_MANAGER.js",
    source_dir: "extracted/engines/infrastructure",
    category: "engines",
    lines: 106,
    safety_class: "LOW",
    description: "Event lifecycle manager: registration, dispatch, and handler cleanup",
  },

  // ── extracted/infrastructure/ (5 files) ─────────────────────────────────────

  PRISM_COMPARE: {
    filename: "PRISM_COMPARE.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 2198,
    safety_class: "LOW",
    description: "Deep comparison utilities for objects, arrays, and nested structures with diff output",
  },
  PRISM_EVENT_BUS: {
    filename: "PRISM_EVENT_BUS.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 154,
    safety_class: "LOW",
    description: "Original event bus implementation with pub/sub, wildcards, and replay support",
  },
  PRISM_GATEWAY: {
    filename: "PRISM_GATEWAY.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 111,
    safety_class: "LOW",
    description: "API gateway entry point for request routing and middleware chaining",
  },
  PRISM_STATE_STORE: {
    filename: "PRISM_STATE_STORE.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 221,
    safety_class: "LOW",
    description: "Persistent state store with snapshot, restore, and change-notification support",
  },
  PRISM_VALIDATOR: {
    filename: "PRISM_VALIDATOR.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 3369,
    safety_class: "LOW",
    description: "Comprehensive validation library for parameters, G-code, and configuration schemas",
  },
};

/**
 * Return the ScriptExecutor source-file catalog for audit and traceability.
 */
export function getScriptSourceFileCatalog(): typeof SCRIPT_SOURCE_FILE_CATALOG {
  return SCRIPT_SOURCE_FILE_CATALOG;
}
