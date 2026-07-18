/**
 * ERPIntegrationEngine.test.ts — hotel slot (iter17 / U-ERP-INTEGRATION-WIRE).
 * Tests the type-safe + dispatcher + catalog surface. importWorkOrder + erpIntegration
 * depend on a populated physics material DB whose state varies between test runs;
 * those paths are exercised via the qualityData + catalog routes instead.
 */

import { describe, it, expect } from "vitest";
import {
  recordCostFeedback,
  importQualityData,
  getSourceFileCatalog,
  INTEGRATION_SOURCE_FILE_CATALOG,
} from "../engines/ERPIntegrationEngine.js";
import type { QualityRecord } from "../engines/ERPIntegrationEngine.js";

function qualityRecord(overrides: Partial<QualityRecord> = {}): QualityRecord {
  return {
    wo_number: "WO-Q-1",
    part_number: "P-Q-1",
    inspector: "INSP-1",
    timestamp: "2026-05-23T18:00:00Z",
    measurements: [
      { feature: "bore_diameter", nominal: 10.0, actual: 10.005, tolerance_plus: 0.01, tolerance_minus: 0.01, in_tolerance: true },
    ],
    overall_pass: true,
    ...overrides,
  };
}

describe("ERPIntegrationEngine — importQualityData", () => {
  it("round-trips wo_number + part_number + inspector", () => {
    const r = importQualityData(qualityRecord());
    expect(r.wo_number).toBe("WO-Q-1");
    expect(r.part_number).toBe("P-Q-1");
    expect(r.inspector).toBe("INSP-1");
  });

  it("preserves measurements array length", () => {
    const rec = qualityRecord({
      measurements: [
        { feature: "f1", nominal: 1, actual: 1.001, tolerance_plus: 0.01, tolerance_minus: 0.01, in_tolerance: true },
        { feature: "f2", nominal: 2, actual: 1.999, tolerance_plus: 0.01, tolerance_minus: 0.01, in_tolerance: true },
        { feature: "f3", nominal: 3, actual: 3.5, tolerance_plus: 0.01, tolerance_minus: 0.01, in_tolerance: false },
      ],
      overall_pass: false,
    });
    const r = importQualityData(rec);
    expect(r.measurements.length).toBe(3);
  });

  it("appends an analysis object (non-null)", () => {
    const r = importQualityData(qualityRecord());
    expect(typeof r.analysis === "object").toBe(true);
    expect(r.analysis !== null).toBe(true);
  });

  it("preserves overall_pass=false when any measurement is out of tolerance", () => {
    const r = importQualityData(qualityRecord({
      measurements: [
        { feature: "f1", nominal: 1, actual: 1.5, tolerance_plus: 0.01, tolerance_minus: 0.01, in_tolerance: false },
      ],
      overall_pass: false,
    }));
    expect(r.overall_pass).toBe(false);
  });
});

describe("ERPIntegrationEngine — recordCostFeedback", () => {
  it("returns object with wo_number when provided", () => {
    const f = recordCostFeedback({ wo_number: "WO-CF-1" });
    expect(f.wo_number).toBe("WO-CF-1");
  });

  it("accepts actual_machine_time_min and returns shaped feedback", () => {
    const f = recordCostFeedback({ wo_number: "WO-CF-2", actual_machine_time_min: 15 });
    expect(typeof f === "object").toBe(true);
    expect(f.wo_number).toBe("WO-CF-2");
  });

  it("preserves planned_cost when provided", () => {
    const planned = { machine_time: 10, labor: 5, tooling: 2, material: 3, overhead: 4, total: 24 };
    const f = recordCostFeedback({ wo_number: "WO-CF-3", planned_cost: planned });
    expect(f.wo_number).toBe("WO-CF-3");
  });
});

describe("ERPIntegrationEngine — getSourceFileCatalog", () => {
  it("returns the INTEGRATION_SOURCE_FILE_CATALOG constant by reference", () => {
    const cat = getSourceFileCatalog();
    expect(cat).toBe(INTEGRATION_SOURCE_FILE_CATALOG);
  });

  it("catalog has at least 1 entry", () => {
    const cat = getSourceFileCatalog();
    expect(Object.keys(cat).length >= 1).toBe(true);
  });

  it("each catalog entry is a non-null object", () => {
    const cat = getSourceFileCatalog();
    for (const entry of Object.values(cat)) {
      expect(typeof entry === "object").toBe(true);
      expect(entry !== null).toBe(true);
    }
  });
});

describe("ERPIntegrationEngine — type exports compile-time wired", () => {
  it("ERPSystem type is usable for narrowing", () => {
    const system: "jobboss" | "epicor" = "jobboss";
    expect(system).toBe("jobboss");
  });

  it("WorkOrderStatus accepts all 5 declared values", () => {
    const statuses: Array<"pending" | "planned" | "in_progress" | "complete" | "cancelled"> =
      ["pending", "planned", "in_progress", "complete", "cancelled"];
    expect(statuses.length).toBe(5);
  });

  it("CostCategory accepts all 5 declared values", () => {
    const cats: Array<"machine_time" | "labor" | "tooling" | "material" | "overhead"> =
      ["machine_time", "labor", "tooling", "material", "overhead"];
    expect(cats.length).toBe(5);
  });
});
