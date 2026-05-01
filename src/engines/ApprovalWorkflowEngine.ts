/**
 * ApprovalWorkflowEngine — Session 6-6 U-APPR1
 *
 * Generic approval workflow engine for any entity type (quote, PO, invoice,
 * payroll, NCR, job, change_order, credit_memo). Configurable multi-step
 * approval chains with auto-approve thresholds, timeout tracking, and
 * EventBus integration for downstream coordination.
 *
 * NOT a duplicate of QuoteRevisionEngine — that handles quote-specific status
 * lifecycle (draft→sent→accepted) and revision snapshots. This engine handles
 * cross-entity approval chains with role-based steps, delegation, and auto-approve.
 *
 * Actions: workflow_create, workflow_submit, workflow_decide,
 *          workflow_pending, workflow_status, workflow_configure
 *
 * DB: approval_workflows, approval_instances, approval_decisions (migration 004)
 */

import { eventBus } from "./EventBus.js";
import { auditEngine } from "./AuditEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ApprovalEntityType =
  | "quote"
  | "purchase_order"
  | "invoice"
  | "payroll"
  | "ncr"
  | "job"
  | "change_order"
  | "credit_memo";

export type ApprovalStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "auto_approved";

export type DecisionType =
  | "approved"
  | "rejected"
  | "delegated"
  | "auto_approved"
  | "timed_out";

export interface WorkflowStep {
  step_number: number;
  role_required: string;
  action_label: string;
  auto_approve_below_usd?: number;
  timeout_hours?: number;
}

export interface WorkflowDefinition {
  id: string;
  entity_type: ApprovalEntityType;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalInstance {
  id: string;
  workflow_id: string;
  entity_type: ApprovalEntityType;
  entity_id: string;
  status: ApprovalStatus;
  current_step: number;
  total_steps: number;
  submitted_by?: string;
  submitted_at: string;
  completed_at?: string;
  entity_amount?: number;
  metadata: Record<string, unknown>;
  decisions: ApprovalDecision[];
}

export interface ApprovalDecision {
  id: string;
  instance_id: string;
  step_number: number;
  decision: DecisionType;
  decided_by?: string;
  decided_at: string;
  reason?: string;
  delegated_to?: string;
}

export interface SubmitApprovalInput {
  entity_type: ApprovalEntityType;
  entity_id: string;
  submitted_by: string;
  entity_amount?: number;
  metadata?: Record<string, unknown>;
  workflow_name?: string;
}

export interface DecideApprovalInput {
  instance_id: string;
  decision: "approved" | "rejected" | "delegated";
  decided_by: string;
  reason?: string;
  delegated_to?: string;
  /** Roles held by the decider. If provided, validated against step's role_required. */
  decider_roles?: string[];
}

export interface PendingApproval {
  instance: ApprovalInstance;
  workflow: WorkflowDefinition;
  current_step_def: WorkflowStep;
  submitted_by: string;
  entity_summary?: Record<string, unknown>;
  age_hours: number;
  is_overdue: boolean;
}

export interface WorkflowConfigInput {
  entity_type: ApprovalEntityType;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  created_by?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

let instanceSeq = 0;
let decisionSeq = 0;
let workflowSeq = 0;

export class ApprovalWorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, ApprovalInstance> = new Map();

  constructor() {
    this.seedDefaults();
  }

