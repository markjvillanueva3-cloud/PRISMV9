/**
 * LatheProductionQualityTrackingEngine Tests
 *
 * U-LTH55: Production quality metrics, SPC, inspection tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheProductionQualityTrackingEngine } from "../engines/LatheProductionQualityTrackingEngine.js";

describe("LatheProductionQualityTrackingEngine", () => {
  beforeEach(() => {
    latheProductionQualityTrackingEngine.clearAll();
  });

  describe("Dimension Management", () => {
    it("initializes with sample dimensions", () => {
      const dims = latheProductionQualityTrackingEngine.getAllDimensions();

      expect(dims.length).toBeGreaterThanOrEqual(5);
      expect(dims.some((d) => d.name === "OD_1")).toBe(true);
    });

    it("returns dimension by name", () => {
      const dim = latheProductionQualityTrackingEngine.getDimension("OD_1");

      expect(dim).not.toBeNull();
      expect(dim!.nominal).toBe(25.0);
      expect(dim!.critical).toBe(true);
    });

    it("defines new dimension", () => {
      latheProductionQualityTrackingEngine.defineDimension({
        name: "CUSTOM_DIM",
        nominal: 10.0,
        tolerance_plus: 0.01,
        tolerance_minus: 0.01,
        unit: "mm",
        critical: false,
      });

      const dim = latheProductionQualityTrackingEngine.getDimension("CUSTOM_DIM");
      expect(dim).not.toBeNull();
      expect(dim!.nominal).toBe(10.0);
    });
  });

  describe("Inspection Management", () => {
    it("creates inspection record", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-001",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "first_article",
        inspected_by: "OP-001",
      });

      expect(inspection.inspection_id).toMatch(/^INS-/);
      expect(inspection.result).toBe("pass");
      expect(inspection.measurements.length).toBe(0);
    });

    it("records measurement within tolerance", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-001",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      const measurement = latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.010,
        "OP-001",
        "MIC-001"
      );

      expect(measurement).not.toBeNull();
      expect(measurement!.in_tolerance).toBe(true);
      expect(measurement!.deviation).toBeCloseTo(0.010, 4);
    });

    it("records measurement out of tolerance", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-001",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      const measurement = latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.050,
        "OP-001",
        "MIC-001"
      );

      expect(measurement).not.toBeNull();
      expect(measurement!.in_tolerance).toBe(false);

      const updated = latheProductionQualityTrackingEngine.getInspection(inspection.inspection_id);
      expect(updated!.result).toBe("fail");
    });

    it("finalizes inspection with pass", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-001",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "final",
        inspected_by: "OP-001",
      });

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.005,
        "OP-001",
        "MIC-001"
      );

      const finalized = latheProductionQualityTrackingEngine.finalizeInspection(
        inspection.inspection_id,
        "All dimensions good"
      );

      expect(finalized!.result).toBe("pass");
      expect(finalized!.notes).toBe("All dimensions good");
    });

    it("finalizes inspection with conditional for non-critical fails", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-001",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "final",
        inspected_by: "OP-001",
      });

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.005,
        "OP-001",
        "MIC-001"
      );

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "LENGTH",
        50.200,
        "OP-001",
        "CAL-001"
      );

      const finalized = latheProductionQualityTrackingEngine.finalizeInspection(
        inspection.inspection_id
      );

      expect(finalized!.result).toBe("conditional");
    });

    it("retrieves inspections by job", () => {
      for (let i = 0; i < 5; i++) {
        latheProductionQualityTrackingEngine.createInspection({
          job_id: "JOB-001",
          part_number: "PART-001",
          serial_number: `SN-000${i}`,
          inspection_type: "in_process",
          inspected_by: "OP-001",
        });
      }

      const inspections = latheProductionQualityTrackingEngine.getInspectionsByJob("JOB-001");
      expect(inspections.length).toBe(5);
    });
  });

  describe("SPC Analysis", () => {
    it("generates SPC chart with sufficient data", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-SPC",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      const baseValue = 25.0;
      for (let i = 0; i < 25; i++) {
        const variation = (Math.random() - 0.5) * 0.02;
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          baseValue + variation,
          "OP-001",
          "MIC-001"
        );
      }

      const chart = latheProductionQualityTrackingEngine.generateSPCChart("JOB-SPC", "OD_1");

      expect(chart).not.toBeNull();
      expect(chart!.chart_type).toBe("xbar");
      expect(chart!.ucl).toBeGreaterThan(chart!.center_line);
      expect(chart!.lcl).toBeLessThan(chart!.center_line);
      expect(chart!.data_points.length).toBe(25);
    });

    it("calculates Cpk from SPC data", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-CPK",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      for (let i = 0; i < 30; i++) {
        const variation = (Math.random() - 0.5) * 0.01;
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.0 + variation,
          "OP-001",
          "MIC-001"
        );
      }

      const chart = latheProductionQualityTrackingEngine.generateSPCChart("JOB-CPK", "OD_1");

      expect(chart!.cpk).toBeGreaterThan(0);
      expect(chart!.ppk).toBeGreaterThan(0);
    });

    it("detects out of control points", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-OOC",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      for (let i = 0; i < 20; i++) {
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.005,
          "OP-001",
          "MIC-001"
        );
      }

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.100,
        "OP-001",
        "MIC-001"
      );

      const chart = latheProductionQualityTrackingEngine.generateSPCChart("JOB-OOC", "OD_1");

      expect(chart!.out_of_control_points.length).toBeGreaterThan(0);
    });

    it("returns null for insufficient data", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-FEW",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      for (let i = 0; i < 3; i++) {
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.0,
          "OP-001",
          "MIC-001"
        );
      }

      const chart = latheProductionQualityTrackingEngine.generateSPCChart("JOB-FEW", "OD_1");
      expect(chart).toBeNull();
    });
  });

  describe("Quality Metrics", () => {
    it("calculates job quality metrics", () => {
      for (let i = 0; i < 10; i++) {
        const inspection = latheProductionQualityTrackingEngine.createInspection({
          job_id: "JOB-METRICS",
          part_number: "PART-001",
          serial_number: `SN-${i}`,
          inspection_type: "in_process",
          inspected_by: "OP-001",
        });

        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.005,
          "OP-001",
          "MIC-001"
        );

        latheProductionQualityTrackingEngine.finalizeInspection(inspection.inspection_id);
      }

      const metrics = latheProductionQualityTrackingEngine.calculateJobMetrics("JOB-METRICS");

      expect(metrics.total_inspected).toBe(10);
      expect(metrics.total_passed).toBe(10);
      expect(metrics.first_pass_yield).toBe(100);
      expect(metrics.defect_rate_ppm).toBe(0);
    });

    it("calculates metrics with failures", () => {
      for (let i = 0; i < 10; i++) {
        const inspection = latheProductionQualityTrackingEngine.createInspection({
          job_id: "JOB-FAIL",
          part_number: "PART-001",
          serial_number: `SN-${i}`,
          inspection_type: "in_process",
          inspected_by: "OP-001",
        });

        const value = i < 8 ? 25.005 : 25.100;
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          value,
          "OP-001",
          "MIC-001"
        );

        latheProductionQualityTrackingEngine.finalizeInspection(inspection.inspection_id);
      }

      const metrics = latheProductionQualityTrackingEngine.calculateJobMetrics("JOB-FAIL");

      expect(metrics.total_failed).toBe(2);
      expect(metrics.first_pass_yield).toBe(80);
      expect(metrics.defect_rate_ppm).toBe(200000);
    });

    it("calculates quality score", () => {
      for (let i = 0; i < 5; i++) {
        const inspection = latheProductionQualityTrackingEngine.createInspection({
          job_id: "JOB-SCORE",
          part_number: "PART-001",
          serial_number: `SN-${i}`,
          inspection_type: "in_process",
          inspected_by: "OP-001",
        });

        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.0 + (Math.random() - 0.5) * 0.01,
          "OP-001",
          "MIC-001"
        );

        latheProductionQualityTrackingEngine.finalizeInspection(inspection.inspection_id);
      }

      const metrics = latheProductionQualityTrackingEngine.calculateJobMetrics("JOB-SCORE");

      expect(metrics.quality_score).toBeGreaterThan(0);
      expect(metrics.quality_score).toBeLessThanOrEqual(100);
    });
  });

  describe("Non-Conformance Management", () => {
    it("creates NC automatically on out-of-tolerance", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-NC",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.100,
        "OP-001",
        "MIC-001"
      );

      const ncs = latheProductionQualityTrackingEngine.getNonConformancesByJob("JOB-NC");
      expect(ncs.length).toBe(1);
      expect(ncs[0].disposition).toBe("pending");
    });

    it("resolves non-conformance", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-NC2",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.100,
        "OP-001",
        "MIC-001"
      );

      const ncs = latheProductionQualityTrackingEngine.getNonConformancesByJob("JOB-NC2");
      const resolved = latheProductionQualityTrackingEngine.resolveNonConformance(
        ncs[0].nc_id,
        "rework",
        "Tool wear caused oversize",
        "Replace insert and re-machine"
      );

      expect(resolved!.disposition).toBe("rework");
      expect(resolved!.root_cause).toBe("Tool wear caused oversize");
      expect(resolved!.resolved_at).toBeDefined();
    });

    it("returns pending non-conformances", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-NC3",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      latheProductionQualityTrackingEngine.recordMeasurement(
        inspection.inspection_id,
        "OD_1",
        25.100,
        "OP-001",
        "MIC-001"
      );

      const pending = latheProductionQualityTrackingEngine.getPendingNonConformances();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending.every((nc) => nc.disposition === "pending")).toBe(true);
    });
  });

  describe("Trend Analysis", () => {
    it("analyzes trend with sufficient data", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-TREND",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      for (let i = 0; i < 20; i++) {
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.0 + (Math.random() - 0.5) * 0.01,
          "OP-001",
          "MIC-001"
        );
      }

      const trend = latheProductionQualityTrackingEngine.analyzeTrend("JOB-TREND", "OD_1");

      expect(trend).not.toBeNull();
      expect(["improving", "stable", "degrading"]).toContain(trend!.trend);
      expect(trend!.confidence).toBeGreaterThan(0);
      expect(trend!.prediction.length).toBeGreaterThan(0);
    });

    it("returns null for insufficient data", () => {
      const inspection = latheProductionQualityTrackingEngine.createInspection({
        job_id: "JOB-FEW-TREND",
        part_number: "PART-001",
        serial_number: "SN-0001",
        inspection_type: "in_process",
        inspected_by: "OP-001",
      });

      for (let i = 0; i < 5; i++) {
        latheProductionQualityTrackingEngine.recordMeasurement(
          inspection.inspection_id,
          "OD_1",
          25.0,
          "OP-001",
          "MIC-001"
        );
      }

      const trend = latheProductionQualityTrackingEngine.analyzeTrend("JOB-FEW-TREND", "OD_1");
      expect(trend).toBeNull();
    });
  });
});
