/**
 * OSHA300LogEngine — federal OSHA 1904 injury & illness recordkeeping (Form 300/300A).
 *
 * Required for every employer with 10+ employees (29 CFR §1904). Failures to
 * record a recordable case (or to report a death within 8h / inpatient within 24h)
 * are citable violations.
 *
 * Recordable criteria (per 29 CFR §1904.7 — "any of these = recordable"):
 *   - death
 *   - days away from work (any number of days)
 *   - restricted work / job transfer
 *   - medical treatment beyond first aid (the listed first-aid items in §1904.7(b)(5)(ii)
 *     do NOT trigger recordability; e.g. bandages, ice packs, OTC meds at non-prescription
 *     strength, etc.)
 *   - loss of consciousness
 *   - significant injury/illness diagnosed by physician or other licensed healthcare professional
 *
 * Special cases — separate flags:
 *   - needlestick / sharps with contaminated material            (§1904.8 — recordable)
 *   - medical removal under federal standard                     (§1904.9 — recordable)
 *   - hearing loss (Standard Threshold Shift)                    (§1904.10 — recordable if ≥10dB STS + 25dB hearing-level)
 *   - TB exposure with later positive test                       (§1904.11 — recordable)
 *
 * Reporting windows (29 CFR §1904.39):
 *   - fatality                → report within 8 hours
 *   - inpatient hospitalization / amputation / eye loss → report within 24 hours
 *
 * Bridges:
 *   - NonConformanceAndCorrectiveActionEngine (iter23): every recordable case
 *     opens a §10.2 CAPA (must-investigate even if NCR is product-quality flavored)
 *   - InternalAuditCalendarEngine (iter14): OSHA 300A annual summary feeds the
 *     management-review input (ISO 9001 §9.3.2 c — performance of processes & conformity)
 *   - ExecutiveSummaryEngine (iter31): open recordable count rolls up to safety axis
 *
 * Hotel-soul: PII-redacted (case_number + employee_id only, no names; injury
 * description SCANNED for PII patterns before record), Object.frozen, R12 fail-loud.
 *
 * @module OSHA300LogEngine
 * @milestone HOTEL/U-OSHA-300-LOG (2026-05-26, slot:hotel iter38 /yolo)
 */

export type IncidentSeverity =
  | "first_aid_only"
  | "medical_treatment"
  | "restricted_work"
  | "days_away"
  | "death";

export type IncidentNature =
  | "injury"
  | "skin_disorder"
  | "respiratory_condition"
  | "poisoning"
  | "hearing_loss"
  | "all_other_illness";

export interface IncidentInput {
  case_number: string;                // OSHA-assigned case ID
  employee_id: string;                // PII-redacted handle
  incident_date: string;              // YYYY-MM-DD
  description: string;                // event description — PII-scanned before record
  job_title: string;                  // e.g. "machinist", "operator" — NOT a person name
  location: string;                   // shop area, NOT home address
  nature: IncidentNature;
  severity: IncidentSeverity;
  days_away_count: number;            // ≥ 0
  days_restricted_count: number;      // ≥ 0
  needlestick: boolean;
  loss_of_consciousness: boolean;
  significant_dx_by_physician: boolean;
  hospitalized_overnight: boolean;
  amputation: boolean;
  eye_loss: boolean;
}

export interface IncidentRecord extends IncidentInput {
  is_recordable: boolean;
  recordable_reasons: ReadonlyArray<string>;
  reporting_window_hours: number | null;     // null if no immediate report required
  reporting_deadline_iso: string | null;
  capa_required: boolean;                    // bridges iter23 NCR/CAPA loop
  recorded_at: string;
}

export interface Annual300ASummary {
  year: number;
  total_recordable: number;
  total_death: number;
  total_days_away: number;
  total_restricted: number;
  total_other_recordable: number;
  total_days_away_sum: number;
  total_days_restricted_sum: number;
  by_nature: Readonly<Record<IncidentNature, number>>;
  generated_at: string;
}

