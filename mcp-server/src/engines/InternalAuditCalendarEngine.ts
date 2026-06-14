/**
 * InternalAuditCalendarEngine — ISO 9001:2015 §9.2 internal audit scheduling.
 *
 * §9.2 mandates planned internal audits at planned intervals to verify the
 * QMS conforms to ISO requirements + the org's own requirements + is
 * effectively implemented and maintained.
 *
 * Engine surface: schedule audits per clause/process, assign lead auditors
 * (independence rule — auditors not auditing their own work), record findings
 * + close-out tracking, calendar query, overdue alert.
 *
 * Hotel-soul invariants: R12 fail-loud, PII-free, Object.frozen, audit-trail immutable.
 *
 * @module InternalAuditCalendarEngine
 * @milestone HOTEL/U-INTERNAL-AUDIT-CALENDAR (2026-05-25, slot:hotel iter14)
 */

const DAY_MS = 86_400_000;

export type AuditStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface AuditFinding {
  id: string;
  audit_id: string;
  severity: "major" | "minor" | "observation" | "opportunity_for_improvement";
  clause_reference: string;
  description: string;
  raised_at: string;
  closed_at: string | null;
  corrective_action_ref?: string;
}

export interface InternalAudit {
  id: string;
  scope: string;
  clauses_in_scope: ReadonlyArray<string>;
  processes_in_scope: ReadonlyArray<string>;
  scheduled_for: string;
  lead_auditor_id: string;
  auditees_employee_ids: ReadonlyArray<string>;
  status: AuditStatus;
  started_at: string | null;
  completed_at: string | null;
  findings: ReadonlyArray<AuditFinding>;
  report_ref?: string;
}

class InternalAuditCalendarEngine {
  private audits: Map<string, InternalAudit> = new Map();
  private findings: Map<string, AuditFinding> = new Map();
  private nextAuditId = 1;
  private nextFindingId = 1;

