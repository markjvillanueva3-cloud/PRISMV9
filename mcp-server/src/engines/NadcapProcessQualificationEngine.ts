/**
 * NadcapProcessQualificationEngine
 * ==================================
 *
 * Validates special-process qualification against Nadcap audit criteria.
 * Nadcap (National Aerospace and Defense Contractors Accreditation
 * Program) audits "special processes" — those whose quality cannot be
 * fully verified by subsequent inspection.
 *
 * Covered AC7xxx audit criteria (subset):
 *   AC7101  Heat treating (master)
 *   AC7102  Heat treating of metals
 *   AC7108  Chemical processing
 *   AC7109  Non-conventional machining (EDM, ECM, laser)
 *   AC7114  Non-destructive testing (NDT master)
 *   AC7116  Surface enhancement (shot peen, LSP)
 *   AC7117  Composites
 *   AC7118  Conventional machining (Nadcap expanding to machining)
 *   AC7122  Materials testing laboratories
 *   AC7200  Fluids distribution
 *
 * Each AC has ~100-200 line-items audited on a 1-7 point scale; this
 * engine uses a simplified compliance-checklist model:
 *   - Pyrometer / thermocouple calibration (AC7102)
 *   - Furnace uniformity surveys (AC7102 §8)
 *   - Chemical bath monitoring (AC7108)
 *   - NDT operator certification NAS-410 (AC7114)
 *   - Etch inspection frequency
 *   - Process sheet revision control
 *   - Material lot traceability
 *
 * Verdict: approved / conditional / denied based on major/minor finding
 * mix (Nadcap uses A/B/C finding levels).
 *
 * References:
 *   - eAuditNet AC7xxx series (PRI)
 *   - AIA Standard S12/AS7003 supplier quality
 *   - NAS-410 (NDT personnel qualification)
 *
 * @module engines/NadcapProcessQualificationEngine
 * @milestone LATHE-PRO-MS9
 */

export type NadcapProcessType =
  | "heat_treat"
  | "chemical_processing"
  | "non_conventional_machining"
  | "ndt"
  | "surface_enhancement"
  | "composites"
  | "conventional_machining"
  | "materials_testing"
  | "fluids_distribution";

export type NadcapFinding = "A" | "B" | "C";

export interface NadcapLineItem {
  /** Line-item reference, e.g., "AC7102 §8.2" */
  ref: string;
  description: string;
  status: "compliant" | "minor" | "major" | "critical" | "not_applicable";
  evidence?: string;
}

export interface NadcapQualificationInput {
  process: NadcapProcessType;
  /** Audit cycle period (months) — Nadcap is 24mo default, can be 12mo */
  cycle_months?: number;
  /** Last audit date ISO-8601 */
  last_audit_date?: string;
  /** Line items evaluated */
  line_items: NadcapLineItem[];
  /** Operator certifications, e.g., ["NAS-410 L2 UT", "NAS-410 L2 PT"] */
  operator_certs?: string[];
  /** Furnace TUS (Temperature Uniformity Survey) last date; only heat_treat */
  tus_last_date?: string;
  /** Is the supplier Nadcap-accredited already? */
  accredited?: boolean;
}

export interface NadcapResult {
  process: NadcapProcessType;
  findings_A: number;    // critical
  findings_B: number;    // major
  findings_C: number;    // minor
  compliant_count: number;
  applicable_count: number;
  compliance_pct: number;
  verdict: "approved" | "conditional" | "denied";
  audit_overdue: boolean;
  tus_overdue?: boolean;
  cert_gaps: string[];
  reasoning: string[];
  remediation_priority: Array<{ ref: string; description: string; severity: NadcapFinding }>;
}

const REQUIRED_CERTS: Record<NadcapProcessType, string[]> = {
  heat_treat: ["pyrometry_qualified"],
  chemical_processing: ["process_inspector_qualified"],
  non_conventional_machining: ["operator_trained"],
  ndt: ["NAS-410"],
  surface_enhancement: ["operator_trained"],
  composites: ["layup_qualified"],
  conventional_machining: ["operator_trained"],
  materials_testing: ["A2LA_accredited"],
  fluids_distribution: ["process_qualified"],
};

