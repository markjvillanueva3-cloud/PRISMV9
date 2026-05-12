/**
 * AIGeneratedCodeApprovalGateEngine — P0-CRITICAL Safety Gate
 *
 * Human-in-the-loop approval gate for ALL AI-generated G-code.
 * NO AI-generated code reaches the machine without human review.
 *
 * Features:
 * - Confidence score display (0-100%)
 * - Parameter choice explanations (why these speeds/feeds/toolpaths)
 * - Risk assessment (collision, overload, chatter, thermal)
 * - Diff view against baseline programs
 * - Approve/Reject/Request-Modification workflow
 * - Escalation path for high-risk decisions
 * - Full audit trail for AS9100, ISO 13485 compliance
 * - Integration with ApprovalWorkflowEngine
 *
 * SAFETY CRITICAL: This is the FINAL gate before metal cutting.
 * ALL generated code MUST pass through here. No bypass allowed.
 *
 * Actions: gate_submit, gate_decide, gate_pending, gate_history, gate_configure
 */

import { eventBus } from "./EventBus.js";
import { auditEngine } from "./AuditEngine.js";
import { approvalWorkflowEngine, type ApprovalEntityType } from "./ApprovalWorkflowEngine.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type RiskCategory = "collision" | "overload" | "chatter" | "thermal" | "tool_breakage" | "surface_finish" | "dimensional" | "other";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type ApprovalUrgency = "low" | "normal" | "high" | "critical";
export type GateDecisionType = "approved" | "rejected" | "modification_required";
export type GateStatus = "pending" | "in_review" | "approved" | "rejected" | "modification_required" | "escalated" | "expired";

/**
 * Explanation for a specific parameter choice in generated code.
 */
export interface ParameterExplanation {
  parameter: string;           // e.g., "spindle_speed", "feed_rate", "depth_of_cut"
  value: string | number;      // The chosen value
  unit?: string;               // e.g., "RPM", "mm/min", "mm"
  reasoning: string;           // Why this value was chosen
  source?: string;             // Data source (tribal knowledge, calculation, ML model)
  alternatives?: {             // Other values considered
    value: string | number;
    reason_rejected: string;
  }[];
  confidence: number;          // 0-100 confidence in this choice
  warning?: string;            // Any concerns about this choice
}

/**
 * Individual risk factor assessment.
 */
export interface RiskFactor {
  category: RiskCategory;
  severity: RiskSeverity;
  probability: number;         // 0-1 likelihood
  description: string;
  mitigation?: string;         // Suggested mitigation if risk is accepted
  detected_at?: string;        // Line/block in G-code where risk was detected
}

/**
 * Complete risk assessment for generated G-code.
 */
export interface RiskAssessment {
  overall_risk: RiskSeverity;
  risk_score: number;          // 0-100 (higher = more risk)
  factors: RiskFactor[];
  requires_escalation: boolean;
  escalation_reason?: string;
  collision_check: {
    performed: boolean;
    result: "pass" | "fail" | "warning" | "not_checked";
    details?: string;
  };
  overload_check: {
    performed: boolean;
    max_force_percent: number;
    result: "pass" | "fail" | "warning" | "not_checked";
    details?: string;
  };
  chatter_check: {
    performed: boolean;
    stability_margin: number;
    result: "pass" | "fail" | "warning" | "not_checked";
    details?: string;
  };
  thermal_check: {
    performed: boolean;
    max_temp_c: number;
    result: "pass" | "fail" | "warning" | "not_checked";
    details?: string;
  };
}

/**
 * Diff between generated code and baseline.
 */
export interface CodeDiff {
  has_baseline: boolean;
  baseline_id?: string;
  baseline_name?: string;
  additions: number;
  deletions: number;
  changes: DiffChunk[];
  similarity_percent: number;
}

export interface DiffChunk {
  line_start: number;
  line_end: number;
  type: "addition" | "deletion" | "modification";
  old_content?: string;
  new_content?: string;
  significance: "low" | "medium" | "high";
  explanation?: string;
}

/**
 * Request to submit AI-generated code for approval.
 */
export interface ApprovalRequest {
  requestId: string;
  programContent: string;
  programName: string;
  aiConfidence: number;        // 0-100
  explanations: ParameterExplanation[];
  riskAssessment: RiskAssessment;
  suggestedReviewer?: string;
  urgency: ApprovalUrgency;
  metadata: {
    machine_id?: string;
    material?: string;
    part_number?: string;
    operation_type?: string;
    cam_system?: string;
    generated_by: string;      // AI model/version that generated
    generation_timestamp: string;
    source_context?: string;   // What triggered generation
  };
  baseline?: {
    program_id: string;
    program_name: string;
    content: string;
  };
}

