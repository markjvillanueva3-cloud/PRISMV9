/**
 * SafetyTrainingRecordEngine — Training records ledger with expiration tracking.
 *
 * Closes the OSHA training-records gap AND the ISO 9001 §7.2 competency
 * tracking gap in one engine. OSHA requires documented training for every
 * recognized topic (HazCom, LOTO, PPE, forklift, respirator, confined-space,
 * machine-guarding) AND that records be kept current. ISO 9001 §7.2 requires
 * that the org "determine the necessary competence" and "retain documented
 * information as evidence."
 *
 * State: per (employee_id, topic_id) record with assigned/completed/expired
 * lifecycle + due-date arithmetic + auto-detection of overdue.
 *
 * OSHA refresh cadences (29 CFR references):
 *   - HazCom (1910.1200(h)) — initial + when new hazard introduced
 *   - LOTO (1910.147(c)(7)(iv)) — annual periodic inspection of authorized employees
 *   - PPE (1910.132(f)(4)) — when changes render previous training obsolete
 *   - Respirator (1910.134(k)(5)) — annually
 *   - Forklift (1910.178(l)(4)) — every 3 years OR after observed unsafe operation
 *   - Confined Space (1910.146(g)) — initial + when duties change
 *   - First Aid (CFR 50.3) — every 2 years typical (Red Cross / equivalent)
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: missing fields / non-positive durations / past completion dates
 *   - PII-free: employee_id string only
 *   - Object.frozen on every return
 *
 * @module SafetyTrainingRecordEngine
 * @milestone HOTEL/U-SAFETY-TRAINING-RECORD (2026-05-25, slot:hotel iter12)
 */

// ─── Constants ────────────────────────────────────────────────
/** Default expiration windows by OSHA-recognized topic (days). */
const DEFAULT_EXPIRATION_DAYS: Record<string, number> = {
  hazcom: 365 * 5, // 5y — refresh on new hazard / 5y operational default
  loto: 365, // annual per §1910.147(c)(7)(iv)
  ppe: 365 * 3, // 3y default
  respirator: 365, // annual per §1910.134(k)(5)
  forklift: 365 * 3, // 3y per §1910.178(l)(4)
  confined_space: 365 * 2, // 2y default
  first_aid: 365 * 2, // 2y typical
  machine_guarding: 365 * 2,
  ergonomics: 365 * 3,
  hazwoper_8hr: 365, // annual refresher
};
const DAY_MS = 86_400_000;

// ─── Types ────────────────────────────────────────────────────

export type TrainingStatus = "assigned" | "completed" | "expired" | "overdue";

export interface TrainingRecord {
  id: string;
  employee_id: string;
  topic_id: string;
  status: TrainingStatus;
  assigned_at: string;
  completed_at: string | null;
  expires_at: string | null;
  due_at: string | null;
  certificate_ref?: string;
  notes?: string;
}

export interface ComplianceReport {
  employee_id: string;
  as_of: string;
  total_topics: number;
  completed: number;
  overdue: number;
  expiring_within_30_days: number;
  records: ReadonlyArray<TrainingRecord>;
}

// ─── Engine ───────────────────────────────────────────────────

class SafetyTrainingRecordEngine {
  private records: Map<string, TrainingRecord> = new Map();
  private nextId = 1;

  /**
   * Assign a training topic to an employee with optional due date.
   * @throws on missing fields / past due_at
   */
  assignTraining(args: {
    employee_id: string;
    topic_id: string;
    due_at?: string;
    certificate_ref?: string;
  }): TrainingRecord {
    if (!args.employee_id || !args.topic_id) {
      throw new Error("SafetyTrainingRecordEngine.assignTraining: employee_id + topic_id required");
    }
    if (args.due_at && !/^\d{4}-\d{2}-\d{2}$/.test(args.due_at)) {
      throw new Error(`SafetyTrainingRecordEngine.assignTraining: due_at must be ISO date YYYY-MM-DD, got "${args.due_at}"`);
    }
    const id = `TRN-${String(this.nextId++).padStart(6, "0")}`;
    const ts = new Date().toISOString();
    const record: TrainingRecord = Object.freeze({
      id,
      employee_id: args.employee_id,
      topic_id: args.topic_id.toLowerCase(),
      status: "assigned" as const,
      assigned_at: ts,
      completed_at: null,
      expires_at: null,
      due_at: args.due_at ?? null,
      ...(args.certificate_ref !== undefined && { certificate_ref: args.certificate_ref }),
    });
    this.records.set(id, record);
    return record;
  }

