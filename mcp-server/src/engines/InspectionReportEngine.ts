/**
 * InspectionReportEngine — QC inspection report stack (FAI / in-process / final / incoming).
 *
 * Closes the §8.6 (Release of products) ISO 9001 clause + AS9102 FAI use-case + the
 * receiving-inspection use-case. Pairs with:
 *   - NonConformanceAndCorrectiveActionEngine (iter23): a failed inspection → NCR
 *   - CustomerComplaintIntakeEngine (iter24): downstream complaint cites inspection_id
 *   - ExecutiveSummaryEngine (iter31): aggregate ncr_required count rolls up
 *
 * Per characteristic measurement, we classify deviation against tolerance band:
 *   - within tolerance               → pass,        severity = "none"
 *   - outside tolerance, ≤ 1.5× band → conditional, severity = "minor"   (rework path)
 *   - outside tolerance, 1.5..3× band → fail,        severity = "major"
 *   - outside tolerance, > 3× band   → fail,        severity = "critical"
 *
 * Overall disposition is the worst-of-all-characteristics. CofC eligibility requires
 * overall_disposition === "pass" AND zero conditional characteristics.
 *
 * Hotel-soul: PII-free (employee_id only), Object.frozen, R12 fail-loud on every input.
 *
 * @module InspectionReportEngine
 * @milestone HOTEL/U-INSPECTION-REPORT (2026-05-26, slot:hotel iter33 /yolo)
 */

export type InspectionReportType = "fai" | "in_process" | "final" | "incoming";
export type CharacteristicUnit = "mm" | "in" | "deg" | "ra_um" | "ra_uin";
export type Disposition = "pass" | "fail" | "conditional";
export type Severity = "none" | "minor" | "major" | "critical";

export interface CharacteristicInput {
  characteristic_id: string;
  nominal: number;
  upper_tolerance: number;          // signed band upper (e.g. +0.05)
  lower_tolerance: number;          // signed band lower (e.g. -0.05)
  measured: number;
  unit: CharacteristicUnit;
  safety_critical?: boolean;        // raises minor → major automatically
}

export interface InspectionReportInput {
  inspection_id: string;
  report_type: InspectionReportType;
  part_number: string;
  lot_number: string;
  job_id: string;
  inspector_employee_id: string;
  inspection_date: string;          // YYYY-MM-DD
  characteristics: ReadonlyArray<CharacteristicInput>;
}

export interface CharacteristicResult {
  characteristic_id: string;
  nominal: number;
  upper_tolerance: number;
  lower_tolerance: number;
  measured: number;
  unit: CharacteristicUnit;
  deviation: number;                // measured − nominal
  in_spec: boolean;
  severity: Severity;
  safety_critical: boolean;
}

export interface InspectionReport {
  inspection_id: string;
  report_type: InspectionReportType;
  part_number: string;
  lot_number: string;
  job_id: string;
  inspector_employee_id: string;
  inspection_date: string;
  characteristics: ReadonlyArray<CharacteristicResult>;
  pass_count: number;
  fail_count: number;
  conditional_count: number;
  overall_disposition: Disposition;
  ncr_required: boolean;
  ncr_severity: Severity;
  cofc_eligible: boolean;
  generated_at: string;
}

const REPORT_TYPES: ReadonlyArray<InspectionReportType> = ["fai", "in_process", "final", "incoming"];
const UNITS: ReadonlyArray<CharacteristicUnit> = ["mm", "in", "deg", "ra_um", "ra_uin"];

class InspectionReportEngine {
  /** Classify a single characteristic deviation; safety_critical never downgrades severity. */
  classifyCharacteristic(c: CharacteristicInput): CharacteristicResult {
    this.validateCharacteristic(c);
    const deviation = c.measured - c.nominal;
    const band = c.upper_tolerance - c.lower_tolerance;       // positive by validation
    const inSpec = deviation >= c.lower_tolerance && deviation <= c.upper_tolerance;

    let severity: Severity = "none";
    if (!inSpec) {
      // distance outside the tolerance band, in band-multiples
      const over =
        deviation > c.upper_tolerance ? deviation - c.upper_tolerance
        : c.lower_tolerance - deviation;
      const mult = band > 0 ? over / band : Number.POSITIVE_INFINITY; // bilateral nominal=0 → band still meaningful
      if (mult <= 1.5)       severity = "minor";
      else if (mult <= 3.0)  severity = "major";
      else                   severity = "critical";
    }
    // Safety-critical never improves severity, but bumps minor → major.
    if (c.safety_critical && severity === "minor") severity = "major";

    return Object.freeze({
      characteristic_id: c.characteristic_id,
      nominal: c.nominal,
      upper_tolerance: c.upper_tolerance,
      lower_tolerance: c.lower_tolerance,
      measured: c.measured,
      unit: c.unit,
      deviation,
      in_spec: inSpec,
      severity,
      safety_critical: c.safety_critical === true,
    });
  }

