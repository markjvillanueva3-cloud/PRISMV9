/**
 * ShopStateEngine — ULT-MS0 P1-U02
 *
 * Central state owner for shop-floor entities. All job lifecycle,
 * traveler progress, labor tracking, and quality approvals flow
 * through this engine — no route or page mutates shop state directly.
 *
 * Delegates persistence to ShopRepository port (in-memory default,
 * swappable to SQLite/Postgres/ERP sync).
 *
 * Emits ShopEvents for WebSocket delivery via EventBus.
 *
 * @module engines/ShopStateEngine
 */

import { log } from "../utils/Logger.js";
import type {
  Job, JobStatus, TravelerStep, TravelerStepStatus,
  LaborSession, LaborType, QuantityActual, Approval, Attachment, Traveler,
} from "../schemas/shop/shopDomain.js";
import type { ShopEvent, ShopEventType } from "../schemas/shop/liveEventContracts.js";
import { jobRoom, deptRoom, empRoom, shopBroadcast } from "../schemas/shop/liveEventContracts.js";
import { InMemoryShopRepository, type ShopRepository } from "./ShopRepositoryPort.js";

// ============================================================================
// ENGINE
// ============================================================================

export class ShopStateEngine {
  private repo: ShopRepository;
  private eventListeners: Array<(event: ShopEvent) => void> = [];
  private eventCounter = 0;
  private idCounter = 0;

  constructor(repo?: ShopRepository) {
    this.repo = repo ?? new InMemoryShopRepository();
  }

  /** Subscribe to shop events (for WebSocket relay, logging, etc.) */
  onEvent(listener: (event: ShopEvent) => void): void {
    this.eventListeners.push(listener);
  }

  private emit(type: ShopEventType, room: string, payload: Record<string, unknown>): void {
    const event: ShopEvent = {
      event_id: `SE-${++this.eventCounter}-${Date.now()}`,
      event_type: type,
      timestamp: new Date().toISOString(),
      source: "ShopStateEngine",
      room,
      payload,
    };
    for (const listener of this.eventListeners) {
      try { listener(event); } catch (e) {
        log.debug?.(`ShopStateEngine: event listener error — ${e}`);
      }
    }
  }

  // ── Jobs ─────────────────────────────────────────────────────────

  async createJob(input: {
    customer: string;
    part_number: string;
    part_name?: string;
    quantity: number;
    due_date: string;
    created_by: string;
  }): Promise<Job> {
    const now = new Date().toISOString();
    const id = `JOB-${Date.now()}-${++this.idCounter}`;
    const job: Job = {
      id,
      customer: input.customer,
      part_number: input.part_number,
      part_name: input.part_name,
      status: "ordered",
      status_history: [{ status: "ordered", timestamp: now, user: input.created_by }],
      quantity: input.quantity,
      schedule: { due_date: input.due_date, order_date: now },
      progress: { percent_complete: 0, parts_complete: 0, parts_total: input.quantity },
      costs: { estimated_total: 0, actual_total: 0 },
      notes: [],
      provenance: { created_by: input.created_by, created_at: now },
    };
    await this.repo.saveJob(job);
    this.emit("job.created", shopBroadcast(), {
      job_id: id, customer: input.customer, part_number: input.part_number,
      quantity: input.quantity, due_date: input.due_date,
    });
    log.info(`[ShopState] Job created: ${id} — ${input.part_number} × ${input.quantity}`);
    return job;
  }

  async updateJobStatus(jobId: string, newStatus: JobStatus, userId: string, notes?: string): Promise<Job | null> {
    const job = await this.repo.updateJobStatus(jobId, newStatus, userId, notes);
    if (job) {
      this.emit("job.status_changed", jobRoom(jobId), {
        job_id: jobId, previous_status: job.status_history[job.status_history.length - 2]?.status,
        new_status: newStatus, changed_by: userId, notes,
      });
    }
    return job;
  }

  async getJob(id: string): Promise<Job | null> {
    return this.repo.getJob(id);
  }

