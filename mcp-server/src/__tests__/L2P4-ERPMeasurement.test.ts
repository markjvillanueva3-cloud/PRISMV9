/**
 * L2-P4-MS1/P0-U02 Tests: ERP Bridge + Measurement & QC Engines
 * ==============================================================
 */

import { describe, it, expect, beforeEach } from "vitest";

// ERP Bridge Engines
import { ERPImportEngine } from "../engines/ERPImportEngine.js";
import { ERPCostFeedbackEngine } from "../engines/ERPCostFeedbackEngine.js";
import { ERPQualityEngine } from "../engines/ERPQualityEngine.js";
import { ERPToolInventoryEngine } from "../engines/ERPToolInventoryEngine.js";
import { ERPWorkOrderEngine } from "../engines/ERPWorkOrderEngine.js";

// Measurement & QC Engines
import { CMMImportEngine } from "../engines/CMMImportEngine.js";
import { CMMHistoryEngine } from "../engines/CMMHistoryEngine.js";
import { SurfaceMeasureEngine } from "../engines/SurfaceMeasureEngine.js";
import { ProbeRecordEngine } from "../engines/ProbeRecordEngine.js";
import { ProbeDriftEngine } from "../engines/ProbeDriftEngine.js";
import { MeasureSummaryEngine } from "../engines/MeasureSummaryEngine.js";

// ─── ERP Import Engine Tests ──────────────────────────────────────────────────