  /** Create or update a workflow definition.
   * @param input - workflow configuration
   * @returns the created or updated WorkflowDefinition
   */
  configureWorkflow(input: WorkflowConfigInput): WorkflowDefinition {
    if (input.steps.length === 0) {
      throw new Error("Workflow must have at least one step");
    }

    const sorted = [...input.steps].sort((a, b) => a.step_number - b.step_number);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].step_number !== i + 1) {
        throw new Error(`Step numbers must be sequential starting from 1, got ${sorted[i].step_number} at position ${i + 1}`);
      }
    }

    const existing = this.findWorkflow(input.entity_type, input.name);
    if (existing) {
      existing.steps = sorted;
      existing.description = input.description ?? existing.description;
      existing.updated_at = new Date().toISOString();
      this.workflows.set(existing.id, existing);

      auditEngine.log("config", "workflow_updated", input.created_by ?? "system", {
        workflow_id: existing.id, entity_type: input.entity_type, steps: sorted.length,
      });

      return existing;
    }

    const id = `wf-${++workflowSeq}-${Date.now().toString(36)}`;
    const workflow: WorkflowDefinition = {
      id,
      entity_type: input.entity_type,
      name: input.name,
      description: input.description,
      steps: sorted,
      is_active: true,
      created_by: input.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.workflows.set(id, workflow);

    auditEngine.log("config", "workflow_created", input.created_by ?? "system", {
      workflow_id: id, entity_type: input.entity_type, name: input.name, steps: sorted.length,
    });

    return workflow;
  }

  /** Submit an entity for approval. Returns the created instance.
   * @param input - submission details (entity type, id, submitter, amount)
   * @returns the created ApprovalInstance
   */
  async submit(input: SubmitApprovalInput): Promise<ApprovalInstance> {
    if (!input.entity_type) throw new Error("entity_type is required");
    if (!input.entity_id || input.entity_id.trim().length === 0) throw new Error("entity_id is required");
    if (!input.submitted_by || input.submitted_by.trim().length === 0) throw new Error("submitted_by is required");
    if (input.entity_amount != null && input.entity_amount < 0) throw new Error("entity_amount cannot be negative");

    const workflow = this.findActiveWorkflow(input.entity_type, input.workflow_name);
    if (!workflow) {
      throw new Error(`No active approval workflow found for entity type '${input.entity_type}'`);
    }

    const existing = this.findInstance(input.entity_type, input.entity_id);
    if (existing && (existing.status === "pending" || existing.status === "in_review")) {
      throw new Error(`Entity ${input.entity_type}:${input.entity_id} already has a pending approval (${existing.id})`);
    }

    const id = `ai-${++instanceSeq}-${Date.now().toString(36)}`;
    const instance: ApprovalInstance = {
      id,
      workflow_id: workflow.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      status: "pending",
      current_step: 1,
      total_steps: workflow.steps.length,
      submitted_by: input.submitted_by,
      submitted_at: new Date().toISOString(),
      entity_amount: input.entity_amount,
      metadata: input.metadata ?? {},
      decisions: [],
    };

    // M3 FIX: Publish submitted event BEFORE auto-approve check so timeline captures it
    await eventBus.publish("approval.submitted", {
      instance_id: id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      workflow_id: workflow.id,
      submitted_by: input.submitted_by,
      amount: input.entity_amount,
    }, { category: "audit", source: "ApprovalWorkflowEngine" });

    auditEngine.log("data", "approval_submitted", input.submitted_by, {
      instance_id: id, entity_type: input.entity_type, entity_id: input.entity_id,
      workflow: workflow.name, amount: input.entity_amount,
    }, { resource_type: input.entity_type, resource_id: input.entity_id });

    // Check auto-approve for first step
    const firstStep = workflow.steps[0];
    if (
      firstStep.auto_approve_below_usd != null &&
      input.entity_amount != null &&
      input.entity_amount > 0 && input.entity_amount < firstStep.auto_approve_below_usd
    ) {
      return this.processAutoApprove(instance, workflow);
    }

    instance.status = "in_review";
    this.instances.set(id, instance);

    // (submitted event already published above)
    return instance;
  }

  /** Record a decision (approve/reject/delegate) on a pending approval.
   * @param input - decision details (instance id, decision, decider, optional roles)
   * @returns the updated ApprovalInstance
   */
  async decide(input: DecideApprovalInput): Promise<ApprovalInstance> {
    const instance = this.instances.get(input.instance_id);
    if (!instance) {
      throw new Error(`Approval instance '${input.instance_id}' not found`);
    }

    if (instance.status !== "in_review" && instance.status !== "pending") {
      throw new Error(`Cannot decide on approval in status '${instance.status}' — must be 'pending' or 'in_review'`);
    }

    const workflow = this.workflows.get(instance.workflow_id);
    if (!workflow) {
      throw new Error(`Workflow '${instance.workflow_id}' not found`);
    }

    const currentStepDef = workflow.steps[instance.current_step - 1];

    // C3 FIX: Concurrency guard — reject if step already has a non-delegation decision
    const existingDecision = instance.decisions.find(
      (d) => d.step_number === instance.current_step && d.decision !== "delegated"
    );
    if (existingDecision) {
      throw new Error(
        `Step ${instance.current_step} already has a decision (${existingDecision.decision} by ${existingDecision.decided_by})`
      );
    }

    // C2 FIX: Role authorization — require decider_roles when step has role_required
    if (currentStepDef?.role_required) {
      if (!input.decider_roles || input.decider_roles.length === 0) {
        throw new Error(
          `decider_roles is required for step ${instance.current_step} which requires role '${currentStepDef.role_required}'`
        );
      }
      if (!input.decider_roles.includes(currentStepDef.role_required)) {
        throw new Error(
          `Actor '${input.decided_by}' lacks required role '${currentStepDef.role_required}' for step ${instance.current_step}. Has roles: [${input.decider_roles.join(", ")}]`
        );
      }
    }

    // M1 SECURITY: Self-approval blocked — decided_by cannot equal submitted_by
    if (instance.submitted_by && input.decided_by === instance.submitted_by) {
      throw new Error(
        `Self-approval blocked: decider '${input.decided_by}' is the same as submitter '${instance.submitted_by}'`
      );
    }

    // Pre-push validation for delegation (must happen before decision is added to array)
    if (input.decision === "delegated") {
      if (!input.delegated_to) {
        throw new Error("delegated_to is required when decision is 'delegated'");
      }
      // M2 SECURITY: Delegation depth limit (check existing decisions, not including current)
      const delegationCount = instance.decisions.filter(d => d.decision === "delegated").length;
      if (delegationCount >= 5) {
        throw new Error(`Maximum delegation depth (5) reached for step ${instance.current_step}. Approve, reject, or escalate instead.`);
      }
      // Circular delegation check (check existing decisions, not including current)
      const priorTargets = instance.decisions.filter(d => d.decision === "delegated").map(d => d.delegated_to);
      if (priorTargets.includes(input.delegated_to)) {
        throw new Error(`Circular delegation detected: '${input.delegated_to}' was already delegated to in this approval chain.`);
      }
    }

    const decision: ApprovalDecision = {
      id: `ad-${++decisionSeq}-${Date.now().toString(36)}`,
      instance_id: instance.id,
      step_number: instance.current_step,
      decision: input.decision === "delegated" ? "delegated" : input.decision,
      decided_by: input.decided_by,
      decided_at: new Date().toISOString(),
      reason: input.reason,
      delegated_to: input.delegated_to,
    };

    instance.decisions.push(decision);

    if (input.decision === "rejected") {
      instance.status = "rejected";
      instance.completed_at = new Date().toISOString();

      await eventBus.publish("approval.rejected", {
        instance_id: instance.id, entity_type: instance.entity_type,
        entity_id: instance.entity_id, step: instance.current_step,
        decided_by: input.decided_by, reason: input.reason,
      }, { category: "audit", source: "ApprovalWorkflowEngine" });

    } else if (input.decision === "delegated") {
      // C1 FIX: Store delegation target on instance metadata for routing
      instance.metadata.delegated_to = input.delegated_to;
      instance.metadata.delegated_from = input.decided_by;
      instance.metadata.delegated_at = new Date().toISOString();

      await eventBus.publish("approval.delegated", {
        instance_id: instance.id, entity_type: instance.entity_type,
        entity_id: instance.entity_id, step: instance.current_step,
        from: input.decided_by, to: input.delegated_to,
      }, { category: "audit", source: "ApprovalWorkflowEngine" });

    } else if (input.decision === "approved") {
      if (instance.current_step >= instance.total_steps) {
        instance.status = "approved";
        instance.completed_at = new Date().toISOString();

        await eventBus.publish("approval.completed", {
          instance_id: instance.id, entity_type: instance.entity_type,
          entity_id: instance.entity_id, final_status: "approved",
        }, { category: "audit", source: "ApprovalWorkflowEngine" });
      } else {
        // H1 FIX: Loop through all remaining auto-approvable steps
        instance.current_step++;
        while (instance.current_step <= instance.total_steps) {
          const nextStep = workflow.steps[instance.current_step - 1];
          if (
            nextStep?.auto_approve_below_usd != null &&
            instance.entity_amount != null &&
            instance.entity_amount > 0 && instance.entity_amount < nextStep.auto_approve_below_usd
          ) {
            instance.decisions.push({
              id: `ad-${++decisionSeq}-${Date.now().toString(36)}`,
              instance_id: instance.id,
              step_number: instance.current_step,
              decision: "auto_approved",
              decided_at: new Date().toISOString(),
              reason: `Amount $${instance.entity_amount.toFixed(2)} below auto-approve threshold $${nextStep.auto_approve_below_usd}`,
            });
            if (instance.current_step >= instance.total_steps) {
              instance.status = "approved";
              instance.completed_at = new Date().toISOString();
              await eventBus.publish("approval.completed", {
                instance_id: instance.id, entity_type: instance.entity_type,
                entity_id: instance.entity_id, final_status: "approved",
              }, { category: "audit", source: "ApprovalWorkflowEngine" });
              break;
            }
            instance.current_step++;
          } else {
            break; // This step needs manual review
          }
        }

        if (instance.status === "in_review") {
          await eventBus.publish("approval.step_advanced", {
            instance_id: instance.id, entity_type: instance.entity_type,
            entity_id: instance.entity_id, step: instance.current_step,
            total_steps: instance.total_steps,
          }, { category: "audit", source: "ApprovalWorkflowEngine" });
        }
      }
    }

    auditEngine.log("data", `approval_${input.decision}`, input.decided_by, {
      instance_id: instance.id, entity_type: instance.entity_type,
      entity_id: instance.entity_id, step: decision.step_number,
      reason: input.reason,
    }, {
      resource_type: instance.entity_type, resource_id: instance.entity_id,
      severity: input.decision === "rejected" ? "warning" : "info",
    });

    this.instances.set(instance.id, instance);
    return instance;
  }

  /** Cancel a pending approval.
   * @param instanceId - the approval instance ID
   * @param cancelledBy - actor performing the cancellation
   * @param reason - optional cancellation reason
   * @returns the updated ApprovalInstance
   */
  async cancel(instanceId: string, cancelledBy: string, reason?: string): Promise<ApprovalInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Approval instance '${instanceId}' not found`);
    }
    if (instance.status === "approved" || instance.status === "rejected" || instance.status === "auto_approved") {
      throw new Error(`Cannot cancel a ${instance.status} approval`);
    }
    // M3 SECURITY: Only submitter can cancel
    if (instance.submitted_by && cancelledBy !== instance.submitted_by) {
      throw new Error(`Only the original submitter '${instance.submitted_by}' can cancel this approval. Got '${cancelledBy}'.`);
    }

    instance.status = "cancelled";
    instance.completed_at = new Date().toISOString();
    this.instances.set(instanceId, instance);

    await eventBus.publish("approval.cancelled", {
      instance_id: instanceId, entity_type: instance.entity_type,
      entity_id: instance.entity_id, cancelled_by: cancelledBy, reason,
    }, { category: "audit", source: "ApprovalWorkflowEngine" });

    auditEngine.log("data", "approval_cancelled", cancelledBy, {
      instance_id: instanceId, entity_type: instance.entity_type,
      entity_id: instance.entity_id, reason,
    }, { resource_type: instance.entity_type, resource_id: instance.entity_id });

    return instance;
  }

  /** Get all pending approvals, optionally filtered by role or entity type.
   * @param filters - optional filters for entity_type and role
   * @returns sorted list of PendingApproval records (overdue first, then oldest)
   */
  getPending(filters?: {
    entity_type?: ApprovalEntityType;
    role?: string;
  }): PendingApproval[] {
    const result: PendingApproval[] = [];
    const now = Date.now();

    for (const instance of this.instances.values()) {
      if (instance.status !== "in_review" && instance.status !== "pending") continue;
      if (filters?.entity_type && instance.entity_type !== filters.entity_type) continue;

      const workflow = this.workflows.get(instance.workflow_id);
      if (!workflow) continue;

      const currentStepDef = workflow.steps[instance.current_step - 1];
      if (!currentStepDef) continue;

      if (filters?.role && currentStepDef.role_required !== filters.role) continue;

      const submittedMs = new Date(instance.submitted_at).getTime();
      const ageHours = (now - submittedMs) / 3_600_000;
      const isOverdue = currentStepDef.timeout_hours != null && ageHours > currentStepDef.timeout_hours;

      result.push({
        instance,
        workflow,
        current_step_def: currentStepDef,
        submitted_by: instance.submitted_by ?? "unknown",
        age_hours: Math.round(ageHours * 10) / 10,
        is_overdue: isOverdue,
      });
    }

    return result.sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      return b.age_hours - a.age_hours;
    });
  }

  /** Get the status of a specific approval instance.
   * @param instanceId - the approval instance ID
   * @returns ApprovalInstance or null if not found
   */
  getStatus(instanceId: string): ApprovalInstance | null {
    return this.instances.get(instanceId) ?? null;
  }

  /** Get approval history for a specific entity.
   * @param entityType - the entity type
   * @param entityId - the entity ID
   * @returns all ApprovalInstance records for this entity
   */
  getEntityHistory(entityType: ApprovalEntityType, entityId: string): ApprovalInstance[] {
    return [...this.instances.values()].filter(
      (i) => i.entity_type === entityType && i.entity_id === entityId
    );
  }

  /** List all configured workflows, optionally filtered by entity type.
   * @param entityType - optional entity type filter
   * @returns active WorkflowDefinition records
   */
  listWorkflows(entityType?: ApprovalEntityType): WorkflowDefinition[] {
    const all = [...this.workflows.values()];
    if (entityType) return all.filter((w) => w.entity_type === entityType && w.is_active);
    return all.filter((w) => w.is_active);
  }

  /** Get summary stats for the approval system.
   * @returns counts by status, overdue count, and average approval time
   */
  getStats(): {
    total_workflows: number;
    total_instances: number;
    pending: number;
    in_review: number;
    approved: number;
    rejected: number;
    cancelled: number;
    auto_approved: number;
    overdue: number;
    avg_approval_hours: number;
  } {
    let pending = 0, inReview = 0, approved = 0, rejected = 0, cancelled = 0, autoApproved = 0;
    let overdue = 0;
    const completionTimes: number[] = [];
    const now = Date.now();

    for (const inst of this.instances.values()) {
      switch (inst.status) {
        case "pending": pending++; break;
        case "in_review": inReview++; break;
        case "approved": approved++; break;
        case "rejected": rejected++; break;
        case "cancelled": cancelled++; break;
        case "auto_approved": autoApproved++; break;
      }

      if (inst.status === "in_review" || inst.status === "pending") {
        const workflow = this.workflows.get(inst.workflow_id);
        const stepDef = workflow?.steps[inst.current_step - 1];
        if (stepDef?.timeout_hours) {
          const ageHours = (now - new Date(inst.submitted_at).getTime()) / 3_600_000;
          if (ageHours > stepDef.timeout_hours) overdue++;
        }
      }

      if (inst.completed_at) {
        const ms = new Date(inst.completed_at).getTime() - new Date(inst.submitted_at).getTime();
        completionTimes.push(ms / 3_600_000);
      }
    }

    const avgHours = completionTimes.length > 0
      ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
      : 0;

    return {
      total_workflows: [...this.workflows.values()].filter((w) => w.is_active).length,
      total_instances: this.instances.size,
      pending,
      in_review: inReview,
      approved,
      rejected,
      cancelled,
      auto_approved: autoApproved,
      overdue,
      avg_approval_hours: avgHours,
    };
  }

  /** Check whether an entity requires approval based on amount and type.
   * @param entityType - the entity type
   * @param amount - optional dollar amount for auto-approve threshold check
   * @returns whether approval is required and if it would auto-approve
   */
  requiresApproval(entityType: ApprovalEntityType, amount?: number): {
    required: boolean;
    workflow?: WorkflowDefinition;
    would_auto_approve: boolean;
  } {
    const workflow = this.findActiveWorkflow(entityType);
    if (!workflow) return { required: false, would_auto_approve: false };

    const wouldAuto = (
      amount != null &&
      workflow.steps.every(
        (s) => s.auto_approve_below_usd != null && amount < s.auto_approve_below_usd
      )
    );

    return { required: true, workflow, would_auto_approve: wouldAuto };
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private async processAutoApprove(
    instance: ApprovalInstance,
    workflow: WorkflowDefinition
  ): Promise<ApprovalInstance> {
    for (const step of workflow.steps) {
      if (
        step.auto_approve_below_usd != null &&
        instance.entity_amount != null &&
        instance.entity_amount > 0 && instance.entity_amount < step.auto_approve_below_usd
      ) {
        instance.decisions.push({
          id: `ad-${++decisionSeq}-${Date.now().toString(36)}`,
          instance_id: instance.id,
          step_number: step.step_number,
          decision: "auto_approved",
          decided_at: new Date().toISOString(),
          reason: `Amount $${instance.entity_amount.toFixed(2)} below threshold $${step.auto_approve_below_usd}`,
        });
        instance.current_step = step.step_number;
      } else {
        instance.status = "in_review";
        this.instances.set(instance.id, instance);
        return instance;
      }
    }

    instance.status = "auto_approved";
    instance.completed_at = new Date().toISOString();
    this.instances.set(instance.id, instance);

    await eventBus.publish("approval.completed", {
      instance_id: instance.id, entity_type: instance.entity_type,
      entity_id: instance.entity_id, final_status: "auto_approved",
      amount: instance.entity_amount,
    }, { category: "audit", source: "ApprovalWorkflowEngine" });

    auditEngine.log("data", "approval_auto_approved", "system", {
      instance_id: instance.id, entity_type: instance.entity_type,
      entity_id: instance.entity_id, amount: instance.entity_amount,
    }, { resource_type: instance.entity_type, resource_id: instance.entity_id });

    return instance;
  }

  private findWorkflow(entityType: ApprovalEntityType, name: string): WorkflowDefinition | undefined {
    for (const wf of this.workflows.values()) {
      if (wf.entity_type === entityType && wf.name === name) return wf;
    }
    return undefined;
  }

  private findActiveWorkflow(entityType: ApprovalEntityType, name?: string): WorkflowDefinition | undefined {
    for (const wf of this.workflows.values()) {
      if (wf.entity_type === entityType && wf.is_active) {
        if (!name || wf.name === name) return wf;
      }
    }
    return undefined;
  }

  private findInstance(entityType: ApprovalEntityType, entityId: string): ApprovalInstance | undefined {
    for (const inst of this.instances.values()) {
      if (
        inst.entity_type === entityType &&
        inst.entity_id === entityId &&
        (inst.status === "pending" || inst.status === "in_review")
      ) {
        return inst;
      }
    }
    return undefined;
  }

  private seedDefaults(): void {
    const defaults: WorkflowConfigInput[] = [
      {
        entity_type: "quote",
        name: "Standard Quote Approval",
        steps: [
          { step_number: 1, role_required: "sales_manager", action_label: "Review quote pricing and terms", auto_approve_below_usd: 2500, timeout_hours: 48 },
        ],
      },
      {
        entity_type: "purchase_order",
        name: "Standard PO Approval",
        steps: [
          { step_number: 1, role_required: "purchasing_manager", action_label: "Approve purchase order", auto_approve_below_usd: 2500, timeout_hours: 24 },
          { step_number: 2, role_required: "finance_manager", action_label: "Finance review for POs over $5000", auto_approve_below_usd: 10000, timeout_hours: 48 },
        ],
      },
      {
        entity_type: "invoice",
        name: "Standard Invoice Approval",
        steps: [
          { step_number: 1, role_required: "finance_manager", action_label: "Approve invoice for payment", auto_approve_below_usd: 1000, timeout_hours: 72 },
        ],
      },
      {
        entity_type: "payroll",
        name: "Payroll Run Approval",
        steps: [
          { step_number: 1, role_required: "finance_manager", action_label: "Review and approve payroll run", timeout_hours: 24 },
        ],
      },
      {
        entity_type: "ncr",
        name: "NCR Disposition Approval",
        steps: [
          { step_number: 1, role_required: "quality_manager", action_label: "Review nonconformance and disposition", timeout_hours: 24 },
          { step_number: 2, role_required: "engineering_manager", action_label: "Engineering concurrence on disposition", timeout_hours: 48 },
        ],
      },
    ];

    for (const d of defaults) {
      this.configureWorkflow(d);
    }
  }
}

export const approvalWorkflowEngine = new ApprovalWorkflowEngine();
