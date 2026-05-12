/**
 * EngineeringChangeOrderEngine
 * ==============================
 *
 * Engineering Change Order / Notice (ECO/ECN) workflow engine.
 *
 * Covers the configuration management lifecycle per EIA-649 and
 * MIL-HDBK-61A:
 *   1. Change request (CR) — who, why, impact
 *   2. Impact assessment — affected documents, parts, processes
 *   3. Approval matrix — engineering, quality, operations, regulatory
 *   4. Disposition of in-stock material — use-as-is, rework, scrap
 *   5. Effectivity date / serial cut-in
 *   6. Implementation — BOM, drawing, process revs
 *   7. Configuration record — closed ECO archived
 *
 * Class I change (EIA-649): form, fit, function, interchangeability,
 * reliability, safety, weight, cost > threshold → full approval chain.
 * Class II change (minor, e.g., drawing clarification) → reduced review.
 *
 * This engine validates a change package:
 *   - All required approvers present & signed (Class I/II gated)
 *   - Impact assessment references real artifacts (drawings, BOMs)
 *   - In-stock disposition decided for each affected part
 *   - Effectivity date not in the past
 *   - Regulatory review present when device_class > I or aerospace
 *
 * Distinction from existing:
 *   - DesignHistoryFileEngine: tracks DHF artifact completeness
 *   - This engine: tracks changes to those artifacts
 *
 * References:
 *   - EIA-649-C (Configuration Management Standard)
 *   - MIL-HDBK-61A(SE) Configuration Management Guidance
 *   - ISO 10007:2017 Quality management — Configuration management
 *   - AS9100D §8.5.6 Control of changes (aerospace)
 *
 * @module engines/EngineeringChangeOrderEngine
 * @milestone LATHE-PRO-MS9
 */

export type ECOClass = "I" | "II";

export type ApproverRole =
  | "engineering"
  | "quality"
  | "manufacturing"
  | "supply_chain"
  | "regulatory"
  | "program_management";

export type InStockDisposition =
  | "use_as_is"
  | "rework"
  | "scrap"
  | "return_to_supplier"
  | "not_applicable";

export interface ECOApproval {
  role: ApproverRole;
  approver: string;
  /** Approval date ISO */
  approved_date?: string;
  /** Part 11 e-sig compliant? */
  esig_part11_compliant?: boolean;
}

export interface ECOImpactItem {
  artifact_type: "drawing" | "bom" | "spec" | "process_sheet" | "test_procedure" | "firmware";
  artifact_id: string;
  current_rev: string;
  new_rev: string;
}

export interface InStockPart {
  part_number: string;
  quantity: number;
  disposition: InStockDisposition;
  rationale?: string;
}

export interface ECORecord {
  id: string;
  title: string;
  change_class: ECOClass;
  /** Is this an aerospace or regulated-medical change? */
  regulated_industry: boolean;
  /** Reason for change */
  reason: string;
  /** Affected artifacts */
  impact: ECOImpactItem[];
  approvals: ECOApproval[];
  in_stock: InStockPart[];
  /** Effectivity (ISO-8601) */
  effectivity_date: string;
  /** Serial / lot cut-in (optional) */
  serial_cut_in?: string;
  /** Has CM / config record been updated? */
  config_record_closed: boolean;
}

export interface ECOValidationInput {
  record: ECORecord;
  /** Date used to validate "effectivity in future"; defaults to now */
  now?: string;
  /** Required approvers for Class I; default all except program_management */
  class_i_approvers?: ApproverRole[];
  /** Required approvers for Class II; default engineering + quality */
  class_ii_approvers?: ApproverRole[];
}

export interface ECOFinding {
  severity: "critical" | "major" | "minor";
  message: string;
}

export interface ECOValidationResult {
  eco_id: string;
  change_class: ECOClass;
  required_approvers: ApproverRole[];
  missing_approvers: ApproverRole[];
  unsigned_approvers: ApproverRole[];
  impact_items: number;
  parts_needing_disposition: number;
  undisposed_parts: string[];
  effectivity_valid: boolean;
  findings: ECOFinding[];
  ready_to_release: boolean;
  reasoning: string[];
}

const DEFAULT_CLASS_I: ApproverRole[] = ["engineering", "quality", "manufacturing", "supply_chain"];
const DEFAULT_CLASS_II: ApproverRole[] = ["engineering", "quality"];

