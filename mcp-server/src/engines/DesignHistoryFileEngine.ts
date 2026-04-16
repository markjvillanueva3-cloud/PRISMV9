/**
 * DesignHistoryFileEngine
 * =========================
 *
 * FDA 21 CFR 820.30(j) Design History File artifact compiler + validator.
 *
 * The DHF contains or references the records necessary to demonstrate
 * that the design was developed in accordance with the approved design
 * plan and the requirements of 21 CFR 820.30.
 *
 * Required DHF artifacts:
 *   (b) Design and development planning
 *   (c) Design input (user needs + intended use)
 *   (d) Design output
 *   (e) Design review (minutes, attendees, decisions)
 *   (f) Design verification (does the output meet the input?)
 *   (g) Design validation (does the device meet user needs?)
 *   (h) Design transfer (to production)
 *   (i) Design changes
 *
 * For each artifact this engine checks:
 *   - Presence
 *   - Traceability (input → output → verification → validation)
 *   - Approval signature (electronic per 21 CFR Part 11)
 *
 * Output: DHF completeness score, traceability matrix gaps, findings.
 *
 * Distinction from FDA21CFRPart11Engine:
 *   Part 11 covers electronic record integrity. This engine covers
 *   DHF content completeness per 820.30(j).
 *
 * References:
 *   - FDA 21 CFR 820.30 (Design Controls)
 *   - FDA Design Control Guidance for Medical Device Manufacturers (1997)
 *   - ISO 13485:2016 §7.3 (Design and Development)
 *
 * @module engines/DesignHistoryFileEngine
 * @milestone LATHE-PRO-MS9
 */

export type DHFArtifactType =
  | "design_plan"
  | "design_input"
  | "design_output"
  | "design_review"
  | "design_verification"
  | "design_validation"
  | "design_transfer"
  | "design_change";

export interface DHFArtifact {
  id: string;
  type: DHFArtifactType;
  title: string;
  revision: string;
  /** Approved/signed? */
  approved: boolean;
  /** Approver name, if any */
  approver?: string;
  /** Date approved (ISO) */
  approved_date?: string;
  /** Traces TO these artifact ids (e.g., verification traces to input) */
  traces_to?: string[];
  /** Part 11 compliant e-signature? */
  esig_part11_compliant?: boolean;
}

export interface DHFInput {
  device_name: string;
  /** Device class I / II / III */
  device_class: "I" | "II" | "III";
  /** Risk classification per ISO 14971 (A-D) */
  risk_level?: "A" | "B" | "C" | "D";
  artifacts: DHFArtifact[];
}

export interface DHFFinding {
  severity: "critical" | "major" | "minor";
  artifact_type: DHFArtifactType | "traceability";
  message: string;
}

export interface DHFResult {
  completeness_pct: number;
  missing_types: DHFArtifactType[];
  traceability_gaps: Array<{
    from_type: DHFArtifactType;
    to_type: DHFArtifactType;
    from_id: string;
    note: string;
  }>;
  unapproved_artifacts: string[];
  findings: DHFFinding[];
  dhf_ready: boolean;
  reasoning: string[];
}

const REQUIRED_TYPES: DHFArtifactType[] = [
  "design_plan",
  "design_input",
  "design_output",
  "design_review",
  "design_verification",
  "design_validation",
  "design_transfer",
];

class DesignHistoryFileEngineImpl {
  evaluate(i: DHFInput): DHFResult {
    const reasoning: string[] = [];
    const findings: DHFFinding[] = [];

    const present = new Set<DHFArtifactType>();
    for (const a of i.artifacts) present.add(a.type);

    // Missing required types
    const missing: DHFArtifactType[] = [];
    for (const t of REQUIRED_TYPES) {
      if (!present.has(t)) {
        missing.push(t);
        findings.push({
          severity: t === "design_validation" ? "critical" : "major",
          artifact_type: t,
          message: `Required DHF artifact missing: ${t}`,
        });
      }
    }

    // Unapproved artifacts
    const unapproved = i.artifacts.filter((a) => !a.approved).map((a) => a.id);
    for (const id of unapproved) {
      findings.push({
        severity: "major",
        artifact_type: i.artifacts.find((a) => a.id === id)!.type,
        message: `Artifact ${id} not approved`,
      });
    }

    // Class II/III devices require Part 11-compliant e-sig
    if (i.device_class !== "I") {
      for (const a of i.artifacts) {
        if (a.approved && a.esig_part11_compliant === false) {
          findings.push({
            severity: "major",
            artifact_type: a.type,
            message: `${a.id}: approval not Part 11 compliant (required for Class ${i.device_class})`,
          });
        }
      }
    }

    // Traceability chain: input → output → verification ← input; validation traces to user needs
    const traceabilityGaps: DHFResult["traceability_gaps"] = [];

    const ins = i.artifacts.filter((a) => a.type === "design_input");
    const outs = i.artifacts.filter((a) => a.type === "design_output");
    const vers = i.artifacts.filter((a) => a.type === "design_verification");
    const vals = i.artifacts.filter((a) => a.type === "design_validation");

    // Outputs must trace to inputs
    for (const o of outs) {
      if (!o.traces_to?.some((id) => ins.some((x) => x.id === id))) {
        traceabilityGaps.push({
          from_type: "design_output",
          to_type: "design_input",
          from_id: o.id,
          note: "Output does not trace to any design input",
        });
      }
    }

    // Verification must trace to inputs (does output meet input?)
    for (const v of vers) {
      if (!v.traces_to?.some((id) => ins.some((x) => x.id === id))) {
        traceabilityGaps.push({
          from_type: "design_verification",
          to_type: "design_input",
          from_id: v.id,
          note: "Verification does not trace to a design input",
        });
      }
    }

    // Validation should exist at all and trace to inputs
    for (const val of vals) {
      if (!val.traces_to || val.traces_to.length === 0) {
        traceabilityGaps.push({
          from_type: "design_validation",
          to_type: "design_input",
          from_id: val.id,
          note: "Validation has no traceability links",
        });
      }
    }

    for (const g of traceabilityGaps) {
      findings.push({
        severity: "major",
        artifact_type: "traceability",
        message: `${g.from_id}: ${g.note}`,
      });
    }

    const completeness = (REQUIRED_TYPES.length - missing.length) / REQUIRED_TYPES.length;
    const critical = findings.filter((f) => f.severity === "critical").length;
    const majors = findings.filter((f) => f.severity === "major").length;
    const ready = critical === 0 && majors === 0 && missing.length === 0 && unapproved.length === 0;

    reasoning.push(`Device class ${i.device_class} — ${i.artifacts.length} artifacts in DHF`);
    reasoning.push(`${REQUIRED_TYPES.length - missing.length}/${REQUIRED_TYPES.length} required types present`);
    if (traceabilityGaps.length > 0) reasoning.push(`${traceabilityGaps.length} traceability gaps`);

    return {
      completeness_pct: round1(completeness * 100),
      missing_types: missing,
      traceability_gaps: traceabilityGaps,
      unapproved_artifacts: unapproved,
      findings,
      dhf_ready: ready,
      reasoning,
    };
  }

  getStats(): { required_artifacts: DHFArtifactType[]; reference: string } {
    return {
      required_artifacts: REQUIRED_TYPES,
      reference: "FDA 21 CFR 820.30(j); ISO 13485:2016 §7.3",
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const designHistoryFileEngine = new DesignHistoryFileEngineImpl();
export type { DesignHistoryFileEngineImpl };
