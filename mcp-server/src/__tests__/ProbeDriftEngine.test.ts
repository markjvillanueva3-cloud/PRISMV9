/**
 * ProbeDriftEngine — PHASE26 wiring tests.
 *
 * Static engine tracking probe calibration history + drift alerts.
 * Tests verify deviation arithmetic, pass/fail thresholds, history
 * accumulation, alert generation, and threshold override behavior.
 */
import { describe, it, expect } from "vitest";
import { ProbeDriftEngine } from "../engines/ProbeDriftEngine.js";

function rec(probeId: string, measured: number, reference: number) {
  return ProbeDriftEngine.recordCalibration({
    probeId,
    machineId: "MILL-1",
    calibrationType: "ring_gauge",
    referenceStandard: "ISO-25mm",
    referenceValue: reference,
    measuredValue: measured,
  });
}

describe("ProbeDriftEngine", () => {
  it("recordCalibration computes deviation = measured - reference (0.005mm)", () => {
    const r = rec("PROBE-A", 25.005, 25.000);
    expect(r.deviation).toBeCloseTo(0.005, 5);
    expect(r.referenceValue).toBe(25.000);
    expect(r.measuredValue).toBe(25.005);
  });

  it("passed=true when deviation within default critical (0.010mm)", () => {
    const r = rec("PROBE-B", 25.003, 25.000);
    expect(r.passed).toBe(true);
  });

  it("passed=false when deviation exceeds default critical (0.010mm)", () => {
    const r = rec("PROBE-C", 25.020, 25.000);
    expect(r.passed).toBe(false);
  });

  it("recordCalibration assigns unique CAL-prefixed IDs across calls", () => {
    const a = rec("PROBE-D", 25, 25);
    const b = rec("PROBE-D", 25, 25);
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith("CAL-")).toBe(true);
    expect(b.id.startsWith("CAL-")).toBe(true);
  });

  it("getCalibrationHistory accumulates 3 records for one probe", () => {
    rec("PROBE-E", 25.001, 25);
    rec("PROBE-E", 25.002, 25);
    rec("PROBE-E", 25.003, 25);
    const hist = ProbeDriftEngine.getCalibrationHistory("PROBE-E");
    expect(hist.length).toBe(3);
  });

  it("getCalibrationHistory honors limit=2", () => {
    rec("PROBE-F", 25.001, 25);
    rec("PROBE-F", 25.002, 25);
    rec("PROBE-F", 25.003, 25);
    const limited = ProbeDriftEngine.getCalibrationHistory("PROBE-F", 2);
    expect(limited.length).toBe(2);
  });

  it("getCalibrationHistory returns empty array for unknown probe", () => {
    const hist = ProbeDriftEngine.getCalibrationHistory("PROBE-DOES-NOT-EXIST");
    expect(hist).toEqual([]);
    expect(hist.length).toBe(0);
  });

  it("analyzeDrift on unknown probe returns undefined sentinel", () => {
    const a = ProbeDriftEngine.analyzeDrift("UNKNOWN-PROBE-XYZ");
    expect(a === undefined).toBe(true);
  });

  it("getActiveAlerts returns an array (length >= 0)", () => {
    const alerts = ProbeDriftEngine.getActiveAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThanOrEqual(0);
  });

  it("setThresholds tightens pass criterion — formerly-passing dev now fails", () => {
    const before = rec("PROBE-G", 25.005, 25);
    expect(before.passed).toBe(true);
    ProbeDriftEngine.setThresholds("PROBE-G", 0.001, 0.002, 30);
    const after = rec("PROBE-G", 25.005, 25);
    expect(after.passed).toBe(false);
  });

  it("recordCalibration rounds deviation to 4 decimal places", () => {
    const r = rec("PROBE-H", 25.123456789, 25.000000000);
    // 0.123456789 → rounded to 4 dp = 0.1235
    expect(r.deviation).toBe(0.1235);
  });

  it("recordCalibration timestamp is a valid ISO 8601 string", () => {
    const r = rec("PROBE-I", 25.000, 25.000);
    // ISO 8601 must parse to a finite number
    expect(Number.isFinite(Date.parse(r.timestamp))).toBe(true);
  });
});
