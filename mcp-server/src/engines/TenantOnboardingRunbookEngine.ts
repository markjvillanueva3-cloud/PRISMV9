/**
 * TenantOnboardingRunbookEngine — U-LPR-OPS-ONBOARD
 *
 * Tenant-onboarding runbook state machine:
 *   MOU → KMS key provision → ACL setup → RBAC assignment →
 *   data-residency routing → telemetry mTLS cert issuance
 *
 * Each step declares prerequisites. The engine enforces dependency ordering
 * (a step cannot start until all prerequisites are complete), tracks per-tenant
 * progress, records evidence references for auditability, and generates a
 * readiness report with blocked/stalled/failed tenants surfaced.
 *
 * State per step: not_started → in_progress → complete | failed | blocked
 * - blocked ≠ failed: blocked means prerequisites unmet; failed is a terminal
 *   hard failure requiring remediation and explicit reset.
 *
 * Audit log captures every state transition with actor, timestamp, and notes
 * so the onboarding trail is reconstructible for compliance review.
 *
 * Reference: NIST SP 800-53 AC-2 (Account Management), AC-3 (Access Enforcement),
 *            IA-5 (Authenticator Management), SC-12 (Cryptographic Key Establishment)
 * Reference: ISO/IEC 27001 Annex A.9 (Access control), A.10 (Cryptography)
 * Reference: SOC 2 CC6.1 (Logical access), CC6.3 (Role-based access)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-ONBOARD
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { log } from "../utils/Logger.js";

export type TenantTier = "enterprise" | "mid-market" | "smb";

export type OnboardingStepId =
  | "mou"
  | "kms_key_provision"
  | "acl_setup"
  | "rbac_assignment"
  | "residency_routing"
  | "mtls_cert_issuance";

export type StepStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "failed"
  | "blocked";

export type TenantStatus = "pending" | "in_progress" | "active" | "suspended";

export interface Tenant {
  id: string;
  name: string;
  tier: TenantTier;
  residency_region: string; // e.g., "us-east", "eu-west", "ap-south"
  mou_reference: string;    // Contract/MOU identifier
  primary_contact: string;
  registered_at: number;
  status: TenantStatus;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  name: string;
  order: number;
  prerequisite_ids: OnboardingStepId[];
  manual: boolean;
  validators: string[]; // Human-readable validation checks to perform
  description: string;
}

export interface TenantStepState {
  tenant_id: string;
  step_id: OnboardingStepId;
  status: StepStatus;
  started_at: number | null;
  completed_at: number | null;
  actor: string | null;
  evidence_ref: string | null;
  notes: string;
}

export interface OnboardingEvent {
  event_id: string;
  tenant_id: string;
  step_id: OnboardingStepId;
  from_status: StepStatus;
  to_status: StepStatus;
  actor: string;
  timestamp: number;
  notes: string;
}

export interface TenantOnboardingStatus {
  tenant_id: string;
  overall_status: TenantStatus;
  current_step: OnboardingStepId | null;
  completed_step_ids: OnboardingStepId[];
  failed_step_ids: OnboardingStepId[];
  blocked_step_ids: OnboardingStepId[];
  percent_complete: number;
  blocked_on: OnboardingStepId[]; // steps waiting for prerequisites
  next_actionable: OnboardingStepId | null;
}

export interface OnboardingReport {
  generated_at: number;
  total_tenants: number;
  tenants_by_status: Record<TenantStatus, number>;
  tenants_active: string[];
  tenants_stalled: string[]; // in_progress with no movement in 7 days
  tenants_failed: string[];
  step_completion_rates: Record<OnboardingStepId, { complete: number; failed: number; total: number }>;
  recommendations: string[];
}

export interface OnboardingStats {
  tenants_registered: number;
  tenants_active: number;
  tenants_in_progress: number;
  steps_executed: number;
  steps_failed: number;
  avg_steps_per_tenant: number;
  avg_time_to_active_hours: number | null;
}

export const DEFAULT_RUNBOOK: OnboardingStep[] = [
  {
    id: "mou",
    name: "Master Service Agreement / MOU signed",
    order: 1,
    prerequisite_ids: [],
    manual: true,
    validators: [
      "MOU document countersigned by tenant legal + PRISM legal",
      "Contract reference number recorded",
      "Term, renewal, and data-handling clauses reviewed",
    ],
    description: "Execute contract establishing service terms, liability, and data-handling agreements.",
  },
  {
    id: "kms_key_provision",
    name: "Per-tenant KMS key material provisioned",
    order: 2,
    prerequisite_ids: ["mou"],
    manual: false,
    validators: [
      "KMS CMK created with tenant-specific alias",
      "Key policy restricts use to tenant IAM principals only",
      "Key rotation policy configured (90-day auto-rotate)",
      "Key ARN recorded in tenant registry",
    ],
    description: "Provision dedicated encryption keys so tenant data is cryptographically isolated at rest.",
  },
  {
    id: "acl_setup",
    name: "Network and resource ACLs configured",
    order: 3,
    prerequisite_ids: ["kms_key_provision"],
    manual: false,
    validators: [
      "Network ACL allows tenant egress to allowlisted destinations only",
      "Resource-level ACLs scope S3/DB access to tenant principals",
      "Cross-tenant access explicitly denied",
    ],
    description: "Establish network and storage boundaries so tenant traffic cannot reach other tenants.",
  },
  {
    id: "rbac_assignment",
    name: "Role-based access assignments",
    order: 4,
    prerequisite_ids: ["acl_setup"],
    manual: true,
    validators: [
      "Tenant admin role created and assigned to primary contact",
      "Non-admin roles (operator, viewer) defined per org policy",
      "MFA enforced for all admin-capable roles",
      "Role assignments recorded in audit store",
    ],
    description: "Assign roles so humans and service accounts have least-privilege access to tenant resources.",
  },
  {
    id: "residency_routing",
    name: "Data-residency routing configured",
    order: 5,
    prerequisite_ids: ["rbac_assignment"],
    manual: false,
    validators: [
      "Region routing table points tenant traffic to declared residency region",
      "Cross-region replication disabled for regulated data categories",
      "DNS/load-balancer steering verified via canary probe from declared region",
    ],
    description: "Route tenant traffic and data to the contracted residency region.",
  },
  {
    id: "mtls_cert_issuance",
    name: "Telemetry mTLS certificate issued",
    order: 6,
    prerequisite_ids: ["residency_routing"],
    manual: false,
    validators: [
      "Per-tenant X.509 client cert issued by internal CA",
      "Cert pinned to tenant ID via SAN/URI",
      "Cert distributed to tenant agent over approved OOB channel",
      "Cert auto-renewal configured (≤ 90-day validity)",
    ],
    description: "Issue mutual-TLS credentials so tenant telemetry is authenticated end-to-end.",
  },
];

const STALL_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TenantOnboardingRunbookEngine {
  private runbook: OnboardingStep[] = [...DEFAULT_RUNBOOK];
  private tenants: Map<string, Tenant> = new Map();
  private states: Map<string, TenantStepState[]> = new Map(); // tenant_id → step states
  private auditLog: OnboardingEvent[] = [];
  private eventCounter: number = 0;

  /**
   * Register a new tenant. Initializes all runbook step states to not_started.
   */
  registerTenant(tenant: Omit<Tenant, "registered_at" | "status"> & { registered_at?: number; status?: TenantStatus }): Tenant {
    if (!tenant.id) throw new Error("tenant.id required");
    if (this.tenants.has(tenant.id)) throw new Error("Tenant already registered: " + tenant.id);
    if (!tenant.residency_region) throw new Error("residency_region required");
    if (!tenant.mou_reference) throw new Error("mou_reference required");
    const full: Tenant = {
      id: tenant.id,
      name: tenant.name,
      tier: tenant.tier,
      residency_region: tenant.residency_region,
      mou_reference: tenant.mou_reference,
      primary_contact: tenant.primary_contact,
      registered_at: tenant.registered_at ?? Date.now(),
      status: tenant.status ?? "pending",
    };
    this.tenants.set(full.id, full);
    const initial: TenantStepState[] = this.runbook.map(step => ({
      tenant_id: full.id,
      step_id: step.id,
      status: "not_started",
      started_at: null,
      completed_at: null,
      actor: null,
      evidence_ref: null,
      notes: "",
    }));
    this.states.set(full.id, initial);
    log.info("[ONBOARD] Registered tenant: " + full.id + " (" + full.tier + ", " + full.residency_region + ")");
    return full;
  }

  getTenant(id: string): Tenant | null {
    return this.tenants.get(id) ?? null;
  }

  listTenants(filter?: { tier?: TenantTier; status?: TenantStatus; region?: string }): Tenant[] {
    let out = Array.from(this.tenants.values());
    if (filter?.tier) out = out.filter(t => t.tier === filter.tier);
    if (filter?.status) out = out.filter(t => t.status === filter.status);
    if (filter?.region) out = out.filter(t => t.residency_region === filter.region);
    return out;
  }

  /**
   * Start a step. Enforces prerequisite dependencies — blocked if any
   * prerequisite is not complete.
   */
  startStep(tenantId: string, stepId: OnboardingStepId, actor: string): TenantStepState {
    const states = this.requireStates(tenantId);
    const state = this.requireStep(states, stepId);
    if (state.status === "complete") {
      throw new Error("Step already complete: " + stepId);
    }
    if (state.status === "in_progress") {
      throw new Error("Step already in progress: " + stepId);
    }
    const step = this.requireStepDef(stepId);
    for (const prereqId of step.prerequisite_ids) {
      const prereqState = this.requireStep(states, prereqId);
      if (prereqState.status !== "complete") {
        const updated = this.transition(state, "blocked", actor, "");
        this.emitEvent(tenantId, stepId, state.status, "blocked", actor, "Prerequisite not complete: " + prereqId);
        Object.assign(state, updated);
        throw new Error("Prerequisite not complete: " + prereqId + " (required before " + stepId + ")");
      }
    }
    const prior = state.status;
    const updated: TenantStepState = {
      ...state,
      status: "in_progress",
      started_at: Date.now(),
      actor,
    };
    Object.assign(state, updated);
    this.emitEvent(tenantId, stepId, prior, "in_progress", actor, "Step started");
    this.maybeUpdateTenantStatus(tenantId);
    log.info("[ONBOARD] " + tenantId + "/" + stepId + ": started by " + actor);
    return { ...state };
  }

  /**
   * Complete a step. Must be in_progress first; transitions to complete.
   */
  completeStep(tenantId: string, stepId: OnboardingStepId, actor: string, evidenceRef: string, notes: string): TenantStepState {
    const states = this.requireStates(tenantId);
    const state = this.requireStep(states, stepId);
    if (state.status !== "in_progress") {
      throw new Error("Step must be in_progress to complete (current: " + state.status + ")");
    }
    if (!evidenceRef) throw new Error("evidence_ref required (link to ticket, cert serial, audit record, etc.)");
    const prior = state.status;
    const updated: TenantStepState = {
      ...state,
      status: "complete",
      completed_at: Date.now(),
      actor,
      evidence_ref: evidenceRef,
      notes,
    };
    Object.assign(state, updated);
    this.emitEvent(tenantId, stepId, prior, "complete", actor, "Evidence: " + evidenceRef);
    this.maybeUpdateTenantStatus(tenantId);
    log.info("[ONBOARD] " + tenantId + "/" + stepId + ": complete (evidence=" + evidenceRef + ")");
    return { ...state };
  }

  /**
   * Fail a step. Transitions to failed — a terminal state requiring reset.
   */
  failStep(tenantId: string, stepId: OnboardingStepId, actor: string, reason: string): TenantStepState {
    const states = this.requireStates(tenantId);
    const state = this.requireStep(states, stepId);
    if (state.status === "complete") {
      throw new Error("Cannot fail a completed step: " + stepId);
    }
    if (!reason) throw new Error("reason required");
    const prior = state.status;
    const updated: TenantStepState = {
      ...state,
      status: "failed",
      completed_at: Date.now(),
      actor,
      notes: reason,
    };
    Object.assign(state, updated);
    this.emitEvent(tenantId, stepId, prior, "failed", actor, reason);
    this.maybeUpdateTenantStatus(tenantId);
    log.warn("[ONBOARD] " + tenantId + "/" + stepId + ": FAILED (" + reason + ")");
    return { ...state };
  }

  /**
   * Reset a failed step back to not_started so it can be retried.
   */
  resetStep(tenantId: string, stepId: OnboardingStepId, actor: string, notes: string): TenantStepState {
    const states = this.requireStates(tenantId);
    const state = this.requireStep(states, stepId);
    if (state.status !== "failed") {
      throw new Error("Only failed steps can be reset (current: " + state.status + ")");
    }
    const prior = state.status;
    const updated: TenantStepState = {
      ...state,
      status: "not_started",
      started_at: null,
      completed_at: null,
      evidence_ref: null,
      notes,
    };
    Object.assign(state, updated);
    this.emitEvent(tenantId, stepId, prior, "not_started", actor, "Reset: " + notes);
    this.maybeUpdateTenantStatus(tenantId);
    return { ...state };
  }

  /**
   * Get full onboarding posture for a tenant (current step, blockers, etc).
   */
  getTenantStatus(tenantId: string): TenantOnboardingStatus {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error("Unknown tenant: " + tenantId);
    const states = this.requireStates(tenantId);
    const completed = states.filter(s => s.status === "complete").map(s => s.step_id);
    const failed = states.filter(s => s.status === "failed").map(s => s.step_id);
    const blocked = states.filter(s => s.status === "blocked").map(s => s.step_id);
    const inProgress = states.find(s => s.status === "in_progress");
    const nextActionable = this.findNextActionable(states);
    const percent = (completed.length / this.runbook.length) * 100;
    const blockedOn: OnboardingStepId[] = [];
    for (const step of this.runbook) {
      const state = states.find(s => s.step_id === step.id)!;
      if (state.status !== "not_started" && state.status !== "blocked") continue;
      for (const pId of step.prerequisite_ids) {
        const pState = states.find(s => s.step_id === pId)!;
        if (pState.status !== "complete" && !blockedOn.includes(step.id)) {
          blockedOn.push(step.id);
        }
      }
    }
    return {
      tenant_id: tenantId,
      overall_status: tenant.status,
      current_step: inProgress?.step_id ?? null,
      completed_step_ids: completed,
      failed_step_ids: failed,
      blocked_step_ids: blocked,
      percent_complete: percent,
      blocked_on: blockedOn,
      next_actionable: nextActionable,
    };
  }

  getAuditLog(tenantId?: string, limit?: number): OnboardingEvent[] {
    let out = tenantId ? this.auditLog.filter(e => e.tenant_id === tenantId) : [...this.auditLog];
    if (limit && limit > 0) out = out.slice(-limit);
    return out;
  }

  /**
   * Generate aggregate readiness report across all tenants.
   */
  generateReport(now: number = Date.now()): OnboardingReport {
    const tenants = Array.from(this.tenants.values());
    const byStatus: Record<TenantStatus, number> = { pending: 0, in_progress: 0, active: 0, suspended: 0 };
    const active: string[] = [];
    const stalled: string[] = [];
    const failed: string[] = [];
    for (const t of tenants) {
      byStatus[t.status]++;
      if (t.status === "active") active.push(t.id);
      if (t.status === "in_progress") {
        const last = this.lastActivityForTenant(t.id);
        if (last !== null && now - last > STALL_THRESHOLD_MS) stalled.push(t.id);
      }
      const states = this.states.get(t.id) ?? [];
      if (states.some(s => s.status === "failed")) failed.push(t.id);
    }
    const rates: Record<OnboardingStepId, { complete: number; failed: number; total: number }> = {} as never;
    for (const step of this.runbook) {
      let complete = 0, fail = 0;
      for (const states of this.states.values()) {
        const s = states.find(x => x.step_id === step.id);
        if (!s) continue;
        if (s.status === "complete") complete++;
        if (s.status === "failed") fail++;
      }
      rates[step.id] = { complete, failed: fail, total: tenants.length };
    }
    const recommendations: string[] = [];
    if (stalled.length > 0) recommendations.push("Follow up on " + stalled.length + " stalled tenant(s) (>7d no activity)");
    if (failed.length > 0) recommendations.push("Remediate " + failed.length + " tenant(s) with failed steps");
    for (const step of this.runbook) {
      const r = rates[step.id];
      if (r.failed > r.complete && r.failed > 0) {
        recommendations.push("Step '" + step.id + "' has more failures (" + r.failed + ") than completions (" + r.complete + ") — review runbook");
      }
    }
    if (recommendations.length === 0) recommendations.push("Onboarding pipeline healthy. No action required.");
    return {
      generated_at: now,
      total_tenants: tenants.length,
      tenants_by_status: byStatus,
      tenants_active: active,
      tenants_stalled: stalled,
      tenants_failed: failed,
      step_completion_rates: rates,
      recommendations,
    };
  }

  getStats(): OnboardingStats {
    const tenants = Array.from(this.tenants.values());
    const active = tenants.filter(t => t.status === "active").length;
    const inProgress = tenants.filter(t => t.status === "in_progress").length;
    let stepsExecuted = 0;
    let stepsFailed = 0;
    let totalStepsCompleted = 0;
    let totalTimeToActiveMs = 0;
    let activeTenantsCounted = 0;
    for (const t of tenants) {
      const states = this.states.get(t.id) ?? [];
      for (const s of states) {
        if (s.status === "complete" || s.status === "failed" || s.status === "in_progress") stepsExecuted++;
        if (s.status === "failed") stepsFailed++;
        if (s.status === "complete") totalStepsCompleted++;
      }
      if (t.status === "active") {
        const allComplete = states.filter(s => s.status === "complete");
        if (allComplete.length === this.runbook.length) {
          const lastCompleted = Math.max(...allComplete.map(s => s.completed_at ?? 0));
          if (lastCompleted > 0) {
            totalTimeToActiveMs += lastCompleted - t.registered_at;
            activeTenantsCounted++;
          }
        }
      }
    }
    const avgSteps = tenants.length > 0 ? totalStepsCompleted / tenants.length : 0;
    const avgTimeHours = activeTenantsCounted > 0 ? (totalTimeToActiveMs / activeTenantsCounted) / 3600000 : null;
    return {
      tenants_registered: tenants.length,
      tenants_active: active,
      tenants_in_progress: inProgress,
      steps_executed: stepsExecuted,
      steps_failed: stepsFailed,
      avg_steps_per_tenant: avgSteps,
      avg_time_to_active_hours: avgTimeHours,
    };
  }

  getRunbook(): OnboardingStep[] {
    return this.runbook.map(s => ({ ...s }));
  }

  clearAll(): { tenants_cleared: number; events_cleared: number } {
    const tc = this.tenants.size;
    const ec = this.auditLog.length;
    this.tenants.clear();
    this.states.clear();
    this.auditLog = [];
    this.eventCounter = 0;
    return { tenants_cleared: tc, events_cleared: ec };
  }

  // ── private ─────────────────────────────────────────────────────

  private requireStates(tenantId: string): TenantStepState[] {
    const s = this.states.get(tenantId);
    if (!s) throw new Error("Unknown tenant: " + tenantId);
    return s;
  }

  private requireStep(states: TenantStepState[], stepId: OnboardingStepId): TenantStepState {
    const s = states.find(x => x.step_id === stepId);
    if (!s) throw new Error("Unknown step: " + stepId);
    return s;
  }

  private requireStepDef(stepId: OnboardingStepId): OnboardingStep {
    const s = this.runbook.find(x => x.id === stepId);
    if (!s) throw new Error("Unknown step definition: " + stepId);
    return s;
  }

  private transition(state: TenantStepState, to: StepStatus, actor: string, notes: string): TenantStepState {
    return { ...state, status: to, actor, notes };
  }

  private emitEvent(tenantId: string, stepId: OnboardingStepId, from: StepStatus, to: StepStatus, actor: string, notes: string): void {
    this.eventCounter++;
    this.auditLog.push({
      event_id: "evt-" + this.eventCounter,
      tenant_id: tenantId,
      step_id: stepId,
      from_status: from,
      to_status: to,
      actor,
      timestamp: Date.now(),
      notes,
    });
  }

  private maybeUpdateTenantStatus(tenantId: string): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return;
    const states = this.states.get(tenantId) ?? [];
    const allComplete = states.length === this.runbook.length && states.every(s => s.status === "complete");
    const anyInMotion = states.some(s => s.status === "in_progress" || s.status === "complete" || s.status === "failed");
    let next: TenantStatus = tenant.status;
    if (allComplete) next = "active";
    else if (anyInMotion) next = "in_progress";
    if (next !== tenant.status) {
      tenant.status = next;
      log.info("[ONBOARD] Tenant " + tenantId + " → " + next);
    }
  }

  private findNextActionable(states: TenantStepState[]): OnboardingStepId | null {
    for (const step of this.runbook) {
      const state = states.find(s => s.step_id === step.id)!;
      if (state.status !== "not_started" && state.status !== "blocked") continue;
      const allPrereqsComplete = step.prerequisite_ids.every(pId => {
        const p = states.find(s => s.step_id === pId);
        return p?.status === "complete";
      });
      if (allPrereqsComplete) return step.id;
    }
    return null;
  }

  private lastActivityForTenant(tenantId: string): number | null {
    const events = this.auditLog.filter(e => e.tenant_id === tenantId);
    if (events.length === 0) return null;
    return events[events.length - 1].timestamp;
  }
}

export const tenantOnboardingRunbookEngine = new TenantOnboardingRunbookEngine();
