import { describe, it, expect } from "vitest";
import {
  millFirstPieceApprovalEngine as eng,
  MillFirstPieceApprovalEngine,
  type MillFirstPieceApprovalInput,
  type MillFirstPieceReading,
} from "../engines/MillFirstPieceApprovalEngine.js";

function reading(o: Partial<MillFirstPieceReading> = {}): MillFirstPieceReading {
  return {
    feature: "hole_1",
    feature_category: "hole_diameter",
    nominal_mm: 10.0,
    upper_tol_mm: 0.05,
    lower_tol_mm: 0.05,
    measured_mm: 10.0,
    ...o,
  };
}

function nominal(o: Partial<MillFirstPieceApprovalInput> = {}): MillFirstPieceApprovalInput {
  return {
    job_id: "JOB-001",
    part_number: "PN-12345",
    operator: "Tomas",
    inspector: "James",
    readings: [reading()],
    ...o,
  };
}

describe("MillFirstPieceApprovalEngine", () => {
  it("exports singleton with approve()", () => {
    expect(eng).toBeInstanceOf(MillFirstPieceApprovalEngine);
    expect(typeof eng.approve).toBe("function");
  });

  it("throws on missing required header fields", () => {
    expect(() => eng.approve({ readings: [reading()] } as MillFirstPieceApprovalInput))
      .toThrow(/job_id \+ part_number \+ operator \+ inspector required/);
  });

  it("throws on empty readings array", () => {
    expect(() => eng.approve(nominal({ readings: [] })))
      .toThrow(/readings\[\] required.*non-empty/);
  });

  it("throws on warning_band_fraction out of [0,1]", () => {
    expect(() => eng.approve(nominal({ warning_band_fraction: -0.1 })))
      .toThrow(/warning_band_fraction must be in/);
    expect(() => eng.approve(nominal({ warning_band_fraction: 1.5 })))
      .toThrow(/warning_band_fraction must be in/);
  });

  it("throws on negative instrument_uncertainty", () => {
    expect(() => eng.approve(nominal({ instrument_uncertainty_mm: -0.01 })))
      .toThrow(/instrument_uncertainty_mm must be/);
  });

  it("throws on reading missing required fields", () => {
    expect(() => eng.approve(nominal({
      readings: [{ feature: "x" } as MillFirstPieceReading],
    }))).toThrow(/missing required fields/);
  });

  it("throws on negative tolerance values", () => {
    expect(() => eng.approve(nominal({
      readings: [reading({ upper_tol_mm: -0.01 })],
    }))).toThrow(/tolerances must be non-negative/);
  });

  it("dead-center measurement → approved", () => {
    const r = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.0, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    expect(r.overall_verdict).toBe("approved");
    expect(r.failed_count).toBe(0);
    expect(r.warning_count).toBe(0);
    expect(r.hold_code).toBeNull();
  });

  it("measurement at exactly upper limit → approved (boundary inclusive)", () => {
    const r = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.05, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    expect(r.overall_verdict).toMatch(/approved|warning_pass/);
    expect(r.failed_count).toBe(0);
  });

  it("measurement above upper limit → failed with hold code", () => {
    const r = eng.approve(nominal({
      job_id: "FAIL-001",
      readings: [reading({ measured_mm: 10.10, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    expect(r.overall_verdict).toBe("failed");
    expect(r.failed_count).toBe(1);
    expect(r.hold_code).toMatch(/MILL-FPF-FAIL-001-1fail/);
    expect(r.warnings.some(w => /FAILED|OVER upper limit/.test(w))).toBe(true);
  });

  it("measurement below lower limit → failed", () => {
    const r = eng.approve(nominal({
      readings: [reading({ measured_mm: 9.90, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    expect(r.overall_verdict).toBe("failed");
    expect(r.warnings.some(w => /UNDER lower limit/.test(w))).toBe(true);
  });

  it("measurement within warning band → warning_pass not approved", () => {
    // tol=±0.10, default warn band 20% → warn margin = 0.20*0.20=0.04
    // measure 10.07 is 0.03 inside upper-limit 10.10 → within 0.04 warn margin
    const r = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.07, upper_tol_mm: 0.10, lower_tol_mm: 0.10 })],
    }));
    expect(r.overall_verdict).toBe("warning_pass");
    expect(r.warning_count).toBe(1);
    expect(r.failed_count).toBe(0);
  });

  it("instrument uncertainty shrinks effective tol band per ISO 14253-1", () => {
    // With 0.02 mm uncertainty, effective upper-limit drops 0.02 mm
    const rWithUnc = eng.approve(nominal({
      instrument_uncertainty_mm: 0.02,
      readings: [reading({ measured_mm: 10.04, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    const rNoUnc = eng.approve(nominal({
      instrument_uncertainty_mm: 0,
      readings: [reading({ measured_mm: 10.04, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    // Without uncertainty: 10.04 in [9.95, 10.05] → approved (within warn 0.01 < 0.02 → maybe warning)
    // With uncertainty: 10.04 in [9.97, 10.03] → 10.04 > 10.03 → FAILED
    expect(rNoUnc.failed_count).toBe(0);
    expect(rWithUnc.failed_count).toBe(1);
  });

  it("multiple features mixed pass/fail → overall failed", () => {
    const r = eng.approve(nominal({
      readings: [
        reading({ feature: "h1", measured_mm: 10.00 }),
        reading({ feature: "h2", measured_mm: 10.20 }),  // OUT
        reading({ feature: "h3", measured_mm: 10.01 }),
      ],
    }));
    expect(r.overall_verdict).toBe("failed");
    expect(r.failed_count).toBe(1);
    expect(r.per_feature).toHaveLength(3);
    expect(r.per_feature[1].within_tolerance).toBe(false);
    expect(r.per_feature[0].within_tolerance).toBe(true);
    expect(r.per_feature[2].within_tolerance).toBe(true);
  });

  it("each Mill-specific feature category receives a non-empty guidance string", () => {
    const categories: MillFirstPieceReading["feature_category"][] = [
      "length", "hole_diameter", "hole_position", "bolt_circle_radius",
      "slot_width", "slot_depth", "pocket_depth",
      "squareness", "parallelism", "flatness", "profile_contour", "thread_pitch",
    ];
    const r = eng.approve(nominal({
      readings: categories.map((cat, i) => reading({
        feature: `f${i}`,
        feature_category: cat,
        measured_mm: 10.0,
      })),
    }));
    expect(r.per_feature).toHaveLength(categories.length);
    r.per_feature.forEach((f, i) => {
      expect(f.feature_category).toBe(categories[i]);
      expect(typeof f.guidance).toBe("string");
      expect(f.guidance.length).toBeGreaterThan(20);
    });
  });

  it("squareness category surfaces fixture-squareness guidance", () => {
    const r = eng.approve(nominal({
      readings: [reading({
        feature: "side_face",
        feature_category: "squareness",
        nominal_mm: 0,
        upper_tol_mm: 0.05,
        lower_tol_mm: 0.05,
        measured_mm: 0.02,
      })],
    }));
    expect(r.per_feature[0].guidance).toMatch(/Squareness|perpendicularity|vise|fixture squareness/);
  });

  it("pocket_depth category surfaces Z work-offset guidance", () => {
    const r = eng.approve(nominal({
      readings: [reading({
        feature: "pocket_1",
        feature_category: "pocket_depth",
        nominal_mm: 15.0,
        measured_mm: 15.0,
      })],
    }));
    expect(r.per_feature[0].guidance).toMatch(/pocket depth|Z work-offset|spindle thermal/);
  });

  it("bolt_circle_radius category surfaces PCD guidance", () => {
    const r = eng.approve(nominal({
      readings: [reading({
        feature: "bc_1",
        feature_category: "bolt_circle_radius",
        nominal_mm: 50.0,
        measured_mm: 50.0,
      })],
    }));
    expect(r.per_feature[0].guidance).toMatch(/Bolt-circle|PCD|off-center/i);
  });

  it("deviation_mm correctly captures signed difference (measured - nominal)", () => {
    const r = eng.approve(nominal({
      readings: [
        reading({ feature: "over", measured_mm: 10.03 }),
        reading({ feature: "under", measured_mm: 9.97 }),
      ],
    }));
    expect(r.per_feature[0].deviation_mm).toBeCloseTo(0.03, 5);
    expect(r.per_feature[1].deviation_mm).toBeCloseTo(-0.03, 5);
  });

  it("verdict warning_pass triggers no hold_code", () => {
    const r = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.045, upper_tol_mm: 0.05, lower_tol_mm: 0.05 })],
    }));
    expect(r.overall_verdict).toBe("warning_pass");
    expect(r.hold_code).toBeNull();
  });

  it("approval_timestamp is ISO 8601 string", () => {
    const r = eng.approve(nominal());
    expect(typeof r.approval_timestamp).toBe("string");
    expect(r.approval_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(r.approval_timestamp).toISOString()).not.toThrow();
  });

  it("source cites AIAG PPAP + ISO 14253-1 + ISO 9001 + Machinery's Handbook", () => {
    const r = eng.approve(nominal());
    expect(r.source).toMatch(/AIAG PPAP.*ISO 14253-1.*ISO 9001.*Machinery's Handbook/s);
  });

  it("uncertainty_envelope_mm carried through to each feature result", () => {
    const r = eng.approve(nominal({
      instrument_uncertainty_mm: 0.015,
      readings: [reading({ measured_mm: 10.0 })],
    }));
    expect(r.per_feature[0].uncertainty_envelope_mm).toBe(0.015);
  });

  it("warning_near_limit reflects warning band correctly", () => {
    const r = eng.approve(nominal({
      readings: [
        reading({ feature: "dead_center", measured_mm: 10.00 }),  // not near limit
        reading({ feature: "near_upper", measured_mm: 10.048, upper_tol_mm: 0.05, lower_tol_mm: 0.05 }),  // near upper
      ],
    }));
    expect(r.per_feature[0].warning_near_limit).toBe(false);
    expect(r.per_feature[1].warning_near_limit).toBe(true);
  });

  it("operator + inspector + job_id carry through result", () => {
    const r = eng.approve(nominal({ operator: "Sandvik-Op-12", inspector: "JM-QC-3", job_id: "WO-AERO-2024-99" }));
    expect(r.operator).toBe("Sandvik-Op-12");
    expect(r.inspector).toBe("JM-QC-3");
    expect(r.job_id).toBe("WO-AERO-2024-99");
  });

  it("custom warning_band_fraction=0.5 makes warning more sensitive", () => {
    // measured 10.03 with tol ±0.05 — default 20% band ⇒ warn margin 0.02 ⇒ 10.03 NOT in warn band
    // tighter 50% band ⇒ warn margin 0.05 ⇒ 10.03 IS in warn band (close to upper 10.05)
    const rDefault = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.03 })],
    }));
    const rTight = eng.approve(nominal({
      warning_band_fraction: 0.5,
      readings: [reading({ measured_mm: 10.03 })],
    }));
    expect(rDefault.warning_count).toBe(0);
    expect(rTight.warning_count).toBe(1);
  });

  it("failed_count + warning_count + approved are mutually exhaustive over readings", () => {
    const r = eng.approve(nominal({
      readings: [
        reading({ feature: "ok", measured_mm: 10.00 }),
        reading({ feature: "warn", measured_mm: 10.048, upper_tol_mm: 0.05, lower_tol_mm: 0.05 }),
        reading({ feature: "fail", measured_mm: 10.10 }),
      ],
    }));
    expect(r.failed_count).toBe(1);
    expect(r.warning_count).toBe(1);
    const approvedCount = r.per_feature.filter(f => f.within_tolerance && !f.warning_near_limit).length;
    expect(approvedCount + r.warning_count + r.failed_count).toBe(r.per_feature.length);
  });

  it("zero tolerance (perfect-match required) → only dead-center passes", () => {
    const rExact = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.0, upper_tol_mm: 0, lower_tol_mm: 0 })],
    }));
    const rOff = eng.approve(nominal({
      readings: [reading({ measured_mm: 10.001, upper_tol_mm: 0, lower_tol_mm: 0 })],
    }));
    expect(rExact.overall_verdict).toMatch(/approved|warning_pass/);
    expect(rOff.overall_verdict).toBe("failed");
  });
});