class EngineeringChangeOrderEngineImpl {
  validate(i: ECOValidationInput): ECOValidationResult {
    const reasoning: string[] = [];
    const findings: ECOFinding[] = [];
    const r = i.record;
    const now = i.now ? new Date(i.now).getTime() : Date.now();

    // Required approvers by class
    const classI = i.class_i_approvers ?? DEFAULT_CLASS_I;
    const classII = i.class_ii_approvers ?? DEFAULT_CLASS_II;
    let required = r.change_class === "I" ? [...classI] : [...classII];
    if (r.regulated_industry && !required.includes("regulatory")) required.push("regulatory");

    // Uniqueness — dedupe
    required = [...new Set(required)];

    const approvals = new Map<ApproverRole, ECOApproval>();
    for (const a of r.approvals) approvals.set(a.role, a);

    const missing: ApproverRole[] = [];
    const unsigned: ApproverRole[] = [];
    for (const role of required) {
      const a = approvals.get(role);
      if (!a) {
        missing.push(role);
        findings.push({ severity: "critical", message: `Missing ${role} approval` });
      } else if (!a.approved_date) {
        unsigned.push(role);
        findings.push({ severity: "major", message: `${role} approver assigned but not signed` });
      }
    }

    // Regulated industry requires Part 11 e-sig
    if (r.regulated_industry) {
      for (const a of r.approvals) {
        if (a.approved_date && a.esig_part11_compliant === false) {
          findings.push({
            severity: "major",
            message: `${a.role} approval not Part 11 compliant (required for regulated industry)`,
          });
        }
      }
    }

    // Impact must include at least one artifact
    if (r.impact.length === 0) {
      findings.push({ severity: "critical", message: "ECO has no impact items — nothing to change" });
    }
    // Each impact must actually change revision
    for (const it of r.impact) {
      if (it.current_rev === it.new_rev) {
        findings.push({
          severity: "minor",
          message: `${it.artifact_id}: current rev equals new rev — revision bump missing`,
        });
      }
    }

    // In-stock disposition
    const undisposed = r.in_stock
      .filter((p) => !p.disposition || (p as unknown as { disposition?: string }).disposition === undefined)
      .map((p) => p.part_number);
    for (const p of r.in_stock) {
      if (p.disposition === "rework" && !p.rationale) {
        findings.push({
          severity: "minor",
          message: `Part ${p.part_number}: rework disposition needs rationale`,
        });
      }
    }
    if (undisposed.length > 0) {
      findings.push({
        severity: "major",
        message: `Undisposed in-stock parts: ${undisposed.join(", ")}`,
      });
    }

    // Effectivity date must be today or later
    const effValid = new Date(r.effectivity_date).getTime() >= now - 1000 * 60 * 60 * 24;
    if (!effValid) {
      findings.push({
        severity: "major",
        message: `Effectivity date ${r.effectivity_date} in the past`,
      });
    }

    // Config record must be closed before release
    if (!r.config_record_closed) {
      findings.push({
        severity: "minor",
        message: "Configuration record not yet closed — required before release",
      });
    }

    const critical = findings.filter((f) => f.severity === "critical").length;
    const majors = findings.filter((f) => f.severity === "major").length;
    const ready =
      critical === 0 &&
      majors === 0 &&
      missing.length === 0 &&
      unsigned.length === 0 &&
      undisposed.length === 0 &&
      effValid &&
      r.config_record_closed;

    reasoning.push(`Class ${r.change_class} ECO — ${required.length} approvers required, ${missing.length} missing, ${unsigned.length} unsigned`);
    reasoning.push(`${r.impact.length} impact items, ${r.in_stock.length} in-stock parts (${undisposed.length} undisposed)`);

    return {
      eco_id: r.id,
      change_class: r.change_class,
      required_approvers: required,
      missing_approvers: missing,
      unsigned_approvers: unsigned,
      impact_items: r.impact.length,
      parts_needing_disposition: r.in_stock.length,
      undisposed_parts: undisposed,
      effectivity_valid: effValid,
      findings,
      ready_to_release: ready,
      reasoning,
    };
  }

  getStats(): { approver_roles: ApproverRole[]; dispositions: InStockDisposition[]; reference: string } {
    return {
      approver_roles: ["engineering", "quality", "manufacturing", "supply_chain", "regulatory", "program_management"],
      dispositions: ["use_as_is", "rework", "scrap", "return_to_supplier", "not_applicable"],
      reference: "EIA-649-C; MIL-HDBK-61A; ISO 10007:2017; AS9100D §8.5.6",
    };
  }
}

export const engineeringChangeOrderEngine = new EngineeringChangeOrderEngineImpl();
export type { EngineeringChangeOrderEngineImpl };