  scheduleAudit(args: {
    scope: string;
    clauses_in_scope: string[];
    processes_in_scope?: string[];
    scheduled_for: string;
    lead_auditor_id: string;
    auditees_employee_ids: string[];
  }): InternalAudit {
    if (!args.scope || !args.lead_auditor_id) {
      throw new Error("InternalAuditCalendarEngine.scheduleAudit: scope + lead_auditor_id required");
    }
    if (!Array.isArray(args.clauses_in_scope) || args.clauses_in_scope.length === 0) {
      throw new Error("InternalAuditCalendarEngine.scheduleAudit: clauses_in_scope must be non-empty array");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.scheduled_for)) {
      throw new Error("InternalAuditCalendarEngine.scheduleAudit: scheduled_for must be ISO date YYYY-MM-DD");
    }
    if (args.auditees_employee_ids.includes(args.lead_auditor_id)) {
      throw new Error(
        "InternalAuditCalendarEngine.scheduleAudit: independence violation — lead_auditor cannot be an auditee (§9.2 independence rule)",
      );
    }
    const id = `AUDIT-${String(this.nextAuditId++).padStart(6, "0")}`;
    const audit: InternalAudit = Object.freeze({
      id,
      scope: args.scope,
      clauses_in_scope: Object.freeze([...args.clauses_in_scope]),
      processes_in_scope: Object.freeze([...(args.processes_in_scope ?? [])]),
      scheduled_for: args.scheduled_for,
      lead_auditor_id: args.lead_auditor_id,
      auditees_employee_ids: Object.freeze([...args.auditees_employee_ids]),
      status: "scheduled" as const,
      started_at: null,
      completed_at: null,
      findings: Object.freeze([]),
    });
    this.audits.set(id, audit);
    return audit;
  }

  startAudit(args: { audit_id: string }): InternalAudit {
    const a = this.requireAudit(args.audit_id);
    if (a.status !== "scheduled") {
      throw new Error(`InternalAuditCalendarEngine.startAudit: audit must be 'scheduled' (got '${a.status}')`);
    }
    const updated: InternalAudit = Object.freeze({
      ...a,
      status: "in_progress" as const,
      started_at: new Date().toISOString(),
    });
    this.audits.set(a.id, updated);
    return updated;
  }

  recordFinding(args: {
    audit_id: string;
    severity: AuditFinding["severity"];
    clause_reference: string;
    description: string;
  }): AuditFinding {
    const a = this.requireAudit(args.audit_id);
    if (a.status !== "in_progress" && a.status !== "completed") {
      throw new Error(`InternalAuditCalendarEngine.recordFinding: audit must be 'in_progress' or 'completed'`);
    }
    if (!args.clause_reference || args.description.trim().length < 5) {
      throw new Error("InternalAuditCalendarEngine.recordFinding: clause_reference + description (≥5 chars) required");
    }
    const valid: AuditFinding["severity"][] = ["major", "minor", "observation", "opportunity_for_improvement"];
    if (!valid.includes(args.severity)) {
      throw new Error(`InternalAuditCalendarEngine.recordFinding: severity must be one of ${valid.join(", ")}`);
    }
    const id = `FIND-${String(this.nextFindingId++).padStart(6, "0")}`;
    const finding: AuditFinding = Object.freeze({
      id,
      audit_id: a.id,
      severity: args.severity,
      clause_reference: args.clause_reference,
      description: args.description,
      raised_at: new Date().toISOString(),
      closed_at: null,
    });
    this.findings.set(id, finding);
    const updated: InternalAudit = Object.freeze({
      ...a,
      findings: Object.freeze([...a.findings, finding]),
    });
    this.audits.set(a.id, updated);
    return finding;
  }

  closeFinding(args: { finding_id: string; corrective_action_ref: string }): AuditFinding {
    const f = this.findings.get(args.finding_id);
    if (!f) throw new Error(`InternalAuditCalendarEngine.closeFinding: unknown finding_id "${args.finding_id}"`);
    if (!args.corrective_action_ref || args.corrective_action_ref.trim().length < 1) {
      throw new Error("InternalAuditCalendarEngine.closeFinding: corrective_action_ref required");
    }
    const updated: AuditFinding = Object.freeze({
      ...f,
      closed_at: new Date().toISOString(),
      corrective_action_ref: args.corrective_action_ref,
    });
    this.findings.set(f.id, updated);
    // Also update the audit's findings array.
    const audit = this.audits.get(f.audit_id);
    if (audit) {
      const newFindings = audit.findings.map((af) => (af.id === f.id ? updated : af));
      this.audits.set(audit.id, Object.freeze({ ...audit, findings: Object.freeze(newFindings) }));
    }
    return updated;
  }

  completeAudit(args: { audit_id: string; report_ref?: string }): InternalAudit {
    const a = this.requireAudit(args.audit_id);
    if (a.status !== "in_progress") {
      throw new Error("InternalAuditCalendarEngine.completeAudit: audit must be 'in_progress'");
    }
    const updated: InternalAudit = Object.freeze({
      ...a,
      status: "completed" as const,
      completed_at: new Date().toISOString(),
      ...(args.report_ref !== undefined && { report_ref: args.report_ref }),
    });
    this.audits.set(a.id, updated);
    return updated;
  }

  listOverdue(args?: { as_of?: string }): ReadonlyArray<InternalAudit> {
    const asOf = args?.as_of ?? new Date().toISOString().slice(0, 10);
    return Object.freeze(
      [...this.audits.values()]
        .filter((a) => a.status === "scheduled" && a.scheduled_for < asOf)
        .map((a) => Object.freeze({ ...a })),
    );
  }

  listByStatus(status: AuditStatus): ReadonlyArray<InternalAudit> {
    return Object.freeze([...this.audits.values()].filter((a) => a.status === status).map((a) => Object.freeze({ ...a })));
  }

  getAudit(id: string): InternalAudit | null {
    const a = this.audits.get(id);
    return a ? Object.freeze({ ...a }) : null;
  }

  /** Annual coverage report — which clauses have been audited within the last 12 months. */
  annualCoverage(args?: { as_of?: string }): {
    as_of: string;
    clauses_audited: ReadonlyArray<string>;
    coverage_count: number;
  } {
    const asOf = args?.as_of ?? new Date().toISOString().slice(0, 10);
    const asOfMs = Date.parse(asOf);
    const cutoff = new Date(asOfMs - 365 * DAY_MS).toISOString().slice(0, 10);
    const clauses = new Set<string>();
    for (const a of this.audits.values()) {
      if (a.status !== "completed" || !a.completed_at) continue;
      if (a.completed_at.slice(0, 10) < cutoff) continue;
      for (const c of a.clauses_in_scope) clauses.add(c);
    }
    const sorted = [...clauses].sort();
    return Object.freeze({
      as_of: asOf,
      clauses_audited: Object.freeze(sorted),
      coverage_count: sorted.length,
    });
  }

  reset(): void {
    this.audits.clear();
    this.findings.clear();
    this.nextAuditId = 1;
    this.nextFindingId = 1;
  }

  private requireAudit(id: string): InternalAudit {
    const a = this.audits.get(id);
    if (!a) throw new Error(`InternalAuditCalendarEngine: unknown audit_id "${id}"`);
    return a;
  }
}

export const internalAuditCalendarEngine = new InternalAuditCalendarEngine();