// PII regex set — emails, SSN, phone, full names (best-effort).
const PII_PATTERNS: ReadonlyArray<RegExp> = Object.freeze([
  /\b\d{3}-\d{2}-\d{4}\b/,                                  // SSN
  /\b\d{3}-\d{3}-\d{4}\b/,                                  // US phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,     // email
  /\bmr\.?\s+[A-Z][a-z]+/i,                                 // "Mr. Smith"
  /\bmrs\.?\s+[A-Z][a-z]+/i,                                // "Mrs. Smith"
  /\bms\.?\s+[A-Z][a-z]+/i,                                 // "Ms. Smith"
]);

const NATURES: ReadonlyArray<IncidentNature> = [
  "injury", "skin_disorder", "respiratory_condition", "poisoning", "hearing_loss", "all_other_illness",
];
const SEVERITIES: ReadonlyArray<IncidentSeverity> = [
  "first_aid_only", "medical_treatment", "restricted_work", "days_away", "death",
];

class OSHA300LogEngine {
  /** Decide whether an incident is OSHA recordable (29 CFR §1904.7 + special cases). */
  classifyRecordable(input: IncidentInput): { is_recordable: boolean; reasons: string[] } {
    this.validateIncidentInput(input);
    const reasons: string[] = [];

    if (input.severity === "death") reasons.push("death (1904.7(b)(1))");
    if (input.severity === "days_away" || input.days_away_count > 0) {
      reasons.push("days away from work (1904.7(b)(3))");
    }
    if (input.severity === "restricted_work" || input.days_restricted_count > 0) {
      reasons.push("restricted work / job transfer (1904.7(b)(4))");
    }
    if (input.severity === "medical_treatment") {
      reasons.push("medical treatment beyond first aid (1904.7(b)(5))");
    }
    if (input.loss_of_consciousness) reasons.push("loss of consciousness (1904.7(b)(6))");
    if (input.significant_dx_by_physician) {
      reasons.push("significant injury/illness diagnosed by physician (1904.7(b)(7))");
    }
    if (input.needlestick) reasons.push("needlestick/sharps with contaminated material (1904.8)");

    // first_aid_only with NO other trigger → NOT recordable
    return { is_recordable: reasons.length > 0, reasons };
  }

  /** Compute the federal reporting window (in hours from incident time). */
  reportingWindow(input: IncidentInput): { hours: number | null; reasons: string[] } {
    const reasons: string[] = [];
    let minHours: number | null = null;

    if (input.severity === "death") {
      reasons.push("fatality — 8h reporting window (1904.39(b)(1))");
      minHours = 8;
    }
    if (input.hospitalized_overnight) {
      reasons.push("inpatient hospitalization — 24h reporting window (1904.39(b)(2))");
      if (minHours === null || minHours > 24) minHours = 24;
    }
    if (input.amputation) {
      reasons.push("amputation — 24h reporting window (1904.39(b)(2))");
      if (minHours === null || minHours > 24) minHours = 24;
    }
    if (input.eye_loss) {
      reasons.push("loss of eye — 24h reporting window (1904.39(b)(2))");
      if (minHours === null || minHours > 24) minHours = 24;
    }
    return { hours: minHours, reasons };
  }

  /** Record a single incident into the 300 log. Pure — caller persists. */
  recordIncident(input: IncidentInput): IncidentRecord {
    this.validateIncidentInput(input);
    this.assertNoPII(input.description);

    const { is_recordable, reasons } = this.classifyRecordable(input);
    const window = this.reportingWindow(input);

    let reportingDeadline: string | null = null;
    if (window.hours !== null) {
      const incidentMs = Date.parse(`${input.incident_date}T00:00:00Z`);
      reportingDeadline = new Date(incidentMs + window.hours * 3600 * 1000).toISOString();
    }

    return Object.freeze({
      ...input,
      is_recordable,
      recordable_reasons: Object.freeze([...reasons]),
      reporting_window_hours: window.hours,
      reporting_deadline_iso: reportingDeadline,
      capa_required: is_recordable,                  // every recordable case → CAPA bridge (iter23)
      recorded_at: new Date().toISOString(),
    });
  }

