/**
 * EmployeePerOpPartTrackerEngine — Per-operation part-count tracker.
 *
 * Closes the "blank-day" reporting gap: the existing portal only records
 * COMPLETED parts (end-of-route), so an operator who runs op 1 + op 2 of a
 * 4-op part on a given day looks like they shipped zero parts. That's
 * wrong — they did real work, just not the final shipping op.
 *
 * This engine records part counts PER OPERATION: when op 1 finishes on a
 * job, the operator inputs "I just finished 30 op-1 pieces". A daily
 * roll-up sums across every (job, op) touched, giving a true picture of
 * per-employee throughput regardless of which operation they were running.
 *
 * Operator-input audit trail: every part-count change records who made the
 * change, when, the prior + new value, and a free-text reason. Adjustments
 * are explicit (not silent overwrites).
 *
 * Hotel-soul invariants:
 *   - R12 fail-loud: NaN / negative / non-integer counts throw
 *   - PII-free ledger (employee_id string only)
 *   - Object.frozen on every return
 *   - No silent count overwrites — every adjustment recorded with reason
 *
 * @module EmployeePerOpPartTrackerEngine
 * @milestone HOTEL/U-EMP-PER-OP-PART-TRACKER (2026-05-25, slot:hotel iter9)
 */

// ─── Types ────────────────────────────────────────────────────

export interface OpPartRecord {
  /** Record id — monotonic counter for stable ordering. */
  id: string;
  /** Job id (route-level). */
  job_id: string;
  /** Operation id within the job. */
  operation_id: string;
  /** Employee who recorded the count. */
  employee_id: string;
  /** Parts completed on THIS operation. */
  parts_completed: number;
  /** ISO timestamp of the recording. */
  recorded_at: string;
  /** ISO date (YYYY-MM-DD) for daily roll-up convenience. */
  date_key: string;
  /** Optional notes from the operator. */
  notes?: string;
}

export interface OpCountAdjustment {
  id: string;
  job_id: string;
  operation_id: string;
  employee_id: string;
  prior_count: number;
  new_count: number;
  delta: number;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
}

export interface OpPartSummary {
  job_id: string;
  operation_id: string;
  total_parts: number;
  records_count: number;
  first_recorded_at: string | null;
  last_recorded_at: string | null;
  contributors: ReadonlyArray<string>;
}

export interface EmployeeDailyShipSummary {
  employee_id: string;
  date_key: string;
  total_parts_across_ops: number;
  ops_touched: number;
  jobs_touched: number;
  per_op_breakdown: ReadonlyArray<{
    job_id: string;
    operation_id: string;
    parts: number;
  }>;
}

// ─── Engine ───────────────────────────────────────────────────

class EmployeePerOpPartTrackerEngine {
  private records: OpPartRecord[] = [];
  private adjustments: OpCountAdjustment[] = [];
  private nextId = 1;
  private nextAdjId = 1;

  /**
   * Record N parts completed on a specific operation of a job.
   *
   * @throws Error on missing fields / non-integer / negative count (R12 fail-loud)
   */
  recordOpComplete(input: {
    job_id: string;
    operation_id: string;
    employee_id: string;
    parts_completed: number;
    notes?: string;
    timestamp?: string;
  }): OpPartRecord {
    this.validateRecordInput(input);
    const ts = input.timestamp ?? new Date().toISOString();
    const record: OpPartRecord = Object.freeze({
      id: `OP-${String(this.nextId++).padStart(6, "0")}`,
      job_id: input.job_id,
      operation_id: input.operation_id,
      employee_id: input.employee_id,
      parts_completed: input.parts_completed,
      recorded_at: ts,
      date_key: ts.slice(0, 10),
      ...(input.notes !== undefined && { notes: input.notes }),
    });
    this.records.push(record);
    return record;
  }

  /**
   * List records for a specific (job, operation) tuple. Defensive copy.
   */
  listOpRecords(args: { job_id: string; operation_id: string }): ReadonlyArray<OpPartRecord> {
    return Object.freeze(
      this.records
        .filter((r) => r.job_id === args.job_id && r.operation_id === args.operation_id)
        .map((r) => ({ ...r })),
    );
  }

  /**
   * Summarize part-count for an operation: total, records, contributors, first/last.
   */
  getOpSummary(args: { job_id: string; operation_id: string }): OpPartSummary {
    const recs = this.records.filter((r) => r.job_id === args.job_id && r.operation_id === args.operation_id);
    const total = recs.reduce((acc, r) => acc + r.parts_completed, 0);
    const contributors = Array.from(new Set(recs.map((r) => r.employee_id))).sort();
    return Object.freeze({
      job_id: args.job_id,
      operation_id: args.operation_id,
      total_parts: total,
      records_count: recs.length,
      first_recorded_at: recs.length > 0 ? recs[0].recorded_at : null,
      last_recorded_at: recs.length > 0 ? recs[recs.length - 1].recorded_at : null,
      contributors: Object.freeze(contributors),
    });
  }