  /** Build the full inspection report. */
  buildReport(input: InspectionReportInput): InspectionReport {
    this.validateInput(input);

    const results = input.characteristics.map((c) => this.classifyCharacteristic(c));

    let pass = 0, fail = 0, conditional = 0;
    let worst: Severity = "none";
    for (const r of results) {
      if (r.in_spec) {
        pass++;
      } else if (r.severity === "minor") {
        conditional++;
      } else {
        fail++;
      }
      worst = this.maxSeverity(worst, r.severity);
    }

    const overall: Disposition =
      fail > 0 ? "fail"
      : conditional > 0 ? "conditional"
      : "pass";

    const ncrRequired = overall !== "pass";
    const cofcEligible = overall === "pass" && conditional === 0;

    return Object.freeze({
      inspection_id: input.inspection_id,
      report_type: input.report_type,
      part_number: input.part_number,
      lot_number: input.lot_number,
      job_id: input.job_id,
      inspector_employee_id: input.inspector_employee_id,
      inspection_date: input.inspection_date,
      characteristics: Object.freeze(results),
      pass_count: pass,
      fail_count: fail,
      conditional_count: conditional,
      overall_disposition: overall,
      ncr_required: ncrRequired,
      ncr_severity: ncrRequired ? worst : "none",
      cofc_eligible: cofcEligible,
      generated_at: new Date().toISOString(),
    });
  }

  /** Generate the CofC payload for downstream invoicing — only when eligible. */
  getCertificateOfConformance(report: InspectionReport): Readonly<{
    cofc_id: string;
    part_number: string;
    lot_number: string;
    job_id: string;
    inspection_id: string;
    inspection_date: string;
    inspector_employee_id: string;
    statement: string;
    issued_at: string;
  }> {
    if (!report.cofc_eligible) {
      throw new Error(
        `InspectionReportEngine: CofC requested for non-eligible report (disposition=${report.overall_disposition}, conditional=${report.conditional_count})`,
      );
    }
    return Object.freeze({
      cofc_id: `COFC-${report.inspection_id}`,
      part_number: report.part_number,
      lot_number: report.lot_number,
      job_id: report.job_id,
      inspection_id: report.inspection_id,
      inspection_date: report.inspection_date,
      inspector_employee_id: report.inspector_employee_id,
      statement:
        `Lot ${report.lot_number} of part ${report.part_number} (job ${report.job_id}) ` +
        `inspected ${report.inspection_date}: all ${report.pass_count} characteristics within tolerance. ` +
        `Released per ISO 9001 §8.6.`,
      issued_at: new Date().toISOString(),
    });
  }

  // ─── R12 validation ───────────────────────────────────────────────────

  private validateInput(input: InspectionReportInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("InspectionReportEngine: input must be an object");
    }
    if (!input.inspection_id || typeof input.inspection_id !== "string") {
      throw new Error("InspectionReportEngine: inspection_id must be non-empty string");
    }
    if (!REPORT_TYPES.includes(input.report_type)) {
      throw new Error(`InspectionReportEngine: report_type must be one of ${REPORT_TYPES.join("|")}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.inspection_date)) {
      throw new Error("InspectionReportEngine: inspection_date must be ISO YYYY-MM-DD");
    }
    for (const f of ["part_number", "lot_number", "job_id", "inspector_employee_id"] as const) {
      if (!input[f] || typeof input[f] !== "string") {
        throw new Error(`InspectionReportEngine: ${f} must be non-empty string`);
      }
    }
    if (!Array.isArray(input.characteristics) || input.characteristics.length === 0) {
      throw new Error("InspectionReportEngine: characteristics must be non-empty array");
    }
  }

  private validateCharacteristic(c: CharacteristicInput): void {
    if (!c || typeof c !== "object") {
      throw new Error("InspectionReportEngine: characteristic must be an object");
    }
    if (!c.characteristic_id || typeof c.characteristic_id !== "string") {
      throw new Error("InspectionReportEngine: characteristic_id must be non-empty string");
    }
    for (const f of ["nominal", "upper_tolerance", "lower_tolerance", "measured"] as const) {
      if (!Number.isFinite(c[f])) {
        throw new Error(`InspectionReportEngine: ${f} must be a finite number`);
      }
    }
    if (c.upper_tolerance < c.lower_tolerance) {
      throw new Error(
        `InspectionReportEngine: upper_tolerance (${c.upper_tolerance}) must be >= lower_tolerance (${c.lower_tolerance})`,
      );
    }
    if (!UNITS.includes(c.unit)) {
      throw new Error(`InspectionReportEngine: unit must be one of ${UNITS.join("|")}`);
    }
  }

  private maxSeverity(a: Severity, b: Severity): Severity {
    const order: Record<Severity, number> = { none: 0, minor: 1, major: 2, critical: 3 };
    return order[a] >= order[b] ? a : b;
  }
}

export const inspectionReportEngine = new InspectionReportEngine();