  /**
   * Mark a training as completed. Sets expires_at based on topic default (or override).
   * @throws if record unknown / already-completed status / future completed_at
   */
  recordCompletion(args: {
    record_id: string;
    completed_at: string;
    expiration_days_override?: number;
    certificate_ref?: string;
    notes?: string;
  }): TrainingRecord {
    const r = this.requireRecord(args.record_id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.completed_at)) {
      throw new Error(
        `SafetyTrainingRecordEngine.recordCompletion: completed_at must be ISO date YYYY-MM-DD, got "${args.completed_at}"`,
      );
    }
    if (Date.parse(args.completed_at) > Date.now() + DAY_MS) {
      throw new Error("SafetyTrainingRecordEngine.recordCompletion: completed_at cannot be in the future");
    }
    const expirationDays =
      args.expiration_days_override ?? DEFAULT_EXPIRATION_DAYS[r.topic_id] ?? 365;
    if (!Number.isFinite(expirationDays) || expirationDays <= 0) {
      throw new Error(
        `SafetyTrainingRecordEngine.recordCompletion: expiration_days must be positive finite, got ${expirationDays}`,
      );
    }
    const expiresAtDate = new Date(Date.parse(args.completed_at) + expirationDays * DAY_MS);
    const expires_at = expiresAtDate.toISOString().slice(0, 10);
    const updated: TrainingRecord = Object.freeze({
      ...r,
      status: "completed" as const,
      completed_at: args.completed_at,
      expires_at,
      ...(args.certificate_ref !== undefined && { certificate_ref: args.certificate_ref }),
      ...(args.notes !== undefined && { notes: args.notes }),
    });
    this.records.set(r.id, updated);
    return updated;
  }

  /**
   * Compute the current status of a record (auto-detects expired/overdue).
   */
  computeStatus(args: { record_id: string; as_of?: string }): TrainingStatus {
    const r = this.requireRecord(args.record_id);
    const now = args.as_of ?? new Date().toISOString().slice(0, 10);
    if (r.status === "completed" && r.expires_at && r.expires_at < now) return "expired";
    if (r.status === "assigned" && r.due_at && r.due_at < now) return "overdue";
    return r.status;
  }

  /**
   * Compliance report for an employee — overdue + expiring-soon counts.
   */
  getEmployeeComplianceReport(args: { employee_id: string; as_of?: string }): ComplianceReport {
    if (!args.employee_id) {
      throw new Error("SafetyTrainingRecordEngine.getEmployeeComplianceReport: employee_id required");
    }
    const as_of = args.as_of ?? new Date().toISOString().slice(0, 10);
    const asOfMs = Date.parse(as_of);
    const emp = [...this.records.values()].filter((r) => r.employee_id === args.employee_id);
    let completed = 0;
    let overdue = 0;
    let expiringSoon = 0;
    const decorated = emp.map((r) => {
      const live = this.computeStatus({ record_id: r.id, as_of });
      if (live === "completed") completed++;
      if (live === "overdue" || live === "expired") overdue++;
      if (r.expires_at) {
        const days = (Date.parse(r.expires_at) - asOfMs) / DAY_MS;
        if (days >= 0 && days <= 30) expiringSoon++;
      }
      return Object.freeze({ ...r, status: live });
    });
    return Object.freeze({
      employee_id: args.employee_id,
      as_of,
      total_topics: emp.length,
      completed,
      overdue,
      expiring_within_30_days: expiringSoon,
      records: Object.freeze(decorated),
    });
  }

  /**
   * List EVERY training record across all employees (the unfiltered sibling of
   * getEmployeeComplianceReport), each decorated with its live computed status. Backs the
   * OSHACompliancePage training panel, which lists all records rather than one employee's.
   * Newest assignment first (assigned_at desc).
   * @param args.as_of - optional ISO date (YYYY-MM-DD) to compute status against; defaults to today.
   * @returns { records: (TrainingRecord & live status)[] } -- the `records` key the FE reads.
   */
  listAllRecords(args?: { as_of?: string }): { records: ReadonlyArray<TrainingRecord & { course_name: string }> } {
    const as_of = args?.as_of ?? new Date().toISOString().slice(0, 10);
    const decorated = [...this.records.values()]
      // course_name aliases topic_id (the topic IS the course identifier, e.g. "lockout_tagout") so the
      // OSHACompliancePage card title -- firstText(['employee_name','course_name']) -- has a real value
      // to show. (employee_name is joined in by the dispatcher from EmployeeEngine; the record only keys id.)
      .map((r) => Object.freeze({ ...r, status: this.computeStatus({ record_id: r.id, as_of }), course_name: r.topic_id }))
      .sort((a, b) => b.assigned_at.localeCompare(a.assigned_at));
    return Object.freeze({ records: Object.freeze(decorated) });
  }

  /**
   * Return all OSHA-recognized training topics with their default expiration windows.
   */
  listTopics(): ReadonlyArray<{ topic_id: string; default_expiration_days: number }> {
    return Object.freeze(
      Object.entries(DEFAULT_EXPIRATION_DAYS).map(([t, d]) =>
        Object.freeze({ topic_id: t, default_expiration_days: d }),
      ),
    );
  }

  /** Reset state — test-only. */
  reset(): void {
    this.records.clear();
    this.nextId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private requireRecord(id: string): TrainingRecord {
    const r = this.records.get(id);
    if (!r) throw new Error(`SafetyTrainingRecordEngine: unknown record id "${id}"`);
    return r;
  }
}

export const safetyTrainingRecordEngine = new SafetyTrainingRecordEngine();