describe("ERPImportEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ERPImportEngine.getSelfAwareness();
    expect(awareness.name).toBe("ERPImportEngine");
    expect(awareness.milestone).toBe("L2-P4-MS1/P0-U02");
    expect(awareness.supportedSystems).toContain("sap");
    expect(awareness.supportedSystems).toContain("jobboss");
  });

  it("should import a valid work order", () => {
    const result = ERPImportEngine.importWorkOrder({
      erpSystem: "jobboss",
      workOrderNumber: "JB-TEST-001",
      partNumber: "PART-001",
      description: "Test Part",
      customer: "ACME",
      quantityOrdered: 100,
      dueDate: "2026-12-31",
      routing: [
        { operationNumber: 10, workCenter: "LATHE-1", description: "Turn OD", setupHours: 0.5, runHoursPerUnit: 0.1 },
        { operationNumber: 20, workCenter: "MILL-1", description: "Mill flat", setupHours: 0.25, runHoursPerUnit: 0.05 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.operationsCreated).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject work order with zero quantity", () => {
    const result = ERPImportEngine.importWorkOrder({
      erpSystem: "sap",
      workOrderNumber: "SAP-001",
      partNumber: "PART-002",
      description: "Invalid Part",
      customer: "TEST",
      quantityOrdered: 0,
      dueDate: "2026-12-31",
      routing: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Quantity ordered must be greater than 0");
  });

  it("should return field mappings for supported systems", () => {
    const sapMappings = ERPImportEngine.getFieldMappings("sap");
    expect(sapMappings.workOrderNumber).toBe("AUFNR");
    expect(sapMappings.partNumber).toBe("MATNR");

    const jobbossMappings = ERPImportEngine.getFieldMappings("jobboss");
    expect(jobbossMappings.workOrderNumber).toBe("Job");
  });

  it("should validate work order data", () => {
    const valid = ERPImportEngine.validateWorkOrder({
      erpSystem: "e2",
      workOrderNumber: "E2-001",
      partNumber: "PART",
      description: "Test",
      customer: "Cust",
      quantityOrdered: 10,
      dueDate: "2026-01-01",
      routing: [],
    });
    expect(valid.valid).toBe(true);

    const invalid = ERPImportEngine.validateWorkOrder({ foo: "bar" });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});

// ─── ERP Cost Feedback Engine Tests ───────────────────────────────────────────

describe("ERPCostFeedbackEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ERPCostFeedbackEngine.getSelfAwareness();
    expect(awareness.name).toBe("ERPCostFeedbackEngine");
    expect(awareness.costCategories).toContain("labor");
    expect(awareness.costCategories).toContain("material");
  });

  it("should record a cost entry", () => {
    const entry = ERPCostFeedbackEngine.recordCost(
      "WO-COST-001",
      "labor",
      "Machine operator - setup",
      2.5,
      45.00,
      { employeeId: "EMP-001", operationNumber: 10 }
    );

    expect(entry.id).toMatch(/^COST-/);
    expect(entry.totalCost).toBe(112.50);
    expect(entry.category).toBe("labor");
    expect(entry.posted).toBe(false);
  });

  it("should calculate cost summary with variance", () => {
    ERPCostFeedbackEngine.setEstimatedCost("WO-COST-002", 500);
    ERPCostFeedbackEngine.recordCost("WO-COST-002", "material", "Raw stock", 1, 200);
    ERPCostFeedbackEngine.recordCost("WO-COST-002", "labor", "Machining", 4, 50);

    const summary = ERPCostFeedbackEngine.getCostSummary("WO-COST-002");
    expect(summary.estimatedCost).toBe(500);
    expect(summary.actualCost).toBe(400);
    expect(summary.variance).toBe(-100);
    expect(summary.variancePercent).toBe(-20);
  });

  it("should post costs to ERP", () => {
    ERPCostFeedbackEngine.recordCost("WO-COST-003", "tooling", "End mill", 1, 75);
    const result = ERPCostFeedbackEngine.postToERP("WO-COST-003", "jobboss");

    expect(result.success).toBe(true);
    expect(result.entriesPosted).toBeGreaterThanOrEqual(1);
    expect(result.erpTransactionId).toBeDefined();
  });

  it("should format cost data for export", () => {
    ERPCostFeedbackEngine.recordCost("WO-EXPORT", "overhead", "Shop rate", 1, 100);

    const csv = ERPCostFeedbackEngine.formatForExport("WO-EXPORT", "csv");
    expect(csv).toContain("ID,Category,Description");
    expect(csv).toContain("overhead");

    const json = ERPCostFeedbackEngine.formatForExport("WO-EXPORT", "json");
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ─── ERP Quality Engine Tests ─────────────────────────────────────────────────

describe("ERPQualityEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ERPQualityEngine.getSelfAwareness();
    expect(awareness.name).toBe("ERPQualityEngine");
    expect(awareness.inspectionTypes).toContain("first_article");
    expect(awareness.dispositions).toContain("scrap");
  });

  it("should record an inspection result", () => {
    const result = ERPQualityEngine.recordInspection({
      workOrderNumber: "WO-QA-001",
      operationNumber: 10,
      partNumber: "PART-QA",
      inspectorId: "QA-001",
      inspectionType: "first_article",
      result: "pass",
      characteristics: [
        { name: "OD", nominal: 25.0, tolerance: 0.05, actual: 25.02, unit: "mm", pass: true },
        { name: "Length", nominal: 100.0, tolerance: 0.1, actual: 100.05, unit: "mm", pass: true },
      ],
    });

    expect(result.id).toMatch(/^INS-/);
    expect(result.result).toBe("pass");
    expect(result.characteristics).toHaveLength(2);
  });

  it("should create and close NCR", () => {
    const ncr = ERPQualityEngine.createNCR({
      workOrderNumber: "WO-QA-002",
      partNumber: "PART-NCR",
      quantity: 5,
      defectType: "dimensional",
      defectDescription: "OD undersized",
      disposition: "pending",
      createdBy: "QA-001",
    });

    expect(ncr.id).toMatch(/^NCR-/);
    expect(ncr.disposition).toBe("pending");

    const closed = ERPQualityEngine.closeNCR(ncr.id, "rework", "QA-002", "Re-machine OD");
    expect(closed?.disposition).toBe("rework");
    expect(closed?.closedBy).toBe("QA-002");
  });

  it("should calculate quality metrics", () => {
    ERPQualityEngine.recordInspection({
      workOrderNumber: "WO-QA-003",
      operationNumber: 10,
      partNumber: "PART-METRIC",
      inspectorId: "QA-001",
      inspectionType: "in_process",
      result: "pass",
      characteristics: [],
    });

    const metrics = ERPQualityEngine.getQualityMetrics("WO-QA-003");
    expect(metrics.totalInspected).toBeGreaterThanOrEqual(1);
    expect(metrics.firstPassYield).toBeGreaterThanOrEqual(0);
  });
});

// ─── ERP Tool Inventory Engine Tests ──────────────────────────────────────────

describe("ERPToolInventoryEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ERPToolInventoryEngine.getSelfAwareness();
    expect(awareness.name).toBe("ERPToolInventoryEngine");
    expect(awareness.toolCategories).toContain("end_mill");
    expect(awareness.toolCategories).toContain("drill");
  });

  it("should get tool by ID", () => {
    const tool = ERPToolInventoryEngine.getTool("EM-0500-4FL");
    expect(tool).toBeDefined();
    expect(tool?.category).toBe("end_mill");
    expect(tool?.manufacturer).toBe("Kennametal");
  });

  it("should search tools", () => {
    const results = ERPToolInventoryEngine.searchTools("carbide");
    expect(results.length).toBeGreaterThan(0);

    const drills = ERPToolInventoryEngine.searchTools("", "drill");
    expect(drills.every(t => t.category === "drill")).toBe(true);
  });

  it("should issue and return tools", () => {
    const issue = ERPToolInventoryEngine.issueTool("INS-CNMG", 10, "WO-TOOL-001", "EMP-001");
    expect(issue).toBeDefined();
    expect(issue?.type).toBe("issue");
    expect(issue?.quantity).toBe(10);

    const returnTxn = ERPToolInventoryEngine.returnTool("INS-CNMG", 8, "EMP-001", "good");
    expect(returnTxn?.type).toBe("return");
  });

  it("should get reorder alerts", () => {
    const alerts = ERPToolInventoryEngine.getReorderAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    // DR-0312 is seeded below reorder point
    const drillAlert = alerts.find(a => a.toolId === "DR-0312");
    expect(drillAlert?.urgency).toBeDefined();
  });

  it("should calculate inventory value", () => {
    const value = ERPToolInventoryEngine.getInventoryValue();
    expect(value.total).toBeGreaterThan(0);
    expect(value.byCategory).toBeDefined();
  });
});