  /** Roll a year's worth of 300-log entries into Form 300A annual summary. */
  buildAnnual300A(year: number, records: ReadonlyArray<IncidentRecord>): Annual300ASummary {
    if (!Number.isInteger(year) || year < 1971 || year > 2100) {
      throw new Error("OSHA300LogEngine: year must be integer between 1971 and 2100");
    }
    if (!Array.isArray(records)) {
      throw new Error("OSHA300LogEngine: records must be an array");
    }

    const yearRecords = records.filter((r) => {
      const recYear = Number(r.incident_date.slice(0, 4));
      return recYear === year && r.is_recordable;
    });

    let totalDeath = 0, totalDaysAway = 0, totalRestricted = 0, totalOtherRec = 0;
    let totalDaysAwaySum = 0, totalDaysRestrictedSum = 0;
    const byNature: Record<IncidentNature, number> = {
      injury: 0, skin_disorder: 0, respiratory_condition: 0,
      poisoning: 0, hearing_loss: 0, all_other_illness: 0,
    };

    for (const r of yearRecords) {
      if (r.severity === "death") {
        totalDeath++;
      } else if (r.severity === "days_away" || r.days_away_count > 0) {
        totalDaysAway++;
      } else if (r.severity === "restricted_work" || r.days_restricted_count > 0) {
        totalRestricted++;
      } else {
        totalOtherRec++;
      }
      totalDaysAwaySum += Math.max(0, r.days_away_count);
      totalDaysRestrictedSum += Math.max(0, r.days_restricted_count);
      byNature[r.nature as IncidentNature]++;
    }

    return Object.freeze({
      year,
      total_recordable: yearRecords.length,
      total_death: totalDeath,
      total_days_away: totalDaysAway,
      total_restricted: totalRestricted,
      total_other_recordable: totalOtherRec,
      total_days_away_sum: totalDaysAwaySum,
      total_days_restricted_sum: totalDaysRestrictedSum,
      by_nature: Object.freeze({ ...byNature }),
      generated_at: new Date().toISOString(),
    });
  }

  // ─── R12 validation ─────────────────────────────────────────────────────

  private validateIncidentInput(input: IncidentInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("OSHA300LogEngine: input must be an object");
    }
    for (const f of ["case_number", "employee_id", "description", "job_title", "location"] as const) {
      if (!input[f] || typeof input[f] !== "string") {
        throw new Error(`OSHA300LogEngine: ${f} must be non-empty string`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.incident_date)) {
      throw new Error("OSHA300LogEngine: incident_date must be ISO YYYY-MM-DD");
    }
    if (!NATURES.includes(input.nature)) {
      throw new Error(`OSHA300LogEngine: nature must be one of ${NATURES.join("|")}`);
    }
    if (!SEVERITIES.includes(input.severity)) {
      throw new Error(`OSHA300LogEngine: severity must be one of ${SEVERITIES.join("|")}`);
    }
    if (!Number.isInteger(input.days_away_count) || input.days_away_count < 0) {
      throw new Error("OSHA300LogEngine: days_away_count must be non-negative integer");
    }
    if (!Number.isInteger(input.days_restricted_count) || input.days_restricted_count < 0) {
      throw new Error("OSHA300LogEngine: days_restricted_count must be non-negative integer");
    }
    for (const b of ["needlestick", "loss_of_consciousness", "significant_dx_by_physician",
                     "hospitalized_overnight", "amputation", "eye_loss"] as const) {
      if (typeof input[b] !== "boolean") {
        throw new Error(`OSHA300LogEngine: ${b} must be boolean`);
      }
    }
  }

  private assertNoPII(description: string): void {
    for (const re of PII_PATTERNS) {
      if (re.test(description)) {
        throw new Error(
          `OSHA300LogEngine: description appears to contain PII (matched ${re}); redact to job_title/employee_id only`,
        );
      }
    }
  }
}

export const osha300LogEngine = new OSHA300LogEngine();
