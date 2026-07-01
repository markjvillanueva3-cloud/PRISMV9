import { describe, it, expect } from "vitest";
import {
  millProgramSignoffDossierEngine as eng,
  MILL_CANONICAL_REASON_CODES,
  CHATTER_RISK_THRESHOLD,
  type MillProgramSignoffDossierInput,
  type MillSignoffEngagementSummary,
  type MillSignoffStockSummary,
  type MillSignoffBreachSummary,
  type MillSignoffTimeSummary,
  type MillSignoffDeviationSummary,
  type MillSignoffChatterSummary,
  type MillSignoffFPASummary,
} from "../engines/MillProgramSignoffDossierEngine.js";

const engagement: MillSignoffEngagementSummary = {
  peak_ap_mm: 3.5, peak_ae_mm: 5.0, peak_mrr_mm3_s: 12.5, cutting_blocks: 250, warnings: [],
};
const stock: MillSignoffStockSummary = {
  final_x_mm: 100, final_y_mm: 75, final_z_mm: 25, sample_count: 500,
};
const noBreach: MillSignoffBreachSummary = { hits_count: 0, components_hit: [] };
const time: MillSignoffTimeSummary = {
  total_seconds: 600, dominant_category: "cut_time", dominant_share_pct: 65,
};

function nominal(o: Partial<MillProgramSignoffDossierInput> = {}): MillProgramSignoffDossierInput {
  return {
    program_id: "P-001",
    engagement, stock, breach: noBreach, time,
    ...o,
  };
}