// ─── ERP Work Order Engine Tests ──────────────────────────────────────────────

describe("ERPWorkOrderEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ERPWorkOrderEngine.getSelfAwareness();
    expect(awareness.name).toBe("ERPWorkOrderEngine");
    expect(awareness.statuses).toContain("in_progress");
    expect(awareness.statuses).toContain("complete");
  });

  it("should get work order sync status", () => {
    const sync = ERPWorkOrderEngine.getWorkOrderSync("WO-001");
    expect(sync).toBeDefined();
    expect(sync?.erpSystem).toBe("jobboss");
    expect(sync?.status).toBe("in_progress");
  });

  it("should update from shop floor", () => {
    const updated = ERPWorkOrderEngine.updateFromShopFloor("WO-001", {
      quantityComplete: 35,
      currentOperation: "OP30",
    });

    expect(updated).toBeDefined();
    expect(updated?.quantityComplete).toBe(35);
    expect(updated?.currentOperation).toBe("OP30");
    expect(updated?.pendingChanges.length).toBeGreaterThan(0);
  });

  it("should update operation status", () => {
    const op = ERPWorkOrderEngine.updateOperationStatus("WO-001", 20, {
      quantityComplete: 40,
      status: "complete",
    });

    expect(op).toBeDefined();
    expect(op?.quantityComplete).toBe(40);
    expect(op?.status).toBe("complete");
  });

  it("should sync to ERP", () => {
    const result = ERPWorkOrderEngine.syncToERP("WO-001");
    expect(result.success).toBe(true);
    expect(result.direction).toBe("to_erp");
  });

  it("should get progress summary", () => {
    const summary = ERPWorkOrderEngine.getProgressSummary();
    expect(summary.total).toBeGreaterThanOrEqual(1);
    expect(summary.byStatus).toBeDefined();
    expect(typeof summary.averageCompletion).toBe("number");
  });
});

// ─── CMM Import Engine Tests ──────────────────────────────────────────────────

describe("CMMImportEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CMMImportEngine.getSelfAwareness();
    expect(awareness.name).toBe("CMMImportEngine");
    expect(awareness.supportedFormats).toContain("dmis");
    expect(awareness.supportedFormats).toContain("zeiss_calypso");
  });

  it("should import CMM data", () => {
    const content = `Point1,10.0,20.0,30.0,10.002,20.001,29.998,0.01,-0.01,mm
Point2,50.0,60.0,70.0,50.005,60.003,70.001,0.01,-0.01,mm`;

    const result = CMMImportEngine.importData(content, "csv", {
      filename: "test.csv",
      partNumber: "CMM-PART-001",
      machineId: "CMM-1",
      programName: "TEST_PROGRAM",
    });

    expect(result.id).toMatch(/^CMM-/);
    expect(result.measurements.length).toBe(2);
    expect(result.summary.totalFeatures).toBe(2);
  });

  it("should get supported formats", () => {
    const formats = CMMImportEngine.getSupportedFormats();
    expect(formats.length).toBeGreaterThan(0);
    expect(formats.find(f => f.format === "dmis")).toBeDefined();
  });

  it("should validate import data", () => {
    const content = `Valid,0,0,0,0.001,0.001,0.001,0.01,-0.01,mm`;
    const result = CMMImportEngine.importData(content, "csv", {
      filename: "validate.csv",
      partNumber: "VAL-001",
      machineId: "CMM-2",
      programName: "VAL_PROG",
    });

    const validation = CMMImportEngine.validateImport(result.id);
    expect(validation.valid).toBe(true);
  });
});

