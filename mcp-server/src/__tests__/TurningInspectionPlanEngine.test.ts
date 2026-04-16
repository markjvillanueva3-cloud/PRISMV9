/**
 * TurningInspectionPlanEngine Test Suite (LATHE-PRO-MS6)
 */
import { describe, it, expect } from "vitest";
import { turningInspectionPlanEngine } from "../engines/TurningInspectionPlanEngine.js";

describe("TurningInspectionPlanEngine", () => {
  describe("generate()", () => {
    it("produces feature records for each input feature", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "TEST-001",
        lot_size: 50,
        features: [
          { id: "od1", kind: "od", nominal_mm: 30, tolerance_mm: 0.025 },
          { id: "id1", kind: "bore", nominal_mm: 15, tolerance_mm: 0.02 },
          { id: "thr1", kind: "thread", nominal_mm: 12, tolerance_mm: 0.05 },
        ],
      });
      expect(r.feature_records.length).toBe(3);
    });

    it("picks thread_gauge for thread features", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T2",
        lot_size: 10,
        features: [{ id: "thr1", kind: "thread", nominal_mm: 12, tolerance_mm: 0.05 }],
      });
      expect(r.feature_records[0]!.method).toBe("thread_gauge");
    });

    it("picks CMM for precision OD with form tolerance", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T3",
        lot_size: 50,
        features: [
          {
            id: "od1",
            kind: "od",
            nominal_mm: 30,
            tolerance_mm: 0.005,
            requires_form_tolerance: true,
          },
        ],
        cmm_available: true,
      });
      expect(r.feature_records[0]!.method).toBe("cmm");
      expect(r.feature_records[0]!.probe_points).toBeGreaterThanOrEqual(6);
    });

    it("picks bore_gauge for small bores (<10mm)", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T4",
        lot_size: 10,
        features: [{ id: "id1", kind: "bore", nominal_mm: 8, tolerance_mm: 0.02 }],
      });
      expect(r.feature_records[0]!.method).toBe("bore_gauge");
    });

    it("safety_critical features inspected every part (precision tol)", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T5",
        lot_size: 30,
        features: [
          {
            id: "crit",
            kind: "od",
            nominal_mm: 20,
            tolerance_mm: 0.005,
            criticality: "safety_critical",
          },
        ],
      });
      expect(r.feature_records[0]!.frequency).toBe("every_part");
      expect(r.feature_records[0]!.sample_size).toBe(30);
    });

    it("aerospace regime requires first article package", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T6",
        lot_size: 5,
        regulatory_regime: "aerospace",
        features: [{ id: "od1", kind: "od", nominal_mm: 30, tolerance_mm: 0.025 }],
      });
      expect(r.first_article_required).toBe(true);
      expect(r.notes.some((n) => n.includes("AS9102"))).toBe(true);
    });

    it("lot_size ≥ 50 also triggers first article", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T7",
        lot_size: 100,
        features: [{ id: "od1", kind: "od", nominal_mm: 30, tolerance_mm: 0.025 }],
      });
      expect(r.first_article_required).toBe(true);
    });

    it("cosmetic features inspected first_article_only", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T8",
        lot_size: 100,
        features: [
          {
            id: "chamfer1",
            kind: "chamfer",
            nominal_mm: 0.5,
            tolerance_mm: 0.1,
            criticality: "cosmetic",
          },
        ],
      });
      expect(r.feature_records[0]!.frequency).toBe("first_article_only");
    });

    it("includes Surftest equipment when Ra target given", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T9",
        lot_size: 10,
        features: [
          {
            id: "od1",
            kind: "od",
            nominal_mm: 30,
            tolerance_mm: 0.025,
            ra_target_um: 1.6,
          },
        ],
      });
      expect(r.equipment_list.some((e) => e.includes("Surftest"))).toBe(true);
    });

    it("lot total time scales with sample_size", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T10",
        lot_size: 100,
        features: [{ id: "od1", kind: "od", nominal_mm: 30, tolerance_mm: 0.025 }],
      });
      expect(r.total_inspection_time_per_lot_sec).toBeGreaterThan(
        r.total_inspection_time_sec
      );
    });

    it("warns when CMM required but unavailable", () => {
      const r = turningInspectionPlanEngine.generate({
        part_id: "T11",
        lot_size: 20,
        features: [
          {
            id: "od1",
            kind: "od",
            nominal_mm: 30,
            tolerance_mm: 0.005,
            requires_form_tolerance: true,
          },
        ],
        cmm_available: false,
      });
      expect(r.notes.some((n) => n.toLowerCase().includes("cmm"))).toBe(true);
    });
  });

  describe("getStats()", () => {
    it("reports supported feature kinds + sampling basis", () => {
      const s = turningInspectionPlanEngine.getStats();
      expect(s.supported_kinds.length).toBe(8);
      expect(s.aql_sampling).toContain("Z1.4");
    });
  });
});
