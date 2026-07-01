import { describe, it, expect } from "vitest";
import {
  partVariabilityRegressionHarnessEngine as harness,
  PartVariabilityRegressionHarnessEngine,
  type HarnessInput,
  type GeneratedProgramSummary,
} from "../engines/PartVariabilityRegressionHarnessEngine.js";

function nominalProgram(overrides: Partial<GeneratedProgramSummary> = {}): GeneratedProgramSummary {
  return {
    domain: "mill",
    part_class: "mill:prismatic",
    fixture_id: "jmdie-fix-001",
    predicted_cost_usd: 90,
    tolerance_violations: 0,
    cmm_projected_uncertainty_um: 15,
    sx_safety_score: 0.97,
    has_collision: false,
    midcut_verdict: "continue",
    ae_verdict: "fresh",
    predicted_cycle_s: 600,
    closed_loop_verdict: "in_control",
    ...overrides,
  };
}

describe("PartVariabilityRegressionHarnessEngine", () => {
  it("exports a singleton with assert() method", () => {
    expect(harness).toBeInstanceOf(PartVariabilityRegressionHarnessEngine);
    expect(typeof harness.assert).toBe("function");
  });

  it("throws on null input", () => {
    expect(() => harness.assert(null as unknown as HarnessInput)).toThrow(/program \+ bounds/);
  });

  it("PASSES when program meets all 5 acceptance axes (cost=90 ≤ 110, viol=0, S(x)=0.97 ≥ 0.95, cycle=600±180, in_control)", () => {
    const r = harness.assert({ program: nominalProgram(), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r.pass).toBe(true);
    expect(r.failed_axes).toBe(0);
    expect(r.total_axes).toBe(5);
    expect(r.confidence.value).toBe(1);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/All 5 acceptance axes PASSED/);
  });

  it("FAILS cost axis at predicted=200 vs budget=100 (cap=110)", () => {
    const r = harness.assert({ program: nominalProgram({ predicted_cost_usd: 200 }), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r.pass).toBe(false);
    const cost = r.axes.find(a => a.axis === "cost");
    expect(cost?.pass).toBe(false);
    expect(cost?.observed).toBe(200);
    expect(cost?.remediation).toMatch(/Reduce|cheaper|re-quote/);
  });

  it("FAILS accuracy axis on 2 tolerance violations (limit 0)", () => {
    const r = harness.assert({
      program: nominalProgram({ tolerance_violations: 2 }),
      bounds: { budget_usd: 100, cycle_time_s: 600 },
    });
    expect(r.pass).toBe(false);
    const acc = r.axes.find(a => a.axis === "accuracy");
    expect(acc?.pass).toBe(false);
    expect(String(acc?.observed)).toMatch(/viol=2/);
  });

  it("FAILS accuracy axis on CMM uncertainty 50μm vs budget 25μm", () => {
    const r = harness.assert({
      program: nominalProgram({ cmm_projected_uncertainty_um: 50 }),
      bounds: { budget_usd: 100, cycle_time_s: 600, cmm_uncertainty_budget_um: 25 },
    });
    expect(r.axes.find(a => a.axis === "accuracy")?.pass).toBe(false);
  });

  it("FAILS safety axis on collision OR S(x) below floor OR midcut abort OR AE breakage", () => {
    const r1 = harness.assert({ program: nominalProgram({ has_collision: true }), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r1.axes.find(a => a.axis === "safety")?.pass).toBe(false);
    const r2 = harness.assert({ program: nominalProgram({ sx_safety_score: 0.5 }), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r2.axes.find(a => a.axis === "safety")?.pass).toBe(false);
    const r3 = harness.assert({ program: nominalProgram({ midcut_verdict: "abort" }), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r3.axes.find(a => a.axis === "safety")?.pass).toBe(false);
    const r4 = harness.assert({ program: nominalProgram({ ae_verdict: "breakage" }), bounds: { budget_usd: 100, cycle_time_s: 600 } });
    expect(r4.axes.find(a => a.axis === "safety")?.pass).toBe(false);
  });

  it("FAILS cycle_time at predicted=900 vs band [510, 690] (600±3·30)", () => {
    const r = harness.assert({
      program: nominalProgram({ predicted_cycle_s: 900 }),
      bounds: { budget_usd: 100, cycle_time_s: 600, cycle_time_sigma_s: 30 },
    });
    const ct = r.axes.find(a => a.axis === "cycle_time");
    expect(ct?.pass).toBe(false);
    expect(ct?.observed).toBe(900);
  });

  it("FAILS closed_loop on 'drifted' when require_closed_loop_in_control=true (default)", () => {
    const r = harness.assert({
      program: nominalProgram({ closed_loop_verdict: "drifted" }),
      bounds: { budget_usd: 100, cycle_time_s: 600 },
    });
    const cl = r.axes.find(a => a.axis === "closed_loop");
    expect(cl?.pass).toBe(false);
    expect(cl?.observed).toBe("drifted");
    expect(cl?.expected).toBe("in_control");
  });

  it("PASSES closed_loop on 'drifted' when require_closed_loop_in_control=false", () => {
    const r = harness.assert({
      program: nominalProgram({ closed_loop_verdict: "drifted" }),
      bounds: { budget_usd: 100, cycle_time_s: 600, require_closed_loop_in_control: false },
    });
    expect(r.axes.find(a => a.axis === "closed_loop")?.pass).toBe(true);
  });

  it("every failed axis has a non-empty source + remediation hint", () => {
    const r = harness.assert({
      program: nominalProgram({ predicted_cost_usd: 999, tolerance_violations: 5, has_collision: true, predicted_cycle_s: 99999, closed_loop_verdict: "abort" }),
      bounds: { budget_usd: 100, cycle_time_s: 600 },
    });
    expect(r.pass).toBe(false);
    expect(r.failed_axes).toBe(5);
    for (const a of r.axes) {
      expect(a.source.length).toBeGreaterThan(3);
      if (!a.pass) {
        expect(typeof a.remediation).toBe("string");
        expect((a.remediation ?? "").length).toBeGreaterThan(5);
      }
    }
    expect(r.confidence.value).toBe(0);
  });

  it("confidence equals exactly (passed_axes / total_axes) = 4/5 = 0.8 when 1 axis fails", () => {
    const r = harness.assert({
      program: nominalProgram({ predicted_cost_usd: 999 }),
      bounds: { budget_usd: 100, cycle_time_s: 600 },
    });
    expect(r.failed_axes).toBe(1);
    expect(r.confidence.value).toBe(0.8);
    expect(r.confidence.unit).toBe("ratio");
  });
});