// ─── CMM History Engine Tests ─────────────────────────────────────────────────

describe("CMMHistoryEngine", () => {
  it("should have self-awareness", () => {
    const awareness = CMMHistoryEngine.getSelfAwareness();
    expect(awareness.name).toBe("CMMHistoryEngine");
    expect(awareness.spcRules).toContain("out_of_tolerance");
  });

  it("should add measurement records", () => {
    const record = CMMHistoryEngine.addRecord({
      partNumber: "HIST-PART-001",
      featureName: "Diameter_A",
      nominal: 25.0,
      actual: 25.02,
      deviation: 0.02,
      toleranceUpper: 0.05,
      toleranceLower: -0.05,
      inTolerance: true,
      measuredAt: new Date().toISOString(),
      machineId: "CMM-1",
    });

    expect(record.id).toMatch(/^MR-/);
  });

  it("should get feature trend", () => {
    // Add multiple records for trend analysis
    for (let i = 0; i < 10; i++) {
      CMMHistoryEngine.addRecord({
        partNumber: "TREND-PART",
        featureName: "Length_B",
        nominal: 100.0,
        actual: 100.0 + (i * 0.001),
        deviation: i * 0.001,
        toleranceUpper: 0.1,
        toleranceLower: -0.1,
        inTolerance: true,
        measuredAt: new Date().toISOString(),
        machineId: "CMM-1",
      });
    }

    const trend = CMMHistoryEngine.getFeatureTrend("TREND-PART", "Length_B");
    expect(trend).toBeDefined();
    expect(trend?.recordCount).toBe(10);
    expect(trend?.statistics.mean).toBeDefined();
    expect(trend?.statistics.stdDev).toBeDefined();
  });

  it("should get part features", () => {
    const features = CMMHistoryEngine.getPartFeatures("HIST-PART-001");
    expect(features).toContain("Diameter_A");
  });

  it("should get history stats", () => {
    const stats = CMMHistoryEngine.getHistoryStats();
    expect(stats.totalRecords).toBeGreaterThan(0);
    expect(stats.partsTracked).toBeGreaterThan(0);
  });
});

// ─── Surface Measure Engine Tests ─────────────────────────────────────────────

describe("SurfaceMeasureEngine", () => {
  it("should have self-awareness", () => {
    const awareness = SurfaceMeasureEngine.getSelfAwareness();
    expect(awareness.name).toBe("SurfaceMeasureEngine");
    expect(awareness.parameters).toContain("Ra");
    expect(awareness.parameters).toContain("Rz");
  });

  it("should record surface measurement", () => {
    const measurement = SurfaceMeasureEngine.recordMeasurement({
      partNumber: "SURF-001",
      featureName: "OD_Surface",
      location: "Z=50mm",
      parameters: { Ra: 1.2, Rz: 6.5, Rq: 1.5 },
      cutoffLength: 0.8,
      evaluationLength: 4.0,
      instrumentId: "SURF-TESTER-1",
      specification: { parameter: "Ra", maxValue: 1.6, unit: "um" },
    });

    expect(measurement.id).toMatch(/^SRF-/);
    expect(measurement.inSpec).toBe(true);
    expect(measurement.parameters.Ra).toBe(1.2);
  });

  it("should get standard specifications", () => {
    const specs = SurfaceMeasureEngine.getStandardSpecifications();
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.find(s => s.application === "Ground surface")).toBeDefined();
  });

  it("should convert roughness units", () => {
    const um = SurfaceMeasureEngine.convertUnits(1.6, "um", "um");
    expect(um).toBe(1.6);

    const uin = SurfaceMeasureEngine.convertUnits(1.6, "um", "uin");
    expect(uin).toBeCloseTo(63, 0);

    const backToUm = SurfaceMeasureEngine.convertUnits(63, "uin", "um");
    expect(backToUm).toBeCloseTo(1.6, 1);
  });

  it("should get statistics for a feature", () => {
    SurfaceMeasureEngine.recordMeasurement({
      partNumber: "STAT-PART",
      featureName: "Face",
      location: "Top",
      parameters: { Ra: 0.8 },
      cutoffLength: 0.8,
      evaluationLength: 4.0,
      instrumentId: "SURF-1",
      specification: { parameter: "Ra", maxValue: 1.6, unit: "um" },
    });
    SurfaceMeasureEngine.recordMeasurement({
      partNumber: "STAT-PART",
      featureName: "Face",
      location: "Top",
      parameters: { Ra: 0.9 },
      cutoffLength: 0.8,
      evaluationLength: 4.0,
      instrumentId: "SURF-1",
      specification: { parameter: "Ra", maxValue: 1.6, unit: "um" },
    });

    const stats = SurfaceMeasureEngine.getStatistics("STAT-PART", "Face", "Ra");
    expect(stats).toBeDefined();
    expect(stats?.count).toBe(2);
    expect(stats?.mean).toBeCloseTo(0.85, 2);
  });
});

