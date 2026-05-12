/**
 * AgentWorkflowEngine — Autonomous Manufacturing Workflow Execution
 * ==================================================================
 * Implements Agent SDK-style autonomous workflow execution for PRISM.
 * Enables complex manufacturing tasks to run with minimal human intervention
 * while maintaining safety guardrails and audit trails.
 *
 * Features:
 *   - Autonomous task decomposition
 *   - Self-healing workflow execution
 *   - Human-in-the-loop checkpoints for critical decisions
 *   - Cost/safety/quality scoring for auto-approval
 *   - Continuous learning from execution outcomes
 *
 * Workflow Types:
 *   - Quote-to-Ship: Full order lifecycle automation
 *   - Program-Generation: CAM programming with validation
 *   - Quality-Loop: Inspection and corrective action
 *   - Optimization: Parameter tuning with live feedback
 *
 * @module engines/AgentWorkflowEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  longHorizonPlanningEngine,
  type PlanningGoal,
  type ExecutionPlan,
  type PlanStep,
} from "./LongHorizonPlanningEngine.js";
import {
  multiAgentCoordinatorEngine,
  type CoordinationRequest,
  type CoordinationResult,
} from "./MultiAgentCoordinatorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Workflow definition */
export interface WorkflowDefinition {
  workflow_id: string;
  name: string;
  description: string;
  type: "quote_to_ship" | "program_generation" | "quality_loop" | "optimization" | "custom";
  triggers: WorkflowTrigger[];
  steps: WorkflowStepDefinition[];
  checkpoints: CheckpointDefinition[];
  timeout_ms: number;
  auto_approval_threshold: number;  // 0-1, actions below this need human approval
  max_retries: number;
}

/** Trigger conditions for workflow */
export interface WorkflowTrigger {
  type: "manual" | "schedule" | "event" | "condition";
  config: Record<string, unknown>;
}

/** Step definition in workflow */
export interface WorkflowStepDefinition {
  step_id: string;
  name: string;
  type: "action" | "decision" | "human_review" | "parallel" | "loop";
  action?: string;
  action_params?: Record<string, unknown>;
  condition?: string;
  loop_config?: {
    max_iterations: number;
    exit_condition: string;
  };
  parallel_steps?: string[];
  required_agents?: string[];
  auto_approve: boolean;
  timeout_ms?: number;
  on_failure: "retry" | "skip" | "abort" | "human_review";
  depends_on: string[];
}

/** Checkpoint requiring human approval */
export interface CheckpointDefinition {
  checkpoint_id: string;
  after_step: string;
  approval_required: boolean;
  approval_criteria: string[];
  notification_channel?: string;
}

/** Workflow instance (running or completed) */
export interface WorkflowInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: "queued" | "running" | "paused" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  current_step?: string;
  step_results: Map<string, StepResult>;
  plan?: ExecutionPlan;
  coordination_results: CoordinationResult[];
  approval_requests: ApprovalRequest[];
  audit_log: AuditEntry[];
  context: Record<string, unknown>;
  metrics: WorkflowMetrics;
}

/** Result of a workflow step */
export interface StepResult {
  step_id: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "awaiting_approval";
  started_at?: string;
  completed_at?: string;
  output?: unknown;
  error?: string;
  retries: number;
  duration_ms?: number;
  agent_results?: CoordinationResult;
  approval?: ApprovalResult;
}

/** Approval request for human review */
export interface ApprovalRequest {
  request_id: string;
  step_id: string;
  type: "checkpoint" | "high_risk" | "budget_exceeded" | "quality_concern";
  description: string;
  data: Record<string, unknown>;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "timeout";
  approver?: string;
  decision_at?: string;
  notes?: string;
}

/** Result of an approval decision */
export interface ApprovalResult {
  approved: boolean;
  approver: string;
  decision_at: string;
  notes?: string;
  modifications?: Record<string, unknown>;
}

