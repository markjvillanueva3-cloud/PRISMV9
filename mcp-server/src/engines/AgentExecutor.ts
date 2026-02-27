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
import Anthropic from "@anthropic-ai/sdk";
import { hasValidApiKey, getApiKey, getModelForTier } from "../config/api-config.js";
import { getEffort } from "../config/effortTiers.js";

// API client (initialized lazily)
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: getApiKey() });
  }
  return anthropicClient;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TaskStatus = "pending" | "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying";
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";
export type ExecutionMode = "sequential" | "parallel" | "pipeline" | "swarm";

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

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalTasks: number;
  avgDuration_ms: number;
  throughput_per_min: number;
}

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

    for (let i = 0; i < this.taskQueue.length; i++) {
      if (PRIORITY_WEIGHTS[this.taskQueue[i].priority] < weight) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
    log.debug(`[AgentExecutor] Queued task ${task.id} at position ${insertIndex}`);

    // Fire hook
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
    if (this.config.enableHooks) {
      this.fireHook("task_started", { task, session });
    }

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
        if (this.config.enableHooks) {
          this.fireHook("task_completed", { task, result, session });
        }

        log.info(`[AgentExecutor] Task ${task.id} completed in ${result.duration_ms}ms`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retryCount++;

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
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentId}`);
    }

    // ENFORCE real API execution - no simulation allowed
    if (!hasValidApiKey()) {
      throw new Error(
        `ANTHROPIC_API_KEY required for agent execution. ` +
        `Add key to claude_desktop_config.json env section. ` +
        `Simulation mode DISABLED for safety-critical manufacturing.`
      );
    }

    return await this.executeWithClaudeAPI(task, agent);
  }

  /**
   * Execute agent using Claude API
   */
  private async executeWithClaudeAPI(task: TaskDefinition, agent: AgentDefinition): Promise<unknown> {
    const client = getAnthropicClient();
    
    // Determine model based on agent tier
    const tier = (agent as any).tier?.toLowerCase() || 'sonnet';
    const model = getModelForTier(tier as 'opus' | 'sonnet' | 'haiku');

    // Build system prompt from agent definition
    const systemPrompt = this.buildAgentSystemPrompt(agent);
    
    // Build user message from task input
    const userMessage = this.buildTaskMessage(task);

    log.info(`[AgentExecutor] Calling Claude API (${model}) for agent ${agent.name}`);
    const startTime = Date.now();

    try {
      const response = await client.messages.create({
        model,
        max_tokens: (agent.config as any)?.max_tokens || 4096,
        temperature: (agent.config as any)?.temperature || 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      });

      const duration = Date.now() - startTime;
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      log.info(`[AgentExecutor] Claude API response received in ${duration}ms`);

      return {
        agent: agent.name,
        category: agent.category,
        response: textContent,
        model,
        usage: {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0
        },
        processedAt: new Date().toISOString(),
        duration_ms: duration,
        mode: "live"
      };
    } catch (error) {
      log.error(`[AgentExecutor] Claude API error: ${error}`);
      throw error;
    }
  }

  /**
   * Build system prompt from agent definition
   */
  private buildAgentSystemPrompt(agent: AgentDefinition): string {
    const behaviorSpec = (agent as any).behavior_spec || {};
    let prompt = `You are ${agent.name}, a PRISM Manufacturing Intelligence agent.\n\n`;
    
    prompt += `Role: ${behaviorSpec.role || agent.description || agent.name}\n\n`;
    
    if (agent.capabilities?.length) {
      prompt += `Capabilities:\n`;
      agent.capabilities.forEach(cap => {
        prompt += `- ${cap.name}: ${cap.description}\n`;
      });
      prompt += '\n';
    }

    if (behaviorSpec.goals?.length) {
      prompt += `Goals:\n`;
      behaviorSpec.goals.forEach((g: string) => prompt += `- ${g}\n`);
      prompt += '\n';
    }

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
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status === "running") {
      throw new Error(`Plan ${planId} is already running`);
    }

    plan.status = "running";
    plan.startedAt = new Date();

    // Fire plan started hook
    if (this.config.enableHooks) {
      this.fireHook("plan_started", { plan });
    }

    try {
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
      if (task.dependencies?.length) {
        const unmet = task.dependencies.filter(depId => {
          const result = plan.results.get(depId);
          return !result || result.status !== "completed";
        });
        if (unmet.length > 0) {
          log.warn(`[AgentExecutor] Skipping task ${task.id} due to unmet dependencies: ${unmet.join(", ")}`);
          continue;
        }
      }

      const result = await this.executeTask(task);
      plan.results.set(task.id, result);

      // Stop on critical failure
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
    for (const batch of batches) {
      const results = await Promise.all(batch.map(task => this.executeTask(task)));
      results.forEach((result, i) => plan.results.set(batch[i].id, result));
    }

    // Execute dependent tasks
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

    for (const task of plan.tasks) {
      // Inject previous output into input
      if (previousOutput !== undefined) {
        task.input = { ...task.input, _pipelineInput: previousOutput };
      }

      const result = await this.executeTask(task);
      plan.results.set(task.id, result);

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
    try {
      // Log hook execution (in real implementation, this would trigger actual hooks)
      log.debug(`[AgentExecutor] Hook fired: ${event}`);
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
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const agentExecutor = new AgentExecutor();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick execute a single agent task
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