  /**
   * Daily roll-up for an employee — answers "what did this person ship today?"
   * Aggregates every (job, op) they touched on the given ISO date.
   */
  getEmployeeDailyShip(args: { employee_id: string; date_key: string }): EmployeeDailyShipSummary {
    if (!args.employee_id || !args.date_key) {
      throw new Error("EmployeePerOpPartTrackerEngine.getEmployeeDailyShip: employee_id + date_key required");
    }
    const recs = this.records.filter(
      (r) => r.employee_id === args.employee_id && r.date_key === args.date_key,
    );
    const byKey = new Map<string, { job_id: string; operation_id: string; parts: number }>();
    for (const r of recs) {
      const k = `${r.job_id}|${r.operation_id}`;
      const cur = byKey.get(k);
      if (cur) cur.parts += r.parts_completed;
      else byKey.set(k, { job_id: r.job_id, operation_id: r.operation_id, parts: r.parts_completed });
    }
    const breakdown = [...byKey.values()].sort(
      (a, b) => b.parts - a.parts || a.job_id.localeCompare(b.job_id),
    );
    return Object.freeze({
      employee_id: args.employee_id,
      date_key: args.date_key,
      total_parts_across_ops: recs.reduce((acc, r) => acc + r.parts_completed, 0),
      ops_touched: byKey.size,
      jobs_touched: new Set(recs.map((r) => r.job_id)).size,
      per_op_breakdown: Object.freeze(breakdown.map((b) => Object.freeze({ ...b }))),
    });
  }

  /**
   * Per-job by-op summary — answers "what's the part count on each op of job X?"
   */
  getJobOpTotals(job_id: string): ReadonlyArray<{ operation_id: string; total_parts: number; records: number }> {
    if (!job_id) throw new Error("EmployeePerOpPartTrackerEngine.getJobOpTotals: job_id required");
    const byOp = new Map<string, { total_parts: number; records: number }>();
    for (const r of this.records) {
      if (r.job_id !== job_id) continue;
      const cur = byOp.get(r.operation_id);
      if (cur) {
        cur.total_parts += r.parts_completed;
        cur.records += 1;
      } else {
        byOp.set(r.operation_id, { total_parts: r.parts_completed, records: 1 });
      }
    }
    const out = [...byOp.entries()].map(([op, v]) =>
      Object.freeze({ operation_id: op, total_parts: v.total_parts, records: v.records }),
    );
    out.sort((a, b) => a.operation_id.localeCompare(b.operation_id));
    return Object.freeze(out);
  }

  /**
   * Operator-driven adjustment — overwrites the per-(job, op) count with a
   * new value AND records the delta + reason in the audit trail. The previous
   * records remain (immutable); only an adjustment record is added.
   *
   * @throws Error on missing reason / negative new_count
   */
  adjustOpCount(input: {
    job_id: string;
    operation_id: string;
    employee_id: string;
    new_count: number;
    reason: string;
    adjusted_by: string;
  }): OpCountAdjustment {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new Error("EmployeePerOpPartTrackerEngine.adjustOpCount: reason (≥3 chars) required for audit");
    }
    if (!input.adjusted_by) {
      throw new Error("EmployeePerOpPartTrackerEngine.adjustOpCount: adjusted_by required for audit");
    }
    if (!Number.isInteger(input.new_count) || input.new_count < 0) {
      throw new Error(
        `EmployeePerOpPartTrackerEngine.adjustOpCount: new_count must be a non-negative integer, got ${input.new_count}`,
      );
    }
    const summary = this.getOpSummary({ job_id: input.job_id, operation_id: input.operation_id });
    const prior = summary.total_parts;
    const delta = input.new_count - prior;
    // Synthesize a corrective record so the audit trail nets out.
    if (delta !== 0) {
      const correctiveTs = new Date().toISOString();
      const rec: OpPartRecord = Object.freeze({
        id: `OP-${String(this.nextId++).padStart(6, "0")}-ADJ`,
        job_id: input.job_id,
        operation_id: input.operation_id,
        employee_id: input.employee_id,
        parts_completed: delta,
        recorded_at: correctiveTs,
        date_key: correctiveTs.slice(0, 10),
        notes: `[ADJUST] ${input.reason} (by ${input.adjusted_by})`,
      });
      this.records.push(rec);
    }
    const adj: OpCountAdjustment = Object.freeze({
      id: `ADJ-${String(this.nextAdjId++).padStart(6, "0")}`,
      job_id: input.job_id,
      operation_id: input.operation_id,
      employee_id: input.employee_id,
      prior_count: prior,
      new_count: input.new_count,
      delta,
      reason: input.reason,
      adjusted_by: input.adjusted_by,
      adjusted_at: new Date().toISOString(),
    });
    this.adjustments.push(adj);
    return adj;
  }

  /** List all adjustments — defensive copy. Optional filter by job/op. */
  listAdjustments(filter?: { job_id?: string; operation_id?: string }): ReadonlyArray<OpCountAdjustment> {
    let out = [...this.adjustments];
    if (filter?.job_id) out = out.filter((a) => a.job_id === filter.job_id);
    if (filter?.operation_id) out = out.filter((a) => a.operation_id === filter.operation_id);
    return Object.freeze(out);
  }

  /** Reset state — test-only. */
  reset(): void {
    this.records = [];
    this.adjustments = [];
    this.nextId = 1;
    this.nextAdjId = 1;
  }

  // ─── Internals ──────────────────────────────────────────────

  private validateRecordInput(input: {
    job_id: string;
    operation_id: string;
    employee_id: string;
    parts_completed: number;
  }): void {
    if (!input || typeof input !== "object") {
      throw new Error("EmployeePerOpPartTrackerEngine: input required");
    }
    if (!input.job_id || !input.operation_id || !input.employee_id) {
      throw new Error("EmployeePerOpPartTrackerEngine: job_id + operation_id + employee_id required");
    }
    if (!Number.isInteger(input.parts_completed)) {
      throw new Error(
        `EmployeePerOpPartTrackerEngine: parts_completed must be an integer, got ${input.parts_completed}`,
      );
    }
    if (input.parts_completed < 0) {
      throw new Error("EmployeePerOpPartTrackerEngine: parts_completed must be non-negative");
    }
  }
}

export const employeePerOpPartTrackerEngine = new EmployeePerOpPartTrackerEngine();