/**
 * Stored approval gate instance.
 */
export interface GateInstance {
  id: string;
  request: ApprovalRequest;
  status: GateStatus;
  diff?: CodeDiff;
  submitted_by: string;
  submitted_at: string;
  reviewer?: string;
  reviewed_at?: string;
  decision?: GateDecisionType;
  comments?: string;
  modifications?: ModificationRequest[];
  escalation_chain: EscalationRecord[];
  approval_instance_id?: string;  // Link to ApprovalWorkflowEngine
  expires_at?: string;
  audit_trail: AuditRecord[];
}

/**
 * Decision on an approval request.
 */
export interface ApprovalDecision {
  requestId: string;
  decision: GateDecisionType;
  reviewer: string;
  reviewedAt: string;
  comments?: string;
  modifications?: ModificationRequest[];
  overrideRisks?: string[];    // Which risks reviewer explicitly accepts
  signoff?: {
    certification?: string;    // e.g., "AS9100", "ISO 13485"
    signature_hash?: string;   // Electronic signature
  };
}

export interface ModificationRequest {
  id: string;
  parameter: string;
  current_value: string | number;
  requested_value: string | number;
  reason: string;
  priority: "required" | "recommended";
}

export interface EscalationRecord {
  timestamp: string;
  from_reviewer: string;
  to_reviewer: string;
  reason: string;
  escalation_level: number;
}

export interface AuditRecord {
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
}

export interface GateConfiguration {
  auto_approve_threshold: number;        // Confidence above this can auto-approve (default: 99)
  require_escalation_above_risk: RiskSeverity;  // Risk level requiring escalation
  max_pending_hours: number;             // Hours before pending request expires
  require_dual_approval_for_critical: boolean;
  escalation_path: string[];             // Ordered list of reviewer roles
  compliance_standards: string[];        // e.g., ["AS9100", "ISO 13485"]
}

export interface GateStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  modifications_required: number;
  escalated: number;
  expired: number;
  avg_review_time_hours: number;
  approval_rate_percent: number;
  escalation_rate_percent: number;
  risk_distribution: Record<RiskSeverity, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: GateConfiguration = {
  auto_approve_threshold: 99,  // Effectively disabled — human review required
  require_escalation_above_risk: "high",
  max_pending_hours: 72,
  require_dual_approval_for_critical: true,
  escalation_path: ["programmer", "lead_programmer", "shop_manager", "engineering_manager"],
  compliance_standards: ["AS9100", "ISO 13485"],
};

const RISK_WEIGHTS: Record<RiskCategory, number> = {
  collision: 40,
  tool_breakage: 30,
  overload: 25,
  chatter: 15,
  thermal: 15,
  surface_finish: 10,
  dimensional: 10,
  other: 5,
};

const SEVERITY_MULTIPLIERS: Record<RiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 10,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

let requestSeq = 0;
let modificationSeq = 0;

export class AIGeneratedCodeApprovalGateEngine {
  private instances: Map<string, GateInstance> = new Map();
  private config: GateConfiguration = { ...DEFAULT_CONFIG };

  constructor() {
    this.setupApprovalWorkflow();
  }

  /**
   * Configure the AI code approval workflow in ApprovalWorkflowEngine.
   */
  private setupApprovalWorkflow(): void {
    try {
      approvalWorkflowEngine.configureWorkflow({
        entity_type: "job" as ApprovalEntityType,  // Using "job" as closest match
        name: "AI Generated Code Approval",
        description: "Human-in-the-loop approval for AI-generated G-code programs",
        steps: [
          {
            step_number: 1,
            role_required: "programmer",
            action_label: "Review AI-generated G-code for safety and correctness",
            timeout_hours: 24,
          },
          {
            step_number: 2,
            role_required: "lead_programmer",
            action_label: "Secondary review for high-risk programs",
            timeout_hours: 48,
          },
        ],
        created_by: "system",
      });
    } catch {
      // Workflow may already exist
    }
  }