class NadcapProcessQualificationEngineImpl {
  qualify(i: NadcapQualificationInput): NadcapResult {
    const reasoning: string[] = [];

    // Count finding severities from line items
    const A = i.line_items.filter((x) => x.status === "critical").length;
    const B = i.line_items.filter((x) => x.status === "major").length;
    const C = i.line_items.filter((x) => x.status === "minor").length;
    const compliant = i.line_items.filter((x) => x.status === "compliant").length;
    const applicable = i.line_items.filter((x) => x.status !== "not_applicable").length;

    // Audit cycle
    const cycleMonths = i.cycle_months ?? 24;
    let auditOverdue = false;
    if (i.last_audit_date) {
      const last = new Date(i.last_audit_date).getTime();
      const now = Date.now();
      const elapsedMonths = (now - last) / (1000 * 60 * 60 * 24 * 30.4375);
      if (elapsedMonths > cycleMonths) {
        auditOverdue = true;
        reasoning.push(`Last audit ${Math.round(elapsedMonths)}mo ago — exceeds ${cycleMonths}mo cycle`);
      }
    }

    // TUS check for heat treat (Nadcap AC7102 §8: monthly to quarterly)
    let tusOverdue: boolean | undefined;
    if (i.process === "heat_treat") {
      if (!i.tus_last_date) {
        tusOverdue = true;
        reasoning.push("Heat treat process missing Temperature Uniformity Survey record");
      } else {
        const tusAge = (Date.now() - new Date(i.tus_last_date).getTime()) / (1000 * 60 * 60 * 24);
        tusOverdue = tusAge > 90; // quarterly default
        if (tusOverdue) reasoning.push(`TUS ${Math.round(tusAge)} days old — overdue`);
      }
    }

    // Certification gaps
    const required = REQUIRED_CERTS[i.process] ?? [];
    const operatorCerts = i.operator_certs ?? [];
    const certGaps = required.filter((r) => !operatorCerts.some((c) => c.includes(r.split("_")[0] ?? "")));

    // Compliance percent
    const pct = applicable > 0 ? (compliant / applicable) * 100 : 0;

    // Verdict logic (Nadcap-style)
    let verdict: NadcapResult["verdict"];
    if (A > 0 || auditOverdue || (tusOverdue ?? false) || certGaps.length > 0) {
      verdict = "denied";
    } else if (B > 2 || pct < 85) {
      verdict = "conditional";
    } else {
      verdict = "approved";
    }

    // Remediation priority list (worst first)
    const remediationPriority: NadcapResult["remediation_priority"] = [];
    for (const li of i.line_items) {
      if (li.status === "critical") remediationPriority.push({ ref: li.ref, description: li.description, severity: "A" });
      else if (li.status === "major") remediationPriority.push({ ref: li.ref, description: li.description, severity: "B" });
      else if (li.status === "minor") remediationPriority.push({ ref: li.ref, description: li.description, severity: "C" });
    }
    remediationPriority.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

    reasoning.push(`${compliant}/${applicable} compliant (${round1(pct)}%); A=${A} B=${B} C=${C}`);
    if (certGaps.length > 0) reasoning.push(`Certification gaps: ${certGaps.join(", ")}`);

    return {
      process: i.process,
      findings_A: A,
      findings_B: B,
      findings_C: C,
      compliant_count: compliant,
      applicable_count: applicable,
      compliance_pct: round1(pct),
      verdict,
      audit_overdue: auditOverdue,
      tus_overdue: tusOverdue,
      cert_gaps: certGaps,
      reasoning,
      remediation_priority: remediationPriority,
    };
  }

  getStats(): { processes: NadcapProcessType[]; reference: string } {
    return {
      processes: [
        "heat_treat",
        "chemical_processing",
        "non_conventional_machining",
        "ndt",
        "surface_enhancement",
        "composites",
        "conventional_machining",
        "materials_testing",
        "fluids_distribution",
      ],
      reference: "Nadcap AC7xxx series (PRI eAuditNet); NAS-410; AS7003",
    };
  }
}

function severityRank(s: NadcapFinding): number {
  return s === "A" ? 0 : s === "B" ? 1 : 2;
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const nadcapProcessQualificationEngine = new NadcapProcessQualificationEngineImpl();
export type { NadcapProcessQualificationEngineImpl };
