/**
 * PRISM MCP Server - Agent Executor Engine
 * Multi-agent orchestration, task queue, and execution coordination
 * 
 * Features:
 * - Agent lifecycle management (create, execute, monitor, terminate)
 * - Task queue with priority scheduling
 * - Parallel and sequential execution modes
 * - Result aggregation and synthesis
 * - Error handling with retry logic
 * - Agent communication and handoff
 * - Execution history and analytics
 * 
 * SAFETY CRITICAL: Agents may control manufacturing processes.
 * All executions must be logged and traceable.
 */

import { log } from "../utils/Logger.js";
import { agentRegistry, type AgentDefinition } from "../registries/AgentRegistry.js";
import { hookRegistry } from "../registries/HookRegistry.js";
import { hookEngine } from "../orchestration/HookEngine.js";
import { getEffort } from "../config/effortTiers.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Task Status type definition.
 */
export type TaskStatus = "pending" | "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying";
/** Task Priority type definition.
 */
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";
/** Execution Mode type definition.
 */
export type ExecutionMode = "sequential" | "parallel" | "pipeline" | "swarm";

/** Task Definition configuration/data structure.
 */
export interface TaskDefinition {
  id: string;
  name: string;
  agentId: string;
  input: Record<string, unknown>;
  priority: TaskPriority;
  timeout_ms: number;
  retries: number;
  dependencies?: string[];        // Task IDs that must complete first
  metadata?: Record<string, unknown>;
}

/** Task Result configuration/data structure.
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  output?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration_ms?: number;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

/** Execution Plan configuration/data structure.
 */
export interface ExecutionPlan {
  id: string;
  name: string;
  mode: ExecutionMode;
  tasks: TaskDefinition[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: "draft" | "ready" | "running" | "completed" | "failed" | "cancelled";
  results: Map<string, TaskResult>;
  aggregatedOutput?: unknown;
}

/** Agent Session configuration/data structure.
 */
export interface AgentSession {
  id: string;
  agentId: string;
  agentName: string;
  status: "idle" | "busy" | "error" | "terminated";
  currentTaskId?: string;
  startTime: Date;
  lastActivity: Date;
  tasksCompleted: number;
  totalDuration_ms: number;
  errors: number;
}

/** Queue Stats configuration/data structure.
 */
export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalTasks: number;
  avgDuration_ms: number;
  throughput_per_min: number;
}

/** Execution Config configuration/data structure.
 */
export interface ExecutionConfig {
  maxConcurrent: number;
  defaultTimeout_ms: number;
  defaultRetries: number;
  retryDelay_ms: number;
  enableHooks: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ExecutionConfig = {
  maxConcurrent: 5,
  defaultTimeout_ms: 30000,
  defaultRetries: 2,
  retryDelay_ms: 1000,
  enableHooks: true,
  logLevel: "info"
};

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  background: 10
};

// ============================================================================
// AGENT EXECUTOR CLASS
// ============================================================================

/** Agent Executor engine/manager.
 */