  async listJobs(filter?: { status?: string; customer?: string; limit?: number }): Promise<Job[]> {
    return this.repo.listJobs(filter);
  }

  async updateProgress(jobId: string, partsComplete: number): Promise<Job | null> {
    const job = await this.repo.getJob(jobId);
    if (!job) return null;
    job.progress.parts_complete = partsComplete;
    job.progress.percent_complete = Math.round((partsComplete / job.progress.parts_total) * 100);
    await this.repo.saveJob(job);
    this.emit("job.progress_updated", jobRoom(jobId), {
      job_id: jobId, ...job.progress,
    });
    return job;
  }

  // ── Travelers ────────────────────────────────────────────────────

  async getTraveler(jobId: string): Promise<Traveler | null> {
    return this.repo.getTraveler(jobId);
  }

  async addTravelerStep(step: TravelerStep): Promise<void> {
    await this.repo.saveTravelerStep(step);
  }

  async startStep(stepId: string, operatorId: string): Promise<TravelerStep | null> {
    const step = await this.repo.updateStepStatus(stepId, "running", operatorId);
    if (step) {
      this.emit("traveler.step_started", jobRoom(step.job_id), {
        job_id: step.job_id, step_id: stepId, step_number: step.step_number,
        operation: step.operation, started_by: operatorId,
      });
    }
    return step;
  }

  async completeStep(stepId: string, operatorId: string): Promise<TravelerStep | null> {
    const step = await this.repo.updateStepStatus(stepId, "complete", operatorId);
    if (step) {
      this.emit("traveler.step_completed", jobRoom(step.job_id), {
        job_id: step.job_id, step_id: stepId, step_number: step.step_number,
        operation: step.operation, status: "complete", completed_by: operatorId,
      });
    }
    return step;
  }

  // ── Labor Sessions ───────────────────────────────────────────────

  async startLabor(input: {
    employee_id: string;
    job_id: string;
    labor_type: LaborType;
    machine_id?: string;
    routing_step_id?: string;
  }): Promise<LaborSession> {
    const now = new Date().toISOString();
    const id = `LAB-${Date.now()}-${++this.idCounter}`;
    const session: LaborSession = {
      id,
      employee_id: input.employee_id,
      job_id: input.job_id,
      routing_step_id: input.routing_step_id,
      machine_id: input.machine_id,
      labor_type: input.labor_type,
      start_time: now,
      pause_periods: [],
      status: "active",
      provenance: { created_by: input.employee_id, created_at: now },
    };
    await this.repo.saveLaborSession(session);
    this.emit("labor.session_started", empRoom(input.employee_id), {
      session_id: id, employee_id: input.employee_id, job_id: input.job_id,
      labor_type: input.labor_type, machine_id: input.machine_id, start_time: now,
    });
    return session;
  }

  async pauseLabor(sessionId: string, reason: string, reasonCategory: string): Promise<LaborSession | null> {
    const session = await this.repo.getLaborSession(sessionId);
    if (!session || session.status !== "active") return null;
    session.status = "paused";
    session.pause_periods.push({
      start: new Date().toISOString(),
      reason,
      reason_category: reasonCategory as any,
    });
    await this.repo.saveLaborSession(session);
    this.emit("labor.session_paused", empRoom(session.employee_id), {
      session_id: sessionId, reason,
    });
    return session;
  }

  async resumeLabor(sessionId: string): Promise<LaborSession | null> {
    const session = await this.repo.getLaborSession(sessionId);
    if (!session || session.status !== "paused") return null;
    session.status = "active";
    const lastPause = session.pause_periods[session.pause_periods.length - 1];
    if (lastPause && !lastPause.end) lastPause.end = new Date().toISOString();
    await this.repo.saveLaborSession(session);
    this.emit("labor.session_resumed", empRoom(session.employee_id), { session_id: sessionId });
    return session;
  }

