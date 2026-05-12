/**
 * CAPAWorkflowEngine
 * ====================
 *
 * Corrective and Preventive Action workflow engine per FDA 21 CFR 820.100
 * and ISO 13485:2016 §8.5.2/8.5.3.
 *
 * CAPA states:
 *   1. opened            — nonconformance reported
 *   2. investigating     — root cause analysis (5-why, fishbone, FTA)
 *   3. action_planned    — CA and/or PA defined with owner + due date
 *   4. action_implemented — work executed
 *   5. effectiveness_check — re-measure after dwell time
 *   6. closed            — effective + documented; or
 *   7. escalated         — ineffective → reopen or escalate
 *
 * Key checks:
 *   - Root cause must be identified before action_planned
 *   - Actions must have owner + due date
 *   - Effectiveness check requires minimum dwell time (default 30 days)
 *   - Overdue CAPAs get flagged (FDA inspection finding risk)
 *
 * Distinction from existing:
 *   - ISO13485QMSEngine: validates QMS clause presence including 8.5.2
 *   - This engine: actually works a specific CAPA case-file
 *
 * References:
 *   - FDA 21 CFR 820.100 (Corrective and preventive action)
 *   - ISO 13485:2016 §8.5.2 (Corrective action) / §8.5.3 (Preventive action)
 *   - FDA Quality System Inspection Technique (QSIT) CAPA subsystem
 *   - AIAG 8D problem solving (referenced methodology)
 *
 * @module engines/CAPAWorkflowEngine
 * @milestone LATHE-PRO-MS9
 */

export type CAPAState =
  | "opened"
  | "investigating"
  | "action_planned"
  | "action_implemented"
  | "effectiveness_check"
  | "closed"
  | "escalated";

export type CAPASource =
  | "internal_audit"
  | "external_audit"
  | "customer_complaint"
  | "nonconforming_product"
  | "management_review"
  | "risk_analysis"
  | "supplier_issue"
  | "field_failure";

export type RCATechnique = "5_why" | "fishbone" | "fault_tree" | "8D" | "FMEA" | "other";

export interface CAPAAction {
  id: string;
  type: "corrective" | "preventive";
  description: string;
  owner: string;
  due_date?: string;          // ISO-8601
  completed_date?: string;    // ISO-8601
}

export interface EffectivenessCheck {
  method: string;             // e.g., "30-day NCR count in same product line"
  baseline_metric: number;
  post_action_metric: number;
  target_reduction_pct: number;
  dwell_days: number;
}

export interface CAPARecord {
  id: string;
  opened_date: string;        // ISO-8601
  source: CAPASource;
  description: string;
  severity: "critical" | "major" | "minor";
  state: CAPAState;
  /** 5-why or equivalent chain */
  rca_technique?: RCATechnique;
  root_cause?: string;
  actions: CAPAAction[];
  effectiveness?: EffectivenessCheck;
  /** Optional regulatory-reportable flag (e.g., MDR, field safety notice) */
  regulatory_reportable?: boolean;
}

export interface CAPAEvaluationInput {
  record: CAPARecord;
  /** Min dwell days before effectiveness check; default 30 */
  min_dwell_days?: number;
  /** Days-overdue threshold for escalation; default 30 */
  overdue_escalate_days?: number;
  /** Current date override (ISO-8601) for deterministic tests */
  now?: string;
}

export interface CAPAFinding {
  severity: "critical" | "major" | "minor";
  message: string;
}

export interface CAPAEvaluationResult {
  state: CAPAState;
  next_state: CAPAState | null;
  age_days: number;
  is_overdue_for_state: boolean;
  overdue_actions: string[];
  effectiveness_verdict?: "effective" | "ineffective" | "insufficient_dwell" | "not_measured";
  findings: CAPAFinding[];
  reasoning: string[];
  ready_to_close: boolean;
}