/** Audit log entry */
export interface AuditEntry {
  timestamp: string;
  event: string;
  step_id?: string;
  details: Record<string, unknown>;
  actor: "system" | "human" | "agent";
}

/** Workflow execution metrics */
export interface WorkflowMetrics {
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  total_duration_ms: number;
  agent_coordination_count: number;
  human_approvals_requested: number;
  human_approvals_received: number;
  retries_total: number;
  estimated_cost: number;
  actual_cost: number;
}

/** Workflow execution options */
export interface ExecutionOptions {
  dry_run?: boolean;
  skip_approvals?: boolean;
  max_parallel?: number;
  notification_callback?: (event: AuditEntry) => void;
  approval_callback?: (request: ApprovalRequest) => Promise<ApprovalResult>;
}

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

const WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
  {
    workflow_id: "quote-to-ship",
    name: "Quote to Ship",
    description: "Complete order lifecycle from quote to delivery",
    type: "quote_to_ship",
    triggers: [{ type: "manual", config: {} }],
    steps: [
      {
        step_id: "receive-rfq",
        name: "Receive RFQ",
        type: "action",
        action: "process_rfq",
        auto_approve: true,
        on_failure: "abort",
        depends_on: [],
      },
      {
        step_id: "analyze-part",
        name: "Analyze Part",
        type: "action",
        action: "analyze_part_geometry",
        required_agents: ["physics", "materials", "tooling"],
        auto_approve: true,
        on_failure: "human_review",
        depends_on: ["receive-rfq"],
      },
      {
        step_id: "generate-quote",
        name: "Generate Quote",
        type: "action",
        action: "generate_quote",
        required_agents: ["costing", "planning"],
        auto_approve: false,
        on_failure: "human_review",
        depends_on: ["analyze-part"],
      },
      {
        step_id: "await-approval",
        name: "Quote Approval",
        type: "human_review",
        auto_approve: false,
        on_failure: "abort",
        depends_on: ["generate-quote"],
      },
      {
        step_id: "schedule-job",
        name: "Schedule Production",
        type: "action",
        action: "schedule_production",
        required_agents: ["planning"],
        auto_approve: true,
        on_failure: "retry",
        depends_on: ["await-approval"],
      },
      {
        step_id: "generate-programs",
        name: "Generate NC Programs",
        type: "action",
        action: "generate_programs",
        required_agents: ["cam", "physics", "quality"],
        auto_approve: false,
        on_failure: "human_review",
        depends_on: ["schedule-job"],
      },
      {
        step_id: "production",
        name: "Production Execution",
        type: "action",
        action: "execute_production",
        auto_approve: true,
        on_failure: "human_review",
        depends_on: ["generate-programs"],
      },
      {
        step_id: "inspection",
        name: "Final Inspection",
        type: "action",
        action: "final_inspection",
        required_agents: ["quality"],
        auto_approve: true,
        on_failure: "human_review",
        depends_on: ["production"],
      },
      {
        step_id: "ship",
        name: "Ship Order",
        type: "action",
        action: "ship_order",
        auto_approve: true,
        on_failure: "human_review",
        depends_on: ["inspection"],
      },
    ],
    checkpoints: [
      {
        checkpoint_id: "quote-review",
        after_step: "generate-quote",
        approval_required: true,
        approval_criteria: ["Quote accuracy verified", "Margins acceptable"],
      },
      {
        checkpoint_id: "program-review",
        after_step: "generate-programs",
        approval_required: true,
        approval_criteria: ["Programs verified", "Safety checks passed"],
      },
    ],
    timeout_ms: 86400000,  // 24 hours
    auto_approval_threshold: 0.85,
    max_retries: 3,
  },
  {
    workflow_id: "program-generation",
    name: "Automated Program Generation",
    description: "Generate and validate NC programs from part geometry",
    type: "program_generation",
    triggers: [{ type: "event", config: { event: "new_part" } }],
    steps: [
      {
        step_id: "analyze-geometry",
        name: "Analyze Geometry",
        type: "action",
        action: "analyze_geometry",
        required_agents: ["physics", "cam"],
        auto_approve: true,
        on_failure: "abort",
        depends_on: [],
      },
      {
        step_id: "select-strategy",
        name: "Select Machining Strategy",
        type: "decision",
        action: "select_strategy",
        required_agents: ["cam", "optimization"],
        auto_approve: true,
        on_failure: "human_review",
        depends_on: ["analyze-geometry"],
      },
      {
        step_id: "generate-toolpath",
        name: "Generate Toolpath",
        type: "action",
        action: "generate_toolpath",
        required_agents: ["cam"],
        auto_approve: true,
        on_failure: "retry",
        depends_on: ["select-strategy"],
      },
      {
        step_id: "optimize-params",
        name: "Optimize Parameters",
        type: "action",
        action: "optimize_parameters",
        required_agents: ["physics", "optimization", "safety"],
        auto_approve: true,
        on_failure: "retry",
        depends_on: ["generate-toolpath"],
      },
      {
        step_id: "simulate",
        name: "Simulate Program",
        type: "action",
        action: "simulate_program",
        required_agents: ["safety"],
        auto_approve: false,
        on_failure: "human_review",
        depends_on: ["optimize-params"],
      },
      {
        step_id: "post-process",
        name: "Post Process",
        type: "action",
        action: "post_process",
        auto_approve: true,
        on_failure: "retry",
        depends_on: ["simulate"],
      },
    ],
    checkpoints: [
      {
        checkpoint_id: "simulation-review",
        after_step: "simulate",
        approval_required: true,
        approval_criteria: ["No collisions", "Cycle time acceptable"],
      },
    ],
    timeout_ms: 3600000,  // 1 hour
    auto_approval_threshold: 0.90,
    max_retries: 3,
  },
  {
    workflow_id: "optimization-loop",
    name: "Parameter Optimization Loop",
    description: "Iteratively optimize cutting parameters based on feedback",
    type: "optimization",
    triggers: [{ type: "manual", config: {} }],
    steps: [
      {
        step_id: "collect-baseline",
        name: "Collect Baseline",
        type: "action",
        action: "collect_baseline_data",
        required_agents: ["physics", "quality"],
        auto_approve: true,
        on_failure: "abort",
        depends_on: [],
      },
      {
        step_id: "optimization-loop",
        name: "Optimization Iterations",
        type: "loop",
        action: "run_optimization_iteration",
        loop_config: {
          max_iterations: 10,
          exit_condition: "improvement < 1% OR iterations >= 10",
        },
        required_agents: ["optimization", "physics"],
        auto_approve: true,
        on_failure: "skip",
        depends_on: ["collect-baseline"],
      },
      {
        step_id: "validate-results",
        name: "Validate Results",
        type: "action",
        action: "validate_optimization",
        required_agents: ["quality", "safety"],
        auto_approve: false,
        on_failure: "human_review",
        depends_on: ["optimization-loop"],
      },
      {
        step_id: "apply-params",
        name: "Apply Parameters",
        type: "action",
        action: "apply_optimized_params",
        auto_approve: false,
        on_failure: "human_review",
        depends_on: ["validate-results"],
      },
    ],
    checkpoints: [
      {
        checkpoint_id: "optimization-review",
        after_step: "validate-results",
        approval_required: true,
        approval_criteria: ["Safety score > 0.85", "Improvement significant"],
      },
    ],
    timeout_ms: 7200000,  // 2 hours
    auto_approval_threshold: 0.88,
    max_retries: 2,
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class AgentWorkflowEngine {
  private readonly engineName = "AgentWorkflowEngine";
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private completedInstances: WorkflowInstance[] = [];

  constructor() {
    this.loadTemplates();
  }

  /** Load workflow templates */
  private loadTemplates(): void {
    for (const template of WORKFLOW_TEMPLATES) {
      this.workflows.set(template.workflow_id, template);
    }
    log.info(`[${this.engineName}] Loaded ${this.workflows.size} workflow templates`);
  }

  /** Get available workflows */
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /** Get workflow by ID */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /** Register a custom workflow */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.workflow_id, workflow);
    log.info(`[${this.engineName}] Registered workflow: ${workflow.name}`);
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  /**
   * Start a workflow execution.
   */
  async startWorkflow(
    workflowId: string,
    context: Record<string, unknown>,
    options: ExecutionOptions = {}
  ): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instanceId = `wf-${workflowId}-${Date.now()}`;

    const instance: WorkflowInstance = {
      instance_id: instanceId,
      workflow_id: workflowId,
      workflow_name: workflow.name,
      status: "running",
      started_at: new Date().toISOString(),
      step_results: new Map(),
      coordination_results: [],
      approval_requests: [],
      audit_log: [],
      context,
      metrics: {
        total_steps: workflow.steps.length,
        completed_steps: 0,
        failed_steps: 0,
        skipped_steps: 0,
        total_duration_ms: 0,
        agent_coordination_count: 0,
        human_approvals_requested: 0,
        human_approvals_received: 0,
        retries_total: 0,
        estimated_cost: 0,
        actual_cost: 0,
      },
    };

    // Create long-horizon plan
    const goal: PlanningGoal = {
      goal_id: instanceId,
      type: workflow.type === "quote_to_ship" ? "quote" :
            workflow.type === "program_generation" ? "machining" : "production",
      description: workflow.description,
      priority: "high",
      success_criteria: workflow.steps.map(s => `Complete: ${s.name}`),
      context,
    };
    instance.plan = longHorizonPlanningEngine.createPlan(goal);

    this.instances.set(instanceId, instance);

    this.logAudit(instance, "workflow_started", {
      workflow_id: workflowId,
      context_keys: Object.keys(context),
    });

    // Execute workflow
    if (!options.dry_run) {
      await this.executeWorkflow(instance, workflow, options);
    }

    return instance;
  }

  /** Execute workflow steps */
  private async executeWorkflow(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    options: ExecutionOptions
  ): Promise<void> {
    const startTime = Date.now();

    try {
      for (const stepDef of workflow.steps) {
        // Check dependencies
        const depsComplete = stepDef.depends_on.every(depId => {
          const depResult = instance.step_results.get(depId);
          return depResult?.status === "completed" || depResult?.status === "skipped";
        });

        if (!depsComplete) {
          // Skip if dependencies not met
          instance.step_results.set(stepDef.step_id, {
            step_id: stepDef.step_id,
            status: "skipped",
            retries: 0,
            error: "Dependencies not met",
          });
          instance.metrics.skipped_steps++;
          continue;
        }

        // Check for timeout
        if (Date.now() - startTime > workflow.timeout_ms) {
          instance.status = "failed";
          this.logAudit(instance, "workflow_timeout", { elapsed_ms: Date.now() - startTime });
          break;
        }

        // Execute step
        instance.current_step = stepDef.step_id;
        const result = await this.executeStep(instance, stepDef, workflow, options);
        instance.step_results.set(stepDef.step_id, result);

        // Update metrics
        if (result.status === "completed") {
          instance.metrics.completed_steps++;
        } else if (result.status === "failed") {
          instance.metrics.failed_steps++;
          if (stepDef.on_failure === "abort") {
            instance.status = "failed";
            break;
          }
        } else if (result.status === "skipped") {
          instance.metrics.skipped_steps++;
        } else if (result.status === "awaiting_approval") {
          instance.status = "awaiting_approval";
          // In real implementation, would wait for approval callback
        }

        // Check for checkpoint
        const checkpoint = workflow.checkpoints.find(c => c.after_step === stepDef.step_id);
        if (checkpoint && checkpoint.approval_required && !options.skip_approvals) {
          await this.handleCheckpoint(instance, checkpoint, stepDef, options);
        }
      }

      // Finalize
      if (instance.status === "running") {
        instance.status = "completed";
      }

    } catch (error) {
      instance.status = "failed";
      this.logAudit(instance, "workflow_error", { error: String(error) });
    }

    instance.completed_at = new Date().toISOString();
    instance.metrics.total_duration_ms = Date.now() - startTime;
    instance.current_step = undefined;

    this.logAudit(instance, "workflow_completed", {
      status: instance.status,
      metrics: instance.metrics,
    });

    // Move to completed
    this.completedInstances.push(instance);
  }

  /** Execute a single step */
  private async executeStep(
    instance: WorkflowInstance,
    stepDef: WorkflowStepDefinition,
    workflow: WorkflowDefinition,
    options: ExecutionOptions
  ): Promise<StepResult> {
    const startTime = Date.now();

    this.logAudit(instance, "step_started", { step_id: stepDef.step_id, step_name: stepDef.name });

    const result: StepResult = {
      step_id: stepDef.step_id,
      status: "running",
      started_at: new Date().toISOString(),
      retries: 0,
    };

    try {
      // Human review step
      if (stepDef.type === "human_review") {
        const approvalRequest = this.createApprovalRequest(instance, stepDef, "checkpoint");
        instance.approval_requests.push(approvalRequest);
        instance.metrics.human_approvals_requested++;

        if (options.approval_callback) {
          const approval = await options.approval_callback(approvalRequest);
          result.approval = approval;
          result.status = approval.approved ? "completed" : "failed";
          instance.metrics.human_approvals_received++;
        } else {
          result.status = "awaiting_approval";
        }
      }
      // Loop step
      else if (stepDef.type === "loop" && stepDef.loop_config) {
        let iteration = 0;
        let shouldContinue = true;

        while (shouldContinue && iteration < stepDef.loop_config.max_iterations) {
          const iterResult = await this.executeAction(instance, stepDef, iteration);
          iteration++;

          // Check exit condition (simplified)
          if (iterResult.improvement !== undefined && iterResult.improvement < 0.01) {
            shouldContinue = false;
          }
        }

        result.output = { iterations: iteration };
        result.status = "completed";
      }
      // Action or decision step
      else {
        // Coordinate agents if required
        if (stepDef.required_agents && stepDef.required_agents.length > 0) {
          const coordRequest: CoordinationRequest = {
            request_id: `${instance.instance_id}-${stepDef.step_id}`,
            task: {
              task_id: stepDef.step_id,
              description: stepDef.name,
              input: { ...instance.context, ...stepDef.action_params },
              required_capabilities: [],
              priority: "high",
            },
            pattern: "parallel",
            required_agents: stepDef.required_agents as any,
            context: instance.context,
          };

          const coordResult = await multiAgentCoordinatorEngine.coordinate(coordRequest);
          instance.coordination_results.push(coordResult);
          instance.metrics.agent_coordination_count++;

          result.agent_results = coordResult;
          result.output = coordResult.synthesized_output;

          // Check if auto-approve based on confidence
          if (!stepDef.auto_approve && coordResult.confidence < workflow.auto_approval_threshold) {
            const approvalRequest = this.createApprovalRequest(instance, stepDef, "high_risk");
            approvalRequest.data = { confidence: coordResult.confidence, output: result.output };
            instance.approval_requests.push(approvalRequest);
            instance.metrics.human_approvals_requested++;

            if (options.approval_callback) {
              const approval = await options.approval_callback(approvalRequest);
              result.approval = approval;
              if (!approval.approved) {
                result.status = "failed";
                result.error = "Approval rejected";
              } else {
                result.status = "completed";
                instance.metrics.human_approvals_received++;
              }
            } else {
              result.status = "awaiting_approval";
            }
          } else {
            result.status = coordResult.status === "success" ? "completed" : "failed";
          }
        } else {
          // Simple action without agent coordination
          result.output = await this.executeAction(instance, stepDef);
          result.status = "completed";
        }
      }

    } catch (error) {
      result.error = String(error);

      // Handle failure based on policy
      if (stepDef.on_failure === "retry" && result.retries < workflow.max_retries) {
        result.retries++;
        instance.metrics.retries_total++;
        return this.executeStep(instance, stepDef, workflow, options);
      }

      result.status = "failed";
    }

    result.completed_at = new Date().toISOString();
    result.duration_ms = Date.now() - startTime;

    this.logAudit(instance, "step_completed", {
      step_id: stepDef.step_id,
      status: result.status,
      duration_ms: result.duration_ms,
    });

    if (options.notification_callback) {
      options.notification_callback({
        timestamp: result.completed_at,
        event: "step_completed",
        step_id: stepDef.step_id,
        details: { status: result.status },
        actor: "system",
      });
    }

    return result;
  }

  /** Execute an action (simulated for now) */
  private async executeAction(
    instance: WorkflowInstance,
    stepDef: WorkflowStepDefinition,
    iteration?: number
  ): Promise<Record<string, unknown>> {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      action: stepDef.action,
      params: stepDef.action_params,
      iteration,
      timestamp: new Date().toISOString(),
      success: true,
      improvement: iteration !== undefined ? Math.random() * 0.1 : undefined,
    };
  }

  /** Handle checkpoint */
  private async handleCheckpoint(
    instance: WorkflowInstance,
    checkpoint: CheckpointDefinition,
    stepDef: WorkflowStepDefinition,
    options: ExecutionOptions
  ): Promise<void> {
    this.logAudit(instance, "checkpoint_reached", { checkpoint_id: checkpoint.checkpoint_id });

    const approvalRequest = this.createApprovalRequest(instance, stepDef, "checkpoint");
    approvalRequest.data = {
      checkpoint_id: checkpoint.checkpoint_id,
      criteria: checkpoint.approval_criteria,
      step_output: instance.step_results.get(stepDef.step_id)?.output,
    };

    instance.approval_requests.push(approvalRequest);
    instance.metrics.human_approvals_requested++;

    if (options.approval_callback) {
      const approval = await options.approval_callback(approvalRequest);
      if (!approval.approved) {
        instance.status = "failed";
        this.logAudit(instance, "checkpoint_rejected", { checkpoint_id: checkpoint.checkpoint_id });
      } else {
        instance.metrics.human_approvals_received++;
        this.logAudit(instance, "checkpoint_approved", { checkpoint_id: checkpoint.checkpoint_id });
      }
    } else {
      instance.status = "awaiting_approval";
    }
  }

  /** Create an approval request */
  private createApprovalRequest(
    instance: WorkflowInstance,
    stepDef: WorkflowStepDefinition,
    type: ApprovalRequest["type"]
  ): ApprovalRequest {
    return {
      request_id: `approval-${instance.instance_id}-${stepDef.step_id}-${Date.now()}`,
      step_id: stepDef.step_id,
      type,
      description: `Approval required for: ${stepDef.name}`,
      data: {},
      created_at: new Date().toISOString(),
      status: "pending",
    };
  }

  /** Log audit entry */
  private logAudit(
    instance: WorkflowInstance,
    event: string,
    details: Record<string, unknown>
  ): void {
    instance.audit_log.push({
      timestamp: new Date().toISOString(),
      event,
      step_id: instance.current_step,
      details,
      actor: "system",
    });
  }

  // ============================================================================
  // INSTANCE MANAGEMENT
  // ============================================================================

  /** Get running instance */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /** Get all running instances */
  getRunningInstances(): WorkflowInstance[] {
    return Array.from(this.instances.values())
      .filter(i => i.status === "running" || i.status === "paused" || i.status === "awaiting_approval");
  }

  /** Get completed instances */
  getCompletedInstances(): WorkflowInstance[] {
    return [...this.completedInstances];
  }

  /** Cancel a workflow instance */
  cancelInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    instance.status = "cancelled";
    instance.completed_at = new Date().toISOString();
    this.logAudit(instance, "workflow_cancelled", {});
    this.completedInstances.push(instance);
    this.instances.delete(instanceId);

    return true;
  }

  /** Pause a workflow instance */
  pauseInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== "running") return false;

    instance.status = "paused";
    this.logAudit(instance, "workflow_paused", {});

    return true;
  }

  /** Resume a paused workflow */
  async resumeInstance(
    instanceId: string,
    options: ExecutionOptions = {}
  ): Promise<WorkflowInstance | undefined> {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== "paused") return undefined;

    const workflow = this.workflows.get(instance.workflow_id);
    if (!workflow) return undefined;

    instance.status = "running";
    this.logAudit(instance, "workflow_resumed", {});

    // Continue execution from current point
    await this.executeWorkflow(instance, workflow, options);

    return instance;
  }

  /** Approve a pending approval request */
  async approveRequest(
    instanceId: string,
    requestId: string,
    approved: boolean,
    approver: string,
    notes?: string
  ): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const request = instance.approval_requests.find(r => r.request_id === requestId);
    if (!request || request.status !== "pending") return false;

    request.status = approved ? "approved" : "rejected";
    request.approver = approver;
    request.decision_at = new Date().toISOString();
    request.notes = notes;

    instance.metrics.human_approvals_received++;

    this.logAudit(instance, approved ? "approval_granted" : "approval_rejected", {
      request_id: requestId,
      approver,
    });

    // Update step result
    const stepResult = instance.step_results.get(request.step_id);
    if (stepResult && stepResult.status === "awaiting_approval") {
      stepResult.status = approved ? "completed" : "failed";
      stepResult.approval = {
        approved,
        approver,
        decision_at: request.decision_at,
        notes,
      };
    }

    // Resume if workflow was waiting
    if (instance.status === "awaiting_approval" && approved) {
      const workflow = this.workflows.get(instance.workflow_id);
      if (workflow) {
        instance.status = "running";
        await this.executeWorkflow(instance, workflow, {});
      }
    }

    return true;
  }

  // ============================================================================
  // LEARNING & ANALYSIS
  // ============================================================================

  /** Analyze workflow performance */
  analyzePerformance(workflowId: string): {
    total_executions: number;
    success_rate: number;
    avg_duration_ms: number;
    common_failures: Array<{ step: string; count: number }>;
    approval_bottlenecks: Array<{ checkpoint: string; avg_wait_ms: number }>;
  } {
    const completed = this.completedInstances.filter(i => i.workflow_id === workflowId);

    if (completed.length === 0) {
      return {
        total_executions: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        common_failures: [],
        approval_bottlenecks: [],
      };
    }

    const successful = completed.filter(i => i.status === "completed");
    const successRate = successful.length / completed.length;

    const totalDuration = completed.reduce((sum, i) => sum + i.metrics.total_duration_ms, 0);
    const avgDuration = totalDuration / completed.length;

    // Analyze failures
    const failureCounts = new Map<string, number>();
    for (const instance of completed.filter(i => i.status === "failed")) {
      for (const [stepId, result] of instance.step_results) {
        if (result.status === "failed") {
          failureCounts.set(stepId, (failureCounts.get(stepId) || 0) + 1);
        }
      }
    }

    const commonFailures = [...failureCounts.entries()]
      .map(([step, count]) => ({ step, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_executions: completed.length,
      success_rate: successRate,
      avg_duration_ms: avgDuration,
      common_failures: commonFailures,
      approval_bottlenecks: [],  // Would analyze approval wait times
    };
  }

  /** Clear completed instances (for testing) */
  clearCompleted(): void {
    this.completedInstances = [];
  }
}

export const agentWorkflowEngine = new AgentWorkflowEngine();
