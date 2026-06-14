/**
 * ISO9001QMSEngine — ISO 9001:2015 Quality Management System validator.
 *
 * The baseline QMS standard general manufacturing shops (including JM Die)
 * actually need for certification. Existing PRISM coverage was medical-only
 * (`ISO13485QMSEngine`) and aerospace-only (`AS9100TraceabilityEngine`); a
 * general die shop is governed by ISO 9001, not those vertical extensions.
 *
 * Scoring: compliance_score ∈ [0,1] = clauses_passing / clauses_applicable.
 * Readiness:
 *   - audit_ready when score ≥ 0.95 AND zero major findings
 *   - remediation_needed when 0.70 ≤ score < 0.95 OR any major findings
 *   - not_ready when score < 0.70
 *
 * Clause taxonomy (ISO 9001:2015):
 *   §4  Context of the organization
 *   §5  Leadership
 *   §6  Planning (risks + opportunities)
 *   §7  Support (resources, competence, awareness, documented information)
 *   §8  Operation
 *   §9  Performance evaluation (monitoring, internal audit, mgmt review)
 *  §10  Improvement (nonconformity, corrective action, continual improvement)
 *
 * Hotel-soul invariants:
 *   - Deterministic output (no LLM calls)
 *   - Defensive copy on every return (Object.frozen)
 *   - R12 fail-loud: malformed evidence rejected with explicit reason
 *
 * @module ISO9001QMSEngine
 * @milestone HOTEL/U-ISO9001-QMS (2026-05-25, slot:hotel iter4)
 */

export type ISO9001ClauseId =
  | "4.1_context"
  | "4.2_interested_parties"
  | "4.3_scope"
  | "4.4_qms_processes"
  | "5.1_leadership_commitment"
  | "5.2_policy"
  | "5.3_roles_authorities"
  | "6.1_risks_opportunities"
  | "6.2_quality_objectives"
  | "6.3_change_planning"
  | "7.1_resources"
  | "7.1.5_monitoring_measuring_resources"
  | "7.1.6_organizational_knowledge"
  | "7.2_competence"
  | "7.3_awareness"
  | "7.4_communication"
  | "7.5_documented_information"
  | "8.1_operational_planning"
  | "8.2_customer_requirements"
  | "8.3_design_development"
  | "8.4_externally_provided_processes"
  | "8.5_production_service_provision"
  | "8.6_release_of_products"
  | "8.7_nonconforming_outputs"
  | "9.1_monitoring_measurement"
  | "9.1.2_customer_satisfaction"
  | "9.2_internal_audit"
  | "9.3_management_review"
  | "10.1_improvement_general"
  | "10.2_nonconformity_corrective_action"
  | "10.3_continual_improvement";

export interface ISO9001ClauseEvidence {
  clause: ISO9001ClauseId;
  /** Is there a documented procedure? */
  procedure_documented: boolean;
  /** Are records kept and retained per retention policy? */
  records_kept: boolean;
  /** Last internal audit date (ISO-8601). */
  last_audited?: string;
  /** Audit result if known. */
  audit_result?: "pass" | "fail" | "not_applicable";
}

export interface ISO9001QMSInput {
  /** Is design/development in scope? (excludes §8.3 if false — JM Die is mostly contract die manufacturing, so often false.) */
  design_development_in_scope?: boolean;
  /** Does the org rely on external providers (subcontractors)? Triggers §8.4 mandatory. */
  uses_external_providers?: boolean;
  /** Months since last management review (>12 triggers a finding). */
  months_since_management_review?: number;
  /** Months since last internal audit cycle completed (>12 triggers a finding). */
  months_since_internal_audit?: number;
  /** Clause evidence records. */
  evidence: ISO9001ClauseEvidence[];
}

export type FindingSeverity = "major" | "minor" | "observation";

export interface ISO9001Finding {
  clause: ISO9001ClauseId;
  severity: FindingSeverity;
  message: string;
}

export interface ISO9001QMSResult {
  clauses_applicable: number;
  clauses_passing: number;
  compliance_score: number;
  readiness: "audit_ready" | "remediation_needed" | "not_ready";
  findings: ReadonlyArray<ISO9001Finding>;
  missing_clauses: ReadonlyArray<ISO9001ClauseId>;
  reasoning: ReadonlyArray<string>;
  source: "ISO9001QMSEngine.v1";
}

// ─── Clause-applicability rules ────────────────────────────────

const ALWAYS_APPLICABLE: ISO9001ClauseId[] = [
  "4.1_context",
  "4.2_interested_parties",
  "4.3_scope",
  "4.4_qms_processes",
  "5.1_leadership_commitment",
  "5.2_policy",
  "5.3_roles_authorities",
  "6.1_risks_opportunities",
  "6.2_quality_objectives",
  "6.3_change_planning",
  "7.1_resources",
  "7.1.5_monitoring_measuring_resources",
  "7.1.6_organizational_knowledge",
  "7.2_competence",
  "7.3_awareness",
  "7.4_communication",
  "7.5_documented_information",
  "8.1_operational_planning",
  "8.2_customer_requirements",
  "8.5_production_service_provision",
  "8.6_release_of_products",
  "8.7_nonconforming_outputs",
  "9.1_monitoring_measurement",
  "9.1.2_customer_satisfaction",
  "9.2_internal_audit",
  "9.3_management_review",
  "10.1_improvement_general",
  "10.2_nonconformity_corrective_action",
  "10.3_continual_improvement",
];

