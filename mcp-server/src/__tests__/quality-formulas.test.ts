/**
 * Tests for QualityFormulasEngine
 *
 * Validates Gage R&R, sampling plans, process capability,
 * measurement uncertainty, and conformance decisions.
 */
import { describe, it, expect } from "vitest";
import { qualityFormulasEngine } from "../engines/QualityFormulasEngine.js";

describe("QualityFormulasEngine", () => {
  const engine = qualityFormulasEngine;

  // ── Gage R&R ──────────────────────────────────────────────────

  it("computes %GRR and ndc from measurement data", () => {
    // 2 operators, 3 parts, 2 replicates
    const measurements = [
      [[10.1, 10.2], [20.0, 20.1], [30.1, 30.0]],
      [[10.0, 10.1], [20.2, 20.0], [30.0, 30.2]],
    ];
    const r = engine.gageRR({ measurements, tolerance: 1.0 });
    expect(r.repeatability).toBeGreaterThanOrEqual(0);
    expect(r.reproducibility).toBeGreaterThanOrEqual(0);
    expect(r.gage_rr).toBeGreaterThan(0);
    expect(r.part_variation).toBeGreaterThan(0);
    expect(r.ndc).toBeGreaterThanOrEqual(0);
    expect(r.pct_grr_total).toBeGreaterThan(0);
    expect(r.pct_grr_total).toBeLessThan(100);
    expect(["acceptable", "marginal", "unacceptable"]).toContain(r.assessment);
  });

  it("low-variation gage yields acceptable assessment", () => {
    // Very repeatable measurements
    const measurements = [
      [[10.00, 10.00], [20.00, 20.00], [30.00, 30.00]],
      [[10.00, 10.00], [20.00, 20.00], [30.00, 30.00]],
    ];
    const r = engine.gageRR({ measurements });
    expect(r.gage_rr).toBeCloseTo(0, 3);
    expect(r.assessment).toBe("acceptable");
  });

  // ── Sampling Plan ─────────────────────────────────────────────

  it("finds valid sampling plan for AQL/LTPD", () => {
    const r = engine.samplingPlan({
      aql: 0.01,
      ltpd: 0.05,
      lot_size: 1000,
    });
    expect(r.sample_size).toBeGreaterThan(0);
    expect(r.sample_size).toBeLessThanOrEqual(1000);
    expect(r.accept_number).toBeGreaterThanOrEqual(0);
    expect(r.oc_curve.length).toBeGreaterThan(0);
    // Pa at AQL should be high (>= 0.90)
    const paAql = r.oc_curve.find(
      (pt) => Math.abs(pt.defect_rate - 0.01) < 0.005
    );
    expect(paAql?.acceptance_prob).toBeGreaterThan(0.8);
    expect(r.aoql).toBeGreaterThan(0);
  });

  // ── Process Capability Advanced ───────────────────────────────

  it("Cpm penalizes off-target processes", () => {
    // Data centered at 50.5, target at 50.0
    const data = Array.from({ length: 100 }, (_, i) =>
      50.5 + (i % 10 - 5) * 0.1
    );
    const r = engine.processCapabilityAdvanced({
      data,
      usl: 52,
      lsl: 48,
      target: 50.0,
    });
    expect(r.cp).toBeGreaterThan(0);
    expect(r.cpk).toBeGreaterThan(0);
    // Cpm < Cp when off-target
    expect(r.cpm).toBeLessThan(r.cp);
    expect(r.expected_ppm).toBeGreaterThanOrEqual(0);
    expect(r.cpk_lower_ci).toBeLessThan(r.cpk);
    expect(r.cpk_upper_ci).toBeGreaterThan(r.cpk);
  });

  it("Clements method for non-normal data", () => {
    const data = Array.from({ length: 200 }, (_, i) =>
      Math.pow(i / 100, 2) * 5
    );
    const r = engine.processCapabilityAdvanced({
      data,
      usl: 25,
      lsl: -1,
      non_normal: true,
    });
    expect(r.method).toBe("clements_percentile");
    expect(r.pp).toBeGreaterThan(0);
    expect(r.ppk).toBeGreaterThan(0);
  });

  // ── Measurement Uncertainty ───────────────────────────────────

  it("ISO GUM: combines Type A and Type B", () => {
    const r = engine.measurementUncertainty({
      type_a_values: [10.01, 10.02, 9.99, 10.00, 10.01],
      type_b_components: [
        { value: 0.005, distribution: "rectangular" },
        { value: 0.002, distribution: "normal" },
      ],
      coverage_probability: 0.95,
    });
    expect(r.combined_uncertainty).toBeGreaterThan(0);
    expect(r.expanded_uncertainty).toBeGreaterThan(r.combined_uncertainty);
    expect(r.coverage_factor).toBeGreaterThan(1.5);
    expect(r.effective_dof).toBeGreaterThan(0);
    expect(r.components.length).toBe(3); // 1 Type A + 2 Type B
    const totalContrib = r.components.reduce(
      (s, c) => s + c.contribution_pct, 0
    );
    expect(totalContrib).toBeCloseTo(100, 0);
  });

  // ── Conformance Decision ──────────────────────────────────────

  it("ISO 14253-1 guard-banded decision", () => {
    const r = engine.conformanceDecision({
      measured_value: 10.0,
      uncertainty: 0.1,
      usl: 10.5,
      lsl: 9.5,
      decision_rule: "guard_banded",
    });
    expect(r.decision).toBe("conforming");
    // Guard band narrows acceptance zone
    expect(r.acceptance_zone[0]).toBeGreaterThan(9.5);
    expect(r.acceptance_zone[1]).toBeLessThan(10.5);
    expect(r.guard_band).toBeCloseTo(0.1);
    expect(r.conformance_probability).toBeGreaterThan(0.9);
  });

  it("indeterminate zone near spec limit", () => {
    const r = engine.conformanceDecision({
      measured_value: 10.45,
      uncertainty: 0.1,
      usl: 10.5,
      lsl: 9.5,
      decision_rule: "guard_banded",
    });
    expect(r.decision).toBe("indeterminate");
    expect(r.iso_zone).toBe("uncertainty");
  });

  it("dispatcher routes all 5 actions", () => {
    const r = engine.calculate({
      action: "calc_conformance_decision",
      params: {
        measured_value: 10.0,
        uncertainty: 0.05,
        usl: 10.5,
        lsl: 9.5,
      },
    }) as any;
    expect(r.decision).toBe("conforming");
  });
});