class CAPAWorkflowEngineImpl {
  evaluate(i: CAPAEvaluationInput): CAPAEvaluationResult {
    const reasoning: string[] = [];
    const findings: CAPAFinding[] = [];
    const r = i.record;
    const now = i.now ? new Date(i.now).getTime() : Date.now();
    const minDwell = i.min_dwell_days ?? 30;
    const overdueDays = i.overdue_escalate_days ?? 30;

    const ageDays = (now - new Date(r.opened_date).getTime()) / (1000 * 60 * 60 * 24);
    reasoning.push(`CAPA ${r.id} age ${Math.round(ageDays)} days, state=${r.state}`);

    // State transition rules
    let nextState: CAPAState | null = null;
    let isOverdue = false;

    switch (r.state) {
      case "opened":
        nextState = "investigating";
        if (ageDays > 7) {
          findings.push({ severity: "minor", message: "CAPA open > 7d without RCA started" });
          isOverdue = true;
        }
        break;
      case "investigating":
        if (r.root_cause && r.rca_technique) nextState = "action_planned";
        else if (ageDays > 14) {
          findings.push({ severity: "major", message: "Investigation > 14d with no identified root cause" });
          isOverdue = true;
        }
        break;
      case "action_planned":
        if (r.actions.length === 0) {
          findings.push({ severity: "critical", message: "action_planned state with no actions defined" });
        } else {
          const missingOwner = r.actions.filter((a) => !a.owner).map((a) => a.id);
          const missingDue = r.actions.filter((a) => !a.due_date).map((a) => a.id);
          if (missingOwner.length > 0) findings.push({ severity: "major", message: `Actions missing owner: ${missingOwner.join(", ")}` });
          if (missingDue.length > 0) findings.push({ severity: "major", message: `Actions missing due date: ${missingDue.join(", ")}` });
          if (r.actions.every((a) => a.completed_date)) nextState = "action_implemented";
        }
        break;
      case "action_implemented":
        if (r.effectiveness) nextState = "effectiveness_check";
        break;
      case "effectiveness_check":
      case "closed":
      case "escalated":
        // terminal or pending data
        break;
    }

    // Overdue actions
    const overdueActions = r.actions
      .filter((a) => !a.completed_date && a.due_date && (now - new Date(a.due_date).getTime()) > 0)
      .map((a) => a.id);
    if (overdueActions.length > 0) {
      findings.push({
        severity: "major",
        message: `Overdue actions: ${overdueActions.join(", ")}`,
      });
    }

    // Escalate if too old in non-terminal state
    if (!["closed", "escalated"].includes(r.state) && ageDays > overdueDays * 3) {
      findings.push({
        severity: "critical",
        message: `CAPA age ${Math.round(ageDays)}d exceeds ${overdueDays * 3}d — escalation required`,
      });
    }

    // Regulatory-reportable must be reported within 30 days (FDA MDR 30-day rule)
    if (r.regulatory_reportable && ageDays > 30 && r.state !== "closed") {
      findings.push({
        severity: "critical",
        message: "Regulatory-reportable CAPA > 30d — MDR/field-safety notice timeline at risk",
      });
    }

    // Effectiveness verdict
    let effVerdict: CAPAEvaluationResult["effectiveness_verdict"];
    if (r.effectiveness) {
      const ef = r.effectiveness;
      if (ef.dwell_days < minDwell) {
        effVerdict = "insufficient_dwell";
        findings.push({
          severity: "minor",
          message: `Effectiveness dwell ${ef.dwell_days}d < required ${minDwell}d`,
        });
      } else {
        const reduction = ef.baseline_metric > 0
          ? ((ef.baseline_metric - ef.post_action_metric) / ef.baseline_metric) * 100
          : 0;
        if (reduction >= ef.target_reduction_pct) {
          effVerdict = "effective";
          if (r.state === "effectiveness_check") nextState = "closed";
        } else {
          effVerdict = "ineffective";
          findings.push({
            severity: "major",
            message: `Reduction ${reduction.toFixed(1)}% < target ${ef.target_reduction_pct}% — action ineffective`,
          });
          if (r.state === "effectiveness_check") nextState = "escalated";
        }
      }
    } else if (r.state === "effectiveness_check" || r.state === "closed") {
      effVerdict = "not_measured";
      findings.push({
        severity: "major",
        message: "No effectiveness measurement recorded",
      });
    }

    const readyToClose =
      r.state === "effectiveness_check" &&
      effVerdict === "effective" &&
      findings.every((f) => f.severity !== "critical");

    reasoning.push(`${findings.length} findings (${findings.filter((f) => f.severity === "critical").length} critical)`);

    return {
      state: r.state,
      next_state: nextState,
      age_days: Math.round(ageDays),
      is_overdue_for_state: isOverdue,
      overdue_actions: overdueActions,
      effectiveness_verdict: effVerdict,
      findings,
      reasoning,
      ready_to_close: readyToClose,
    };
  }

  getStats(): { states: CAPAState[]; techniques: RCATechnique[]; reference: string } {
    return {
      states: ["opened", "investigating", "action_planned", "action_implemented", "effectiveness_check", "closed", "escalated"],
      techniques: ["5_why", "fishbone", "fault_tree", "8D", "FMEA", "other"],
      reference: "FDA 21 CFR 820.100; ISO 13485:2016 §8.5.2/8.5.3; AIAG 8D",
    };
  }
}

export const capaWorkflowEngine = new CAPAWorkflowEngineImpl();
export type { CAPAWorkflowEngineImpl };
