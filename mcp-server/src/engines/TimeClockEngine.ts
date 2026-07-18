/**
 * TimeClockEngine — Employee shift clock in/out, job clock in/out,
 * pause/resume, break tracking, overtime calculation, attendance reporting.
 *
 * This is the central engine that links employees to jobs and generates
 * the labor data that PayrollEngine and ActualCostEngine consume.
 */

import { employeeEngine, type Department } from "./EmployeeEngine.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

/** Strip HTML tags, reject script injection, enforce max length. */
function sanitizeText(input: string | undefined | null, maxLen = 500): string | undefined {
  if (input == null) return undefined;
  let text = String(input)
    .replace(/<[^>]*>/g, "")                              // strip HTML tags
    .replace(/on\w+\s*=/gi, "")                           // strip event handlers
    .replace(/javascript\s*:/gi, "")                      // strip javascript: URIs
    .replace(/\beval\s*\(/gi, "")                         // strip eval()
    .trim();
  if (text.length > maxLen) text = text.slice(0, maxLen);
  return text || undefined;
}

export interface ShiftEntry {
  id: string;
  employee_id: string;
  clock_in: string; // ISO datetime
  clock_out?: string;
  break_minutes: number;
  status: "active" | "completed" | "no_show";
  total_hours?: number;
  regular_hours?: number;
  overtime_hours?: number;
  double_time_hours?: number;
  handoff_notes?: string;
}

export type PauseReasonCategory =
  | "machine_down"
  | "material_shortage"
  | "setup_changeover"
  | "tool_change"
  | "break"
  | "preventive_maintenance"
  | "waiting_inspection"
  | "idle"
  | "shift_end"
  | "other";

export type ProcessType =
  | "setup"
  | "production_run"
  | "first_article"
  | "rework"
  | "inspection"
  | "deburring"
  | "secondary_ops"
  | "programming"
  | "material_handling";

export interface PausePeriod {
  start: string;
  end?: string;
  reason: string;
  reason_category?: PauseReasonCategory;
}

export interface JobTimeEntry {
  id: string;
  employee_id: string;
  shift_entry_id: string;
  job_id: string;
  operation?: string;
  machine_id?: string;
  start_time: string; // ISO datetime
  end_time?: string;
  process_type: ProcessType;
  pause_periods: PausePeriod[];
  status: "active" | "paused" | "completed";
  total_minutes?: number;
  productive_minutes?: number;
  good_parts?: number;
  scrap_count?: number;
  scrap_reason?: string;
  improvement_note?: string;
  takt_time_sec?: number;
  quality_project_id?: string;
  notes: string;
}

export interface ClockInInput {
  employee_id: string;
  timestamp?: string;
}

export interface JobStartInput {
  employee_id: string;
  job_id: string;
  operation?: string;
  machine_id?: string;
  process_type?: ProcessType;
  timestamp?: string;
}

export interface JobPauseInput {
  employee_id: string;
  job_id: string;
  reason: string;
  reason_category?: PauseReasonCategory;
  timestamp?: string;
}

export interface TimecardSummary {
  employee_id: string;
  employee_name: string;
  period: string;
  shifts: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  break_hours: number;
  jobs: { job_id: string; hours: number; operations: string[] }[];
  gross_pay: number;
}

export interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  date: string;
  status: "present" | "absent" | "late" | "left_early" | "no_show";
  clock_in?: string;
  clock_out?: string;
  hours_worked: number;
  shift_start: string;
  shift_end: string;
}

/** One immutable timecard-change audit record (append-only; never mutated after write). */
export interface TimecardAuditEntry {
  id: string;
  timestamp: string; // ISO datetime of the change
  employee_id: string;
  entity_type: "shift" | "job";
  entity_id: string;
  action: "clock_in" | "clock_out" | "break_added" | "job_start" | "job_pause" | "job_resume" | "job_stop";
  from_status?: string;
  to_status?: string;
  job_id?: string;
  detail?: string;
}

