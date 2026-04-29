/**
 * LongHorizonPlanningEngine — LLM-INTEL Extended Reasoning
 *
 * Plans complex, multi-step manufacturing tasks that span hours, days, or weeks.
 * Handles:
 *   - Quote-to-ship workflows
 *   - Multi-part production sequences
 *   - Complex machining jobs with multiple operations
 *   - Resource scheduling and optimization
 *   - Checkpoint-based execution with rollback
 *
 * @module engines/LongHorizonPlanningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Planning goal */
export interface PlanningGoal {
  goal_id: string;
  type: "quote" | "production" | "machining" | "assembly" | "quality" | "delivery";
  description: string;
  target_date?: string;
  priority: "low" | "medium" | "high" | "critical";
  constraints?: GoalConstraint[];
  success_criteria: string[];
  context?: Record<string, unknown>;
}

/** Goal constraint */
export interface GoalConstraint {
  type: "budget" | "time" | "resource" | "quality" | "safety";
  description: string;
  value?: number;
  unit?: string;
  hard_limit: boolean;
}

/** Plan step */
export interface PlanStep {
  step_id: string;
  name: string;
  description: string;
  type: "action" | "decision" | "checkpoint" | "parallel" | "conditional";
  action?: string;
  action_params?: Record<string, unknown>;
  estimated_duration_min?: number;
  dependencies: string[];  // step_ids that must complete first
  status: "pending" | "ready" | "in_progress" | "completed" | "failed" | "skipped";
  output?: unknown;
  started_at?: string;
  completed_at?: string;
  error?: string;
  checkpoint?: PlanCheckpoint;
  condition?: {
    expression: string;
    if_true_step?: string;
    if_false_step?: string;
  };
  parallel_steps?: string[];  // For parallel type
}

/** Checkpoint for rollback */
export interface PlanCheckpoint {
  checkpoint_id: string;
  step_id: string;
  state_snapshot: Record<string, unknown>;
  created_at: string;
  can_rollback: boolean;
  rollback_instructions?: string;
}

/** Execution plan */
export interface ExecutionPlan {
  plan_id: string;
  goal: PlanningGoal;
  steps: PlanStep[];
  status: "draft" | "validated" | "executing" | "paused" | "completed" | "failed" | "cancelled";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  current_step_id?: string;
  progress_pct: number;
  estimated_total_min: number;
  actual_elapsed_min: number;
  checkpoints: PlanCheckpoint[];
  decision_log: PlanDecision[];
  risks: PlanRisk[];
  ai_reasoning?: PlanAIReasoning;
}

/** Planning decision */
export interface PlanDecision {
  decision_id: string;
  step_id: string;
  question: string;
  options: Array<{ option: string; rationale: string; confidence: number }>;
  selected_option: string;
  rationale: string;
  timestamp: string;
}

/** Plan risk */
export interface PlanRisk {
  risk_id: string;
  description: string;
  probability: number;
  impact: "low" | "medium" | "high" | "critical";
  mitigation?: string;
  affected_steps: string[];
  status: "identified" | "mitigated" | "accepted" | "occurred";
}

/** AI reasoning for planning */
export interface PlanAIReasoning {
  plan_summary: string;
  key_decisions: string[];
  risk_assessment: string;
  optimization_notes: string[];
  alternative_approaches: Array<{
    approach: string;
    pros: string[];
    cons: string[];
    why_not_chosen: string;
  }>;
  confidence: number;
  assumptions: string[];
  open_questions: string[];
}

/** Plan template */
export interface PlanTemplate {
  template_id: string;
  name: string;
  description: string;
  goal_type: PlanningGoal["type"];
  steps: Omit<PlanStep, "step_id" | "status" | "output">[];
  estimated_duration_min: number;
  tags: string[];
}

/** Plan execution result */
export interface PlanExecutionResult {
  plan_id: string;
  status: ExecutionPlan["status"];
  steps_completed: number;
  steps_total: number;
  duration_min: number;
  outputs: Record<string, unknown>;
  decisions_made: number;
  checkpoints_created: number;
  rollbacks_performed: number;
  final_outcome: string;
}

// ============================================================================
// PLAN TEMPLATES
// ============================================================================

