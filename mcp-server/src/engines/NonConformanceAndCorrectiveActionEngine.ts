/**
 * NonConformanceAndCorrectiveActionEngine — ISO 9001:2015 §10.2 NC/CA workflow.
 *
 * §10.2.1 mandates that when a nonconformity (NC) occurs the organization
 * shall:
 *   (a) react to it — control + correct it, deal with consequences
 *   (b) evaluate the need for action to eliminate the cause(s) so it does not
 *       recur or occur elsewhere — by:
 *       (1) reviewing + analyzing the NC
 *       (2) determining the cause(s)
 *       (3) determining whether similar NCs exist or could potentially occur
 *   (c) implement any action needed
 *   (d) review the effectiveness of any corrective action taken
 *   (e) update risks + opportunities determined during planning, if necessary
 *   (f) make changes to the QMS, if necessary
 *
 * §10.2.2 requires the org to retain documented information as evidence of:
 *   (a) the nature of the nonconformities + any subsequent actions taken
 *   (b) the results of any corrective action
 *
 * 8D corrective-action structure: D1 team → D2 problem definition → D3 contain
 * → D4 root cause → D5 corrective action → D6 implement → D7 prevent recur
 * → D8 verify effectiveness.
 *
 * Bridges:
 *   - InternalAuditCalendarEngine (iter14): audit findings → NCRs
 *   - ManagementReviewEngine (iter14): NC summary as §9.3.2 input
 *
 * Hotel-soul invariants: R12 fail-loud, Object.frozen, PII-free, audit-trail.
 *
 * @module NonConformanceAndCorrectiveActionEngine
 * @milestone HOTEL/U-NONCONFORMANCE-CORRECTIVE-ACTION (2026-05-25, slot:hotel iter23)
 */

export type NCStatus = "open" | "contained" | "in_root_cause" | "in_corrective_action" | "verified" | "closed";
export type NCSource =
  | "customer_complaint"
  | "internal_audit"
  | "external_audit"
  | "supplier"
  | "internal_inspection"
  | "process_excursion";
export type NCSeverity = "critical" | "major" | "minor";

export interface NonConformance {
  id: string;
  source: NCSource;
  severity: NCSeverity;
  description: string;
  clause_reference?: string;     // optional ISO clause cite
  reported_by_employee_id: string;
  reported_at: string;
  affected_job_ids: ReadonlyArray<string>;
  affected_part_ids: ReadonlyArray<string>;
  parent_audit_finding_id?: string; // linkage to internal audit
  status: NCStatus;
  // 8D-style record
  d1_team_members?: ReadonlyArray<string>;
  d2_problem_definition?: string;
  d3_containment_action?: string;
  d3_contained_at?: string;
  d4_root_cause?: string;
  d4_root_cause_at?: string;
  d5_corrective_action?: string;
  d5_planned_due_date?: string;
  d6_implemented_at?: string;
  d7_prevention_measures?: string;
  d8_verification_evidence?: string;
  d8_verified_at?: string;
  d8_effectiveness_score?: number; // 0..1
  closed_at?: string;
  cost_impact_cents?: number;
}

const STATUS_ORDER: Record<NCStatus, number> = {
  open: 0,
  contained: 1,
  in_root_cause: 2,
  in_corrective_action: 3,
  verified: 4,
  closed: 5,
};

class NonConformanceAndCorrectiveActionEngine {
  private ncs: Map<string, NonConformance> = new Map();
  private nextNcId = 1;