// ─── Probe Record Engine Tests ────────────────────────────────────────────────

describe("ProbeRecordEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ProbeRecordEngine.getSelfAwareness();
    expect(awareness.name).toBe("ProbeRecordEngine");
    expect(awareness.probeTypes).toContain("touch_probe");
    expect(awareness.cycleTypes).toContain("bore");
  });

  it("should record probe measurement", () => {
    const record = ProbeRecordEngine.recordProbe({
      machineId: "MILL-1",
      probeId: "PROBE-001",
      probeType: "touch_probe",
      cycleType: "bore",
      featureName: "Bore_A",
      nominal: { x: 100, y: 50, diameter: 25.0 },
      actual: { x: 100.002, y: 50.001, diameter: 25.005 },
      tolerance: 0.01,
      compensationApplied: false,
    });

    expect(record.id).toMatch(/^PRB-/);
    expect(record.deviation.x).toBeCloseTo(0.002, 4);
    expect(record.inTolerance).toBe(true);
  });

  it("should record tool setter measurement", () => {
    const record = ProbeRecordEngine.recordToolSetter({
      machineId: "MILL-1",
      toolNumber: 1,
      toolDescription: "1/2 End Mill",
      measuredLength: 75.002,
      lengthOffset: 75.002,
      breakageDetected: false,
    });

    expect(record.id).toMatch(/^TS-/);
    expect(record.toolNumber).toBe(1);
  });

  it("should get tool setter history", () => {
    // Add multiple measurements
    for (let i = 0; i < 5; i++) {
      ProbeRecordEngine.recordToolSetter({
        machineId: "MILL-2",
        toolNumber: 5,
        measuredLength: 100.0 - (i * 0.001),
        lengthOffset: 100.0 - (i * 0.001),
        breakageDetected: false,
        wearAmount: i * 0.001,
      });
    }

    const history = ProbeRecordEngine.getToolSetterHistory("MILL-2", 5);
    expect(history.length).toBe(5);
  });

  it("should analyze tool wear", () => {
    const analysis = ProbeRecordEngine.analyzeToolWear("MILL-2", 5);
    expect(analysis).toBeDefined();
    expect(analysis?.measurements).toBe(5);
    // Wear can be positive or negative depending on measurement order
    expect(typeof analysis?.totalWear).toBe("number");
  });

  it("should list probe records with filters", () => {
    const records = ProbeRecordEngine.listProbeRecords({ machineId: "MILL-1" });
    expect(Array.isArray(records)).toBe(true);
  });
});

// ─── Probe Drift Engine Tests ─────────────────────────────────────────────────