const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    template_id: "quote-to-ship",
    name: "Quote to Ship",
    description: "Complete workflow from customer quote to delivery",
    goal_type: "production",
    steps: [
      {
        name: "Analyze RFQ",
        description: "Review customer requirements and specifications",
        type: "action",
        action: "analyze_rfq",
        estimated_duration_min: 30,
        dependencies: [],
      },
      {
        name: "Material Selection",
        description: "Select appropriate material based on requirements",
        type: "action",
        action: "select_material",
        estimated_duration_min: 15,
        dependencies: ["step-1"],
      },
      {
        name: "Process Planning",
        description: "Develop machining process plan",
        type: "action",
        action: "create_process_plan",
        estimated_duration_min: 60,
        dependencies: ["step-2"],
      },
      {
        name: "Cost Estimation",
        description: "Calculate material, labor, and overhead costs",
        type: "action",
        action: "estimate_costs",
        estimated_duration_min: 30,
        dependencies: ["step-3"],
      },
      {
        name: "Quote Generation",
        description: "Generate formal quote for customer",
        type: "checkpoint",
        action: "generate_quote",
        estimated_duration_min: 15,
        dependencies: ["step-4"],
      },
      {
        name: "Customer Approval",
        description: "Wait for customer approval of quote",
        type: "decision",
        estimated_duration_min: 1440, // 24 hours
        dependencies: ["step-5"],
      },
      {
        name: "Material Procurement",
        description: "Order required materials",
        type: "action",
        action: "procure_materials",
        estimated_duration_min: 120,
        dependencies: ["step-6"],
      },
      {
        name: "Programming",
        description: "Create CNC programs",
        type: "action",
        action: "create_programs",
        estimated_duration_min: 240,
        dependencies: ["step-6"],
      },
      {
        name: "Production",
        description: "Machine parts",
        type: "checkpoint",
        action: "execute_production",
        estimated_duration_min: 480,
        dependencies: ["step-7", "step-8"],
      },
      {
        name: "Quality Inspection",
        description: "Inspect parts against specifications",
        type: "action",
        action: "inspect_parts",
        estimated_duration_min: 60,
        dependencies: ["step-9"],
      },
      {
        name: "Shipping",
        description: "Package and ship to customer",
        type: "action",
        action: "ship_order",
        estimated_duration_min: 30,
        dependencies: ["step-10"],
      },
    ],
    estimated_duration_min: 2520,
    tags: ["quote", "production", "full-workflow"],
  },
  {
    template_id: "multi-op-machining",
    name: "Multi-Operation Machining",
    description: "Complex part requiring multiple operations",
    goal_type: "machining",
    steps: [
      {
        name: "Setup Op 10",
        description: "First operation setup",
        type: "checkpoint",
        action: "setup_operation",
        action_params: { op_number: 10 },
        estimated_duration_min: 30,
        dependencies: [],
      },
      {
        name: "Run Op 10",
        description: "Execute first operation",
        type: "action",
        action: "run_operation",
        action_params: { op_number: 10 },
        estimated_duration_min: 60,
        dependencies: ["step-1"],
      },
      {
        name: "In-Process Inspection",
        description: "Verify Op 10 dimensions",
        type: "decision",
        action: "inspect_operation",
        action_params: { op_number: 10 },
        estimated_duration_min: 15,
        dependencies: ["step-2"],
      },
      {
        name: "Setup Op 20",
        description: "Second operation setup",
        type: "checkpoint",
        action: "setup_operation",
        action_params: { op_number: 20 },
        estimated_duration_min: 30,
        dependencies: ["step-3"],
      },
      {
        name: "Run Op 20",
        description: "Execute second operation",
        type: "action",
        action: "run_operation",
        action_params: { op_number: 20 },
        estimated_duration_min: 45,
        dependencies: ["step-4"],
      },
      {
        name: "Final Inspection",
        description: "Complete dimensional inspection",
        type: "action",
        action: "final_inspection",
        estimated_duration_min: 20,
        dependencies: ["step-5"],
      },
    ],
    estimated_duration_min: 200,
    tags: ["machining", "multi-op"],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class LongHorizonPlanningEngine {
  private readonly engineName = "LongHorizonPlanningEngine";

  /** Active plans */
  private activePlans: Map<string, ExecutionPlan> = new Map();

  /** Completed plans (for learning) */
  private completedPlans: ExecutionPlan[] = [];

  // ============================================================================
  // PLAN CREATION
  // ============================================================================

  /**
   * Create a plan from a goal.
   */
  createPlan(goal: PlanningGoal): ExecutionPlan {
    log.info(`[${this.engineName}] Creating plan for goal: ${goal.goal_id}`);

    // Find matching template
    const template = PLAN_TEMPLATES.find(t => t.goal_type === goal.type);

    // Generate steps
    const steps: PlanStep[] = template
      ? this.instantiateTemplate(template, goal)
      : this.generateStepsFromGoal(goal);

    // Identify risks
    const risks = this.identifyRisks(goal, steps);

    // Build AI reasoning
    const aiReasoning = this.buildPlanAIReasoning(goal, steps, risks);

    const plan: ExecutionPlan = {
      plan_id: `plan-${Date.now()}`,
      goal,
      steps,
      status: "draft",
      created_at: new Date().toISOString(),
      progress_pct: 0,
      estimated_total_min: steps.reduce((sum, s) => sum + (s.estimated_duration_min || 0), 0),
      actual_elapsed_min: 0,
      checkpoints: [],
      decision_log: [],
      risks,
      ai_reasoning: aiReasoning,
    };

    this.activePlans.set(plan.plan_id, plan);

    log.info(
      `[${this.engineName}] Plan created: ${plan.plan_id} with ${steps.length} steps, ` +
      `estimated ${plan.estimated_total_min} min`
    );

    return plan;
  }

  /**
   * Instantiate a template with goal context.
   */
  private instantiateTemplate(template: PlanTemplate, goal: PlanningGoal): PlanStep[] {
    return template.steps.map((step, index) => ({
      ...step,
      step_id: `step-${index + 1}`,
      status: "pending" as const,
      action_params: {
        ...step.action_params,
        ...goal.context,
      },
    }));
  }

  /**
   * Generate steps from goal when no template matches.
   */
  private generateStepsFromGoal(goal: PlanningGoal): PlanStep[] {
    const steps: PlanStep[] = [];

    // Generic planning logic
    steps.push({
      step_id: "step-1",
      name: "Analyze Requirements",
      description: `Analyze requirements for: ${goal.description}`,
      type: "action",
      action: "analyze_requirements",
      action_params: { goal_id: goal.goal_id },
      estimated_duration_min: 30,
      dependencies: [],
      status: "pending",
    });

    steps.push({
      step_id: "step-2",
      name: "Plan Execution",
      description: "Develop detailed execution plan",
      type: "checkpoint",
      action: "plan_execution",
      estimated_duration_min: 60,
      dependencies: ["step-1"],
      status: "pending",
    });

    steps.push({
      step_id: "step-3",
      name: "Execute",
      description: `Execute: ${goal.description}`,
      type: "action",
      action: "execute_goal",
      action_params: goal.context,
      estimated_duration_min: 120,
      dependencies: ["step-2"],
      status: "pending",
    });

    steps.push({
      step_id: "step-4",
      name: "Verify Success",
      description: "Verify success criteria are met",
      type: "decision",
      action: "verify_success",
      action_params: { criteria: goal.success_criteria },
      estimated_duration_min: 15,
      dependencies: ["step-3"],
      status: "pending",
    });

    return steps;
  }

  /**
   * Identify risks in a plan.
   */
  private identifyRisks(goal: PlanningGoal, steps: PlanStep[]): PlanRisk[] {
    const risks: PlanRisk[] = [];

    // Time constraint risk
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date).getTime();
      const totalMinutes = steps.reduce((sum, s) => sum + (s.estimated_duration_min || 0), 0);
      const estimatedEnd = Date.now() + totalMinutes * 60 * 1000;

      if (estimatedEnd > targetDate) {
        risks.push({
          risk_id: `risk-time-${Date.now()}`,
          description: "Plan may not complete before target date",
          probability: 0.7,
          impact: "high",
          mitigation: "Parallel execution or resource addition may be needed",
          affected_steps: steps.map(s => s.step_id),
          status: "identified",
        });
      }
    }

    // Decision point risks
    const decisionSteps = steps.filter(s => s.type === "decision");
    if (decisionSteps.length > 0) {
      risks.push({
        risk_id: `risk-decision-${Date.now()}`,
        description: `${decisionSteps.length} decision point(s) may cause delays`,
        probability: 0.5,
        impact: "medium",
        mitigation: "Pre-define decision criteria and escalation paths",
        affected_steps: decisionSteps.map(s => s.step_id),
        status: "identified",
      });
    }

    // Long step risks
    const longSteps = steps.filter(s => (s.estimated_duration_min || 0) > 240);
    for (const step of longSteps) {
      risks.push({
        risk_id: `risk-long-${step.step_id}`,
        description: `Step "${step.name}" is long (${step.estimated_duration_min} min) and may have hidden issues`,
        probability: 0.3,
        impact: "medium",
        mitigation: "Add intermediate checkpoints",
        affected_steps: [step.step_id],
        status: "identified",
      });
    }

    return risks;
  }

  /**
   * Build AI reasoning for plan.
   */
  private buildPlanAIReasoning(
    goal: PlanningGoal,
    steps: PlanStep[],
    risks: PlanRisk[],
  ): PlanAIReasoning {
    const totalMin = steps.reduce((sum, s) => sum + (s.estimated_duration_min || 0), 0);
    const checkpoints = steps.filter(s => s.type === "checkpoint").length;
    const decisions = steps.filter(s => s.type === "decision").length;

    return {
      plan_summary: `Plan for "${goal.description}" with ${steps.length} steps, ` +
        `${checkpoints} checkpoints, ${decisions} decision points, ` +
        `estimated ${Math.round(totalMin / 60)} hours.`,
      key_decisions: [
        `Sequencing: ${steps.filter(s => s.dependencies.length > 0).length} steps have dependencies`,
        `Checkpoints at: ${steps.filter(s => s.type === "checkpoint").map(s => s.name).join(", ") || "none"}`,
      ],
      risk_assessment: `Identified ${risks.length} risks: ` +
        `${risks.filter(r => r.impact === "high" || r.impact === "critical").length} high-impact.`,
      optimization_notes: [
        steps.some(s => s.type === "parallel")
          ? "Parallel execution enabled where possible"
          : "Consider parallelizing independent steps",
      ],
      alternative_approaches: [
        {
          approach: "Sequential execution",
          pros: ["Simple to track", "Easy rollback"],
          cons: ["Longer total time"],
          why_not_chosen: "Acceptable for current complexity level",
        },
      ],
      confidence: 0.75,
      assumptions: [
        "Resources are available as needed",
        "No major interruptions during execution",
      ],
      open_questions: goal.constraints?.length
        ? [`How strict are the ${goal.constraints[0].type} constraints?`]
        : [],
    };
  }

  // ============================================================================
  // PLAN EXECUTION
  // ============================================================================

  /**
   * Start executing a plan.
   */
  async startPlan(planId: string): Promise<ExecutionPlan> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    if (plan.status !== "draft" && plan.status !== "validated") {
      throw new Error(`Plan ${planId} is not ready to start (status: ${plan.status})`);
    }

    plan.status = "executing";
    plan.started_at = new Date().toISOString();

    // Mark ready steps
    this.updateReadySteps(plan);

    log.info(`[${this.engineName}] Started plan: ${planId}`);

    return plan;
  }

  /**
   * Execute the next ready step.
   */
  async executeNextStep(planId: string): Promise<PlanStep | null> {
    const plan = this.activePlans.get(planId);
    if (!plan || plan.status !== "executing") {
      return null;
    }

    // Find a ready step
    const readyStep = plan.steps.find(s => s.status === "ready");
    if (!readyStep) {
      // Check if plan is complete
      if (plan.steps.every(s => s.status === "completed" || s.status === "skipped")) {
        plan.status = "completed";
        plan.completed_at = new Date().toISOString();
        plan.progress_pct = 100;
        this.completedPlans.push(plan);
        log.info(`[${this.engineName}] Plan completed: ${planId}`);
      }
      return null;
    }

    // Execute the step
    readyStep.status = "in_progress";
    readyStep.started_at = new Date().toISOString();
    plan.current_step_id = readyStep.step_id;

    try {
      // Simulate step execution (in production, would call actual actions)
      const output = await this.executeStep(readyStep, plan);
      readyStep.output = output;
      readyStep.status = "completed";
      readyStep.completed_at = new Date().toISOString();

      // Create checkpoint if needed
      if (readyStep.type === "checkpoint") {
        const checkpoint = this.createCheckpoint(readyStep, plan);
        plan.checkpoints.push(checkpoint);
        readyStep.checkpoint = checkpoint;
      }

      // Update progress
      const completed = plan.steps.filter(s => s.status === "completed").length;
      plan.progress_pct = Math.round((completed / plan.steps.length) * 100);

      // Update ready steps
      this.updateReadySteps(plan);

      log.info(`[${this.engineName}] Step completed: ${readyStep.name} (${plan.progress_pct}%)`);

    } catch (error) {
      readyStep.status = "failed";
      readyStep.error = String(error);
      plan.status = "failed";

      log.error(`[${this.engineName}] Step failed: ${readyStep.name} - ${error}`);
    }

    return readyStep;
  }

  /**
   * Execute a single step.
   */
  private async executeStep(step: PlanStep, plan: ExecutionPlan): Promise<unknown> {
    // In production, this would dispatch to actual action handlers
    // For now, simulate execution
    const duration = step.estimated_duration_min || 1;

    // Simulate work (in real implementation, call action handlers)
    await new Promise(resolve => setTimeout(resolve, 10)); // Quick simulation

    plan.actual_elapsed_min += duration;

    return {
      step_id: step.step_id,
      action: step.action,
      executed_at: new Date().toISOString(),
      simulated: true,
    };
  }

  /**
   * Update step statuses to "ready" when dependencies are met.
   */
  private updateReadySteps(plan: ExecutionPlan): void {
    for (const step of plan.steps) {
      if (step.status !== "pending") continue;

      const depsComplete = step.dependencies.every(depId => {
        const dep = plan.steps.find(s => s.step_id === depId);
        return dep?.status === "completed" || dep?.status === "skipped";
      });

      if (depsComplete) {
        step.status = "ready";
      }
    }
  }

  /**
   * Create a checkpoint.
   */
  private createCheckpoint(step: PlanStep, plan: ExecutionPlan): PlanCheckpoint {
    return {
      checkpoint_id: `cp-${step.step_id}-${Date.now()}`,
      step_id: step.step_id,
      state_snapshot: {
        progress_pct: plan.progress_pct,
        completed_steps: plan.steps.filter(s => s.status === "completed").map(s => s.step_id),
        elapsed_min: plan.actual_elapsed_min,
      },
      created_at: new Date().toISOString(),
      can_rollback: true,
      rollback_instructions: `Rollback to state before "${step.name}"`,
    };
  }

  /**
   * Rollback to a checkpoint.
   */
  rollbackToCheckpoint(planId: string, checkpointId: string): ExecutionPlan {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const checkpoint = plan.checkpoints.find(cp => cp.checkpoint_id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    if (!checkpoint.can_rollback) {
      throw new Error(`Checkpoint ${checkpointId} cannot be rolled back`);
    }

    // Find the step for this checkpoint
    const checkpointStepIndex = plan.steps.findIndex(s => s.step_id === checkpoint.step_id);

    // Reset all steps after the checkpoint
    for (let i = checkpointStepIndex; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      step.status = i === checkpointStepIndex ? "ready" : "pending";
      step.output = undefined;
      step.started_at = undefined;
      step.completed_at = undefined;
      step.error = undefined;
    }

    // Restore state
    plan.progress_pct = checkpoint.state_snapshot.progress_pct as number;
    plan.actual_elapsed_min = checkpoint.state_snapshot.elapsed_min as number;
    plan.status = "executing";

    log.info(`[${this.engineName}] Rolled back plan ${planId} to checkpoint ${checkpointId}`);

    return plan;
  }

  // ============================================================================
  // PLAN QUERIES
  // ============================================================================

  /**
   * Get a plan by ID.
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * List all active plans.
   */
  listActivePlans(): ExecutionPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get available templates.
   */
  getTemplates(): PlanTemplate[] {
    return [...PLAN_TEMPLATES];
  }

  /**
   * Get plan execution summary.
   */
  getPlanSummary(planId: string): PlanExecutionResult | null {
    const plan = this.activePlans.get(planId) || this.completedPlans.find(p => p.plan_id === planId);
    if (!plan) return null;

    return {
      plan_id: plan.plan_id,
      status: plan.status,
      steps_completed: plan.steps.filter(s => s.status === "completed").length,
      steps_total: plan.steps.length,
      duration_min: plan.actual_elapsed_min,
      outputs: plan.steps
        .filter(s => s.output)
        .reduce((acc, s) => ({ ...acc, [s.step_id]: s.output }), {}),
      decisions_made: plan.decision_log.length,
      checkpoints_created: plan.checkpoints.length,
      rollbacks_performed: 0, // Would track this
      final_outcome: plan.status === "completed"
        ? "Successfully completed all steps"
        : plan.status === "failed"
        ? `Failed at step: ${plan.current_step_id}`
        : "In progress",
    };
  }

  /**
   * Cancel a plan.
   */
  cancelPlan(planId: string): void {
    const plan = this.activePlans.get(planId);
    if (plan) {
      plan.status = "cancelled";
      plan.completed_at = new Date().toISOString();
      log.info(`[${this.engineName}] Plan cancelled: ${planId}`);
    }
  }

  /**
   * Clear all plans (for testing).
   */
  clear(): void {
    this.activePlans.clear();
    this.completedPlans = [];
  }
}

export const longHorizonPlanningEngine = new LongHorizonPlanningEngine();
