/**
 * ISO13485QMSEngine
 * ===================
 *
 * Medical device Quality Management System validator per ISO 13485:2016.
 *
 * Distinct from AS9100 (aerospace) — ISO 13485 has medical-specific
 * clauses not found in AS9100:
 *   - Cl. 4.2.3  Medical device file (MDF) / Device Master Record (DMR)
 *   - Cl. 7.3    Design and development (design history file)
 *   - Cl. 7.5.2  Cleanliness / contamination control (sterile devices)
 *   - Cl. 7.5.5  Sterilization process validation
 *   - Cl. 7.5.7  UDI & traceability (implantable devices mandatory)
 *   - Cl. 8.2.1  Feedback → post-market surveillance (PMS)
 *   - Cl. 8.5.2  Advisory notices / field actions
 *
 * Scoring:
 *   Compliance score in [0, 1] = (clauses_passing / clauses_applicable).
 *   Gaps categorized by risk class (I / IIa / IIb / III — EU MDR annex VIII).
 *
 * Input:
 *   Device classification, clauses present in QMS, evidence records.
 * Output:
 *   clauses_passing, gaps, findings by severity, readiness verdict.
 *
 * References:
 *   - ISO 13485:2016 (Medical devices — Quality management systems)
 *   - FDA 21 CFR 820 (QSR — harmonizing with ISO 13485 per 2024 rule)
 *   - GHTF SG3/N15R8 (Implementation of risk management)
 *
 * @module engines/ISO13485QMSEngine
 * @milestone LATHE-PRO-MS9
 */

export type DeviceClass = "I" | "IIa" | "IIb" | "III";

export type QMSClauseId =
  | "4.2.3_MDF"
  | "4.2.4_document_control"
  | "4.2.5_records_control"
  | "6.2_competence"
  | "6.4.1_work_environment"
  | "6.4.2_contamination_control"
  | "7.1_planning"
  | "7.2_customer_requirements"
  | "7.3_design_development"
  | "7.4_purchasing"
  | "7.5.1_production_controls"
  | "7.5.2_cleanliness"
  | "7.5.5_sterilization_validation"
  | "7.5.6_process_validation"
  | "7.5.7_UDI_traceability"
  | "7.5.8_identification"
  | "7.5.9_particular_requirements"
  | "7.6_monitoring_measuring"
  | "8.2.1_feedback"
  | "8.2.2_complaint_handling"
  | "8.2.3_regulatory_reporting"
  | "8.3_nonconforming_product"
  | "8.4_data_analysis"
  | "8.5.1_improvement"
  | "8.5.2_CAPA"
  | "8.5.3_advisory_notices";

export interface ClauseEvidence {
  clause: QMSClauseId;
  /** Is there a procedure document? */
  procedure_documented: boolean;
  /** Are records kept and retained? */
  records_kept: boolean;
  /** Last internal audit date (ISO-8601). Optional. */
  last_audited?: string;
  /** Audit result if known */
  audit_result?: "pass" | "fail" | "not_applicable";
}

export interface ISO13485QMSInput {
  /** Device risk classification */
  device_class: DeviceClass;
  /** Is device sterile? Triggers 7.5.2 + 7.5.5 as mandatory */
  sterile?: boolean;
  /** Is device implantable? Triggers 7.5.7 UDI as mandatory */
  implantable?: boolean;
  /** Is the device software-containing (SaMD)? */
  software_containing?: boolean;
  /** Clause evidence records */
  evidence: ClauseEvidence[];
}

export type FindingSeverity = "major" | "minor" | "observation";

export interface QMSFinding {
  clause: QMSClauseId;
  severity: FindingSeverity;
  message: string;
}

export interface ISO13485QMSResult {
  device_class: DeviceClass;
  clauses_applicable: number;
  clauses_passing: number;
  compliance_score: number;
  readiness: "audit_ready" | "remediation_needed" | "not_ready";
  findings: QMSFinding[];
  missing_clauses: QMSClauseId[];
  reasoning: string[];
}

