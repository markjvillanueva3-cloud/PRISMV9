/**
 * OSHA300LogEngine.test.ts — HOTEL/U-OSHA-300-LOG (iter38 /yolo)
 */
import { describe, it, expect } from "vitest";
import {
  osha300LogEngine,
  type IncidentInput,
  type IncidentRecord,
} from "../engines/OSHA300LogEngine.js";

const BASE: IncidentInput = {
  case_number: "OSHA-2026-001",
  employee_id: "EMP-JMD-005",
  incident_date: "2026-06-01",
  description: "Hand laceration while changing insert; cut on tool edge.",
  job_title: "machinist",
  location: "CNC Bay 3",
  nature: "injury",
  severity: "first_aid_only",
  days_away_count: 0,
  days_restricted_count: 0,
  needlestick: false,
  loss_of_consciousness: false,
  significant_dx_by_physician: false,
  hospitalized_overnight: false,
  amputation: false,
  eye_loss: false,
};

describe("OSHA300LogEngine", () => {
  describe("classifyRecordable — recordable criteria (29 CFR §1904.7)", () => {
    it("first-aid-only with no triggers → NOT recordable", () => {
      const r = osha300LogEngine.classifyRecordable(BASE);
      expect(r.is_recordable).toBe(false);
      expect(r.reasons).toEqual([]);
    });

    it("death → recordable + cites 1904.7(b)(1)", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, severity: "death" });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons[0]).toMatch(/death.*1904.7\(b\)\(1\)/);
    });

    it("days_away_count > 0 → recordable", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, days_away_count: 3 });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /days away/.test(x))).toBe(true);
    });

    it("restricted_work severity → recordable", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, severity: "restricted_work" });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /restricted/.test(x))).toBe(true);
    });

    it("medical_treatment severity → recordable", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, severity: "medical_treatment" });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /medical treatment beyond first aid/.test(x))).toBe(true);
    });

    it("loss_of_consciousness → recordable", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, loss_of_consciousness: true });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /loss of consciousness/.test(x))).toBe(true);
    });

    it("significant_dx_by_physician → recordable", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, significant_dx_by_physician: true });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /significant injury/.test(x))).toBe(true);
    });

    it("needlestick → recordable (special case §1904.8)", () => {
      const r = osha300LogEngine.classifyRecordable({ ...BASE, needlestick: true });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.some((x) => /needlestick.*1904.8/.test(x))).toBe(true);
    });

    it("compound case — death + days away + dx_by_physician all cited", () => {
      const r = osha300LogEngine.classifyRecordable({
        ...BASE, severity: "death", days_away_count: 1, significant_dx_by_physician: true,
      });
      expect(r.is_recordable).toBe(true);
      expect(r.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("reportingWindow — federal §1904.39", () => {
    it("non-fatal first-aid → no immediate reporting window", () => {
      const w = osha300LogEngine.reportingWindow(BASE);
      expect(w.hours).toBeNull();
      expect(w.reasons).toEqual([]);
    });

    it("fatality → 8h window", () => {
      const w = osha300LogEngine.reportingWindow({ ...BASE, severity: "death" });
      expect(w.hours).toBe(8);
      expect(w.reasons[0]).toMatch(/fatality.*8h/);
    });

    it("inpatient hospitalization → 24h window", () => {
      const w = osha300LogEngine.reportingWindow({ ...BASE, hospitalized_overnight: true });
      expect(w.hours).toBe(24);
      expect(w.reasons[0]).toMatch(/inpatient.*24h/);
    });

    it("amputation → 24h window", () => {
      const w = osha300LogEngine.reportingWindow({ ...BASE, amputation: true });
      expect(w.hours).toBe(24);
    });

    it("eye loss → 24h window", () => {
      const w = osha300LogEngine.reportingWindow({ ...BASE, eye_loss: true });
      expect(w.hours).toBe(24);
    });

    it("compound fatal+inpatient → tightest (8h) window wins", () => {
      const w = osha300LogEngine.reportingWindow({
        ...BASE, severity: "death", hospitalized_overnight: true,
      });
      expect(w.hours).toBe(8);
    });
  });

  describe("recordIncident — log entry", () => {
    it("recordable case → capa_required + frozen", () => {
      const r = osha300LogEngine.recordIncident({ ...BASE, days_away_count: 2 });
      expect(r.is_recordable).toBe(true);
      expect(r.capa_required).toBe(true);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.recordable_reasons)).toBe(true);
    });

    it("non-recordable first-aid → capa_required false", () => {
      const r = osha300LogEngine.recordIncident(BASE);
      expect(r.is_recordable).toBe(false);
      expect(r.capa_required).toBe(false);
    });

    it("fatality reporting_deadline_iso is incident_date + 8h", () => {
      const r = osha300LogEngine.recordIncident({ ...BASE, severity: "death" });
      expect(r.reporting_window_hours).toBe(8);
      // incident_date "2026-06-01T00:00:00Z" + 8h = "2026-06-01T08:00:00.000Z"
      expect(r.reporting_deadline_iso).toBe("2026-06-01T08:00:00.000Z");
    });

    it("non-reportable case → reporting_deadline_iso null", () => {
      const r = osha300LogEngine.recordIncident(BASE);
      expect(r.reporting_deadline_iso).toBeNull();
      expect(r.reporting_window_hours).toBeNull();
    });
  });

  describe("PII guard on description", () => {
    it("description containing SSN throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({
          ...BASE, description: "Operator John Smith (123-45-6789) cut finger",
        }),
      ).toThrow(/description appears to contain PII/);
    });

    it("description containing email throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({
          ...BASE, description: "Reported by operator@example.com after the shift",
        }),
      ).toThrow(/description appears to contain PII/);
    });

    it("description containing US phone throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({
          ...BASE, description: "Call back number 555-123-4567 left at gate",
        }),
      ).toThrow(/description appears to contain PII/);
    });

    it("description containing 'Mr. Smith' throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({
          ...BASE, description: "Mr. Smith was operating the lathe at the time",
        }),
      ).toThrow(/description appears to contain PII/);
    });

    it("clean description with job_title only passes", () => {
      const r = osha300LogEngine.recordIncident({
        ...BASE, description: "Machinist sustained hand laceration on insert edge",
      });
      expect(r.description).toMatch(/hand laceration/);
    });
  });

  describe("R12 input validation", () => {
    it("bad incident_date throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, incident_date: "yesterday" }),
      ).toThrow(/incident_date must be ISO/);
    });

    it("invalid nature throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, nature: "broken_glass" as any }),
      ).toThrow(/nature must be one of/);
    });

    it("invalid severity throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, severity: "scratched" as any }),
      ).toThrow(/severity must be one of/);
    });

    it("negative days_away_count throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, days_away_count: -1 }),
      ).toThrow(/days_away_count must be non-negative/);
    });

    it("fractional days_restricted_count throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, days_restricted_count: 1.5 }),
      ).toThrow(/days_restricted_count must be non-negative integer/);
    });

    it("non-boolean needlestick throws", () => {
      expect(() =>
        osha300LogEngine.recordIncident({ ...BASE, needlestick: 1 as any }),
      ).toThrow(/needlestick must be boolean/);
    });
  });

  describe("buildAnnual300A — Form 300A summary", () => {
    function makeRec(over: Partial<IncidentInput>): IncidentRecord {
      return osha300LogEngine.recordIncident({ ...BASE, ...over });
    }

    it("empty records → zero counts", () => {
      const s = osha300LogEngine.buildAnnual300A(2026, []);
      expect(s.total_recordable).toBe(0);
      expect(s.year).toBe(2026);
    });

    it("non-recordable cases NOT counted", () => {
      const records = [makeRec({ case_number: "X1" })]; // first-aid-only
      const s = osha300LogEngine.buildAnnual300A(2026, records);
      expect(s.total_recordable).toBe(0);
    });

    it("aggregates by severity bucket + days sums", () => {
      const records = [
        makeRec({ case_number: "X1", severity: "death" }),
        makeRec({ case_number: "X2", severity: "days_away", days_away_count: 5 }),
        makeRec({ case_number: "X3", severity: "days_away", days_away_count: 3 }),
        makeRec({ case_number: "X4", severity: "restricted_work", days_restricted_count: 7 }),
        makeRec({ case_number: "X5", severity: "medical_treatment" }),
      ];
      const s = osha300LogEngine.buildAnnual300A(2026, records);
      expect(s.total_recordable).toBe(5);
      expect(s.total_death).toBe(1);
      expect(s.total_days_away).toBe(2);
      expect(s.total_restricted).toBe(1);
      expect(s.total_other_recordable).toBe(1);   // medical_treatment without days
      expect(s.total_days_away_sum).toBe(8);
      expect(s.total_days_restricted_sum).toBe(7);
    });

    it("by_nature aggregation correct", () => {
      const records = [
        makeRec({ case_number: "X1", severity: "medical_treatment", nature: "injury" }),
        makeRec({ case_number: "X2", severity: "medical_treatment", nature: "hearing_loss" }),
        makeRec({ case_number: "X3", severity: "medical_treatment", nature: "injury" }),
      ];
      const s = osha300LogEngine.buildAnnual300A(2026, records);
      expect(s.by_nature.injury).toBe(2);
      expect(s.by_nature.hearing_loss).toBe(1);
      expect(s.by_nature.skin_disorder).toBe(0);
    });

    it("filters out records from other years", () => {
      const records = [
        makeRec({ case_number: "X1", severity: "days_away", days_away_count: 1, incident_date: "2025-12-31" }),
        makeRec({ case_number: "X2", severity: "days_away", days_away_count: 1, incident_date: "2026-01-01" }),
        makeRec({ case_number: "X3", severity: "days_away", days_away_count: 1, incident_date: "2027-01-01" }),
      ];
      const s = osha300LogEngine.buildAnnual300A(2026, records);
      expect(s.total_recordable).toBe(1);
    });

    it("rejects bad year", () => {
      expect(() =>
        osha300LogEngine.buildAnnual300A(1970, []),
      ).toThrow(/year must be integer between 1971 and 2100/);
      expect(() =>
        osha300LogEngine.buildAnnual300A(1.5 as any, []),
      ).toThrow(/year must be integer/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("PII-free output — only employee_id + job_title strings, no names", () => {
      const r = osha300LogEngine.recordIncident({ ...BASE, days_away_count: 3 });
      const j = JSON.stringify(r);
      expect(j).not.toMatch(/ssn|social.security/i);
      expect(j).not.toMatch(/first_name|last_name|date.of.birth/i);
    });

    it("variability floor — all 6 IncidentNatures accepted", () => {
      for (const n of ["injury", "skin_disorder", "respiratory_condition", "poisoning", "hearing_loss", "all_other_illness"] as const) {
        const r = osha300LogEngine.recordIncident({ ...BASE, nature: n });
        expect(r.nature).toBe(n);
      }
    });

    it("variability floor — all 5 severities accepted", () => {
      for (const s of ["first_aid_only", "medical_treatment", "restricted_work", "days_away", "death"] as const) {
        const r = osha300LogEngine.recordIncident({ ...BASE, severity: s });
        expect(r.severity).toBe(s);
      }
    });

    it("annual summary returned + nested by_nature frozen", () => {
      const s = osha300LogEngine.buildAnnual300A(2026, []);
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.by_nature)).toBe(true);
    });
  });
});