/** Audit-recency thresholds (months). */
const MGMT_REVIEW_MAX_MONTHS = 12;
const INTERNAL_AUDIT_MAX_MONTHS = 12;
/** Readiness thresholds. */
const AUDIT_READY_SCORE = 0.95;
const REMEDIATION_NEEDED_SCORE = 0.7;

// ─── Engine ────────────────────────────────────────────────────

class ISO9001QMSEngine {
  /**
   * Validate a QMS implementation against ISO 9001:2015 clauses.
   *
   * @param input QMS scope + evidence
   * @returns full compliance report
   * @throws Error if input is missing / malformed (R12 fail-loud)
   */
  validate(input: ISO9001QMSInput): ISO9001QMSResult {
    if (!input || typeof input !== "object") {
      throw new Error("ISO9001QMSEngine: input required");
    }
    if (!Array.isArray(input.evidence)) {
      throw new Error("ISO9001QMSEngine: input.evidence must be an array");
    }

    const applicable = new Set<ISO9001ClauseId>(ALWAYS_APPLICABLE);
    if (input.design_development_in_scope) applicable.add("8.3_design_development");
    if (input.uses_external_providers) applicable.add("8.4_externally_provided_processes");

    const evidenceByClause = new Map<ISO9001ClauseId, ISO9001ClauseEvidence>();
    for (const e of input.evidence) {
      if (!e || !e.clause) {
        throw new Error("ISO9001QMSEngine: each evidence record requires a clause id");
      }
      evidenceByClause.set(e.clause, e);
    }

    const findings: ISO9001Finding[] = [];
    const missing: ISO9001ClauseId[] = [];
    const reasoning: string[] = [];
    let passing = 0;

    for (const clause of applicable) {
      const ev = evidenceByClause.get(clause);
      if (!ev) {
        missing.push(clause);
        findings.push({
          clause,
          severity: "major",
          message: `Clause ${clause}: no evidence supplied — major nonconformity`,
        });
        continue;
      }
      const passes = this.clausePasses(ev);
      if (passes) {
        passing++;
      } else {
        const sev: FindingSeverity = ev.audit_result === "fail" ? "major" : "minor";
        findings.push({
          clause,
          severity: sev,
          message: this.findingMessage(clause, ev),
        });
      }
    }

    // Audit + management-review recency
    if (typeof input.months_since_management_review === "number") {
      if (input.months_since_management_review > MGMT_REVIEW_MAX_MONTHS) {
        findings.push({
          clause: "9.3_management_review",
          severity: "major",
          message: `Management review ${input.months_since_management_review} months old (>${MGMT_REVIEW_MAX_MONTHS} mo limit per §9.3)`,
        });
        reasoning.push(
          `Management review must occur at planned intervals — flagged as overdue.`,
        );
      }
    }
    if (typeof input.months_since_internal_audit === "number") {
      if (input.months_since_internal_audit > INTERNAL_AUDIT_MAX_MONTHS) {
        findings.push({
          clause: "9.2_internal_audit",
          severity: "major",
          message: `Internal audit cycle ${input.months_since_internal_audit} months old (>${INTERNAL_AUDIT_MAX_MONTHS} mo limit per §9.2)`,
        });
        reasoning.push(
          `Internal audit cycle has exceeded 12 months — overdue.`,
        );
      }
    }

    const total = applicable.size;
    const score = total > 0 ? passing / total : 0;
    const hasMajor = findings.some((f) => f.severity === "major");
    let readiness: ISO9001QMSResult["readiness"];
    if (score >= AUDIT_READY_SCORE && !hasMajor) readiness = "audit_ready";
    else if (score >= REMEDIATION_NEEDED_SCORE) readiness = "remediation_needed";
    else readiness = "not_ready";

    reasoning.push(`${passing}/${total} applicable clauses pass.`);
    reasoning.push(`Readiness: ${readiness}.`);

    return Object.freeze({
      clauses_applicable: total,
      clauses_passing: passing,
      compliance_score: this.round4(score),
      readiness,
      findings: Object.freeze([...findings]),
      missing_clauses: Object.freeze([...missing]),
      reasoning: Object.freeze([...reasoning]),
      source: "ISO9001QMSEngine.v1" as const,
    });
  }

  /**
   * Return the full clause taxonomy (defensive copy).
   */
  listClauses(): ReadonlyArray<ISO9001ClauseId> {
    return Object.freeze([
      ...ALWAYS_APPLICABLE,
      "8.3_design_development",
      "8.4_externally_provided_processes",
    ]);
  }

  // ─── Internals ────────────────────────────────────────────────

  private clausePasses(ev: ISO9001ClauseEvidence): boolean {
    if (ev.audit_result === "fail") return false;
    if (!ev.procedure_documented) return false;
    if (!ev.records_kept) return false;
    return true;
  }

  private findingMessage(clause: ISO9001ClauseId, ev: ISO9001ClauseEvidence): string {
    const missing: string[] = [];
    if (!ev.procedure_documented) missing.push("procedure not documented");
    if (!ev.records_kept) missing.push("records not kept");
    if (ev.audit_result === "fail") missing.push("last audit failed");
    return `Clause ${clause}: ${missing.join(", ")}`;
  }

  private round4(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10000) / 10000;
  }
}

export const iso9001QMSEngine = new ISO9001QMSEngine();