describe("MillProgramSignoffDossierEngine", () => {
  it("getStats: 3 verdicts, 3 mill-canonical reason codes, chatter thresholds", () => {
    const s = eng.getStats();
    expect(s.verdicts).toEqual(["pass", "warn", "fail"]);
    expect(s.mill_canonical_reason_codes).toEqual(MILL_CANONICAL_REASON_CODES);
    expect(s.chatter_risk_threshold).toBe(CHATTER_RISK_THRESHOLD);
    expect(s.chatter_high_risk_block_threshold).toBe(3);
  });

  it("MILL_CANONICAL_REASON_CODES contains CHATTER_RISK, FPA_REJECTED, FPA_CONDITIONAL", () => {
    expect(MILL_CANONICAL_REASON_CODES).toEqual(["CHATTER_RISK", "FPA_REJECTED", "FPA_CONDITIONAL"]);
  });

  it("throws on invalid input", () => {
    expect(() => eng.assemble(null as never)).toThrow(/input required/);
    expect(() => eng.assemble({ ...nominal(), program_id: "" })).toThrow(/program_id required/);
    expect(() => eng.assemble({ ...nominal(), engagement: undefined as never })).toThrow(/engagement summary required/);
  });

  it("nominal clean run → verdict 'pass'", () => {
    const r = eng.assemble(nominal());
    expect(r.verdict).toBe("pass");
    expect(r.reason_codes).toEqual([]);
  });

  it("breach detected → verdict 'fail' + ENVELOPE_BREACH code", () => {
    const breach: MillSignoffBreachSummary = {
      first_breach_block: 42, hits_count: 1, components_hit: ["vise"],
    };
    const r = eng.assemble(nominal({ breach }));
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("ENVELOPE_BREACH");
    expect(r.warnings.some(w => /Breach detected at block 42/.test(w))).toBe(true);
  });

  it("deviation out-of-tol → verdict 'fail' + DEVIATION_OUT_OF_TOL", () => {
    const deviation: MillSignoffDeviationSummary = {
      max_abs_delta_mm: 0.1, rms_delta_mm: 0.05, out_of_tol_count: 5, signed_bias_mm: 0,
    };
    const r = eng.assemble(nominal({ deviation }));
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("DEVIATION_OUT_OF_TOL");
  });

  it("MILL-CANONICAL: FPA rejected → 'fail' + FPA_REJECTED", () => {
    const fpa: MillSignoffFPASummary = {
      verdict: "rejected", passed_feature_count: 5, failed_feature_count: 2, warning_feature_count: 0,
    };
    const r = eng.assemble(nominal({ fpa }));
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("FPA_REJECTED");
    expect(r.warnings.some(w => /FPA rejected.*2 feature/.test(w))).toBe(true);
  });

  it("MILL-CANONICAL: FPA conditional pass → 'warn' + FPA_CONDITIONAL", () => {
    const fpa: MillSignoffFPASummary = {
      verdict: "cond_pass", passed_feature_count: 8, failed_feature_count: 0, warning_feature_count: 2,
    };
    const r = eng.assemble(nominal({ fpa }));
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("FPA_CONDITIONAL");
  });

  it("MILL-CANONICAL: high chatter risk → 'warn' + CHATTER_RISK", () => {
    const chatter: MillSignoffChatterSummary = {
      peak_risk_score: 0.75, high_risk_block_count: 5,
    };
    const r = eng.assemble(nominal({ chatter }));
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("CHATTER_RISK");
    expect(r.warnings.some(w => /Peak chatter risk 0\.75/.test(w))).toBe(true);
  });

  it("MILL-CANONICAL: chatter below threshold does NOT trigger warn", () => {
    const chatter: MillSignoffChatterSummary = {
      peak_risk_score: 0.30, high_risk_block_count: 0,
    };
    const r = eng.assemble(nominal({ chatter }));
    expect(r.verdict).toBe("pass");
    expect(r.reason_codes).not.toContain("CHATTER_RISK");
  });

  it("MILL-CANONICAL: chatter exactly at threshold (0.5) triggers warn", () => {
    const chatter: MillSignoffChatterSummary = {
      peak_risk_score: CHATTER_RISK_THRESHOLD, high_risk_block_count: 1,
    };
    const r = eng.assemble(nominal({ chatter }));
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("CHATTER_RISK");
  });

  it("engagement warnings → 'warn' + ENGAGEMENT_WARNING", () => {
    const r = eng.assemble(nominal({
      engagement: { ...engagement, warnings: ["Tool deflection > tol/3 at N42"] },
    }));
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("ENGAGEMENT_WARNING");
  });

  it("deviation systematic bias > tol/2 → 'warn' + SYSTEMATIC_BIAS", () => {
    const deviation: MillSignoffDeviationSummary = {
      max_abs_delta_mm: 0.03, rms_delta_mm: 0.02, out_of_tol_count: 0, signed_bias_mm: 0.04,
    };
    const r = eng.assemble(nominal({ deviation, deviation_tol_mm: 0.05 }));
    // 0.04 > 0.025 → SYSTEMATIC_BIAS
    expect(r.verdict).toBe("warn");
    expect(r.reason_codes).toContain("SYSTEMATIC_BIAS");
  });

  it("fail trumps warn — breach + chatter risk → 'fail' (not 'warn')", () => {
    const breach: MillSignoffBreachSummary = {
      first_breach_block: 10, hits_count: 1, components_hit: ["fixture"],
    };
    const chatter: MillSignoffChatterSummary = {
      peak_risk_score: 0.9, high_risk_block_count: 8,
    };
    const r = eng.assemble(nominal({ breach, chatter }));
    expect(r.verdict).toBe("fail");
    expect(r.reason_codes).toContain("ENVELOPE_BREACH");
    // CHATTER_RISK can still be reported alongside (operator wants to see all signals)
    expect(r.reason_codes).toContain("CHATTER_RISK");
  });

  it("highlights include peak ap/ae/MRR + stock XYZ bbox (mill-canonical 3D)", () => {
    const r = eng.assemble(nominal());
    expect(r.highlights.some(h => /Peak ap.*peak ae.*MRR/.test(h))).toBe(true);
    expect(r.highlights.some(h => /Stock XYZ bbox=\[100, 75, 25\]/.test(h))).toBe(true);
  });

  it("highlights include 'Envelope clear' when no breach", () => {
    const r = eng.assemble(nominal());
    expect(r.highlights.some(h => /Envelope clear/.test(h))).toBe(true);
  });

  it("highlights omit 'Envelope clear' when breach present", () => {
    const r = eng.assemble(nominal({
      breach: { first_breach_block: 5, hits_count: 1, components_hit: ["vise"] },
    }));
    expect(r.highlights.some(h => /Envelope clear/.test(h))).toBe(false);
  });

  it("MILL-CANONICAL: chatter highlight present when chatter summary provided", () => {
    const r = eng.assemble(nominal({
      chatter: { peak_risk_score: 0.3, high_risk_block_count: 0 },
    }));
    expect(r.highlights.some(h => /Chatter: low/.test(h))).toBe(true);
  });

  it("MILL-CANONICAL: FPA highlight present when FPA summary provided", () => {
    const r = eng.assemble(nominal({
      fpa: { verdict: "pass", passed_feature_count: 10, failed_feature_count: 0, warning_feature_count: 0 },
    }));
    expect(r.highlights.some(h => /FPA: pass.*10 pass/.test(h))).toBe(true);
  });

  it("variability ≥3 fail paths: ENVELOPE_BREACH, DEVIATION_OUT_OF_TOL, FPA_REJECTED", () => {
    const r1 = eng.assemble(nominal({
      breach: { first_breach_block: 1, hits_count: 1, components_hit: [] },
    }));
    const r2 = eng.assemble(nominal({
      deviation: { max_abs_delta_mm: 1, rms_delta_mm: 0.5, out_of_tol_count: 1, signed_bias_mm: 0 },
    }));
    const r3 = eng.assemble(nominal({
      fpa: { verdict: "rejected", passed_feature_count: 0, failed_feature_count: 1, warning_feature_count: 0 },
    }));
    expect(r1.verdict).toBe("fail");
    expect(r1.reason_codes).toContain("ENVELOPE_BREACH");
    expect(r2.verdict).toBe("fail");
    expect(r2.reason_codes).toContain("DEVIATION_OUT_OF_TOL");
    expect(r3.verdict).toBe("fail");
    expect(r3.reason_codes).toContain("FPA_REJECTED");
  });

  it("variability ≥3 warn paths: CHATTER_RISK, FPA_CONDITIONAL, ENGAGEMENT_WARNING", () => {
    const r1 = eng.assemble(nominal({
      chatter: { peak_risk_score: 0.7, high_risk_block_count: 4 },
    }));
    const r2 = eng.assemble(nominal({
      fpa: { verdict: "cond_pass", passed_feature_count: 5, failed_feature_count: 0, warning_feature_count: 1 },
    }));
    const r3 = eng.assemble(nominal({
      engagement: { ...engagement, warnings: ["chip overload risk"] },
    }));
    expect(r1.verdict).toBe("warn");
    expect(r2.verdict).toBe("warn");
    expect(r3.verdict).toBe("warn");
  });

  it("FPA not_applicable does NOT contribute to verdict change", () => {
    const r = eng.assemble(nominal({
      fpa: { verdict: "not_applicable", passed_feature_count: 0, failed_feature_count: 0, warning_feature_count: 0 },
    }));
    expect(r.verdict).toBe("pass");
    expect(r.reason_codes).not.toContain("FPA_REJECTED");
    expect(r.reason_codes).not.toContain("FPA_CONDITIONAL");
  });

  it("deviation present without tol_mm does NOT fire SYSTEMATIC_BIAS", () => {
    const r = eng.assemble(nominal({
      deviation: { max_abs_delta_mm: 0.5, rms_delta_mm: 0.3, out_of_tol_count: 0, signed_bias_mm: 0.3 },
    }));
    expect(r.reason_codes).not.toContain("SYSTEMATIC_BIAS");
  });

  it("reasoning narrates program_id + verdict + counts", () => {
    const r = eng.assemble(nominal());
    expect(r.reasoning.some(s => /Program P-001: verdict pass/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /reason code.*highlight/.test(s))).toBe(true);
  });

  it("determinism: same input twice → identical dossier", () => {
    expect(eng.assemble(nominal())).toEqual(eng.assemble(nominal()));
  });

  it("warnings array carries engagement-summary warnings forward", () => {
    const r = eng.assemble(nominal({
      engagement: { ...engagement, warnings: ["W1", "W2"] },
    }));
    expect(r.warnings).toContain("W1");
    expect(r.warnings).toContain("W2");
  });
});
