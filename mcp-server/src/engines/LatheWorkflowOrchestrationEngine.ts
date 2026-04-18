/**
 * LatheWorkflowOrchestrationEngine — End-to-End Workflow Orchestration
 *
 * U-LTH59: Orchestrates complete job workflows from quote to delivery
 * Uses WorkflowEngine + OrchestrationEngine + StateMachineEngine patterns
 *
 * @module engines/LatheWorkflowOrchestrationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type WorkflowStage =
  | "quote_request"
  | "quote_generated"
  | "quote_approved"
  | "order_received"
  | "materials_ordered"
  | "materials_received"
  | "job_scheduled"
  | "setup_in_progress"
  | "production_running"
  | "first_article_inspection"
  | "production_complete"
  | "final_inspection"
  | "packaging"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "payment_received"
  | "closed";

export interface WorkflowInstance {
  workflow_id: string;
  job_id: string;
  customer_id: string;
  part_number: string;
  quantity: number;
  current_stage: WorkflowStage;
  stage_history: StageTransition[];
  created_at: string;
  updated_at: string;
  due_date: string;
  priority: "low" | "normal" | "high" | "rush";
  status: "active" | "paused" | "blocked" | "completed" | "cancelled";
  blockers: string[];
  metadata: Record<string, unknown>;
}

export interface StageTransition {
  from_stage: WorkflowStage;
  to_stage: WorkflowStage;
  timestamp: string;
  duration_hours: number;
  triggered_by: string;
  notes?: string;
}

export interface WorkflowTemplate {
  template_id: string;
  name: string;
  stages: WorkflowStage[];
  stage_requirements: Record<WorkflowStage, StageRequirement>;
  estimated_duration_hours: number;
}

export interface StageRequirement {
  required_inputs: string[];
  required_approvals: string[];
  auto_advance_conditions: string[];
  timeout_hours?: number;
  notifications: string[];
}

export interface WorkflowMetrics {
  total_workflows: number;
  active_workflows: number;
  completed_workflows: number;
  blocked_workflows: number;
  avg_cycle_time_hours: number;
  stage_bottlenecks: Array<{
    stage: WorkflowStage;
    avg_duration_hours: number;
    count: number;
  }>;
  on_time_completion_pct: number;
}

export interface WorkflowAction {
  action_id: string;
  workflow_id: string;
  action_type: "advance" | "block" | "unblock" | "pause" | "resume" | "cancel" | "note";
  stage?: WorkflowStage;
  reason?: string;
  performed_by: string;
  performed_at: string;
}

export interface WorkflowAlert {
  alert_id: string;
  workflow_id: string;
  alert_type: "overdue" | "blocked" | "approaching_due" | "stage_timeout";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  created_at: string;
  acknowledged: boolean;
}

// ============================================================================
// STAGE SEQUENCE
// ============================================================================

const STAGE_SEQUENCE: WorkflowStage[] = [
  "quote_request",
  "quote_generated",
  "quote_approved",
  "order_received",
  "materials_ordered",
  "materials_received",
  "job_scheduled",
  "setup_in_progress",
  "production_running",
  "first_article_inspection",
  "production_complete",
  "final_inspection",
  "packaging",
  "ready_to_ship",
  "shipped",
  "delivered",
  "invoiced",
  "payment_received",
  "closed",
];

const STAGE_ESTIMATED_HOURS: Record<WorkflowStage, number> = {
  quote_request: 2,
  quote_generated: 4,
  quote_approved: 24,
  order_received: 1,
  materials_ordered: 2,
  materials_received: 72,
  job_scheduled: 4,
  setup_in_progress: 2,
  production_running: 24,
  first_article_inspection: 1,
  production_complete: 8,
  final_inspection: 2,
  packaging: 1,
  ready_to_ship: 2,
  shipped: 48,
  delivered: 24,
  invoiced: 4,
  payment_received: 720,
  closed: 0,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheWorkflowOrchestrationEngine {
  private workflows: Map<string, WorkflowInstance> = new Map();
  private actions: Map<string, WorkflowAction> = new Map();
  private alerts: Map<string, WorkflowAlert> = new Map();

  // --------------------------------------------------------------------------
  // Workflow Management
  // --------------------------------------------------------------------------

  createWorkflow(params: {
    job_id: string;
    customer_id: string;
    part_number: string;
    quantity: number;
    due_date: string;
    priority?: "low" | "normal" | "high" | "rush";
    metadata?: Record<string, unknown>;
  }): WorkflowInstance {
    const workflowId = `WF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const workflow: WorkflowInstance = {
      workflow_id: workflowId,
      job_id: params.job_id,
      customer_id: params.customer_id,
      part_number: params.part_number,
      quantity: params.quantity,
      current_stage: "quote_request",
      stage_history: [],
      created_at: now,
      updated_at: now,
      due_date: params.due_date,
      priority: params.priority || "normal",
      status: "active",
      blockers: [],
      metadata: params.metadata || {},
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  advanceStage(
    workflowId: string,
    triggeredBy: string,
    notes?: string
  ): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== "active") return null;

    const currentIndex = STAGE_SEQUENCE.indexOf(workflow.current_stage);
    if (currentIndex === -1 || currentIndex >= STAGE_SEQUENCE.length - 1) {
      return null;
    }

    const nextStage = STAGE_SEQUENCE[currentIndex + 1];
    const now = new Date();
    const lastTransition = workflow.stage_history[workflow.stage_history.length - 1];
    const lastTimestamp = lastTransition
      ? new Date(lastTransition.timestamp)
      : new Date(workflow.created_at);
    const durationHours = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);

    workflow.stage_history.push({
      from_stage: workflow.current_stage,
      to_stage: nextStage,
      timestamp: now.toISOString(),
      duration_hours: Math.round(durationHours * 10) / 10,
      triggered_by: triggeredBy,
      notes,
    });

    workflow.current_stage = nextStage;
    workflow.updated_at = now.toISOString();

    if (nextStage === "closed") {
      workflow.status = "completed";
    }

    this.workflows.set(workflowId, workflow);

    this.recordAction({
      workflow_id: workflowId,
      action_type: "advance",
      stage: nextStage,
      performed_by: triggeredBy,
      reason: notes,
    });

    return workflow;
  }

  setStage(
    workflowId: string,
    stage: WorkflowStage,
    triggeredBy: string,
    notes?: string
  ): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    if (!STAGE_SEQUENCE.includes(stage)) return null;

    const now = new Date();
    const lastTransition = workflow.stage_history[workflow.stage_history.length - 1];
    const lastTimestamp = lastTransition
      ? new Date(lastTransition.timestamp)
      : new Date(workflow.created_at);
    const durationHours = (now.getTime() - lastTimestamp.getTime()) / (1000 * 60 * 60);

    workflow.stage_history.push({
      from_stage: workflow.current_stage,
      to_stage: stage,
      timestamp: now.toISOString(),
      duration_hours: Math.round(durationHours * 10) / 10,
      triggered_by: triggeredBy,
      notes,
    });

    workflow.current_stage = stage;
    workflow.updated_at = now.toISOString();

    if (stage === "closed") {
      workflow.status = "completed";
    }

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  blockWorkflow(
    workflowId: string,
    reason: string,
    blockedBy: string
  ): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    workflow.status = "blocked";
    workflow.blockers.push(reason);
    workflow.updated_at = new Date().toISOString();

    this.workflows.set(workflowId, workflow);

    this.createAlert({
      workflow_id: workflowId,
      alert_type: "blocked",
      severity: "high",
      message: `Workflow blocked: ${reason}`,
    });

    this.recordAction({
      workflow_id: workflowId,
      action_type: "block",
      performed_by: blockedBy,
      reason,
    });

    return workflow;
  }

  unblockWorkflow(
    workflowId: string,
    resolution: string,
    unblockedBy: string
  ): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== "blocked") return null;

    workflow.status = "active";
    workflow.blockers = [];
    workflow.updated_at = new Date().toISOString();

    this.workflows.set(workflowId, workflow);

    this.recordAction({
      workflow_id: workflowId,
      action_type: "unblock",
      performed_by: unblockedBy,
      reason: resolution,
    });

    return workflow;
  }

  pauseWorkflow(workflowId: string, reason: string, pausedBy: string): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== "active") return null;

    workflow.status = "paused";
    workflow.updated_at = new Date().toISOString();

    this.workflows.set(workflowId, workflow);

    this.recordAction({
      workflow_id: workflowId,
      action_type: "pause",
      performed_by: pausedBy,
      reason,
    });

    return workflow;
  }

  resumeWorkflow(workflowId: string, resumedBy: string): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== "paused") return null;

    workflow.status = "active";
    workflow.updated_at = new Date().toISOString();

    this.workflows.set(workflowId, workflow);

    this.recordAction({
      workflow_id: workflowId,
      action_type: "resume",
      performed_by: resumedBy,
    });

    return workflow;
  }

  cancelWorkflow(workflowId: string, reason: string, cancelledBy: string): WorkflowInstance | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status === "completed" || workflow.status === "cancelled") {
      return null;
    }

    workflow.status = "cancelled";
    workflow.updated_at = new Date().toISOString();

    this.workflows.set(workflowId, workflow);

    this.recordAction({
      workflow_id: workflowId,
      action_type: "cancel",
      performed_by: cancelledBy,
      reason,
    });

    return workflow;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getWorkflow(workflowId: string): WorkflowInstance | null {
    return this.workflows.get(workflowId) || null;
  }

  getWorkflowsByStatus(status: WorkflowInstance["status"]): WorkflowInstance[] {
    return Array.from(this.workflows.values()).filter((w) => w.status === status);
  }

  getWorkflowsByStage(stage: WorkflowStage): WorkflowInstance[] {
    return Array.from(this.workflows.values()).filter((w) => w.current_stage === stage);
  }

  getWorkflowsByCustomer(customerId: string): WorkflowInstance[] {
    return Array.from(this.workflows.values()).filter((w) => w.customer_id === customerId);
  }

  getActiveWorkflows(): WorkflowInstance[] {
    return Array.from(this.workflows.values()).filter(
      (w) => w.status === "active" || w.status === "paused" || w.status === "blocked"
    );
  }

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  calculateMetrics(): WorkflowMetrics {
    const workflows = Array.from(this.workflows.values());
    const completed = workflows.filter((w) => w.status === "completed");
    const active = workflows.filter((w) => w.status === "active");
    const blocked = workflows.filter((w) => w.status === "blocked");

    const cycleTimes = completed.map((w) => {
      const start = new Date(w.created_at).getTime();
      const end = new Date(w.updated_at).getTime();
      return (end - start) / (1000 * 60 * 60);
    });
    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

    const stageDurations: Record<WorkflowStage, { total: number; count: number }> = {} as Record<
      WorkflowStage,
      { total: number; count: number }
    >;

    for (const workflow of workflows) {
      for (const transition of workflow.stage_history) {
        if (!stageDurations[transition.from_stage]) {
          stageDurations[transition.from_stage] = { total: 0, count: 0 };
        }
        stageDurations[transition.from_stage].total += transition.duration_hours;
        stageDurations[transition.from_stage].count++;
      }
    }

    const bottlenecks = Object.entries(stageDurations)
      .map(([stage, data]) => ({
        stage: stage as WorkflowStage,
        avg_duration_hours: Math.round((data.total / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.avg_duration_hours - a.avg_duration_hours)
      .slice(0, 5);

    const onTimeCompletions = completed.filter((w) => {
      return new Date(w.updated_at) <= new Date(w.due_date);
    }).length;
    const onTimePct = completed.length > 0
      ? (onTimeCompletions / completed.length) * 100
      : 100;

    return {
      total_workflows: workflows.length,
      active_workflows: active.length,
      completed_workflows: completed.length,
      blocked_workflows: blocked.length,
      avg_cycle_time_hours: Math.round(avgCycleTime * 10) / 10,
      stage_bottlenecks: bottlenecks,
      on_time_completion_pct: Math.round(onTimePct * 10) / 10,
    };
  }

  getEstimatedCompletion(workflowId: string): string | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const currentIndex = STAGE_SEQUENCE.indexOf(workflow.current_stage);
    const remainingStages = STAGE_SEQUENCE.slice(currentIndex);

    let remainingHours = 0;
    for (const stage of remainingStages) {
      remainingHours += STAGE_ESTIMATED_HOURS[stage];
    }

    const estimated = new Date();
    estimated.setHours(estimated.getHours() + remainingHours);

    return estimated.toISOString();
  }

  // --------------------------------------------------------------------------
  // Alerts
  // --------------------------------------------------------------------------

  createAlert(params: Omit<WorkflowAlert, "alert_id" | "created_at" | "acknowledged">): WorkflowAlert {
    const alertId = `ALT-${Date.now().toString(36)}`;

    const alert: WorkflowAlert = {
      ...params,
      alert_id: alertId,
      created_at: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);
    return alert;
  }

  checkOverdueWorkflows(): WorkflowAlert[] {
    const newAlerts: WorkflowAlert[] = [];
    const now = new Date();

    for (const workflow of this.workflows.values()) {
      if (workflow.status === "completed" || workflow.status === "cancelled") continue;

      const dueDate = new Date(workflow.due_date);
      const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilDue < 0) {
        const alert = this.createAlert({
          workflow_id: workflow.workflow_id,
          alert_type: "overdue",
          severity: "critical",
          message: `Workflow ${workflow.workflow_id} is ${Math.abs(Math.round(daysUntilDue))} days overdue`,
        });
        newAlerts.push(alert);
      } else if (daysUntilDue <= 2) {
        const alert = this.createAlert({
          workflow_id: workflow.workflow_id,
          alert_type: "approaching_due",
          severity: "high",
          message: `Workflow ${workflow.workflow_id} due in ${Math.round(daysUntilDue)} days`,
        });
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  acknowledgeAlert(alertId: string): WorkflowAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    this.alerts.set(alertId, alert);
    return alert;
  }

  getActiveAlerts(): WorkflowAlert[] {
    return Array.from(this.alerts.values())
      .filter((a) => !a.acknowledged)
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  private recordAction(params: Omit<WorkflowAction, "action_id" | "performed_at">): WorkflowAction {
    const actionId = `ACT-${Date.now().toString(36)}`;

    const action: WorkflowAction = {
      ...params,
      action_id: actionId,
      performed_at: new Date().toISOString(),
    };

    this.actions.set(actionId, action);
    return action;
  }

  getWorkflowActions(workflowId: string): WorkflowAction[] {
    return Array.from(this.actions.values())
      .filter((a) => a.workflow_id === workflowId)
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  getStageSequence(): WorkflowStage[] {
    return [...STAGE_SEQUENCE];
  }

  getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
    const index = STAGE_SEQUENCE.indexOf(currentStage);
    if (index === -1 || index >= STAGE_SEQUENCE.length - 1) return null;
    return STAGE_SEQUENCE[index + 1];
  }

  getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
    const index = STAGE_SEQUENCE.indexOf(currentStage);
    if (index <= 0) return null;
    return STAGE_SEQUENCE[index - 1];
  }

  clearAll(): void {
    this.workflows.clear();
    this.actions.clear();
    this.alerts.clear();
  }
}

export const latheWorkflowOrchestrationEngine = new LatheWorkflowOrchestrationEngine();