export class AgentExecutor {
  private config: ExecutionConfig;
  private taskQueue: TaskDefinition[] = [];
  private runningTasks: Map<string, TaskDefinition> = new Map();
  private completedTasks: Map<string, TaskResult> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private plans: Map<string, ExecutionPlan> = new Map();
  private taskCounter: number = 0;
  private planCounter: number = 0;

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    log.info(`[AgentExecutor] Initialized with maxConcurrent=${this.config.maxConcurrent}`);
  }

  // ==========================================================================
  // TASK MANAGEMENT
  // ==========================================================================

  /**
   * Create a new task for execution
   */
  createTask(
    agentId: string,
    input: Record<string, unknown>,
    options: Partial<Omit<TaskDefinition, "id" | "agentId" | "input">> = {}
  ): TaskDefinition {
    const agent = agentRegistry.get(agentId);
    /** If.
     * @param !agent - !agent
     * @returns void
     */
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const task: TaskDefinition = {
      id: `task_${++this.taskCounter}_${Date.now()}`,
      name: options.name || `${agent.name} Task`,
      agentId,
      input,
      priority: options.priority || "normal",
      timeout_ms: options.timeout_ms || this.config.defaultTimeout_ms,
      retries: options.retries ?? this.config.defaultRetries,
      dependencies: options.dependencies,
      metadata: options.metadata
    };

    log.debug(`[AgentExecutor] Created task ${task.id} for agent ${agentId}`);
    return task;
  }

  /**
   * Queue a task for execution
   */
  queueTask(task: TaskDefinition): void {
    // Insert based on priority
    const weight = PRIORITY_WEIGHTS[task.priority];
    let insertIndex = this.taskQueue.length;

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < this.taskQueue.length; i++) {
      /** If.
       * @param PRIORITY_WEIGHTS[this.taskQueue[i].priority] - p r i o r i t y_ w e i g h t s[this.task queue[i].priority]
       * @returns void
       */
      if (PRIORITY_WEIGHTS[this.taskQueue[i].priority] < weight) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
    log.debug(`[AgentExecutor] Queued task ${task.id} at position ${insertIndex}`);

    // Fire hook
    /** If.
     * @param this.config.enableHooks - this.config.enable hooks
     * @returns void
     */
    if (this.config.enableHooks) {
      this.fireHook("task_queued", { task });
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task: TaskDefinition): Promise<TaskResult> {
    const startTime = new Date();
    let retryCount = 0;
    let lastError: string | undefined;

    // Move to running
    this.runningTasks.set(task.id, task);

    // Get or create session
    const session = this.getOrCreateSession(task.agentId);
    session.status = "busy";
    session.currentTaskId = task.id;
    session.lastActivity = new Date();

    // Fire pre-execution hook
    /** If.
     * @param this.config.enableHooks - this.config.enable hooks
     * @returns void
     */
    if (this.config.enableHooks) {
      this.fireHook("task_started", { task, session });
    }

    /** While.
     * @param retryCount - retry count
     * @returns void
     */
    while (retryCount <= task.retries) {
      try {
        log.info(`[AgentExecutor] Executing task ${task.id} (attempt ${retryCount + 1})`);

        // Execute agent with REAL Claude API (no simulation)
        const output = await this.executeAgentReal(task);

        // Success
        const endTime = new Date();
        const result: TaskResult = {
          taskId: task.id,
          agentId: task.agentId,
          status: "completed",
          output,
          startTime,
          endTime,
          duration_ms: endTime.getTime() - startTime.getTime(),
          retryCount
        };

        // Update tracking
        this.runningTasks.delete(task.id);
        this.completedTasks.set(task.id, result);
        session.status = "idle";
        session.currentTaskId = undefined;
        session.tasksCompleted++;
        session.totalDuration_ms += result.duration_ms ?? 0;
        session.lastActivity = new Date();

        // Fire completion hook
        /** If.
         * @param this.config.enableHooks - this.config.enable hooks
         * @returns void
         */
        if (this.config.enableHooks) {
          this.fireHook("task_completed", { task, result, session });
        }

        log.info(`[AgentExecutor] Task ${task.id} completed in ${result.duration_ms}ms`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retryCount++;

        /** If.
         * @param retryCount - retry count
         * @returns void
         */
        if (retryCount <= task.retries) {
          log.warn(`[AgentExecutor] Task ${task.id} failed, retrying (${retryCount}/${task.retries}): ${lastError}`);
          await this.delay(this.config.retryDelay_ms);
        }
      }
    }

    // All retries exhausted
    const endTime = new Date();
    const result: TaskResult = {
      taskId: task.id,
      agentId: task.agentId,
      status: "failed",
      error: lastError,
      startTime,
      endTime,
      duration_ms: endTime.getTime() - startTime.getTime(),
      retryCount: retryCount - 1
    };

    // Update tracking
    this.runningTasks.delete(task.id);
    this.completedTasks.set(task.id, result);
    session.status = "error";
    session.currentTaskId = undefined;
    session.errors++;
    session.lastActivity = new Date();

    // Fire failure hook
    /** If.
     * @param this.config.enableHooks - this.config.enable hooks
     * @returns void
     */
    if (this.config.enableHooks) {
      this.fireHook("task_failed", { task, result, session });
    }

    log.error(`[AgentExecutor] Task ${task.id} failed after ${retryCount} attempts: ${lastError}`);
    return result;
  }

  /**
   * Execute agent - REQUIRES real Claude API (no simulation mode)
   * SAFETY CRITICAL: Manufacturing decisions require real AI reasoning
   */
  private async executeAgentReal(task: TaskDefinition): Promise<unknown> {
    const agent = agentRegistry.get(task.agentId);
    /** If.
     * @param !agent - !agent
     * @returns void
     */
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentId}`);
    }

    // FREE-AI-MIGRATION: no Claude-key pre-gate -- executeWithClaudeAPI routes through the
    // Ollama-first free substrate (Claude is only the backup). "No simulation" is still ENFORCED
    // downstream: an offline result (no real provider) THROWS, never a simulated/stub agent run.
    return await this.executeWithClaudeAPI(task, agent);
  }

  /**
   * Execute agent through the shared FREE Ollama-first llmEngine substrate (Claude is the adaptive
   * backup). FREE-AI-MIGRATION/U-AGENT-EXECUTOR-LLM-ROUTE: was a direct PAID Anthropic SDK call
   * (client.messages.create). It is a single prompt->text call (no tools / no multi-turn), so it
   * maps cleanly onto llmEngine.query. complexity:"high" -- agent execution is non-trivial, so a
   * weak local answer escalates to the Claude backup. The agent's systemPrompt is preserved via the
   * `system` override.
   *
   * R12 (AgentExecutor's "no simulation" contract): an "offline" result means NO real provider
   * answered -- a generic stub, i.e. simulation -- so we THROW, never return mode:"live" on a stub.
   * `model`/`usage` report the REAL provider that answered (honest provenance; tokens are {0,0} on
   * the free local path). The agent `tier` is advisory now -- the provider is chosen by the ladder.
   */
  private async executeWithClaudeAPI(task: TaskDefinition, agent: AgentDefinition): Promise<unknown> {
    const tier = ((agent as unknown as Record<string, unknown>).tier as string)?.toLowerCase() || 'sonnet';

    // Build system prompt from agent definition
    const systemPrompt = this.buildAgentSystemPrompt(agent);

    // Build user message from task input
    const userMessage = this.buildTaskMessage(task);

    log.info(`[AgentExecutor] Routing agent ${agent.name} (tier ${tier}) through the free Ollama-first llmEngine`);
    const startTime = Date.now();

    try {
      const { llmEngine } = await import("./LLMEngine.js");
      const res = await llmEngine.query({
        prompt: userMessage,
        system: systemPrompt,
        complexity: "high",
        max_tokens: agent.config?.max_tokens || 4096,
        temperature: agent.config?.temperature || 0.3,
      });

      // R12: AgentExecutor forbids simulation. An "offline" result is a stub (no real provider),
      // not a real agent run -- fail loud rather than returning it as mode:"live".
      if (res.model === "offline") {
        throw new Error(
          `No AI provider available (Ollama down and no Claude backup key) for agent ${agent.name}. ` +
          `Simulation/stub output is DISABLED for safety-critical manufacturing -- failing loud.`
        );
      }

      const duration = Date.now() - startTime;
      log.info(`[AgentExecutor] Agent response received via ${res.model} in ${duration}ms`);

      return {
        agent: agent.name,
        category: agent.category,
        response: res.answer,
        model: res.model,
        usage: {
          inputTokens: res.tokens_used.input,
          outputTokens: res.tokens_used.output
        },
        processedAt: new Date().toISOString(),
        duration_ms: duration,
        mode: "live"
      };
    } catch (error) {
      log.error(`[AgentExecutor] Agent execution error: ${error}`);
      throw error;
    }
  }

  /**
   * Build system prompt from agent definition
   */
  private buildAgentSystemPrompt(agent: AgentDefinition): string {
    const behaviorSpec = (agent.behavior_spec || {}) as { role?: string; goals?: string[]; constraints?: string[]; output_format?: string };
    let prompt = `You are ${agent.name}, a PRISM Manufacturing Intelligence agent.\n\n`;
    
    prompt += `Role: ${behaviorSpec.role || agent.description || agent.name}\n\n`;
    
    /** If.
     * @param agent.capabilities?.length - agent.capabilities?.length
     * @returns void
     */
    if (agent.capabilities?.length) {
      prompt += `Capabilities:\n`;
      agent.capabilities.forEach(cap => {
        prompt += `- ${cap.name}: ${cap.description}\n`;
      });
      prompt += '\n';
    }

    /** If.
     * @param behaviorSpec.goals?.length - behavior spec.goals?.length
     * @returns void
     */
    if (behaviorSpec.goals?.length) {
      prompt += `Goals:\n`;
      behaviorSpec.goals.forEach((g: string) => prompt += `- ${g}\n`);
      prompt += '\n';
    }

    /** If.
     * @param behaviorSpec.constraints?.length - behavior spec.constraints?.length
     * @returns void
     */
    if (behaviorSpec.constraints?.length) {
      prompt += `Constraints:\n`;
      behaviorSpec.constraints.forEach((c: string) => prompt += `- ${c}\n`);
      prompt += '\n';
    }

    prompt += `Output Format: ${behaviorSpec.output_format || 'structured_json'}\n`;
    prompt += `\nIMPORTANT: This is safety-critical manufacturing software. Be precise, accurate, and cite sources where possible.`;

    return prompt;
  }

  /**
   * Build task message from input
   */
  private buildTaskMessage(task: TaskDefinition): string {
    let message = `Task: ${task.name}\n\n`;
    message += `Input:\n${JSON.stringify(task.input, null, 2)}\n\n`;
    message += `Please analyze and respond according to your role and capabilities.`;
    return message;
  }

  // ==========================================================================
  // EXECUTION PLANS
  // ==========================================================================

  /**
   * Create an execution plan for multiple tasks
   */
  createPlan(
    name: string,
    mode: ExecutionMode,
    tasks: TaskDefinition[]
  ): ExecutionPlan {
    const plan: ExecutionPlan = {
      id: `plan_${++this.planCounter}_${Date.now()}`,
      name,
      mode,
      tasks,
      createdAt: new Date(),
      status: "ready",
      results: new Map()
    };

    this.plans.set(plan.id, plan);
    log.info(`[AgentExecutor] Created plan ${plan.id} with ${tasks.length} tasks in ${mode} mode`);
    return plan;
  }

  /**
   * Execute an entire plan
   */
  async executePlan(planId: string): Promise<ExecutionPlan> {
    const plan = this.plans.get(planId);
    /** If.
     * @param !plan - !plan
     * @returns void
     */
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    /** If.
     * @param plan.status - plan.status
     * @returns void
     */
    if (plan.status === "running") {
      throw new Error(`Plan ${planId} is already running`);
    }

    plan.status = "running";
    plan.startedAt = new Date();

    // Fire plan started hook
    /** If.
     * @param this.config.enableHooks - this.config.enable hooks
     * @returns void
     */
    if (this.config.enableHooks) {
      this.fireHook("plan_started", { plan });
    }

    try {
      /** Switch.
       * @param plan.mode - plan.mode
       * @returns void
       */
      switch (plan.mode) {
        case "sequential":
          await this.executeSequential(plan);
          break;
        case "parallel":
          await this.executeParallel(plan);
          break;
        case "pipeline":
          await this.executePipeline(plan);
          break;
        case "swarm":
          await this.executeSwarm(plan);
          break;
        default:
          throw new Error(`Unknown execution mode: ${plan.mode}`);
      }

      // Aggregate results
      plan.aggregatedOutput = this.aggregateResults(plan);
      plan.status = this.allTasksSucceeded(plan) ? "completed" : "failed";
      plan.completedAt = new Date();

      // Fire plan completed hook
      /** If.
       * @param this.config.enableHooks - this.config.enable hooks
       * @returns void
       */
      if (this.config.enableHooks) {
        this.fireHook("plan_completed", { plan });
      }

      log.info(`[AgentExecutor] Plan ${planId} ${plan.status}`);
      return plan;

    } catch (error) {
      plan.status = "failed";
      plan.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(plan: ExecutionPlan): Promise<void> {
    for (const task of plan.tasks) {
      // Check dependencies
      /** If.
       * @param task.dependencies?.length - task.dependencies?.length
       * @returns void
       */
      if (task.dependencies?.length) {
        const unmet = task.dependencies.filter(depId => {
          const result = plan.results.get(depId);
          return !result || result.status !== "completed";
        });
        /** If.
         * @param unmet.length - unmet.length
         * @returns void
         */
        if (unmet.length > 0) {
          log.warn(`[AgentExecutor] Skipping task ${task.id} due to unmet dependencies: ${unmet.join(", ")}`);
          continue;
        }
      }

      const result = await this.executeTask(task);
      plan.results.set(task.id, result);

      // Stop on critical failure
      /** If.
       * @param result.status - result.status
       * @returns void
       */
      if (result.status === "failed" && task.priority === "critical") {
        log.error(`[AgentExecutor] Critical task failed, stopping plan`);
        break;
      }
    }
  }

  /**
   * Execute tasks in parallel
   */
  private async executeParallel(plan: ExecutionPlan): Promise<void> {
    // Group by dependencies
    const noDeps = plan.tasks.filter(t => !t.dependencies?.length);
    const withDeps = plan.tasks.filter(t => t.dependencies?.length);

    // Execute no-dependency tasks in parallel (respecting maxConcurrent)
    const batches = this.chunk(noDeps, this.config.maxConcurrent);
    /** For.
     * @param const - const
     * @returns void
     */
    for (const batch of batches) {
      const results = await Promise.all(batch.map(task => this.executeTask(task)));
      results.forEach((result, i) => plan.results.set(batch[i].id, result));
    }

    // Execute dependent tasks
    /** For.
     * @param const - const
     * @returns void
     */
    for (const task of withDeps) {
      const result = await this.executeTask(task);
      plan.results.set(task.id, result);
    }
  }

  /**
   * Execute tasks as a pipeline (output flows to next input)
   */
  private async executePipeline(plan: ExecutionPlan): Promise<void> {
    let previousOutput: unknown = undefined;

    /** For.
     * @param const - const
     * @returns void
     */
    for (const task of plan.tasks) {
      // Inject previous output into input
      /** If.
       * @param previousOutput - previous output
       * @returns void
       */
      if (previousOutput !== undefined) {
        task.input = { ...task.input, _pipelineInput: previousOutput };
      }

      const result = await this.executeTask(task);
      plan.results.set(task.id, result);

      /** If.
       * @param result.status - result.status
       * @returns void
       */
      if (result.status === "completed") {
        previousOutput = result.output;
      } else {
        log.error(`[AgentExecutor] Pipeline broken at task ${task.id}`);
        break;
      }
    }
  }

  /**
   * Execute tasks in swarm mode (competitive/collaborative)
   */
  private async executeSwarm(plan: ExecutionPlan): Promise<void> {
    // All tasks run in parallel, results are synthesized
    const results = await Promise.all(
      plan.tasks.map(task => this.executeTask(task))
    );

    results.forEach((result, i) => {
      plan.results.set(plan.tasks[i].id, result);
    });
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Get or create an agent session
   */
  private getOrCreateSession(agentId: string): AgentSession {
    let session = this.sessions.get(agentId);
    /** If.
     * @param !session - !session
     * @returns void
     */
    if (!session) {
      const agent = agentRegistry.get(agentId);
      session = {
        id: `session_${agentId}_${Date.now()}`,
        agentId,
        agentName: agent?.name || agentId,
        status: "idle",
        startTime: new Date(),
        lastActivity: new Date(),
        tasksCompleted: 0,
        totalDuration_ms: 0,
        errors: 0
      };
      this.sessions.set(agentId, session);
    }
    return session;
  }

  /**
   * Get all active sessions
   */
  getSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Terminate a session
   */
  terminateSession(agentId: string): boolean {
    const session = this.sessions.get(agentId);
    /** If.
     * @param session - session
     * @returns void
     */
    if (session) {
      session.status = "terminated";
      log.info(`[AgentExecutor] Terminated session for agent ${agentId}`);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // RESULT AGGREGATION
  // ==========================================================================

  /**
   * Aggregate results from a plan
   */
  private aggregateResults(plan: ExecutionPlan): Record<string, unknown> {
    const successful = Array.from(plan.results.values()).filter(r => r.status === "completed");
    const failed = Array.from(plan.results.values()).filter(r => r.status === "failed");

    const outputs = successful.map(r => r.output);
    const totalDuration = Array.from(plan.results.values())
      .reduce((sum, r) => sum + (r.duration_ms || 0), 0);

    return {
      summary: {
        totalTasks: plan.tasks.length,
        completed: successful.length,
        failed: failed.length,
        totalDuration_ms: totalDuration,
        avgDuration_ms: successful.length > 0 ? totalDuration / successful.length : 0
      },
      outputs,
      errors: failed.map(r => ({ taskId: r.taskId, error: r.error }))
    };
  }

  /**
   * Check if all tasks succeeded
   */
  private allTasksSucceeded(plan: ExecutionPlan): boolean {
    return Array.from(plan.results.values()).every(r => r.status === "completed");
  }

  // ==========================================================================
  // QUEUE STATISTICS
  // ==========================================================================

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const completed = Array.from(this.completedTasks.values());
    const successful = completed.filter(r => r.status === "completed");
    const totalDuration = successful.reduce((sum, r) => sum + (r.duration_ms || 0), 0);

    // Calculate throughput (simplified)
    const now = Date.now();
    const recentCompleted = successful.filter(r => 
      r.endTime && (now - r.endTime.getTime()) < 60000
    );

    return {
      pending: this.taskQueue.length,
      running: this.runningTasks.size,
      completed: successful.length,
      failed: completed.length - successful.length,
      totalTasks: this.taskCounter,
      avgDuration_ms: successful.length > 0 ? totalDuration / successful.length : 0,
      throughput_per_min: recentCompleted.length
    };
  }

  /**
   * Get task result
   */
  getTaskResult(taskId: string): TaskResult | undefined {
    return this.completedTasks.get(taskId);
  }

  /**
   * Get plan
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * List all plans
   */
  listPlans(): ExecutionPlan[] {
    return Array.from(this.plans.values());
  }

  // ==========================================================================
  // HOOKS
  // ==========================================================================

  /**
   * Fire a hook
   */
  private fireHook(event: string, data: Record<string, unknown>): void {
    const hookMap: Record<string, string> = {
      task_queued: "AGENT-BEFORE-SPAWN-001",
      task_started: "AGENT-AFTER-SPAWN-001",
      task_completed: "AGENT-ON-COMPLETE-001",
      task_failed: "AGENT-ON-ERROR-001",
      plan_started: "AGENT-BEFORE-SPAWN-001",
      plan_completed: "AGENT-ON-COMPLETE-001",
    };
    const hookId = hookMap[event];
    try {
      log.debug(`[AgentExecutor] Hook fired: ${event} → ${hookId ?? "unmapped"}`);
      /** If.
       * @param hookId - hook id
       * @returns void
       */
      if (hookId) {
        void hookEngine.executeHook(hookId, { event, ...data }).catch((err) => {
          log.warn(`[AgentExecutor] Hook ${hookId} error: ${err}`);
        });
      }
    } catch (error) {
      log.warn(`[AgentExecutor] Hook error: ${error}`);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Agent Executor constant.
 */
export const agentExecutor = new AgentExecutor();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick execute a single agent task
  * @param agentId - agent identifier
  * @param input - input data
  * @param options - configuration options
  * @returns promise resolving to task result
 */
export async function executeAgent(
  agentId: string,
  input: Record<string, unknown>,
  options?: Partial<Omit<TaskDefinition, "id" | "agentId" | "input">>
): Promise<TaskResult> {
  const task = agentExecutor.createTask(agentId, input, options);
  return agentExecutor.executeTask(task);
}

/**
 * Execute multiple agents in parallel
  * @param agents - agents
  * @returns promise resolving to task result[]
 */
export async function executeAgentsParallel(
  agents: Array<{ agentId: string; input: Record<string, unknown> }>
): Promise<TaskResult[]> {
  const tasks = agents.map(({ agentId, input }) => 
    agentExecutor.createTask(agentId, input)
  );
  
  const plan = agentExecutor.createPlan("Parallel Execution", "parallel", tasks);
  const result = await agentExecutor.executePlan(plan.id);
  
  return Array.from(result.results.values());
}

/**
 * Execute agents as a pipeline
  * @param agents - agents
  * @returns promise resolving to execution plan
 */
export async function executeAgentPipeline(
  agents: Array<{ agentId: string; input: Record<string, unknown> }>
): Promise<ExecutionPlan> {
  const tasks = agents.map(({ agentId, input }) => 
    agentExecutor.createTask(agentId, input)
  );
  
  const plan = agentExecutor.createPlan("Pipeline Execution", "pipeline", tasks);
  return agentExecutor.executePlan(plan.id);
}