  recordNC(args: {
    source: NCSource;
    severity: NCSeverity;
    description: string;
    reported_by_employee_id: string;
    clause_reference?: string;
    affected_job_ids?: string[];
    affected_part_ids?: string[];
    parent_audit_finding_id?: string;
    cost_impact_cents?: number;
  }): NonConformance {
    if (!args.description || args.description.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordNC: description (≥10 chars) required",
      );
    }
    if (!args.reported_by_employee_id) {
      throw new Error("NonConformanceAndCorrectiveActionEngine.recordNC: reported_by_employee_id required");
    }
    const validSources: NCSource[] = [
      "customer_complaint",
      "internal_audit",
      "external_audit",
      "supplier",
      "internal_inspection",
      "process_excursion",
    ];
    if (!validSources.includes(args.source)) {
      throw new Error(`NonConformanceAndCorrectiveActionEngine.recordNC: invalid source "${args.source}"`);
    }
    const validSeverities: NCSeverity[] = ["critical", "major", "minor"];
    if (!validSeverities.includes(args.severity)) {
      throw new Error(`NonConformanceAndCorrectiveActionEngine.recordNC: invalid severity "${args.severity}"`);
    }
    if (args.cost_impact_cents !== undefined &&
        (!Number.isFinite(args.cost_impact_cents) || args.cost_impact_cents < 0)) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordNC: cost_impact_cents must be non-negative finite",
      );
    }
    const id = `NCR-${String(this.nextNcId++).padStart(6, "0")}`;
    const nc: NonConformance = Object.freeze({
      id,
      source: args.source,
      severity: args.severity,
      description: args.description,
      reported_by_employee_id: args.reported_by_employee_id,
      reported_at: new Date().toISOString(),
      affected_job_ids: Object.freeze([...(args.affected_job_ids ?? [])]),
      affected_part_ids: Object.freeze([...(args.affected_part_ids ?? [])]),
      status: "open" as const,
      ...(args.clause_reference !== undefined && { clause_reference: args.clause_reference }),
      ...(args.parent_audit_finding_id !== undefined && { parent_audit_finding_id: args.parent_audit_finding_id }),
      ...(args.cost_impact_cents !== undefined && { cost_impact_cents: args.cost_impact_cents }),
    });
    this.ncs.set(id, nc);
    return nc;
  }

  /** D1+D2+D3: team + problem definition + containment. */
  recordContainment(args: {
    ncr_id: string;
    team_members: string[];
    problem_definition: string;
    containment_action: string;
  }): NonConformance {
    const nc = this.requireNC(args.ncr_id);
    if (nc.status !== "open") {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.recordContainment: NC must be 'open' (got '${nc.status}')`,
      );
    }
    if (!Array.isArray(args.team_members) || args.team_members.length === 0) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordContainment: ≥1 team_member required",
      );
    }
    if (!args.problem_definition || args.problem_definition.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordContainment: problem_definition (≥10 chars) required",
      );
    }
    if (!args.containment_action || args.containment_action.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordContainment: containment_action (≥10 chars) required",
      );
    }
    const updated: NonConformance = Object.freeze({
      ...nc,
      status: "contained" as const,
      d1_team_members: Object.freeze([...args.team_members]),
      d2_problem_definition: args.problem_definition,
      d3_containment_action: args.containment_action,
      d3_contained_at: new Date().toISOString(),
    });
    this.ncs.set(nc.id, updated);
    return updated;
  }

  /** D4: root cause analysis. */
  recordRootCause(args: { ncr_id: string; root_cause: string }): NonConformance {
    const nc = this.requireNC(args.ncr_id);
    if (nc.status !== "contained") {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.recordRootCause: NC must be 'contained' (got '${nc.status}')`,
      );
    }
    if (!args.root_cause || args.root_cause.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordRootCause: root_cause (≥10 chars) required",
      );
    }
    const updated: NonConformance = Object.freeze({
      ...nc,
      status: "in_root_cause" as const,
      d4_root_cause: args.root_cause,
      d4_root_cause_at: new Date().toISOString(),
    });
    this.ncs.set(nc.id, updated);
    return updated;
  }

  /** D5+D6: corrective action plan + implementation. */
  recordCorrectiveAction(args: {
    ncr_id: string;
    corrective_action: string;
    planned_due_date: string;
    implemented_at?: string;
  }): NonConformance {
    const nc = this.requireNC(args.ncr_id);
    if (nc.status !== "in_root_cause") {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.recordCorrectiveAction: NC must be 'in_root_cause' (got '${nc.status}')`,
      );
    }
    if (!args.corrective_action || args.corrective_action.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordCorrectiveAction: corrective_action (≥10 chars) required",
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.planned_due_date)) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordCorrectiveAction: planned_due_date must be ISO YYYY-MM-DD",
      );
    }
    const updated: NonConformance = Object.freeze({
      ...nc,
      status: "in_corrective_action" as const,
      d5_corrective_action: args.corrective_action,
      d5_planned_due_date: args.planned_due_date,
      ...(args.implemented_at !== undefined && { d6_implemented_at: args.implemented_at }),
    });
    this.ncs.set(nc.id, updated);
    return updated;
  }

  /** D7+D8: prevention + verify effectiveness (effectiveness_score 0..1). */
  recordVerification(args: {
    ncr_id: string;
    prevention_measures: string;
    verification_evidence: string;
    effectiveness_score: number;
  }): NonConformance {
    const nc = this.requireNC(args.ncr_id);
    if (nc.status !== "in_corrective_action") {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.recordVerification: NC must be 'in_corrective_action' (got '${nc.status}')`,
      );
    }
    if (!args.prevention_measures || args.prevention_measures.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordVerification: prevention_measures (≥10 chars) required",
      );
    }
    if (!args.verification_evidence || args.verification_evidence.trim().length < 10) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordVerification: verification_evidence (≥10 chars) required",
      );
    }
    if (!Number.isFinite(args.effectiveness_score) ||
        args.effectiveness_score < 0 || args.effectiveness_score > 1) {
      throw new Error(
        "NonConformanceAndCorrectiveActionEngine.recordVerification: effectiveness_score must be in [0, 1]",
      );
    }
    const updated: NonConformance = Object.freeze({
      ...nc,
      status: "verified" as const,
      d7_prevention_measures: args.prevention_measures,
      d8_verification_evidence: args.verification_evidence,
      d8_effectiveness_score: args.effectiveness_score,
      d8_verified_at: new Date().toISOString(),
    });
    this.ncs.set(nc.id, updated);
    return updated;
  }

  /** Final close-out; refuses if effectiveness_score < 0.70 (re-open + investigate). */
  closeNC(args: { ncr_id: string }): NonConformance {
    const nc = this.requireNC(args.ncr_id);
    if (nc.status !== "verified") {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.closeNC: NC must be 'verified' (got '${nc.status}')`,
      );
    }
    if ((nc.d8_effectiveness_score ?? 0) < 0.70) {
      throw new Error(
        `NonConformanceAndCorrectiveActionEngine.closeNC: effectiveness_score ${nc.d8_effectiveness_score?.toFixed(2)} < 0.70 — re-open + investigate (§10.2.1(d))`,
      );
    }
    const updated: NonConformance = Object.freeze({
      ...nc,
      status: "closed" as const,
      closed_at: new Date().toISOString(),
    });
    this.ncs.set(nc.id, updated);
    return updated;
  }

  /** §9.3.2(c) input — NC summary for management review meeting. */
  managementReviewSummary(args?: { since?: string }): {
    total_ncs: number;
    by_severity: Readonly<Record<NCSeverity, number>>;
    by_source: Readonly<Record<NCSource, number>>;
    closed_count: number;
    open_count: number;
    total_cost_impact_cents: number;
    avg_effectiveness_score: number;
  } {
    const since = args?.since;
    let total = 0;
    const bySev: Record<NCSeverity, number> = { critical: 0, major: 0, minor: 0 };
    const bySrc: Record<NCSource, number> = {
      customer_complaint: 0, internal_audit: 0, external_audit: 0,
      supplier: 0, internal_inspection: 0, process_excursion: 0,
    };
    let closed = 0, open = 0, cost = 0;
    const scores: number[] = [];
    for (const nc of this.ncs.values()) {
      if (since && nc.reported_at < since) continue;
      total++;
      bySev[nc.severity]++;
      bySrc[nc.source]++;
      if (nc.status === "closed") closed++;
      else open++;
      cost += nc.cost_impact_cents ?? 0;
      if (nc.d8_effectiveness_score !== undefined) scores.push(nc.d8_effectiveness_score);
    }
    const avgScore = scores.length === 0 ? 0 : scores.reduce((s, x) => s + x, 0) / scores.length;
    return Object.freeze({
      total_ncs: total,
      by_severity: Object.freeze(bySev),
      by_source: Object.freeze(bySrc),
      closed_count: closed,
      open_count: open,
      total_cost_impact_cents: cost,
      avg_effectiveness_score: Number(avgScore.toFixed(4)),
    });
  }

  getNC(id: string): NonConformance | null {
    const nc = this.ncs.get(id);
    return nc ? Object.freeze({ ...nc }) : null;
  }

  listNCs(args: { status?: NCStatus; severity?: NCSeverity; source?: NCSource }): ReadonlyArray<NonConformance> {
    const out: NonConformance[] = [];
    for (const nc of this.ncs.values()) {
      if (args.status && nc.status !== args.status) continue;
      if (args.severity && nc.severity !== args.severity) continue;
      if (args.source && nc.source !== args.source) continue;
      out.push(Object.freeze({ ...nc }));
    }
    out.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return Object.freeze(out);
  }

  reset(): void {
    this.ncs.clear();
    this.nextNcId = 1;
  }

  private requireNC(id: string): NonConformance {
    const nc = this.ncs.get(id);
    if (!nc) throw new Error(`NonConformanceAndCorrectiveActionEngine: unknown ncr_id "${id}"`);
    return nc;
  }
}

export const nonConformanceAndCorrectiveActionEngine = new NonConformanceAndCorrectiveActionEngine();