class TimeClockEngine {
  private shifts: Map<string, ShiftEntry> = new Map();
  private jobTimes: Map<string, JobTimeEntry> = new Map();
  private auditLog: Map<string, TimecardAuditEntry> = new Map();
  private nextShiftId = 1;
  private nextJobTimeId = 1;
  private nextAuditId = 1;
  private nextAuditIdSeeded = false;

  /**
   * Seed nextAuditId from the largest loaded TA-NNNNNN suffix once (after registerMap reloads persisted
   * rows on startup) so a restart cannot re-mint an existing id and silently clobber a persisted audit
   * record (soul: no silent clobber). O(n) once, then O(1). Mirrors A3ReportEngine.seedNextId().
   */
  private seedAuditId(): void {
    if (this.nextAuditIdSeeded) return;
    let max = 0;
    for (const id of this.auditLog.keys()) {
      const m = id.match(/^TA-(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    this.nextAuditId = max + 1;
    this.nextAuditIdSeeded = true;
  }

  /**
   * Append an immutable audit record for a timecard change. Called from every status-transition
   * write path (clock in/out, break, job start/pause/resume/stop) so timecardAuditLog() has a real
   * trail to read -- the trail is the source, never reconstructed/fabricated from current state.
   */
  private recordAudit(e: {
    employee_id: string;
    entity_type: "shift" | "job";
    entity_id: string;
    action: TimecardAuditEntry["action"];
    from_status?: string;
    to_status?: string;
    job_id?: string;
    detail?: string;
    timestamp?: string;
  }): void {
    this.seedAuditId();
    const entry: TimecardAuditEntry = {
      id: `TA-${String(this.nextAuditId++).padStart(6, "0")}`,
      timestamp: e.timestamp ?? new Date().toISOString(),
      employee_id: e.employee_id,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      action: e.action,
      from_status: e.from_status,
      to_status: e.to_status,
      job_id: e.job_id,
      detail: e.detail,
    };
    this.auditLog.set(entry.id, entry);
    persistenceBridge.persist("timecard_audit", entry.id, entry as any);
  }

  /**
   * Read the timecard-change audit trail for the ERP "timecard-audit-log" dashboard. Returns the
   * recorded status transitions (newest first), optionally filtered. data_available:false when the
   * trail is empty. The trail is populated by the write paths -- nothing is inferred from current state.
   *
   * @param opts.employee_id / job_id / entity_type / action  exact-match filters
   * @param opts.since  ISO datetime lower bound (inclusive)
   * @param opts.limit  max rows returned (default 100, capped 1000)
   */
  timecardAuditLog(opts: {
    employee_id?: string;
    job_id?: string;
    entity_type?: "shift" | "job";
    action?: string;
    since?: string;
    limit?: number;
  } = {}): {
    data_available: boolean;
    generated_at: string;
    total: number;
    returned: number;
    entries: TimecardAuditEntry[];
  } {
    const limit = Math.min(1000, Number(opts.limit) > 0 ? Math.floor(Number(opts.limit)) : 100);
    let rows = [...this.auditLog.values()];
    if (opts.employee_id) rows = rows.filter((r) => r.employee_id === opts.employee_id);
    if (opts.job_id) rows = rows.filter((r) => r.job_id === opts.job_id);
    if (opts.entity_type) rows = rows.filter((r) => r.entity_type === opts.entity_type);
    if (opts.action) rows = rows.filter((r) => r.action === opts.action);
    if (opts.since) rows = rows.filter((r) => r.timestamp >= opts.since!);
    rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0)); // newest first
    const total = rows.length;
    return {
      data_available: total > 0,
      generated_at: new Date().toISOString(),
      total,
      returned: Math.min(total, limit),
      entries: rows.slice(0, limit),
    };
  }

  // ─── Shift Clock In/Out ─────────────────────────────────

  /** Clock an employee into their shift. */
  clockIn(input: ClockInInput): ShiftEntry {
    const emp = employeeEngine.get(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);
    if (emp.status !== "active") throw new Error(`Employee ${input.employee_id} is not active`);

    // Check for existing active shift
    const active = this.getActiveShift(input.employee_id);
    if (active) throw new Error(`Employee ${input.employee_id} already clocked in (shift ${active.id})`);

    const id = `SH-${String(this.nextShiftId++).padStart(6, "0")}`;
    const entry: ShiftEntry = {
      id,
      employee_id: input.employee_id,
      clock_in: input.timestamp ?? new Date().toISOString(),
      break_minutes: 0,
      status: "active",
    };
    this.shifts.set(id, entry);
    persistenceBridge.persist("time_entries", id, entry as any);
    this.recordAudit({ employee_id: entry.employee_id, entity_type: "shift", entity_id: id, action: "clock_in", to_status: "active", timestamp: entry.clock_in });
    return entry;
  }

  /** Clock an employee out of their shift. Finalizes all active job times. */
  clockOut(employeeId: string, timestamp?: string, handoffNotes?: string): ShiftEntry {
    const active = this.getActiveShift(employeeId);
    if (!active) throw new Error(`Employee ${employeeId} is not clocked in`);

    const now = timestamp ?? new Date().toISOString();

    // End any active job time entries
    for (const jt of this.jobTimes.values()) {
      if (jt.employee_id === employeeId && jt.status !== "completed") {
        this.jobStop({ employee_id: employeeId, job_id: jt.job_id, timestamp: now });
      }
    }

    active.clock_out = now;
    active.status = "completed";

    // Calculate hours
    const totalMs = new Date(now).getTime() - new Date(active.clock_in).getTime();
    const totalHours = Math.max(0, totalMs / 3600000 - active.break_minutes / 60);
    active.total_hours = Math.round(totalHours * 100) / 100;

    // Split into regular/OT/DT
    if (totalHours <= 8) {
      active.regular_hours = totalHours;
      active.overtime_hours = 0;
      active.double_time_hours = 0;
    } else if (totalHours <= 12) {
      active.regular_hours = 8;
      active.overtime_hours = totalHours - 8;
      active.double_time_hours = 0;
    } else {
      active.regular_hours = 8;
      active.overtime_hours = 4;
      active.double_time_hours = totalHours - 12;
    }

    // Round to 2 decimals
    active.regular_hours = Math.round(active.regular_hours * 100) / 100;
    active.overtime_hours = Math.round(active.overtime_hours * 100) / 100;
    active.double_time_hours = Math.round(active.double_time_hours * 100) / 100;

    if (handoffNotes) active.handoff_notes = sanitizeText(handoffNotes);

    persistenceBridge.persist("time_entries", active.id, active as any);
    this.recordAudit({ employee_id: active.employee_id, entity_type: "shift", entity_id: active.id, action: "clock_out", from_status: "active", to_status: "completed", timestamp: now });
    return active;
  }

  /** Get the active (clocked-in) shift for an employee. */
  getActiveShift(employeeId: string): ShiftEntry | undefined {
    for (const s of this.shifts.values()) {
      if (s.employee_id === employeeId && s.status === "active") return s;
    }
    return undefined;
  }

  /** Record a break (adds to break_minutes on active shift). */
  addBreak(employeeId: string, minutes: number): ShiftEntry {
    const active = this.getActiveShift(employeeId);
    if (!active) throw new Error(`Employee ${employeeId} is not clocked in`);
    active.break_minutes += minutes;
    persistenceBridge.persist("time_entries", active.id, active as any);
    this.recordAudit({ employee_id: active.employee_id, entity_type: "shift", entity_id: active.id, action: "break_added", detail: `+${minutes}min` });
    return active;
  }

  // ─── Job Time Tracking ──────────────────────────────────

  /** Start working on a job (clock into job). */
  jobStart(input: JobStartInput): JobTimeEntry {
    const shift = this.getActiveShift(input.employee_id);
    if (!shift) throw new Error(`Employee ${input.employee_id} must clock into shift first`);

    // Check for existing active job — pause it first
    const activeJob = this.getActiveJobTime(input.employee_id);
    if (activeJob && activeJob.job_id !== input.job_id) {
      this.jobPause({
        employee_id: input.employee_id,
        job_id: activeJob.job_id,
        reason: `Switched to job ${input.job_id}`,
        timestamp: input.timestamp,
      });
    }

    // Resume if same job was paused
    const paused = this.getPausedJobTime(input.employee_id, input.job_id);
    if (paused) {
      return this.jobResume(input.employee_id, input.job_id, input.timestamp);
    }

    const id = `JT-${String(this.nextJobTimeId++).padStart(6, "0")}`;
    const entry: JobTimeEntry = {
      id,
      employee_id: input.employee_id,
      shift_entry_id: shift.id,
      job_id: input.job_id,
      operation: input.operation,
      machine_id: input.machine_id,
      start_time: input.timestamp ?? new Date().toISOString(),
      process_type: input.process_type ?? "production_run",
      pause_periods: [],
      status: "active",
      notes: "",
    };
    this.jobTimes.set(id, entry);
    persistenceBridge.persist("job_time_entries", id, entry as any);
    this.recordAudit({ employee_id: entry.employee_id, entity_type: "job", entity_id: id, job_id: entry.job_id, action: "job_start", to_status: "active", timestamp: entry.start_time });
    return entry;
  }

  /** Pause working on a job (with reason). */
  jobPause(input: JobPauseInput): JobTimeEntry {
    const entry = this.getActiveJobTime(input.employee_id, input.job_id);
    if (!entry) throw new Error(`No active job time for employee ${input.employee_id} on job ${input.job_id}`);

    entry.pause_periods.push({
      start: input.timestamp ?? new Date().toISOString(),
      reason: sanitizeText(input.reason) ?? "",
      reason_category: input.reason_category,
    });
    entry.status = "paused";
    persistenceBridge.persist("job_time_entries", entry.id, entry as any);
    this.recordAudit({ employee_id: entry.employee_id, entity_type: "job", entity_id: entry.id, job_id: entry.job_id, action: "job_pause", from_status: "active", to_status: "paused", detail: input.reason_category, timestamp: entry.pause_periods[entry.pause_periods.length - 1]?.start });
    return entry;
  }

  /** Resume a paused job. */
  jobResume(employeeId: string, jobId: string, timestamp?: string): JobTimeEntry {
    const entry = this.getPausedJobTime(employeeId, jobId);
    if (!entry) throw new Error(`No paused job time for employee ${employeeId} on job ${jobId}`);

    const lastPause = entry.pause_periods[entry.pause_periods.length - 1];
    if (lastPause && !lastPause.end) {
      lastPause.end = timestamp ?? new Date().toISOString();
    }
    entry.status = "active";
    persistenceBridge.persist("job_time_entries", entry.id, entry as any);
    this.recordAudit({ employee_id: entry.employee_id, entity_type: "job", entity_id: entry.id, job_id: entry.job_id, action: "job_resume", from_status: "paused", to_status: "active", timestamp });
    return entry;
  }

  /** Stop working on a job (clock out of job). */
  jobStop(input: {
    employee_id: string;
    job_id: string;
    timestamp?: string;
    notes?: string;
    good_parts?: number;
    scrap_count?: number;
    scrap_reason?: string;
    improvement_note?: string;
  }): JobTimeEntry {
    // Find active or paused entry
    let entry = this.getActiveJobTime(input.employee_id, input.job_id);
    if (!entry) entry = this.getPausedJobTime(input.employee_id, input.job_id);
    if (!entry) throw new Error(`No active/paused job time for employee ${input.employee_id} on job ${input.job_id}`);

    const now = input.timestamp ?? new Date().toISOString();

    // Close any open pause
    const lastPause = entry.pause_periods[entry.pause_periods.length - 1];
    if (lastPause && !lastPause.end) {
      lastPause.end = now;
    }

    entry.end_time = now;
    entry.status = "completed";
    if (input.notes) entry.notes = sanitizeText(input.notes) ?? "";

    // Calculate total and productive minutes
    const totalMs = new Date(now).getTime() - new Date(entry.start_time).getTime();
    const pauseMs = entry.pause_periods.reduce((sum, p) => {
      const end = p.end ? new Date(p.end).getTime() : new Date(now).getTime();
      return sum + (end - new Date(p.start).getTime());
    }, 0);

    entry.total_minutes = Math.round(totalMs / 60000 * 100) / 100;
    entry.productive_minutes = Math.round((totalMs - pauseMs) / 60000 * 100) / 100;

    // Production data (sanitize user text)
    if (input.good_parts != null) entry.good_parts = input.good_parts;
    if (input.scrap_count != null) entry.scrap_count = input.scrap_count;
    if (input.scrap_reason) entry.scrap_reason = sanitizeText(input.scrap_reason);
    if (input.improvement_note) entry.improvement_note = sanitizeText(input.improvement_note);

    persistenceBridge.persist("job_time_entries", entry.id, entry as any);
    this.recordAudit({ employee_id: entry.employee_id, entity_type: "job", entity_id: entry.id, job_id: entry.job_id, action: "job_stop", to_status: "completed", timestamp: now });
    return entry;
  }

  /** Get active job time entry for an employee (optionally filtered by job). */
  getActiveJobTime(employeeId: string, jobId?: string): JobTimeEntry | undefined {
    for (const jt of this.jobTimes.values()) {
      if (
        jt.employee_id === employeeId &&
        jt.status === "active" &&
        (!jobId || jt.job_id === jobId)
      ) {
        return jt;
      }
    }
    return undefined;
  }

  /** Get paused job time entry. */
  getPausedJobTime(employeeId: string, jobId: string): JobTimeEntry | undefined {
    for (const jt of this.jobTimes.values()) {
      if (
        jt.employee_id === employeeId &&
        jt.job_id === jobId &&
        jt.status === "paused"
      ) {
        return jt;
      }
    }
    return undefined;
  }

  /** Get all active and paused jobs for an employee. */
  getActiveAndPausedJobs(employeeId: string): JobTimeEntry[] {
    const results: JobTimeEntry[] = [];
    for (const jt of this.jobTimes.values()) {
      if (jt.employee_id === employeeId && (jt.status === "active" || jt.status === "paused")) {
        results.push(jt);
      }
    }
    return results;
  }

  /** Get shift handoff info: previous shift's handoff_notes + active/paused jobs from last shift. */
  getShiftHandoff(employeeId: string): {
    previous_handoff_notes?: string;
    previous_shift?: ShiftEntry;
    carried_jobs: JobTimeEntry[];
  } {
    // Find the most recent completed shift for this employee
    let latestShift: ShiftEntry | undefined;
    for (const s of this.shifts.values()) {
      if (s.employee_id === employeeId && s.status === "completed") {
        if (!latestShift || s.clock_in > latestShift.clock_in) {
          latestShift = s;
        }
      }
    }

    // Find paused jobs from the previous shift
    const carriedJobs: JobTimeEntry[] = [];
    if (latestShift) {
      for (const jt of this.jobTimes.values()) {
        if (jt.shift_entry_id === latestShift.id && jt.status === "paused") {
          carriedJobs.push(jt);
        }
      }
    }

    return {
      previous_handoff_notes: latestShift?.handoff_notes,
      previous_shift: latestShift,
      carried_jobs: carriedJobs,
    };
  }

  // ─── Reporting ──────────────────────────────────────────

  /** Generate a timecard summary for an employee over a date range. */
  timecardSummary(
    employeeId: string,
    periodLabel: string,
    startDate: string,
    endDate: string,
  ): TimecardSummary {
    const emp = employeeEngine.get(employeeId);
    if (!emp) throw new Error(`Employee ${employeeId} not found`);

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    // Gather completed shifts in range
    const shifts: ShiftEntry[] = [];
    for (const s of this.shifts.values()) {
      if (s.employee_id !== employeeId || s.status !== "completed") continue;
      const clockIn = new Date(s.clock_in).getTime();
      if (clockIn >= start && clockIn <= end) shifts.push(s);
    }

    const totalHours = shifts.reduce((s, sh) => s + (sh.total_hours ?? 0), 0);
    const regularHours = shifts.reduce((s, sh) => s + (sh.regular_hours ?? 0), 0);
    const overtimeHours = shifts.reduce((s, sh) => s + (sh.overtime_hours ?? 0), 0);
    const doubleTimeHours = shifts.reduce((s, sh) => s + (sh.double_time_hours ?? 0), 0);
    const breakHours = shifts.reduce((s, sh) => s + sh.break_minutes / 60, 0);

    // Gather job times in range
    const jobMap = new Map<string, { hours: number; operations: Set<string> }>();
    for (const jt of this.jobTimes.values()) {
      if (jt.employee_id !== employeeId || jt.status !== "completed") continue;
      const jtStart = new Date(jt.start_time).getTime();
      if (jtStart < start || jtStart > end) continue;

      const existing = jobMap.get(jt.job_id) ?? { hours: 0, operations: new Set<string>() };
      existing.hours += (jt.productive_minutes ?? 0) / 60;
      if (jt.operation) existing.operations.add(jt.operation);
      jobMap.set(jt.job_id, existing);
    }

    const jobs = Array.from(jobMap.entries()).map(([job_id, data]) => ({
      job_id,
      hours: Math.round(data.hours * 100) / 100,
      operations: Array.from(data.operations),
    }));

    const grossPay =
      regularHours * emp.hourly_rate +
      overtimeHours * emp.overtime_rate +
      doubleTimeHours * emp.double_time_rate;

    return {
      employee_id: employeeId,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      period: periodLabel,
      shifts: shifts.length,
      total_hours: Math.round(totalHours * 100) / 100,
      regular_hours: Math.round(regularHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      double_time_hours: Math.round(doubleTimeHours * 100) / 100,
      break_hours: Math.round(breakHours * 100) / 100,
      jobs,
      gross_pay: Math.round(grossPay * 100) / 100,
    };
  }

  /** Get attendance records for a date range. */
  attendanceReport(
    startDate: string,
    endDate: string,
    departmentFilter?: string,
  ): AttendanceRecord[] {
    const employees = departmentFilter
      ? employeeEngine.search({ department: departmentFilter as Department, status: "active" })
      : employeeEngine.list("active");

    const start = new Date(startDate);
    const end = new Date(endDate);
    const records: AttendanceRecord[] = [];

    for (const emp of employees) {
      // Iterate each day in range
      const cursor = new Date(start);
      while (cursor <= end) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const dayOfWeek = cursor.getDay();

        // Only check scheduled days
        if (emp.shift.days.includes(dayOfWeek)) {
          const dayStart = new Date(`${dateStr}T00:00:00Z`).getTime();
          const dayEnd = dayStart + 86400000;

          // Find shift for this day
          const dayShift = Array.from(this.shifts.values()).find(
            (s) =>
              s.employee_id === emp.id &&
              new Date(s.clock_in).getTime() >= dayStart &&
              new Date(s.clock_in).getTime() < dayEnd,
          );

          let status: AttendanceRecord["status"] = "absent";
          if (dayShift) {
            const clockInTime = dayShift.clock_in.slice(11, 16);
            if (clockInTime > emp.shift.start_time && this.timeDiffMinutes(emp.shift.start_time, clockInTime) > 5) {
              status = "late";
            } else if (dayShift.clock_out) {
              const clockOutTime = dayShift.clock_out.slice(11, 16);
              if (clockOutTime < emp.shift.end_time && this.timeDiffMinutes(clockOutTime, emp.shift.end_time) > 5) {
                status = "left_early";
              } else {
                status = "present";
              }
            } else {
              status = "present"; // still clocked in
            }
          }

          records.push({
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            date: dateStr,
            status,
            clock_in: dayShift?.clock_in,
            clock_out: dayShift?.clock_out,
            hours_worked: dayShift?.total_hours ?? 0,
            shift_start: emp.shift.start_time,
            shift_end: emp.shift.end_time,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return records;
  }

  /** Get all job time entries for a specific job. */
  getJobTimeEntries(jobId: string): JobTimeEntry[] {
    const entries: JobTimeEntry[] = [];
    for (const jt of this.jobTimes.values()) {
      if (jt.job_id === jobId) entries.push(jt);
    }
    return entries;
  }

  /** Get who is currently clocked in. */
  whoClockedIn(): { employee_id: string; name: string; shift_id: string; clock_in: string; active_job?: string }[] {
    const result: { employee_id: string; name: string; shift_id: string; clock_in: string; active_job?: string }[] = [];
    for (const s of this.shifts.values()) {
      if (s.status !== "active") continue;
      const emp = employeeEngine.get(s.employee_id);
      const activeJob = this.getActiveJobTime(s.employee_id);
      result.push({
        employee_id: s.employee_id,
        name: emp ? `${emp.first_name} ${emp.last_name}` : s.employee_id,
        shift_id: s.id,
        clock_in: s.clock_in,
        active_job: activeJob?.job_id,
      });
    }
    return result;
  }

  /** Calculate labor cost for a specific job across all employees. */
  jobLaborCost(jobId: string): {
    job_id: string;
    total_hours: number;
    total_cost: number;
    by_employee: { employee_id: string; name: string; hours: number; cost: number }[];
  } {
    const entries = this.getJobTimeEntries(jobId).filter((e) => e.status === "completed");
    const byEmp = new Map<string, number>();

    for (const e of entries) {
      const hours = (e.productive_minutes ?? 0) / 60;
      byEmp.set(e.employee_id, (byEmp.get(e.employee_id) ?? 0) + hours);
    }

    const byEmployee: { employee_id: string; name: string; hours: number; cost: number }[] = [];
    let totalHours = 0;
    let totalCost = 0;

    for (const [empId, hours] of byEmp) {
      const emp = employeeEngine.get(empId);
      const rate = emp?.hourly_rate ?? 25;
      const cost = hours * rate;
      byEmployee.push({
        employee_id: empId,
        name: emp ? `${emp.first_name} ${emp.last_name}` : empId,
        hours: Math.round(hours * 100) / 100,
        cost: Math.round(cost * 100) / 100,
      });
      totalHours += hours;
      totalCost += cost;
    }

    return {
      job_id: jobId,
      total_hours: Math.round(totalHours * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      by_employee: byEmployee,
    };
  }

  private timeDiffMinutes(time1: string, time2: string): number {
    const [h1, m1] = time1.split(":").map(Number);
    const [h2, m2] = time2.split(":").map(Number);
    return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
  }
}

export const timeClockEngine = new TimeClockEngine();
export { TimeClockEngine };

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "time_entries",
  getMap: () => (timeClockEngine as any).shifts as Map<string, any>,
  keyField: "id",
});
persistenceBridge.registerMap({
  entity: "job_time_entries",
  getMap: () => (timeClockEngine as any).jobTimes as Map<string, any>,
  keyField: "id",
});
persistenceBridge.registerMap({
  entity: "timecard_audit",
  getMap: () => (timeClockEngine as any).auditLog as Map<string, any>,
  keyField: "id",
});