  async completeLabor(sessionId: string, goodParts?: number, scrapCount?: number): Promise<LaborSession | null> {
    const session = await this.repo.getLaborSession(sessionId);
    if (!session) return null;
    const now = new Date().toISOString();
    session.status = "completed";
    session.end_time = now;
    session.good_parts = goodParts;
    session.scrap_count = scrapCount;

    // Calculate total and productive minutes
    const startMs = new Date(session.start_time).getTime();
    const endMs = new Date(now).getTime();
    const totalMin = (endMs - startMs) / 60000;
    const pauseMin = session.pause_periods.reduce((sum, p) => {
      if (!p.end) return sum;
      return sum + (new Date(p.end).getTime() - new Date(p.start).getTime()) / 60000;
    }, 0);
    session.total_minutes = Math.round(totalMin * 10) / 10;
    session.productive_minutes = Math.round((totalMin - pauseMin) * 10) / 10;

    await this.repo.saveLaborSession(session);
    this.emit("labor.session_completed", empRoom(session.employee_id), {
      session_id: sessionId, job_id: session.job_id, total_minutes: session.total_minutes,
      productive_minutes: session.productive_minutes, good_parts: goodParts, scrap_count: scrapCount,
    });
    return session;
  }

  async getActiveSessions(employeeId: string): Promise<LaborSession[]> {
    return this.repo.getActiveSessions(employeeId);
  }

  // ── Quantities ───────────────────────────────────────────────────

  async recordQuantity(input: {
    job_id: string;
    routing_step_id?: string;
    good_parts: number;
    scrap_parts: number;
    rework_parts: number;
    recorded_by: string;
    lot_number?: string;
  }): Promise<QuantityActual> {
    const qty: QuantityActual = {
      id: `QTY-${Date.now()}-${++this.idCounter}`,
      job_id: input.job_id,
      routing_step_id: input.routing_step_id,
      timestamp: new Date().toISOString(),
      good_parts: input.good_parts,
      scrap_parts: input.scrap_parts,
      rework_parts: input.rework_parts,
      recorded_by: input.recorded_by,
      lot_number: input.lot_number,
    };
    await this.repo.recordQuantity(qty);
    this.emit("labor.parts_recorded", jobRoom(input.job_id), {
      session_id: qty.id, job_id: input.job_id,
      good_parts: input.good_parts, scrap_count: input.scrap_parts,
      timestamp: qty.timestamp,
    });
    return qty;
  }

  // ── Approvals ────────────────────────────────────────────────────

  async submitApproval(approval: Approval): Promise<void> {
    await this.repo.submitApproval(approval);
    this.emit("quality.approval_submitted", jobRoom(approval.job_id), {
      approval_id: approval.id, type: approval.type, decision: approval.decision,
      approver: approval.approver,
    });
  }

  async getApprovals(jobId: string): Promise<Approval[]> {
    return this.repo.getApprovals(jobId);
  }

  // ── Attachments ──────────────────────────────────────────────────

  async saveAttachment(attachment: Attachment): Promise<void> {
    await this.repo.saveAttachment(attachment);
    this.emit("attachment.uploaded", jobRoom(attachment.job_id), {
      attachment_id: attachment.id, type: attachment.type,
      filename: attachment.filename, uploaded_by: attachment.uploaded_by,
    });
  }

  async getAttachments(jobId: string): Promise<Attachment[]> {
    return this.repo.getAttachments(jobId);
  }

  // ── Dashboard ────────────────────────────────────────────────────

  async shopSnapshot(): Promise<{
    active_jobs: number;
    jobs_by_status: Record<string, number>;
    active_labor_sessions: number;
  }> {
    const allJobs = await this.repo.listJobs();
    const active = allJobs.filter(j => !["complete", "shipped", "invoiced", "closed"].includes(j.status));
    const byStatus: Record<string, number> = {};
    for (const j of allJobs) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    return {
      active_jobs: active.length,
      jobs_by_status: byStatus,
      active_labor_sessions: 0, // would require scan — kept lightweight
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const shopStateEngine = new ShopStateEngine();