  /**
   * Submit AI-generated G-code for human approval.
   * This is the ONLY way AI-generated code should reach operators.
   */
  async submit(input: {
    programContent: string;
    programName: string;
    aiConfidence: number;
    explanations: ParameterExplanation[];
    riskAssessment: RiskAssessment;
    submittedBy: string;
    urgency?: ApprovalUrgency;
    suggestedReviewer?: string;
    metadata: ApprovalRequest["metadata"];
    baseline?: ApprovalRequest["baseline"];
  }): Promise<GateInstance> {
    // Validate inputs
    if (!input.programContent || input.programContent.trim().length === 0) {
      throw new Error("Program content cannot be empty");
    }
    if (input.aiConfidence < 0 || input.aiConfidence > 100) {
      throw new Error("AI confidence must be between 0 and 100");
    }
    if (!input.metadata?.generated_by) {
      throw new Error("metadata.generated_by is required for traceability");
    }

    const requestId = `agc-${++requestSeq}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    // Calculate diff against baseline if provided
    const diff = input.baseline
      ? this.calculateDiff(input.programContent, input.baseline.content, input.baseline.program_id, input.baseline.program_name)
      : undefined;

    // Determine if escalation is needed
    const needsEscalation = this.determineEscalation(input.riskAssessment);

    const request: ApprovalRequest = {
      requestId,
      programContent: input.programContent,
      programName: input.programName,
      aiConfidence: input.aiConfidence,
      explanations: input.explanations,
      riskAssessment: input.riskAssessment,
      suggestedReviewer: input.suggestedReviewer,
      urgency: input.urgency ?? "normal",
      metadata: {
        ...input.metadata,
        generation_timestamp: input.metadata.generation_timestamp ?? now,
      },
      baseline: input.baseline,
    };

    const instance: GateInstance = {
      id: requestId,
      request,
      status: needsEscalation ? "escalated" : "pending",
      diff,
      submitted_by: input.submittedBy,
      submitted_at: now,
      escalation_chain: needsEscalation
        ? [{
            timestamp: now,
            from_reviewer: "system",
            to_reviewer: this.config.escalation_path[1] ?? "lead_programmer",
            reason: input.riskAssessment.escalation_reason ?? "Risk level requires escalation",
            escalation_level: 1,
          }]
        : [],
      audit_trail: [{
        timestamp: now,
        action: "submitted",
        actor: input.submittedBy,
        details: {
          ai_confidence: input.aiConfidence,
          risk_score: input.riskAssessment.risk_score,
          overall_risk: input.riskAssessment.overall_risk,
          program_lines: input.programContent.split("\n").length,
        },
      }],
      expires_at: new Date(Date.now() + this.config.max_pending_hours * 3600000).toISOString(),
    };

    this.instances.set(requestId, instance);
    persistenceBridge.persist("ai_code_approval_gates", requestId, instance as any);

    // Publish event for monitoring
    await eventBus.publish("ai_code_gate.submitted", {
      request_id: requestId,
      program_name: input.programName,
      ai_confidence: input.aiConfidence,
      risk_score: input.riskAssessment.risk_score,
      overall_risk: input.riskAssessment.overall_risk,
      needs_escalation: needsEscalation,
    }, { category: "quality", source: "AIGeneratedCodeApprovalGateEngine" });

    // Compliance audit
    auditEngine.log("safety", "ai_code_submitted", input.submittedBy, {
      request_id: requestId,
      program_name: input.programName,
      ai_confidence: input.aiConfidence,
      risk_assessment: {
        overall: input.riskAssessment.overall_risk,
        score: input.riskAssessment.risk_score,
        factors: input.riskAssessment.factors.length,
      },
      machine_id: input.metadata.machine_id,
      generated_by: input.metadata.generated_by,
    }, {
      severity: needsEscalation ? "warning" : "info",
      resource_type: "ai_generated_program",
      resource_id: requestId,
    });

    return instance;
  }

  /**
   * Record a human decision on an AI-generated code approval request.
   */
  async decide(input: {
    requestId: string;
    decision: GateDecisionType;
    reviewer: string;
    reviewerRoles: string[];
    comments?: string;
    modifications?: Omit<ModificationRequest, "id">[];
    overrideRisks?: string[];
    signoff?: ApprovalDecision["signoff"];
  }): Promise<GateInstance> {
    const instance = this.instances.get(input.requestId);
    if (!instance) {
      throw new Error(`Approval request '${input.requestId}' not found`);
    }

    if (instance.status === "approved" || instance.status === "rejected" || instance.status === "expired") {
      throw new Error(`Cannot decide on request in status '${instance.status}'`);
    }

    // Verify reviewer has appropriate role
    const requiredRole = instance.status === "escalated"
      ? this.config.escalation_path[instance.escalation_chain.length] ?? "engineering_manager"
      : "programmer";

    if (!input.reviewerRoles.includes(requiredRole) && !input.reviewerRoles.includes("shop_manager") && !input.reviewerRoles.includes("admin")) {
      throw new Error(`Reviewer '${input.reviewer}' lacks required role '${requiredRole}'. Has roles: [${input.reviewerRoles.join(", ")}]`);
    }

    // Self-review blocked for critical risk
    if (instance.request.riskAssessment.overall_risk === "critical" && instance.submitted_by === input.reviewer) {
      throw new Error("Self-review not allowed for critical-risk programs. Different reviewer required.");
    }

    const now = new Date().toISOString();

    // Process modifications if decision requires them
    const modifications = input.modifications?.map(m => ({
      ...m,
      id: `mod-${++modificationSeq}-${Date.now().toString(36)}`,
    }));

    // Update instance
    instance.status = input.decision === "approved" ? "approved"
      : input.decision === "rejected" ? "rejected"
      : "modification_required";
    instance.reviewer = input.reviewer;
    instance.reviewed_at = now;
    instance.decision = input.decision;
    instance.comments = input.comments;
    instance.modifications = modifications;

    // Add to audit trail
    instance.audit_trail.push({
      timestamp: now,
      action: `decision_${input.decision}`,
      actor: input.reviewer,
      details: {
        decision: input.decision,
        comments: input.comments,
        modifications_count: modifications?.length ?? 0,
        overridden_risks: input.overrideRisks,
        signoff: input.signoff,
      },
    });

    this.instances.set(input.requestId, instance);
    persistenceBridge.persist("ai_code_approval_gates", input.requestId, instance as any);

    // Publish decision event
    await eventBus.publish(`ai_code_gate.${input.decision}`, {
      request_id: input.requestId,
      program_name: instance.request.programName,
      reviewer: input.reviewer,
      decision: input.decision,
      ai_confidence: instance.request.aiConfidence,
      risk_score: instance.request.riskAssessment.risk_score,
    }, { category: "quality", source: "AIGeneratedCodeApprovalGateEngine" });

    // Compliance audit with severity based on decision
    const severity = input.decision === "rejected" ? "warning"
      : (input.overrideRisks && input.overrideRisks.length > 0) ? "warning"
      : "info";

    auditEngine.log("safety", `ai_code_${input.decision}`, input.reviewer, {
      request_id: input.requestId,
      program_name: instance.request.programName,
      decision: input.decision,
      comments: input.comments,
      modifications: modifications?.length ?? 0,
      overridden_risks: input.overrideRisks,
      compliance_signoff: input.signoff,
      review_time_hours: this.calculateReviewTime(instance.submitted_at, now),
    }, {
      severity,
      resource_type: "ai_generated_program",
      resource_id: input.requestId,
    });

    return instance;
  }

  /**
   * Escalate a pending request to the next reviewer in the chain.
   */
  async escalate(requestId: string, escalatedBy: string, reason: string): Promise<GateInstance> {
    const instance = this.instances.get(requestId);
    if (!instance) {
      throw new Error(`Approval request '${requestId}' not found`);
    }

    if (instance.status !== "pending" && instance.status !== "in_review" && instance.status !== "escalated") {
      throw new Error(`Cannot escalate request in status '${instance.status}'`);
    }

    const currentLevel = instance.escalation_chain.length;
    const nextLevel = currentLevel + 1;

    if (nextLevel >= this.config.escalation_path.length) {
      throw new Error("Maximum escalation level reached. Request must be approved or rejected.");
    }

    const now = new Date().toISOString();
    const toReviewer = this.config.escalation_path[nextLevel];

    instance.status = "escalated";
    instance.escalation_chain.push({
      timestamp: now,
      from_reviewer: escalatedBy,
      to_reviewer: toReviewer,
      reason,
      escalation_level: nextLevel,
    });

    instance.audit_trail.push({
      timestamp: now,
      action: "escalated",
      actor: escalatedBy,
      details: {
        from_level: currentLevel,
        to_level: nextLevel,
        to_reviewer: toReviewer,
        reason,
      },
    });

    this.instances.set(requestId, instance);
    persistenceBridge.persist("ai_code_approval_gates", requestId, instance as any);

    await eventBus.publish("ai_code_gate.escalated", {
      request_id: requestId,
      program_name: instance.request.programName,
      escalation_level: nextLevel,
      to_reviewer: toReviewer,
      reason,
    }, { category: "quality", source: "AIGeneratedCodeApprovalGateEngine" });

    auditEngine.log("safety", "ai_code_escalated", escalatedBy, {
      request_id: requestId,
      program_name: instance.request.programName,
      escalation_level: nextLevel,
      reason,
    }, {
      severity: "warning",
      resource_type: "ai_generated_program",
      resource_id: requestId,
    });

    return instance;
  }

  /**
   * Get all pending approval requests, optionally filtered.
   */
  getPending(filters?: {
    reviewer?: string;
    urgency?: ApprovalUrgency;
    minRiskScore?: number;
    includeEscalated?: boolean;
  }): GateInstance[] {
    const result: GateInstance[] = [];
    const now = Date.now();

    for (const instance of this.instances.values()) {
      // Check status
      if (instance.status !== "pending" && instance.status !== "in_review") {
        if (!filters?.includeEscalated || instance.status !== "escalated") {
          continue;
        }
      }

      // Check expiration
      if (instance.expires_at && new Date(instance.expires_at).getTime() < now) {
        instance.status = "expired";
        this.instances.set(instance.id, instance);
        continue;
      }

      // Apply filters
      if (filters?.urgency && instance.request.urgency !== filters.urgency) continue;
      if (filters?.minRiskScore && instance.request.riskAssessment.risk_score < filters.minRiskScore) continue;
      if (filters?.reviewer && instance.request.suggestedReviewer !== filters.reviewer) continue;

      result.push(instance);
    }

    // Sort by urgency (critical first), then risk score (highest first), then submission time (oldest first)
    const urgencyOrder: Record<ApprovalUrgency, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return result.sort((a, b) => {
      const ua = urgencyOrder[a.request.urgency];
      const ub = urgencyOrder[b.request.urgency];
      if (ua !== ub) return ua - ub;

      const ra = a.request.riskAssessment.risk_score;
      const rb = b.request.riskAssessment.risk_score;
      if (ra !== rb) return rb - ra;

      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    });
  }

  /**
   * Get a specific approval request by ID.
   */
  getRequest(requestId: string): GateInstance | null {
    return this.instances.get(requestId) ?? null;
  }

  /**
   * Get approval history for a specific program or part.
   */
  getHistory(filters: {
    programName?: string;
    partNumber?: string;
    machineId?: string;
    status?: GateStatus;
    since?: string;
    limit?: number;
  }): GateInstance[] {
    const result: GateInstance[] = [];

    for (const instance of this.instances.values()) {
      if (filters.programName && instance.request.programName !== filters.programName) continue;
      if (filters.partNumber && instance.request.metadata.part_number !== filters.partNumber) continue;
      if (filters.machineId && instance.request.metadata.machine_id !== filters.machineId) continue;
      if (filters.status && instance.status !== filters.status) continue;
      if (filters.since && instance.submitted_at < filters.since) continue;

      result.push(instance);
    }

    // Sort by submission time (newest first)
    result.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    if (filters.limit) {
      return result.slice(0, filters.limit);
    }
    return result;
  }

  /**
   * Update gate configuration.
   */
  configure(updates: Partial<GateConfiguration>): GateConfiguration {
    if (updates.auto_approve_threshold !== undefined) {
      if (updates.auto_approve_threshold < 95) {
        throw new Error("auto_approve_threshold cannot be below 95 for safety reasons");
      }
      this.config.auto_approve_threshold = updates.auto_approve_threshold;
    }
    if (updates.require_escalation_above_risk) {
      this.config.require_escalation_above_risk = updates.require_escalation_above_risk;
    }
    if (updates.max_pending_hours !== undefined) {
      if (updates.max_pending_hours < 1) {
        throw new Error("max_pending_hours must be at least 1");
      }
      this.config.max_pending_hours = updates.max_pending_hours;
    }
    if (updates.require_dual_approval_for_critical !== undefined) {
      this.config.require_dual_approval_for_critical = updates.require_dual_approval_for_critical;
    }
    if (updates.escalation_path) {
      if (updates.escalation_path.length < 2) {
        throw new Error("escalation_path must have at least 2 levels");
      }
      this.config.escalation_path = updates.escalation_path;
    }
    if (updates.compliance_standards) {
      this.config.compliance_standards = updates.compliance_standards;
    }

    auditEngine.log("config", "ai_code_gate_configured", "system", {
      updates,
      new_config: this.config,
    });

    return { ...this.config };
  }

  /**
   * Get current configuration.
   */
  getConfiguration(): GateConfiguration {
    return { ...this.config };
  }

  /**
   * Get statistics about approval gate usage.
   */
  getStats(): GateStats {
    let total = 0, pending = 0, approved = 0, rejected = 0;
    let modifications = 0, escalated = 0, expired = 0;
    const riskDist: Record<RiskSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const reviewTimes: number[] = [];

    for (const instance of this.instances.values()) {
      total++;
      riskDist[instance.request.riskAssessment.overall_risk]++;

      switch (instance.status) {
        case "pending":
        case "in_review":
          pending++;
          break;
        case "approved":
          approved++;
          if (instance.reviewed_at) {
            reviewTimes.push(this.calculateReviewTime(instance.submitted_at, instance.reviewed_at));
          }
          break;
        case "rejected":
          rejected++;
          if (instance.reviewed_at) {
            reviewTimes.push(this.calculateReviewTime(instance.submitted_at, instance.reviewed_at));
          }
          break;
        case "modification_required":
          modifications++;
          break;
        case "escalated":
          escalated++;
          break;
        case "expired":
          expired++;
          break;
      }
    }

    const avgReviewTime = reviewTimes.length > 0
      ? Math.round((reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) * 10) / 10
      : 0;

    const completed = approved + rejected + modifications;
    const approvalRate = completed > 0 ? Math.round((approved / completed) * 1000) / 10 : 0;
    const escalationRate = total > 0 ? Math.round((escalated / total) * 1000) / 10 : 0;

    return {
      total_requests: total,
      pending,
      approved,
      rejected,
      modifications_required: modifications,
      escalated,
      expired,
      avg_review_time_hours: avgReviewTime,
      approval_rate_percent: approvalRate,
      escalation_rate_percent: escalationRate,
      risk_distribution: riskDist,
    };
  }

  /**
   * Assess risk for a G-code program. Helper for callers to build RiskAssessment.
   */
  assessRisk(input: {
    programContent: string;
    machineId?: string;
    material?: string;
    toolDiameter?: number;
    collisionCheckResult?: RiskAssessment["collision_check"];
    forceAnalysisResult?: { max_force_percent: number };
    chatterAnalysisResult?: { stability_margin: number };
    thermalAnalysisResult?: { max_temp_c: number };
    additionalFactors?: Omit<RiskFactor, "category" | "severity">[];
  }): RiskAssessment {
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Collision risk
    const collisionCheck = input.collisionCheckResult ?? {
      performed: false,
      result: "not_checked" as const,
    };
    if (collisionCheck.result === "fail") {
      factors.push({
        category: "collision",
        severity: "critical",
        probability: 0.9,
        description: "Collision detected in toolpath simulation",
        detected_at: collisionCheck.details,
      });
      riskScore += RISK_WEIGHTS.collision * SEVERITY_MULTIPLIERS.critical;
    } else if (collisionCheck.result === "warning") {
      factors.push({
        category: "collision",
        severity: "high",
        probability: 0.4,
        description: "Near-miss detected in toolpath simulation",
        mitigation: "Increase clearance heights and verify fixture setup",
        detected_at: collisionCheck.details,
      });
      riskScore += RISK_WEIGHTS.collision * SEVERITY_MULTIPLIERS.high;
    } else if (collisionCheck.result === "not_checked") {
      factors.push({
        category: "collision",
        severity: "medium",
        probability: 0.2,
        description: "Collision check not performed — manual verification required",
      });
      riskScore += RISK_WEIGHTS.collision * SEVERITY_MULTIPLIERS.medium;
    }

    // Overload risk
    const maxForce = input.forceAnalysisResult?.max_force_percent ?? 0;
    const overloadCheck: RiskAssessment["overload_check"] = {
      performed: input.forceAnalysisResult !== undefined,
      max_force_percent: maxForce,
      result: maxForce > 100 ? "fail" : maxForce > 80 ? "warning" : input.forceAnalysisResult ? "pass" : "not_checked",
    };
    if (maxForce > 100) {
      factors.push({
        category: "overload",
        severity: "critical",
        probability: 0.8,
        description: `Cutting force exceeds spindle/tool capacity (${maxForce.toFixed(0)}%)`,
        mitigation: "Reduce depth of cut or feed rate",
      });
      riskScore += RISK_WEIGHTS.overload * SEVERITY_MULTIPLIERS.critical;
    } else if (maxForce > 80) {
      factors.push({
        category: "overload",
        severity: "high",
        probability: 0.3,
        description: `Cutting force near limit (${maxForce.toFixed(0)}% of capacity)`,
        mitigation: "Consider reducing parameters for safety margin",
      });
      riskScore += RISK_WEIGHTS.overload * SEVERITY_MULTIPLIERS.high;
    }

    // Chatter risk
    const stabilityMargin = input.chatterAnalysisResult?.stability_margin ?? 1.0;
    const chatterCheck: RiskAssessment["chatter_check"] = {
      performed: input.chatterAnalysisResult !== undefined,
      stability_margin: stabilityMargin,
      result: stabilityMargin < 0.8 ? "fail" : stabilityMargin < 1.0 ? "warning" : input.chatterAnalysisResult ? "pass" : "not_checked",
    };
    if (stabilityMargin < 0.8) {
      factors.push({
        category: "chatter",
        severity: "high",
        probability: 0.7,
        description: `Stability margin ${(stabilityMargin * 100).toFixed(0)}% — likely chatter`,
        mitigation: "Reduce spindle speed or depth of cut",
      });
      riskScore += RISK_WEIGHTS.chatter * SEVERITY_MULTIPLIERS.high;
    } else if (stabilityMargin < 1.0) {
      factors.push({
        category: "chatter",
        severity: "medium",
        probability: 0.3,
        description: `Stability margin ${(stabilityMargin * 100).toFixed(0)}% — potential chatter`,
        mitigation: "Monitor during first article",
      });
      riskScore += RISK_WEIGHTS.chatter * SEVERITY_MULTIPLIERS.medium;
    }

    // Thermal risk
    const maxTemp = input.thermalAnalysisResult?.max_temp_c ?? 0;
    const thermalCheck: RiskAssessment["thermal_check"] = {
      performed: input.thermalAnalysisResult !== undefined,
      max_temp_c: maxTemp,
      result: maxTemp > 800 ? "fail" : maxTemp > 600 ? "warning" : input.thermalAnalysisResult ? "pass" : "not_checked",
    };
    if (maxTemp > 800) {
      factors.push({
        category: "thermal",
        severity: "critical",
        probability: 0.6,
        description: `Predicted cutting temperature ${maxTemp.toFixed(0)}C exceeds tool limits`,
        mitigation: "Increase coolant flow or reduce cutting speed",
      });
      riskScore += RISK_WEIGHTS.thermal * SEVERITY_MULTIPLIERS.critical;
    } else if (maxTemp > 600) {
      factors.push({
        category: "thermal",
        severity: "high",
        probability: 0.4,
        description: `Predicted cutting temperature ${maxTemp.toFixed(0)}C is elevated`,
        mitigation: "Verify coolant delivery and consider speed reduction",
      });
      riskScore += RISK_WEIGHTS.thermal * SEVERITY_MULTIPLIERS.high;
    }

    // Additional factors
    if (input.additionalFactors) {
      for (const f of input.additionalFactors) {
        // Determine severity from probability
        const severity: RiskSeverity = f.probability > 0.7 ? "critical"
          : f.probability > 0.4 ? "high"
          : f.probability > 0.2 ? "medium"
          : "low";
        const category = (f as any).category ?? "other";
        factors.push({
          ...f,
          category,
          severity,
        });
        riskScore += (RISK_WEIGHTS[category] ?? RISK_WEIGHTS.other) * SEVERITY_MULTIPLIERS[severity];
      }
    }

    // Normalize score to 0-100
    riskScore = Math.min(100, Math.round(riskScore));

    // Determine overall risk level
    const criticalCount = factors.filter(f => f.severity === "critical").length;
    const highCount = factors.filter(f => f.severity === "high").length;
    const overall: RiskSeverity = criticalCount > 0 ? "critical"
      : highCount >= 2 ? "critical"
      : highCount > 0 ? "high"
      : riskScore > 50 ? "medium"
      : "low";

    // Check if escalation is needed
    const requiresEscalation = this.shouldEscalate(overall);
    const escalationReason = requiresEscalation
      ? `Risk level '${overall}' exceeds threshold '${this.config.require_escalation_above_risk}'`
      : undefined;

    return {
      overall_risk: overall,
      risk_score: riskScore,
      factors,
      requires_escalation: requiresEscalation,
      escalation_reason: escalationReason,
      collision_check: collisionCheck,
      overload_check: overloadCheck,
      chatter_check: chatterCheck,
      thermal_check: thermalCheck,
    };
  }

  /**
   * Generate explanations for G-code parameters. Helper for callers.
   */
  explainParameters(params: {
    parameter: string;
    value: string | number;
    unit?: string;
    reasoning: string;
    source?: string;
    confidence?: number;
    warning?: string;
  }[]): ParameterExplanation[] {
    return params.map(p => ({
      parameter: p.parameter,
      value: p.value,
      unit: p.unit,
      reasoning: p.reasoning,
      source: p.source ?? "ai_calculation",
      confidence: p.confidence ?? 85,
      warning: p.warning,
    }));
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private determineEscalation(risk: RiskAssessment): boolean {
    return risk.requires_escalation || this.shouldEscalate(risk.overall_risk);
  }

  private shouldEscalate(level: RiskSeverity): boolean {
    const levels: RiskSeverity[] = ["low", "medium", "high", "critical"];
    const threshold = levels.indexOf(this.config.require_escalation_above_risk);
    const current = levels.indexOf(level);
    return current >= threshold;
  }

  private calculateDiff(newContent: string, baselineContent: string, baselineId: string, baselineName: string): CodeDiff {
    const newLines = newContent.split("\n");
    const baseLines = baselineContent.split("\n");
    const changes: DiffChunk[] = [];
    let additions = 0;
    let deletions = 0;
    let matches = 0;

    // Simple line-by-line diff (production would use Myers or similar)
    const maxLen = Math.max(newLines.length, baseLines.length);
    for (let i = 0; i < maxLen; i++) {
      const newLine = newLines[i];
      const baseLine = baseLines[i];

      if (newLine === baseLine) {
        matches++;
        continue;
      }

      if (newLine !== undefined && baseLine === undefined) {
        additions++;
        changes.push({
          line_start: i + 1,
          line_end: i + 1,
          type: "addition",
          new_content: newLine,
          significance: this.assessLineSignificance(newLine),
        });
      } else if (newLine === undefined && baseLine !== undefined) {
        deletions++;
        changes.push({
          line_start: i + 1,
          line_end: i + 1,
          type: "deletion",
          old_content: baseLine,
          significance: this.assessLineSignificance(baseLine),
        });
      } else {
        // Modification
        additions++;
        deletions++;
        changes.push({
          line_start: i + 1,
          line_end: i + 1,
          type: "modification",
          old_content: baseLine,
          new_content: newLine,
          significance: this.assessLineSignificance(newLine) === "high" || this.assessLineSignificance(baseLine) === "high"
            ? "high"
            : "medium",
          explanation: this.explainDifference(baseLine, newLine),
        });
      }
    }

    const similarity = maxLen > 0 ? Math.round((matches / maxLen) * 100) : 100;

    return {
      has_baseline: true,
      baseline_id: baselineId,
      baseline_name: baselineName,
      additions,
      deletions,
      changes,
      similarity_percent: similarity,
    };
  }

  private assessLineSignificance(line: string): "low" | "medium" | "high" {
    const trimmed = line.trim().toUpperCase();
    // High significance: motion commands with coordinates, spindle/feed changes
    if (/^G0[01]/.test(trimmed) || /^G[23]/.test(trimmed)) return "high";
    if (/^[XYZUVWABCIJKR][-\d.]/.test(trimmed)) return "high";
    if (/^[SF]\d/.test(trimmed)) return "high";
    if (/^M0[36]/.test(trimmed)) return "high";  // Spindle commands
    if (/^M0[89]/.test(trimmed)) return "high";  // Coolant
    // Medium: tool changes, canned cycles
    if (/^T\d/.test(trimmed) || /^M0?6/.test(trimmed)) return "medium";
    if (/^G8[1-9]/.test(trimmed)) return "medium";
    // Low: comments, blank lines
    return "low";
  }

  private explainDifference(old: string, newLine: string): string | undefined {
    const oldUpper = old.trim().toUpperCase();
    const newUpper = newLine.trim().toUpperCase();

    // Extract F values
    const oldF = oldUpper.match(/F([\d.]+)/)?.[1];
    const newF = newUpper.match(/F([\d.]+)/)?.[1];
    if (oldF && newF && oldF !== newF) {
      return `Feed rate changed from F${oldF} to F${newF}`;
    }

    // Extract S values
    const oldS = oldUpper.match(/S([\d.]+)/)?.[1];
    const newS = newUpper.match(/S([\d.]+)/)?.[1];
    if (oldS && newS && oldS !== newS) {
      return `Spindle speed changed from S${oldS} to S${newS}`;
    }

    return undefined;
  }

  private calculateReviewTime(submitted: string, reviewed: string): number {
    const ms = new Date(reviewed).getTime() - new Date(submitted).getTime();
    return Math.round((ms / 3_600_000) * 10) / 10;
  }
}

export const aiGeneratedCodeApprovalGateEngine = new AIGeneratedCodeApprovalGateEngine();

// ─── Persistence Registration ──────────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "ai_code_approval_gates",
  getMap: () => aiGeneratedCodeApprovalGateEngine["instances"] as Map<string, any>,
  keyField: "id",
});