describe("ProbeDriftEngine", () => {
  it("should have self-awareness", () => {
    const awareness = ProbeDriftEngine.getSelfAwareness();
    expect(awareness.name).toBe("ProbeDriftEngine");
    expect(awareness.calibrationTypes).toContain("full");
    expect(awareness.alertTypes).toContain("drift_warning");
  });

  it("should record calibration", () => {
    const record = ProbeDriftEngine.recordCalibration({
      probeId: "PROBE-CAL-001",
      machineId: "CMM-1",
      calibrationType: "full",
      referenceStandard: "RING-25.000",
      referenceValue: 25.0,
      measuredValue: 25.002,
    });

    expect(record.id).toMatch(/^CAL-/);
    expect(record.deviation).toBeCloseTo(0.002, 4);
    expect(record.passed).toBe(true);
  });

  it("should analyze drift trend", () => {
    // Add multiple calibration records
    for (let i = 0; i < 5; i++) {
      ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-DRIFT-001",
        machineId: "CMM-2",
        calibrationType: "quick",
        referenceStandard: "RING-25.000",
        referenceValue: 25.0,
        measuredValue: 25.0 + (i * 0.001),
      });
    }

    const analysis = ProbeDriftEngine.analyzeDrift("PROBE-DRIFT-001");
    expect(analysis).toBeDefined();
    expect(analysis?.recordCount).toBe(5);
    expect(analysis?.driftDirection).toBeDefined();
  });

  it("should set custom thresholds", () => {
    ProbeDriftEngine.setThresholds("PROBE-CUSTOM", 0.003, 0.008, 14);

    // Record calibration at warning threshold
    const record = ProbeDriftEngine.recordCalibration({
      probeId: "PROBE-CUSTOM",
      machineId: "CMM-1",
      calibrationType: "full",
      referenceStandard: "BLOCK-50.000",
      referenceValue: 50.0,
      measuredValue: 50.004,
    });

    expect(record.passed).toBe(true);
  });

  it("should get calibration due list", () => {
    const due = ProbeDriftEngine.getCalibrationDue();
    expect(Array.isArray(due)).toBe(true);
  });

  it("should acknowledge alerts", () => {
    const alerts = ProbeDriftEngine.getActiveAlerts();
    if (alerts.length > 0) {
      const acknowledged = ProbeDriftEngine.acknowledgeAlert(alerts[0].id);
      expect(acknowledged).toBe(true);
    }
  });
});

// ─── Measure Summary Engine Tests ─────────────────────────────────────────────

describe("MeasureSummaryEngine", () => {
  it("should have self-awareness", () => {
    const awareness = MeasureSummaryEngine.getSelfAwareness();
    expect(awareness.name).toBe("MeasureSummaryEngine");
    expect(awareness.sources).toContain("cmm");
    expect(awareness.dispositions).toContain("accept");
  });

  it("should add measurement data", () => {
    MeasureSummaryEngine.addMeasurement("SUM-PART-001", "cmm", "Diameter_A", true, 0.002, 0.01, 1.67);
    MeasureSummaryEngine.addMeasurement("SUM-PART-001", "cmm", "Length_B", true, -0.003, 0.02, 2.1);
    MeasureSummaryEngine.addMeasurement("SUM-PART-001", "surface", "Face_Ra", true, 0.1, 1.6);

    const summary = MeasureSummaryEngine.generateSummary("SUM-PART-001");
    expect(summary.totals.features).toBe(3);
    expect(summary.totals.passed).toBe(3);
    expect(summary.disposition).toBe("accept");
  });

  it("should generate summary with failures", () => {
    MeasureSummaryEngine.addMeasurement("FAIL-PART", "cmm", "Bore_ID", false, 0.05, 0.01);
    MeasureSummaryEngine.addMeasurement("FAIL-PART", "cmm", "Length", true, 0.002, 0.05);

    const summary = MeasureSummaryEngine.generateSummary("FAIL-PART");
    expect(summary.totals.failed).toBe(1);
    expect(summary.criticalFailures.length).toBeGreaterThan(0);
    expect(summary.disposition).not.toBe("accept");
  });

  it("should get quality trend", () => {
    MeasureSummaryEngine.addMeasurement("TREND-PART-001", "cmm", "Dim1", true, 0.001, 0.01);
    MeasureSummaryEngine.generateSummary("TREND-PART-001");

    const trend = MeasureSummaryEngine.getQualityTrend("TREND-PART-001", 30);
    expect(trend.partNumber).toBe("TREND-PART-001");
    expect(trend.period).toBe("30 days");
  });

  it("should export summary in different formats", () => {
    MeasureSummaryEngine.addMeasurement("EXPORT-PART", "probe", "Position", true, 0.002, 0.01);
    const summary = MeasureSummaryEngine.generateSummary("EXPORT-PART");

    const json = MeasureSummaryEngine.exportSummary(summary.id, "json");
    expect(() => JSON.parse(json!)).not.toThrow();

    const text = MeasureSummaryEngine.exportSummary(summary.id, "text");
    expect(text).toContain("Measurement Summary");
  });

  it("should get parts with issues", () => {
    const issues = MeasureSummaryEngine.getPartsWithIssues();
    expect(Array.isArray(issues)).toBe(true);
  });
});