/** Always-applicable clauses regardless of device class */
const CORE_CLAUSES: QMSClauseId[] = [
  "4.2.3_MDF",
  "4.2.4_document_control",
  "4.2.5_records_control",
  "6.2_competence",
  "7.1_planning",
  "7.2_customer_requirements",
  "7.3_design_development",
  "7.4_purchasing",
  "7.5.1_production_controls",
  "7.5.6_process_validation",
  "7.5.8_identification",
  "7.6_monitoring_measuring",
  "8.2.1_feedback",
  "8.2.2_complaint_handling",
  "8.3_nonconforming_product",
  "8.4_data_analysis",
  "8.5.1_improvement",
  "8.5.2_CAPA",
];

class ISO13485QMSEngineImpl {
  evaluate(i: ISO13485QMSInput): ISO13485QMSResult {
    const reasoning: string[] = [];
    const findings: QMSFinding[] = [];

    // Determine applicable clauses
    const applicable = new Set<QMSClauseId>(CORE_CLAUSES);
    if (i.sterile) {
      applicable.add("6.4.2_contamination_control");
      applicable.add("7.5.2_cleanliness");
      applicable.add("7.5.5_sterilization_validation");
    }
    if (i.implantable || i.device_class === "III") {
      applicable.add("7.5.7_UDI_traceability");
      applicable.add("7.5.9_particular_requirements");
    }
    if (i.device_class === "IIb" || i.device_class === "III") {
      applicable.add("6.4.1_work_environment");
      applicable.add("8.2.3_regulatory_reporting");
      applicable.add("8.5.3_advisory_notices");
    }

    // Evidence map
    const evMap = new Map<QMSClauseId, ClauseEvidence>();
    for (const e of i.evidence) evMap.set(e.clause, e);

    let passing = 0;
    const missing: QMSClauseId[] = [];
    for (const cl of applicable) {
      const e = evMap.get(cl);
      if (!e) {
        missing.push(cl);
        findings.push({
          clause: cl,
          severity: "major",
          message: `Clause ${cl} applicable but no evidence provided`,
        });
        continue;
      }
      if (!e.procedure_documented) {
        findings.push({
          clause: cl,
          severity: "major",
          message: `Clause ${cl}: no documented procedure`,
        });
        continue;
      }
      if (!e.records_kept) {
        findings.push({
          clause: cl,
          severity: "minor",
          message: `Clause ${cl}: procedure exists but records not retained`,
        });
        continue;
      }
      if (e.audit_result === "fail") {
        findings.push({
          clause: cl,
          severity: "major",
          message: `Clause ${cl}: last internal audit FAILED`,
        });
        continue;
      }
      if (!e.last_audited) {
        findings.push({
          clause: cl,
          severity: "observation",
          message: `Clause ${cl}: no internal audit on record`,
        });
      }
      passing++;
    }

    const score = applicable.size > 0 ? passing / applicable.size : 0;
    const majors = findings.filter((f) => f.severity === "major").length;
    const minors = findings.filter((f) => f.severity === "minor").length;

    let readiness: ISO13485QMSResult["readiness"];
    if (majors === 0 && minors <= 2 && score >= 0.95) readiness = "audit_ready";
    else if (majors <= 2 && score >= 0.80) readiness = "remediation_needed";
    else readiness = "not_ready";

    reasoning.push(`Device class ${i.device_class}: ${applicable.size} clauses applicable`);
    reasoning.push(`${passing}/${applicable.size} passing → score ${round2(score)}`);
    reasoning.push(`${majors} major, ${minors} minor findings`);

    return {
      device_class: i.device_class,
      clauses_applicable: applicable.size,
      clauses_passing: passing,
      compliance_score: round2(score),
      readiness,
      findings,
      missing_clauses: missing,
      reasoning,
    };
  }

  getStats(): { core_clauses: number; reference: string } {
    return {
      core_clauses: CORE_CLAUSES.length,
      reference: "ISO 13485:2016; FDA 21 CFR 820 (QSR 2024 harmonization)",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const iso13485QmsEngine = new ISO13485QMSEngineImpl();
export type { ISO13485QMSEngineImpl };
