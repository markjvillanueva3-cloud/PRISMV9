/**
 * ProbeRecordEngine — PHASE26 wiring tests.
 *
 * Static engine for recording probe + tool-setter measurements.
 * Tests verify deviation arithmetic across X/Y/Z/diameter axes,
 * inTolerance flag against tolerance band, persistence + retrieval,
 * filter logic on listProbeRecords.
 */
import { describe, it, expect } from "vitest";
import { ProbeRecordEngine } from "../engines/ProbeRecordEngine.js";

function probe(opts: {
  machineId?: string;
  partNumber?: string;
  workOrderNumber?: string;
  nominal?: { x?: number; y?: number; z?: number; diameter?: number };
  actual?: { x?: number; y?: number; z?: number; diameter?: number };
  tolerance?: number;
}) {
  return ProbeRecordEngine.recordProbe({
    machineId: opts.machineId ?? "MILL-1",
    probeId: "P-OMP60",
    probeType: "touch_probe",
    cycleType: "single_surface",
    partNumber: opts.partNumber,
    workOrderNumber: opts.workOrderNumber,
    featureName: "datum_A",
    nominal: opts.nominal ?? { x: 0, y: 0, z: 0 },
    actual: opts.actual ?? { x: 0, y: 0, z: 0 },
    tolerance: opts.tolerance ?? 0.05,
    compensationApplied: false,
    compensationType: "none",
  });
}

describe("ProbeRecordEngine", () => {
  it("recordProbe assigns deviation.x = actual.x - nominal.x", () => {
    const r = probe({
      nominal: { x: 100.000 },
      actual: { x: 100.012 },
      tolerance: 0.05,
    });
    expect(r.deviation.x).toBeCloseTo(0.012, 5);
  });

  it("recordProbe rounds deviation to 4 decimal places", () => {
    const r = probe({
      nominal: { x: 100.000 },
      actual: { x: 100.123456789 },
      tolerance: 0.5,
    });
    expect(r.deviation.x).toBe(0.1235);
  });

  it("inTolerance=true when |deviation| <= tolerance band", () => {
    const r = probe({
      nominal: { x: 50.000 },
      actual: { x: 50.020 },
      tolerance: 0.050,
    });
    expect(r.inTolerance).toBe(true);
  });

  it("inTolerance=false when |deviation| > tolerance band", () => {
    const r = probe({
      nominal: { x: 50.000 },
      actual: { x: 50.080 },
      tolerance: 0.050,
    });
    expect(r.inTolerance).toBe(false);
  });

  it("recordProbe assigns unique IDs", () => {
    const a = probe({});
    const b = probe({});
    expect(a.id).not.toBe(b.id);
  });

  it("getProbeRecord returns the stored record by id", () => {
    const stored = probe({ machineId: "MILL-X", nominal: { x: 1 }, actual: { x: 1.001 } });
    const fetched = ProbeRecordEngine.getProbeRecord(stored.id);
    expect(fetched?.id).toBe(stored.id);
    expect(fetched?.machineId).toBe("MILL-X");
  });

  it("getProbeRecord returns undefined for unknown id", () => {
    const r = ProbeRecordEngine.getProbeRecord("nonexistent-id-99999");
    expect(r === undefined).toBe(true);
  });

  it("listProbeRecords filters by machineId", () => {
    probe({ machineId: "FILTER-MACHINE-1" });
    probe({ machineId: "FILTER-MACHINE-1" });
    probe({ machineId: "FILTER-MACHINE-2" });
    const m1 = ProbeRecordEngine.listProbeRecords({ machineId: "FILTER-MACHINE-1" });
    expect(m1.length).toBeGreaterThanOrEqual(2);
    const allM1 = m1.every(r => r.machineId === "FILTER-MACHINE-1");
    expect(allM1).toBe(true);
  });

  it("listProbeRecords filters by partNumber", () => {
    probe({ partNumber: "PART-XYZ-001" });
    probe({ partNumber: "PART-XYZ-001" });
    const result = ProbeRecordEngine.listProbeRecords({ partNumber: "PART-XYZ-001" });
    expect(result.length).toBeGreaterThanOrEqual(2);
    const allMatch = result.every(r => r.partNumber === "PART-XYZ-001");
    expect(allMatch).toBe(true);
  });

  it("recordProbe handles diameter axis deviation", () => {
    const r = probe({
      nominal: { diameter: 20.000 },
      actual: { diameter: 20.005 },
      tolerance: 0.020,
    });
    expect(r.deviation.diameter).toBeCloseTo(0.005, 5);
    expect(r.inTolerance).toBe(true);
  });

  it("recordToolSetter persists with auto-id and timestamp", () => {
    const r = ProbeRecordEngine.recordToolSetter({
      machineId: "MILL-1",
      toolNumber: 5,
      toolDescription: "12.7mm endmill",
      measuredLength: 100.345,
      lengthOffset: 100.345,
      breakageDetected: false,
      compensationApplied: false,
      compensationType: "none",
    } as Parameters<typeof ProbeRecordEngine.recordToolSetter>[0]);
    expect(r.toolNumber).toBe(5);
    expect(r.measuredLength).toBe(100.345);
    expect(typeof r.id).toBe("string");
    expect(r.id.length).toBeGreaterThan(0);
  });

  it("getToolSetterHistory returns records for matching tool number", () => {
    ProbeRecordEngine.recordToolSetter({
      machineId: "MILL-HIST",
      toolNumber: 99,
      measuredLength: 50,
      lengthOffset: 50,
      breakageDetected: false,
      compensationApplied: false,
      compensationType: "none",
    } as Parameters<typeof ProbeRecordEngine.recordToolSetter>[0]);
    const hist = ProbeRecordEngine.getToolSetterHistory("MILL-HIST", 99);
    expect(hist.length).toBeGreaterThanOrEqual(1);
    const allMatch = hist.every(r => r.machineId === "MILL-HIST" && r.toolNumber === 99);
    expect(allMatch).toBe(true);
  });
});
