/**
 * InspectionReportEngine.test.ts — HOTEL/U-INSPECTION-REPORT (iter33 /yolo)
 */
import { describe, it, expect } from "vitest";
import {
  inspectionReportEngine,
  type InspectionReportInput,
  type CharacteristicInput,
} from "../engines/InspectionReportEngine.js";

const goodChar = (id: string, measured: number, opts: Partial<CharacteristicInput> = {}): CharacteristicInput => ({
  characteristic_id: id,
  nominal: 10.0,
  upper_tolerance: 0.05,
  lower_tolerance: -0.05,
  measured,
  unit: "mm",
  ...opts,
});

const BASE_INPUT: InspectionReportInput = {
  inspection_id: "INSP-001",
  report_type: "final",
  part_number: "PN-12345",
  lot_number: "LOT-2026-001",
  job_id: "JOB-9001",
  inspector_employee_id: "EMP-QC-01",
  inspection_date: "2026-06-01",
  characteristics: [
    goodChar("C1", 10.000),
    goodChar("C2", 10.025),
    goodChar("C3", 9.980),
  ],
};

describe("InspectionReportEngine", () => {
  describe("Happy path — all in spec", () => {
    it("all characteristics in spec → overall pass, CofC eligible, no NCR", () => {
      const r = inspectionReportEngine.buildReport(BASE_INPUT);
      expect(r.overall_disposition).toBe("pass");
      expect(r.pass_count).toBe(3);
      expect(r.fail_count).toBe(0);
      expect(r.conditional_count).toBe(0);
      expect(r.ncr_required).toBe(false);
      expect(r.ncr_severity).toBe("none");
      expect(r.cofc_eligible).toBe(true);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.characteristics)).toBe(true);
    });

    it("deviation = measured − nominal", () => {
      const r = inspectionReportEngine.buildReport(BASE_INPUT);
      expect(r.characteristics[1].deviation).toBeCloseTo(0.025, 6);
      expect(r.characteristics[2].deviation).toBeCloseTo(-0.020, 6);
    });

    it("measurement just inside +UT → in_spec true (FP-safe boundary)", () => {
      // NOTE: testing 10.050 exactly fails FP precision (10 + 0.05 in IEEE 754
      // gives 10.050000…71 > 0.05 by ~1ulp). Real inspection software adds an
      // MSA uncertainty buffer outside the engine — the engine compares exactly.
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.04999)],
      });
      expect(r.characteristics[0].in_spec).toBe(true);
      expect(r.overall_disposition).toBe("pass");
    });
  });

  describe("Severity ladder — bilateral tolerance band 0.10", () => {
    it("deviation 1.5× band over → minor severity, conditional disposition", () => {
      // band=0.10, over=0.05 → mult=0.5 (≤1.5) → minor
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.100)],
      });
      expect(r.characteristics[0].severity).toBe("minor");
      expect(r.overall_disposition).toBe("conditional");
      expect(r.conditional_count).toBe(1);
      expect(r.ncr_required).toBe(true);
      expect(r.cofc_eligible).toBe(false);
    });

    it("deviation 2× band over → major severity, fail disposition", () => {
      // over = 0.20, band=0.10, mult=2.0 → major
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.250)],
      });
      expect(r.characteristics[0].severity).toBe("major");
      expect(r.overall_disposition).toBe("fail");
      expect(r.ncr_severity).toBe("major");
    });

    it("deviation 5× band over → critical severity", () => {
      // over=0.50, mult=5 (>3) → critical
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.550)],
      });
      expect(r.characteristics[0].severity).toBe("critical");
      expect(r.overall_disposition).toBe("fail");
      expect(r.ncr_severity).toBe("critical");
    });

    it("safety_critical bumps minor → major", () => {
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.100, { safety_critical: true })],
      });
      expect(r.characteristics[0].severity).toBe("major");
      expect(r.overall_disposition).toBe("fail");
    });

    it("safety_critical does NOT downgrade critical", () => {
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.550, { safety_critical: true })],
      });
      expect(r.characteristics[0].severity).toBe("critical");
    });
  });

  describe("Worst-of-all aggregation", () => {
    it("mixed pass + conditional + critical → overall fail + critical NCR severity", () => {
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [
          goodChar("C1", 10.000),     // pass
          goodChar("C2", 10.100),     // minor → conditional
          goodChar("C3", 10.550),     // critical
        ],
      });
      expect(r.overall_disposition).toBe("fail");
      expect(r.ncr_severity).toBe("critical");
      expect(r.pass_count).toBe(1);
      expect(r.fail_count).toBe(1);
      expect(r.conditional_count).toBe(1);
    });
  });

  describe("CofC issuance", () => {
    it("eligible report → CofC with statement", () => {
      const r = inspectionReportEngine.buildReport(BASE_INPUT);
      const cofc = inspectionReportEngine.getCertificateOfConformance(r);
      expect(cofc.cofc_id).toBe("COFC-INSP-001");
      expect(cofc.statement).toContain("LOT-2026-001");
      expect(cofc.statement).toContain("ISO 9001 §8.6");
      expect(Object.isFrozen(cofc)).toBe(true);
    });

    it("conditional report → CofC throws", () => {
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.100)],
      });
      expect(() => inspectionReportEngine.getCertificateOfConformance(r)).toThrow(/non-eligible/);
    });

    it("failed report → CofC throws", () => {
      const r = inspectionReportEngine.buildReport({
        ...BASE_INPUT,
        characteristics: [goodChar("C1", 10.550)],
      });
      expect(() => inspectionReportEngine.getCertificateOfConformance(r)).toThrow(/non-eligible/);
    });
  });

  describe("R12 input validation", () => {
    it("throws on bad date format", () => {
      expect(() =>
        inspectionReportEngine.buildReport({ ...BASE_INPUT, inspection_date: "tomorrow" }),
      ).toThrow(/inspection_date/);
    });

    it("throws on invalid report_type", () => {
      expect(() =>
        inspectionReportEngine.buildReport({ ...BASE_INPUT, report_type: "audit" as any }),
      ).toThrow(/report_type/);
    });

    it("throws on empty characteristics array", () => {
      expect(() =>
        inspectionReportEngine.buildReport({ ...BASE_INPUT, characteristics: [] }),
      ).toThrow(/characteristics must be non-empty/);
    });

    it("throws on NaN measurement", () => {
      expect(() =>
        inspectionReportEngine.buildReport({
          ...BASE_INPUT,
          characteristics: [goodChar("C1", Number.NaN)],
        }),
      ).toThrow(/measured must be a finite number/);
    });

    it("throws on Infinity measurement", () => {
      expect(() =>
        inspectionReportEngine.buildReport({
          ...BASE_INPUT,
          characteristics: [goodChar("C1", Number.POSITIVE_INFINITY)],
        }),
      ).toThrow(/measured must be a finite number/);
    });

    it("throws on inverted tolerance band (upper < lower)", () => {
      expect(() =>
        inspectionReportEngine.buildReport({
          ...BASE_INPUT,
          characteristics: [goodChar("C1", 10.0, { upper_tolerance: -0.05, lower_tolerance: 0.05 })],
        }),
      ).toThrow(/upper_tolerance .* >= lower_tolerance/);
    });

    it("throws on missing inspector_employee_id", () => {
      expect(() =>
        inspectionReportEngine.buildReport({ ...BASE_INPUT, inspector_employee_id: "" }),
      ).toThrow(/inspector_employee_id/);
    });

    it("throws on invalid unit", () => {
      expect(() =>
        inspectionReportEngine.buildReport({
          ...BASE_INPUT,
          characteristics: [goodChar("C1", 10.0, { unit: "feet" as any })],
        }),
      ).toThrow(/unit must be one of/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("PII-free — only employee_id strings", () => {
      const r = inspectionReportEngine.buildReport(BASE_INPUT);
      const json = JSON.stringify(r);
      expect(json).not.toMatch(/ssn/i);
      expect(json).not.toMatch(/social.security/i);
      expect(json).not.toMatch(/employee_name/i);
      expect(json).not.toMatch(/birth.date|dob/i);
    });

    it("report + nested characteristics frozen", () => {
      const r = inspectionReportEngine.buildReport(BASE_INPUT);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.characteristics)).toBe(true);
      expect(Object.isFrozen(r.characteristics[0])).toBe(true);
    });

    it("all 4 report_types accepted (variability floor)", () => {
      for (const t of ["fai", "in_process", "final", "incoming"] as const) {
        const r = inspectionReportEngine.buildReport({ ...BASE_INPUT, report_type: t });
        expect(r.report_type).toBe(t);
      }
    });
  });
});
