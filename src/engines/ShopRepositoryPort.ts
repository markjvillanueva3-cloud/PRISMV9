/**
 * ShopRepositoryPort — ULT-MS0 P1-U02
 *
 * Persistence port for canonical shop-domain entities.
 * Implementations can target SQLite, PostgreSQL, file-system,
 * or external ERP sync — all behind the same contract.
 *
 * @module engines/ShopRepositoryPort
 */

import type { Job, Traveler, TravelerStep, LaborSession, QuantityActual, Approval, Attachment } from "../schemas/shop/shopDomain.js";

// ============================================================================
// PORT INTERFACE
// ============================================================================

export interface ShopRepository {
  // Jobs
  getJob(id: string): Promise<Job | null>;
  listJobs(filter?: { status?: string; customer?: string; limit?: number }): Promise<Job[]>;
  saveJob(job: Job): Promise<void>;
  updateJobStatus(id: string, status: string, userId: string, notes?: string): Promise<Job | null>;

  // Travelers
  getTraveler(jobId: string): Promise<Traveler | null>;
  saveTravelerStep(step: TravelerStep): Promise<void>;
  updateStepStatus(stepId: string, status: string, operatorId?: string): Promise<TravelerStep | null>;

  // Labor Sessions
  getLaborSession(id: string): Promise<LaborSession | null>;
  getActiveSessions(employeeId: string): Promise<LaborSession[]>;
  saveLaborSession(session: LaborSession): Promise<void>;
  updateLaborSession(id: string, updates: Partial<LaborSession>): Promise<LaborSession | null>;

  // Quantities
  recordQuantity(qty: QuantityActual): Promise<void>;
  getQuantities(jobId: string): Promise<QuantityActual[]>;

  // Approvals
  submitApproval(approval: Approval): Promise<void>;
  getApprovals(jobId: string): Promise<Approval[]>;

  // Attachments
  saveAttachment(attachment: Attachment): Promise<void>;
  getAttachments(jobId: string): Promise<Attachment[]>;
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION (default — swap for persistent store)
// ============================================================================

export class InMemoryShopRepository implements ShopRepository {
  private jobs = new Map<string, Job>();
  private travelerSteps = new Map<string, TravelerStep>();
  private laborSessions = new Map<string, LaborSession>();
  private quantities: QuantityActual[] = [];
  private approvals: Approval[] = [];
  private attachments: Attachment[] = [];

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async listJobs(filter?: { status?: string; customer?: string; limit?: number }): Promise<Job[]> {
    let result = Array.from(this.jobs.values());
    if (filter?.status) result = result.filter(j => j.status === filter.status);
    if (filter?.customer) result = result.filter(j => j.customer.toLowerCase().includes(filter.customer!.toLowerCase()));
    if (filter?.limit) result = result.slice(0, filter.limit);
    return result;
  }

  async saveJob(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async updateJobStatus(id: string, status: string, userId: string, notes?: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    const updated = {
      ...job,
      status: status as Job["status"],
      status_history: [...job.status_history, {
        status: status as Job["status"],
        previous_status: job.status,
        timestamp: new Date().toISOString(),
        user: userId,
        notes,
      }],
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async getTraveler(jobId: string): Promise<Traveler | null> {
    const steps = Array.from(this.travelerSteps.values())
      .filter(s => s.job_id === jobId)
      .sort((a, b) => a.step_number - b.step_number);
    if (steps.length === 0) return null;
    const completed = steps.filter(s => s.status === "complete").length;
    const current = steps.find(s => s.status === "running" || s.status === "setup");
    return {
      job_id: jobId,
      steps,
      total_steps: steps.length,
      completed_steps: completed,
      current_step: current?.step_number,
      pct_complete: Math.round((completed / steps.length) * 100),
    };
  }

  async saveTravelerStep(step: TravelerStep): Promise<void> {
    this.travelerSteps.set(step.id, step);
  }

  async updateStepStatus(stepId: string, status: string, operatorId?: string): Promise<TravelerStep | null> {
    const step = this.travelerSteps.get(stepId);
    if (!step) return null;
    const updated = { ...step, status: status as TravelerStep["status"], operator_id: operatorId ?? step.operator_id };
    if (status === "running" && !step.started_at) updated.started_at = new Date().toISOString();
    if (status === "complete") updated.completed_at = new Date().toISOString();
    this.travelerSteps.set(stepId, updated);
    return updated;
  }

  async getLaborSession(id: string): Promise<LaborSession | null> {
    return this.laborSessions.get(id) ?? null;
  }

  async getActiveSessions(employeeId: string): Promise<LaborSession[]> {
    return Array.from(this.laborSessions.values())
      .filter(s => s.employee_id === employeeId && s.status !== "completed");
  }

  async saveLaborSession(session: LaborSession): Promise<void> {
    this.laborSessions.set(session.id, session);
  }

  async updateLaborSession(id: string, updates: Partial<LaborSession>): Promise<LaborSession | null> {
    const session = this.laborSessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates } as LaborSession;
    this.laborSessions.set(id, updated);
    return updated;
  }

  async recordQuantity(qty: QuantityActual): Promise<void> {
    this.quantities.push(qty);
  }

  async getQuantities(jobId: string): Promise<QuantityActual[]> {
    return this.quantities.filter(q => q.job_id === jobId);
  }

  async submitApproval(approval: Approval): Promise<void> {
    this.approvals.push(approval);
  }

  async getApprovals(jobId: string): Promise<Approval[]> {
    return this.approvals.filter(a => a.job_id === jobId);
  }

  async saveAttachment(attachment: Attachment): Promise<void> {
    this.attachments.push(attachment);
  }

  async getAttachments(jobId: string): Promise<Attachment[]> {
    return this.attachments.filter(a => a.job_id === jobId);
  }
}
