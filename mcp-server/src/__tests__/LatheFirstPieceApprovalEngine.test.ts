import { describe, it, expect } from "vitest";
import { latheFirstPieceApprovalEngine } from "../engines/LatheFirstPieceApprovalEngine.js";

const BASE = {
  job_id: "JOB-001",
  part_number: "PN-1001",
  operator: "Alice",
  inspector: "Bob",
  readings: [
    { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.01 },
    { feature: "LEN", nominal_mm: 50, upper_tol_mm: 0.1, lower_tol_mm: -0.1, measured_mm: 50.00 },
  ],
};

describe("LatheFirstPieceApprovalEngine", () => {
  it("approves when all readings are in-spec and centered", () => {
    const r = latheFirstPieceApprovalEngine.evaluate(BASE);
    expect(r.verdict).toBe("approved");
  });

  it("rejects when any reading is out of tolerance", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.1 },
      ],
    });
    expect(r.verdict).toBe("rejected");
    expect(r.hold_code).toBe("HOLD-FPA-FAIL");
  });

  it("conditionally_approved when reading in warning band", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.048 },
      ],
    });
    expect(r.verdict).toBe("conditionally_approved");
  });

  it("counts pass/warn/fail correctly", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.00 },
        { feature: "LEN", nominal_mm: 50, upper_tol_mm: 0.1, lower_tol_mm: -0.1, measured_mm: 50.095 },
        { feature: "BAD", nominal_mm: 10, upper_tol_mm: 0.02, lower_tol_mm: -0.02, measured_mm: 10.05 },
      ],
    });
    expect(r.num_pass).toBe(1);
    expect(r.num_warn).toBe(1);
    expect(r.num_fail).toBe(1);
  });

  it("per-feature includes deviation_mm", () => {
    const r = latheFirstPieceApprovalEngine.evaluate(BASE);
    expect(r.per_feature[0].deviation_mm).toBeCloseTo(0.01, 4);
  });

  it("instrument uncertainty widens tolerance window", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.055 },
      ],
      instrument_uncertainty_mm: 0.01,
    });
    expect(r.verdict).not.toBe("rejected");
  });

  it("warning_band_fraction=0 never flags warning", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.05, lower_tol_mm: -0.05, measured_mm: 20.045 },
      ],
      warning_band_fraction: 0,
    });
    expect(r.num_warn).toBe(0);
  });

  it("timestamp is ISO 8601", () => {
    const r = latheFirstPieceApprovalEngine.evaluate(BASE);
    expect(r.timestamp).toMatch(/T.*Z/);
  });

  it("carries job_id through", () => {
    const r = latheFirstPieceApprovalEngine.evaluate(BASE);
    expect(r.job_id).toBe("JOB-001");
  });

  it("single-sided tolerance (MMC only)", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "OD1", nominal_mm: 20, upper_tol_mm: 0.1, lower_tol_mm: 0, measured_mm: 20.05 },
      ],
    });
    expect(r.per_feature[0].within_tolerance).toBe(true);
  });

  it("reasoning summarizes verdict", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({
      ...BASE,
      readings: [
        { feature: "X", nominal_mm: 10, upper_tol_mm: 0.01, lower_tol_mm: -0.01, measured_mm: 10.5 },
      ],
    });
    expect(r.reasoning.some((s) => /rejected/i.test(s))).toBe(true);
  });

  it("empty readings → approved (degenerate)", () => {
    const r = latheFirstPieceApprovalEngine.evaluate({ ...BASE, readings: [] });
    expect(r.verdict).toBe("approved");
  });

  it("getStats exposes defaults", () => {
    const s = latheFirstPieceApprovalEngine.getStats();
    expect(s.default_warning_band_fraction).toBeGreaterThan(0);
  });
});
